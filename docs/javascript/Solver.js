import { BaseLogger } from './BaseLogger.js';

// This class is a wrapper for MinQueue from Heapify, which only allows
// pushing integers onto the heap. The Solver class wants to push Solution
// objects, so we maintain an object map (just an array of objects, where
// its ID is its index in the map) and push the object ID onto the heapq.
class SolutionHeap extends BaseLogger {
    constructor() {
        super();

        const {MinQueue} = Heapify;
        this.objectIndexHeapq = new MinQueue(200000);
        this.objectMap = [];
    }

    // Return the number of objects put on the heap over time.
    getMapSize() {
        return this.objectMap.length
    }

    // Return the number of objects currently in the heap.
    getSize() {
        return this.objectIndexHeapq.size
    }

    // Push an item (Solution in our case) onto the heap, with
    // a given priority (distance to target word in our case).
    push(item, priority) {
        this.objectMap.push(item);

        // Now that we've pushed the item, its index is one
        // less than the length.
        let objectIndex = this.objectMap.length - 1;
        this.objectIndexHeapq.push(objectIndex, priority);
    }

    // Pop an item from the heap.
    pop() {
        let objectIndex = this.objectIndexHeapq.pop();
        let item = this.objectMap[objectIndex];

        // Set to null so that the object will be freed when no longer used.
        this.objectMap[objectIndex] = null;
        return item;
    }
}

// This class tries to find a word chain from a "from word" to a "to word",
// which is returned as a Solution object.
//
// NOTE: This class expects its user to verify that the fromWord and toWord
// are valid words in the wordChainDict given to its constructor args.
class Solver extends BaseLogger {
    constructor(wordChainDict, fromWord, toWord, excludedWords=new Set()) {
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

    // Solve in a fast way, based on whether it is better to solve
    // fromWord --> toWord or toWord --> fromWord.
    static fastSolve(wordChainDict, fromWord, toWord, excludedWords=new Set()) {
        const fromWordNextWordsCount = wordChainDict.findNextWords(fromWord).size;
        const toWordNextWordsCount = wordChainDict.findNextWords(toWord).size;

        new BaseLogger().logDebug(`fromWordNextWordsCount: ${fromWordNextWordsCount}`, "solve");
        new BaseLogger().logDebug(`toWordNextWordsCount:   ${toWordNextWordsCount}`, "solve");

        // Determine whether there are more "next words" from the "from" or "to"
        // word and construct a solver going from the one with the fewest to the most
        // next words so that the search is more efficient.
        let solution = (fromWordNextWordsCount < toWordNextWordsCount) ?
                new Solver(wordChainDict, fromWord, toWord, excludedWords).solve() :
                new Solver(wordChainDict, toWord, fromWord, excludedWords).solve().reverse();
        new BaseLogger().logDebug(`fast solve finds: ${solution.toStr()}`, "solve");
        return solution;
    }

    solve() {
        // Create an initial working solution and test for the degenerate case
        // that it is already solved.
        // Note that addWord() will calculate the distance for the solution.
        const startingWorkingSolution = new Solution([], this.toWord).addWord(this.fromWord);
        if (startingWorkingSolution.isSolved()) {
            return startingWorkingSolution;
        }

        // Create a heap for our working solutions and push this starting working solution on the heap.
        const workingSolutions = new SolutionHeap();
        workingSolutions.push(startingWorkingSolution, startingWorkingSolution.getDistance());

        let solution = null;
        let longestSolution = 0;
        let loopCount = 0;
        let startTime = Date.now()
        while (workingSolutions.getSize() !== 0) {
            // Get the solution with the shortest distance to the "target word"
            // from the heap; we'll add working solutions based on this
            // "nearest" solution.
            solution = workingSolutions.pop();
            this.logDebug(`popped working solution: ${solution.toStr()}`, "solve");
            if (solution.numSteps() > longestSolution) {
                longestSolution = solution.numSteps()
                this.logDebug(`loopCount: ${loopCount}: longestSolution: ${longestSolution}`, "perf");
                this.logDebug(`loopCount: ${loopCount}: heap size: ${workingSolutions.getSize()}`, "perf")
                this.logDebug(`loopCount: ${loopCount}: map size:  ${workingSolutions.getMapSize()}`, "perf")
            }

            // Find all possible "next words" from the last word in the solution so far.
            let lastWord  = solution.getLastWord();
            let nextWords = Array.from(this.dict.findNextWords(lastWord));

            // Remove words that are already in the solution from nextWords.
            nextWords = nextWords.filter(w => !solution.getWordSet().has(w));

            // Remove previously played words from the solution. This addresses the case where
            // we are solving a game in which the user plays a word that is not in the (current)
            // known solution. In that case, we create a solver from the user's new word to the
            // target to see whether the new word leads to a solution (however long it may be).
            // BUT, that solution must not contain words that have already been played.
            nextWords = nextWords.filter(w => !this.excludedWords.has(w));

            // Check if we have a solution; if so, add this latest word to it, and return it.
            if (nextWords.includes(this.toWord)) {
                solution.addWord(this.toWord);
                solution.setSearchSize(loopCount);
                return solution;
            }

            // No solution, add a new working solution to the workingSolutions heap
            // for each word in nextWords.
            //
            // NOTE: Without sorting nextWords, we do not consistently find the same solution.
            for (let word of nextWords.sort()) {
                // Note that addWord() will calculate the distance of newWorkingSolution.
                let newWorkingSolution = solution.copy().addWord(word);
                this.logDebug(`   adding ${newWorkingSolution.toStr()}`, "solveDetail");
                workingSolutions.push(newWorkingSolution, newWorkingSolution.getDistance());
            }

            // Every 1000 iterations check whether we are taking too long.
            loopCount += 1;
            if (loopCount % 1000 === 0) {
                // Date.now() returns milliseconds; if this is taking more than 7 seconds
                // just assume there is no solution. Kind of a kludge, but ... ain't nobody
                // got time to wait more than 7 seconds.
                if (Date.now() - startTime > 7000) {
                    this.logDebug(`Too long! loopCount: ${loopCount}`, "perf");
                    solution.addError("No solution");
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
    constructor(wordList, target, distance) {
        super();

        this.wordList = [...wordList];
        this.target   = target;
        this.distance = distance ? distance : 100;
        this.errorMessage = "";
        this.searchSize = 0;
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
        this.distance = Solution.wordDistance(newWord, this.target) + this.wordList.length;
        return this;
    }

    // TODO: assert restOfSolution is the rest.
    // restOfSolution is itself a Solution
    append(restOfSolution) {
        this.wordList = this.wordList.concat(restOfSolution.wordList);
        this.distance = restOfSolution.distance; // TODO: assert should be zero?
        return this;
    }

    copy() {
        let wordListCopy = [...this.wordList];
        return new Solution(wordListCopy, this.target, this.distance);
    }

    getDistance() {
        return this.distance;
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

    getTarget() {
        return this.target;
    }

    // Used only in tests.
    getWordByStep(step) {
        return this.wordList[step];
    }

    getWordSet() {
        return new Set(this.wordList);
    }

    getWords() {
        return [...this.wordList];
    }

    isSolved() {
        return this.target === this.getLastWord();
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

    static wordDistance(word1, word2) {
        let len1 = word1.length;
        let len2 = word2.length;
        let distance = 0;
        let logger = new BaseLogger();

        logger.logDebug(`word1: ${word1}, word2: ${word2}`, "distance");

        if (len1 === len2) {
            let matches = 0;
            for (let index = 0; index < len1; index++) {
                if (word1[index] === word2[index]) {
                    matches += 1
                }
            }
            distance = len1 - matches;
        } else if (Math.abs(len1 - len2) > 2) {
            distance = 100;
        } else {
            let largerWord;
            let smallerWord;

            if (len1 > len2) {
                largerWord  = word1;
                smallerWord = word2;
            } else {
                largerWord  = word2;
                smallerWord = word1;
            }

            // Knock out letters one by one in largerWord, take smallest distance.
            let smallestDistance = 100;
            for (let index = 0; index < largerWord.length; index++) {
                let testWord = largerWord.substr(0, index) + largerWord.substr(index + 1);
                logger.logDebug(`testWord: for ${largerWord}: ${testWord}`, "distance");
                let distance = Solution.wordDistance(testWord, smallerWord);

                if (distance < smallestDistance) {
                    smallestDistance = distance;
                }
            }

            distance = smallestDistance + 1;
        }

        logger.logDebug(`distance: ${distance}`, "distance")
        return distance;
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
            return `${words}${separator}[${this.wordList.length - 1} steps to ${this.target}]${separator}${this.searchSize} nodes`;
        }
    }
}

export { Solver, Solution };
