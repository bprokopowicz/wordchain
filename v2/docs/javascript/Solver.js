import { BaseLogger } from './BaseLogger.js';


// This class tries to find a word chain from a "from word" to a "to word",
// which is returned as a Solution object.
//
class Solver extends BaseLogger {

   static solve(dictionary, fromWord, toWord, debug=0) {
        let startingSolution = new Solution([fromWord], toWord);
        if (! dictionary.isWord(fromWord)){
            startingSolution.addError(fromWord + " is not a word.");
        }
        if (! dictionary.isWord(toWord)) {
            startingSolution.addError(toWord + " is not a word.");
        }
        if (startingSolution.getError()){
            return startingSolution;
        }
        return Solver.resolve(dictionary, startingSolution, debug);
    }

    static resolve(dictionary, startingSolution, debug=0) {

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
            console.log(`popped working solution: ${solution.toStr()}`);
            if (solution.numSteps() > longestSolution) {
                longestSolution = solution.numSteps();
                //this.logDebug(`loopCount: ${loopCount}: longestSolution: ${longestSolution}`, "perf");
                //this.logDebug(`loopCount: ${loopCount}: search size: ${workingSolutions.length}`, "perf");
                console.log(`loopCount: ${loopCount}: longestSolution: ${longestSolution}`);
                console.log(`loopCount: ${loopCount}: search size: ${workingSolutions.length}`);
            }

            // Find all possible "next words" from the last word in the solution so far.
            let lastWord  = solution.getLastWord();
            let nextWords = Array.from(workingDict.findNextWords(lastWord));

            // NOTE: Without sorting nextWords, we do not consistently find the same solution.
            for (let word of nextWords.sort()) {
                workingDict.removeWord(word);
                let newWorkingSolution = solution.copy().addWord(word);
                console.log(`   checking ${newWorkingSolution.toStr()}`);
                if (newWorkingSolution.isSolved()) {
                    return newWorkingSolution;
                }
                console.log(`   adding ${newWorkingSolution.toStr()}`);
                workingSolutions.push(newWorkingSolution);
            }

            // Every 1000 iterations check whether we are taking too long.
            loopCount += 1;
            if (loopCount % 1000 === 0) {
                // Date.now() returns milliseconds; if this is taking more than 7 seconds
                // just assume there is no solution. Kind of a kludge, but ... ain't nobody
                // got time to wait more than 7 seconds.
                if (Date.now() - startTime > 7000) {
                    console.log(`Too long! loopCount: ${loopCount}`);
                    solution.addError("No solution within a reasonable time");
                    return solution;
                }
                console.log(`loopCount: ${loopCount}: size: ${workingSolutions.length}`)
            }

            console.log("-----");
        }

        solution.addError("No solution");
        return solution;
    }
}

class Solution extends BaseLogger {
    constructor(wordList, target) {
        super();

        this.wordList = [...wordList];
        this.target   = target;
        this.errorMessage = "";
    }

    addError(errorMessage) {
        this.errorMessage += errorMessage;
        return this;
    }

    addWord(newWord) {
        this.wordList.push(newWord)
        return this;
    }

    // TODO: assert restOfSolution is the rest.
    // restOfSolution is itself a Solution
    //append(restOfSolution) {
    //    this.wordList = this.wordList.concat(restOfSolution.wordList);
    //    return this;
    //}

    copy() {
        let wordListCopy = [...this.wordList];
        return new Solution(wordListCopy, this.target);
    }

    getError() {
        return this.errorMessage;
    }

    getNthWord(n) {
        return this.wordList[n];
    }

    getFirstWord() {
        return this.getNthWord(0);
    }

    getLastWord() {
        return this.getNthWord(this.wordList.length - 1);
    }
    
    removeLastWord() {
        this.wordList.pop();
    }
    getPenultimateWord() {
        if (this.wordList.length < 2) {
            throw new Error(`Solution.getPenultimateWord(): wordList length (${this.wordList.length}) cannot be < 2`)
        }
        return this.getNthWord(this.wordList.length - 2);
    }

    getStart() {
        return this.getNthWord(0);
    }

    getTarget() {
        return this.target;
    }

    // Used only in tests.
    getWordByStep(step) {
        return this.wordList[step];
    }

    getWords() {
        return [...this.wordList];
    }

    isSolved() {
        return this.success() && (this.target === this.getLastWord());
    }

    // the number of "steps" taken in this solution.  The first word is a given and doesn't
    // count as a step.

    numSteps() {
        return this.wordList.length - 1;
    }

    success() {
        return this.errorMessage.length === 0;
    }

    // This method is used in the test suite.
    toHtml() {
        return this.toStr(true);
    }

    // This method is here to help with debugging.
    toStr(html=false) {
        if (this.errorMessage.length !== 0) {
            return this.errorMessage;
        } else {
            const separator = html ? "<p>" : " ";
            const words = this.wordList.join(", ");
            return `${words}${separator}[${this.wordList.length - 1} steps to ${this.target}]${separator}`;
        }
    }
}

export { Solver, Solution };
