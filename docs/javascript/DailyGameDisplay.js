import { Cookie } from './Cookie.js';

import { ElementUtilities } from './ElementUtilities.js';
import { GameDisplay } from './GameDisplay.js';
import * as Const from './Const.js';

/*
** This class reads and updates a DailyStats cookie, which is stored in
** this class as instance variable dailyStats. See the StatsDisplay class
** for a description of the contents of the cookie. See the Cookie class
** for a description of the other cookies that this class uses.
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
        
        // Now create a stat for each allowed number of wrong moves, and initialize
        // their values to 0. The stat properties for these is 0..TOO_MANY_WRONG_MOVES.
        for (let wrongMoves = 0; wrongMoves < Const.TOO_MANY_WRONG_MOVES; wrongMoves++) {
            initialStats[wrongMoves] = 0;
        }
        return initialStats;
    }

    constructor(appDisplay, gameDiv, pickerDiv) {
        super(appDisplay, gameDiv, pickerDiv, "daily-picker");

        this.baseDate = new Date("2024-08-12T00:00:00.000+00:00");
        this.baseTimestamp = null;
        this.dateIncrementMs = 24 * 60 *60 * 1000; // one day in ms

        // Construct initial stats to be used if we don't have a cookie for daily stats.

        let initialStats = DailyGameDisplay.NewDailyStatsBlob();

        // If we have a cookie for daily stats parse it; otherwise set it to initial values.
        this.dailyStats = Cookie.getJsonOrElse(Cookie.DAILY_STATS, initialStats);

        // had stats before. In all other cases this is redundant, but oh well!
        Cookie.saveJson(Cookie.DAILY_STATS, this.dailyStats);

        // Test.js will give a special argument on the HTML when it opens
        // the window to run a daily game that requires the daily game to
        // be static; check for that.
        const queryString = window.location.search;
        const debugStaticDaily = (queryString.indexOf('testing') >= 0);
        Const.GL_DEBUG && this.logDebug("debugStaticDaily:", debugStaticDaily, "daily");

        if (debugStaticDaily) {
            this.setStaticDailyGameSettings();
        } else {
            // Get today's daily game; this will set this.startWord and
            // this.targetWord so that we can call the base class constructGame()
            // and display the game.
            this.setDailyGameData();
        }

        this.constructGame(this.startWord, this.targetWord, this.dailyGameWordsPlayed);
    }

    /* ----- Determination of Daily Game Information ----- */

    setDailyGameData() {
        // This keeps track of whether the user clicked the Show Solution button
        // for the daily game.
        this.dailySolutionShown = Cookie.getBoolean(Cookie.DAILY_SOLUTION_SHOWN);

        // Get the DailyGameNumber cookie; this can be manually deleted
        // to restart the daily game number determination.
        const recoveredDailyGameNumber = Cookie.getInt(Cookie.DAILY_GAME_NUMBER);
        Const.GL_DEBUG && this.logDebug("recoveredDailyGameNumber:", recoveredDailyGameNumber, "daily");
        if (recoveredDailyGameNumber == Const.STATIC_DAILY_GAME_NUMBER) {
            // we are recovering the static daily game in mid-play.  
            this.dailyGameNumber = Const.STATIC_DAILY_GAME_NUMBER;
            this.startWord  = Const.STATIC_DAILY_GAME_START;
            this.targetWord = Const.STATIC_DAILY_GAME_TARGET;
            this.validGame = true;
            this.dailyGameWordsPlayed = Cookie.getJsonOrElse(Cookie.DAILY_GAME_WORDS_PLAYED, []);
            Const.GL_DEBUG && this.logDebug("this.dailyGameWordsPlayed (static recovered):", this.dailyGameWordsPlayed, "daily");
        } else {
            // Debug-only cookie that can be manually added to reduce a day
            // to mere minutes.
            const debugMinPerDay = Cookie.getInt(Cookie.DEBUG_DAILY_MIN_PER_DAY);

            // Are we debugging daily games?
            if (debugMinPerDay) {
                // Yes, we're debugging, so override the standard one day increment.
                calculateDailyGameBaseTimestampForDebugging(debugMinPerDay, recoveredDailyGameNumber);
            } else {
                // Not debugging daily games; set the base timestamp based
                // on our base date -- the date at which we set the clock
                // for the very first daily game.
                this.baseTimestamp = this.baseDate.getTime();
                Const.GL_DEBUG && this.logDebug("DebugDailyMinPerDay is NOT set! baseTimestamp:", new Date(this.baseTimestamp), "daily");
            }

            // Now, determine the game number and get the game data from the GameWords object.
            this.validGame = false;

            this.dailyGameNumber = this.calculateGameNumber();
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
                Cookie.save(Cookie.DAILY_GAME_NUMBER, this.dailyGameNumber);

                this.dailySolutionShown = false;
                Cookie.save(Cookie.DAILY_SOLUTION_SHOWN, false);
                Cookie.saveJson(Cookie.DAILY_GAME_WORDS_PLAYED, []);

                // Update stats relating to a new daily game.
                this.incrementStat("gamesPlayed");
            } else {
                // Existing daily game; recover the words played so far.
                this.dailyGameWordsPlayed = Cookie.getJsonOrElse(Cookie.DAILY_GAME_WORDS_PLAYED, []);
                Const.GL_DEBUG && this.logDebug("this.dailyGameWordsPlayed:", this.dailyGameWordsPlayed, "daily");
            }
        }
    }

    setGameWordsFromGameNumber() {
        if (this.dailyGameNumber in DailyGameDisplay.GameWords) {
            [this.startWord, this.targetWord] = DailyGameDisplay.GameWords[this.dailyGameNumber];
            this.validGame = true;
        } else {
            // No daily game? Something went awry; use the backup.
            this.startWord  = Const.BACKUP_DAILY_GAME_START;
            this.targetWord = Const.BACKUP_DAILY_GAME_TARGET;
            this.appDisplay.showToast(Const.NO_DAILY);

            // Return now; don't consider this a new game.
            return;
        }
    }

    calculateDailyGameBaseTimestampForDebugging(debugMinPerDay, recoveredDailyGameNumber) {
        // we're debugging, so override the standard one day increment.
        this.dateIncrementMs = debugMinPerDay * 60 * 1000;
        Const.GL_DEBUG && this.logDebug("DebugDailyMinPerDay is set! dateIncrementMs:", this.dateIncrementMs, "daily");

        // Is this a "fresh start"?
        if (recoveredDailyGameNumber === null) {
            // Yes! Set the base timestamp to now and save it in a debug-only cookie.
            this.baseTimestamp = (new Date()).getTime();
            Cookie.save(Cookie.DEBUG_BASE_TIMESTAMP, this.baseTimestamp);
            Const.GL_DEBUG && this.logDebug("Fresh start; saved DebugBaseTimestamp; baseTimestamp:", new Date(this.baseTimestamp), "daily");
        } else {
            // No, but we're debugging, so get get the timestamp from the cookie.
            // If there isn't a cookie, set it to "now".
            this.baseTimestamp = Cookie.getInt(Cookie.DEBUG_BASE_TIMESTAMP);
            if (this.baseTimestamp === null) {
                this.baseTimestamp = (new Date()).getTime();
                Cookie.save(Cookie.DEBUG_BASE_TIMESTAMP, this.baseTimestamp);
                Const.GL_DEBUG && this.logDebug("NOT fresh start; no recovered DebugBaseTimestamp; setting to now", "daily");
            } else {
                Const.GL_DEBUG && this.logDebug("NOT fresh start; got DebugBaseTimestamp; baseTimestamp:", new Date(this.baseTimestamp), "daily");
            }
        }
    }

    setStaticDailyGameSettings() {
        Const.GL_DEBUG && this.logDebug("initializing the static daily game", "daily");
        this.startWord = Const.STATIC_DAILY_GAME_START;
        this.targetWord = Const.STATIC_DAILY_GAME_TARGET;
        this.validGame = true;
        this.incrementStat("gamesPlayed");
        this.dailyGameNumber = Const.STATIC_DAILY_GAME_NUMBER;
        this.dailySolutionShown = false;
        this.dailyGameWordsPlayed = [];
        Cookie.save(Cookie.DAILY_GAME_NUMBER, this.dailyGameNumber);
        Cookie.save(Cookie.DAILY_SOLUTION_SHOWN, false);
        Cookie.saveJson(Cookie.DAILY_GAME_WORDS_PLAYED, []);
    }

    calculateGameNumber() {
        const nowTimestamp = (new Date()).getTime();
        const msElapsed = nowTimestamp - this.baseTimestamp;
        return Math.floor(msElapsed / this.dateIncrementMs) + 1;
    }

    getMsUntilNextGame() {
        const nextGameNum = this.calculateGameNumber() + 1;
        const nextGameTimestamp = this.baseTimestamp + (nextGameNum * this.dateIncrementMs)
        return nextGameTimestamp - (new Date()).getTime();
    }

    /* ----- Pseudo Callbacks ----- */

    // Override superclass letterPicked() to update gameState and DailyGameWordsPlayed cookie
    letterPicked(letter, letterPosition) {
        Const.GL_DEBUG && this.logDebug("DailyGameDisplay.letterPicked(): letter:", letter, ", letterPosition:", letterPosition, "picker");
        if (this.game.isOver()) {
            console.error("DailyGameDisplay.letterPicked(): game is already over");
            return Const.UNEXPECTED_ERROR;
        }

        let gameResult = super.letterPicked(letter, letterPosition);

        this.updateDailyGameStats(gameResult);

        Const.GL_DEBUG && this.logDebug("DailyGameDisplay.letterPicked() gameState: ", this.gameState, "daily");
        if (gameResult === Const.OK) {
            this.dailyGameWordsPlayed = this.gameState
            Cookie.saveJson(Cookie.DAILY_GAME_WORDS_PLAYED, this.dailyGameWordsPlayed);
        }

        return gameResult;
    }

    /* ----- Callbacks ----- */

    // Override superclass callback to update DailyStats cookie.
    additionClickCallback(event) {

        if (this.game.isOver()) {
            console.error("DailyGameDisplay.additionClickCallback(): game is already over");
            return Const.UNEXPECTED_ERROR;
        }

        this.updateDailyGameStats(super.additionClickCallback(event));

        // NOTE: No need to save words in DailyGameWordsPlayed because an addition
        // doesn't actually provide a word; we'll pick up the new word in
        // pickerChangeCallback().

        return Const.OK;
    }

    // Override superclass callback to update DailyStats and DailyGameWordsPlayed cookie.
    deletionClickCallback(event) {

        if (this.game.isOver()) {
            console.error("DailyGameDisplay.deletionClickCallback(): game is already over");
            return Const.UNEXPECTED_ERROR;
        }

        let gameResult = super.deletionClickCallback(event);
        Const.GL_DEBUG && this.logDebug("DailyGameDisplay.deletionClickCallback() result: ", gameResult, "daily");

        this.updateDailyGameStats(gameResult);
        Const.GL_DEBUG && this.logDebug("DailyGameDisplay.deletionClickCallback() Game state: ", this.gameState, "daily");
        if (gameResult === Const.OK) {
            this.dailyGameWordsPlayed = this.gameState;
            Cookie.saveJson(Cookie.DAILY_GAME_WORDS_PLAYED, this.dailyGameWordsPlayed);
        }
        return gameResult;
    }

    //TODO daily game stats are only updated on games that are done?
    updateDailyGameStats(gameResult) {
        if (this.game.isOver()) {
            if (gameResult == Const.OK) {
                this.incrementStat("gamesCompleted");
            }
            let wrongMoveCount = this.getWrongMoveCount();
            if (wrongMoveCount >= Const.TOO_MANY_WRONG_MOVES) {
                this.incrementStat("gamesFailed");
            }
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
            this.dailyStats[whichStat] += 1;
            Cookie.saveJson(Cookie.DAILY_STATS, this.dailyStats);
        }
    }

    // Called from AppDisplay when "Solution" button is clicked.
    showSolution() {
        // TODO: Add an "are you sure?"
        this.dailySolutionShown = true;
        Cookie.save(Cookie.DAILY_SOLUTION_SHOWN, true);
        this.incrementStat("gamesShown");
        this.game.finishGame();

        // Pass "true" to showMove() to indicate the user has elected to show the
        // solution so that the happy "game won" toast is not shown.
        const userRequestedSolution = true;
        this.showMove(userRequestedSolution);
    }
}

export { DailyGameDisplay };
