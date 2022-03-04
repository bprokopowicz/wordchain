import { BaseLogger } from './BaseLogger.js';
import { Solution, Solver } from './Solver.js';

// NOTE: This class assumes words that are played in the game have
// already been validated to be in the dictionary.
class Game extends BaseLogger {
    static OK = "ok";
    static NOT_ONE_STEP = "Your word is not one step away from the last word.";
    static DEAD_END = "No solution from this word.";
    static DUPLICATE = "You already played that word.";

    constructor(dict, solution) {
        super();
        this.dict = dict;
        this.knownSolution = solution;
        this.solutionInProgress = new Solution([solution.getFirstWord()], solution.target);
    }

    // This is used only for testing.
    getKnownSolution() {
        return this.knownSolution;
    }

    // This is used only for testing.
    getSolutionInProgress() {
        return this.solutionInProgress;
    }

    isSolved() {
        return this.solutionInProgress.isSolved();
    }

    playWord(word) {
        // Display will validate that the word is a valid word.

        if (this.solutionInProgress.isWordInSolution(word)) {
            this.logDebug(`${word} is already played`, "game");
            return Game.DUPLICATE;
        }
    
        let lastWordPlayed = this.solutionInProgress.getLastWord();
        if (! this.dict.findNextWords(lastWordPlayed).has(word)) {
            this.logDebug(`${word} is not one step from ${lastWordPlayed}`, "game");
            return Game.NOT_ONE_STEP;
        }

        // If user gave the next word that was in the current solution,
        // just add that word to the solution in progress and we're done.
        let nextStep = this.solutionInProgress.numSteps() + 1;
        if (this.knownSolution.getWordByStep(nextStep) === word) {
            this.solutionInProgress.addWord(word);
            return Game.OK;
        }

        const potentialNewSolution = Solver.fastSolve(this.dict, word, this.knownSolution.getTarget());
        this.logDebug(`found solution from word to end: ${potentialNewSolution.toStr()}`, "game");

        // Does the user's word lead to a solution? 
        if (potentialNewSolution.isSolved()) {
            // Yes. Update the known solution: append the potential solution (which has the user's word in it)
            // to (a copy of) the solution in progress.
            this.logDebug(`joining  ${this.solutionInProgress.toStr()} to ${potentialNewSolution.toStr()}`, "game");
            this.knownSolution = this.solutionInProgress.copy().append(potentialNewSolution)

            // Add the user's word to the solution in progress.
            this.solutionInProgress.addWord(word);
            return Game.OK;
        } else {
            // No. tell the user it's a dead end.
            return Game.DEAD_END;
        }
    }

    showGame() {
        let playedWords = this.solutionInProgress.getWords();
        let solutionWords = this.knownSolution.getWords();
        let resultStr = ""; 

        let game = []
        for (let i = 0; i < solutionWords.length; i++) {
            if (i <= this.solutionInProgress.numSteps()) {
                game.push(playedWords[i])
            } else {
                game.push(this.showUnguessedWord(solutionWords[i], solutionWords[i-1]));
            }
        }

        return game;
    }

    showUnguessedWord(word, previousWord) {
        let unguessedWord = ""
        if (word.length === previousWord.length) {
            for (let i = 0; i < word.length; i++) {
                if (word[i] == previousWord[i]) {
                    unguessedWord += "*";
                } else {
                    unguessedWord += "!";
                }
            }
        } else {
            unguessedWord = "*".repeat(word.length);
        }

        return unguessedWord;
    }
}

export { Game };
