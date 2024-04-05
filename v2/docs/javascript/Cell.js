import { ElementUtilities } from './ElementUtilities.js';

class Cell {
    constructor() {
        this.cellContainer = null;
        this.cellContents = null;
    }

    addClass(classNameOrList) {
        ElementUtilities.addClass(this.cellContainer, classNameOrList);
    }

    addContentsClass(classNameOrList) {
        ElementUtilities.addClass(this.cellContents, classNameOrList);
    }

    getElement() {
        return this.cellContainer;
    }
}

// ActionCell Classes

class ActionCell extends Cell {
    constructor(symbol, callbackAccessor, callback, deletion) {
        super();
        this.symbol = symbol;

        let addButtonTo;
        if (deletion) {
            this.cellContainer = ElementUtilities.createElement("div", {class: 'circle action-outer-cell'});
            this.cellInnerContainer = ElementUtilities.addElementTo("div", this.cellContainer);
            addButtonTo = this.cellInnerContainer;

        } else {
            this.cellContainer = ElementUtilities.createElement("div");
            addButtonTo = this.cellContainer;
        }

        ElementUtilities.addClass(addButtonTo, 'circle action-cell');

        this.cellContents = ElementUtilities.addElementTo("button", addButtonTo, {class: 'action-button'}, this.symbol);
        this.cellContents.callbackAccessor = callbackAccessor;
        ElementUtilities.setButtonCallback(this.cellContents, callback);
        this.addContentsClass("action");
    }
}

class AdditionCell extends ActionCell {
    constructor(additionPosition, hidden, callbackAccessor, callback) {
        super("+", callbackAccessor, callback, false);

        if (hidden) {
            this.cellContainer.style.visibility = "hidden";
        } else {
            // Add to the button element so we can get it when the event comes.
            this.cellContents.setAttribute("additionPosition", additionPosition);
            this.addClass("action-cell-addition");
        }
    }
}

class DeletionCell extends ActionCell {
    constructor(deletionPosition, callbackAccessor, callback) {
        super("-", callbackAccessor, callback, true);

        // Add to the button element so we can get it when the event comes.
        this.cellContents.setAttribute("deletionPosition", deletionPosition);
        this.addClass("action-cell-deletion");
    }
}

// LetterCell Classes

class LetterCell extends Cell {
    constructor(letter) {
        super();

        this.letter = letter;

        this.cellContainer = ElementUtilities.createElement("div");
        this.cellContents = ElementUtilities.addElementTo("div", this.cellContainer, {}, this.letter);

        this.addClass(["circle", "letter-cell"]);
        this.addContentsClass("letter");
    }

    addCorrectnessClass(correct, targetWord=false) {
        if (targetWord) {
            if (correct) {
                this.addClass("letter-cell-good");
            } else {
                this.addClass("letter-cell-target");
            }
        } else {
            if (correct) {
                this.addClass("letter-cell-good");
            } else {
                this.addClass("letter-cell-bad");
            }
        }
    }
}

class ActiveLetterCell extends LetterCell {
    constructor(letter, letterPosition, letterPicker, wasCorrect, changePosition, blankLetterOnChange=false) {
        super(letter);

        this.addClass("letter-cell-active");
        this.addCorrectnessClass(wasCorrect);

        if (letterPosition === changePosition) {
            this.addClass("letter-cell-change");

            // Add to the picker element so we can get it when the event comes.
            letterPicker.setAttribute('letterPosition', letterPosition);
            if (blankLetterOnChange) {
                ElementUtilities.setElementText(this.cellContents, " ");
            }
        }
    }
}

class PlayedLetterCell extends LetterCell {
    constructor(letter, wasCorrect) {
        super(letter);

        this.addClass("letter-cell-played");
        this.addCorrectnessClass(wasCorrect);
    }
}

class FutureLetterCell extends LetterCell {
    constructor(letter, letterPosition, changePosition) {
        super("");

        this.addClass("letter-cell-future");

        if (letterPosition === changePosition)
        {
            this.addClass("letter-cell-change");
        }
    }
}

class TargetLetterCell extends LetterCell {
    constructor(letter, wasSuccessful) {
        super(letter);
        // Pass true to indicate this is a TargetLetterCell.
        this.addCorrectnessClass(wasSuccessful, true);
    }
}


export { AdditionCell, DeletionCell, ActiveLetterCell, FutureLetterCell, PlayedLetterCell, TargetLetterCell };
