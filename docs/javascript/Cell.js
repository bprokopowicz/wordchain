import * as Const from './Const.js';
import { ElementUtilities } from './ElementUtilities.js';
import { COV } from './Coverage.js';

class Cell {
    constructor() {
        const CL = "Cell.constructor";
        COV(0, CL);
        this.outerCellContainer = null;
        this.cellContainer = null;
        this.cellContents = null;
    }

    addClass(classNameOrList, element) {
        const CL = "Cell.addClass";
        COV(0, CL);
        if (! element) {
            COV(1, CL);
            element = this.outerCellContainer;
        }
        ElementUtilities.addClass(element, classNameOrList);
        COV(2, CL);
    }

    getElement() {
        const CL = "Cell.getElement";
        COV(0, CL);
        return this.outerCellContainer;
    }
}

/* ----- ActionCell Classes ----- */

class ActionCell extends Cell {
    constructor(symbol, callbackObj, callbackFunc, deletion) {
        const CL = "ActionCell.constructor";
        super();
        COV(0, CL);
        this.symbol = symbol;

        let addButtonTo;
        if (deletion) {
            COV(1, CL);
            // Class outer-cell ensures that the deletion button takes as much
            // space as a letter so it is properly centered underneath the letter.
            this.outerCellContainer = ElementUtilities.createElement("div", {class: 'circle outer-cell action-outer-cell'});
            this.cellContainer = ElementUtilities.addElementTo("div", this.outerCellContainer);
            addButtonTo = this.cellContainer;

        } else {
            COV(2, CL);
            // No outer/inner cell for the addition buttons -- we want them
            // to be narrower so as not to use so much real estate.
            this.outerCellContainer = ElementUtilities.createElement("div");
            addButtonTo = this.outerCellContainer;
        }

        ElementUtilities.addClass(addButtonTo, `circle action-cell ${Const.UNSELECTED_STYLE}`);

        this.cellContents = ElementUtilities.addElementTo("button", addButtonTo, {class: 'action-button'}, this.symbol);
        ElementUtilities.setButtonCallback(this.cellContents, callbackObj, callbackFunc);
        this.addClass("action", this.cellContents);
        COV(3, CL);
    }
}

class AdditionCell extends ActionCell {
    constructor(additionPosition, hidden, callbackObj, callbackFunc) {
        super("+", callbackObj, callbackFunc, false);
        const CL = "ActionCell.constructor";
        COV(0, CL);


        if (hidden) {
            COV(1, CL);
            this.outerCellContainer.style.visibility = "hidden";
        } else {
            // Add to the button element so we can get it when the event comes.
            COV(2, CL);
            this.cellContents.setAttribute("additionPosition", additionPosition);
            this.addClass("action-cell-addition", this.outerCellContainer);
        }
        COV(3, CL);
    }
}

class DeletionCell extends ActionCell {
    constructor(deletionPosition, callbackObj, callbackFunc) {
        super("-", callbackObj, callbackFunc, true);
        const CL = "DeletionCell.constructor";
        COV(0, CL);

        // Add to the button element so we can get it when the event comes.
        this.cellContents.setAttribute("deletionPosition", deletionPosition);
        this.addClass("action-cell-deletion", this.outerCellContainer);
    }
}

/* ----- LetterCell Classes ----- */

class LetterCell extends Cell {
    constructor(letter) {
        super();
        const CL = "LetterCell.constructor";
        COV(0, CL);

        this.letter = letter;

        this.outerCellContainer = ElementUtilities.createElement("div", {class: "circle outer-cell letter-outer-cell"});
        this.cellContainer = ElementUtilities.addElementTo("div", this.outerCellContainer, {class: "circle letter-cell"});
        this.cellContents = ElementUtilities.addElementTo("div", this.cellContainer, {}, this.letter);

        this.addClass("letter", this.cellContents);
    }

    addCorrectnessClass(moveRating) {
        const CL = "LetterCell.constructor";
        COV(0, CL);
        if (moveRating == Const.OK || moveRating == Const.SCRABBLE_WORD) {
            COV(1, CL);
            this.addClass("letter-cell-good", this.cellContainer);
        }
        else if (moveRating == Const.GENIUS_MOVE) {
            COV(2, CL);
            this.addClass("letter-cell-genius", this.cellContainer);
        }
        else if (moveRating == Const.DODO_MOVE) {
            COV(3, CL);
            this.addClass("letter-cell-dodo", this.cellContainer);
        }
        else if (moveRating == Const.SHOWN_MOVE) {
            COV(4, CL);
            this.addClass("letter-cell-shown", this.cellContainer);
        }
        else {
            COV(5, CL);
            this.addClass("letter-cell-bad", this.cellContainer);
        }
        COV(6, CL);
    }
}

class ActiveLetterCell extends LetterCell {
    constructor(letter, letterPosition, letterPicker, moveRating, changePosition, firstWord, wordFollowsAdd) {
        super(letter);
        const CL = "ActiveLetterCell.constructor";
        COV(0, CL);

        if (firstWord) {
            COV(1, CL);
            this.addClass("letter-cell-start", this.cellContainer);
        } else {
            COV(2, CL);
            // No correctness class when selecting the position where a letter is
            // to be added; in that case we show the letter cell as transparent
            // (and the "active background" shows through). However, we do want
            // add a class if this is a shown move.
            if (! wordFollowsAdd || moveRating == Const.SHOWN_MOVE) {
                COV(3, CL);
                this.addCorrectnessClass(moveRating);
            }
        }
        COV(4, CL);

        // This will only be true if the user is expected to pick a letter.
        // We'll set the *outer* cell's styling to be visible (i.e. not transparent).
        if (letterPosition === changePosition) {
            COV(5, CL);
            this.addClass("letter-cell-change", this.outerCellContainer);

            // Save the letter position so we can get it when the event comes.
            letterPicker.saveLetterPosition(letterPosition);
        }
        COV(6, CL);
    }
}

class FutureLetterCell extends LetterCell {
    constructor(letter, letterPosition, changePosition) {
        super("");
        const CL = "FutureLetterCell.constructor";
        COV(0, CL);

        this.addClass("letter-cell-future", this.cellContainer);

        if (letterPosition === changePosition)
        {
            COV(1, CL);
            // We'll set the *outer* cell's styling to be visible (i.e. not transparent).
            this.addClass("letter-cell-future-change", this.outerCellContainer);
        }
        COV(2, CL);
    }
}

class ChangeNextLetterCell extends LetterCell {
    constructor(letter, letterPosition, changePosition) {
        super(letter);
        const CL = "ChangeNextLetterCell.constructor";
        COV(0, CL);

        this.addClass("letter-cell-future", this.cellContainer);

        if (letterPosition === changePosition)
        {
            COV(1, CL);
            // We'll set the *outer* cell's styling to be visible (i.e. not transparent).
            this.addClass("letter-cell-future-change", this.outerCellContainer);
        }
        COV(2, CL);
    }
}

class PlayedLetterCell extends LetterCell {
    constructor(letter, moveRating, firstWord) {
        super(letter);
        const CL = "PlayedLetterCell.constructor";
        COV(0, CL);

        if (firstWord) {
            COV(1, CL);
            this.addClass("letter-cell-start", this.cellContainer);
        } else {
            COV(2, CL);
            this.addCorrectnessClass(moveRating);
        }
        COV(3, CL);
    }
}

class TargetLetterCell extends LetterCell {
    constructor(letter) {
        super(letter);
        const CL = "TargetLetterCell.constructor";
        COV(0, CL);
        this.addClass("letter-cell-target", this.cellContainer);
    }
}


export { AdditionCell, DeletionCell, ActiveLetterCell, ChangeNextLetterCell, FutureLetterCell, PlayedLetterCell, TargetLetterCell };
