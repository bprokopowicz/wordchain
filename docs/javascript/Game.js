import { DisplayInstruction } from './DisplayInstruction.js';
import { Solver, Solution, SolutionStep} from './Solver.js';
import { WordChainDict, scrabbleWordList } from './WordChainDict.js';
import * as Const from './Const.js';
import { BaseLogger } from './BaseLogger.js';

class Game extends BaseLogger {

    // stepsOfSolution is a list of tuples of (word, wasPlayed, moveRating).
    // This needs to be converted to a list of SolutionStep objects
    // We maintain the played steps [start, word1, word2], target
    // and the remaining steps to target  [word3, word4, ...], target

    // optionally pass in the dictionary, for testing
    constructor(startWord, targetWord, stepsOfSolution, dict=new WordChainDict()) {
        super();
        Const.GL_DEBUG && this.logDebug("Game.constructor(): startWord:", startWord, ", targetWord:", targetWord, "game");
        this.startWord = startWord.toUpperCase();
        this.targetWord = targetWord.toUpperCase();
        this.dictionary = dict;
        this.scrabbleDictionary = new WordChainDict(scrabbleWordList);
        if (!stepsOfSolution || stepsOfSolution.length == 0) {
            Const.GL_DEBUG && this.logDebug("Constructing game from beginning", "game");
            this.playedSteps = Solution.newEmptySolution(this.startWord, this.targetWord);
            this.remainingSteps = Solver.solve(this.dictionary, this.startWord, this.targetWord);
            // remove the start word from the remaining steps.
            this.remainingSteps.removeFirstStep();
        } else {
            // we have a list of all the words, as tuples (word, wasPlayed, moveRating)
            Const.GL_DEBUG && this.logDebug("Re-constructing game from existing steps:", stepsOfSolution.join(), "game");
            let justThePlayedSteps = stepsOfSolution.filter((tup)=>tup[1]).map((tup)=> new SolutionStep(tup[0], tup[1], tup[2]));
            this.playedSteps = new Solution(justThePlayedSteps, this.targetWord);

            let justTheUnplayedSteps = stepsOfSolution.filter((tup)=>!tup[1]).map((tup)=> new SolutionStep(tup[0], tup[1], tup[2]));
            this.remainingSteps = new Solution(justTheUnplayedSteps, this.targetWord);

        }
        Const.GL_DEBUG && this.logDebug("Game constructed: ", this, "game");
    }

    getOriginalSolutionWords() {
        // TRICKY EDGE CASE HERE:
        // this.dictionary may have been modified since it was loaded, IF the user
        // played a scrabble-only word.  From then, this scrabble-only word is in the standard dictionary
        // to allow us to replay the scrabble word for back-tracking.  See testGameRequiringScrabbleWordReplay

        const originalDict = new WordChainDict();
        const bestSolution = Solver.solve(originalDict, this.startWord, this.targetWord);
        const wordList =  bestSolution.getSolutionWords()
        return this.listAsStringWithBreaks(wordList);
    }

    getUserSolutionWords() {
        const userSolution = this.playedSteps;
        const wordList =  userSolution.getSolutionWords()
        return this.listAsStringWithBreaks(wordList);
    }

    listAsStringWithBreaks(wordList) {
        let res = "";
        for (let i = 0; i < wordList.length-1; i++) {
            res = res + wordList[i]+ '⇒';
            // add a break tag every N words
            if ((i+1) % Const.DISPLAY_SOLUTION_WORDS_PER_LINE == 0) {
                res = res + "<br>";
            }
        }
        // now, add the last word, with no trailing separator
        return res + wordList[wordList.length-1];
    }

    // Choose a random start/target that has a solution between
    // Const.PRACTICE_STEPS_MINIMUM and Const.PRACTICE_STEPS_MAXIMUM
    // steps. Returns an array: [startWord, targetWord].
    static getPracticePuzzle() {
        let min = 0;
        let max = Const.PRACTICE_START_WORDS.length;
        let rand = Math.floor(Math.random() * max); // 0..max-1 inclusive
        let dictionary = new WordChainDict();
        let logger = new BaseLogger();

        let startWord = Const.PRACTICE_START_WORDS[rand];
        let puzzles = Solver.findPuzzles(dictionary, startWord,
              Const.PRACTICE_TARGET_WORD_LEN,
              Const.PRACTICE_REQ_WORD_LEN_1, Const.PRACTICE_REQ_WORD_LEN_2,
              Const.PRACTICE_STEPS_MINIMUM, Const.PRACTICE_STEPS_MAXIMUM,
              Const.PRACTICE_DIFFICULTY_MINIMUM, Const.PRACTICE_MIN_CHOICES_PER_STEP);

        if (puzzles.length > 0) {
            rand = Math.floor(Math.random() * puzzles.length);
            Const.GL_DEBUG && logger.logDebug("found",  puzzles.length, "puzzles starting with", startWord, "Choosing #", rand, "game");
            let puzzle = puzzles[rand];
            Const.GL_DEBUG && logger.logDebug("selected random puzzle: " + puzzle.toStr(), "game");
            return [puzzle.getStart(), puzzle.getLastWord()];
        } else {
            console.error("no practice puzzles found with start word", startWord);
            return ["dog", "bite"];
        }

    }

    // Finishes the game. When getNextDisplayInstruction() is called after this,
    // the game can be displayed just the same as if a user finished with all
    // correct moves.
    finishGame() {
        // play the remaining steps for the user
        const isPlayed = true;
        const moveRating = Const.OK;
        for (let step of this.remainingSteps.getSolutionSteps()) {
            this.playedSteps.addWord(step.word, isPlayed, moveRating);
        }
        this.remainingSteps.removeAllSteps();
    }

    // utility to get the remaining steps in a way that tests can play them
    // returns a list of tuples: (action, position, letter) 
    // action is ADD, CHANGE, or DELETE,
    // position is an integer
    // letter is the letter to apply the change or add to.

    // returns a list to display all the steps of the puzzle.
    getDisplayInstructions() {
        Const.GL_DEBUG && this.logDebug("played so far: " + this.playedSteps.toStr(), "game");
        Const.GL_DEBUG && this.logDebug("remaining unplayed: " + this.remainingSteps.toStr(), "game");

        let instructions = [];

        // all the played words except the last one (the active one)
        // This includes the start word if other words have been played.
        // But if only the start word is played, it appears as the active word, next.
        for (let i = 0; i < this.playedSteps.numSteps(); i++) {
            instructions.push(this.instructionForPlayedWord(i));
        }

        // now the active word if we're still working
        if (this.remainingSteps.numSteps() >= 0) {
            instructions.push(this.instructionForLastPlayedWord());
        }

        // now the remaining words, if any, except the target
        for (let i = 0; i < this.remainingSteps.numSteps(); i++) {
            instructions.push(this.instructionForFutureWord(i));
        }

        // Now the target
        instructions.push(this.instructionForTargetWord());

        Const.GL_DEBUG && this.logDebug("display instructions: ", instructions, "game");
        return instructions;
    }

    instructionForPlayedWord(stepIndex) {
        const solutionStep = this.playedSteps.solutionSteps[stepIndex];
        const changePosition = -1;
        return new DisplayInstruction(solutionStep.word, Const.PLAYED, changePosition, solutionStep.moveRating);
    }

    instructionForFutureWord(stepIndex) {
        // we show hints in the future words that require a single letter-change to the next word
        // the step index needs to be adjusted to account for the unplayed steps
        const futureWord = this.remainingSteps.getNthWord(stepIndex);
        const nextFutureWord = this.remainingSteps.getNthWord(stepIndex+1);
        const moveRating = Const.OK;
        let displayInstruction = this.displayInstructionForPlayingFromWordToWord(futureWord, nextFutureWord, moveRating);
        displayInstruction.displayType = Const.FUTURE;
        return displayInstruction;
    }

    instructionForLastPlayedWord() {
        // we are displaying the last played word, which is the active word.  We give instructions for
        // how to go from that word to the first word in the remaining steps.
        // UNLESS, the last played word is the last mistake.
        let stepIndex = this.playedSteps.numSteps();
        let lastPlayedStep = this.playedSteps.solutionSteps[stepIndex];
        let lastWord = lastPlayedStep.word;  // the string itself
        let moveRating = lastPlayedStep.moveRating;
        if (this.isOver()) {
            // the game must be a failure, and this is the last mistake
            let changePosition = -1; // not used
            return new DisplayInstruction(lastWord, Const.PLAYED, changePosition, moveRating);
        } else if (Game.wordHasHole(lastWord)) {
            // after user clicks plus somewhere, the list of played words includes the last word played with a hole
            // in it where the user clicked '+'.  This word with a hole is what we will return to the display to show.
            // the last word in the played list is the word with a hole
            let indexOfHole = Game.locationOfHole(lastWord);
            return new DisplayInstruction(lastWord, Const.CHANGE, indexOfHole+1, moveRating);
        } else {
            let nextWord = this.remainingSteps.getNthWord(0);
            return this.displayInstructionForPlayingFromWordToWord(lastWord, nextWord, moveRating);
        }
    }

    // this method is for displaying the target, either as Const.TARGET if not played yet,
    // or Const.PLAYED if the game is either solved or lost.
    // moveRating is Const.OK unless the game is lost; then it is Const.WRONG_MOVE

    instructionForTargetWord() {
        let targetWord = this.remainingSteps.getTarget();
        let changePosition=-1; // not used - there is no change FROM target to something
        let displayType = Const.TARGET; // unless the game is over; then it is PLAYED
        let moveRating = Const.OK; // unless the game is over and we lost; then it is WRONG_MOVE
        if (this.isOver()) {
            displayType = Const.PLAYED;
            if (!this.isWinner()) {
                moveRating = Const.WRONG_MOVE;
            }
        }
        return new DisplayInstruction(targetWord, displayType, changePosition, moveRating);
    }

    // how to display the previous word, which needs to be changed, to give the next word.
    displayInstructionForPlayingFromWordToWord(prevWord, nextWord, lastWordMoveRating) {
        let oneStepTransformation = Solver.getTransformationStep(prevWord, nextWord);
        if (oneStepTransformation === null) {
            throw new Error (`can't get from ${prevWord} to ${nextWord} in one step`);
        }
        let [operation, position, letter] = oneStepTransformation;
        if ((operation == Const.ADD) || (operation == Const.DELETE)) {
            // DisplayInstruction for ADD/DELETE sets position to zero, which the GameDisplay interprets as
            // no cell should be highlighted
            position = 0;
        }
        return new DisplayInstruction(prevWord, operation, position, lastWordMoveRating);
    }

    // Returns the number of actually played wrong moves, including dodo moves.
    numWrongMoves() {
        return Math.min(this.playedSteps.numWrongMoves(), Const.TOO_MANY_WRONG_MOVES);
    }

    // Return true if game is over; false otherwise.
    isOver() {
        return this.playedSteps.isTargetReached() || this.numWrongMoves() >= Const.TOO_MANY_WRONG_MOVES;
    }

    // when you add a word
    // 1) solve from played word to target, using full dictionary.  This gives the remaining steps
    // 2) if the new remaining steps' length is one less than the current remaining steps, then step is correct
    // 3) add the new step (correct or not) as played to the list of played steps.
    // 4) replace the remaining steps list with the newly calculated list.
    addWordIfExists(word) {
        if (this.dictionary.isWord(word) || this.scrabbleDictionary.isWord(word)) {
            Const.GL_DEBUG && this.logDebug("Trying to play word",  word, "game");
            const isScrabbleOnlyWord = !this.dictionary.isWord(word);
            // special case: if the user plays a scrabbleOnlyWord, we add that word to the normal dictionary, so that
            // the game solver can play that word if the best solution involves back-tracking out of it
            if (isScrabbleOnlyWord) {
                Const.GL_DEBUG && this.logDebug("user played scrabble-only word: ", word, ", adding it to regular dictionary in case it is needed for backtracking", "game");
                this.dictionary.addWord(word);
            }
            if (word == this.remainingSteps.getNthWord(0)) {
                // user is adding the same word we found
                let isPlayed = true;
                let moveRating = Const.OK;
                this.playedSteps.addWord(word, isPlayed, moveRating);
                this.remainingSteps.removeFirstStep();
                return Const.OK;
            }
            // user added an unexpected word.
            // re-solve the puzzle given new word and see if the solution grew (mistake) or not (correct).
            let nCurrentRemainingSteps = this.remainingSteps.numSteps();
            let newRemainingSteps = Solver.solve(this.dictionary, word, this.remainingSteps.getTarget());
            newRemainingSteps.removeFirstStep();
            let isPlayed = true;
            let moveRating = Const.OK;
            if (newRemainingSteps.numSteps() < (nCurrentRemainingSteps-1)) {
                moveRating = Const.GENIUS_MOVE;
            } else if (newRemainingSteps.numSteps() > (nCurrentRemainingSteps)) {
                moveRating = Const.DODO_MOVE;
            } else if (newRemainingSteps.numSteps() > (nCurrentRemainingSteps-1)) {
                moveRating = Const.WRONG_MOVE;
            }
            this.remainingSteps = newRemainingSteps;
            this.playedSteps.addWord(word, isPlayed, moveRating);
            Const.GL_DEBUG && this.logDebug("After adding", word, "the played steps are:", this.playedSteps.toStr(), "game");
            Const.GL_DEBUG && this.logDebug("After adding", word, "the remaining steps are:", this.remainingSteps.toStr(), "game");
            return moveRating;
        } else {
            return Const.NOT_A_WORD;
        }
    }

    static HOLE() {return "?";}

    static locationOfHole(word) {
        return word.indexOf(Game.HOLE());
    }

    static wordHasHole(word) {
        return Game.locationOfHole(word) >= 0;
    }

    // the GUI needs to know if a played word was acceptable (OK, GENIUS_MOVE, DODO_MOVE, or WRONG_MOVE) vs invalid (NOT_A_WORD or technical
    // problems like BAD_POSITION)
    static moveIsValid(moveRating) {
        return (moveRating == Const.OK) || (moveRating == Const.GENIUS_MOVE) || (moveRating == Const.WRONG_MOVE) || (moveRating == Const.DODO_MOVE);
    }

    // addPosition is from 0 to last word played's length
    // This adds a word-with-a-hole-in-it to the played steps so far.
    // Then, when displaying the last word given (the action word)
    // it should have n+1 letters, one of which is the HOLE character.
    // And it should be compared to the first remaining step.
    // - Returns true if no error
    // - Returns null on error (e.g. unexpected position)
    playAdd(addPosition) {
        Const.GL_DEBUG && this.logDebug("playAdd(): addPosition:", addPosition, "game");
        let oldWord = this.playedSteps.getLastWord();
        if ((addPosition < 0) || (addPosition > oldWord.length)) {
            return Const.BAD_LETTER_POSITION;
        }
        // We put in a blank for where the letter hole is.
        let newWord = oldWord.substring(0,addPosition) + Game.HOLE() + oldWord.substring(addPosition);
        let isPlayed = true;
        let moveRating = Const.OK;
        this.playedSteps.addWord(newWord, isPlayed, moveRating);
        return Const.OK;
    }

    // deletePosition is 1 to word.length
    // returns true if resulting word is in dictionary; false otherwise
    // returns null on other error (e.g. unexpected position)
    playDelete(deletePosition) {
        let oldWord = this.playedSteps.getLastWord();
        Const.GL_DEBUG && this.logDebug("playDelete(): deletePosition:", deletePosition, " in: ", oldWord, "game");
        // adjust to zero-based
        deletePosition -= 1;
        if ((deletePosition < 0) || (deletePosition >= oldWord.length)) {
            Const.GL_DEBUG && this.logDebug("bad adjusted delete position", deletePosition, "game")
            return Const.BAD_POSITION;
        }
        let newWord = oldWord.substring(0,deletePosition) + oldWord.substring(deletePosition+1);
        return this.addWordIfExists(newWord);
    }

    // letterPosition given is 1 to word.length
    // returns true if resulting word is in dictionary; false otherwise
    // returns null on other error (e.g. unexpected position)
    playLetter(letterPosition, letter) {
        Const.GL_DEBUG && this.logDebug("playLetter(): letterPosition:", letterPosition, ", letter:", letter, "game");
        Const.GL_DEBUG && this.logDebug("steps played: ", this.playedSteps.toStr(), "game");
        letterPosition -= 1;
        let oldWord = this.playedSteps.getLastWord();
        let newWord = oldWord.substring(0,letterPosition) + letter + oldWord.substring(letterPosition+1);
        if (Game.wordHasHole(oldWord)) {
            this.playedSteps.removeLastStep(); // it will be replaced by the same word without the hole, below.
        }
        Const.GL_DEBUG && this.logDebug("playLetter(): new word is: ", newWord, "game");
        return this.addWordIfExists(newWord)
    }

    // reveal any unplayed words.  This moves the remaining steps into the played steps and labels
    // them as SHOWN_MOVE
    showUnplayedMoves() {
        while (this.remainingSteps.numWords() > 0) {
            this.showNextMove();
        }
    }

    showNextMove() {
        // plays the next word in the solution for the player.  The move is rated as
        // SHOWN_MOVE
        const word = this.remainingSteps.getNthWord(0),
              moveRating = Const.SHOWN_MOVE,
              isPlayed = true;

        this.playedSteps.addWord(word, isPlayed, moveRating);
        this.remainingSteps.removeFirstStep();
        return moveRating;
    }

    // Return true if the game has been won; false otherwise.
    isWinner() {
        const ret = this.playedSteps.isSolved();
        Const.GL_DEBUG && this.logDebug("Game.isWinner() - returning", ret, "game");
        return ret;
    }
}

export { Game };
