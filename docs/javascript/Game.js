import { BaseLogger } from './BaseLogger.js';
import { Solution, Solver } from './Solver.js';

// NOTE: This class assumes words that are played in the game have
// already been validated to be in the dictionary.
class Game extends BaseLogger {
    static OK = "ok";
    static NOT_ONE_STEP = "Your word is not one step away from the last word.";
    static DEAD_END = "No solution from this word.";
    static DUPLICATE = "You already played that word.";

    static NO_CHANGE = "*";
    static CHANGE    = "!";

    constructor(name, dict, solution) {
        super();
        this.name = name;
        this.dict = dict;
        this.knownSolution = solution;
        this.solutionInProgress = new Solution([solution.getFirstWord()], solution.target);
        this.stepCountHistory = [];
        this.stepCountHistory.push(this.getStepCount());
    }

    endGame() {
        this.solutionInProgress = this.knownSolution;
    }

    getCountHistory() {
        return this.stepCountHistory;
    }

    getKnownSolution() {
        return this.knownSolution;
    }

    getName() {
        return this.name;
    }

    getSolutionInProgress() {
        return this.solutionInProgress;
    }

    getStepCount() {
        return this.knownSolution.numSteps();
    }

    getTarget() {
        return this.knownSolution.getTarget();
    }

    isSolved() {
        const lastWord = this.solutionInProgress.getLastWord()
        if (lastWord === this.knownSolution.target) {
            return true;
        }

        const nextWords = this.dict.findNextWords(lastWord);
        return nextWords.has(this.knownSolution.target);
    }

    playWord(word) {
        // Display will validate that the word is a valid word.
        word = word.toLowerCase();

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
            this.stepCountHistory.push(this.getStepCount());
            this.solutionInProgress.addWord(word);
            return Game.OK;
        }

        // See whether we find a solution with the user's new word.
        // We pass the words of the solution in progress so that we
        // can ensure that any new solution found does not contain
        // any of the words currently in the solution in progress;
        // duplicate words are not allowed, so that "solution" would
        // be a non-solution!
        const potentialNewSolution = Solver.fastSolve(
            this.dict, word, this.knownSolution.getTarget(),
            this.solutionInProgress.getWordSet());
        this.logDebug(`returned potentialNewSolution: ${potentialNewSolution.toStr()}`, "game");

        // Does the user's word lead to a solution?
        if (potentialNewSolution.isSolved()) {
            // Yes. Update the known solution: append the potential solution (which has the user's word in it)
            // to (a copy of) the solution in progress.
            this.logDebug(`joining  ${this.solutionInProgress.toStr()} to ${potentialNewSolution.toStr()}`, "game");
            this.knownSolution = this.solutionInProgress.copy().append(potentialNewSolution)

            // Add the user's word to the solution in progress.
            this.stepCountHistory.push(this.getStepCount());
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
            } else if (i == solutionWords.length - 1) {
                game.push(solutionWords[i])
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
                    unguessedWord += Game.NO_CHANGE;
                } else {
                    unguessedWord += Game.CHANGE;
                }
            }
        } else {
            unguessedWord = Game.NO_CHANGE.repeat(word.length);
        }

        return unguessedWord;
    }
}

export { Game };
