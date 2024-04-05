import { BaseLogger } from './BaseLogger.js';
import { Cookie } from './Cookie.js';
import { ElementUtilities } from './ElementUtilities.js';
import { GameDisplay } from './GameDisplayCell.js';
import { PseudoGame } from './PseudoGame.js';
//import * as Const from './Const.js';

class DailyGameDisplay extends GameDisplay {
    /*
    ** ===============
    ** CLASS VARIABLES
    ** ===============
    */

    /*
    ** ============
    ** CONSTRUCTION
    ** ============
    */

    constructor(gameDiv, pickerDiv, callbacks, dict) {

        super();

    }

    /*
    ** ================================
    ** METHODS TO CONSTRUCT THE DISPLAY
    ** ================================
    */

    constructGame() {
        this.game = new PseudoGame("hard", "pear");
        //this.game = new PseudoGame("fate", "sop");
        this.showMove();
    }

    // Create and display today's daily game.
    constructDailyGame() {

        // Get today's daily game descriptor; we'll use it to determine whether it is time
        // to create a new game.
        const todaysDailyGameDescriptor = DailyGameGenerator.generate();

        if (! todaysDailyGameDescriptor.isValidGame()) {
            // No daily game? Something went awry; use the backup.
            this.showToast("Unable to create daily game;<br>here is a fun back-up");
            this.dailyGame = this.backupDailyGame;
        } else {
            if (todaysDailyGameDescriptor.isNewGame()) {
                this.dailyGameNumber = todaysDailyGameDescriptor.getNumber();
                this.dailySolutionShown = false;

                // Update stats relating to a new daily game.
                this.incrementStat("gamesPlayed");
                if (this.hardMode) {
                    this.incrementStat("gamesPlayedHardMode");
                }

                // Create a solution from today's daily game start/target words.
                // No need to check solution for success -- daily games will be
                // pre-verified to have a solution.
                const solution = Solver.fastSolve(
                    this.dict, todaysDailyGameDescriptor.getStart(), todaysDailyGameDescriptor.getTarget());
                this.dailyGame = new Game("DailyGame", this.dict, solution, this.typeSavingMode);
            } else {
                // Existing daily game; reconstruct it from the cookie (which we've recovered
                // and saved as this.dailyGameWords).
                this.dailyGame = this.constructGameFromCookieWords("DailyGame", this.dailyGameWords);
            }
        }

        // Save the start/target words so we can prevent the user from creating
        // a practice game using these words.
        this.dailyStartWord = this.dailyGame.getStart();
        this.dailyTargetWord = this.dailyGame.getTarget();

        // Now use the daily game to construct the tile display.
        this.gameTileDisplay = new GameTileDisplay(this.dailyGame, this.dict, this.gameWordsDiv, this);

        // Hard and Type-Saving modes are implemented in the game tile display,
        // so tell it what our modes are.
        this.gameTileDisplay.setHardMode(this.hardMode);
        this.gameTileDisplay.setTypeSavingMode(this.typeSavingMode);

        // Now, pretend the user clicked the Daily button, because we need
        // to do exactly the same thing.
        this.dailyCallback();
    }

    pickerChangeCallback(event) {
        /*
        //console.log("pickerChangeCallback(): event: ", event);
        if (this.letterPicker.value === GameDisplay.PICKER_UNSELECTED) {
            // TODO: Show a toast saying to pick a letter?
            return;
        }

        // Change the size of the picker back to 1 when a letter has been picked.
        this.letterPicker.setAttribute("size", 1);

        let letterPosition = parseInt(event.srcElement.getAttribute('letterPosition')),
            isValidWord = this.game.playLetter(letterPosition, this.letterPicker.value);

        this.letterPicker.value = GameDisplay.PICKER_UNSELECTED;

        this.showMove();
        */
        super.pickerChangeCallback(event);
    }

    additionClickCallback(event) {
        /*
        //console.log("additionClickCallback(): event: ", event);
        let additionPosition = parseInt(event.srcElement.getAttribute('additionPosition'));
        this.game.playAdd(additionPosition);

        this.showMove();
        */
        super.additionClickCallback(event);
    }

    deletionClickCallback(event) {
        /*
        //console.log("deletionClickCallback(): event: ", event);
        let deletionPosition = parseInt(event.srcElement.getAttribute('deletionPosition')),
            isValidWord = this.game.playDelete(deletionPosition);

        this.showMove();
        */
        super.deletionClickCallback(event);
    }
}

// ============================ FOLD THIS INTO DailyGameDisplay

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

export { DailyGameDisplay };
