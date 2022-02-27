class SolutionHeap extends BaseLogger {
    constructor() {
        super();

        const {MinQueue} = Heapify;
        this.objectIndexHeap = new MinQueue(100000);
        this.objectMap = [];
    }

    getMapSize() {
        return this.objectMap.length
    }

    getSize() {
        return this.objectIndexHeap.size
    }

    push(item, priority) {
        this.objectMap.push(item);
        let objectIndex = this.objectMap.length - 1;
        this.objectIndexHeap.push(objectIndex, priority);
    }

    pop() {
        let objectIndex = this.objectIndexHeap.pop();
        let item = this.objectMap[objectIndex];

        // Set to null so that the object will be freed when no longer used.
        this.objectMap[objectIndex] = null;
        return item;
    }
}

class Solver extends BaseLogger {
    constructor(wordChainDict, fromWord, toWord) {
        super();
        this.dict     = wordChainDict;
        this.fromWord = fromWord;
        this.toWord   = toWord;
    }

    getWordErrors() {
        if (! this.dict.isWord(this.fromWord)) {
            return `Sorry '${this.fromWord}' is not a word`;
        } else if (! this.dict.isWord(this.toWord)) {
            return `Sorry '${this.toWord}' is not a word`;
        }

        return null;
    }

    static fastSolve(wordChainDict, fromWord, toWord) {
        let fromWordNextWordsCount = wordChainDict.findNextWords(fromWord).length;
        let toWordNextWordsCount = wordChainDict.findNextWords(toWord).length;

        // Determine whether there are more "next words" from the "from" or "to"
        // word and construct a solver going from the one with the fewest to the most
        // next words so that the search is more efficient.
        let solution = (fromWordNextWordsCount < toWordNextWordsCount) ?
                new Solver(wordChainDict, fromWord, toWord).solve() :
                (new Solver(wordChainDict, toWord, fromWord).solve()).reverse();
        new BaseLogger().logDebug(`fast solve finds: ${solution.toStr()}`, "solveDetail");
        return solution;
    }

    solve() {
        const startingSolution = new Solution([], this.toWord).addWord(this.fromWord);

        const {MinQueue} = Heapify;
        const workingSolutions = new SolutionHeap();
        workingSolutions.push(startingSolution, startingSolution.getDistance());

        let solution = null;
        let longestSolution = 0;
        let loopCount = 0;
        while (workingSolutions.getSize() !== 0) {
            solution = workingSolutions.pop();
            this.logDebug(`popped working solution: ${solution.toStr()}`, "solveDetail");
            if (solution.numSteps() > longestSolution) {
                longestSolution = solution.numSteps()
                this.logDebug(`loopCount: ${loopCount}: longestSolution: ${longestSolution}`, "perf");
                this.logDebug(`loopCount: ${loopCount}: heap size: ${workingSolutions.getSize()}`, "perf")
                this.logDebug(`loopCount: ${loopCount}: map size:  ${workingSolutions.getMapSize()}`, "perf")
            }

            let lastWord  = solution.getLastWord();
            let nextWords = this.dict.findNextWords(lastWord);

            // Remove words that are already in the solution from nextWords.
            nextWords = new Set(Array.from(nextWords).filter(w => !solution.getWordSet().has(w)));

            if (nextWords.has(this.toWord)) {
                solution.addWord(this.toWord);
                return solution;
            }

            // Without sorting nextWords, we did not consistently find the same solution.
            for (let word of Array.from(nextWords).sort()) {
                let newWorkingSolution = solution.copy().addWord(word);
                this.logDebug(`   adding ${newWorkingSolution.toStr()}`, "solveDetail");
                workingSolutions.push(newWorkingSolution, newWorkingSolution.getDistance());
            }

            loopCount += 1;
            if (loopCount % 1000 === 0) {
                this.logDebug(`loopCount: ${loopCount}: heap size: ${workingSolutions.getSize()}`, "perf")
                this.logDebug(`loopCount: ${loopCount}: map size:  ${workingSolutions.getMapSize()}`, "perf")
            }

            this.logDebug("-----", "solveDetail")
        }

        return solution.addError("No solution")
    }
}

class Solution extends BaseLogger {
    constructor(wordList, target, distance) {
        super();

        this.wordList = [...wordList];
        this.target   = target;
        this.distance = distance ? distance : 100;
        this.errorMessage = "";
    }

    addError(errorMessage) {
        this.errorMessage = errorMessage;
        return this;
    }

    addWord(newWord) {
        this.wordList.push(newWord)
        this.distance = this.wordDistance(newWord, this.target) + this.wordList.length;
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

    // Not used (for tests?)
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

    reverse() {
        this.target = this.wordList[0];
        this.wordList.reverse();
        return this;
    }

    success() {
        return this.errorMessage.length === 0;
    }

    wordDistance(word1, word2) {
        let len1 = word1.length;
        let len2 = word2.length;
        let distance = 0;
        this.logDebug(`word1: ${word1}, word2: ${word2}`, "distance");

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
                this.logDebug(`testWord: for ${largerWord}: ${testWord}`, "distance");
                let distance = this.wordDistance(testWord, smallerWord);

                if (distance < smallestDistance) {
                    smallestDistance = distance;
                }
            }

            distance = smallestDistance + 1;
        }

        this.logDebug(`distance: ${distance}`, "distance")
        return distance;
    }

    toStr() {
        if (this.errorMessage.length !== 0) {
            return this.errorMessage;
        } else {
            return `${this.wordList} [${this.wordList.length - 1} steps to ${this.target}]`;
        }
    }
}
