import { DisplayInstruction } from './DisplayInstruction.js';
import { Solver, Solution } from './Solver.js';
import { WordChainDict } from './WordChainDict.js';
import * as Const from './Const.js'

// DisplayInstruction properties:
//
// word:           empty string for future
// displayType:    add, addChange, delete, change, future, played, target
// changePosition: not relevant for played or target
// wasCorrect:     not relevant for future
// endOfGame:      relevant only for target


class Game {

    constructor(dictionary, startWord, targetWord) {
        console.log("constructor(): startWord:", startWord, ", targetWord:", targetWord);
        this.startWord = startWord;
        this.dictionary = dictionary;
        this.doingInsert = 0;
        this.partialSolution = new Solution(startWord, targetWord);
        this.fullSolutionGivenProgress = Solver.solve(this.dictionary, startWord, targetWord);
        this.displayInstructionIndex = 0;
    }

    // Return DisplayInstruction.
    getNextDisplayInstruction() {
        console.log("getNextDisplayInstruction()");
        let displayInstruction = new DisplayInstruction("HARD", Const.ADD_SPACE, 0, true, false);
        return displayInstruction;
    }

    // Return true if game is over; false otherwise.
    over() {
        console.log("over()");
        return this.partialSolution.isSolved();
    }

    addWordIfExists(word) {
        if (this.dictionary.isWord(word)) {
            this.partialSolution.addWord(word);
            this.fullSolutionGivenProgress = Solver.resolve(self.dictionary, self.partialSolution);
            return Const.OK;
        } else {
            return Const.NOT_A_WORD
        }
    }


    // addPosition is 0 to word.length
    // returns true if no error
    // returns null on error (e.g. unexpected position)
    playAdd(addPosition) {
        console.log("playAdd(): addPosition:", addPosition);
        this.doingInsert = 1
        let oldWord = this.partialSolution.getLastWord();
        let newWordWithHole = `${oldWord.substring(0,index)}${Const.CHANGE_CHAR}${oldWord.substring(index)}`;
        //we add a placeholder word to our partial solution.  The full solution in
        //  progress stays as it is.
        this.partialSolution.addWord(newWordWithHole)
        return Const.OK;
    }

    // deletePosition is 1 to word.length
    // returns true if resulting word is in dictionary; false otherwise
    // returns null on other error (e.g. unexpected position)
    playDelete(deletePosition) {
        console.log("playDelete(): deletePosition:", deletePosition);
        let oldWord = this.partialSolution.getLastWord();
        // adjust to zero-based
        deletePosition -= 1;
        if ((deletePosition < 0) || (deletePosition >= oldWord.length)) {
            console.log("bad adjusted delete position", deletePosition)
        }
        newWord = oldWord.substring(0,deletePosition) + oldWord.substring(deletePosition+1);
        this.doingInsert = 0;
        return this.addWordIfExists(newWord);
    }

    // letterPosition is 1 to word.length
    // returns true if resulting word is in dictionary; false otherwise
    // returns null on other error (e.g. unexpected position)
    playLetter(letterPosition, letter) {
        console.log("playLetter(): letterPosition:", letterPosition, ", letter:", letter);
        // adjust to zero-based
        letterPosition -= 1;
        oldWord = this.partialSolution.getLastWord();
        newWord = oldWord.substring(0,letterPosition) + letter + oldWord.substring(letterPosition+1);
        if (this.doingInsert == 1) {
            // we remove the word with a hole in it, and then add the actual word formed.
            self.partialSolution.removeLastWord();
        }
        this.doingInsert = 0;
        return this.addWordIfExists(newWord)
    }

    // Return true if the game has been won; false otherwise.
    // If over() would return false this should return false.
    winner() {
        console.log("winner()");
    }
}

export { Game };
