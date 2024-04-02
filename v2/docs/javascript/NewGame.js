import { DisplayInstruction } from './DisplayInstruction.js';

// word:           empty string for future
// wordLength:     word.length OR solutionWord.length in the case of future
// displayType:    played, add, delete, change, target, future
// changePosition: relevant only for change or future
// wasCorrect:     Not relevant for target or future

    //                         word,     wordLength, displayType, changePosition, wasCorrect, endOfGame
    //    new DisplayInstruction("HARD",   4,          "played",    0,              true,       false),
    //    new DisplayInstruction("HEARD",  5,          "delete",    0,              true,       false),
    //    new DisplayInstruction("",       4,          "future",    1,              true,       false),
    //    new DisplayInstruction("PEAR",   4,          "target",    0,              true,       false),

class Game {

    
    constructor(dict, startWord, endWord) {
        this.dict = dict;
        this.startWord = startWord;
        this.endWord = endWord;
        this.moveIndex = 0;
        // solve the puzzle
    }


    getNextDisplayInstruction() {
        console.log(`getNextDisplayInstruction(): moveIndex: ${this.moveIndex}, instructionIndex: ${this.instructionIndex}`);
        if (this.moveIndex >= this.game.length) {
            return null;
        }

        if (this.instructionIndex < this.game[this.moveIndex].length) {
            return this.game[this.moveIndex][this.instructionIndex++];
        } else {
            return null;
        }
    }

    over() {
        return this.moveIndex >= this.game.length;
    }

    pseudoMove() {
        this.moveIndex++;
        this.instructionIndex = 0;
        //console.log(`pseudoMove(): moveIndex: ${this.moveIndex}, instructionIndex: ${this.instructionIndex}`);
    }

    winner() {
        return false;
    }
}

export { Game };
