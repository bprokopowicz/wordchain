import { BaseLogger } from './BaseLogger.js';


// This class tries to find a word chain from a "from word" to a "to word",
// which is returned as a Solution object.
//
class Solver {

   static logger = new BaseLogger();

   static solve(dictionary, fromWord, toWord) {
        fromWord = fromWord.toUpperCase();
        toWord = toWord.toUpperCase();
        let startingSolution = Solution.newEmptySolution(fromWord, toWord);
        if (! dictionary.isWord(fromWord)){
            startingSolution.addError(fromWord + " is not a word.");
        }
        if (! dictionary.isWord(toWord)) {
            startingSolution.addError(toWord + " is not a word.");
        }
        if (startingSolution.getError()){
            return startingSolution;
        }
        return Solver.resolve(dictionary, startingSolution);
    }

    static resolve(dictionary, startingSolution) {

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
            if (solution.isSolved()) {
                return solution;
            }
            Solver.logger.logDebug(`popped working solution: ${solution.toStr()}`, "solver-details");
            if (solution.numSteps() > longestSolution) {
                longestSolution = solution.numSteps();
                Solver.logger.logDebug(`loopCount: ${loopCount}: longestSolution: ${longestSolution}`, "solver-details");
                Solver.logger.logDebug(`loopCount: ${loopCount}: search size: ${workingSolutions.length}`, "solver-details");
            }

            // Find all possible "next words" from the last word in the solution so far.
            let lastWord  = solution.getLastWord();
            let nextWords = workingDict.findNextWords(lastWord);

            for (let word of nextWords) {
                workingDict.removeWord(word);
                let isCorrect = true;
                let isPlayed = false;
                let newWorkingSolution = solution.copy().addWord(word, isPlayed, isCorrect);
                Solver.logger.logDebug(`   checking ${newWorkingSolution.toStr()}`, "solver-details");
                if (newWorkingSolution.isSolved()) {
                    return newWorkingSolution;
                }
                Solver.logger.logDebug(`   adding ${newWorkingSolution.toStr()}`, "solver-details");
                workingSolutions.push(newWorkingSolution);
            }

            // Every 1000 iterations check whether we are taking too long.
            loopCount += 1;
            if (loopCount % 1000 === 0) {
                // Date.now() returns milliseconds; if this is taking more than 7 seconds
                // just assume there is no solution. Kind of a kludge, but ... ain't nobody
                // got time to wait more than 15 seconds.
                if (Date.now() - startTime > 15000) {
                    Solver.logger.logDebug(`it's taking too long to solve ${startingSolution.toStr()}! loopCount: ${loopCount}`, "solver");
                    solution.addError("No solution within a reasonable time");
                    return solution;
                }
                Solver.logger.logDebug(`loopCount: ${loopCount}: size: ${workingSolutions.length}`, "solver-details");
            }

        }

        startingSolution.addError("No solution");
        return startingSolution;
    }

    static findPuzzles(origDictionary, startWord, targetWordLen, wordLen1, wordLen2, minWords, maxWords,  minDifficulty) {

        startWord = startWord.toUpperCase();
        Solver.logger.logDebug(`looking for puzzles starting with ${startWord} ending with a ${targetWordLen}-length word`, "solver");
        let localDictionary = origDictionary.copy();
        let desiredPuzzles = [];
        if (!localDictionary.isWord(startWord)) {
            Solver.logger.logDebug(startWord + " is not a word.", "solver");
            return desiredPuzzles;
        }
        // search forever until all suitable puzzles are found
        let firstPuzzle = Solution.newEmptySolution(startWord, "dummy-end");
        let listOfPossiblePuzzles =[]; 
        listOfPossiblePuzzles.push(firstPuzzle);
        while (listOfPossiblePuzzles.length > 0) {
            let puzzle = listOfPossiblePuzzles.shift();
            Solver.logger.logDebug(`looking at puzzle ${puzzle.toStr()}`, "solver-details");
            puzzle.target=puzzle.getLastWord();
            if (Solver.isDesired(origDictionary, puzzle, targetWordLen, wordLen1, wordLen2, minWords, maxWords, minDifficulty)) {
	            Solver.logger.logDebug(`found suitable puzzle ${puzzle.toStr()}`, "solver");
                desiredPuzzles.push(puzzle);
            }
            // keep looking if not too long already
            if (puzzle.numWords() < maxWords) {
                let nextWords = localDictionary.findNextWords(puzzle.getLastWord());
                for (let nextWord of nextWords) {
                    localDictionary.removeWord(nextWord);
                    let newPuzzle = puzzle.copy();
                    let isCorrect = true;
                    let isPlayed = false;
                    newPuzzle.addWord(nextWord, isPlayed, isCorrect);
                    listOfPossiblePuzzles.push(newPuzzle);
                }
           }
       }
       return desiredPuzzles;
    }

    static isDesired(dictionary, puzzle, targetWordLen, wordLen1, wordLen2, minWords, maxWords, minDifficulty) {
        if (puzzle.numWords() < minWords) {
            return false;
        }
        if (puzzle.numWords() > maxWords) {
            return false;
        }
        if (puzzle.getTarget().length != targetWordLen) {
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
        return true;
    }
}

class SolutionStep {
    constructor(word, isPlayed, isCorrect) {
        this.word = word;
        this.isPlayed = isPlayed;
        this.isCorrect = isCorrect;
    }

    toString() {
        return `${this.word} played:${this.isPlayed}, correct:${this.isCorrect}`;
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
        this.difficulty = -1;  // call calculateDifficulty(dictionary) to set this
    }

    static newEmptySolution(start, target) {
        let isCorrect = true;
        let isPlayed = true;
        let solutionStep = new SolutionStep(start, isPlayed, isCorrect);
        return new Solution([solutionStep], target);
    }

    addError(errorMessage) {
        this.errorMessage += errorMessage;
        return this;
    }

    addWord(newWord, isPlayed, isCorrect) {
        this.solutionSteps.push(new SolutionStep(newWord, isPlayed, isCorrect));
        return this;
    }


    wrongMoves() {
        return this.solutionSteps.filter((solutionStep)=>!solutionStep.isCorrect).length;
    }

    calculateDifficulty(dictionary) {
        let i = 0;
        let nChoices = 0;
        // difficulty is defined by choices between successive words.
        while (i < this.numWords() - 1) {
            let thisWord = this.getNthWord(i)
            let nextWord = this.getNthWord(i+1)
            if (thisWord.length == nextWord.length) {
                nChoices += dictionary.findReplacementWords(thisWord).size;
            } else if (thisWord.length < nextWord.length ){
                nChoices += dictionary.findRemoverWords(thisWord).size;
            } else {
                nChoices += dictionary.findAdderWords(thisWord).size;
            }
            i+=1;
        }
        this.difficulty = nChoices;
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
        } else {
            const separator = " ";
            const words = this.solutionSteps.join(", ");
            return `${words}${separator}[${this.numSteps()} steps toward ${this.target}]${separator}difficulty: ${this.difficulty}`;
        }
    }
}

export { Solver, Solution, SolutionStep };
