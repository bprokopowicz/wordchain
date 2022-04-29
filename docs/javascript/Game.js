import { BaseLogger } from './BaseLogger.js';
import { Solution, Solver } from './Solver.js';
import * as Const from './Const.js';

// NOTE: This class assumes words that are played in the game have
// already been validated to be in the dictionary.
class Game extends BaseLogger {

    constructor(name, dict, solution, typeSavingMode=false) {
        super();
        this.name = name;
        this.dict = dict;
        this.knownSolution = solution;
        this.solutionInProgress = new Solution([solution.getFirstWord()], solution.target);
        this.stepCountHistory = [];
        this.stepCountHistory.push(this.getStepCount());
        this.typeSavingMode = typeSavingMode;
    }

    getCountHistory() {
        return [...this.stepCountHistory];
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

    getStart() {
        return this.knownSolution.getStart();
    }

    getStepCount() {
        return this.knownSolution.numSteps();
    }

    getTarget() {
        return this.knownSolution.getTarget();
    }

    getWordLength(wordNum) {
        return this.knownSolution.getWordLength(wordNum);
    }

    isSolved() {
        const lastWord = this.solutionInProgress.getLastWord()
        if (lastWord === this.knownSolution.target) {
            return true;
        }

        const nextWords = this.dict.findNextWords(lastWord);
        return nextWords.has(this.knownSolution.target);
    }

    static isTypeSavingWord(word) {
        return word.includes(Const.CHANGE) && ! word.includes(Const.NO_CHANGE);
    }

    playWord(word) {
        // Display will validate that the word is a valid word.
        word = word.toLowerCase();

        if (this.solutionInProgress.isWordInSolution(word)) {
            this.logDebug(`${word} is already played`, "game");
            return Const.DUPLICATE;
        }

        let lastWordPlayed = this.solutionInProgress.getLastWord();
        if (! this.dict.findNextWords(lastWordPlayed).has(word)) {
            this.logDebug(`${word} is not one step from ${lastWordPlayed}`, "game");
            return Const.NOT_ONE_STEP;
        }

        // If user gave the next word that was in the current solution,
        // just add that word to the solution in progress and we're done.
        let nextStep = this.solutionInProgress.numSteps() + 1;
        if (this.knownSolution.getWordByStep(nextStep) === word) {
            this.stepCountHistory.push(this.getStepCount());
            this.solutionInProgress.addWord(word);
            return Const.OK;
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
            return Const.OK;
        } else {
            // No. tell the user it's a dead end.
            return Const.DEAD_END;
        }
    }

    setTypeSavingMode(mode) {
        this.typeSavingMode = mode;
    }

    showGame() {
        let playedWords = this.solutionInProgress.getWords();
        let solutionWords = this.knownSolution.getWords();
        let resultStr = "";

        let game = []
        let wordToPush;
        for (let i = 0; i < solutionWords.length; i++) {
            if (i <= this.solutionInProgress.numSteps()) {
                wordToPush = playedWords[i];
            } else if (i == solutionWords.length - 1) {
                wordToPush = solutionWords[i];
            } else if (i == this.solutionInProgress.numSteps() + 1) {
                wordToPush = this.showUnguessedWord(solutionWords[i], solutionWords[i-1], this.typeSavingMode);
            } else {
                wordToPush = this.showUnguessedWord(solutionWords[i], solutionWords[i-1]);
            }

            // Add the "EXTRA" special character to pad the word out to the maximum length.
            for (let i = wordToPush.length; i < Const.MAX_WORD_LENGTH; i++) {
                wordToPush += Const.EXTRA;
            }
            game.push(wordToPush);
        }

        return game;
    }

    showUnguessedWord(word, previousWord, withHints=false) {
        let unguessedWord = ""
        if (word.length === previousWord.length) {
            for (let i = 0; i < word.length; i++) {
                if (word[i] === previousWord[i]) {
                    if (withHints) {
                       unguessedWord += previousWord[i];
                    } else {
                       unguessedWord += Const.NO_CHANGE;
                    }
                } else {
                    unguessedWord += Const.CHANGE;
                }
            }
        } else {
            unguessedWord = Const.NO_CHANGE.repeat(word.length);
        }

        return unguessedWord;
    }
}

export { Game };
