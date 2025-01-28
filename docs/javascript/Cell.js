import * as Const from './Const.js';
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

/* ----- ActionCell Classes ----- */

class ActionCell extends Cell {
    constructor(symbol, callbackObj, callbackFunc, deletion) {
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

        ElementUtilities.addClass(addButtonTo, 'circle action-cell button-unselected');

        this.cellContents = ElementUtilities.addElementTo("button", addButtonTo, {class: 'action-button'}, this.symbol);
        ElementUtilities.setButtonCallback(this.cellContents, callbackObj, callbackFunc);
        this.addContentsClass("action");
    }
}

class AdditionCell extends ActionCell {
    constructor(additionPosition, hidden, callbackObj, callbackFunc) {
        super("+", callbackObj, callbackFunc, false);

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
    constructor(deletionPosition, callbackObj, callbackFunc) {
        super("-", callbackObj, callbackFunc, true);

        // Add to the button element so we can get it when the event comes.
        this.cellContents.setAttribute("deletionPosition", deletionPosition);
        this.addClass("action-cell-deletion");
    }
}

/* ----- LetterCell Classes ----- */

class LetterCell extends Cell {
    constructor(letter) {
        super();

        this.letter = letter;

        this.cellContainer = ElementUtilities.createElement("div");
        this.cellContents = ElementUtilities.addElementTo("div", this.cellContainer, {}, this.letter);

        this.addClass(["circle", "letter-cell"]);
        this.addContentsClass("letter");
    }

    addCorrectnessClass(moveRating) {
        if (moveRating == Const.OK) {
            this.addClass("letter-cell-good");
        }
        else if (moveRating == Const.GENIUS_MOVE) {
            this.addClass("letter-cell-genius");
        }
        else if (moveRating == Const.DODO_MOVE) {
            this.addClass("letter-cell-dodo");
        }
        else {
            this.addClass("letter-cell-bad");
        }
    }
}

class ActiveLetterCell extends LetterCell {
    constructor(letter, letterPosition, letterPicker, moveRating, changePosition, firstWord) {
        super(letter);

        if (firstWord) {
            this.addClass("letter-cell-start");
        }

        this.addCorrectnessClass(moveRating);

        // This will only be true if the user is expected to pick a letter.
        if (letterPosition === changePosition) {
            this.addClass("letter-cell-change");

            // Save the letter position so we can get it when the event comes.
            letterPicker.saveLetterPosition(letterPosition);
        }
    }
}

class FutureLetterCell extends LetterCell {
    constructor(letter, letterPosition, changePosition) {
        super("");

        this.addClass("letter-cell-future");

        if (letterPosition === changePosition)
        {
            this.addClass("letter-cell-future-change");
        }
    }
}

class PlayedLetterCell extends LetterCell {
    constructor(letter, moveRating, firstWord) {
        super(letter);

        if (firstWord) {
            this.addClass("letter-cell-start");
        } else {
            this.addCorrectnessClass(moveRating);
        }
    }
}

class TargetLetterCell extends LetterCell {
    constructor(letter) {
        super(letter);
        this.addClass("letter-cell-target");
    }
}


export { AdditionCell, DeletionCell, ActiveLetterCell, FutureLetterCell, PlayedLetterCell, TargetLetterCell };
