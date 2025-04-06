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

    static GameWords = Const.DAILY_GAMES;

    /* ----- Construction ----- */

    // Construct initial stats to be used if we don't have a cookie for daily stats.
    // Note: gamesStarted >= gamesWon + gamesLost.   Some games are incomplete - neither won nor lost.
    static NewDailyStatsBlob() {
        let initialStats = {
            gamesStarted: 0,
            gamesWon:     0,
            gamesLost:    0,
            streak:       0,
        }

        // Now create a stat for each number of wrong moves, and initialize
        // their values to 0. The stat properties for these is 0..TOO_MANY_PENALTIES.
        for (let numPenalties = 0; numPenalties <= Const.TOO_MANY_PENALTIES; numPenalties++) {
            initialStats[numPenalties] = 0;
        }
        return initialStats;
    }

    constructor(appDisplay, gameDiv, pickerDiv) {
        super(appDisplay, gameDiv, pickerDiv, "daily-picker");

        // If we have a cookie for daily stats parse it; otherwise set it to initial values.
        let dailyStats = Persistence.getDailyStatsOrElse(DailyGameDisplay.NewDailyStatsBlob());

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
    // It returns a Boolean indicating whether this is a new game vs a game in progress.
    // This can be called repeatedly with no effect unless the game has changed.
    // The game has changed only if the newly calculated game number is different from the
    // current daily game number, OR if the start or target words are re-defined by test variables.

    updateDailyGameData() {

        // Get the saved DailyGameNumber; this can be manually deleted
        // to replay today's daily game instead of recovering it as played
        const recoveredDailyGameNumber = Persistence.getDailyGameNumber();
        const [priorStartWord, priorTargetWord] = [this.startWord, this.targetWord];

        // if the daily game number doesn't get calculated (bug) it will be assigned as the known 'broken game'.
        let calcDailyGameNumber = Const.BROKEN_DAILY_GAME_NUMBER;

        if (this.overrideGameWordsFromTestVars()) {
            this.dailyGameNumber = Const.TEST_DAILY_GAME_NUMBER;
        } else  {
            // Determine the game number for right now.
            calcDailyGameNumber = this.calculateGameNumber();

            if (calcDailyGameNumber < 0 || calcDailyGameNumber >= DailyGameDisplay.GameWords.length) {
                // The calculated game number is not valid. Something went awry; use the backup.
                this.dailyGameNumber = Const.BROKEN_DAILY_GAME_NUMBER;
                [this.startWord, this.targetWord]  = [Const.BACKUP_DAILY_GAME_START, Const.BACKUP_DAILY_GAME_TARGET];
            } else {
                // Set up the new game words from the GameWords list.
                this.dailyGameNumber = calcDailyGameNumber;
                [this.startWord, this.targetWord] = DailyGameDisplay.GameWords[this.dailyGameNumber];
            }
        }

        // If the user has never played before, initialize the last won
        // game number; it's got to be an int because later code will add to it
        // to determine the user's streak.
        if (! Persistence.hasLastWonDailyGameNumber()) {
            Persistence.saveLastWonDailyGameNumber(-1);
        }

        // at this point, we have this.dailyGameNumber and start and target words set.
        // let's see if that is a new game or the game already being played.

        Const.GL_DEBUG && this.logDebug("updateDailyGameData(): calcDailyGameNumber: ", calcDailyGameNumber,
                "recoveredDailyGameNumber:", recoveredDailyGameNumber,
                "this.dailyGameNumber:", this.dailyGameNumber,
                "priorStartWord:", priorStartWord, "priorTargetWord:", priorTargetWord,
                "startWord:", this.startWord, "targetWord:", this.targetWord, "daily");

        if ((this.startWord == priorStartWord) && (this.targetWord == priorTargetWord)) {
            // the same words are already being played
            this.isConstructedAsNew = false;
            return;
        }

        Persistence.saveDailyGameNumber(this.dailyGameNumber);

        // If the persistence data is old, delete it before creating today's game.
        // Also, if we are playing a test game, and the words have changed, start the game over
        if ((recoveredDailyGameNumber !== this.dailyGameNumber) || (this.dailyGameNumber == Const.TEST_DAILY_GAME_NUMBER)) {
            Const.GL_DEBUG && this.logDebug("recovered daily game is either older or not found, or test game changed; starting a new game", "daily");
            Persistence.clearDailyGameState();
            if (!this.gameIsBroken()) {
                // New daily game!  Update stats relating to starting a new daily game.
                this.incrementStat("gamesStarted");
            }
        }

        // If the user didn't win this one, and we're about to switch to a
        // new daily game, the streak is over.
        if (this.game && !this.game.isWinner() && this.dailyGameNumber != Const.BROKEN_DAILY_GAME_NUMBER) {
            this.setStat('streak', 0);
        }

        // Now, construct a game from start to target, including any recovered played steps if they
        // weren't just cleared because the game changed.

        let recoveredDailyGameStateIfAny = Persistence.getDailyGameState();
        Const.GL_DEBUG && this.logDebug("NEW DAILY GAME! recoveredDailyGameStateIfAny:", recoveredDailyGameStateIfAny, "daily");
        this.constructGame(this.startWord, this.targetWord, recoveredDailyGameStateIfAny);

        // Refresh the stats display in case it is open.
        this.appDisplay.refreshStats();
        this.isConstructedAsNew = true;
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

    // returns true if the test vars are given.
    overrideGameWordsFromTestVars() {
        if (Persistence.hasTestDailyGameWords()) {
            [this.startWord, this.targetWord] = Persistence.getTestDailyGameWords();
            return true;
        }
        return false;
    }

    // Valid daily game numbers run from 0 to GameWords.length-1.  If the calculated value is outside that range,
    // a place-holder game is used.
    calculateGameNumber() {
        const nowTimestamp = (new Date()).getTime();
        const msElapsed = nowTimestamp - this.baseTimestamp;
        const gameNumber = Math.floor(msElapsed / this.dateIncrementMs);
        Const.GL_DEBUG && this.logDebug("calculateGameNumber(): base: ", this.baseTimestamp, " now: ", nowTimestamp, ", elapsed since base: ",
                msElapsed, ", gameNumber: ", gameNumber, "daily");
        return gameNumber;
    }

    getMsUntilNextGame() {
        const nextGameNum = this.calculateGameNumber() + 1,
              nextGameTimestamp = this.baseTimestamp + (nextGameNum * this.dateIncrementMs),
              msUntilNextGame = nextGameTimestamp - (new Date()).getTime();

        Const.GL_DEBUG && this.logDebug("DailyGameDisplay.getMsUntilNextGame(): nextGameNum:", nextGameNum, "msUntilNextGame:", msUntilNextGame, "daily");
        return msUntilNextGame;
    }

    /* ----- Persistence Handling ----- */

    // this is a virtual function of the base class.  It is called when the base class adds a new word
    // to a solution (delete or letter picked).

    updateGameInProgressPersistence(gameResult) {
        this.updateDailyGameStatsIfDone(gameResult);

        if (Game.moveIsValid(gameResult)) {
            Persistence.saveDailyGameState(this.gameState);
        }
    }

    // when a game is finished, we update persistent counters of games played, failed, and
    // a counter of the number of wrong moves (e.g. another 2-wrong-move game was just played)
    updateDailyGameStatsIfDone(gameResult) {
        if (this.game.isOver()) {
            if ((gameResult == Const.OK) || (gameResult == Const.GENIUS_MOVE) || (gameResult == Const.SCRABBLE_WORD)) {
                this.incrementStat("gamesWon");

                // Get the user's last won game number so we can set the 'streak' stat.
                let lastWonGameNumber = Persistence.getLastWonDailyGameNumber();

                // Is this the next game?
                if (lastWonGameNumber + 1 === this.dailyGameNumber) {
                    this.incrementStat('streak');
                } else {
                    this.setStat('streak', 1);
                }

                // Save the current game number as the last won.
                Persistence.saveLastWonDailyGameNumber(this.dailyGameNumber);
            }

            let penaltyCount = this.game.numPenalties();
            if (penaltyCount >= Const.TOO_MANY_PENALTIES) {
                // Failed games show the remaining words, which count as wrong steps,
                // but we don't want to count that in the stat.
                penaltyCount = Const.TOO_MANY_PENALTIES;

                this.incrementStat("gamesLost");

                // Sadness ... streak is over.
                this.setStat('streak', 0);
            }

            // increment the specific-number-of-wrong-moves counter
            this.incrementStat(penaltyCount);
        }
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

    // Set the given stat to the given value, update the stats cookie, and update the stats display content.
    setStat(whichStat, statValue) {
        // Only update stats if this is a valid daily game.
        if (!this.gameIsBroken()) {
            let dailyStats = Persistence.getDailyStatsOrElse(DailyGameDisplay.NewDailyStatsBlob());
            dailyStats[whichStat] = statValue;
            Persistence.saveDailyStats(dailyStats);
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
        //  numPenalties:   how many extra steps and shows it took to solve vs the minimum
        //  moveSummary:     array of arrays containing for each move:
        //      constant indicating whether the move was correct (OK)/incorrect (WRONG_MOVE)/genius/dodo
        //      length of the move's word
        //  dailyGameNumber: the game number of today's game
        let gameInfo = {};

        gameInfo.over = this.gameIsOver();
        gameInfo.numPenalties = this.game.numPenalties();
        gameInfo.moveSummary = this.getMoveSummary();
        gameInfo.dailyGameNumber = this.dailyGameNumber;

        return gameInfo;
    }

    isNewGame() {
        return this.isConstructedAsNew;
    }
}

export { DailyGameDisplay };
