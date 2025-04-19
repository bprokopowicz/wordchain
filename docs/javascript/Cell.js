import * as Const from './Const.js';
import { ElementUtilities } from './ElementUtilities.js';

class Cell {
    constructor() {
        this.outerCellContainer = null;
        this.cellContainer = null;
        this.cellContents = null;
    }

    addClass(classNameOrList, element) {
        if (! element) {
            element = this.outerCellContainer;
        }
        ElementUtilities.addClass(element, classNameOrList);
    }

    getElement() {
        return this.outerCellContainer;
    }
}

/* ----- ActionCell Classes ----- */

class ActionCell extends Cell {
    constructor(symbol, callbackObj, callbackFunc, deletion) {
        super();
        this.symbol = symbol;

        let addButtonTo;
        if (deletion) {
            // Class outer-cell ensures that the deletion button takes as much
            // space as a letter so it is properly centered underneath the letter.
            this.outerCellContainer = ElementUtilities.createElement("div", {class: 'circle outer-cell action-outer-cell'});
            this.cellContainer = ElementUtilities.addElementTo("div", this.outerCellContainer);
            addButtonTo = this.cellContainer;

        } else {
            // No outer/inner cell for the addition buttons -- we want them
            // to be narrower so as not to use so much real estate.
            this.outerCellContainer = ElementUtilities.createElement("div");
            addButtonTo = this.outerCellContainer;
        }

        ElementUtilities.addClass(addButtonTo, `circle action-cell ${Const.UNSELECTED_STYLE}`);

        this.cellContents = ElementUtilities.addElementTo("button", addButtonTo, {class: 'action-button'}, this.symbol);
        ElementUtilities.setButtonCallback(this.cellContents, callbackObj, callbackFunc);
        this.addClass("action", this.cellContents);
    }
}

class AdditionCell extends ActionCell {
    constructor(additionPosition, hidden, callbackObj, callbackFunc) {
        super("+", callbackObj, callbackFunc, false);

        if (hidden) {
            this.outerCellContainer.style.visibility = "hidden";
        } else {
            // Add to the button element so we can get it when the event comes.
            this.cellContents.setAttribute("additionPosition", additionPosition);
            this.addClass("action-cell-addition", this.outerCellContainer);
        }
    }
}

class DeletionCell extends ActionCell {
    constructor(deletionPosition, callbackObj, callbackFunc) {
        super("-", callbackObj, callbackFunc, true);

        // Add to the button element so we can get it when the event comes.
        this.cellContents.setAttribute("deletionPosition", deletionPosition);
        this.addClass("action-cell-deletion", this.outerCellContainer);
    }
}

/* ----- LetterCell Classes ----- */

class LetterCell extends Cell {
    constructor(letter) {
        super();

        this.letter = letter;

        this.outerCellContainer = ElementUtilities.createElement("div", {class: "circle outer-cell letter-outer-cell"});
        this.cellContainer = ElementUtilities.addElementTo("div", this.outerCellContainer, {class: "circle letter-cell"});
        this.cellContents = ElementUtilities.addElementTo("div", this.cellContainer, {}, this.letter);

        this.addClass("letter", this.cellContents);
    }

    addCorrectnessClass(moveRating) {
        if (moveRating == Const.OK || moveRating == Const.SCRABBLE_WORD) {
            this.addClass("letter-cell-good", this.cellContainer);
        }
        else if (moveRating == Const.GENIUS_MOVE) {
            this.addClass("letter-cell-genius", this.cellContainer);
        }
        else if (moveRating == Const.DODO_MOVE) {
            this.addClass("letter-cell-dodo", this.cellContainer);
        }
        else if (moveRating == Const.SHOWN_MOVE) {
            this.addClass("letter-cell-shown", this.cellContainer);
        }
        else {
            this.addClass("letter-cell-bad", this.cellContainer);
        }
    }
}

class ActiveLetterCell extends LetterCell {
    constructor(letter, letterPosition, letterPicker, moveRating, changePosition, firstWord, wordFollowsAdd) {
        super(letter);

        if (firstWord) {
            this.addClass("letter-cell-start", this.cellContainer);
        } else {
            // No correctness class when selecting the position where a letter is
            // to be added; in that case we show the letter cell as transparent
            // (and the "active background" shows through).
            if (! wordFollowsAdd) {
                this.addCorrectnessClass(moveRating);
            }
        }

        // This will only be true if the user is expected to pick a letter.
        // We'll set the *outer* cell's styling to be visible (i.e. not transparent).
        if (letterPosition === changePosition) {
            this.addClass("letter-cell-change", this.outerCellContainer);

            // Save the letter position so we can get it when the event comes.
            letterPicker.saveLetterPosition(letterPosition);
        }
    }
}

class FutureLetterCell extends LetterCell {
    constructor(letter, letterPosition, changePosition) {
        super("");

        this.addClass("letter-cell-future", this.cellContainer);

        if (letterPosition === changePosition)
        {
            // We'll set the *outer* cell's styling to be visible (i.e. not transparent).
            this.addClass("letter-cell-future-change", this.outerCellContainer);
        }
    }
}

class ChangeNextLetterCell extends LetterCell {
    constructor(letter, letterPosition, changePosition) {
        super(letter);

        // TODO: NEW CLASSES
        this.addClass("letter-cell-future", this.cellContainer);

        if (letterPosition === changePosition)
        {
            // We'll set the *outer* cell's styling to be visible (i.e. not transparent).
            this.addClass("letter-cell-future-change", this.outerCellContainer);
        }
    }
}

class PlayedLetterCell extends LetterCell {
    constructor(letter, moveRating, firstWord) {
        super(letter);

        if (firstWord) {
            this.addClass("letter-cell-start", this.cellContainer);
        } else {
            this.addCorrectnessClass(moveRating);
        }
    }
}

class TargetLetterCell extends LetterCell {
    constructor(letter) {
        super(letter);
        this.addClass("letter-cell-target", this.cellContainer);
    }
}


export { AdditionCell, DeletionCell, ActiveLetterCell, ChangeNextLetterCell, FutureLetterCell, PlayedLetterCell, TargetLetterCell };
