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

        ElementUtilities.addClass(addButtonTo, 'circle action-cell');

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

    addCorrectnessClass(moveRating, targetWordInProgress=false) {
        if (targetWordInProgress) {
            this.addClass("letter-cell-target");
        } else {
            if (moveRating == Const.OK) {
                this.addClass("letter-cell-good");
            }
            else if (moveRating == Const.GENIUS_MOVE) {
                this.addClass("letter-cell-good");
            }
            else {
                this.addClass("letter-cell-bad");
            }
        }
    }
}

class ActiveLetterCell extends LetterCell {
    constructor(letter, letterPosition, letterPicker, moveRating, changePosition) {
        super(letter);

        this.addCorrectnessClass(moveRating);

        if (letterPosition === changePosition) {
            this.addClass("letter-cell-change");

            // Save the letter position so we can get it when the event comes.
            letterPicker.saveLetterPosition(letterPosition);
        }
    }
}

class PlayedLetterCell extends LetterCell {
    constructor(letter, moveRating) {
        super(letter);

        this.addClass("letter-cell-played");
        this.addCorrectnessClass(moveRating);
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

class TargetLetterCell extends LetterCell {
    constructor(letter, moveRating, gameOver) {
        super(letter);
        const inProgress = !gameOver;
        this.addCorrectnessClass(moveRating, inProgress);
    }
}


export { AdditionCell, DeletionCell, ActiveLetterCell, FutureLetterCell, PlayedLetterCell, TargetLetterCell };
