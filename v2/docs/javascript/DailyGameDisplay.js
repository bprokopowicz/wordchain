import { Cookie } from './Cookie.js';
import { ElementUtilities } from './ElementUtilities.js';
import { GameDisplay } from './GameDisplay.js';
import * as Const from './Const.js';

/*
** This class reads and updates a DailyStats cookie, which is stored in
** this class as instance variable dailyStats. See the StatsDicplay class
** for a description of the contents of the cookie. See the Cookie class
** for a description of the other cookies that this class uses.
*/

class DailyGameDisplay extends GameDisplay {

    /* ----- Class Variables ----- */

    static BaseDate = new Date("2024-04-28T00:00:00.000+00:00");
    static BaseTimestamp = null;
    static DateIncrementMs = 24 * 60 *60 * 1000; // one day in ms

    static GameWords = {
          1: ['broken', 'cone'],
          2: ['flue', 'trance'],
          3: ['fish', 'grater'],
          4: ['salted', 'fish'],
          5: ['tasty', 'owl '],
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
         22: ['forgot', 'how '],
         23: ['jaunty', 'name'],
         24: ['bouncy', 'house'],
         25: ['mind', 'hugger'],
    }

    /* ----- Construction ----- */

    constructor(appDisplay, gameDiv, pickerDiv) {
        super(appDisplay, gameDiv, pickerDiv);

        // Construct initial stats to be used if we don't have a cookie for daily stats.
        let initialStats = {
            gamesPlayed:     0,
            gamesCompleted:  0,
            gamesShown:      0,
            gamesFailed:     0,
        }

        // Now create a stat for each allowed number of extra steps, and initialize
        // their values to 0. The stat properties for these is 0..TOO_MANY_EXTRA_STEPS.
        for (let extraSteps = 0; extraSteps < Const.TOO_MANY_EXTRA_STEPS; extraSteps++) {
            initialStats[extraSteps] = 0;
        }

        // If we have a cookie for daily stats parse it; otherwise set it to initial values.
        this.dailyStats = Cookie.getJsonOrElse("DailyStats", initialStats);

        // Now, save the stats again in case this is the very first game and we never
        // had stats before. In all other cases this is redundant, but oh well!
        Cookie.saveJson("DailyStats", this.dailyStats);

        /*
        // Create a backup daily game words, in case we cannot get one.
        this.backupStartWord  = "daily";
        this.backupTargetWord = "broken";

        // Get today's daily game; this will set this.startWord and
        // this.targetWord so that we can call the base class constructGame()
        // and display the game.
        this.setDailyGameData();
        */

        // Debug-only cookie that can be manually added to use a static daily game.
        const debugStaticDaily = Cookie.getBoolean("DebugStaticDaily");
        console.log("debugStaticDaily:", debugStaticDaily);
        if (debugStaticDaily) {
            this.startWord = "dog";
            this.targetWord = "bite";
            this.validGame = true;
            this.incrementStat("gamesPlayed");
            this.dailyGameNumber = 1;
            this.dailySolutionShown = false;
            this.dailyGameWordsPlayed = [];
            Cookie.save("DailyGameNumber", 1);
            Cookie.save("DailySolutionShown", false);
            Cookie.saveJson("DailyGameWordsPlayed", []);
        } else {
            // Create a backup daily game words, in case we cannot get one.
            this.backupStartWord  = "daily";
            this.backupTargetWord = "broken";

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
        this.dailySolutionShown = Cookie.getBoolean("DailySolutionShown");

        // Get the DailyGameNumber cookie; this can be manually deleted
        // to restart the daily game number determination.
        const currentDailyGameNumber = Cookie.getInt("DailyGameNumber");
        console.log("currentDailyGameNumber:", currentDailyGameNumber);

        // Debug-only cookie that can be manually added to reduce a day
        // to mere minutes.
        const debugMinPerDay = Cookie.getInt("DebugDailyMinPerDay");

        // Are we debugging daily games?
        if (debugMinPerDay) {
            // Yes, we're debugging, so override the standard one day increment.
            DailyGameDisplay.DateIncrementMs = debugMinPerDay * 60 * 1000;
            console.log("Debugging! DateIncrementMs:", DailyGameDisplay.DateIncrementMs);

            // Is this a "fresh start"?
            if (currentDailyGameNumber === null) {
                // Yes! Set the base timestamp to now and save it in a debug-only cookie.
                DailyGameDisplay.BaseTimestamp = (new Date()).getTime();
                Cookie.saveInt("DebugBaseTimestamp", DailyGameDisplay.BaseTimestamp);
                console.log("Debugging! Fresh start; saved DebugBaseTimestamp; BaseTimestamp:", new Date(DailyGameDisplay.BaseTimestamp));
            } else {
                // No, but we're debugging, so get get the timestamp from the cookie.
                DailyGameDisplay.BaseTimestamp = Cookie.getInt("DebugBaseTimestamp");
                console.log("Debugging! NOT fresh start; got DebugBaseTimestamp; BaseTimestamp:", new Date(DailyGameDisplay.BaseTimestamp));
            }
        } else {
            // Not debugging daily games; set the base timestamp based
            // on our static base date -- the date at which we set the clock
            // for the very first daily game.
            DailyGameDisplay.BaseTimestamp = DailyGameDisplay.BaseDate.getTime();
            console.log("NOT Debugging! BaseTimestamp:", new Date(DailyGameDisplay.BaseTimestamp));
        }

        // Now, determine the game number and get the game data from the GameWords object.
        this.validGame = false;

        this.dailyGameNumber = DailyGameDisplay.getGameNumber();
        if (this.dailyGameNumber in DailyGameDisplay.GameWords) {
            [this.startWord, this.targetWord] = DailyGameDisplay.GameWords[this.dailyGameNumber];
            this.validGame = true;
        } else {
            // No daily game? Something went awry; use the backup.
            this.startWord  = this.backupStartWord;
            this.targetWord = this.backupTargetWord;
            this.appDisplay.showToast(Const.NO_DAILY);

            // Return now; don't consider this a new game.
            return;
        }

        // If we didn't recover a daily game number from the cookies or
        // the number we recovered isn't the game number we just calculated,
        // this is a new daily game,
        if ((currentDailyGameNumber === null) || (currentDailyGameNumber != this.dailyGameNumber)) {
            // New daily game!
            Cookie.saveInt("DailyGameNumber", this.dailyGameNumber);

            this.dailySolutionShown = false;
            Cookie.save("DailySolutionShown", false);
            Cookie.saveJson("DailyGameWordsPlayed", []);

            // Update stats relating to a new daily game.
            this.incrementStat("gamesPlayed");
        } else {
            // Existing daily game; recover the words played so far.
            this.dailyGameWordsPlayed = Cookie.getJsonOrElse("DailyGameWordsPlayed", []);
            console.log("this.dailyGameWordsPlayed:", this.dailyGameWordsPlayed);
        }
    }

    static getGameNumber() {
        const nowTimestamp = (new Date()).getTime();
        const msElapsed = nowTimestamp - DailyGameDisplay.BaseTimestamp;
        return Math.floor(msElapsed / DailyGameDisplay.DateIncrementMs) + 1;
    }

    static getMsUntilNextGame() {
        const nextGameNum = DailyGameDisplay.getGameNumber() + 1;
        const nextGameTimestamp = DailyGameDisplay.BaseTimestamp + (nextGameNum * DailyGameDisplay.DateIncrementMs)
        return nextGameTimestamp - (new Date()).getTime();
    }

    /* ----- Callbacks ----- */

    // Override superclass callback to update DailyStats cookie.
    additionClickCallback(event) {
        let me = event.srcElement.callbackAccessor;
        me.updateGameStats(super.additionClickCallback(event));

        // NOTE: No need to save words in DailyGameWordsPlayed because an addition
        // doesn't actually provide a word; we'll pick up the new word in
        // pickerChangeCallback().
    }

    // Override superclass callback to update DailyStats and DailyGameWordsPlayed cookie.
    deletionClickCallback(event) {
        let me = event.srcElement.callbackAccessor,
            gameResult = super.deletionClickCallback(event);
        me.updateGameStats(gameResult);
        if (gameResult === Const.OK) {
            this.dailyGameWordsPlayed = this.game.getWordsPlayedSoFar();
            this.saveJson("DailyGameWordsPlayed", this.dailyGameWordsPlayed);
        }
    }

    // Override superclass callback to update DailyStats and DailyGameWordsPlayed cookie.
    pickerChangeCallback(event) {
        let me = event.srcElement.callbackAccessor,
            gameResult = super.pickerChangeCallback(event);
        me.updateGameStats(gameResult);

        if (gameResult === Const.OK) {
            this.dailyGameWordsPlayed = this.game.getWordsPlayedSoFar();
            this.saveJson("DailyGameWordsPlayed", this.dailyGameWordsPlayed);
        }
    }

    updateGameStats(gameResult) {
        if (gameResult === Const.OK && this.game.isOver()) {
            this.incrementStat("gamesCompleted");

            // This returns an object that includes an 'extraSteps' property when the
            // game is over (which we've determined is the case here). We use extraSteps
            // to determine which stat to increment.
            let dailyGameInfo = this.game.getGameInfo();
            console.log("updateGameStats(): dailyGameInfo:", dailyGameInfo);

            if (dailyGameInfo.extraSteps >= Const.TOO_MANY_EXTRA_STEPS) {
                this.incrementStat("gamesFailed");
            }
        }
    }

    /* ----- Utilities ----- */

    getGameInfo() {
        let gameInfo = this.game.getGameInfo();
        gameInfo.dailyGameNumber = this.dailyGameNumber;

        return gameInfo;
    }

    // Increment the given stat, update the stats cookie, and update the stats display content.
    incrementStat(whichStat) {
        // Only update stats if this is a valid daily game.
        if (this.validGame) {
            this.dailyStats[whichStat] += 1;
            Cookie.saveJson("DailyStats", this.dailyStats);
        }
    }

    // Called from AppDisplay when "Solution" button is clicked.
    showSolution() {
        // TODO: Add an "are you sure?"
        this.dailySolutionShown = true;
        Cookie.save("DailySolutionShown", true);
        this.incrementStat("gamesShown");
        this.game.finishGame();

        // Pass "true" to showMove() to indicate the user has elected to show the
        // solution so that the happy "game won" toast is not shown.
        this.showMove(true);
    }
}

export { DailyGameDisplay };
