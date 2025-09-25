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

        // In the case of empty cells the letter will be ' '.
        // In the case of change cells that are not empty the
        // letter will be '?'.
        this.letter = letter;

        // OuterCellContainer has either a transparent border or thick border,
        // the latter indicating a current or future change move. The transparent
        // and thick borders are the same width, enabling all the cells to line
        // up properly in the grid, regardless of whether they indicate a change.
        this.outerCellContainer = ElementUtilities.createElement("div", {class: "circle outer-cell letter-outer-cell"});

        this.cellContainer = ElementUtilities.addElementTo("div", this.outerCellContainer, {class: "circle letter-cell"});
        this.cellContents = ElementUtilities.addElementTo("div", this.cellContainer, {}, this.letter);

        this.addClass("letter", this.cellContents);
    }

    handleLetterChangeIfNeeded(letterPosition, changePosition) {
        const CL = "LetterCell.handleLetterCellChangeIfNeeded";
        COV(0, CL);

        // We'll set the *outer* cell's styling to be visible (i.e. not transparent).
        if (letterPosition === changePosition) {
            COV(1, CL);
            this.addClass("letter-cell-change", this.outerCellContainer);
        }
        COV(2, CL);
    }
}

// These cells have no letter, no background color, but the border may indicate change.
// Used for 'future' display instructions.
class EmptyLetterCell extends LetterCell {
    constructor(letterPosition, changePosition) {
        // For this class, we hard-code letter to be a space, because we don't want
        // to have a letter showing.
        super(' ');

        const CL = "EmptyLetterCell.constructor";
        COV(0, CL);

        this.addClass("letter-cell-future", this.cellContainer);

        this.handleLetterChangeIfNeeded(letterPosition, changePosition);
    }
}

// These cells have a letter (possibly '?'), no background color, and the border may indicate change.
// Used for 'wordAfterAdd' and 'wordAfterChange' display instructions.
class LetterCellNoBackground extends LetterCell {
    constructor(letter, letterPosition,  changePosition) {
        super(letter);

        const CL = "LetterCellNoBackground.constructor";
        COV(0, CL);

        this.handleLetterChangeIfNeeded(letterPosition, changePosition);
    }
}

// These cells have a letter (possibly '?'), a background color, and the border may indicate change.
// Used for all 'played' display instructions.
class LetterCellWithBackground extends LetterCell {
    constructor(letter, letterPosition, changePosition, moveRating, isStartWord, isTargetWord) {
        super(letter);
        const CL = "LetterCellWithBackground.constructor";
        COV(0, CL);

        this.addBackgroundClass(moveRating, isStartWord, isTargetWord);
        this.handleLetterChangeIfNeeded(letterPosition, changePosition);
    }

    addBackgroundClass(moveRating, isStart, isTarget) {
        const CL = "LetterCell.addBackgroundClass";
        COV(0, CL);
        if (isStart) {
            COV(1, CL);
            this.addClass("letter-cell-start", this.cellContainer);
        } else if (isTarget) {
            if (moveRating == Const.NO_RATING) {
                COV(2, CL);
                this.addClass("letter-cell-target", this.cellContainer);
            } else {
                COV(3, CL);
                // TODO: Maybe this should just pass Const.GOOD_MOVE so always green if game
                // is finished, even if last word was shown. Target word can't have
                // moveRating SCRABBLE_MOVE, GENIUS_MOVE, DODO_MOVE, or WRONG_MOVE.
                this.addBackgroundClassBasedOnMoveRating(moveRating);
            }
        }
        else {
            COV(4, CL);
            this.addBackgroundClassBasedOnMoveRating(moveRating);
        }
        COV(5, CL);
    }

    addBackgroundClassBasedOnMoveRating(moveRating) {
        const CL = "LetterCell.addBackgroundClassBasedOnMoveRating";
        COV(0, CL);

        if (moveRating == Const.GOOD_MOVE || moveRating == Const.SCRABBLE_MOVE) {
            COV(1, CL);
            this.addClass("letter-cell-good", this.cellContainer);
        } else if (moveRating == Const.GENIUS_MOVE) {
            COV(2, CL);
            this.addClass("letter-cell-genius", this.cellContainer);
        } else if (moveRating == Const.DODO_MOVE) {
            COV(3, CL);
            this.addClass("letter-cell-dodo", this.cellContainer);
        } else if (moveRating == Const.SHOWN_MOVE) {
            COV(4, CL);
            this.addClass("letter-cell-shown", this.cellContainer);
        } else {
            COV(5, CL);
            this.addClass("letter-cell-bad", this.cellContainer);
        }
        COV(6, CL);
    }
}

export { AdditionCell, DeletionCell, EmptyLetterCell, LetterCellNoBackground, LetterCellWithBackground };
