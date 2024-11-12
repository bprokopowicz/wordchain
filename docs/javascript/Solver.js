import { BaseLogger } from './BaseLogger.js';
import * as Const from './Const.js';


// This class tries to find a word chain from a "from word" to a "to word",
// which is returned as a Solution object.
//
class Solver {

   static logger = new BaseLogger();

   static solve(dictionary, fromWord, toWord) {
        Const.GL_DEBUG && Solver.logger.logDebug("solve:", fromWord, toWord, "solver");
        fromWord = fromWord.toUpperCase();
        toWord = toWord.toUpperCase();
        let startingSolution = Solution.newEmptySolution(fromWord, toWord);
        /*
        if (! dictionary.isWord(fromWord)){
            startingSolution.addError(fromWord + " is not a word.");
        }
        */
        if (startingSolution.getError()){
            return startingSolution;
        }
        let solution = Solver.finish(dictionary, startingSolution);
        Const.GL_DEBUG && Solver.logger.logDebug("solve() finished:", "solver");
        return solution;
    }

    static finish(dictionary, startingSolution) {

        if (startingSolution.isSolved()) {
            return startingSolution;
        }

        // Create a queue for our working solutions and push this starting working solution on the queue.
        let workingSolutions = [];
        workingSolutions.push(startingSolution);

        // use a temp dictionary which can be depleted as it is searched
        let workingDict = dictionary.copy();
        let solution = null;
        let longestSolution = 0;
        let loopCount = 0;
        let startTime = Date.now();
        while (workingSolutions.length > 0) {
            // Get the next partial solution from the heap; we'll add working solutions based on this
            let solution = workingSolutions.shift();
            if (solution.numSteps() > longestSolution) {
                longestSolution = solution.numSteps();
                Const.GL_DEBUG && Solver.logger.logDebug("loopCount: ", loopCount, ": longestSolution: ", longestSolution, "solver-details");
                Const.GL_DEBUG && Solver.logger.logDebug("loopCount: ", loopCount, ": search size: ", workingSolutions.length, "solver-details");
            }

            // Find all possible "next words" from the last word in the solution so far.
            let lastWord  = solution.getLastWord();
            let nextWords = workingDict.findNextWords(lastWord);

            for (let word of nextWords) {
                workingDict.removeWord(word);
                let moveRating = Const.OK;
                let isPlayed = false;
                let newWorkingSolution = solution.copy().addWord(word, isPlayed, moveRating);
                Const.GL_DEBUG && Solver.logger.logDebug("   checking ", newWorkingSolution, "solver-details");
                if (newWorkingSolution.isSolved()) {
                    return newWorkingSolution;
                }
                Const.GL_DEBUG && Solver.logger.logDebug("   adding ", newWorkingSolution, "solver-details");
                workingSolutions.push(newWorkingSolution);
            }

            // Every 1000 iterations check whether we are taking too long.
            loopCount += 1;
            if (loopCount % 1000 === 0) {
                // Date.now() returns milliseconds; if this is taking more than 15 seconds
                // just assume there is no solution. Kind of a kludge, but ... ain't nobody
                // got time to wait more than 15 seconds.
                if (Date.now() - startTime > 15000) {
                    Const.GL_DEBUG && Solver.logger.logDebug("it's taking too long to solve ", startingSolution, "! loopCount: ", loopCount, "solver");
                    solution.addError("No solution within a reasonable time");
                    return solution;
                }
                Const.GL_DEBUG && Solver.logger.logDebug("loopCount: ", loopCount, ": size: ", workingSolutions.length, "solver-details");
            }

        }

        startingSolution.addError("No solution");
        return startingSolution;
    }

    static findPuzzles(dict, startWord, targetWordLen, wordLen1, wordLen2, minWords, maxWords,  minDifficulty, minChoicesPerStep) {

        startWord = startWord.toUpperCase();
        Const.GL_DEBUG && Solver.logger.logDebug("looking for puzzles starting with ", startWord, " ending with a ", targetWordLen, "-length word", "solver");
        let localDictionary = dict.copy();
        let desiredPuzzles = [];
        if (!localDictionary.isWord(startWord)) {
            Const.GL_DEBUG && Solver.logger.logDebug(startWord + " is not a word.", "solver");
            return desiredPuzzles;
        }
        // search forever until all suitable puzzles are found
        let firstPuzzle = Solution.newEmptySolution(startWord, "dummy-end");
        let listOfPossiblePuzzles =[]; 
        listOfPossiblePuzzles.push(firstPuzzle);
        while (listOfPossiblePuzzles.length > 0) {
            let puzzle = listOfPossiblePuzzles.shift();
            Const.GL_DEBUG && Solver.logger.logDebug("looking at puzzle ", puzzle, "solver-details");
            puzzle.target=puzzle.getLastWord();
            // must use dict, not local copy, since we are deleting words as we search the tree of solutions
            if (Solver.isDesired(dict, puzzle, targetWordLen, wordLen1, wordLen2, minWords, maxWords, minDifficulty, minChoicesPerStep)) {
	            Const.GL_DEBUG && Solver.logger.logDebug("found suitable puzzle ", puzzle, "solver");
                desiredPuzzles.push(puzzle);
            }
            // keep looking if not too long already
            if (puzzle.numWords() < maxWords) {
                let nextWords = localDictionary.findNextWords(puzzle.getLastWord());
                for (let nextWord of nextWords) {
                    localDictionary.removeWord(nextWord);
                    let newPuzzle = puzzle.copy();
                    let moveRating = Const.OK;
                    let isPlayed = false;
                    newPuzzle.addWord(nextWord, isPlayed, moveRating);
                    listOfPossiblePuzzles.push(newPuzzle);
                }
           }
       }
       return desiredPuzzles;
    }

    static isDesired(dictionary, puzzle, targetWordLen, wordLen1, wordLen2, minWords, maxWords, minDifficulty, minChoices) {
        if (puzzle.numWords() < minWords) {
            return false;
        }
        if (puzzle.numWords() > maxWords) {
            return false;
        }
        if ((targetWordLen > 0) && (puzzle.getTarget().length != targetWordLen)) {
            return false;
        }
        if (!puzzle.hasWordOfLength(wordLen1)) {
            return false;
        }
        if (!puzzle.hasWordOfLength(wordLen2)) {
            return false;
        }
        puzzle.calculateDifficulty(dictionary);
        if (puzzle.difficulty < minDifficulty) {
            return false;
        }
        if (puzzle.nChoicesEasiestStep < minChoices) {
            return false;
        }
        return true;
    }
}

class SolutionStep {
    constructor(word, isPlayed, moveRating) {
        this.word = word;
        this.isPlayed = isPlayed;
        this.moveRating = moveRating;
    }

    toString() {
        return `${this.word} played:${this.isPlayed}, moveRating:${this.moveRating}`;
    }

    wordLength() {
        return this.word.length;
    }

}

class Solution extends BaseLogger {
    constructor(solutionSteps, target) {
        super();
        this.solutionSteps = solutionSteps;
        this.target = target;
        this.errorMessage = "";
        // call calculateDifficulty(dictionary) to set these three fields:
        this.difficulty = -1;  
        this.nChoicesEasiestStep = 1000;
        this.nChoicesOnStep = new Array();
    }

    static newEmptySolution(start, target) {
        let moveRating = Const.OK;
        let isPlayed = true;
        let solutionStep = new SolutionStep(start, isPlayed, moveRating);
        return new Solution([solutionStep], target);
    }

    addError(errorMessage) {
        this.errorMessage += errorMessage;
        return this;
    }

    addWord(newWord, isPlayed, moveRating) {
        this.solutionSteps.push(new SolutionStep(newWord, isPlayed, moveRating));
        return this;
    }


    numWrongMoves() {
        return this.solutionSteps.filter((solutionStep)=>solutionStep.moveRating == Const.WRONG_MOVE).length;
    }

    findChangedLetterLocation(word1, word2) {
        for (let i=0; i < word1.length; i++) {
            if (word1[i] != word2[i]) {
                return i;
            }
        }
        console.error("can't find difference between ", word1, " and ", word2);
        return -1;
    }

    // side effect: sets this.difficulty, this.nChoicesEasiestStep, and this.nChoicesOnStep (array)
    // Difficulty is the number of choices encountered at each step of the actual solution.
    // The number of choices depends on the dictionary and also on how the next step of the puzzle is
    // displayed.  As of Oct 2024, the user knows either which letter to replace, or that a letter needs
    // to be added, or removed.  We don't consider replaying an existing word of the solution so far to be
    // a choice.
    // the last step is not included in the difficulty total, because it is obvious even if there are many other
    // possibilities
    calculateDifficulty(dictionary) {
        let i = 0;
        // these three fields will be updated as we travel the solution
        this.difficulty = 0;
        this.nChoicesEasiestStep = 1000;
        this.nChoicesOnStep = new Array();
        // difficulty is defined by choices between successive words.  We don't include 
        // the choices at the last step since in effect there is only one obvious choice, the target.
        while (i < this.numWords() - 2) {
            let thisWord = this.getNthWord(i)
            let nextWord = this.getNthWord(i+1)
            let replacementWords = new Set();
            if (thisWord.length == nextWord.length) {
                // we tell the user which letter location to change, so only the changes of that 
                // location should count towards difficulty
                replacementWords = dictionary.findReplacementWords(thisWord);
                let loc = this.findChangedLetterLocation(thisWord, nextWord);
                if (loc >= 0) {
                    // remove any possible replacements that have the same letter at the replacement location.
                    for (const replacementWord of replacementWords) {
                        if (thisWord[loc] == replacementWord[loc]) {
                            // this replacement word doesn't differ at the known replacement point.
                            replacementWords.delete(replacementWord);
                        }
                    }
                } else {
                    console.error("can't find location of changed letter from ", thisWord, " to ", nextWord);
                }
            } else if (thisWord.length > nextWord.length ){
                replacementWords = dictionary.findRemoverWords(thisWord);
            } else {
                replacementWords = dictionary.findAdderWords(thisWord);
            }
            // now, remove any already played words from the replacement choices.

            for (let j=0; j<i; j++) {
                replacementWords.delete(this.getNthWord(j));
            }
            let nChoicesThisStep = replacementWords.size;
            this.nChoicesOnStep.push(nChoicesThisStep);
            this.difficulty += nChoicesThisStep;
            if (nChoicesThisStep < this.nChoicesEasiestStep) {
                this.nChoicesEasiestStep = nChoicesThisStep;
            }
            i+=1;
        }
        Const.GL_DEBUG && Solver.logger.logDebug("easiest step has ", this.nChoicesEasiestStep, " choices.", "solver");
    }

    copy() {
        let solutionStepsCopy = [...this.solutionSteps];
        return new Solution(solutionStepsCopy, this.getTarget());
    }

    getError() {
        return this.errorMessage;
    }

    getNthWord(n) {
        return this.solutionSteps[n].word;
    }

    getLastWord() {
        return this.getNthWord(this.solutionSteps.length - 1);
    }
    
    // use case: removing a step containing a word with a hole before replacing it with 
    // the word without the hole.
    removeLastStep() {
        this.solutionSteps.pop();
    }

    // use case: when resolving from played word to target, that solution includes the played word as 
    // its first word.  
    removeFirstStep() {
        this.solutionSteps.shift();
    }

    removeAllSteps() {
        this.solutionSteps = [];
    }

    getPenultimateWord() {
        if (this.solutionSteps.length < 2) {
            throw new Error(`Solution.getPenultimateWord(): solutionSteps length (${this.solutionSteps.length}) cannot be < 2`)
        }
        return this.getNthWord(this.solutionSteps.length - 2);
    }

    getStart() {
        return this.getNthWord(0);
    }

    getTarget() {
        return this.target;
    }

    isSolved() {
        return this.success() && (this.target === this.getLastWord());
    }

    // the number of "steps" taken in this solution.  The first word is a given and doesn't
    // count as a step.

    numSteps() {
        return this.numWords() - 1;
    }

    numWords() {
        return this.solutionSteps.length;
    }

    getSolutionSteps() {
        return this.solutionSteps;
    }

    getSolutionWords() {
        return this.solutionSteps.map((step)=>step.word);
    }

    hasWordOfLength(len) {
        for (let word of this.getSolutionWords()) {
            if (word.length == len) {
                return true;
            }
        }
        return false;
    }
        
    shortestWordLen() {
        let shortestLen = 1000;
        for (let word of this.getSolutionWords()) {
            if (word.length < shortestLen) {
                shortestLen = word.length;
            }
        }
        return shortestLen;
    }

    longestWordLen() {
        let longestLen = 0;
        for (let word of this.getSolutionWords()) {
            if (word.length > longestLen) {
                longestLen = word.length;
            }
        }
        return longestLen;
    }

    success() {
        return this.errorMessage.length === 0;
    }

    // This method is used in the test suite.
    toHtml() {
        return this.toStr(true);
    }

    // This method is here to help with debugging.
    toStr(toHtml=false) {
        if (this.errorMessage.length !== 0) {
            return this.errorMessage;
        } else if (toHtml) {
            // display the words and the choice stats
            return this.solutionSteps.map(step => step.word).join(", ") 
                + " difficulty: " +  this.difficulty 
                + " choices at each step: " + this.nChoicesOnStep.join(",");
        } else {
            // display the words and details about the step (correct, played)
            const separator = " ";
            const words = this.solutionSteps.join(", ");
            return `${words}${separator}[${this.numSteps()} steps toward ${this.target}]${separator}difficulty: ${this.difficulty}`;
        }
    }
}

export { Solver, Solution, SolutionStep };
