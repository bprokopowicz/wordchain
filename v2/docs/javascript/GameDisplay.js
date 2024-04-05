import { BaseLogger } from './BaseLogger.js';
import { Cookie } from './Cookie.js';
//import { Game } from './Game.js';
import { PseudoGame } from './PseudoGame.js';
import { ElementUtilities } from './ElementUtilities.js';
import { WordChainDict } from './WordChainDict.js';
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

    constructor(gameDiv, pickerDiv, dict) {

        super();

        this.gameDiv   = gameDiv;
        this.pickerDiv = pickerDiv;
        this.dict      = dict;

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
 
        // Save 'this' in the letterPicker element so that we can access
        // it (via event.srcElement.callbackAccessor) in the callback.
        this.letterPicker.callbackAccessor = this;
        this.letterPicker.addEventListener("change", this.pickerChangeCallback);
        this.letterPicker.addEventListener("focus",  this.pickerFocusCallback);
        this.letterPicker.addEventListener("blur",   this.pickerBlurCallback);
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
        var me = event.srcElement.callbackAccessor;

        if (me.letterPicker.value === GameDisplay.PICKER_UNSELECTED) {
            // TODO: Show a toast saying to pick a letter?
            return;
        }


        // Change the size of the picker back to 1 when a letter has been picked.
        me.letterPicker.setAttribute("size", 1);

        let letterPosition = parseInt(event.srcElement.getAttribute('letterPosition'));
        me.game.playLetter(letterPosition, me.letterPicker.value);
        me.letterPicker.value = GameDisplay.PICKER_UNSELECTED;

        me.showMove();
    }

    pickerFocusCallback(event) {
        var me = event.srcElement.callbackAccessor;

        // Change the size of the picker so that multiple words are
        // shown with scrolling to select.
        me.letterPicker.setAttribute("size", 10);
        console.log("pickerFocusCallback");
    }

    pickerBlurCallback(event) {
        var me = event.srcElement.callbackAccessor;

        // Change the size of the picker so that it is no longer
        // showing 10 elements when the user moves the mouse away.
        me.letterPicker.setAttribute("size", 1);
        console.log("pickerBlurCallback");
    }

    /* ----- Game ----- */

    constructGame() {
        this.game = new PseudoGame(this.dict, "hard", "pear");
        //this.game = new Game(this.dict, "hard", "pear");
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

        // First, display the letter cells.
        function getActiveLetterCell(letter, letterPosition) {
            return new ActiveLetterCell(letter, letterPosition, me.letterPicker,
                displayInstruction.wasCorrect, displayInstruction.changePosition);
        }

        this.displayCommon(displayInstruction, getActiveLetterCell);

        // Now we add an extra <tr> element for the deletion cell row.
        this.rowElement = ElementUtilities.addElementTo("tr", tableElement, {class: "setting-text"});

        function getDeletionCell(letter, letterPosition) {
            // Pass 'me' to DeletionCell constructor so that it can be saved as "callbackAccessor"
            // in the button so that the callback can get back to this object
            // (via event.srcElement.callbackAccessor).
            return new DeletionCell(letterPosition, me, me.deletionClickCallback);
        }

        // Display the picker (because it is not used during deletion) and then display.
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
        var me = event.srcElement.callbackAccessor;

        console.log("additionClickCallback(): event: ", event);
        let additionPosition = parseInt(event.srcElement.getAttribute('additionPosition'));
        me.game.playAdd(additionPosition);

        me.showMove();
    }

    deletionClickCallback(event) {
        var me = event.srcElement.callbackAccessor;

        console.log("deletionClickCallback(): event: ", event);
        let deletionPosition = parseInt(event.srcElement.getAttribute('deletionPosition'));
        me.game.playDelete(deletionPosition);

        me.showMove();
    }

    /* ----- Cookie Interactions ----- */

    /*
    constructGameFromCookieWords(name, words) {
        // Make a copy of the array of words because we will modify it.

        words = [...words];

        // The cookie words are the start word, the words played so far, and
        // the target word. Pick off the start and target words and create a solution.
        const startWord = words.shift();
        const targetWord = words.pop();
        const solution = Solver.fastSolve(this.dict, startWord, targetWord);

        // Use the solution to create a new game.
        let game = new Game(name, this.dict, solution, this.typeSavingMode);

        // The words remaining in the list are the words that the user played;
        // play the game with them. No need to check the result because we only
        // save in-progress games with good words to the cookies.
        for (let word of words) {
            game.playWord(word);
        }    

        if (name === "DailyGame" && game.isSolved() && !this.dailySolutionShown) {
            // Save the share graphic, but not stats; stats were already saved when the game completed.
            this.saveGameInfo(game, false);
        }    

        return game 
    }    
    */
}

export { GameDisplay };
