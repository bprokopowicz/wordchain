import { Persistence } from './Persistence.js';
import { ElementUtilities } from './ElementUtilities.js';
import { Game } from './Game.js';
import { GameDisplay } from './GameDisplay.js';
import * as Const from './Const.js';

/*
**  long-term state is saved and recovered in Persistence.js.  This includes the state of any game in progress (game number and words played)
**  and non-game-specific user stats.
*/

class DailyGameDisplay extends GameDisplay {

    /* ----- Class Variables ----- */

    static GameWords = [
          ['fish', 'grater'],
          ['space', 'statin'],
          ['short', 'poor'], // MUST BE AT INDEX 2 FOR TESTING
          ['flue', 'trance'],
          ['salted', 'fish'],
          ['tasty', 'owl'],
          ['harm', 'bikini'],
          ['play', 'ahead'],
          ['really', 'solve'],
          ['hard', 'kicker'], //10
          ['leaky', 'spoon'],
          ['tasty', 'mascot'],
          ['free', 'sample'],
          ['smelly', 'gym'],
          ['rice', 'arena'],
          ['hard', 'sinker'],
          ['loud', 'momma'],
          ['forgot', 'how'],
          ['jaunty', 'estate'],
          ['luck', 'babies'], //20
          ['mind', 'hugger'],
          ['beach', 'house'],
          ['plate', 'acorns'],
          ['smelly', 'date'],
          ['wish', 'corner'],
          ['case', 'sewing'],
          ['word', 'chase'],
          ['braid', 'rafter'],
          ['poke', 'fumble'],
          ['shock', 'bagger'], //30
          ['ripe', 'mixers'],
          ['here', 'after'],
          ['foster', 'tub'],
          ['ice', 'roping'],
    ];

    /* ----- Construction ----- */

    // Construct initial stats to be used if we don't have a cookie for daily stats.
    static NewDailyStatsBlob() {
        let initialStats = {
            gamesPlayed:     0,
            gamesCompleted:  0,
            gamesShown:      0,
            gamesFailed:     0
        }

        // Now create a stat for each number of wrong moves, and initialize
        // their values to 0. The stat properties for these is 0..TOO_MANY_WRONG_MOVES.
        for (let wrongMoves = 0; wrongMoves <= Const.TOO_MANY_WRONG_MOVES; wrongMoves++) {
            initialStats[wrongMoves] = 0;
        }
        return initialStats;
    }

    constructor(appDisplay, gameDiv, pickerDiv) {
        super(appDisplay, gameDiv, pickerDiv, "daily-picker");

        // If we have a cookie for daily stats parse it; otherwise set it to initial values.
        let dailyStats = Persistence.getDailyStatsOrElse(DailyGameDisplay.NewDailyStatsBlob());

        // Had stats before. In all other cases this is redundant, but oh well!
        Persistence.saveDailyStats(dailyStats);

        // Set the base timestamp (epoch) which is either hard-coded or calculated from testing vars.
        this.setBaseTimestamp();

        // Get today's daily game; this will set this.startWord and
        // this.targetWord so that we can call the base class constructGame()
        // and display the game.  This also recovers the words played so far if any.
        this.dailyGameNumber = Const.UNINIT_DAILY_GAME_NUMBER;
        this.updateDailyGameData();
    }

    /* ----- Determination of Daily Game Information ----- */

    // updateDailyGameData() determines the daily game number, startWord, and targetWord
    // It returns a Boolean indicating whether this is a new game vs recovered in progress.
    // This can be called repeatedly with no effect unless the game has changed.
    // The game has changed if the newly calculated game number is different from the
    // current daily game number.

    updateDailyGameData() {

        // Get the saved DailyGameNumber; this can be manually deleted
        // to replay today's daily game instead of recovering it as played

        const recoveredDailyGameNumber = Persistence.getDailyGameNumber();

        // Now, determine the game number for right now. 
        const priorDailyGameNumber = this.dailyGameNumber;
        const calcDailyGameNumber = this.calculateGameNumber();

        // Set up the new game words from the GameWords list.  This might be the back-up default if there is no game for today.
        // In that case, the dailyGameNumber will be set to the backup daily game number.
        // If there are debug vars defining the daily game, the daily game number will be set to a test constant.

        this.dailyGameNumber = this.setGameWordsFromGameNumber(calcDailyGameNumber);
        Const.GL_DEBUG && this.logDebug("updateDailyGameData(): priorGameNumber: ", priorDailyGameNumber,
                " calcDailyGameNumber: ", calcDailyGameNumber, " recoveredDailyGameNumber: ", recoveredDailyGameNumber,
                " after setting game words, this.dailyGameNumber: ", this.dailyGameNumber, "daily");

        if (priorDailyGameNumber == this.dailyGameNumber) {
            // the same game number is already being played
            return false;
        }

        Persistence.saveDailyGameNumber(this.dailyGameNumber);

        // if the persistence data is old, delete it before creating today's game
        if (recoveredDailyGameNumber !== this.dailyGameNumber) {
            Const.GL_DEBUG && this.logDebug("recovered daily game is either older or not found; starting a new game", "daily");
            Persistence.clearDailyGameState();
            Persistence.clearDailySolutionShown();
            if (!this.gameIsBroken()) {
                // New daily game!  Update stats relating to starting a new daily game.
                this.incrementStat("gamesPlayed");
            }
        }

        // now, construct a game from start to target, including any recovered played steps if they
        // weren't just cleared because the game number updated.

        let recoveredDailyGameStateIfAny = Persistence.getDailyGameState();
        Const.GL_DEBUG && this.logDebug("NEW DAILY GAME! recoveredDailyGameStateIfAny:", recoveredDailyGameStateIfAny, "daily");
        this.constructGame(this.startWord, this.targetWord, recoveredDailyGameStateIfAny);

        return true;
    }

    // baseTimestamp is the world-wide starting point determining for Wordchain games.
    // It is hardcoded as this.baseDate but can be over-ridden by setting the testing
    // var TestEpochDaysAgo.

    setBaseTimestamp() {
        this.baseDate = Const.WORD_CHAIN_EPOCH_DATE;
        this.baseTimestamp = null;
        this.dateIncrementMs = 24 * 60 *60 * 1000; // one day in ms

        // Are we changing the number of minutes per day to make time move more quickly?
        if (Persistence.hasTestMinutesPerDay()) {
            // Yes, we're debugging, so override the standard one day increment.
            const debugMinPerDay = Persistence.getTestMinutesPerDay();
            this.dateIncrementMs = debugMinPerDay * 60 * 1000;
            Const.GL_DEBUG && this.logDebug("Setting minutes per day to:", debugMinPerDay, "dateIncrementMs to:", this.dateIncrementMs, "daily");
        }

        // Are we changing when the Epoch starts (for debugging purposes)?
        if (Persistence.hasTestEpochDaysAgo()) {
            // Yes, so recalculate the base date, which we use to get the base timestamp below.
            const newEpochMs = Date.now(),
                  daysAgo = Persistence.getTestEpochDaysAgo(),
                  msAgo = daysAgo * this.dateIncrementMs;

            this.baseDate = new Date(newEpochMs - msAgo);
            Const.GL_DEBUG && this.logDebug("Setting epoch to:", daysAgo, "days ago", "daily");
        }

        this.baseTimestamp = this.baseDate.getTime();
        Const.GL_DEBUG && this.logDebug("epoch timestamp is set to:", new Date(this.baseTimestamp), "daily");
    }

    //
    // The daily games start and target are never recovered directly.  They are determined by the dailyGameNumber, which
    // might be recovered if in progress, or calculated based on the date.  See calculateGameNumber()
    // Return:
    //   the actual daily game number now being used (may override gameNumber if that value is not good, or if there
    //   is a test daily start/target).
    //

    setGameWordsFromGameNumber(gameNumber) {
        Const.GL_DEBUG && this.logDebug("setGameWordsFromGameNumber(): gameNumber: ", gameNumber, "daily");
        let res = 0;
        if (Persistence.hasTestDailyGameWords()) {
            [this.startWord, this.targetWord] = Persistence.getTestDailyGameWords();
            res = Const.TEST_DAILY_GAME_NUMBER;
            Const.GL_DEBUG && this.logDebug("setGameWordsFromGameNumber() overriding game words from test vars", "daily");
        } else if (gameNumber>= 0 && gameNumber < DailyGameDisplay.GameWords.length) {
            [this.startWord, this.targetWord] = DailyGameDisplay.GameWords[gameNumber];
            res = gameNumber;
        } else {
            // No daily game? Something went awry; use the backup.
            [this.startWord, this.targetWord]  = [Const.BACKUP_DAILY_GAME_START, Const.BACKUP_DAILY_GAME_TARGET];
            res = Const.BROKEN_DAILY_GAME_NUMBER;
        }
        Const.GL_DEBUG && this.logDebug("setGameWordsFromGameNumber() start: ", this.startWord, " target: ", this.targetWord,
                " game number: ", res, "daily");
        return res;
    }

    // valid daily game numbers run from 0 to GameWords.length-1.  If the calculated value is outside that range,
    // a place-holder game is used.

    calculateGameNumber() {
        const nowTimestamp = (new Date()).getTime();
        const msElapsed = nowTimestamp - this.baseTimestamp;
        const gameNumber = Math.floor(msElapsed / this.dateIncrementMs);
        Const.GL_DEBUG && this.logDebug("calculateGameNumber(): now: ", nowTimestamp, ", elapsed since base: ",
                msElapsed, ", gameNumber: ", gameNumber, "daily");
        return gameNumber;
    }

    getMsUntilNextGame() {
        const nextGameNum = this.calculateGameNumber() + 1,
              nextGameTimestamp = this.baseTimestamp + (nextGameNum * this.dateIncrementMs),
              msUntilNextGame = nextGameTimestamp - (new Date()).getTime();

        Const.GL_DEBUG && this.logDebug("getMsUntilNextGame(): nextGameNum:", nextGameNum, "msUntilNextGame:", msUntilNextGame, "daily");
        return msUntilNextGame;
    }

    // this is a virtual function of the base class.  It is called when the base class adds a new word
    // to a solution (delete or letter picked).

    updateGameInProgressPersistence(gameResult) {
        this.updateDailyGameStatsIfDone(gameResult);

        if (Game.moveIsValid(gameResult)) {
            Persistence.saveDailyGameState(this.gameState);
        }
    }

    getSolutionShown() {
        const ret =  Persistence.getDailySolutionShown();
        Const.GL_DEBUG && this.logDebug("DailyGameDisplay.getSolutionShown() returns: ", ret, "daily");
        return ret;
    }

    /* ----- Callbacks ----- */


    // when a game is finished, we update persistent counters of games played, failed, and
    // a counter of the number of wrong moves (e.g. another 2-wrong-move game was just played)
    updateDailyGameStatsIfDone(gameResult) {
        if (this.game.isOver()) {
            if (gameResult == Const.OK) {
                this.incrementStat("gamesCompleted");
            }
            let wrongMoveCount = this.game.numWrongMoves();
            if (wrongMoveCount >= Const.TOO_MANY_WRONG_MOVES) {
                this.incrementStat("gamesFailed");
            }
            // increment the specific-number-of-wrong-moves counter
            this.incrementStat(wrongMoveCount);
        }
    }

    /* ----- Utilities ----- */

    gameIsBroken() {
        return this.dailyGameNumber === Const.BROKEN_DAILY_GAME_NUMBER;
    }

    gameIsOver() {
        return this.game.isOver();
    }

    getGameInfo() {
        //  Construct an object for StatsDisplay with these properties:
        //  over:            true if the game is over (user has found target word or too many steps)
        //  numWrongMoves:   how many more steps it took to solve than the minimum
        //  moveSummary:     array of arrays containing for each move:
        //      constant indicating whether the move was correct (OK)/incorrect (WRONG_MOVE)/genius/dodo
        //      length of the move's word
        //  dailyGameNumber: the game number of today's game
        let gameInfo = {};

        gameInfo.over = this.gameIsOver();
        gameInfo.numWrongMoves = this.game.numWrongMoves();
        gameInfo.moveSummary = this.getMoveSummary();
        gameInfo.dailyGameNumber = this.dailyGameNumber;

        return gameInfo;
    }

    // Increment the given stat, update the stats cookie, and update the stats display content.
    incrementStat(whichStat) {
        // Only update stats if this is a valid daily game.
        if (!this.gameIsBroken()) {
            let dailyStats = Persistence.getDailyStatsOrElse(DailyGameDisplay.NewDailyStatsBlob());
            dailyStats[whichStat] += 1;
            Persistence.saveDailyStats(dailyStats);
        }
    }

    // Called from AppDisplay when "Solution" button is clicked.
    showSolution() {
        // TODO-PRODUCTION: Add an "are you sure?"
        this.game.finishGame();
        Persistence.saveDailySolutionShown();
        this.showGameAfterMove();

        // update persistent storage about the daily game.
        this.incrementStat("gamesShown");
        Persistence.saveDailyGameState(this.gameState);
    }
}

export { DailyGameDisplay };
