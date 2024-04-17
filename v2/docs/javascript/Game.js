import { DisplayInstruction } from './DisplayInstruction.js';
import { Solver, Solution, PlayedWord} from './Solver.js';
import { WordChainDict } from './WordChainDict.js';
import * as Const from './Const.js'

// DisplayInstruction properties:
//
// word:           empty string for future
// displayType:    add, addChange, delete, change, future, played, target
// changePosition: not relevant for played or target
// wasCorrect:     not relevant for future


class Game {

    constructor(dictionary, startWord, targetWord) {
        console.log("constructor(): startWord:", startWord, ", targetWord:", targetWord);
        startWord = startWord.toUpperCase();
        targetWord = targetWord.toUpperCase();
        this.dictionary = dictionary;
        this.doingInsert = 0;
        this.partialSolution = Solution.emptySolution(startWord, targetWord);
        this.fullSolutionGivenProgress = Solver.solve(this.dictionary, startWord, targetWord);
        this.wordToDisplayIndex = 0;
        this.userJustClickedPlus = false;
    }

    // Return DisplayInstruction for the current 'wordToDisplayIndex'.  .
    // The words displayed go from 0 to the number of steps in the full solution + 1

/*
    beginning
    action word is @0 cat
     soln  played disp instruction
    0 cat  cat     at cat,CHANGE@1
    1 bat  ---    XXX  bat,FUTURE
    2 bart ---    XXXX bart,FUTURE
    3 burt ---    burt burt,TARGET

    user types 'b'
    action word is @1 bat
    0 cat  cat    cat cat,PLAYED
    1 bat  bat    +b+a+t+  bat,ADD
    2 bart ---    XXXX bart,FUTURE
    3 burt ---    burt  burt,TARGET

    user clicks + #2
    action word is @1 bat
    0 cat  cat    cat cat,PLAYED
    1 bat  bat    ba t  bat,ADD_CHANGE@'2'
    2 bart ---    XXXX bart,FUTURE
    3 burt ---    burt  burt,TARGET

    user types r 
    action word is @2 bart 
    0 cat  cat    cat PLAYED
    1 bat  bat    bat  PLAYED
    2 bart bart   b rt CHANGE@1
    3 burt ---    burt  TARGET

    user types u
    0 cat  cat    cat PLAYED
    1 bat  bat    bat  PLAYED
    2 bart bart   bart PLAYED
    3 burt burt   burt  TARGET

    The words that precede the last-played word, if any, are PLAYED
    The last-played word is the active word that needs a hint
    The words after the last-played word are FUTURE.
    The last word is TARGET
    */

    // Finishes the game. When getNextDisplayInstruction() is called after this,
    // the game can be displayed just the same as if a user finished with all
    // correct moves.
    finishGame() {
        this.partialSolution = this.fullSolutionGivenProgress.copy();
    }

    /*
    Returns an object like this:

        {
            over: true if user has found target word or steps-minSteps >= Const.TOO_MANY_EXTRA_STEPS

            // Only include these two if over is true.

            extraSteps: how many more it took to solve than the minimum

            // This will tell me how to construct the share graphic.
            gameSummary: array of wordInfo, where wordInfo is an object with two properties: wordLength, wasCorrect
        }
    */
    getGameInfo() {
        return {
            over: this.isOver(),
            extraSteps: this.partialSolution.totalPenalty(),
            gameSummary: this.partialSolution.getPlayedWords().map((playedWord)=>new Object({wordLength: playedWord.word.length, wasCorrect: playedWord.penalty==0})),
        }
    }

    getNextDisplayInstruction() {
        console.log("played so far: " + this.partialSolution.toStr());
        console.log("known solution as played: " + this.fullSolutionGivenProgress.toStr());

        // after displaying all the words in the full solution, return null to stop the calling loop 
        let highestIndex = this.fullSolutionGivenProgress.numSteps(); 
        if (this.wordToDisplayIndex > highestIndex ) {
            this.wordToDisplayIndex = 0;
            return null;
        }

        let displayInstruction = null;
        let lastWordPlayedIndex = this.partialSolution.numSteps();
        let wordBeingDisplayed = this.fullSolutionGivenProgress.getNthWord(this.wordToDisplayIndex);
        let penalty = 0;
        if (this.wordToDisplayIndex <= lastWordPlayedIndex) {
            penalty = this.partialSolution.getNthPenalty(this.wordToDisplayIndex);
        }
        let correct = (penalty == 0);
        const userClickedPlus = this.userJustClickedPlus;
        console.log(`get display instruction for word number: ${this.wordToDisplayIndex} which is: ${wordBeingDisplayed}`);
        if (this.wordToDisplayIndex < lastWordPlayedIndex) {
            // just display the whole word as it has already been played.  
            displayInstruction = new DisplayInstruction(wordBeingDisplayed, Const.PLAYED, 0, correct, penalty);
        } else if (this.wordToDisplayIndex == highestIndex) {
            displayInstruction = new DisplayInstruction(this.fullSolutionGivenProgress.getTarget(), Const.TARGET, 0, correct, penalty);
        } else if (this.wordToDisplayIndex == lastWordPlayedIndex) {
            // we are displaying the last played word, which includes instructions on how to get to the next word:
            let nextWord = this.fullSolutionGivenProgress.getNthWord(lastWordPlayedIndex + 1);
            if (userClickedPlus) {
                // the last word played is the word with a hole, and the next word is that same word without the hole.
                wordBeingDisplayed = this.partialSolution.getNthWord(lastWordPlayedIndex);
                nextWord = this.fullSolutionGivenProgress.getNthWord(lastWordPlayedIndex);
            }
            displayInstruction = this.displayInstructionForPlayingFromWordToWord(wordBeingDisplayed, nextWord, penalty);
        } else {
            // we are displaying some word later than the currently active word, but not the taget.
            displayInstruction = new DisplayInstruction(wordBeingDisplayed, Const.FUTURE, 0, correct, penalty);
        }
        this.wordToDisplayIndex += 1;
        console.log(`the display instruction is${displayInstruction.toStr()}`);
        return displayInstruction;
    }

    // how to display the last word that needs to be changed to give the next word.
    displayInstructionForPlayingFromWordToWord(lastWordPlayed, nextWord, penalty) {
        const correct = (penalty == 0);
        if (nextWord.length == lastWordPlayed.length) {
            // which letter changed?
            let changedCharIndex = -1;
            for (let i=0; i<lastWordPlayed.length; i++) {
                if (nextWord[i] != lastWordPlayed[i]) {
                    changedCharIndex = i;
                    break;
                }
            }
            if (changedCharIndex == -1) {
                throw new Error(`${nextWord} and ${lastWordPlayed} should differ by one letter but don't`);
            }
            return new DisplayInstruction(lastWordPlayed, Const.CHANGE, changedCharIndex+1, correct, penalty);
        } else if (nextWord.length == lastWordPlayed.length+1) {
            // we display '+'s to let the user add a space
            return new DisplayInstruction(lastWordPlayed, Const.ADD, 0, correct, penalty);
        } else if (nextWord.length == lastWordPlayed.length-1) {
            return new DisplayInstruction(lastWordPlayed, Const.DELETE, 0, correct, penalty);
        } else {
            throw new Error(`${nextWord} and ${lastWordPlayed} have more than 1 letter length difference.`);
        }
    }
    // Return true if game is over; false otherwise.
    isOver() {
        //TODO - const or calculation for max number of extra steps allowed.
        return this.partialSolution.isSolved() || this.partialSolution.totalPenalty() >= Const.TOO_MANY_EXTRA_STEPS;
    }

    addWordIfExists(word) {
        if (this.dictionary.isWord(word)) {
            let currentSolutionLength = this.fullSolutionGivenProgress.numSteps();;
            let partialSolutionWithNewWord = this.partialSolution.copy();
            let penalty = 0;
            partialSolutionWithNewWord.addWord(word, penalty);
            this.fullSolutionGivenProgress = Solver.resolve(this.dictionary, partialSolutionWithNewWord);
            let newSolutionLength = this.fullSolutionGivenProgress.numSteps();;
            penalty = newSolutionLength - currentSolutionLength;
            this.partialSolution.addWord(word,  penalty);
            console.log(`After adding ${word} the partial solution is: ${this.partialSolution.toStr()}`);
            return Const.OK;
        } else {
            return Const.NOT_A_WORD
        }
    }


    // addPosition is from 0 to last word played's length
    // This adds a word-with-a-hole-in-it to the partial solution.
    // Then, when displaying the last word given (the action word)
    // it should have n+1 letters, one of which is ' '.  And it should
    // be compared to the solution at the same place.
    // returns true if no error
    // returns null on error (e.g. unexpected position)
    playAdd(addPosition) {
        console.log("playAdd(): addPosition:", addPosition);
        let oldWord = this.partialSolution.getLastWord();
        if ((addPosition < 0) || (addPosition > this.partialSolution.getLastWord().length)) {
            return Const.BAD_LETTER_POSITION;
        }
        this.userJustClickedPlus = true;
        // We put in a blank for where the letter hole is.
        let newWord = oldWord.substring(0,addPosition) + " " + oldWord.substring(addPosition);
        this.partialSolution.addWord(newWord);
        return Const.OK;
    }

    // deletePosition is 1 to word.length
    // returns true if resulting word is in dictionary; false otherwise
    // returns null on other error (e.g. unexpected position)
    playDelete(deletePosition) {
        let oldWord = this.partialSolution.getLastWord();
        console.log("playDelete(): deletePosition:", deletePosition, " in: ", oldWord);
        // adjust to zero-based
        deletePosition -= 1;
        if ((deletePosition < 0) || (deletePosition >= oldWord.length)) {
            console.log("bad adjusted delete position", deletePosition)
        }
        let newWord = oldWord.substring(0,deletePosition) + oldWord.substring(deletePosition+1);
        return this.addWordIfExists(newWord);
    }

    // letterPosition is 0 to word.length-1
    // returns true if resulting word is in dictionary; false otherwise
    // returns null on other error (e.g. unexpected position)
    playLetter(letterPosition, letter) {
        console.log("playLetter(): letterPosition:", letterPosition, ", letter:", letter);
        console.log("solution so far is: ", this.partialSolution.toStr());
        letterPosition -= 1;
        let oldWord = this.partialSolution.getLastWord();
        let newWord = oldWord.substring(0,letterPosition) + letter + oldWord.substring(letterPosition+1);
        if (this.userJustClickedPlus) {
            this.partialSolution.removeLastWord();
            this.userJustClickedPlus = false;
        }
        console.log("playLetter(): new word is: ", newWord);
        return this.addWordIfExists(newWord)
    }

    // Return true if the game has been won; false otherwise.
    // If over() would return false this should return false.
    isWinner() {
        console.log("winner() - returning", this.partialSolution.isSolved());
        return this.partialSolution.isSolved();
    }
}

export { Game };
