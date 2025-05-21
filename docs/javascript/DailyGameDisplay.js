import { ElementUtilities } from './ElementUtilities.js';
import { Game, DailyGame } from './Game.js';
import { GameDisplay } from './GameDisplay.js';
import * as Const from './Const.js';

class DailyGameDisplay extends GameDisplay {

    /* ----- Construction ----- */

    constructor(appDisplay, gameDiv, pickerDiv) {
        super(appDisplay, gameDiv, pickerDiv, "daily-picker");

        this.game = new DailyGame(); // maybe recovered, maybe from scratch
        // TODO unneeded?  this.updateDailyGameData();
    }

    /* ----- Determination of Daily Game Information ----- */

    // called every n seconds on a timer, to see if the game has expired.  If so, create a new DailyGame

    updateDailyGameData() {

        const makeNewGame = this.game.isOld();

        if (makeNewGame) {
            Const.GL_DEBUG && this.logDebug("current daily game is old", "daily");
            this.game = new DailyGame(); // it will try to recover, see the game is old, and make a new game
            // Refresh the stats display in case it is open.
            this.appDisplay.refreshStats();
            this.updateDisplay();
        }
        return makeNewGame;
    }

    /* ----- Utilities ----- */

    isNewDailyGame() {
        return this.game.isNewDailyGame();
    }

    dailyGameNumber() {
        return this.game.gameState.dailyGameNumber;
    }

    gameIsBroken() {
        return this.game.isBroken();
    }

    gameIsOver() {
        return this.game.isOver();
    }
}

export { DailyGameDisplay };
