import { ElementUtilities } from './ElementUtilities.js';

class Cell {
    constructor() {
        super();

        this.cellContainer = null;
        this.cellContents = null;
    }

    addClass(className) {
        ElementUtilities.addClass(this.cellContainer, className);
    }

    addContentsClass(className) {
        ElementUtilities.addClass(this.cellContents, className);
    }

    getElement() {
        return this.cellContainer;
    }
}

// ActionCell Classes

class ActionCell extends Cell {
    constructor(symbol, callback) {
        super();
        this.symbol = symbol;

        this.cellContainer = ElementUtilities.createElement("div");
        this.cellContents = ElementUtilities.addElementTo("button", this.cellContainer, {}, this.symbol);
        ElementUtilities.setButtonCallback(this.cellContents, callback);

        this.addClass("ACTION");
        this.addContentsClass("SYMBOL");
    }
}

class ExpansionCell extends ActionCell {
    constructor(expansionPosition, hidden, callback) {
        super("+", callback);
        if (hidden) {
            this.cellContainer.style.visibility = "hidden";
        } else {
            // Add to the button element so we can get it when the event comes.
            this.cellContents.setAttribute("expansionPosition", expansionPosition);
            this.addClass("EXPANSION");
        }
    }
}

class ReductionCell extends ActionCell {
    constructor(reductionPosition, callback) {
        super("-", callback);
        // Add to the button element so we can get it when the event comes.
        this.cellContents.setAttribute("reductionPosition", reductionPosition);
        this.addClass("REDUCTION");
    }
}

// LetterCell Classes

class LetterCell extends Cell {
    constructor(letter) {
        super();
        this.letter = letter;

        this.cellContainer = ElementUtilities.createElement("div");
        this.cellContents = ElementUtilities.addElementTo("div", this.cellContainer, {}, this.letter);

        this.addContentsClass("LETTER");
    }

    addCorrectnessClass(correct) {
        if (correct) {
            this.addClass("CORRECT");
        } else {
            this.addClass("INCORRECT");
        }
    }
}

class ActiveLetterCell extends LetterCell {
    constructor(letter, letterPosition, wasCorrect, changePosition, blankLetterOnChange=false) {
        super(letter);

        this.addClass("ACTIVE");
        this.addCorrectnessClass(wasCorrect);

        if (letterPosition === changePosition) {
            this.addClass("CHANGE");
            if (blankLetterOnChange) {
                ElementUtilities.setElementText(this.cellContents, " ");
            }
        }
    }
}

class PlayedLetterCell extends LetterCell {
    constructor(letter, wasCorrect) {
        super(letter);

        this.addClass("PLAYED");
        this.addCorrectnessClass(wasCorrect);
    }
}

class FutureLetterCell extends LetterCell {
    constructor(letter, letterPosition, changePosition) {
        super("X");

        this.addClass("FUTURE");

        if (letterPosition === changePosition)
        {
            this.addClass("CHANGE");
        }
    }
}

class TargetLetterCell extends LetterCell {
    constructor(letter, wasSuccessful) {
        super(letter);
        this.addCorrectnessClass(wasSuccessful);
    }
}


export { ExpansionCell, ReductionCell, ActiveLetterCell, FutureLetterCell, PlayedLetterCell, TargetLetterCell };
