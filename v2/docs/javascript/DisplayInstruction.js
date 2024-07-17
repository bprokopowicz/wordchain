  import * as Const from './Const.js';

// This class provides the interface between the GameDisplay and Game classes.
// When displaying the game grid, GameDisplay requests display instructions from
// Game in a loop until Game returns null. Game Display converts the DisplayInstruction
// into web elements. A fresh grid is displayed with each user interaction (click of
// an add/delete button or selection of a letter to change the word).
//
// See Const.js for definitions of constant strings for the displayTypes.
class DisplayInstruction {
    // word:           string is ignored for future; only length of it is used
    // displayType:    add, delete, change, future, played, target
    // changePosition: relevant only for change and future; 1..word.length
    // moveRating:     OK, WRONG_MOVE, GENIUS_MOVE; not relevant for future or target
    //
    // add, delete, change are used for the active word.
    constructor(word, displayType, changePosition, moveRating) {
        this.word = word;
        this.wordLength = word.length;
        this.displayType = displayType;
        this.changePosition = changePosition;
        this.moveRating = moveRating;
    }

    // Used for debugging only.
    toStr() {
        var returnStr = `(${this.displayType}`;

        if (this.word.length !== 0) {
            returnStr += `,word:${this.word}`;
        } else {
            returnStr += `,wordLength:${this.wordLength}`;
        }

        if (this.displayType === Const.PLAYED) {
            returnStr += `,moveRating:${this.moveRating}`;
        }

        if (this.displayType === Const.CHANGE  || this.displayType === Const.FUTURE) {
            returnStr += `,changePosition:${this.changePosition}`;
        }
        returnStr += ")";

        return returnStr;
    }
}

export { DisplayInstruction };
