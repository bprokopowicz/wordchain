import { DisplayInstruction } from './DisplayInstruction.js';
import { Solver, Solution, SolutionStep} from './Solver.js';
import { WordChainDict } from './WordChainDict.js';
import * as Const from './Const.js';
import { BaseLogger } from './BaseLogger.js';


// DisplayInstruction properties:
//
// word:           empty string for future
// displayType:    add, addChange, delete, change, future, played, target
// changePosition: not relevant for played or target
// wasCorrect:     not relevant for future


class Game extends BaseLogger {

    // stepsOfSolution is a list of tuples of (word, wasPlayed, isCorrect).
    // This needs to be converted to a list of SolutionStep objects
    // We maintain the played steps [start, word1, word2], target
    // and the remaining steps to target  [word3, word4, ...], target

    // TODO - optionally pass in the dictionary, for testing
    constructor(startWord, targetWord, stepsOfSolution, dict=new WordChainDict()) {
        super();
        this.logDebug("constructor(): startWord:", startWord, ", targetWord:", targetWord, "game");
        startWord = startWord.toUpperCase();
        targetWord = targetWord.toUpperCase();
        this.dictionary = dict;
        if (stepsOfSolution.length == 0) {
            this.logDebug("Constructing game from beginning", "game");
            this.playedSteps = Solution.newEmptySolution(startWord, targetWord);
            this.remainingSteps = Solver.solve(this.dictionary, startWord, targetWord);
            // remove the start word from the remaining steps.
            this.remainingSteps.removeFirstStep();
        } else {
            // we have a list of all the words, as tuples (word, wasPlayed, isCorrect)
            this.logDebug(`Re-constructing game from existing steps: ${stepsOfSolution.join()}`, "game");
            let justThePlayedSteps = stepsOfSolution.filter((tup)=>tup[1]).map((tup)=> new SolutionStep(tup[0], tup[1], tup[2]));
            this.playedSteps = new Solution(justThePlayedSteps, targetWord);

            let justTheUnplayedSteps = stepsOfSolution.filter((tup)=>!tup[1]).map((tup)=> new SolutionStep(tup[0], tup[1], tup[2]));
            this.remainingSteps = new Solution(justTheUnplayedSteps, targetWord);

        }
        this.logDebug("Game constructed: played steps: ", this.playedSteps.toStr(), "game");
        this.logDebug("Game constructed: remaining steps: ", this.remainingSteps.toStr(), "game");
    }


    // Choose a random start/target that has a solution between
    // Const.PRACTICE_STEPS_MINIMUM and Const.PRACTICE_STEPS_MAXIMUM
    // steps. Returns an array: [startWord, targetWord].
    static getPracticePuzzle() {
        let min = 0;
        let max = Const.PRACTICE_START_WORDS.length;
        let rand = Math.floor(Math.random() * max); // 0..max-1 inclusive
        let dictionary = new WordChainDict();
        let logger = new BaseLogger();

        let startWord = Const.PRACTICE_START_WORDS[rand];
        let puzzles = Solver.findPuzzles(dictionary, startWord,
              Const.PRACTICE_MAX_SHORTEST_WORD, Const.PRACTICE_MIN_LONGEST_WORD,
              Const.PRACTICE_STEPS_MINIMUM, Const.PRACTICE_STEPS_MAXIMUM,
              Const.PRACTICE_DIFFICULTY_MINIMUM);
        
        rand = Math.floor(Math.random() * puzzles.length); 
        logger.logDebug(`found ${puzzles.length} puzzles starting with ${startWord}.  Choosing #${rand}`, "game");
        let puzzle = puzzles[rand];
        logger.logDebug("selected random puzzle: " + puzzle.toStr(), "game");

        return [puzzle.getStart(), puzzle.getLastWord()];
        return ["dog", "bite"];
    }

    // Finishes the game. When getNextDisplayInstruction() is called after this,
    // the game can be displayed just the same as if a user finished with all
    // correct moves.
    finishGame() {
        // play the remaining steps for the user
        let isPlayed = true;
        let isCorrect = true;
        for (let step of this.remainingSteps) {
            this.playedSteps.addWord(step.word, isPlayed, isCorrect);
        }
    }

    // returns a list to display all the steps of the puzzle. 
    getDisplayInstructions() {
        this.logDebug("played so far: " + this.playedSteps.toStr(), "game");
        this.logDebug("remaining unplayed: " + this.remainingSteps.toStr(), "game");

        let instructions = [];

        // all the played words except the last one (the active one)
        // This includes the start word if other words have been played.
        // But if only the start word is played, it appears as the active word, next.
        for (let i = 0; i < this.playedSteps.numSteps(); i++) {
            instructions.push(this.instructionForPlayedWord(i));
        }

        // now the active word if still working
        if (! this.playedSteps.isSolved()) {
            instructions.push(this.instructionForLastPlayedWord());
        }

        // now the remaining words, if any, except the target
        for (let i = 0; i < this.remainingSteps.numSteps(); i++) {
            instructions.push(this.instructionForFutureWord(i));
        }

        // now the target
        instructions.push(this.instructionForTargetWord());
    
        this.logDebug(`display instructions: ${instructions.map((instruction)=>instruction.toStr()).join()}`, "game");
        return instructions;
    }

    instructionForPlayedWord(stepIndex) {
        let solutionStep = this.playedSteps.solutionSteps[stepIndex];
        let changePosition = -1;
        return new DisplayInstruction(solutionStep.word, Const.PLAYED, changePosition, solutionStep.isCorrect);
    }

    instructionForFutureWord(stepIndex) {
        // we show hints in the future words that require a single letter-change to the next word
        // the step index needs to be adjusted to account for the unplayed steps 
        let futureWord = this.remainingSteps.getNthWord(stepIndex);
        let nextFutureWord = this.remainingSteps.getNthWord(stepIndex+1);
        let isCorrect = true;
        let displayInstruction = this.displayInstructionForPlayingFromWordToWord(futureWord, nextFutureWord, isCorrect);
        displayInstruction.displayType = Const.FUTURE;
        return displayInstruction;
    }

    instructionForLastPlayedWord() {
        // we are displaying the last played word, which is the active word.  We give instructions for
        // how to go from that word to the first word in the remaining steps.
        let stepIndex = this.playedSteps.numSteps();
        let lastPlayedStep = this.playedSteps.solutionSteps[stepIndex];
        let lastWord = lastPlayedStep.word;  // the string itself
        let isCorrect = lastPlayedStep.isCorrect;
        if (Game.wordHasHole(lastWord)) {
            // after user clicks plus somewhere, the list of played words includes the last word played with a hole
            // in it where the user clicked '+'.  This word with a hole is what we will return to the display to show.
            // the last word in the played list is the word with a hole
            let indexOfHole = Game.locationOfHole(lastWord);
            return new DisplayInstruction(lastWord, Const.CHANGE, indexOfHole+1, isCorrect);
        } else {
            let nextWord = this.remainingSteps.getNthWord(0);
            return this.displayInstructionForPlayingFromWordToWord(lastWord, nextWord, isCorrect);
        }
    }

    // this method is for displaying the actual, given target unconditionally.  
    instructionForTargetWord() {
        let targetWord = this.remainingSteps.getTarget();
        let isCorrect = true;
        let changePosition=-1;
        return new DisplayInstruction(targetWord, Const.TARGET, changePosition, isCorrect);
    }

    // how to display the last word that needs to be changed to give the next word.
    displayInstructionForPlayingFromWordToWord(lastWordPlayed, nextWord, lastWordIsCorrect) {
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
            return new DisplayInstruction(lastWordPlayed, Const.CHANGE, changedCharIndex+1, lastWordIsCorrect);
        } else if (nextWord.length == lastWordPlayed.length+1) {
            // we display '+'s to let the user add a hole
            return new DisplayInstruction(lastWordPlayed, Const.ADD, 0, lastWordIsCorrect);
        } else if (nextWord.length == lastWordPlayed.length-1) {
            // we display '-'s to let the user delete a letter 
            return new DisplayInstruction(lastWordPlayed, Const.DELETE, 0, lastWordIsCorrect);
        } else {
            throw new Error(`${nextWord} and ${lastWordPlayed} have more than 1 letter length difference.`);
        }
    }

    // Return true if game is over; false otherwise.
    isOver() {
        return this.playedSteps.isSolved() || this.playedSteps.wrongMoves() >= Const.TOO_MANY_WRONG_MOVES;
    }

    // when you add a word
    // 1) solve from played word to target, using full dictionary.  This gives the remaining steps
    // 2) if the new remaining steps' length is one less than the current remaining steps, then step is correct
    // 3) add the new step (correct or not) as played to the list of played steps..
    // 4) replace the remaining steps list with the newly calculated list.
    addWordIfExists(word) {
        if (this.dictionary.isWord(word)) {
            if (word == this.remainingSteps.getNthWord(0)) {
                // user is adding the same word we found
                let isPlayed = true;
                let isCorrect = true; 
                this.playedSteps.addWord(word, isPlayed, isCorrect);
                this.remainingSteps.removeFirstStep();
                return Const.OK;
            }
            // user added an unexpected word.
            // re-solve the puzzle given new word and see if the solution grew (mistake) or not (correct).
            let nCurrentRemainingSteps = this.remainingSteps.numSteps();
            let newRemainingSteps = Solver.solve(this.dictionary, word, this.remainingSteps.getTarget());
            newRemainingSteps.removeFirstStep();
            let isPlayed = true;
            let isCorrect = (newRemainingSteps.numSteps() == (nCurrentRemainingSteps-1)); 
            this.remainingSteps = newRemainingSteps;
            this.playedSteps.addWord(word, isPlayed, isCorrect);
            this.logDebug(`After adding ${word} the played steps are: ${this.playedSteps.toStr()}`, "game");
            this.logDebug(`After adding ${word} the remaining steps are: ${this.remainingSteps.toStr()}`, "game");
            if (isCorrect) {
                return Const.OK;
                } else {
                return Const.WRONG_MOVE;
            }
        } else {
            return Const.NOT_A_WORD;
        }
    }

    static HOLE() {return "?";}

    static locationOfHole(word) {
        return word.indexOf(Game.HOLE());
    }

    static wordHasHole(word) {
        return Game.locationOfHole(word) >= 0;
    }
    
    // addPosition is from 0 to last word played's length
    // This adds a word-with-a-hole-in-it to the played steps so far.
    // Then, when displaying the last word given (the action word)
    // it should have n+1 letters, one of which is the HOLE character.  And it should
    // be compared to first remaining step 
    // returns true if no error
    // returns null on error (e.g. unexpected position)
    playAdd(addPosition) {
        this.logDebug("playAdd(): addPosition:", addPosition, "game");
        let oldWord = this.playedSteps.getLastWord();
        if ((addPosition < 0) || (addPosition > oldWord.length)) {
            return Const.BAD_LETTER_POSITION;
        }
        // We put in a blank for where the letter hole is.
        let newWord = oldWord.substring(0,addPosition) + Game.HOLE() + oldWord.substring(addPosition);
        let isPlayed = true;
        let isCorrect = true;
        this.playedSteps.addWord(newWord, isPlayed, isCorrect);
        return Const.OK;
    }

    // deletePosition is 1 to word.length
    // returns true if resulting word is in dictionary; false otherwise
    // returns null on other error (e.g. unexpected position)
    playDelete(deletePosition) {
        let oldWord = this.playedSteps.getLastWord();
        this.logDebug("playDelete(): deletePosition:", deletePosition, " in: ", oldWord, "game");
        // adjust to zero-based
        deletePosition -= 1;
        if ((deletePosition < 0) || (deletePosition >= oldWord.length)) {
            this.logDebug("bad adjusted delete position", deletePosition, "game")
            return Const.BAD_POSITION;
        }
        let newWord = oldWord.substring(0,deletePosition) + oldWord.substring(deletePosition+1);
        return this.addWordIfExists(newWord);
    }

    // letterPosition given is 1 to word.length
    // returns true if resulting word is in dictionary; false otherwise
    // returns null on other error (e.g. unexpected position)
    playLetter(letterPosition, letter) {
        this.logDebug("playLetter(): letterPosition:", letterPosition, ", letter:", letter, "game");
        this.logDebug("steps played: ", this.playedSteps.toStr(), "game");
        letterPosition -= 1;
        let oldWord = this.playedSteps.getLastWord();
        let newWord = oldWord.substring(0,letterPosition) + letter + oldWord.substring(letterPosition+1);
        if (Game.wordHasHole(oldWord)) {
            this.playedSteps.removeLastStep(); // it will be replaced by the same word without the hole, below.
        }
        this.logDebug("playLetter(): new word is: ", newWord, "game");
        return this.addWordIfExists(newWord)
    }

    // Return true if the game has been won; false otherwise.
    // If over() would return false this should return false.
    isWinner() {
        this.logDebug("winner() - returning", this.playedSteps.isSolved(), "game");
        return this.playedSteps.isSolved();
    }
}

export { Game };
