import { DisplayInstruction } from './DisplayInstruction.js';

// DisplayInstruction properties:
//
// word:           empty string for future
// displayType:    add, addChange, delete, change, future, played, target
// changePosition: not relevant for played or target
// wasCorrect:     not relevant for future
// endOfGame:      relevant only for target

class Game {

    constructor(startWord, targetWord) {
    }

    // Return DisplayInstruction.
    getNextDisplayInstruction() {
        console.log("getNextDisplayInstruction()");
    }

    // Return true if game is over; false otherwise.
    over() {
        console.log("over()");
    }

    // addPosition is 0 to word.length
    playAdd(addPosition) {
        console.log("playAdd(): addPosition:", addPosition);
    }

    // deletePosition is 1 to word.length
    playDelete(deletePosition) {
        console.log("playDelete(): deletePosition:", deletePosition);
    }

    // letterPosition is 1 to word.length
    playLetter(letterPosition, letter) {
        console.log("playLetter(): letterPosition:", letterPosition, ", letter:", letter);
    }

    // Return true if the game has been won; false otherwise.
    // If over() would return false this should return false.
    winner() {
        console.log("winner()");
    }
}

export { Game };
