import * as Const from './Const.js';

// This class provides the interface between the GameDisplay and Game classes.
// When displaying the game grid, GameDisplay requests display instructions from
// Game in a loop until Game returns null. Game Display converts the DisplayInstruction
// into web elements. A fresh grid is displayed with each user interaction (click of
// an add/delete button or selection of a letter to change the word).
//
// See Const.js for definitions of constant strings for the displayTypes.
class DisplayInstruction {
    //
    // word: string is ignored for future; only length of it is used
    //
    // displayType: add, delete, change, future, played, target
    //     add:         word should be displayed as the active word and color based on moveRating, with plus signs
    //     delete:      word should be displayed as the active word and color based on moveRating, with minus signs
    //     change:      word should be displayed as the active word and color based on moveRating, with thick outline at changePosition
    //     changeNext:  word should be displayed with no color and letters shown ('?' for the one to fill in)
    //                  (NOTE: next only applies to a letter change, including one that occurs after adding a space.)
    //     future:      word should be displayed with no color or letter, with thick outline at changePosition
    //     played:      word should be diplayed with color based on moveRating (includes start word)
    //     target:      word should be displayed with "target color" and this type is not sent
    //                  for the target word if the game is over; instead, displayType will be 'played'
    //
    // changePosition: relevant only for change and future; 1..word.length
    //
    // moveRating: OK, WRONG_MOVE, GENIUS_MOVE, SCRABBLE_WORD, DODO_MOVE, SHOWN_MOVE
    //             (not relevant for future or target displayType)
    //     OK:           a word that did NOT increase the solution length
    //     WRONG_MOVE    a word that increased the solution length by 1
    //     GENIUS_MOVE   a word that was in the Scrabble dictionary and causes the solution to get shorter
    //     SCRABBLE_WORD a word that was in the Scrabble dictionary, but does not cause the solution to get shorter
    //     DODO_MOVE     a word that increased the solution length by 2
    //     SHOWN_MOVE    a word given to the player when he/she clicks 'Show Next Move' or when the game is lost
    //
    constructor(word, displayType, changePosition, moveRating) {
        this.word = word;
        this.wordLength = word.length;
        this.displayType = displayType;
        this.changePosition = changePosition;
        this.moveRating = moveRating;
    }

    copy() {
        return new DisplayInstruction(
            this.word,
            this.displayType,
            this.changePosition,
            this.moveRating
        );
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

        if (this.displayType === Const.CHANGE || this.displayType == Const.CHANGE_NEXT || this.displayType === Const.FUTURE) {
            returnStr += `,changePosition:${this.changePosition}`;
        }
        returnStr += ")";

        return returnStr;
    }
}

export { DisplayInstruction };
