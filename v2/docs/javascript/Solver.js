import { BaseLogger } from './BaseLogger.js';


// This class tries to find a word chain from a "from word" to a "to word",
// which is returned as a Solution object.
//
// NOTE: This class expects its user to verify that the fromWord and toWord
// are valid words in the wordChainDict given to its constructor args.
class Solver extends BaseLogger {
    constructor(wordChainDict, fromWord, toWord, excludedWords=new Array()) {
        super();
        this.dict     = wordChainDict;
        this.fromWord = fromWord;
        this.toWord   = toWord;
        this.excludedWords = excludedWords;
        this.logDebug(`new Solver: ${fromWord} to ${toWord} (played: ${excludedWords})`, "solve");
    }

    // Currently not used; might be used for tests.
    getWordErrors() {
        if (! this.dict.isWord(this.fromWord)) {
            return `Sorry '${this.fromWord}' is not a word`;
        } else if (! this.dict.isWord(this.toWord)) {
            return `Sorry '${this.toWord}' is not a word`;
        }

        return null;
    }


    solve() {
        // Create an initial working solution and test for the degenerate case
        // that it is already solved.
        const startingWorkingSolution = new Solution([], this.toWord).addWord(this.fromWord);
        if (startingWorkingSolution.isSolved()) {
            return startingWorkingSolution;
        }
        // we consume words from the dictionary as we encounter them in the search.  This means each word
        // will only appear in one path out of 'start'.  There is no reason ever to consider a word that
        // is already being considered.  HMMMM?  what about car -> ear -> fear vs car -> far -> fear?
        // if we find the first path and remove 'ear', is it possible that the 'ear first' path needs 'far'
        // and the the 'far first' path needs 'ear' so neither can be solved?  
        // IN general, if we reach 'x' after looking at a bunch of paths all length <= n, is it possible 
        // that the path FROM 'x' TO target is possible but one of its words 'W' is already used up?
        // It is possible, but in that case, the path that reached 'W' did it in 
        // < n steps, whereas this path being considered needs > n steps.  From W to target stays the same.

        let workingDict = this.dict.copy

        // Create a queue for our working solutions and push this starting working solution on the queue.
        let workingSolutions = [];
        workingSolutions.push(startingWorkingSolution);

        let solution = null;
        let longestSolution = 0;
        let loopCount = 0;
        let dupsSkipped = 0;
        let startTime = Date.now()
        while (workingSolutions.length > 0) {
            // Get the next partial solution from the heap; we'll add working solutions based on this
            let solution = workingSolutions.shift();
            this.logDebug(`popped working solution: ${solution.toStr()}`, "solve");
            if (solution.numSteps() > longestSolution) {
                longestSolution = solution.numSteps()
                this.logDebug(`loopCount: ${loopCount}: longestSolution: ${longestSolution}`, "perf");
                this.logDebug(`loopCount: ${loopCount}: heap size: ${workingSolutions.getSize()}`, "perf");
                this.logDebug(`loopCount: ${loopCount}: map size:  ${workingSolutions.getMapSize()}`, "perf");
                this.logDebug(`loopCount: ${loopCount}: dups skipped:  ${dupsSkipped}`, "perf");
            }

            // Find all possible "next words" from the last word in the solution so far.
            let lastWord  = solution.getLastWord();
            let nextWords = Array.from(workingDict.findNextWords(lastWord));

            solution.difficulty = solution.difficulty + nextWords.length;
            // NOTE: Without sorting nextWords, we do not consistently find the same solution.
            for (let word of nextWords.sort()) {
                workingDict.remove(word);
                let newWorkingSolution = solution.copy().addWord(word);
                this.logDebug(`   adding ${newWorkingSolution.toStr()}`, "solveDetail");
                if (word == this.ToWord) {
                    solution.setSearchSize(loopCount);
                    return solution;
                }
                workingSolutions.push(newWorkingSolution);
            }

            // Every 1000 iterations check whether we are taking too long.
            loopCount += 1;
            if (loopCount % 1000 === 0) {
                // Date.now() returns milliseconds; if this is taking more than 7 seconds
                // just assume there is no solution. Kind of a kludge, but ... ain't nobody
                // got time to wait more than 7 seconds.
                if (Date.now() - startTime > 7000) {
                    this.logDebug(`Too long! loopCount: ${loopCount}`, "perf");
                    solution.addError("No solution within a reasonable time");
                    return solution;
                }
                this.logDebug(`loopCount: ${loopCount}: heap size: ${workingSolutions.getSize()}`, "perf")
                this.logDebug(`loopCount: ${loopCount}: map size:  ${workingSolutions.getMapSize()}`, "perf")
            }

            this.logDebug("-----", "solveDetail")
        }

        solution.setSearchSize(loopCount);
        solution.addError("No solution")
        return solution;
    }
}

class Solution extends BaseLogger {
    constructor(wordList, target, difficulty) {
        super();

        this.wordList = [...wordList];
        this.target   = target;
        this.errorMessage = "";
        this.searchSize = 0;
        this.difficulty = difficulty ? difficulty : 1;
    }

    setSearchSize(n) {
        this.searchSize = n;
        return this;
    }

    addError(errorMessage) {
        this.errorMessage = errorMessage;
        return this;
    }

    addWord(newWord) {
        this.wordList.push(newWord)
        return this;
    }

    // TODO: assert restOfSolution is the rest.
    // restOfSolution is itself a Solution
    append(restOfSolution) {
        this.wordList = this.wordList.concat(restOfSolution.wordList);
        this.difficulty = this.difficulty + restOfSolution.difficulty;
        return this;
    }

    copy() {
        let wordListCopy = [...this.wordList];
        return new Solution(wordListCopy, this.target, this.difficulty);
    }

    getError() {
        return this.errorMessage;
    }

    getFirstWord() {
        return this.wordList[0];
    }

    getLastWord() {
        return this.wordList[this.wordList.length - 1];
    }

    getPenultimateWord() {
        if (this.wordList.length < 2) {
            throw new Error(`Solution.getPenultimateWord(): wordList length (${this.wordList.length}) cannot be < 2`)
        }
        return this.wordList[this.wordList.length - 2];
    }

    getStart() {
        return this.wordList[0];
    }

    getTarget() {
        return this.target;
    }

    // Used only in tests.
    getWordByStep(step) {
        return this.wordList[step];
    }

    getWordLength(wordNum) {
        if (wordNum < this.wordList.length) {
            return this.wordList[wordNum].length;
        } else {
            console.log(`Solution.getWordLength(): wordList is length ${this.wordList.length}; invalid wordNum ${wordNum}`);
            return 0
        }
    }

    getWords() {
        return [...this.wordList];
    }

    isSolved() {
        return this.success() && (this.target === this.getLastWord());
    }

    isWordInSolution(word) {
        return this.wordList.includes(word);
    }

    numSteps() {
        return this.wordList.length - 1;
    }

    searchSize() {
        return this.searchSize;
    }

    reverse() {
        this.target = this.wordList[0];
        this.wordList.reverse();
        return this;
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
            return `${words}${separator}[${this.wordList.length - 1} steps to ${this.target}]${separator}${this.searchSize} nodes${separator}`;
        }
    }
}

export { Solver, Solution };
