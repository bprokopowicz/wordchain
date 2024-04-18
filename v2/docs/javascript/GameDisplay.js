import { BaseLogger } from './BaseLogger.js';
import { Cookie } from './Cookie.js';
import { Game } from './Game.js';
import { ElementUtilities } from './ElementUtilities.js';
import { WordChainDict } from './WordChainDict.js';
import * as Const from './Const.js';

import { AdditionCell, DeletionCell, ActiveLetterCell, FutureLetterCell, PlayedLetterCell, TargetLetterCell } from './Cell.js';


class GameDisplay extends BaseLogger {

    /* ----- Class Variables ----- */

    PICKER_UNSELECTED = " ";

    /* ----- Construction ----- */

    constructor(appDisplay, gameDiv, pickerDiv, dict) {

        super();

        this.appDisplay = appDisplay;

        this.gameDiv   = gameDiv;
        this.pickerDiv = pickerDiv;
        this.dict      = dict;

        this.createPicker();

        // Derived class constructor must call constructGame().
    }

    /* ----- Picker ----- */

    createPicker() {

        this.letterPickerContainer = ElementUtilities.addElementTo("div", this.pickerDiv);

        this.letterPickerLabel = ElementUtilities.addElementTo(
            "label", this.letterPickerContainer, {class: "picker-label"}, "Pick a letter: ")

        // Initial size will be the default of 1 (so it looks like a button),
        // and when the user focuses on it, the size will change to present a
        // scrolling window to select a latter.
        this.letterPicker = ElementUtilities.addElementTo("select", this.letterPickerContainer);

        ElementUtilities.addElementTo( "option", this.letterPicker,
            {value: GameDisplay.PICKER_UNSELECTED, class: "picker-option"}, GameDisplay.PICKER_UNSELECTED)

        var codeLetterA = "A".charCodeAt(0),
            codeLetterZ = "Z".charCodeAt(0),
            letter;

        for (let letterCode = codeLetterA; letterCode <= codeLetterZ; letterCode++) {
            letter = String.fromCharCode(letterCode);
            ElementUtilities.addElementTo("option", this.letterPicker, {value: letter, class: "picker-option"}, letter)
        }

        // Save 'this' in the letterPicker element so that we can access
        // it (via event.srcElement.callbackAccessor) in the callback.
        this.letterPicker.callbackAccessor = this;
        this.letterPicker.addEventListener("change", this.pickerChangeCallback);
        this.letterPicker.addEventListener("focus",  this.pickerFocusCallback);
        this.letterPicker.addEventListener("blur",   this.pickerBlurCallback);
    }

    disablePicker() {
        //console.log("disablePicker() this.pickerEnabled:", this.pickerEnabled);
        this.letterPickerLabel.setAttribute("class", "picker-label picker-label-disabled");
        this.letterPicker.setAttribute("class", "picker-select picker-select-disabled");
        this.letterPicker.setAttribute("disabled", "disabled");
    }

    enablePicker() {
        //console.log("enablePicker() this.pickerEnabled:", this.pickerEnabled);
        this.letterPickerLabel.setAttribute("class", "picker-label picker-label-enabled");
        this.letterPicker.setAttribute("class", "picker-select picker-select-enabled");
        this.letterPicker.removeAttribute("disabled");
    }

    /* ----- Game ----- */

    addTd() {
        return ElementUtilities.addElementTo("td", this.rowElement, {class: 'td-game'});
    }

    // Called from derived class!
    constructGame(start, target) {
        //this.game = new PseudoGame(this.dict, start, target);
        this.game = new Game(this.dict, start, target);
        this.showMove();
    }

    displayAdd(displayInstruction) {
        let me = this;

        function getCell(letter, letterPosition) {
            return new ActiveLetterCell(letter, letterPosition, me.letterPicker,
                displayInstruction.wasCorrect, displayInstruction.changePosition);
        }

        this.pickerEnabled = false;
        // Pass false for hideAdditionCells.
        this.displayCommon(displayInstruction, getCell, false);
    }

    displayChange(displayInstruction) {
        let me = this;

        function getCell(letter, letterPosition) {
            return new ActiveLetterCell(letter, letterPosition, me.letterPicker,
                displayInstruction.wasCorrect, displayInstruction.changePosition);
        }

        this.pickerEnabled = true;
        this.displayCommon(displayInstruction, getCell);
    }

    displayDelete(displayInstruction, tableElement) {
        const me = this;

        // First, display the letter cells.
        function getActiveLetterCell(letter, letterPosition) {
            return new ActiveLetterCell(letter, letterPosition, me.letterPicker,
                displayInstruction.wasCorrect, displayInstruction.changePosition);
        }

        this.displayCommon(displayInstruction, getActiveLetterCell);

        // Now we add an extra <tr> element for the deletion cell row.
        this.rowElement = ElementUtilities.addElementTo("tr", tableElement, {class: "tr-game"});

        function getDeletionCell(letter, letterPosition) {
            // Pass 'me' to DeletionCell constructor so that it can be saved as "callbackAccessor"
            // in the button so that the callback can get back to this object
            // (via event.srcElement.callbackAccessor).
            return new DeletionCell(letterPosition, me, me.deletionClickCallback);
        }

        // Disable the picker (because it is not used during deletion) and then display.
        this.pickerEnabled = false;
        this.displayCommon(displayInstruction, getDeletionCell);
    }

    displayFuture(displayInstruction) {
        function getCell(letter, letterPosition) {
            return new FutureLetterCell(letter, letterPosition, displayInstruction.changePosition);
        }

        this.displayCommon(displayInstruction, getCell);
    }

    displayPlayed(displayInstruction) {
        function getCell(letter, letterPosition) {
            return new PlayedLetterCell(letter, displayInstruction.wasCorrect);
        }

        this.displayCommon(displayInstruction, getCell);
    }

    displayTarget(displayInstruction) {
        var showSuccessful = false,
            gameOver = false;

        function getCell(letter, __letterPosition) {
            return new TargetLetterCell(letter, showSuccessful, gameOver);
        }

        if (this.game.isOver()) {
            gameOver = true;

            if (this.game.isWinner()) {
                showSuccessful = true;
            }
        }

        this.displayCommon(displayInstruction, getCell);
    }

    getGame() {
        return this.game;
    }

    showMove(userRequestedSolution=false) {
        const container = ElementUtilities.addElementTo("div", this.gameDiv),
              tableElement = ElementUtilities.addElementTo("table", container, {class: "table-game"});

        // Create an element that can be used to add buttons (or whatever) after the display of
        // elements for the game.
        this.postGameDiv = ElementUtilities.addElementTo("div", container, {class: "break post-game-div"});

        this.rowElement = ElementUtilities.addElementTo("tr", tableElement, {class: "tr-game"});

        var displayInstruction;
        while (displayInstruction = this.game.getNextDisplayInstruction()) {
            //console.log("displayInstruction:", displayInstruction);

            if (displayInstruction.displayType === Const.ADD) {
                this.displayAdd(displayInstruction);
            } else if (displayInstruction.displayType === Const.CHANGE) {
                this.displayChange(displayInstruction);
            } else if (displayInstruction.displayType === Const.DELETE) {
                // This method adds another row, so unlike the others,
                // it needs access to the table element.
                this.displayDelete(displayInstruction, tableElement);
            } else if (displayInstruction.displayType === Const.FUTURE) {
                this.displayFuture(displayInstruction);
            } else if (displayInstruction.displayType === Const.PLAYED) {
                this.displayPlayed(displayInstruction);
            } else if (displayInstruction.displayType === Const.TARGET) {
                this.displayTarget(displayInstruction);
            } else {
                console.error("Unexpected displayType: ", displayInstruction.displayType);
            }

            this.rowElement = ElementUtilities.addElementTo("tr", tableElement, {class: "tr-game"});
        }

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
                if (this.game.isWinner()) {
                    this.appDisplay.showToast(Const.GAME_WON);
                } else {
                    this.appDisplay.showToast(Const.GAME_LOST);
                }
            }
            this.disablePicker();

            // If the derived class defined a function to do additional things when
            // the game is over, call the function.
            if (this.additionalGameOverActions()) {
                this.additionalGameOverActions();
            }
        }
    }

    /* ----- Callbacks ----- */

    additionClickCallback(event) {
        var me = event.srcElement.callbackAccessor;

        //console.log("additionClickCallback(): event: ", event);
        let additionPosition = parseInt(event.srcElement.getAttribute('additionPosition')),
            gameResult = me.game.playAdd(additionPosition);

        return (me.processGameResult(gameResult));
    }

    deletionClickCallback(event) {
        var me = event.srcElement.callbackAccessor;

        //console.log("deletionClickCallback(): event: ", event);
        let deletionPosition = parseInt(event.srcElement.getAttribute('deletionPosition')),
            gameResult = me.game.playDelete(deletionPosition);

        return (me.processGameResult(gameResult));
    }

    pickerBlurCallback(event) {
        var me = event.srcElement.callbackAccessor;

        // Change the size of the picker so that it is no longer
        // showing 10 elements when the user moves the mouse away.
        me.letterPicker.setAttribute("size", 1);
        //console.log("pickerBlurCallback");
    }

    pickerChangeCallback(event) {
        //console.log("pickerChangeCallback(): event: ", event);
        var me = event.srcElement.callbackAccessor;

        if (me.letterPicker.value === GameDisplay.PICKER_UNSELECTED) {
            me.appDisplay.showToast("Pick a letter");
            // TODO: Show a toast saying to pick a letter?
            return Const.PICK_LETTER;
        }


        // Change the size of the picker back to 1 when a letter has been picked.
        me.letterPicker.setAttribute("size", 1);

        let letterPosition = parseInt(event.srcElement.getAttribute('letterPosition')),
            gameResult = me.game.playLetter(letterPosition, me.letterPicker.value);

        me.letterPicker.value = GameDisplay.PICKER_UNSELECTED;

        return (me.processGameResult(gameResult));
    }

    pickerFocusCallback(event) {
        var me = event.srcElement.callbackAccessor;

        // Change the size of the picker so that multiple words are
        // shown with scrolling to select.
        me.letterPicker.setAttribute("size", 10);
        //console.log("pickerFocusCallback");
    }

    /* ----- Utilities ----- */

    displayCommon(displayInstruction, cellCreator, hideAdditionCells=true) {
        //console.log("displayCommon(): displayInstruction: ", displayInstruction);
        var additionPosition = 0,
            cell = null,
            tdElement = null,
            wordLength = displayInstruction.wordLength,
            word = displayInstruction.word,
            letters = word.length !== 0 ? word.split('') : ' '.repeat(wordLength),
            wasCorrect = displayInstruction.wasCorrect;

        // Pass 'this' to AdditionCell constructor here and in the loop, so that it can
        // be saved as "callbackAccessor" in the button so that the callback can get
        // back to this object (via event.srcElement.callbackAccessor).
        tdElement = this.addTd();
        cell = new AdditionCell(additionPosition, hideAdditionCells, this, this.additionClickCallback);

        ElementUtilities.addElementTo(cell.getElement(), tdElement);
        additionPosition++;

        for (let letterIndex = 0; letterIndex < wordLength; letterIndex++) {
            tdElement = this.addTd();
            cell = cellCreator(letters[letterIndex], letterIndex + 1);
            ElementUtilities.addElementTo(cell.getElement(), tdElement);
            cell = new AdditionCell(additionPosition, hideAdditionCells, this, this.additionClickCallback);

            tdElement = this.addTd();

            ElementUtilities.addElementTo(cell.getElement(), tdElement);
            additionPosition++;
        }
    }

    processGameResult(gameResult) {
        if (gameResult === Const.BAD_OPERATION || gameResult === Const.BAD_LETTER_POSITION) {
            console.error(gameResult);
            this.appDisplay.showToast("Yikes! Something went wrong");
            // TODO: Should end the game or some such ...
        } else if (gameResult !== Const.OK) {
            this.appDisplay.showToast(gameResult);
        }

        this.showMove();
        return gameResult;
    }
}

export { GameDisplay };
