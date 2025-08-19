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
    ActiveLetterCell,
    ChangeNextLetterCell,
    FutureLetterCell,
    PlayedLetterCell,
    TargetLetterCell,
} from './Cell.js';


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

        // Add Show Next Move button to postGameDiv.
        this.showNextMoveButton = ElementUtilities.addElementTo(
            "button", this.postGameDiv,
            {class: "app-button non-header-button"},
            "Show Next Move");
        ElementUtilities.setButtonCallback(this.showNextMoveButton, this, this.showNextMoveCallback);

        // Create an element to contain game results (score, WordChain solution).
        this.resultsDiv = ElementUtilities.addElementTo("div", gameDiv, {class: "break results-div"});

        this.lastActiveMoveWasAdd = false;

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
            result = this.game.playLetter(letterPosition, letter);
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

    displayAdd(displayInstruction, isStartWord) {
        const CL = "GameDisplay.displayAdd";
        COV(0, CL);
        const me = this;

        // Disable the picker; it's not used for ADD moves.
        this.pickerEnabled = false;

        function getCell(letter, letterPosition) {
            return new ActiveLetterCell(letter, letterPosition, me.letterPicker,
                displayInstruction.moveRating, displayInstruction.changePosition, isStartWord, me.lastActiveMoveWasAdd);
        }

        const hideAdditionCells = false;
        this.displayCommon(displayInstruction, getCell, hideAdditionCells);
    }

    displayChange(displayInstruction, isStartWord) {
        const CL = "GameDisplay.displayChange";
        COV(0, CL);
        const me = this;

        // We need the picker for CHANGE moves.
        this.pickerEnabled = true;

        function getCell(letter, letterPosition) {
            return new ActiveLetterCell(letter, letterPosition, me.letterPicker,
                displayInstruction.moveRating, displayInstruction.changePosition, isStartWord, me.lastActiveMoveWasAdd);
        }

        // changePosition goes 1..wordLength, so need to subtract 1.
        this.currentLetter = displayInstruction.word[displayInstruction.changePosition - 1];

        const hideAdditionCells = true;
        this.displayCommon(displayInstruction, getCell, hideAdditionCells);
    }

    displayChangeNext(displayInstruction) {
        const CL = "GameDisplay.displayChangeNext";
        COV(0, CL);
        function getCell(letter, letterPosition) {
            return new ChangeNextLetterCell(letter, letterPosition, displayInstruction.changePosition);
        }

        // The Game class gives us a DisplayInstruction with an extra field
        // for a 'Change Next" instruction, which is the "word with a hole" where
        // the letter to be filled in is replaced with a '?' -- we need to give
        // displayCommon() an instruction with *that* word. However, don't want
        // to change the DisplayInstruction passed to us, because it is used
        // elsewhere, where it is expected to be the word sans hole. So copy it
        // and change its word to wordWithHole.
        let newDisplayInstruction = displayInstruction.copy();
        newDisplayInstruction.word = displayInstruction.wordWithHole;

        this.displayCommon(newDisplayInstruction, getCell);
    }

    displayDelete(displayInstruction, tableElement, isStartWord) {
        const CL = "GameDisplay.displayDelete";
        COV(0, CL);
        const me = this;

        // Disable the picker; it's not used for DELETE moves.
        this.pickerEnabled = false;

        function getActiveLetterCell(letter, letterPosition) {
            return new ActiveLetterCell(letter, letterPosition, me.letterPicker,
                displayInstruction.moveRating, displayInstruction.changePosition, isStartWord, me.lastActiveMoveWasAdd);
        }

        // First, display the letter cells.
        const hideAdditionCells = true;
        this.displayCommon(displayInstruction, getActiveLetterCell, hideAdditionCells);

        // Now we add an extra <tr> element for the deletion cell row. It is this row
        // that is highlighted as active rather than the letter cells.
        this.rowElement = ElementUtilities.addElementTo("tr", tableElement, {class: "tr-game"});
        this.rowElement.displayAsActiveRow = true;

        // We need to use a copy of 'this' as 'me' in the body of this local function.
        function getDeletionCell(letter, letterPosition) {
            return new DeletionCell(letterPosition, me, me.deletionClickCallback);
        }

        this.displayCommon(displayInstruction, getDeletionCell, hideAdditionCells);
    }

    displayFuture(displayInstruction) {
        const CL = "GameDisplay.displayFuture";
        COV(0, CL);
        function getCell(letter, letterPosition) {
            return new FutureLetterCell(letter, letterPosition, displayInstruction.changePosition);
        }

        this.displayCommon(displayInstruction, getCell);
    }

    displayPlayed(displayInstruction, isStartWord) {
        const CL = "GameDisplay.displayPlayed";
        COV(0, CL);
        function getCell(letter, letterPosition) {
            return new PlayedLetterCell(letter, displayInstruction.moveRating, isStartWord);
        }

        this.displayCommon(displayInstruction, getCell);
    }

    // we only display the Target as Target if the game is not over.  If it is over, it will be
    // displayed as Played, not Target.

    displayTarget(displayInstruction) {
        const CL = "GameDisplay.displayTarget";
        COV(0, CL);

        function getCell(letter, __letterPosition) {
            return new TargetLetterCell(letter);
        }

        this.displayCommon(displayInstruction, getCell);
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

        let displayInstructions = this.game.getDisplayInstructions();

        // all words are played words until we hit the first future or target word:

        let isStartWord = true;

        // console.log("======================");
        for (let displayInstruction of displayInstructions) {
            Const.GL_DEBUG && this.logDebug("displayInstruction:", displayInstruction, "instruction");

            this.rowElement.displayAsActiveRow = false;
            Const.GL_DEBUG && this.logDebug("word:", displayInstruction.word, "displayType:", displayInstruction.displayType,
                    "moveRating:", displayInstruction.moveRating, "lastActiveMoveWasAdd:", this.lastActiveMoveWasAdd, "instruction");

            // These instructions all indicate the active word.
            // Note that the active word has also been played.
            if (displayInstruction.displayType === Const.ADD) {
                COV(2, CL);
                this.rowElement.displayAsActiveRow = true;
                this.displayAdd(displayInstruction, isStartWord);
                this.lastActiveMoveWasAdd = true;

            } else if (displayInstruction.displayType === Const.CHANGE) {
                COV(3, CL);
                this.rowElement.displayAsActiveRow = true;
                this.displayChange(displayInstruction, isStartWord);
                this.lastActiveMoveWasAdd = false;

            } else if (displayInstruction.displayType === Const.DELETE) {
                COV(4, CL);
                this.rowElement.displayAsActiveRow = true;
                this.displayDelete(displayInstruction, tableElement, isStartWord);
                this.lastActiveMoveWasAdd = false;

            // These instructions indicate a word other than the active one.
            } else if (displayInstruction.displayType === Const.CHANGE_NEXT) {
                COV(5, CL);
                this.displayChangeNext(displayInstruction);

            } else if (displayInstruction.displayType === Const.FUTURE) {
                COV(6, CL);
                this.displayFuture(displayInstruction);

            } else if (displayInstruction.displayType === Const.PLAYED) {
                COV(7, CL);
                this.displayPlayed(displayInstruction, isStartWord);

            } else if (displayInstruction.displayType === Const.TARGET) {
                COV(8, CL);
                this.displayTarget(displayInstruction);

            } else {
                console.error("Unexpected displayType: ", displayInstruction.displayType);
            }

            isStartWord = false;

            this.rowElement = ElementUtilities.addElementTo("tr", tableElement, {class: "tr-game"});
        }

        if (this.pickerEnabled) {
            COV(9, CL);
            this.enablePicker();
        } else {
            COV(10, CL);
            this.disablePicker();
        }

        if (this.gameIsOver()) {
            COV(11, CL);

            // Delete old results and create new divs to go in the results div.
            ElementUtilities.deleteChildren(this.resultsDiv);
            var scoreDiv = ElementUtilities.addElementTo("div", this.resultsDiv, {class: "break score-div"}),
                originalSolutionDiv = ElementUtilities.addElementTo("div", this.resultsDiv, {class: "break original-solution-div"}),
                iconDiv = ElementUtilities.addElementTo("div", this.resultsDiv, {class: "break icon-div"});

            const scoreText = Const.SCORE_TEXT[this.game.numPenalties()];
            Const.GL_DEBUG && this.logDebug("GameDisplay.showGameAfterMove(): this.game.numPenalties():",
                    this.game.numPenalties(), "game");
            ElementUtilities.addElementTo("label", scoreDiv, {class: "score-label"}, `Score: ${scoreText}`);

            this.disablePicker();
            ElementUtilities.disableButton(this.showNextMoveButton);

            // If the derived GameDisplay class defined a function to do additional things when
            // the game is over, call the function.

            if (this.additionalGameOverActions) {
                COV(12, CL);
                this.additionalGameOverActions();
            }

            // Display WordChain's original solution if different from the user's solution.
            // Otherwise display a message indicating that they are the same.

            var originalSolutionWords = this.game.getOriginalSolutionWords(),
                userSolutionWords = this.game.getUserSolutionWords();

            if (originalSolutionWords == userSolutionWords) {
                COV(13, CL);
                // We don't want to show this message if the user clicked
                // 'Show Next Move' to reveal a word (or all words!).  
                if (this.game.numShownMoves() == 0) {
                    COV(14, CL);
                    ElementUtilities.addElementTo("label", originalSolutionDiv, {class: "original-solution-label"},
                        "You found WordChain's solution!");
                } // else no message regarding WordChain's solution.
            } else {
                COV(15, CL);
                ElementUtilities.addElementTo("label", originalSolutionDiv, {class: "original-solution-label"},
                    `WordChain's solution:<br>${originalSolutionWords}`);
            }

            Const.GL_DEBUG && this.logDebug("GameDisplay.showGameAfterMove(): original solution words: ", originalSolutionWords,
                    " user solution words: ", userSolutionWords,  "game");

            ElementUtilities.addElementTo("img", iconDiv, {src: "/docs/images/favicon.png", class: "word-chain-icon"});
            ElementUtilities.addElementTo("label", iconDiv, {class: "icon-label"}, "Thank you for playing WordChain!");
        } else {
            COV(16, CL);
            ElementUtilities.enableButton(this.showNextMoveButton);
        }
        COV(17, CL);
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
            result = this.game.playAdd(additionPosition);

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

            result = this.game.playDelete(deletionPosition);
            this.processGamePlayResult(result);
        }

        COV(3, CL);
        return result;
    }

    showNextMoveCallback(event) {

        const CL = "GameDisplay.showNextMoveCallback";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("GameDisplay.showNextMoveCallback(): event: ", event, "callback");

        let result = null;

        if (this.gameIsOver()) {
            console.error("GameDisplay.showNextMoveCallback(): last move already shown");
            result = Const.UNEXPECTED_ERROR;
        } else {
            COV(1, CL);
            result = this.game.showNextMove();

            this.showGameAfterMove();

            // Disable if no more moves remaining.
            if (this.gameIsOver()) {
                COV(2, CL);
                this.showGameOverToast();
                ElementUtilities.disableButton(this.showNextMoveButton);
            }
        }

        COV(3, CL);
        return result;
    }

    /* ----- Utilities ----- */

    // cellCreator is a factory method to produce the right kind of cell,
    // including when the cell is for the start word.
    displayCommon(displayInstruction, cellCreator, hideAdditionCells=true) {
        const CL = "GameDisplay.displayCommon";
        COV(0, CL);
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

    shouldShowToastForResult(gameResult) {
        return (gameResult == Const.WRONG_MOVE) ||
               (gameResult == Const.DODO_MOVE) || 
               (gameResult == Const.SCRABBLE_WORD) || 
               (gameResult == Const.NOT_A_WORD) || 
               (gameResult == Const.GENIUS_MOVE);
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

    // pass-through utility
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
