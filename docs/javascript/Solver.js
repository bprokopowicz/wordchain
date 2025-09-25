import { BaseLogger } from './BaseLogger.js';
import { COV, isCoverageOn } from './Coverage.js';
import * as Const from './Const.js';


// This class tries to find a word chain from a "from word" to a "to word",
// which is returned as a Solution object.
//
// COV coverage is not complete, because it is too slow in the search code
// and that slows down many tests that depend on either solutions or finding
// practice games.
//
class Solver {

   static logger = new BaseLogger();

   static solve(dictionary, fromWord, toWord) {
        const CL = "Solver.solve";
        COV(0, CL);
        Const.GL_DEBUG && Solver.logger.logDebug("solve:", fromWord, toWord, "solver");
        fromWord = fromWord.toUpperCase();
        toWord = toWord.toUpperCase();
        let startingSolution = Solution.newEmptySolution(fromWord, toWord);
        let result =  Solver.finish(dictionary, startingSolution);
        Const.GL_DEBUG && Solver.logger.logDebug("solve() finished:", "solver");

        return result;
    }

    static finish(dictionary, startingSolution) {
        const CL = "Solver.finish";
        COV(0, CL);

        if (startingSolution.isSolved()) {
            COV(1, CL);
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

            // Find all possible "next words" from the last word in the solution so far.
            let lastWord  = solution.getLastWord();
            let nextWords = workingDict.findNextWords(lastWord);

            for (let word of nextWords) {
                workingDict.removeWord(word);
                let moveRating = Const.GOOD_MOVE;
                let isPlayed = false;
                let newWorkingSolution = solution.copy().addWord(word, isPlayed, moveRating);
                Const.GL_DEBUG && Solver.logger.logDebug("   checking ", newWorkingSolution, "solver-details");
                if (newWorkingSolution.isSolved()) {
                    return newWorkingSolution;
                }
                Const.GL_DEBUG && Solver.logger.logDebug("   adding ", newWorkingSolution, "solver-details");
                workingSolutions.push(newWorkingSolution);
            }

            // this is a time-limit check on the solver to prevent it from taking too long.  If code coverage
            // is enabled, we don't limit the time, because it can take very long for valid tests to finish.

            if (!isCoverageOn()) {
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

        }
        COV(2, CL);
        startingSolution.addError("No solution");
        return startingSolution;
    }

    static findPuzzles(dict, startWord, targetWordLen, wordLen1, wordLen2, minWords, maxWords,  minDifficulty, minChoicesPerStep) {
        const CL = "Solver.findPuzzles";
        COV(0, CL);
        startWord = startWord.toUpperCase();
        Const.GL_DEBUG && Solver.logger.logDebug("looking for puzzles starting with ", startWord,
        "ending with a", targetWordLen, "-length word", "solver");
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
                COV(1, CL);
                Const.GL_DEBUG && Solver.logger.logDebug("found suitable puzzle ", puzzle, "solver");
                desiredPuzzles.push(puzzle);
            }
            // keep looking if not too long already
            if (puzzle.numWords() < maxWords) {
                COV(2, CL);
                let nextWords = localDictionary.findNextWords(puzzle.getLastWord());
                for (let nextWord of nextWords) {
                    localDictionary.removeWord(nextWord);
                    let newPuzzle = puzzle.copy();
                    let moveRating = Const.GOOD_MOVE;
                    let isPlayed = false;
                    newPuzzle.addWord(nextWord, isPlayed, moveRating);
                    listOfPossiblePuzzles.push(newPuzzle);
                }
           }
        }
        COV(3, CL);
        return desiredPuzzles;
    }

    static isDesired(dictionary, puzzle, targetWordLen, wordLen1, wordLen2, minWords, maxWords, minDifficulty, minChoices) {
        const CL = "Solver.isDesired";
        COV(0, CL);
        if (puzzle.numWords() < minWords) {
            COV(1, CL);
            return false;
        }
        if (puzzle.numWords() > maxWords) {
            // this should be impossible, because the search stops at maxWords, so we don't include it in coverage.
            console.error("unexpected error - puzzle found has too many words");
            return false;
        }
        if ((targetWordLen > 0) && (puzzle.getTarget().length != targetWordLen)) {
            COV(2, CL);
            return false;
        }
        if (!puzzle.hasWordOfLength(wordLen1)) {
            COV(3, CL);
            return false;
        }
        if (!puzzle.hasWordOfLength(wordLen2)) {
            COV(4, CL);
            return false;
        }
        puzzle.calculateDifficulty(dictionary);
        if (puzzle.difficulty < minDifficulty) {
            COV(5, CL);
            return false;
        }
        if (puzzle.nChoicesEasiestStep < minChoices) {
            COV(6, CL);
            return false;
        }
        if (puzzle.nChoicesFromTarget < minChoices) {
            COV(7, CL);
            return false;
        }
        COV(8, CL);
        return true;
    }

    // a utility function to determine how to get from word A to word B in one step,
    // if it's possible.
    // Returns:
    //   [action, position, letter]:
    //       action = CHANGE,ADD, or DELETE
    //       position = 0-based letter index to change, delete, or insert (after).  Uses 0 for insert before the first letter
    //       letter = the letter to change to or insert.  Not used on DELETE actions
    //   null:
    //       if you can't get from a to b in one operation

    static getTransformationStep(wordA, wordB) {
        const CL = "Solver.getTransformationStep";
        COV(0, CL);
        if (wordA.length === wordB.length) {
            COV(1, CL);
            let mismatchIndex = -1; // indicates no mismatch found
            for (let i = 0; i < wordA.length; i++) {
                if (wordA[i] != wordB[i]) {
                    COV(2, CL);
                    if (wordA.substr(i+1) === wordB.substr(i+1)) {
                        // rest of strings past i match.
                        COV(3, CL);
                        return [Const.CHANGE, i, wordB[i]]; 
                    } else {
                        COV(4, CL);
                        return null; // there are two or more mismatches
                    }
                }
            }
            // words are the same - this is an error
            COV(5, CL);
            return null;
        } else if (wordA.length === wordB.length + 1) {
            // wordA is longer
            COV(6, CL);
            for (let i = 0; i < wordB.length; i++) {
                if (wordA[i] != wordB[i]) {
                    COV(7, CL);
                    // do the strings match if we remove letter at 'i' from a?
                    if (wordA.substr(i+1) === wordB.substr(i)) {
                        COV(8, CL);
                        return [Const.DELETE, i, null];
                    } else {
                        COV(9, CL);
                        return null; // there are two or more mismatches
                    }
                }
            }
            // If we reach here, there are no difference between wordA and wordB in the first wordB.length letters.
            // So the result is to delete the last letter in wordA
            COV(10, CL);
            return [Const.DELETE, wordA.length-1, null]; 
        } else if (wordA.length+1 === wordB.length) {
            COV(11, CL);
            // wordA is shorter
            for (let i = 0; i < wordA.length; i++) {
                if (wordA[i] != wordB[i]) {
                    COV(12, CL);
                    // do the strings match after the insertion point
                    if (wordA.substr(i) === wordB.substr(i+1)) {
                        COV(13, CL);
                        return [Const.ADD, i, wordB[i] ];
                    } else {
                        COV(14, CL);
                        return null; // there are two or more mismatches
                    }
                }
            }
            // didn't find a change in the first wordA.length letters.  Add after the end of wordA.
            COV(15, CL);
            return [Const.ADD, wordA.length, wordB[wordA.length]];
        }
        COV(16, CL);
        return null; // can't get from shorter A to B in one-step
    }
}

class Solution extends BaseLogger {
    constructor(solutionWords, target) {
        const CL = "Solution.constructor";
        super();
        COV(0, CL);
        this.solutionWords = solutionWords;
        this.target = target;
        this.errorMessage = "";
        // call calculateDifficulty(dictionary) to set these three fields:
        this.difficulty = -1;
        this.nChoicesEasiestStep = 1000;
        this.nChoicesOnStep = new Array();
    }

    // An initial solution has the start word as the first played word, and the target as a 
    // an attribute.
    static newEmptySolution(start, target) {
        return new Solution([start], target);
    }

    addError(errorMessage) {
        this.errorMessage += errorMessage;
    }

    addWord(newWord) {
        this.solutionWords.push(newWord);
        return this;
    }

    // side effect: sets this.difficulty, this.nChoicesEasiestStep, and this.nChoicesOnStep (array)
    // Difficulty is the number of choices encountered at each step of the actual solution.
    // The number of choices depends on the dictionary and also on how the next step of the puzzle is
    // displayed.  As of Oct 2024, the user knows either which letter to replace, or that a letter needs
    // to be added, or removed.  We don't consider replaying an existing word of the solution so far to be
    // a choice.
    // the last step is not included in the difficulty total, because it is obvious even if there are many other
    // possibilities.  
    // Apr 2025 - the number of last step options is very important, because the last
    // step is used to work backwards.  There need to be some options there.  But, the options are
    // running in reverse: from target to penultimate word.  

    calculateDifficulty(dictionary) {
        const CL = "Solution.calculateDifficulty";
        COV(0, CL);
        let i = 0;
        // these three fields will be updated as we travel the solution
        this.difficulty = 0;
        this.nChoicesEasiestStep = 1000;
        this.nChoicesOnStep = new Array();
        // difficulty is defined by choices between successive words.  We don't include
        // the choices at the last step since in effect there is only one obvious choice, the target.
        // but see the next step after the while loop
        while (i < this.numWords() - 2) {
            let thisWord = this.getNthWord(i)
            let nextWord = this.getNthWord(i+1)
            let replacementWords = dictionary.findOptionsAtWordStep(thisWord, nextWord);
            // now, remove any already played words from the replacement choices.
            for (let j=0; j<i; j++) {
                replacementWords.delete(this.getNthWord(j));
            }
            let nChoicesThisStep = replacementWords.size;
            this.nChoicesOnStep.push(nChoicesThisStep);
            this.difficulty += nChoicesThisStep;
            if (nChoicesThisStep < this.nChoicesEasiestStep) {
                COV(1, CL);
                this.nChoicesEasiestStep = nChoicesThisStep;
            }
            i+=1;
        }

        // now, how many choices are there going from the target to the penultimate word, backwards.
        // This contributes to how hard the puzzle will be.  
        let reverseOptionsFromTarget = dictionary.findOptionsAtWordStep(this.getTarget(), this.getPenultimateWord());
        this.nChoicesFromTarget = reverseOptionsFromTarget.size;
        Const.GL_DEBUG && Solver.logger.logDebug("easiest step has", this.nChoicesEasiestStep, "choices. Last step reversed has",
                this.nChoicesFromTarget, "choices.", "solver");
        COV(2, CL);
    }

    copy() {
        const CL = "Solution.copy";
        COV(0, CL);
        let solutionWordsCopy = [...this.solutionWords];
        return new Solution(solutionWordsCopy, this.getTarget());
    }

    getError() {
        return this.errorMessage;
    }

    getNthWord(n) {
        return this.solutionWords[n];
    }

    getLastWord() {
        return this.getNthWord(this.solutionWords.length - 1);
    }

    getPenultimateWord() {
        if (this.solutionWords.length < 2) {
            throw new Error(`Solution.getPenultimateWord(): solutionWords length (${this.solutionWords.length}) cannot be < 2`)
        }
        return this.getNthWord(this.solutionWords.length - 2);
    }

    getStart() {
        return this.getNthWord(0);
    }

    getTarget() {
        return this.target;
    }

    // Indicates that the last step reached the target.
    // The last step could be played or shown.
    isTargetReached() {
        return this.target === this.getLastWord();
    }

    // Solved indicates the target was reached
    isSolved() {
        return this.hadNoErrors() && this.isTargetReached();
    }

    // the number of "steps" taken in this solution.  The first word is a given and doesn't
    // count as a step.

    numSteps() {
        return this.numWords() - 1;
    }

    numWords() {
        return this.solutionWords.length;
    }

    getSolutionWords() {
        return this.solutionWords;
    }

    hasWordOfLength(len) {
        const CL = "Solution.hasWordOfLength";
        COV(0, CL);
        for (let word of this.getSolutionWords()) {
            if (word.length == len) {
                COV(1, CL);
                return true;
            }
        }
        COV(2, CL);
        return false;
    }

    hadNoErrors() {
        const CL = "Solution.hadNoErrors";
        COV(0, CL);
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
            return this.solutionWords.join(", ")
                + " -- difficulty: " +  this.difficulty
                + "; choices at each step: " + this.nChoicesOnStep.join(",");
        } else {
            // just the words
            const separator = " ";
            const words = this.solutionWords.join(", ");
            return `${words}${separator}[${this.numSteps()} steps toward ${this.target}]${separator}difficulty: ${this.difficulty}`;
        }
    }
}

export { Solver, Solution};
