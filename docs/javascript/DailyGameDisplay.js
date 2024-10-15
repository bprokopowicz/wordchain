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

    static GameWords = {
          1: ['broken', 'cone'],
          2: ['flue', 'trance'],
          3: ['fish', 'grater'],
          4: ['salted', 'fish'],
          5: ['tasty', 'owl'],
          6: ['rum', 'runner'],
          7: ['funny', 'slur'],
          8: ['tough', 'punch'],
          9: ['really', 'solve'],
         10: ['hard', 'kicker'],
         11: ['leaky', 'spoons'],
         12: ['brother', 'curse'],
         13: ['float', 'jockey'],
         14: ['tasty', 'mascot'],
         15: ['free', 'sample'],
         16: ['main', 'avenue'],
         17: ['smelly', 'date'],
         18: ['smelly', 'gym'],
         19: ['rice', 'arenas'],
         20: ['hard', 'sinker'],
         21: ['loud', 'momma'],
         22: ['forgot', 'how'],
         23: ['jaunty', 'name'],
         24: ['bouncy', 'house'],
         25: ['mind', 'hugger'],
         26: ['house', 'ablaze'],
    }

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

        this.baseDate = new Date("2024-10-15T00:00:00.000+00:00");
        this.baseTimestamp = null;
        this.dateIncrementMs = 24 * 60 *60 * 1000; // one day in ms

        // If we have a cookie for daily stats parse it; otherwise set it to initial values.
        let dailyStats = Persistence.getDailyStatsOrElse(DailyGameDisplay.NewDailyStatsBlob());

        // had stats before. In all other cases this is redundant, but oh well!
        Persistence.saveDailyStats(dailyStats);

        // Test.js will give a 'testing' argument on the URL when it opens
        // the window to run a daily game that requires the daily game to
        // be static; check for that.
        const debugStaticDaily = this.queryVars.has(Const.QUERY_STRING_TESTING);
        Const.GL_DEBUG && this.logDebug("debugStaticDaily:", debugStaticDaily, "daily");

        if (debugStaticDaily) {
            this.setStaticDailyGameData();
        } else {
            // Get today's daily game; this will set this.startWord and
            // this.targetWord so that we can call the base class constructGame()
            // and display the game.  This also recovers the words played so far if any.
            this.setDailyGameData();
        }

        this.constructGame(this.startWord, this.targetWord, this.recoveredDailyGameStateIfAny);
    }

    /* ----- Determination of Daily Game Information ----- */

    // setDailyGameData determines validGame, startWord, targetWord, recoveredDailyGameNumber, recoveredDailyGameStateIfAny

    setDailyGameData() {

        // Get the DailyGameNumber cookie; this can be manually deleted
        // to replay today's daily game instead of recovering it as played
        const recoveredDailyGameNumber = Persistence.getDailyGameNumber();
        Const.GL_DEBUG && this.logDebug("recoveredDailyGameNumber:", recoveredDailyGameNumber, "daily");
        this.setBaseTimestamp(); 
        if (recoveredDailyGameNumber == Const.STATIC_DAILY_GAME_NUMBER) {
            // we are recovering the static daily game in mid-play.  
            this.dailyGameNumber = Const.STATIC_DAILY_GAME_NUMBER;
            this.startWord  = Const.STATIC_DAILY_GAME_START;
            this.targetWord = Const.STATIC_DAILY_GAME_TARGET;
            this.validGame = true;
            this.recoveredDailyGameStateIfAny = Persistence.getDailyGameState();
            Const.GL_DEBUG && this.logDebug("this.recoveredDailyGameStateIfAny (static recovered):",
                    this.recoveredDailyGameStateIfAny, "daily");
        } else {
            // Now, determine the game number and get the game data from the GameWords object.
            this.dailyGameNumber = this.calculateGameNumber();

            this.validGame = false;
            this.setGameWordsFromGameNumber();  
            if (!this.validGame) {
                // Return now; don't consider this a new game.
                return;
            }
                
            // If we didn't recover a daily game number from the cookies or
            // the number we recovered isn't the game number we just calculated,
            // then this is a new daily game,
            Const.GL_DEBUG && this.logDebug("this.dailyGameNumber (calculated) is", this.dailyGameNumber, "daily");
            if ((recoveredDailyGameNumber === null) || (recoveredDailyGameNumber != this.dailyGameNumber)) {
                // New daily game!
                Persistence.saveDailyGameNumber(this.dailyGameNumber);
                Persistence.clearDailyGameState();
                Persistence.clearDailySolutionShown();

                // Update stats relating to a new daily game.
                this.incrementStat("gamesPlayed");
            } else {
                // Existing daily game; recover the words played so far.  The recovered words determine if the 
                // game is solved or not.
                this.recoveredDailyGameStateIfAny = Persistence.getDailyGameState();
                Const.GL_DEBUG && this.logDebug("this.recoveredDailyGameStateIfAny:", this.recoveredDailyGameStateIfAny, "daily");
            }
        }
    }

    // baseTimestamp is the world-wide starting point determining for Wordchain games.  It is hardcoded as this.baseDate but can
    // be over-ridden by setting the query string parameter QUERY_STRING_DEBUG_MINUTES_PER_DAY

    setBaseTimestamp() {

        // Are we debugging daily games?
        if (this.queryVars.has(Const.QUERY_STRING_DEBUG_MINUTES_PER_DAY)) {
            // Yes, we're debugging, so override the standard one day increment.
            calculateDailyGameBaseTimestampForDebugging(this.queryVars.get(Const.QUERY_STRING_DEBUG_MINUTES_PER_DAY));
        } else {
            // Not debugging daily games; set the base timestamp based
            // on our base date -- the date at which we set the clock
            // for the very first daily game.
            this.baseTimestamp = this.baseDate.getTime();
            Const.GL_DEBUG && this.logDebug(Const.QUERY_STRING_DEBUG_MINUTES_PER_DAY, " is NOT set! baseTimestamp:",
                    new Date(this.baseTimestamp), "daily");
        }
    }

    //
    // The daily games start and target are never recovered directly.  They are determined by the dailyGameNumber, which
    // might be recovered if in progress, or calculated based on the date.  See calculateGameNumber()
    //

    setGameWordsFromGameNumber() {
        Const.GL_DEBUG && this.logDebug("setGameWordsFromGameNumber(): this.dailyGameNumber: ", this.dailyGameNumber, "daily");
        if (this.dailyGameNumber in DailyGameDisplay.GameWords) {
            [this.startWord, this.targetWord] = DailyGameDisplay.GameWords[this.dailyGameNumber];
            this.validGame = true;
        } else {
            // No daily game? Something went awry; use the backup.
            this.startWord  = Const.BACKUP_DAILY_GAME_START;
            this.targetWord = Const.BACKUP_DAILY_GAME_TARGET;
            this.validGame = false;
            this.appDisplay.showToast(Const.NO_DAILY);
        }
    }

    calculateDailyGameBaseTimestampForDebugging(debugMinPerDay) {
        // we're debugging, so override the standard one day increment.
        this.dateIncrementMs = debugMinPerDay * 60 * 1000;
        Const.GL_DEBUG && this.logDebug(Const.QUERY_STRING_DEBUG_MINUTES_PER_DAY,
                " is set! dateIncrementMs:", this.dateIncrementMs, "daily");

        // if we are debugging the daily game, we override the beginning of WordChain's epoch to be now on the first run,
        // and then subsequent runs will use that as the beginning of the WordChain epoch for calculating the 
        // daily game number.
        this.baseTimestamp = Persistence.getDebugBaseTimestamp();
        if (this.baseTimestamp === null) {
            this.baseTimestamp = (new Date()).getTime();
            Persistence.saveebugBaseTimestamp(this.baseTimestamp);
            Const.GL_DEBUG && this.logDebug("no recovered DebugBaseTimestamp; setting to now", "daily");
        } else {
            Const.GL_DEBUG && this.logDebug("got DebugBaseTimestamp; baseTimestamp:", new Date(this.baseTimestamp), "daily");
        }
    }

    setStaticDailyGameData() {
        Const.GL_DEBUG && this.logDebug("initializing the static daily game", "daily");
        this.startWord = this.queryVars.has(Const.QUERY_STRING_START_WORD) ?  
            this.queryVars.get(Const.QUERY_STRING_START_WORD) : Const.STATIC_DAILY_GAME_START;
        this.targetWord = this.queryVars.has(Const.QUERY_STRING_TARGET_WORD) ?
            this.queryVars.get(Const.QUERY_STRING_TARGET_WORD) : Const.STATIC_DAILY_GAME_TARGET;
        this.validGame = true;
        this.incrementStat("gamesPlayed");
        this.dailyGameNumber = Const.STATIC_DAILY_GAME_NUMBER;
        this.recoveredDailyGameStateIfAny = [];
        Persistence.saveDailyGameNumber(this.dailyGameNumber);
        Persistence.clearDailyGameState(); // empty at this point
    }

    calculateGameNumber() {
        const nowTimestamp = (new Date()).getTime();
        const msElapsed = nowTimestamp - this.baseTimestamp;
        const gameNumber = Math.floor(msElapsed / this.dateIncrementMs) + 1;
        Const.GL_DEBUG && this.logDebug("calculateGameNumber(): now: ", nowTimestamp, ", elapsed since base: ",
                msElapsed, ", gameNumber: ", gameNumber, "daily");
        return gameNumber;
    }

    getMsUntilNextGame() {
        const nextGameNum = this.calculateGameNumber() + 1;
        const nextGameTimestamp = this.baseTimestamp + (nextGameNum * this.dateIncrementMs)
        return nextGameTimestamp - (new Date()).getTime();
    }

    // this is a virtual function of the base class.  It is called when the base class adds a new word
    // to a solution (delete or letter picked).

    updateGameInProgressPersistence(gameResult) {
        this.updateDailyGameStatsIfDone(gameResult);

        if (Game.moveIsValid(gameResult)) {
            Persistence.saveDailyGameState(this.gameState);
        }
    }

    /* ----- Callbacks ----- */


    // when a game is finished, we update persistent counters of games played, failed, and
    // a counter of the number of wrong moves (e.g. another 2-wrong-move game was just played)
    updateDailyGameStatsIfDone(gameResult) {
        if (this.game.isOver()) {
            if (gameResult == Const.OK) {
                this.incrementStat("gamesCompleted");
            }
            let wrongMoveCount = this.getWrongMoveCount();
            if (wrongMoveCount >= Const.TOO_MANY_WRONG_MOVES) {
                this.incrementStat("gamesFailed");
            }
            // increment the specific-number-of-wrong-moves counter
            this.incrementStat(wrongMoveCount);
        }
    }

    /* ----- Utilities ----- */

    getGameInfo() {
        //  Construct an object for StatsDisplay with these properties:
        //  over:            true if the game is over (user has found target word or too many steps)
        //  numWrongMoves:   how many more steps it took to solve than the minimum
        //  moveSummary:     array of arrays containing for each move:
        //      constant indicating whether the move was correct (OK)/incorrect (WRONG_MOVE)/genius
        //      length of the move's word
        //  dailyGameNumber: the game number of today's game
        let gameInfo = {};

        gameInfo.over = this.game.isOver();
        gameInfo.numWrongMoves = this.getWrongMoveCount();
        gameInfo.moveSummary = this.getMoveSummary();
        gameInfo.dailyGameNumber = this.dailyGameNumber;

        return gameInfo;
    }

    // Increment the given stat, update the stats cookie, and update the stats display content.
    incrementStat(whichStat) {
        // Only update stats if this is a valid daily game.
        if (this.validGame) {
            let dailyStats = Persistence.getDailyStatsOrElse(DailyGameDisplay.NewDailyStatsBlob());
            dailyStats[whichStat] += 1;
            Persistence.saveDailyStats(dailyStats);
        }
    }

    // Called from AppDisplay when "Solution" button is clicked.
    showSolution() {
        // TODO: Add an "are you sure?"
        this.game.finishGame();

        // update persistent storage about the daily game.
        this.incrementStat("gamesShown");
        Persistence.saveDailySolutionShown();
        Persistence.saveDailyGameState(this.gameState);

        // Pass "true" to showGameAfterMove() to indicate the user has elected to show the
        // solution so that the happy "game won" toast is not shown.
        this.showGameAfterMove(true);
    }
}

export { DailyGameDisplay };
