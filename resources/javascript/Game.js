class Game extends BaseLogger {
    static OK = "ok";
    static NOT_ONE_STEP = "Your word is not one step away from the last word.";
    static DEAD_END = "No solution from this word.";
    static DUPLICATE = "You already played that word.";

    constructor(dict, solution) {
        super();
        this.dict = dict;
        this.solution = solution;
        let firstWord = solution.getFirstWord();
        this.solutionInProgress = new Solution([firstWord], solution.target);
    }

    isSolved () {
        return this.solutionInProgress.isSolved();
    }

    playWord(word) {
        // Display will validate that the word is a valid word.

        if (this.solutionInProgress.isWordInSolution(word)) {
            return Game.DUPLICATE;
        }
    
        let lastWordPlayed = this.solutionInProgress.getLastWord();
        if (! this.dict.findNextWords(lastWordPlayed).has(word)) {
            return Game.NOT_ONE_STEP;
        }

        let nextStep = this.solutionInProgress.numSteps() + 1;
        if (this.solution.getWordByStep(nextStep) === word) {
            this.solutionInProgress.addWord(word);
            return Game.OK;
        }

        //let newSolver = new Solver(this.dict, word, this.solution.getTarget());
        //let potentialNewSolution = newSolver.solveIt(this.solutionInProgress.getWords());
        const potentialNewSolution = Solver.fastSolve(this.dict, word, this.solution.getTarget());

        if (potentialNewSolution.isSolved()) {
            this.solution = potentialNewSolution;
            this.solutionInProgress.addWord(word);
            return Game.OK;
        } else {
            return Game.DEAD_END;
        }
    }

    showGame() {
        let playedWords = this.solutionInProgress.getWords();
        let solutionWords = this.solution.getWords();
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
