import { Cookie } from './Cookie.js';

class DailyGameGenerator {
    // TODO: Update!
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

    static calculateGameNum() {
        const nowTimestamp = (new Date()).getTime();
        const msElapsed = nowTimestamp - DailyGameGenerator.BaseTimestamp;
        return Math.floor(msElapsed / DailyGameGenerator.DateIncrementMs) + 1;
    }

    static getMsUntilNextGame() {
        const nextGameNum = DailyGameGenerator.calculateGameNum() + 1;
        const nextGameTimestamp = DailyGameGenerator.BaseTimestamp + (nextGameNum * DailyGameGenerator.DateIncrementMs)
        return nextGameTimestamp - (new Date()).getTime();
    }

    // Generate a DailyGameDescriptor
    static generate() {
        // Get the DailyGameNumber cookie; this can be manually deleted
        // to restart the daily game number determination.
        const currentDailyGameNumber = Cookie.getInt("DailyGameNumber");

        // Debug-only cookie that can be manually added to reduce a day
        // to mere minutes.
        const debugIncrement = Cookie.getInt("DebugDateIncrementMin");

        // Are we debugging daily games?
        if (debugIncrement) {
            // Yes, we're debugging, so override the standard one day increment.
            DailyGameGenerator.DateIncrementMs = debugIncrement * 60 * 1000;

            // Is this a "fresh start"?
            if (!currentDailyGameNumber) {
                // Yes! Set the base timestamp to now and save it in a debug-only cookie.
                DailyGameGenerator.BaseTimestamp = (new Date()).getTime();
                Cookie.saveInt("DebugBaseTimestamp", DailyGameGenerator.BaseTimestamp);
            } else {
                // No, but we're debugging, so get get the timestamp from the cookie.
                DailyGameGenerator.BaseTimestamp = Cookie.getInt("DebugBaseTimestamp");
            }
        } else {
            // Not debugging daily games; set the base timestamp based
            // on our static base date -- the date at which we set the clock
            // for the very first daily game.
            DailyGameGenerator.BaseTimestamp = DailyGameGenerator.BaseDate.getTime();
        }


        // Now, determine the game number and get the game data from the GameWords object.
        let gameData = null;
        let validGame = false;
        const gameNumber = DailyGameGenerator.calculateGameNum();
        if (gameNumber in DailyGameGenerator.GameWords) {
            gameData = DailyGameGenerator.GameWords[gameNumber];
            validGame = true;
        }

        // If we didn't recover a daily game number from the cookies or
        // the number we recovered isn't the game number we just calculated,
        // this is a new daily game,
        let newGame = false;
        if ((! currentDailyGameNumber) || (currentDailyGameNumber != gameNumber)) {
            // New daily game!
            Cookie.save("DailyGameNumber", gameNumber);
            Cookie.save("DailySolutionShown", false);
            newGame = true;
        }
        
        return new DailyGameDescriptor(gameNumber, gameData, validGame, newGame);
    }
}

// This class holds the daily game number and associated data based on the current
// time and the "base date" which is the beginning of time for WordChain.
class DailyGameDescriptor {

    constructor(gameNumber, gameData, validGame, newGame) {
        this.gameNumber = gameNumber;
        this.gameData = gameData;
        this.validGame = validGame;
        this.newGame = newGame;
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

    isNewGame() {
        return this.newGame;
    }

    isValidGame() {
        return this.validGame;
    }
}

export { DailyGameGenerator };
