import { Cookie } from './Cookie.js';

class DailyGame {
    // TODO: Update!
    static BaseDate = new Date("2022-04-26T00:00:00.000+00:00");
    static BaseTimestamp = null;
    static DateIncrementMs = 24 * 60 *60 * 1000; // one day in ms

    static GameWords = {
           1: {
            start:  "fish",
            target: "soup",
        }, 2: {
            start:  "cat",
            target: "dog",
        }, 3: {
            start:  "hat",
            target: "shoes",
        }
    }

    constructor() {
        // Get the DailyGameNumber cookie; this can be manually deleted
        // to restart the daily game number determination.
        const currentDailyGameNumber = Cookie.get("DailyGameNumber");

        // Debug-only cookie that can be manually added to reduce a day
        // to mere minutes.
        const debugIncrement = Cookie.get("DebugDateIncrementMin");

        // Are we debugging daily games?
        // (Cookies are stored as strings, so if we have a cookie, convert it to a number.)
        if (debugIncrement && parseInt(debugIncrement) != 0) {
            // Yes, we're debugging, so override the standard one day increment.
            DailyGame.DateIncrementMs = debugIncrement * 60 * 1000;

            // Is this a "fresh start"?
            if (!currentDailyGameNumber) {
                // Yes! Set the base timestamp to now and save it in a debug-only cookie.
                DailyGame.BaseTimestamp = (new Date()).getTime();
                Cookie.set("DebugBaseTimestamp", DailyGame.BaseTimestamp);
            } else {
                // No, but we're debugging, so get get the timestamp from the cookie.
                DailyGame.BaseTimestamp = Cookie.get("DebugBaseTimestamp");
            }
        } else {
            // Not debugging daily games; set the base timestamp based
            // on our static base date -- the date at which we set the clock
            // for the very first daily game.
            DailyGame.BaseTimestamp = DailyGame.BaseDate.getTime();
        }

        // Now, determine the game number and get the game data from the GameWords object.
        this.gameNumber = DailyGame.calculateGameNum();
        if (this.gameNumber in DailyGame.GameWords) {
            this.gameData = DailyGame.GameWords[this.gameNumber];
            this.validGame = true;
        } else {
            this.validGame = false;
        }
    }

    static calculateGameNum() {
        const nowTimestamp = (new Date()).getTime();
        const msElapsed = nowTimestamp - DailyGame.BaseTimestamp;
        return Math.floor(msElapsed / DailyGame.DateIncrementMs) + 1;
    }

    getNumber() {
        return this.gameNumber;
    }

    getStart() {
        return this.gameData.start;
    }

    getTarget() {
        return this.gameData.target;
    }

    static getMsUntilNextGame() {
        const nextGameNum = DailyGame.calculateGameNum() + 1;
        const nextGameTimestamp = DailyGame.BaseTimestamp + (nextGameNum * DailyGame.DateIncrementMs)
        return nextGameTimestamp - (new Date()).getTime();
    };

    isValidGame() {
        return this.validGame;
    }
}

export { DailyGame };
