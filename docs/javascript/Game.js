import { DisplayInstruction } from './DisplayInstruction.js';
import { Solver, Solution} from './Solver.js';
import { WordChainDict, scrabbleWordList } from './WordChainDict.js';
import * as Const from './Const.js';
import { GameState, DailyGameState, PracticeGameState } from './GameState.js';
import { Persistence } from './Persistence.js';
import { BaseLogger } from './BaseLogger.js';
import { COV } from './Coverage.js';

class Game extends BaseLogger {

    constructor(gameState) {
        const CL = "Game.constructor";
        COV(0, CL);
        super(); // BaseLogger
        this.gameState = gameState;
        Const.GL_DEBUG && this.logDebug("Game.constructor(): start:", gameState.start, "target:", gameState.target, "game");
        this.scrabbleDictionary = new WordChainDict(scrabbleWordList);
    }

    // This function returns a list to display all the steps of the puzzle
    // for ONE MOVE. This function is called every time the user makes a move.
    //
    // Some important things to note ...
    //
    // Suppose the user is supposed to change a letter because the next
    // word has the same length. The instructions will be something like the
    // following, where * indicates the active word (yellow background).
    //
    //     played, change*,  change-next,  future,  future
    //     (change word has ALL the letters in the active word -- no hole ('?');
    //     that's in the change-next word -- we'll call this kind of change a ChangeNoAdd)
    //
    // Let's say after the user selects a letter to play the change move, the
    // user is supposed to add a letter; the instructions become:
    //
    //     played, played,   add*,         future,  future
    //
    // In other words change/change-next has become played/add. Remember that an
    // add move is a two-interaction process, i.e. two calls to this function;
    // the second one comes after the user clicks a "+" and the instructions become:
    //
    //     played, played,   played,       change*,  future
    //     (change word has "hole" ('?') in the active word -- we'll call this kind
    //     of change a ChangeAdd.
    //
    // In other words, add/future has become played/change ... and there
    // is no need for a change-next, because in this case (after an add move)
    // the change word already has the '?'.

    getDisplayInstructions() {
        const CL = "Game.getDisplayInstructions";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("played so far: " + this.gameState.getPlayedWordsAsString(), "instruction");
        Const.GL_DEBUG && this.logDebug("remaining unplayed: " + this.gameState.getUnplayedWordsAsString(), "instruction");

        let instructions = [];

        // First add all the played words except the last one (the active one).
        // This includes the start word if other words have been played.
        // But if only the start word is played, it appears as the active word, next.
        const nPlayedWords = this.gameState.ratedMoves.length;
        for (let i = 0; i < nPlayedWords-1; i++) {
            instructions.push(this.instructionForPlayedWord(i));
        }

        // Now add the active word if we're still working, or the last penalty if we lost.
        // But, if the last played word is the target, then we don't add any instruction 
        // for it here, and add it below with instructionForTargetWord();
        if (this.lastPlayedWord() != this.gameState.target) {
            COV(1, CL);
            instructions.push(this.instructionForLastPlayedWord());
        }

        // Now we have to handle the next word after the active one
        // specially if the active one is a change move.  
        let lastDisplayInstruction = instructions[instructions.length - 1],
            // Is the user's action a change?
            actionIsChange = lastDisplayInstruction.displayType === Const.CHANGE,
            // What was the last played word?
            lastWord = lastDisplayInstruction.word,
            // By default, the index into unplayed words of the first future step to generate is 0.
            firstFutureStep = 0;

        // Is this a change move and the next step is NOT the target
        // (i.e. we have another move to make)?
        if (actionIsChange && this.gameState.unplayedWords.length > 1) {
            COV(2, CL);

            // If the active word has no "hole", then the last move was a ChangeNoAdd.
            let isChangeNoAdd = ! GameState.wordHasHole(lastWord);

            if (isChangeNoAdd) {
                COV(3, CL);
                // Add a change-next instruction. Note that we still have this word with
                // no hole at the beginning of our remainingSteps list, so we'll need to
                // skip it.
                instructions.push(this.instructionForChangeNextWord(lastDisplayInstruction.changePosition));
            }
            // Else we have a ChangeAdd -- in this case we have put the word in playedList
            // (it's the one we processed previously, whose instruction we now have in
            // lastDisplayInstrucction) *and* it's still the first one in the remainingSteps
            // list, which we have to skip because we've already handled it.

            // We've handled the first word on remainingSteps already, so start at 1.
            firstFutureStep = 1;
        }

        // Now add instruction for the remaining (future) words, if any, except the target
        for (let i = firstFutureStep; i < this.gameState.unplayedWords.length-1; i++) {
            instructions.push(this.instructionForFutureWord(i));
        }

        // Finally, add an instruction for the target.
        instructions.push(this.instructionForTargetWord());

        Const.GL_DEBUG && this.logDebug("display instructions: ", instructions, "game");
        COV(4, CL);
        return instructions;
    }

    instructionForPlayedWord(stepIndex) {
        const CL = "Game.instructionForPlayedWord";
        COV(0, CL);
        const ratedMove = this.gameState.getRatedMove(stepIndex);
        Const.GL_DEBUG && this.logDebug("  instructionForPlayedWord() step", stepIndex, "word", ratedMove.word, "instruction");
        const changePosition = -1;
        return new DisplayInstruction(ratedMove.word, Const.PLAYED, changePosition, ratedMove.rating);
    }

    instructionForChangeNextWord(changePosition) {
        const CL = "Game.instructionsForChangeNextWord";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("  instructionForChangeNextWord() changePosition", changePosition, "instruction");
        // we show next word after a change with the letters visible
        // exept the changing letter.
        const changeNextWord = this.gameState.getUnplayedWord(0),
              nextFutureWord = this.gameState.getUnplayedWord(1),
              moveRating = Const.OK,
              index = changePosition - 1,
              changeWordWithHole = changeNextWord.substring(0, index) + '?' + changeNextWord.substring(index + 1);

        let displayInstruction = this.instructionForPlayingFromWordToWord(changeNextWord, nextFutureWord, moveRating);

        // This is more than a little kludgey ... GameDisplay needs to display
        // the Change Next instruction word with the hole, but it needs the
        // complete word for persistence. So we're going to add a field,
        // wordWithHole so we can achieve this.
        displayInstruction.wordWithHole = changeWordWithHole;
        displayInstruction.displayType = Const.CHANGE_NEXT;
        return displayInstruction;
    }

    instructionForFutureWord(stepIndex) {
        const CL = "Game.instructionsForFutureWord";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("  instructionForFutureWord() stepIndex", stepIndex, "instruction");
        // we show hints in the future words that require a single letter-change to the next word
        const futureWord = this.gameState.getUnplayedWord(stepIndex);
        const nextFutureWord = this.gameState.getUnplayedWord(stepIndex+1);
        const moveRating = Const.OK;
        let displayInstruction = this.instructionForPlayingFromWordToWord(futureWord, nextFutureWord, moveRating);
        displayInstruction.displayType = Const.FUTURE;
        return displayInstruction;
    }

    instructionForLastPlayedWord() {
        const CL = "Game.instructionsForLastPlayedWord";
        COV(0, CL);
        // we are displaying the last played word, which is the active word.  We give instructions for
        // how to go from that word to the first word in the remaining steps.
        // UNLESS, the last played word is the last mistake.

        let lastRatedMove = this.gameState.lastRatedMove();
        Const.GL_DEBUG && this.logDebug("  instructionForLastPlayedWord() lastRatedMove", lastRatedMove.word, "instruction");
        let [lastWord, moveRating] = [lastRatedMove.word, lastRatedMove.rating],
            result = null;
        if (this.isLoser()) {
            COV(1, CL);
            // the game is a failure, and this is the last mistake
            let changePosition = -1; // not used
            result = new DisplayInstruction(lastWord, Const.PLAYED, changePosition, moveRating);
        } else if (GameState.wordHasHole(lastWord)) {
            COV(2, CL);
            // after user clicks plus somewhere, the list of played words includes the last word played with a hole
            // in it where the user clicked '+'.  This word with a hole is what we will return to the display to show.
            // the last word in the played list is the word with a hole. Note that we also still have the word
            // in the list of remaining words.
            let indexOfHole = GameState.locationOfHole(lastWord);
            result = new DisplayInstruction(lastWord, Const.CHANGE, indexOfHole+1, moveRating);
        } else {
            COV(3, CL);
            let nextWord = this.gameState.getUnplayedWord(0);
            result = this.instructionForPlayingFromWordToWord(lastWord, nextWord, moveRating);
        }

        COV(4, CL);
        return result;
    }

    // this method is for displaying the target, either as Const.TARGET if not played yet,
    // or Const.PLAYED if the game is either solved or lost.
    // moveRating is Const.OK unless the game is lost; then it is Const.WRONG_MOVE

    instructionForTargetWord() {
        const CL = "Game.instructionsForTargetWord";
        COV(0, CL);
        let targetWord = this.gameState.target;
        Const.GL_DEBUG && this.logDebug("  instructionForTargetWord() targetWord", targetWord, "instruction");
        let changePosition=-1; // not used - there is no change FROM target to something
        let displayType = Const.TARGET; // unless the game is over; then it is PLAYED
        let moveRating = Const.OK; // unless the game is over and we lost; then it is WRONG_MOVE
        if (this.isOver()) {
            COV(1, CL);
            displayType = Const.PLAYED;
            if (!this.isWinner()) {
                COV(2, CL);
                moveRating = Const.WRONG_MOVE;
            }
        }
        COV(3, CL);
        return new DisplayInstruction(targetWord, displayType, changePosition, moveRating);
    }

    // how to display the previous word, which needs to be changed, to give the next word.
    instructionForPlayingFromWordToWord(prevWord, nextWord, lastWordMoveRating) {
        const CL = "Game.instructionsForPlayingFromWordToWord";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("      instructionForPlayingFromWordToWord()",  prevWord, nextWord, "instruction");
        let oneStepTransformation = Solver.getTransformationStep(prevWord, nextWord);
        if (oneStepTransformation === null) {
            throw new Error (`can't get from ${prevWord} to ${nextWord} in one step`);
        }
        let [operation, position, letter] = oneStepTransformation;
        if ((operation == Const.ADD) || (operation == Const.DELETE)) {
            COV(1, CL);
            // DisplayInstruction for ADD/DELETE sets position to zero, which the GameDisplay interprets as
            // no cell should be highlighted
            position = 0;
        }
        Const.GL_DEBUG && this.logDebug("      instructionForPlayingFromWordToWord() returns:",
                prevWord, operation, lastWordMoveRating, "instruction");
        COV(2, CL);
        return new DisplayInstruction(prevWord, operation, position, lastWordMoveRating);
    }

   addWordIfExists(word) {
        const CL = "Game.addWordIfExists";
        COV(0, CL);
        let result = Const.NOT_A_WORD;
        if (this.gameState.dictionary.isWord(word) || this.scrabbleDictionary.isWord(word)) {
            COV(1, CL);
            result = this.gameState.addWord(word);
        }

        COV(2, CL);
        return result;
    }


    // the GUI needs to know if a played word was acceptable (OK, GENIUS_MOVE, SCRABBLE_WORD, DODO_MOVE, or WRONG_MOVE) vs
    // invalid (NOT_A_WORD or technical problems like BAD_POSITION)
    static moveIsValid(moveRating) {
        const CL = "Game.moveIsValid";
        COV(0, CL);
        return (moveRating == Const.OK) || (moveRating == Const.GENIUS_MOVE) || (moveRating == Const.SCRABBLE_WORD) ||
               (moveRating == Const.WRONG_MOVE) || (moveRating == Const.DODO_MOVE) || (moveRating == Const.SHOWN_MOVE);
    }

    // addPosition is from 0 to last word played's length
    // This adds a word-with-a-hole-in-it to the played steps so far.
    // Then, when displaying the last word given (the action word)
    // it should have n+1 letters, one of which is the HOLE character.
    // And it should be compared to the first remaining step.
    // - Returns true if no error
    // - Returns null on error (e.g. unexpected position)
    playAdd(addPosition) {
        const CL = "Game.addPosition";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("playAdd(): addPosition:", addPosition, "this.gameState",
                this.gameState.toStr(), "game");
        let oldWord = this.lastPlayedWord();
        if ((addPosition < 0) || (addPosition > oldWord.length)) {
            return Const.BAD_LETTER_POSITION;
        }
        return this.gameState.addSpace(addPosition);
    }

    // deletePosition is 1 to word.length
    // returns true if resulting word is in dictionary; false otherwise
    // returns null on other error (e.g. unexpected position)
    playDelete(deletePosition) {
        const CL = "Game.playDelete";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("playDelete() position", deletePosition, "this.gameState:",
                this.gameState.toStr(), "game");
        let oldWord = this.lastPlayedWord();
        // adjust to zero-based
        deletePosition -= 1;
        if ((deletePosition < 0) || (deletePosition >= oldWord.length)) {
            Const.GL_DEBUG && this.logDebug("bad adjusted delete position", deletePosition, "game")
            return Const.BAD_POSITION;
        }
        let newWord = oldWord.substring(0,deletePosition) + oldWord.substring(deletePosition+1);
        Const.GL_DEBUG && this.logDebug("Game.playDelete(): ", oldWord, "becomes", newWord, "game");
        return this.addWordIfExists(newWord);
    }

    // letterPosition given is 1 to word.length
    // Returns true if resulting word is in dictionary; false otherwise
    playLetter(letterPosition, letter) {
        const CL = "Game.playLetter";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("Game.playLetter(): letterPosition:", letterPosition, ", letter:", letter,
                "this.gameState", this.gameState, "game");
        Const.GL_DEBUG && this.logDebug("steps played: ", this.gameState.getPlayedWordsAsString(), "game");
        letterPosition -= 1;
        let oldWord = this.lastPlayedWord();
        let newWord = oldWord.substring(0,letterPosition) + letter + oldWord.substring(letterPosition+1);
        if (GameState.wordHasHole(oldWord)) {
            this.gameState.removeLastPlayedWord();
        }
        Const.GL_DEBUG && this.logDebug("Game.playLetter(): ", oldWord, "becomes", newWord, "game");
        return this.addWordIfExists(newWord)
    }

    /////////
    // pass-throughs to GameState
    /////////

    // Returns the number of actually played wrong moves, including dodo moves, and shown moves.
    numPenalties() {
        const CL = "Game.numPenalties";
        COV(0, CL);
        return this.gameState.numPenalties();
    }
 
    getOriginalSolutionWords() {
        const CL = "Game.getOriginalSolutionWords";
        COV(0, CL);
        const wordList = this.gameState.initialSolution;
        return this.listAsStringWithBreaks(wordList);
    }

    getUserSolutionWords() {
        const CL = "Game.getUserSolutionWords";
        COV(0, CL);
        const wordList = this.gameState.getPlayedWordList();
        return this.listAsStringWithBreaks(wordList);
    }

    getUnplayedWords() {
        const CL = "Game.getUnplayedWords";
        COV(0, CL);
        return this.gameState.unplayedWords;
    }

    listAsStringWithBreaks(wordList) {
        const CL = "Game.listAsStringWithBreaks";
        COV(0, CL);
        let res = "";
        for (let i = 0; i < wordList.length-1; i++) {
            res = res + wordList[i]+ '⇒';
            // add a break tag every N words
            if ((i+1) % Const.DISPLAY_SOLUTION_WORDS_PER_LINE == 0) {
                COV(1, CL);
                res = res + "<br>";
            }
        }
        // now, add the last word, with no trailing separator
        COV(2, CL);
        return res + wordList[wordList.length-1];
    }


    // Finishes the game. When getNextDisplayInstruction() is called after this,
    // the game can be displayed just the same as if a user finished with all
    // correct moves.

    finishGame() {
        const CL = "Game.finishGame";
        COV(0, CL);
        // play the remaining steps for the user.  
        this.gameState.finishGame();
    }

    // reveal any unplayed words.  This moves the remaining steps into the played steps and labels
    // them as SHOWN_MOVE
    showUnplayedMoves() {
        const CL = "Game.showUnplayedMoves";
        COV(0, CL);
        this.gameState.showUnplayedMoves();
    }

    showNextMove() {
        const CL = "Game.showNextMove";
        COV(0, CL);
        // plays the next word in the solution for the player.  The move is rated as
        // SHOWN_MOVE
        return this.gameState.showNextMove();
    }

    isOver() {
        const CL = "Game.isOver";
        COV(0, CL);
        let res = this.gameState.isOver();
        Const.GL_DEBUG && this.logDebug("Game.isOver() returns:", res, "gameState: ", this.gameState.toStr(), "game");
        return res;
    }

    isWinner() {
        const CL = "Game.isWinner";
        COV(0, CL);
        return this.gameState.isWinner();
    }

    isLoser() {
        const CL = "Game.isLoser";
        COV(0, CL);
        return this.gameState.isLoser();
    }
    
    lastPlayedWord() {
        const CL = "Game.lastPlayedWord";
        COV(0, CL);
        return this.gameState.lastPlayedWord();
    }
}

class DailyGame extends Game {

    constructor(dict=new WordChainDict()) {
        const CL = "DailyGame.constructor";
        COV(0, CL);
        let gameState = DailyGameState.factory(dict);
        super(gameState);
    }

    isOld() {
        const CL = "DailyGame.isOld";
        COV(0, CL);
        return this.gameState.gameIsOld();
    }
    
    // returns true if the current daily game was constructed as new, not recovered from a current daily game
    isNewDailyGame() {
        const CL = "DailyGame.isNewDailyGame";
        COV(0, CL);
        return this.gameState.isNewDailyGame();
    }

    isBroken() {
        const CL = "DailyGame.isBroken";
        COV(0, CL);
        return this.gameState.gameIsBroken();
    }
}

class PracticeGame extends Game {

    constructor(dict=new WordChainDict()) {
        const CL = "PracticeGame.constructor";
        COV(0, CL);
        let gameState = PracticeGameState.factory(dict);
        super(gameState);
    }

    nextGame() {
        const CL = "PracticeGame.nextGame";
        COV(0, CL);
        let result = null;
        if (! this.gamesRemaining()) {
            COV(1, CL);
            Const.GL_DEBUG && this.logDebug("PracticeGame.nextGame() no games remaining",  "game");
        } else {
            COV(2, CL);
            let nGamesRemaining = this.gamesRemaining();
            // get a fresh game and update its gamesRemaining
            Persistence.clearPracticeGameState2(); 
            let practiceGame = new PracticeGame(); // will be from scratch after clearing game state.
            practiceGame.gameState.gamesRemaining = nGamesRemaining;
            practiceGame.gameState.persist();
            result = practiceGame;
        }

        COV(3, CL);
        return result;
    }

    //// 
    // Pass-throughs to GameState, called from the Display classes.

    gamesRemaining() {
        const CL = "PracticeGame.gamesRemaining";
        COV(0, CL);
        return this.gameState.gamesRemaining;
    }

    resetPracticeGameCounter() {
        const CL = "PracticeGame.resetPracticeGameCounter";
        COV(0, CL);
        this.gameState.resetPracticeGameCounter();
    }
}

export { Game, DailyGame, PracticeGame };
