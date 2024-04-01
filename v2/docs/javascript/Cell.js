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
    constructor(symbol, callback, reduction) {
        super();
        this.symbol = symbol;

        let addButtonTo;
        if (reduction) {
            this.cellContainer = ElementUtilities.createElement("div", {class: 'circle action-outer-cell'});
            this.cellInnerContainer = ElementUtilities.addElementTo("div", this.cellContainer);
            addButtonTo = this.cellInnerContainer;

        } else {
            this.cellContainer = ElementUtilities.createElement("div");
            addButtonTo = this.cellContainer;
        }

        ElementUtilities.addClass(addButtonTo, 'circle action-cell');

        this.cellContents = ElementUtilities.addElementTo("button", addButtonTo, {class: 'action-button'}, this.symbol);
        ElementUtilities.setButtonCallback(this.cellContents, callback);
        this.addContentsClass("action");
    }
}

class ExpansionCell extends ActionCell {
    constructor(expansionPosition, hidden, callback) {
        super("+", callback, false);

        if (hidden) {
            this.cellContainer.style.visibility = "hidden";
        } else {
            // Add to the button element so we can get it when the event comes.
            this.cellContents.setAttribute("expansionPosition", expansionPosition);
            this.addClass("action-cell-expansion");
        }
    }
}

class ReductionCell extends ActionCell {
    constructor(reductionPosition, callback) {
        super("-", callback, true);
        // Add to the button element so we can get it when the event comes.
        this.cellContents.setAttribute("reductionPosition", reductionPosition);
        this.addClass("action-cell-reduction");
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
    constructor(letter, letterPosition, wasCorrect, changePosition, blankLetterOnChange=false) {
        super(letter);

        this.addClass("letter-cell-active");
        this.addCorrectnessClass(wasCorrect);

        if (letterPosition === changePosition) {
            this.addClass("letter-cell-change");
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


export { ExpansionCell, ReductionCell, ActiveLetterCell, FutureLetterCell, PlayedLetterCell, TargetLetterCell };
