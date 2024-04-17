import { BaseLogger } from './BaseLogger.js';


// This class tries to find a word chain from a "from word" to a "to word",
// which is returned as a Solution object.
//
class Solver extends BaseLogger {

   static solve(dictionary, fromWord, toWord) {
        let startingSolution = Solution.emptySolution(fromWord, toWord);
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
                //console.log(`   checking ${newWorkingSolution.toStr()}`);
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

class PlayedWord {
    constructor(word, penalty) {
        this.word = word;
        this.penalty = penalty;
    }

    toString() {
        return `${this.word}:${this.penalty}`;
    }

    wordLength() {
        return this.word.length;
    }

    wasCorrect() {
        return this.penalty = 0;
    }
}

class Solution extends BaseLogger {
    constructor(playedWords, target) {
        super();
        this.playedWords = [...playedWords];
        this.target   = target;
        this.errorMessage = "";
    }

    static emptySolution(start, target) {
        let playedWord = new PlayedWord(start, 0);
        return new Solution([playedWord], target);
    }

    addError(errorMessage) {
        this.errorMessage += errorMessage;
        return this;
    }

    addWord(newWord, penalty=0) {
        this.playedWords.push(new PlayedWord(newWord, penalty));
        return this;
    }

    totalPenalty() {
        let penalty = 0;
        for (let word of this.playedWords) {
            penalty += word.penalty;
        }
        return penalty;
    }

    copy() {
        let playedListCopy = [...this.playedWords];
        return new Solution(playedListCopy, this.target);
    }

    getError() {
        return this.errorMessage;
    }

    getNthWord(n) {
        return this.playedWords[n].word;
    }

    getNthPenalty(n) {
        return this.playedWords[n].penalty;
    }

    getLastWord() {
        return this.getNthWord(this.playedWords.length - 1);
    }
    
    removeLastWord() {
        this.playedWords.pop();
    }

    getPenultimateWord() {
        if (this.playedWords.length < 2) {
            throw new Error(`Solution.getPenultimateWord(): playedWords length (${this.playedWords.length}) cannot be < 2`)
        }
        return this.getNthWord(this.playedWords.length - 2);
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
        return this.playedWords.length - 1;
    }

    getPlayedWords() {
        return this.playedWords;
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
            const words = this.playedWords.join(", ");
            return `${words}${separator}[${this.numSteps()} steps toward ${this.target}]${separator}`;
        }
    }
}

export { Solver, Solution, PlayedWord };
