import { ElementUtilities } from './ElementUtilities.js';
import { Game, PracticeGame } from './Game.js';
import { GameDisplay } from './GameDisplay.js';
import { Persistence } from './Persistence.js';
import * as Const from './Const.js';

class PracticeGameDisplay extends GameDisplay {

    /* ----- Construction ----- */

    constructor(appDisplay, gameDiv, pickerDiv) {
        super(appDisplay, gameDiv, pickerDiv, "practice-picker");

        // Add a button to the "post game div" to start a new game.
        // This will be disabled and enabled as the user plays games
        // and time marches on to allow more games in a rolling 24
        // hour period. Initially disable the button; it is enabled
        // when the game is over.
        this.newGameButton = ElementUtilities.addElementTo(
            "button", this.postGameDiv,
            {class: "app-button non-header-button"},
            "New Game");
        ElementUtilities.setButtonCallback(this.newGameButton, this, this.newGameCallback);
        this.game = new PracticeGame(); // either recovered (in progress or done) or new (no saved state)
        if (!this.game.isOver()) {
            // disable the new game button because a practice game is in progress/new
            ElementUtilities.disableButton(this.newGameButton);
        }
        this.updateDisplay();
    }

    /* ----- Callbacks ----- */

    // newGameCallback() should only be exposed to the user if we already know that there are practice games remaining.
    newGameCallback(event) {
        // Note that newGameCallback() will only be called when a game is over;
        // otherwise, the button is disabled.
        // Clear out info from current game.
        ElementUtilities.deleteChildren(this.resultsDiv);
        ElementUtilities.deleteChildren(this.originalSolutionDiv);
        Persistence.clearPracticeGameState();

        this.game = new PracticeGame(); 
        this.updateDisplay();
    }

    /* ----- Utilities ----- */

    // This will be called from GameDisplay when the game is determined to be over.
    additionalGameOverActions() {
        Const.GL_DEBUG && this.logDebug("PracticeGameDisplay.additionalGameOverActions() called", "practice");
        this.game.gameState.updateStateAfterGame();

        if (this.game.gamesRemaining() > 0) {
            ElementUtilities.enableButton(this.newGameButton);
        } else {
            ElementUtilities.disableButton(this.newGameButton);

            // Notify AppDisplay that there are no more games so it can
            // disable its practice button.
            this.appDisplay.practiceGamesUsedUp();
        }
    }

    anyGamesRemaining() {
        return this.game.gamesRemaining > 0; 
    }

    // AppDisplay calls this when its periodic check determines more
    // games are available again.
    practiceGamesAvailable() {
        // Enable only if we're not in the middle of a game.
        if (this.game.isOver()) {
            ElementUtilities.enableButton(this.newGameButton);
        }
    }
}

export { PracticeGameDisplay };
