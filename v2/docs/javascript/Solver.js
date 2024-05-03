import { BaseLogger } from './BaseLogger.js';


// This class tries to find a word chain from a "from word" to a "to word",
// which is returned as a Solution object.
//
class Solver extends BaseLogger {

   static solve(dictionary, fromWord, toWord) {
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
            //console.log(`popped working solution: ${solution.toStr()}`);
            if (solution.numSteps() > longestSolution) {
                longestSolution = solution.numSteps();
                //this.logDebug(`loopCount: ${loopCount}: longestSolution: ${longestSolution}`, "perf");
                //this.logDebug(`loopCount: ${loopCount}: search size: ${workingSolutions.length}`, "perf");
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
                //console.log(`   adding ${newWorkingSolution.toStr()}`);
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

        }

        solution.addError("No solution");
        return solution;
    }

    static findPuzzles(dictionary, startWord, lowWordLen, highWordLen, minWords, maxWords,  minDifficulty) {

        let localDictionary = dictionary.copy();
        let desiredPuzzles = [];
        if (!localDictionary.isWord(startWord)) {
            console.log(startWord + " is not a word.");
            return desiredPuzzles;
        }
        // search forever until all suitable puzzles are found
        let firstPuzzle = Solution.newEmptySolution(startWord, "dummy-end");
        let listOfPossiblePuzzles =[]; 
        listOfPossiblePuzzles.push(firstPuzzle);
        while (listOfPossiblePuzzles.length > 0) {
            let puzzle = listOfPossiblePuzzles.shift();
            puzzle.calculateDifficulty(dictionary);
            if (Solver.isDesired(puzzle,  lowWordLen, highWordLen, minWords, maxWords, minDifficulty)) {
	        //console.log(`found suitable  puzzle ${puzzle.toStr()}`);
                desiredPuzzles.push(puzzle);
            }
            // keep looking if not too long already
            if (puzzle.numWords() < maxWords) {
                let nextWords = localDictionary.findNextWords(puzzle.getLastWord());
                for (let nextWord of nextWords) {
                    localDictionary.removeWord(nextWord);
                    let newPuzzle = puzzle.copy();
                    newPuzzle.addWord(nextWord);
                    listOfPossiblePuzzles.push(newPuzzle);
                }
           }
       }
       return desiredPuzzles;
    }

    static isDesired(puzzle, lowWordLen, highWordLen, minWords, maxWords, minDifficulty) {
        if (puzzle.numWords() < minWords) {
            return false;
        }
        if (puzzle.numWords() > maxWords) {
            return false;
        }
        if (puzzle.shortestWordLen() > lowWordLen){
            return false;
        }
        if (puzzle.longestWordLen() < highWordLen){
            return false;
        }
        if (puzzle.difficulty < minDifficulty) {
            return false;
        }
        return true;
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
        return this.penalty == 0;
    }
}

class Solution extends BaseLogger {
    constructor(playedWords, target) {
        super();
        this.playedWords = playedWords;
        this.target   = target;
        this.errorMessage = "";
        this.difficulty = -1;  // call calculateDifficulty(dictionary) to set this
    }

    static newEmptySolution(start, target) {
        let penalty = 0;
        let playedWord = new PlayedWord(start, penalty);
        return new Solution([playedWord], target);
    }

    static newPartialSolution(dictionary, wordList, target) {
        // construct a partial solution given some starting words and the target.
        let penalty = 0;
        let playedWords = wordList.map((word) => new PlayedWord(word, penalty));
        let solution = new Solution(playedWords, target);
        solution.calculatePenalties(dictionary);
        return solution;
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

    wrongMoves() {
        return this.playedWords.filter((playedWord)=>!playedWord.wasCorrect()).length;
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

    calculatePenalties(dictionary) {
        // step 0 can not have a penalty
        let recreatedSolution = Solution.newEmptySolution(this.getStart(), this.target);
        let bestSolution = Solver.resolve(dictionary, recreatedSolution, this.target);
        let i = 1;
        while (i < this.numWords()) {
            let bestSolutionLength = bestSolution.numSteps();
            let wordPlayed = this.getNthWord(i);
            recreatedSolution.addWord(wordPlayed);
            bestSolution = Solver.resolve(dictionary, recreatedSolution, this.target);
            let penalty = bestSolutionLength - bestSolution.numSteps();
            // adjust penalty of last played word
            recreatedSolution.removeLastWord();
            recreatedSolution.addWord(wordPlayed, penalty);
            i+=1;
        }
    }


    copy() {
        let playedListCopy = [...this.playedWords];
        return new Solution(playedListCopy, this.getTarget());
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
        return this.numWords() - 1;
    }

    numWords() {
        return this.playedWords.length;
    }

    getPlayedWords() {
        return this.playedWords;
    }

    shortestWordLen() {
	let shortestLen = 1000;
        for (let playedWord of this.playedWords) {
	    let word = playedWord.word;
            if (word.length < shortestLen) {
                shortestLen = word.length;
            }
        }
        return shortestLen;
    }

    longestWordLen() {
	let longestLen = 0;
        for (let playedWord of this.playedWords) {
	    let word = playedWord.word;
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
            const words = this.playedWords.join(", ");
            return `${words}${separator}[${this.numSteps()} steps toward ${this.target}]${separator}difficulty: ${this.difficulty}`;
        }
    }
}

export { Solver, Solution, PlayedWord };
