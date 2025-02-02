import { BaseLogger } from './BaseLogger.js';
import { ElementUtilities } from './ElementUtilities.js';
import { Game } from './Game.js';
import { Picker } from './Picker.js';
import * as Const from './Const.js';

import { AdditionCell, DeletionCell, ActiveLetterCell, FutureLetterCell, PlayedLetterCell, TargetLetterCell } from './Cell.js';


class GameDisplay extends BaseLogger {

    /* ----- Construction ----- */

    constructor(appDisplay, gameDiv, pickerDiv, pickerId) {

        super();

        this.appDisplay = appDisplay;

        this.gameDiv   = gameDiv;
        this.pickerDiv = pickerDiv;
        this.pickerId  = pickerId;

        this.createPicker();

        // This will be (re)populated in showGameAfterMove().
        // This is an array of three-element arrays, which act like a Python tuple:
        // the word, whether it was played, and whether it was correct(relevant
        // only if it was played).
        this.gameState = [];

        this.wrongMoves = null;

        // This will be used to keep track of a user's selection if we are in confirmation mode.
        this.selectedButton = null;

        // Derived class constructor must call constructGame().
    }

    /* ----- Picker ----- */

    createPicker() {
        this.letterPicker = new Picker(this, this.pickerDiv, this.pickerId);
        this.currentLetter = " ";
    }

    disablePicker() {
        this.letterPicker.disable();
    }

    enablePicker() {
        this.letterPicker.enable();
    }

    // This is kind of a callback, but doesn't really follow our callback
    // protocol because of how the picker is implemented as a separate object.
    letterPicked(letter, letterPosition) {
        Const.GL_DEBUG && this.logDebug("letterPicked(): letter:", letter, ", letterPosition:", letterPosition, "picker");

        if (this.game.isOver()) {
            console.error("GameDisplay.letterPicked(): game is already over");
            return Const.UNEXPECTED_ERROR;
        }

        if (letter === this.currentLetter) {
            this.appDisplay.showToast(Const.PICK_NEW_LETTER);
            return Const.PICK_NEW_LETTER;
        }

        let gameResult = this.game.playLetter(letterPosition, letter);
        this.processGameResult(gameResult);
        // if the sub-class wants to persist anything after a letter is picked, it should do it by overriding this "pure-virtual" call.
        this.updateGameInProgressPersistence(gameResult);
        return gameResult;
    }

    /* ----- Game ----- */

    addTd() {
        return ElementUtilities.addElementTo("td", this.rowElement, {class: 'td-game'});
    }

    canShowSolution() {
        // We can only show the solution if it isn't already shown or if the game is not won.
        return !(this.getSolutionShown() || this.game.isWinner())
    }

    // Called from derived class!
    constructGame(start, target, gameState) {
        Const.GL_DEBUG && this.logDebug ("GameDisplay.constructGame(): start: ", start, " target: ", target, " gameState: ", gameState, "game");
        this.game = new Game(start, target, gameState);
        this.showGameAfterMove();
    }

    displayAdd(displayInstruction, isStartWord) {
        const me = this;

        // Disable the picker; it's not used for ADD moves.
        this.pickerEnabled = false;

        function getCell(letter, letterPosition) {
            return new ActiveLetterCell(letter, letterPosition, me.letterPicker,
                displayInstruction.moveRating, displayInstruction.changePosition, isStartWord);
        }

        const hideAdditionCells = false;
        this.displayCommon(displayInstruction, getCell, hideAdditionCells);
    }

    displayChange(displayInstruction, isStartWord) {
        const me = this;

        // We need the picker for CHANGE moves.
        this.pickerEnabled = true;

        function getCell(letter, letterPosition) {
            return new ActiveLetterCell(letter, letterPosition, me.letterPicker,
                displayInstruction.moveRating, displayInstruction.changePosition, isStartWord);
        }

        // changePosition goes 1..wordLength, so need to subtract 1.
        this.currentLetter = displayInstruction.word[displayInstruction.changePosition - 1];

        const hideAdditionCells = true;
        this.displayCommon(displayInstruction, getCell, hideAdditionCells);
    }

    displayDelete(displayInstruction, tableElement, isStartWord) {
        const me = this;

        // Disable the picker; it's not used for DELETE moves.
        this.pickerEnabled = false;

        function getActiveLetterCell(letter, letterPosition) {
            return new ActiveLetterCell(letter, letterPosition, me.letterPicker,
                displayInstruction.moveRating, displayInstruction.changePosition, isStartWord);
        }

        // First, display the letter cells.
        const hideAdditionCells = true;
        this.displayCommon(displayInstruction, getActiveLetterCell, hideAdditionCells);

        // Now we add an extra <tr> element for the deletion cell row.
        this.rowElement = ElementUtilities.addElementTo("tr", tableElement, {class: "tr-game"});

        // We need to use a copy of 'this' as 'me' in the body of this local function.
        function getDeletionCell(letter, letterPosition) {
            return new DeletionCell(letterPosition, me, me.deletionClickCallback);
        }

        this.displayCommon(displayInstruction, getDeletionCell, hideAdditionCells);
    }

    displayFuture(displayInstruction) {
        function getCell(letter, letterPosition) {
            return new FutureLetterCell(letter, letterPosition, displayInstruction.changePosition);
        }

        this.displayCommon(displayInstruction, getCell);
    }

    displayPlayed(displayInstruction, isStartWord) {
        function getCell(letter, letterPosition) {
            return new PlayedLetterCell(letter, displayInstruction.moveRating, isStartWord);
        }

        this.displayCommon(displayInstruction, getCell);
    }

    // we only display the Target as Target if the game is not over.  If it is over, it will be
    // displayed as Played, not Target.

    displayTarget(displayInstruction) {

        function getCell(letter, __letterPosition) {
            return new TargetLetterCell(letter);
        }

        this.displayCommon(displayInstruction, getCell);
    }

    getSolutionShown() {
        // this is a "pure virtual" function that should never be called directly.
        error.log("GameDisplay.getSolutionShown() should never be called.  Only call subclass implementations");
        return false;
    }

    isConfirmationMode() {
        return this.appDisplay.isConfirmationMode();
    }

    showGameAfterMove(skipToast=false) {
        const container = ElementUtilities.addElementTo("div", this.gameDiv, {class: "game-container"}),
              tableDiv = ElementUtilities.addElementTo("div", container, {class: "table-div"}),
              tableElement = ElementUtilities.addElementTo("table", tableDiv, {class: "table-game"});

        // See whether the user requested the solution.
        // Daily and Practice subclasses manage this separately in a pure virtual function getSolutionShown()
        let userRequestedSolution = this.getSolutionShown();
        Const.GL_DEBUG && this.logDebug("showGameAfterMove() userRequestedSolution=", userRequestedSolution, "game");

        this.scoreDiv = ElementUtilities.addElementTo("div", container, {class: "break score-div"});

        // Create an element that can be used to add buttons (or whatever) after the display of
        // elements for the game.
        this.postGameDiv = ElementUtilities.addElementTo("div", container, {class: "break post-game-div"});

        // Create an element in which we will show WordChain's original solution.
        this.originalSolutionDiv = ElementUtilities.addElementTo("div", container, {class: "break original-solution-div"});

        this.rowElement = ElementUtilities.addElementTo("tr", tableElement, {class: "tr-game"});

        // We'll build up the game state from the displayInstruction objects
        // that the game returns. The derived classes will save the state in
        // a cookie.
        this.gameState = [];

        let displayInstructions = this.game.getDisplayInstructions();

        // all words are played words until we hit the first future or target word:

        let isStartWord = true,
            activeMoveRating = null;

        for (let displayInstruction of displayInstructions) {
            Const.GL_DEBUG && this.logDebug("displayInstruction:", displayInstruction, "instruction");

            let wordWasPlayed = (displayInstruction.displayType !== Const.FUTURE) && (displayInstruction.displayType !== Const.TARGET);

            // Const.PLAYED indicates the word was played before the active one.
            if (wordWasPlayed && displayInstruction.displayType != Const.PLAYED) {
                activeMoveRating = displayInstruction.moveRating;
            }

            this.gameState.push([
                displayInstruction.word,
                wordWasPlayed,
                displayInstruction.moveRating
                ]);

            // These instructions all indicate the active word.
            // Note that the active word has also been played.
            if (displayInstruction.displayType === Const.ADD) {
                this.displayAdd(displayInstruction, isStartWord);
                ElementUtilities.addClass(this.rowElement, "tr-game-active");

            } else if (displayInstruction.displayType === Const.CHANGE) {
                this.displayChange(displayInstruction, isStartWord);
                ElementUtilities.addClass(this.rowElement, "tr-game-active");

            } else if (displayInstruction.displayType === Const.DELETE) {
                // This method adds another row, so unlike the others,
                // it needs access to the table element.
                this.displayDelete(displayInstruction, tableElement, isStartWord);
                ElementUtilities.addClass(this.rowElement, "tr-game-active");

            // These instructions indicate a word other than the active one.
            } else if (displayInstruction.displayType === Const.FUTURE) {
                this.displayFuture(displayInstruction);

            } else if (displayInstruction.displayType === Const.PLAYED) {
                this.displayPlayed(displayInstruction, isStartWord);

            } else if (displayInstruction.displayType === Const.TARGET) {
                this.displayTarget(displayInstruction);

            } else {
                console.error("Unexpected displayType: ", displayInstruction.displayType);
            }

            isStartWord = false;

            this.rowElement = ElementUtilities.addElementTo("tr", tableElement, {class: "tr-game"});
        }

        // Were there more wrong words than the last time we showed a move?
        // If so, we need to show a toast message.
        const wrongMoveCount = this.game.numWrongMoves();
        if (this.wrongMoves != null && wrongMoveCount > this.wrongMoves && !skipToast) {
            // Just in case moveRating never got set (which would be a bug)
            // check for null and use WRONG_MOVE if null.
            this.appDisplay.showToast(activeMoveRating || Const.WRONG_MOVE);
        }
        this.wrongMoves = wrongMoveCount;

        // Delete old move and add new one.
        ElementUtilities.deleteChildren(this.gameDiv);
        ElementUtilities.addElementTo(container, this.gameDiv);

        if (this.pickerEnabled) {
            this.enablePicker();
        } else {
            this.disablePicker();
        }

        if (this.game.isOver()) {
            if (!userRequestedSolution) {
                if (!skipToast) {
                    if (this.game.isWinner()) {
                        this.appDisplay.showToast(Const.GAME_WON);
                    } else {
                        this.appDisplay.showToast(Const.GAME_LOST);
                    }
                }

                const scoreText = Const.SCORE_TEXT[this.wrongMoves];
                ElementUtilities.addElementTo("label", this.scoreDiv, {class: "score-label"}, `Score: ${scoreText}`);
            }

            this.disablePicker();

            // If the derived class defined a function to do additional things when
            // the game is over, call the function.
            if (this.additionalGameOverActions) {
                this.additionalGameOverActions();
            }

            // Display WordChain's original solution if different from the user's solution.
            // Otherwise dispaly a message indicating that they are the same.
            var originalSolutionWords = this.game.getOriginalSolutionWords(),
                userSolutionWords = this.game.getUserSolutionWords(),
                originalSolutionText;

            if (originalSolutionWords == userSolutionWords) {
                originalSolutionText = "Your solution is the same as WordChain's original solution!<p>";
            } else {
                originalSolutionText = `WordChain's original solution:<br>${originalSolutionWords}<p>`;
            }
            Const.GL_DEBUG && this.logDebug("GameDisplay.showGameAfterMove(): original solution words: ", originalSolutionWords,
                    " user solution words: ", userSolutionWords,  "game");
            ElementUtilities.addElementTo("label", this.originalSolutionDiv, {class: "original-solution-label"}, `${originalSolutionText}`);
            const imageDiv = ElementUtilities.addElementTo("div", this.originalSolutionDiv, {class: "icon-div"});
            ElementUtilities.addElementTo("img", imageDiv, {src: "../images/favicon.png", class: "word-chain-icon"});
            ElementUtilities.addElementTo("label", imageDiv, {class: "original-dolution-label"}, "Thank you for playing WordChain!");
        }

        // Enable or disable the Solution button.
        this.appDisplay.setSolutionStatus();
    }

    /* ----- Callbacks ----- */

    // This function's return value is needed ONLY for the testing infrastructure.
    additionClickCallback(event) {

        Const.GL_DEBUG && this.logDebug("GameDisplay.additionClickCallback(): event: ", event, "callback");

        if (this.game.isOver()) {
            console.error("GameDisplay.additionClickCallback(): game is already over");
            return Const.UNEXPECTED_ERROR;
        }

        if (this.needsConfirmation(event.srcElement)) {
            return Const.NEEDS_CONFIRMATION;
        }

        let additionPosition = parseInt(event.srcElement.getAttribute('additionPosition')),
            gameResult = this.game.playAdd(additionPosition);

        this.processGameResult(gameResult);
        return gameResult;
    }

    // This function's return value is needed ONLY for the testing infrastructure.
    deletionClickCallback(event) {

        Const.GL_DEBUG && this.logDebug("GameDisplay.deletionClickCallback(): event: ", event, "callback");

        if (this.game.isOver()) {
            console.error("GameDisplay.deletionClickCallback(): game is already over");
            return Const.UNEXPECTED_ERROR;
        }

        if (this.needsConfirmation(event.srcElement)) {
            return Const.NEEDS_CONFIRMATION;
        }

        let deletionPosition = parseInt(event.srcElement.getAttribute('deletionPosition')),
            gameResult = this.game.playDelete(deletionPosition);

        this.processGameResult(gameResult);
        this.updateGameInProgressPersistence(gameResult);
        return gameResult;
    }

    /* ----- Utilities ----- */

    // cellCreator is a factory method to produce the right kind of cell,
    // including when the cell is for the start word.
    displayCommon(displayInstruction, cellCreator, hideAdditionCells=true) {
        var additionPosition = 0,
            additionCell = null,
            letterCell = null,
            tdElement = null,
            wordLength = displayInstruction.wordLength,
            word = displayInstruction.word,
            letters = word.length !== 0 ? word.split('') : ' '.repeat(wordLength),
            moveRating = displayInstruction.moveRating;

        // We add AdditionCells for every word we display so that we use up their
        // space, thus making the letter cells always line up properly.
        // The AdditionCells are hidden except when displaying an active row that
        // requires adding a letter.
        tdElement = this.addTd();
        additionCell = new AdditionCell(additionPosition, hideAdditionCells, this, this.additionClickCallback);

        // Add special class to first addition cell to give it extra space on the left.
        additionCell.addClass("action-cell-addition-first");

        ElementUtilities.addElementTo(additionCell.getElement(), tdElement);
        additionPosition++;

        for (let letterIndex = 0; letterIndex < wordLength; letterIndex++) {
            // Add the letter cell for this current letter.
            tdElement = this.addTd();
            letterCell = cellCreator(letters[letterIndex], letterIndex + 1);
            ElementUtilities.addElementTo(letterCell.getElement(), tdElement);

            // Add the next addition cell.
            additionCell = new AdditionCell(additionPosition, hideAdditionCells, this, this.additionClickCallback);

            tdElement = this.addTd();
            ElementUtilities.addElementTo(additionCell.getElement(), tdElement);

            additionPosition++;
        }

        // Add special class to last addition cell to give it extra space on the right.
        additionCell.addClass("action-cell-addition-last");
    }

    // This function is used for confirmation mode to find the element whose class needs to
    // be changed to indicate whether confirmation is needed. In the case of picker letters,
    // it will be the button itself, but for action cells it will be an ancestor, and we use
    // the builtin element.closest() function to find the selected element whose class
    // contains the class of interest.
    findSelectedWithClass(classOfInterest) {
        // Assume the element is the selected button.
        var element = this.selectedButton;

        // Does the element's class contain the class passed in?
        if (element.getAttribute('class').indexOf(classOfInterest) < 0)
        {
            // No -- use closest() to find the right one. The argument to closest()
            // is a selector; here we're saying "find a <div> element whose 'class'
            // attribute contains the class passed in. (The *= means contains;
            // we would use ^= for starts-with and $= for ends-with.)
            element = this.selectedButton.closest(`div[class*="${classOfInterest}"]`)
        }

        return element;
    }

    // A list summarizing the moves of the game.
    // Unplayed words get a move rating of Const.FUTURE
    getMoveSummary() {
        var summary = [];

        for (let [word, wasPlayed, moveRating] of this.gameState) {
            if (wasPlayed) {
                summary.push([moveRating, word.length]);
            } else {
                summary.push([Const.FUTURE, word.length]);
            }
        }

        return summary;
    }

    // Determines whether the button that the user clicked (a letter or a plus/minus
    // action cell) needs to be confirmed. It returns true if so; false if not.
    needsConfirmation(clickedButton) {
        Const.GL_DEBUG && this.logDebug("needsConfirmation() clickedButton:", clickedButton, "callback");
        // Is the user playing with confirmation mode set?
        if (this.isConfirmationMode()) {
            // Yes -- has the user selected a letter? If so they may either be confirming
            // or they may have changed their mind.
            if (this.selectedButton !== null) {
                // User has selected a letter; is it the same letter that they selected before?
                if ( clickedButton  === this.selectedButton) {
                    // User is confirming! Show this button as unselected, and reset
                    // selectedButton for the next time a letter needs to be selected.
                    this.showUnselected();
                    this.selectedButton = null;
                    return false;
                } else {
                    // User changed the selection; it should remain unconfirmed.

                    // Return the styling on the previous selection to unselected.
                    this.showUnselected();

                    // Now, change the selected button and show it as unconfirmed.
                    this.selectedButton = clickedButton;
                    this.showUnconfirmed();
                    return true;
                }
            } else {
                // User has not yet selected a letter; save the currently selected button
                // and show it unconfirmed.
                this.selectedButton = clickedButton;
                this.showUnconfirmed();
                return true;
            }
        } else {
            // No confirmation mode, so confirmation not needed.
            return false;
        }
    }

    processGameResult(gameResult) {
        Const.GL_DEBUG && this.logDebug("GameDisplay.processGameResult() gameResult: ", gameResult, "callback");
        if (gameResult === Const.BAD_LETTER_POSITION) {
            console.error(gameResult);
            this.appDisplay.showToast(Const.UNEXPECTED_ERROR);
            // TODO-PRODUCTION: Should end the game or some such ...
        } else if (gameResult !== Const.OK) {
            // D'OH, Genius moves are possible results as of Oct 2024.
            // Ugh, Dodo moves are possible results as of Nov 2024.
            this.appDisplay.showToast(gameResult);
        }

        this.showGameAfterMove();
    }

    // Changes the class on the appropriate element relative to the selected button
    // to 'button-unconfirmed'.
    showUnconfirmed() {
        const unselectedElement = this.findSelectedWithClass(Const.UNSELECTED_STYLE);
        ElementUtilities.removeClass(unselectedElement, Const.UNSELECTED_STYLE)
        ElementUtilities.addClass(unselectedElement, Const.UNCONFIRMED_STYLE)
    }

    // Changes the class on the appropriate element relative to the selected button
    // to 'button-unselected'.
    showUnselected() {
        const unconfirmedElement = this.findSelectedWithClass(Const.UNCONFIRMED_STYLE);
        ElementUtilities.removeClass(unconfirmedElement, Const.UNCONFIRMED_STYLE)
        ElementUtilities.addClass(unconfirmedElement, Const.UNSELECTED_STYLE)
    }
}

export { GameDisplay };
