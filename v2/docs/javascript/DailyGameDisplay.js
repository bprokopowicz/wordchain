import { Cookie } from './Cookie.js';
import { ElementUtilities } from './ElementUtilities.js';
import { GameDisplay } from './GameDisplay.js';
import * as Const from './Const.js';

class DailyGameDisplay extends GameDisplay {

    /* ----- Class Variables ----- */

    static BaseDate = new Date("2023-10-01T00:00:00.000+00:00");
    static BaseTimestamp = null;
    static DateIncrementMs = 24 * 60 *60 * 1000; // one day in ms

    static GameWords = {
           1: {
            start:  "mister",
            target: "egg",
        }, 2: {
            start:  "big",
            target: "calves",
        }, 3: {
            start:  "night",
            target: "hawk",
        }, 4: {
            start:  "broken",
            target: "spoon",
        }, 5: {
            start:  "knee",
            target: "space",
        }, 6: {
            start:  "burned",
            target: "pasta",
        }, 7: {
            start:  "night",
            target: "hawk",
        }, 8: {
            start:  "magic",
            target: "comic",
        }, 9: {
            start:  "house",
            target: "beer",
        }, 10: {
            start:  "plan",
            target: "age",
        }, 11: {
            start:  "south",
            target: "west",
        }, 12: {
            start:  "cashew",
            target: "eaters",
        }, 13: {
            start:  "tiny",
            target: "shrub",
        }
    }

    /* ----- Construction ----- */

    constructor(appDisplay, gameDiv, pickerDiv) {
        super(appDisplay, gameDiv, pickerDiv);

        // This keeps track of whether the user clicked the Show Solution button
        // for the daily game.
        this.dailySolutionShown = Cookie.getBoolean("DailySolutionShown");

        // This keeps track of the most recently played daily game number.
        this.dailyGameNumber = Cookie.getInt("DailyGameNumber");

        // Construct initial stats to be used if we don't have a cookie for daily stats.
        let initialStats = {
            gamesPlayed:         0,
            gamesCompleted:      0,
            gamesShown:          0,
            tooManyExtraSteps:   0,
        }

        // Now create a stat for each allowed number of extra steps, and initialize
        // their values to 0. The stat properties for these is 0..TOO_MANY_EXTRA_STEPS.
        for (let extraSteps = 0; extraSteps <= Const.TOO_MANY_EXTRA_STEPS; extraSteps++) {
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

        this.startWord = "dog";     // TEMPORARY
        this.targetWord = "bite";   // TEMPORARY
        this.validGame = true;      // TEMPORARY
        this.incrementStat("gamesPlayed"); // TEMPORARY
        this.constructGame(this.startWord, this.targetWord);
    }

    /* ----- Determination of Daily Game Information ----- */

    setDailyGameData() {
        // Get the DailyGameNumber cookie; this can be manually deleted
        // to restart the daily game number determination.
        const currentDailyGameNumber = Cookie.getInt("DailyGameNumber");

        // Debug-only cookie that can be manually added to reduce a day
        // to mere minutes.
        const debugIncrement = Cookie.getInt("DebugDateIncrementMin");

        // Are we debugging daily games?
        if (debugIncrement) {
            // Yes, we're debugging, so override the standard one day increment.
            DailyGameDisplay.DateIncrementMs = debugIncrement * 60 * 1000;

            // Is this a "fresh start"?
            if (!currentDailyGameNumber) {
                // Yes! Set the base timestamp to now and save it in a debug-only cookie.
                DailyGameDisplay.BaseTimestamp = (new Date()).getTime();
                Cookie.saveInt("DebugBaseTimestamp", DailyGameDisplay.BaseTimestamp);
            } else {
                // No, but we're debugging, so get get the timestamp from the cookie.
                DailyGameDisplay.BaseTimestamp = Cookie.getInt("DebugBaseTimestamp");
            }
        } else {
            // Not debugging daily games; set the base timestamp based
            // on our static base date -- the date at which we set the clock
            // for the very first daily game.
            DailyGameDisplay.BaseTimestamp = DailyGameDisplay.BaseDate.getTime();
        }

        // Now, determine the game number and get the game data from the GameWords object.
        this.validGame = false;

        this.gameNumber = DailyGameDisplay.getGameNumber();
        if (this.gameNumber in DailyGameDisplay.GameWords) {

            this.startWord = DailyGameDisplay.GameWords[this.gameNumber].start;
            this.targettWord = DailyGameDisplay.GameWords[this.gameNumber].target;
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
        if ((! currentDailyGameNumber) || (currentDailyGameNumber != this.gameNumber)) {
            // New daily game!
            Cookie.saveInt("DailyGameNumber", this.gameNumber);

            this.dailySolutionShown = false;
            Cookie.save("DailySolutionShown", false);

            // Update stats relating to a new daily game.
            this.incrementStat("gamesPlayed");
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

    additionClickCallback(event) {
        let me = event.srcElement.callbackAccessor;
        me.updateGameStats(super.additionClickCallback(event));
    }

    deletionClickCallback(event) {
        let me = event.srcElement.callbackAccessor;
        me.updateGameStats(super.deletionClickCallback(event));
    }


    pickerChangeCallback(event) {
        let me = event.srcElement.callbackAccessor;
        me.updateGameStats(super.pickerChangeCallback(event));
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
                this.incrementStat("tooManyExtraSteps");
            } else {
                this.incrementStat(dailyGameInfo.extraSteps);
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
