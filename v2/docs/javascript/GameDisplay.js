import { BaseLogger } from './BaseLogger.js';
import { PseudoGame } from './PseudoGame.js';
import { ElementUtilities } from './ElementUtilities.js';
import * as Const from './Const.js';

import { AdditionCell, DeletionCell, ActiveLetterCell, FutureLetterCell, PlayedLetterCell, TargetLetterCell } from './Cell.js';


class GameDisplay extends BaseLogger {
    /*
    ** ===============
    ** CLASS VARIABLES
    ** ===============
    */
    PICKER_UNSELECTED = "  ";

    /*
    ** ============
    ** CONSTRUCTION
    ** ============
    */

    constructor(gameDiv, pickerDiv, callbacks) {

        super();

        this.gameDiv = gameDiv;
        this.pickerDiv = pickerDiv;
        this.callbacks = callbacks;

        this.createPicker();
        this.constructGame();
    }

    /*
    ** ================================
    ** METHODS TO CONSTRUCT THE DISPLAY
    ** ================================
    */

    /* ----- Picker ----- */

    createPicker() {

        this.letterPickerContainer = ElementUtilities.addElementTo("div", this.pickerDiv);

        this.letterPickerLabel = ElementUtilities.addElementTo(
            "label", this.letterPickerContainer, {}, "Pick a letter: ")

        // Initial size will be the default of 1 (so it looks like a button),
        // and when the user focuses on it, the size will change to present a
        // scrolling window to select a latter.
        this.letterPicker = ElementUtilities.addElementTo("select", this.letterPickerContainer);

        ElementUtilities.addElementTo( "option", this.letterPicker,
            {value: GameDisplay.PICKER_UNSELECTED}, GameDisplay.PICKER_UNSELECTED)

        var codeLetterA = "A".charCodeAt(0),
            codeLetterZ = "Z".charCodeAt(0),
            letter;

        for (let letterCode = codeLetterA; letterCode <= codeLetterZ; letterCode++) {
            letter = String.fromCharCode(letterCode);
            ElementUtilities.addElementTo("option", this.letterPicker, {value: letter}, letter)
        }

        this.letterPicker.addEventListener("change", this.callbacks.pickerChangeCallback);
        this.letterPicker.addEventListener("focus",  this.callbacks.pickerFocusCallback);
        this.letterPicker.addEventListener("blur",   this.callbacks.pickerBlurCallback);
    }

    disablePicker() {
        console.log("disablePicker() this.pickerEnabled:", this.pickerEnabled);
        this.letterPickerLabel.setAttribute("class", "picker-label-disabled");
        this.letterPicker.setAttribute("class", "picker-select-disabled");
        this.letterPicker.setAttribute("disabled", "disabled");
    }

    enablePicker() {
        console.log("enablePicker() this.pickerEnabled:", this.pickerEnabled);
        this.letterPickerLabel.setAttribute("class", "picker-label-enabled");
        this.letterPicker.setAttribute("class", "picker-select-enabled");
        this.letterPicker.removeAttribute("disabled");
    }

    pickerChangeCallback(event) {
        //console.log("pickerChangeCallback(): event: ", event);
        if (this.letterPicker.value === GameDisplay.PICKER_UNSELECTED) {
            // TODO: Show a toast saying to pick a letter?
            return;
        }

        // Change the size of the picker back to 1 when a letter has been picked.
        this.letterPicker.setAttribute("size", 1);

        let letterPosition = parseInt(event.srcElement.getAttribute('letterPosition'));
        this.game.playLetter(letterPosition, this.letterPicker.value);
        this.letterPicker.value = GameDisplay.PICKER_UNSELECTED;

        this.showMove();
    }

    pickerFocusCallback(event) {
        // Change the size of the picker so that multiple words are
        // shown with scrolling to select.
        this.letterPicker.setAttribute("size", 10);
        console.log("pickerFocusCallback");
    }

    pickerBlurCallback(event) {
        // Change the size of the picker so that it is no longer
        // showing 10 elements when the user moves the mouse away.
        this.letterPicker.setAttribute("size", 1);
        console.log("pickerBlurCallback");
    }

    /* ----- Game ----- */

    constructGame() {
        this.game = new PseudoGame("hard", "pear");
        //this.game = new PseudoGame("fate", "sop");
        this.showMove();
    }

    showMove() {
        if (this.game.over()) {
            return;
        }
        
        const container = ElementUtilities.addElementTo("div", this.gameDiv, {class: "setting-text"}),
              tableElement = ElementUtilities.addElementTo("table", container, {class: "setting-text"});

        this.rowElement = ElementUtilities.addElementTo("tr", tableElement, {class: "setting-text"});

        var displayInstruction;
        while (displayInstruction = this.game.getNextDisplayInstruction()) {
            console.log("displayInstruction:", displayInstruction);

            if (displayInstruction.displayType === "add") {
                this.displayAdd(displayInstruction);
            } else if (displayInstruction.displayType === "addchange") {
                this.displayAddChange(displayInstruction);
            } else if (displayInstruction.displayType === "change") {
                this.displayChange(displayInstruction);
            } else if (displayInstruction.displayType === "delete") {
                // This method adds another row, so unlike the others,
                // it needs access to the table element.
                this.displayDelete(displayInstruction, tableElement);
            } else if (displayInstruction.displayType === "future") {
                this.displayFuture(displayInstruction);
            } else if (displayInstruction.displayType === "played") {
                this.displayPlayed(displayInstruction);
            } else if (displayInstruction.displayType === "target") {
                this.displayTarget(displayInstruction);
            } else {
                console.error("Unexpected displayType: ", displayInstruction.displayType);
            }

            this.rowElement = ElementUtilities.addElementTo("tr", tableElement, {class: "setting-text"});
        }

        // Delete old move and add new one.
        ElementUtilities.deleteChildren(this.gameDiv);
        ElementUtilities.addElementTo(container, this.gameDiv);

        if (this.pickerEnabled) {
            this.enablePicker();
        } else {
            this.disablePicker();
        }
    }

    addTd() {
        return ElementUtilities.addElementTo("td", this.rowElement);
    }

    displayCommon(displayInstruction, cellCreator, hideAdditionCells=true) {
        //console.log("displayCommon(): displayInstruction: ", displayInstruction);
        var additionPosition = 0,
            cell = null,
            tdElement = null,
            wordLength = displayInstruction.wordLength,
            word = displayInstruction.word,
            letters = word.length !== 0 ? word.split('') : ' '.repeat(wordLength),
            wasCorrect = displayInstruction.wasCorrect;

        tdElement = this.addTd();
        cell = new AdditionCell(additionPosition, hideAdditionCells, this.callbacks.additionClickCallback);

        ElementUtilities.addElementTo(cell.getElement(), tdElement);
        additionPosition++;

        for (let letterIndex = 0; letterIndex < wordLength; letterIndex++) {
            tdElement = this.addTd();
            cell = cellCreator(letters[letterIndex], letterIndex + 1);
            ElementUtilities.addElementTo(cell.getElement(), tdElement);
            cell = new AdditionCell(additionPosition, hideAdditionCells, this.callbacks.additionClickCallback);

            tdElement = this.addTd();

            ElementUtilities.addElementTo(cell.getElement(), tdElement);
            additionPosition++;
        }
    }

    displayAdd(displayInstruction) {
        let me = this;

        function getCell(letter, letterPosition) {
            return new ActiveLetterCell(letter, letterPosition, me.letterPicker,
                displayInstruction.wasCorrect, displayInstruction.changePosition);
        }

        // Don't hide addition cells.
        this.pickerEnabled = false;
        this.displayCommon(displayInstruction, getCell, false);
    }

    displayAddChange(displayInstruction) {
        let me = this;


        function getCell(letter, letterPosition) {
            // Give last arg true to indicate the letter should be blanked.
            return new ActiveLetterCell(letter, letterPosition, me.letterPicker,
                displayInstruction.wasCorrect, displayInstruction.changePosition, true);
        }

        this.pickerEnabled = true;
        this.displayCommon(displayInstruction, getCell);
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

        function getActiveLetterCell(letter, letterPosition) {
            return new ActiveLetterCell(letter, letterPosition, me.letterPicker,
                displayInstruction.wasCorrect, displayInstruction.changePosition);
        }

        this.displayCommon(displayInstruction, getActiveLetterCell);

        this.rowElement = ElementUtilities.addElementTo("tr", tableElement, {class: "setting-text"});

        function getDeletionCell(letter, letterPosition) {
            return new DeletionCell(letterPosition, me.callbacks.deletionClickCallback);
        }

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
        var showSuccessful = false;

        function getCell(letter, __letterPosition) {
            return new TargetLetterCell(letter, showSuccessful);
        }

        if (displayInstruction.endOfGame) {
            this.pickerEnabled = false;

            if (this.game.winner()) {
                showSuccessful = true;
            }
        }

        this.displayCommon(displayInstruction, getCell);
    }

    additionClickCallback(event) {
        //console.log("additionClickCallback(): event: ", event);
        let additionPosition = parseInt(event.srcElement.getAttribute('additionPosition'));
        this.game.playAdd(additionPosition);

        this.showMove();
    }

    deletionClickCallback(event) {
        //console.log("deletionClickCallback(): event: ", event);
        let deletionPosition = parseInt(event.srcElement.getAttribute('deletionPosition'));
        this.game.playDelete(deletionPosition);

        this.showMove();
    }
}

export { GameDisplay };
