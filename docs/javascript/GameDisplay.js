import { BaseLogger } from './BaseLogger.js';
import { ElementUtilities } from './ElementUtilities.js';
import { Game, DailyGame, PracticeGame } from './Game.js';
import { Persistence } from './Persistence.js';
import { Picker } from './Picker.js';
import * as Const from './Const.js';
import { COV, clearCoverage, getCounters, setCoverageOn, setCoverageOff } from './Coverage.js';


import {
    AdditionCell,
    DeletionCell,
    EmptyLetterCell,
    LetterCellNoBackground,
    LetterCellWithBackground,
} from './Cell.js';

// ========== Faux
import { DisplayInstruction } from './DisplayInstruction.js';


class GameDisplay extends BaseLogger {

    /* ----- Construction ----- */

    constructor(appDisplay, gameDiv, pickerDiv, pickerId) {

        const CL = "GameDisplay.constructor";
        COV(0, CL);
        super();

        this.appDisplay = appDisplay;

        this.gameDiv   = gameDiv;
        this.pickerDiv = pickerDiv;
        this.pickerId  = pickerId;

        this.createPicker();

        // This will be used to keep track of a user's selection if we are in confirmation mode.
        this.selectedButton = null;

        // Create an element that holds the game grid.
        this.gameGridDiv = ElementUtilities.addElementTo("div", this.gameDiv, {class: "game-grid-div"}),

        // Create an element that to contain buttons (or whatever) after the display of
        // elements for the game.
        this.postGameDiv = ElementUtilities.addElementTo("div", gameDiv, {class: "break post-game-div"});

        // Add Show Word button to postGameDiv and enable it.
        this.showWordButton = ElementUtilities.addElementTo(
            "button", this.postGameDiv,
            {class: "app-button non-header-button"},
            "Show Word");
        ElementUtilities.setButtonCallback(this.showWordButton, this, this.showWordCallback);
        // TODO: Need to keep something in state to indicate whether the button should be enabled on restore.
        ElementUtilities.enableButton(this.showWordButton);

        // Create an element to contain game results (score, WordChain solution).
        this.resultsDiv = ElementUtilities.addElementTo("div", gameDiv, {class: "break results-div"});

        // Derived class constructor must call updateDisplay().
    }

    /* ----- Picker ----- */

    createPicker() {
        const CL = "GameDisplay.createPicker";
        COV(0, CL);
        this.letterPicker = new Picker(this, this.pickerDiv, this.pickerId);
        this.currentLetter = " ";
    }

    disablePicker() {
        const CL = "GameDisplay.disablePicker";
        COV(0, CL);
        this.letterPicker.disable();
    }

    enablePicker() {
        const CL = "GameDisplay.enablePicker";
        COV(0, CL);
        this.letterPicker.enable();
    }

    // This is kind of a callback, but doesn't really follow our callback
    // protocol because of how the picker is implemented as a separate object.
    letterPicked(letter, letterPosition) {
        const CL = "GameDisplay.letterPicked";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("letterPicked(): letter:", letter, ", letterPosition:", letterPosition, "picker");

        let result = null;

        if (this.gameIsOver()) {
            console.error("GameDisplay.letterPicked(): game is already over");
            result = Const.UNEXPECTED_ERROR;
        } else if (letter === this.currentLetter) {
            COV(1, CL);
            this.appDisplay.showToast(Const.PICK_NEW_LETTER);
            result = Const.PICK_NEW_LETTER;
        } else {
            COV(2, CL);
            // ========== Faux
            result = this.game.playLetter(letterPosition, letter);
            //result = Const.GOOD_MOVE
            this.processGamePlayResult(result);
        }

        COV(3, CL);
        return result;
    }

    /* ----- Game ----- */

    addTd() {
        const CL = "GameDisplay.addTd";
        COV(0, CL);
        const newTd = ElementUtilities.addElementTo("td", this.rowElement, {class: 'td-game'});
        if (this.rowElement.displayAsActiveRow) {
            COV(1, CL);
            ElementUtilities.addClass(newTd, "td-game-active");
        }

        COV(2, CL);
        return newTd;
    }

    // Called from derived class. Game could be recovered or newly constructed.
    updateDisplay() {
        const CL = "GameDisplay.updateDisplay";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug ("GameDisplay.updateDisplay() called.", "game");

        this.showGameAfterMove();

        // Scroll to the top of the window so that the user sees the start word.
        window.scrollTo({top: 0, behavior: 'smooth'});
    }

    displayFuture(displayInstruction) {
        const CL = "GameDisplay.displayFuture";
        COV(0, CL);

        function getCell(letter, letterPosition) {
            return new EmptyLetterCell(letterPosition, displayInstruction.changePosition);
        }

        this.displayCommon(displayInstruction, getCell);
    }

    displayPlayed(displayInstruction, isStartWord) {
        const CL = "GameDisplay.displayPlayed";
        COV(0, CL);

        const me = this,
              isTargetWord = false;

        function getCell(letter, letterPosition) {
            return new LetterCellWithBackground(letter,
                letterPosition, displayInstruction.changePosition,
                me.letterPicker, displayInstruction.moveRating,
                displayInstruction.isStartWord, isTargetWord);
        }

        this.displayCommon(displayInstruction, getCell)
    }

    displayPlayedAdd(displayInstruction) {
        const CL = "GameDisplay.displayPlayedAdd";
        COV(0, CL);
        const me = this,
              isTargetWord = false;

        function getCell(letter, letterPosition) {
            return new LetterCellWithBackground(letter,
                letterPosition, displayInstruction.changePosition,
                me.letterPicker, displayInstruction.moveRating,
                displayInstruction.isStartWord, isTargetWord);
        }

        this.displayCommon(displayInstruction, getCell);
    }

    displayPlayedChange(displayInstruction) {
        const CL = "GameDisplay.displayPlayedChange";
        COV(0, CL);
        const me = this,
              isTargetWord = false;

        function getCell(letter, letterPosition) {
            return new LetterCellWithBackground(letter,
                letterPosition, displayInstruction.changePosition,
                me.letterPicker, displayInstruction.moveRating,
                displayInstruction.isStartWord, isTargetWord);
        }

        // changePosition goes 1..wordLength, so need to subtract 1.
        // =========== splain why we save this!
        this.currentLetter = displayInstruction.word[displayInstruction.changePosition - 1];
        this.displayCommon(displayInstruction, getCell);
    }

    displayPlayedDelete(displayInstruction, tableElement) {
        const CL = "GameDisplay.displayPlayedDelete";
        COV(0, CL);

        const me = this,
              isTargetWord = false;

        function getLetterCell(letter, letterPosition) {
            return new LetterCellWithBackground(letter,
                letterPosition, displayInstruction.changePosition,
                me.letterPicker, displayInstruction.moveRating,
                displayInstruction.isStartWord, isTargetWord);
        }

        // First, display the letter cells.
        this.displayCommon(displayInstruction, getLetterCell);

        // Now we add an extra <tr> element for the deletion cell row. It is this row
        // that is highlighted as active rather than [IN ADDITION TO???] the letter cells.
        this.rowElement = ElementUtilities.addElementTo("tr", tableElement, {class: "tr-game"});
        this.rowElement.displayAsActiveRow = true;

        // We need to use a copy of 'this' as 'me' in the body of this local function.
        function getDeletionCell(letter, letterPosition) {
            return new DeletionCell(letterPosition, me, me.deletionClickCallback);
        }

        this.displayCommon(displayInstruction, getDeletionCell);
    }

    displayTarget(displayInstruction) {
        const CL = "GameDisplay.displayTarget";
        COV(0, CL);

        const letterPicker = null,
              isTargetWord = true;

        function getCell(letter, letterPosition) {
            return new LetterCellWithBackground(letter,
                letterPosition, displayInstruction.changePosition,
                letterPicker, displayInstruction.moveRating,
                displayInstruction.isStartWord, isTargetWord);
        }

        this.displayCommon(displayInstruction, getCell);
    }

    displayWordAfterAdd(displayInstruction) {
        const CL = "GameDisplay.displayWordAfterAdd";
        COV(0, CL);

        const me = this;

        function getCell(letter, letterPosition) {
            return new LetterCellNoBackground(letter,
                letterPosition, displayInstruction.changePosition, me.letterPicker);
        }

        this.displayCommon(displayInstruction, getCell);
    }

    displayWordAfterChange(displayInstruction) {
        const CL = "GameDisplay.displayWordAfterChange";
        COV(0, CL);

        const me = this;

        function getCell(letter, letterPosition) {
            return new LetterCellNoBackground(letter,
                letterPosition, displayInstruction.changePosition, me.letterPicker);
        }

        this.displayCommon(displayInstruction, getCell);
    }

    // ========== Faux
    initFauxDisplayInstructions() {
        this.fauxDisplayInstructions = DisplayInstruction.FAUX_1;
        console.log("instructions:", this.fauxDisplayInstructions);
        this.fauxMoveNum = 0;
    }

    // ========== Faux
    getFauxDisplayInstructions() {
        var instructions = this.fauxDisplayInstructions[this.fauxMoveNum];
        this.fauxMoveNum += 1;

        return instructions;
    }

    showGameAfterMove() {
        const CL = "GameDisplay.showGameAfterMove";
        COV(0, CL);
        // Delete old game container content; we're about to recreate it.
        ElementUtilities.deleteChildren(this.gameGridDiv);

        const tableDiv = ElementUtilities.addElementTo("div", this.gameGridDiv, {class: "table-div"}),
              tableElement = ElementUtilities.addElementTo("table", tableDiv, {class: "table-game"});

        this.rowElement = ElementUtilities.addElementTo("tr", tableElement, {class: "tr-game"});

        COV(1, CL);

        // all words are played words until we hit the first future or target word:

        // ========== Faux
        let displayInstructions = this.game.getDisplayInstructions(),
        //let displayInstructions = this.getFauxDisplayInstructions(),
            pickerEnabled = false,
            rowNum = 0;

        //console.log("======================");
        for (let displayInstruction of displayInstructions) {
            //console.log(displayInstruction);

            Const.GL_DEBUG && this.logDebug("displayInstruction:", displayInstruction, "instruction");

            this.hideAdditionCells = true;
            this.rowElement.displayAsActiveRow = false;
            Const.GL_DEBUG && this.logDebug("word:", displayInstruction.word, "displayType:", displayInstruction.displayType,
                    "moveRating:", displayInstruction.moveRating, "instruction");

            // These instructions all indicate the active word that has also been played.
            if (displayInstruction.displayType === Const.PLAYED_ADD) {
                COV(2, CL);
                this.hideAdditionCells = false;
                this.rowElement.displayAsActiveRow = true;
                this.displayPlayedAdd(displayInstruction);

            } else if (displayInstruction.displayType === Const.PLAYED_CHANGE) {
                COV(3, CL);
                pickerEnabled = true;
                this.rowElement.displayAsActiveRow = true;
                this.displayPlayedChange(displayInstruction);

            } else if (displayInstruction.displayType === Const.PLAYED_DELETE) {
                COV(4, CL);
                this.rowElement.displayAsActiveRow = true;
                this.displayPlayedDelete(displayInstruction, tableElement);

            // These instructions are always after a specific type of move.
            } else if (displayInstruction.displayType === Const.WORD_AFTER_ADD) {
                COV(5, CL);
                pickerEnabled = true;
                this.rowElement.displayAsActiveRow = true;
                this.displayWordAfterAdd(displayInstruction);

            } else if (displayInstruction.displayType === Const.WORD_AFTER_CHANGE) {
                COV(6, CL);
                this.displayWordAfterChange(displayInstruction);

            // These are the "less interesting" instructions.

            } else if (displayInstruction.displayType === Const.FUTURE) {
                COV(7, CL);
                this.displayFuture(displayInstruction);

            } else if (displayInstruction.displayType === Const.PLAYED) {
                COV(8, CL);
                this.displayPlayed(displayInstruction);

            } else if (displayInstruction.displayType === Const.TARGET) {
                COV(9, CL);
                this.displayTarget(displayInstruction);

            } else {
                console.error("Unexpected displayType: ", displayInstruction.displayType);
            }

            rowNum += 1;

            // Did the instruction tell us to show the par line?
            if (displayInstruction.showParLine) {
                COV(10, CL);
                ElementUtilities.addClass(this.rowElement, 'tr-wc-solution-line');
            }

            // Create the next row element if there is more to display
            if (rowNum != displayInstructions.length) {
                COV(11, CL);
                this.rowElement = ElementUtilities.addElementTo("tr", tableElement, {class: "tr-game"});
            }
        }

        if (pickerEnabled) {
            COV(12, CL);
            this.enablePicker();
        } else {
            COV(13, CL);
            this.disablePicker();
        }

        if (this.gameIsOver()) {
            COV(14, CL);
            // ========== Faux
            //this.showGameOverGoodies();
            this.showGameOverGoodies();
        }

        COV(15, CL);
    }

    showGameOverGoodies() {
        const CL = "GameDisplay.showGameOverGoodies";
        COV(0, CL);

        // Picker and Show Word should be disabled after the game.
        this.disablePicker();
        ElementUtilities.disableButton(this.showWordButton);

        // Delete old results and create new divs to go in the results div.
        ElementUtilities.deleteChildren(this.resultsDiv);
        var scoreDiv = ElementUtilities.addElementTo("div", this.resultsDiv, {class: "break score-div"}),
            originalSolutionDiv = ElementUtilities.addElementTo("div", this.resultsDiv, {class: "break original-solution-div"}),
            iconDiv = ElementUtilities.addElementTo("div", this.resultsDiv, {class: "break icon-div"});

        // Add the score.
        const scoreText = Const.SCORE_TEXT[this.game.numPenalties()];
        Const.GL_DEBUG && this.logDebug("GameDisplay.showGameOverGoodies(): this.game.numPenalties():",
                this.game.numPenalties(), "game");
        ElementUtilities.addElementTo("label", scoreDiv, {class: "score-label"}, `Score: ${scoreText}`);

        // If the derived GameDisplay class defined a function to do additional things when
        // the game is over, call the function.
        if (this.additionalGameOverActions) {
            COV(1, CL);
            this.additionalGameOverActions();
        }

        // Display WordChain's original solution if different from the user's solution.
        // Otherwise display a message indicating that they are the same.
        var originalSolutionWords = this.game.getOriginalSolutionWords(),
            userSolutionWords = this.game.getUserSolutionWords();

        if (originalSolutionWords == userSolutionWords) {
            COV(2, CL);
            ElementUtilities.addElementTo("label", originalSolutionDiv, {class: "original-solution-label"},
                "You found WordChain's solution!");
            /*
            // OLD CODE: I don't think this is relevant anymore; even if they Show Move
            // on the last word, we should give them the message.
            //
            // We don't want to show this message if the user clicked
            // 'Show Word' to reveal a word (or all words!).
            if (this.game.numShownMoves() == 0) {
            } // else no message regarding WordChain's solution.
            */
        } else {
            COV(3, CL);
            ElementUtilities.addElementTo("label", originalSolutionDiv, {class: "original-solution-label"},
                `WordChain's solution:<br>${originalSolutionWords}`);
        }

        Const.GL_DEBUG && this.logDebug("GameDisplay.showGameOverGoodies(): original solution words: ", originalSolutionWords,
                " user solution words: ", userSolutionWords,  "game");

        // Finally, toot our horn.
        ElementUtilities.addElementTo("img", iconDiv, {src: "/docs/images/favicon.png", class: "word-chain-icon"});
        ElementUtilities.addElementTo("label", iconDiv, {class: "icon-label"}, "Thank you for playing WordChain!");

        COV(4, CL);
    }

    /* ----- Callbacks ----- */

    // This function's return value is needed ONLY for the testing infrastructure.
    additionClickCallback(event) {

        const CL = "GameDisplay.additionClickCallback";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("GameDisplay.additionClickCallback(): event: ", event, "callback");

        let result = null;

        if (this.gameIsOver()) {
            console.error("GameDisplay.additionClickCallback(): game is already over");
            result = Const.UNEXPECTED_ERROR;
        } else if (this.needsConfirmation(event.srcElement)) {
            COV(1, CL);
            result = Const.NEEDS_CONFIRMATION;
        } else {
            COV(2, CL);
            let additionPosition = parseInt(event.srcElement.getAttribute('additionPosition'));
            // ========== Faux
            result = this.game.playAdd(additionPosition);
            //result = Const.GOOD_MOVE;

            this.processGamePlayResult(result);
        }

        COV(3, CL);
        return result;
    }

    // This function's return value is needed ONLY for the testing infrastructure.
    deletionClickCallback(event) {
        const CL = "GameDisplay.deletionClickCallback";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("GameDisplay.deletionClickCallback(): event: ", event, "callback");

        let result = null;

        if (this.gameIsOver()) {
            console.error("GameDisplay.deletionClickCallback(): game is already over");
            result = Const.UNEXPECTED_ERROR;
        } else if (this.needsConfirmation(event.srcElement)) {
            COV(1, CL);
            result = Const.NEEDS_CONFIRMATION;
        } else {
            COV(2, CL);
            let deletionPosition = parseInt(event.srcElement.getAttribute('deletionPosition'));

            // ========== Faux
            result = this.game.playDelete(deletionPosition);
            //result = Const.GOOD_MOVE;
            this.processGamePlayResult(result);
        }

        COV(3, CL);
        return result;
    }

    showWordCallback(event) {

        const CL = "GameDisplay.showWordCallback";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("GameDisplay.showWordCallback(): event: ", event, "callback");

        let result = null;

        if (this.showWordButton.disabled) {
            console.error("GameDisplay.showWordCallback(): button is disabled!");
            result = Const.UNEXPECTED_ERROR;
        } else if (this.gameIsOver()) {
            console.error("GameDisplay.showWordCallback(): last move already shown");
            result = Const.UNEXPECTED_ERROR;
        } else {
            COV(1, CL);
            result = this.game.showNextMove();

            this.showGameAfterMove();

            // Disable if no more moves remaining.
            if (this.gameIsOver()) {
                COV(2, CL);
                this.showGameOverToast();
            }

            // Only one Show Move allowed per game!
            ElementUtilities.disableButton(this.showWordButton);
        }

        COV(3, CL);
        return result;
    }

    /* ----- Utilities ----- */

    // cellCreator is a factory method to produce the right kind of cell,
    // including when the cell is for the start word.
    displayCommon(displayInstruction, cellCreator) {
        const CL = "GameDisplay.displayCommon";
        COV(0, CL);
        var additionPosition = 0,
            additionCell = null,
            letterCell = null,
            tdElement = null,
            word = displayInstruction.word,
            wordLength = word.length,
            letters = word.split(''),
            moveRating = displayInstruction.moveRating;

        // We add AdditionCells for every word we display so that we use up their
        // space, thus making the letter cells always line up properly.
        // The AdditionCells are hidden except when displaying an active row that
        // requires adding a letter.
        tdElement = this.addTd();
        additionCell = new AdditionCell(additionPosition, this.hideAdditionCells, this, this.additionClickCallback);

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
            additionCell = new AdditionCell(additionPosition, this.hideAdditionCells, this, this.additionClickCallback);

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
        const CL = "GameDisplay.findSelectedWithClass";
        COV(0, CL);
        // Assume the element is the selected button.
        var element = this.selectedButton;

        // Does the element's class contain the class passed in?
        if (element.getAttribute('class').indexOf(classOfInterest) < 0)
        {
            COV(1, CL);
            // TODO - this is never reached in the test suite.  Is it still live?

            // No -- use closest() to find the right one. The argument to closest()
            // is a selector; here we're saying "find a <div> element whose 'class'
            // attribute contains the class passed in. (The *= means contains;
            // we would use ^= for starts-with and $= for ends-with.)
            element = this.selectedButton.closest(`div[class*="${classOfInterest}"]`)
        }

        COV(2, CL);
        return element;
    }

    // some pass-through functions to access game and gameState

    getMsUntilNextGame() {
        const CL = "GameDisplay.getMsUntilNextGame";
        COV(0, CL);
        return this.game.gameState.getMsUntilNextGame();
    }

    getGameState() {
        const CL = "GameDisplay.getGameState";
        COV(0, CL);
        return this.game.gameState;
    }

    // Determines whether the button that the user clicked (a letter or a plus/minus
    // action cell) needs to be confirmed. It returns true if so; false if not.
    needsConfirmation(clickedButton) {
        const CL = "GameDisplay.needsConfirmation";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("needsConfirmation() clickedButton:", clickedButton, "callback");

        // Is the user playing with confirmation mode set?
        let result = null;
        if (Persistence.getConfirmationMode()) {
            COV(1, CL);
            // Yes -- has the user selected a letter? If so they may either be confirming
            // or they may have changed their mind.
            if (this.selectedButton !== null) {
                COV(2, CL);
                // User has selected a letter; is it the same letter that they selected before?
                if ( clickedButton  === this.selectedButton) {
                    COV(3, CL);
                    // User is confirming! Show this button as unselected, and reset
                    // selectedButton for the next time a letter needs to be selected.
                    this.showUnselected();
                    this.selectedButton = null;
                    result = false;
                } else {
                    COV(4, CL);
                    // User changed the selection; it should remain unconfirmed.

                    // Return the styling on the previous selection to unselected.
                    this.showUnselected();

                    // Now, change the selected button and show it as unconfirmed.
                    this.selectedButton = clickedButton;
                    this.showUnconfirmed();
                    result = true;
                }
            } else {
                COV(5, CL);
                // User has not yet selected a letter; save the currently selected button
                // and show it unconfirmed.
                this.selectedButton = clickedButton;
                this.showUnconfirmed();
                result = true;
            }
        } else {
            COV(6, CL);
            // No confirmation mode, so confirmation not needed.
            result = false;
        }

        COV(7, CL);
        return result;
    }

    processGamePlayResult(gameResult) {
        const CL = "GameDisplay.processGamePlayResult";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("GameDisplay.processGamePlayResult() gameResult: ", gameResult, "callback");
        if (this.shouldShowToastForResult(gameResult)) {
            this.appDisplay.showToast(gameResult);
        }

        this.showGameAfterMove();

        if (this.game.isOver()) {
            COV(1, CL);
            this.showGameOverToast();
        }
    }

    shouldShowToastForResult(gameResult) {
        return (gameResult == Const.WRONG_MOVE) ||
               (gameResult == Const.DODO_MOVE) ||
               (gameResult == Const.SCRABBLE_MOVE) ||
               (gameResult == Const.NOT_A_WORD) ||
               (gameResult == Const.GENIUS_MOVE);
    }

    showGameOverToast() {
        const CL = "GameDisplay.showGameOverToast";
        COV(0, CL);
        if (this.game.isWinner()) {
            COV(1, CL);
            this.appDisplay.showToast(Const.GAME_WON);
        } else {
            COV(2, CL);
            this.appDisplay.showToast(Const.GAME_LOST);
        }
    }

    // Changes the class on the appropriate element relative to the selected button
    // to 'button-unconfirmed'.
    showUnconfirmed() {
        const CL = "GameDisplay.showUnconfirmed";
        COV(0, CL);
        const unselectedElement = this.findSelectedWithClass(Const.UNSELECTED_STYLE);
        ElementUtilities.removeClass(unselectedElement, Const.UNSELECTED_STYLE)
        ElementUtilities.addClass(unselectedElement, Const.UNCONFIRMED_STYLE)
    }

    // Changes the class on the appropriate element relative to the selected button
    // to 'button-unselected'.
    showUnselected() {
        const CL = "GameDisplay.showUnselected";
        COV(0, CL);
        const unconfirmedElement = this.findSelectedWithClass(Const.UNCONFIRMED_STYLE);
        ElementUtilities.removeClass(unconfirmedElement, Const.UNCONFIRMED_STYLE)
        ElementUtilities.addClass(unconfirmedElement, Const.UNSELECTED_STYLE)
    }

    // Pass-through utility
    gameIsOver() {
        const CL = "GameDisplay.gameIsOver";
        COV(0, CL);
        return this.game.isOver();
    }


    // callGetAppCounters()/callClearAppCoverage are a hack for Test.js to access the
    // coverage data in the execution context of the GameDisplay.

    callGetAppCounters() {
        return getCounters();
    }

    callClearAppCoverage() {
        clearCoverage();
    }

    callSetCoverageOn() {
        setCoverageOn();
    }

    callSetCoverageOff() {
        setCoverageOff();
    }
}

class DailyGameDisplay extends GameDisplay {

    /* ----- Construction ----- */

    constructor(appDisplay, gameDiv, pickerDiv) {
        const CL = "DailyGameDisplay.constructor";
        COV(0, CL);
        super(appDisplay, gameDiv, pickerDiv, "daily-picker");

        // Add a button to the "post game div" to share daily game results.
        // Initially disable the button; it is enabled when the game is over.
        this.shareButton = ElementUtilities.addElementTo(
            "button", this.postGameDiv,
            {class: "app-button non-header-button"},
            "Share");
        ElementUtilities.setButtonCallback(this.shareButton, this, this.shareCallback);

        this.game = new DailyGame(); // maybe recovered, maybe from scratch

        // Enable or disable the share button based on whether the user has played the game.
        this.updateShareButton();

        // ========== Faux
        //this.initFauxDisplayInstructions();
        this.updateDisplay();
    }

    /* ----- Determination of Daily Game Information ----- */

    // called every n seconds on a timer, to see if the game has expired.  If so, create a new DailyGame

    updateDailyGameData() {

        const CL = "DailyGameDisplay.updateDailyGameData";
        COV(0, CL);
        const makeNewGame = this.game.isOld();

        if (makeNewGame) {
            COV(1, CL);
            Const.GL_DEBUG && this.logDebug("current daily game is old", "daily");
            this.game = new DailyGame(); // it will try to recover, see the game is old, and make a new game
            ElementUtilities.disableButton(this.shareButton);
            // Refresh the stats display in case it is open.
            this.appDisplay.refreshStats();

            this.updateDisplay();
        }
        COV(2, CL);
        return makeNewGame;
    }

    /* ----- Callbacks ----- */

    shareCallback(__event) {
        const CL = "DailyGameDisplay.shareCallback";
        COV(0, CL);
        return this.appDisplay.getShare(); // The return value is used in testing only.  getShare() has side-effect to copy the share to clipboard.
    }

    /* ----- Utilities ----- */

    // This will be called from GameDisplay when the game is determined to be over.
    additionalGameOverActions() {
        const CL = "DailyGameDisplay.additionalGameOverActions";
        COV(0, CL);
        this.updateShareButton();
    }

    isNewDailyGame() {
        const CL = "DailyGameDisplay.isNewDailyGame";
        COV(0, CL);
        return this.game.isNewDailyGame();
    }

    dailyGameNumber() {
        const CL = "DailyGameDisplay.dailyGameNumber";
        COV(0, CL);
        return this.game.gameState.dailyGameNumber;
    }

    dailyGameIsBroken() {
        const CL = "DailyGameDisplay.dailyGameIsBroken";
        COV(0, CL);
        return this.game.dailyGameIsBroken();
    }

    // Enable or disable the share button based on whether the user has played the game.
    updateShareButton() {
        const CL = "DailyGameDisplay.updateShareButton";
        if (this.gameIsOver() && !this.dailyGameIsBroken()) {
            COV(1, CL);
            ElementUtilities.enableButton(this.shareButton);
        } else {
            COV(2, CL);
            ElementUtilities.disableButton(this.shareButton);
        }
        COV(3, CL);
    }
}


class PracticeGameDisplay extends GameDisplay {

    /* ----- Construction ----- */

    constructor(appDisplay, gameDiv, pickerDiv) {
        const CL = "PracticeGameDisplay.constructor";
        COV(0, CL);
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
        if (!this.gameIsOver()) {
            COV(1, CL);
            // disable the new game button because a practice game is in progress/new
            ElementUtilities.disableButton(this.newGameButton);
        }
        COV(2, CL);
        // ========== Faux
        // this.updateDisplay();
        this.updateDisplay();
    }

    /* ----- Callbacks ----- */

    // newGameCallback() should only be exposed to the user if we already know that there are practice games remaining.
    newGameCallback(event) {
        const CL = "PracticeGameDisplay.newGameCallback";
        COV(0, CL);
        // Note that newGameCallback() will only be called when a game is over, and there are more games remaining

        // Clear out screen info from current game..
        ElementUtilities.deleteChildren(this.resultsDiv);
        ElementUtilities.deleteChildren(this.originalSolutionDiv);
        const newGameOrNull = this.game.nextGame();
        if (newGameOrNull == null) {
            // we will still use the last game played as the current game, as if New Game were never clicked:
            console.error("PracticeGameDisplay.newGameCallback(): New Game should not be clickable when no games are remaining!");
        } else {
            this.game = newGameOrNull;
        }
        this.updateDisplay();
        ElementUtilities.disableButton(this.newGameButton);
    }

    /* ----- Utilities ----- */

    // This will be called from GameDisplay when the game is determined to be over.
    additionalGameOverActions() {
        const CL = "PracticeGameDisplay.additionalGameOverActions";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("PracticeGameDisplay.additionalGameOverActions() called", "practice");

        if (this.anyGamesRemaining()) {
            COV(1, CL);
            ElementUtilities.enableButton(this.newGameButton);
        } else {
            COV(2, CL);
            ElementUtilities.disableButton(this.newGameButton);
        }
        COV(3, CL);
    }

    // this is used by AppDisplay when it is managing the practice game buttons
    anyGamesRemaining() {
        const CL = "PracticeGameDisplay.anyGamesRemaining";
        COV(0, CL);
        return this.game.gamesRemaining() > 0;
    }

    // This is called by AppDisplay.resetPracticeGameCounter() to reset the practice game counter when the day rolls over

    resetPracticeGameCounter() {
        const CL = "PracticeGameDisplay.resetPracticeGameCounter";
        COV(0, CL);
        this.game.resetPracticeGameCounter();
    }

    // AppDisplay calls this when its periodic check determines more
    // games are available again.
    practiceGamesAvailable() {
        const CL = "PracticeGameDisplay.practiceGamesAvailable";
        COV(0, CL);
        // Enable only if we're not in the middle of a game.
        if (this.gameIsOver()) {
            COV(1, CL);
            ElementUtilities.enableButton(this.newGameButton);
        }

        COV(2, CL);
    }
}

export { DailyGameDisplay, PracticeGameDisplay };
