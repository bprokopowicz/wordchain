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
        this.addSpaceInProgress = false;
        this.addPosition = -1;
        this.holePosition = -1;
        this.instructions = [];
        this.getDisplayInstructions(); //  sets up next expected move and position
    }

    getDisplayInstructions() {
        const CL = "Game.getDisplayInstructions";
        COV(0, CL);
        this.holePosition = -1;  // will be set if we have a WORD_AFTER_CHANGE or WORD_AFTER_ADD instruction.
        this.nextRequiredMove = null; // will be set to ADD, DELETE, or CHANGE
        this.instructions = [];
        const nPlayedWords = this.getPlayedWords().length,
              nUnplayedWords = this.getUnplayedWords().length;

        for (let i = 0; i < nPlayedWords-1; i++) {
            this.addInstructionForPlayedWord(i);
        }

        // The last played word and the first unplayed word are handled specially
        // because they determine what kind of move the user is going to be making.
        this.addInstructionForLastPlayedWord();

        if (nUnplayedWords > 0) {
            COV(2, CL);
            this.addInstructionForFirstUnplayedWord();

            for (let i = 1; i < nUnplayedWords; i++) {
                this.addInstructionForUnplayedWord(i);
            }
        }

        COV(3, CL);
        return this.instructions;
    }

    needsParLine() {
        const CL = "Game.needsParLine";
        COV(0, CL);
        return (this.instructions.length + 1 === this.gameState.getWordChainSolutionLength());
    }

    // This is called for each word in the played list, except the last one.
    addInstructionForPlayedWord(wordPosition) {
        const CL = "Game.addInstructionsForPlayedWord";
        COV(0, CL);

        const ratedMove = this.gameState.getRatedMove(wordPosition);
        const displayType = Const.PLAYED;
        const changePosition = -1;
        const thisPlayedWordIsStart = (wordPosition === 0);
        const thisPlayedWordIsTarget = (ratedMove.word === this.gameState.target);
        const moveRating = thisPlayedWordIsStart ? Const.NO_RATING : ratedMove.rating;

        Const.GL_DEBUG && this.logDebug("addInstructionForPlayedWord(", wordPosition, ")",
                "  ratedMove:", ratedMove,
                ", displayType:", displayType,
                ", changePosition:", changePosition,
                ", moveRating:", moveRating,
                ", thisPlayedWordIsStart:", thisPlayedWordIsStart,
                ", thisPlayedWordIsTarget:", thisPlayedWordIsTarget,
                "instruction");

        let displayInstruction = new DisplayInstruction(ratedMove.word, displayType, changePosition, moveRating,
            thisPlayedWordIsStart, thisPlayedWordIsTarget, this.needsParLine());

        Const.GL_DEBUG && this.logDebug("addInstructionForPlayedWord(", wordPosition, "): display instruction for", ratedMove.word, "is",
                displayInstruction, "instruction");

        this.instructions.push(displayInstruction);
    }

    // The last played word will be the start word in the first move of the game.
    // The start word is considered to be played, but it doesn't have a rating.
    addInstructionForLastPlayedWord() {
        const CL = "Game.addInstructionsForLastPlayedWord";
        COV(0, CL);

        const lastRatedMove = this.gameState.lastRatedMove();
        const lastPlayedWord = lastRatedMove.word;
        const nPlayedWords = this.getPlayedWords().length;
        const lastPlayedWordIsStart = (nPlayedWords === 1);
        const lastPlayedWordIsTarget = (this.gameState.getUnplayedWords().length === 0);
        const moveRating = (this.instructions.length == 0) ? Const.NO_RATING : lastRatedMove.rating;

        Const.GL_DEBUG && this.logDebug("addInstructionForLastPlayedWord():",
                ", lastRatedMove:", lastRatedMove,
                ", lastPlayedWord:", lastPlayedWord,
                ", lastPlayedWordIsTarget:", lastPlayedWordIsTarget,
                ", lastPlayedWordIsStart:", lastPlayedWordIsStart,
                ", moveRating:", moveRating,
                "instruction");

        var changePosition = -1; 
        var displayType;

        if (lastPlayedWordIsTarget) {
            COV(1, CL);
            displayType = Const.TARGET;
        } else {
            COV(2, CL);

            // Check to see if we are in the process of adding a space to the last played word;
            // if so then this is a PLAYED word and the following word will be a WORD_AFTER_ADD.
            if (this.addSpaceInProgress) {
                COV(3, CL);
                displayType = Const.PLAYED; 
            } else {
                COV(4, CL);

                // We're not in the process of adding a space, so we use the length of the last rated
                // (played) move and the length of this word to determine what kind of move this is.
                const unplayedWord = this.gameState.getUnplayedWord(0);
                const fromLen = lastRatedMove.word.length;
                const toLen = unplayedWord.length;

                if (toLen > fromLen) {
                    COV(5, CL);
                    displayType = Const.PLAYED_ADD;
                    this.nextRequiredMove = Const.ADD;
                } else if (toLen === fromLen) {
                    COV(6, CL);
                    displayType = Const.PLAYED_CHANGE;
                    this.nextRequiredMove = Const.CHANGE;
                    changePosition = WordChainDict.findChangedLetterLocation(lastRatedMove.word, unplayedWord);
                } else {
                    COV(7, CL);
                    displayType = Const.PLAYED_DELETE;
                    this.nextRequiredMove = Const.DELETE;
                }
            }
        }

        COV(8, CL);
        let displayInstruction = new DisplayInstruction(lastPlayedWord, displayType, changePosition, moveRating,
            lastPlayedWordIsStart, lastPlayedWordIsTarget, this.needsParLine());

        Const.GL_DEBUG && this.logDebug("addInstructionLastPlayedWord(): display instruction for",
                lastPlayedWord, "is", displayInstruction, "instruction");

        this.instructions.push(displayInstruction);
    }

    addInstructionForFirstUnplayedWord() {
        const CL = "Game.addInstructionsForFirstUnplayedWord";
        COV(0, CL);

        const lastRatedMove = this.gameState.lastRatedMove();
        const lastPlayedWord = lastRatedMove.word;
        const firstUnplayedWord = this.gameState.getUnplayedWord(0);
        const firstUnplayedWordIsStart = false;  // start word is by definition always played
        const firstUnplayedWordIsTarget = (this.gameState.getUnplayedWords().length === 1);
        const nextUnplayedWordIfAny = firstUnplayedWordIsTarget ? null : this.gameState.getUnplayedWord(1);
        const nextWordsAreSameLen = (nextUnplayedWordIfAny != null) && (firstUnplayedWord.length === nextUnplayedWordIfAny.length);
        const previousDisplayInstruction = this.instructions[this.instructions.length-1];
        const previousDisplayType = previousDisplayInstruction.displayType;

        // This will be changed if we add a hole to it.
        var displayedFirstUnplayedWord = firstUnplayedWord;

        Const.GL_DEBUG && this.logDebug("addInstructionForFirstUnplayedWord():",
                ", lastRatedMove:", lastRatedMove,
                ", lastPlayedWord:", lastPlayedWord,
                ", firstUnplayedWord:", firstUnplayedWord,
                ", firstUnplayedWordIsTarget:", firstUnplayedWordIsTarget,
                ", nextUnplayedWordIfAny:", nextUnplayedWordIfAny,
                ", nextWordsAreSameLen:", nextWordsAreSameLen,
                ", previousDisplayInstruction:", previousDisplayInstruction,
                ", previousDisplayType:", previousDisplayType,
                "instruction");

        // these variables are defaults for the display instruction - they are overridden in the special cases below.
        var displayType = firstUnplayedWordIsTarget? Const.TARGET : Const.FUTURE;
        var moveRating = Const.NO_RATING;

        // Indicate which letter will need to change in this unplayed word
        // if the word after it is the same length.
        const changePosition = nextWordsAreSameLen ? 
            WordChainDict.findChangedLetterLocation(firstUnplayedWord, nextUnplayedWordIfAny) :
            -1;

        if (previousDisplayType === Const.PLAYED_ADD) {
            COV(1, CL);
            // nothing more to do.  This word is shown as a future word following the add-instruction
        } else if (previousDisplayType === Const.PLAYED_DELETE) {
            COV(2, CL);
            // nothing more to do.  This word is shown as a future word following the delete-instruction
        } else if (previousDisplayType=== Const.PLAYED_CHANGE) {
            COV(3, CL);

            // Note that we add a WORD_AFTER_CHANGE even if the word is the target.
            displayType = Const.WORD_AFTER_CHANGE;

            // Add the hole in this word-after-change. The change position is in the prior display instruction.
            // Note: changePosition is 0..word.length - 1, which is what replaceCharacterAtPositionWithHole() expects.
            const holePosition = previousDisplayInstruction.changePosition; 
            displayedFirstUnplayedWord = WordChainDict.replaceCharacterAtPositionWithHole(firstUnplayedWord, holePosition);
            this.holePosition = holePosition; // TODO clean up
        } else if (previousDisplayType === Const.PLAYED) {
            COV(4, CL);
            if (firstUnplayedWord.length > lastPlayedWord.length) {
                COV(5, CL);

                if (! this.addSpaceInProgress) {
                    console.error("this.addSpaceInProgress is false when adding display type WORD_AFTER_ADD");
                }

                // Note that we use WORD_AFTER_ADD even if the word is the target.
                displayType = Const.WORD_AFTER_ADD;

                // Add the hole where the user added space to this first unplayed word here.
                // Note: addPosition is 0..word.length, which is what insertHoleBeforePosition() expects.
                displayedFirstUnplayedWord = WordChainDict.insertHoleBeforePosition(lastPlayedWord, this.addPosition);
                this.holePosition = this.addPosition; // TODO clean up
                this.nextRequiredMove = Const.CHANGE;
            } 
        } else {
            console.error("unknown previous display type", previousDisplayType);
            return;
        }
        COV(6, CL);
        let displayInstruction = new DisplayInstruction(displayedFirstUnplayedWord, displayType, changePosition, moveRating,
                firstUnplayedWordIsStart, firstUnplayedWordIsTarget, this.needsParLine());
        Const.GL_DEBUG && this.logDebug("addInstructionForFirstUnplayedWord(): display instruction for",
                firstUnplayedWord, "is", displayInstruction, "instruction");
        this.instructions.push(displayInstruction);
    };

    // This is called for each word in the unplayed word list, except the first one (if any).
    addInstructionForUnplayedWord(wordPosition) {
        const CL = "Game.addInstructionsForUnplayedWord";
        COV(0, CL);

        const thisUnplayedWord = this.gameState.getUnplayedWord(wordPosition);
        const thisUnplayedWordIsStart = false;  // start word is by definition always played
        const thisUnplayedWordIsTarget = (wordPosition === this.gameState.getUnplayedWords().length - 1);
        const nextUnplayedWordIfAny = thisUnplayedWordIsTarget ? null : this.gameState.getUnplayedWord(wordPosition + 1);
        const nextWordsAreSameLen = (nextUnplayedWordIfAny != null) && (thisUnplayedWord.length === nextUnplayedWordIfAny.length);

        Const.GL_DEBUG && this.logDebug("addInstructionForUnplayedWord(", wordPosition, 
                "), thisUnplayedWord:", thisUnplayedWord,
                ", thisUnplayedWordIsTarget:", thisUnplayedWordIsTarget,
                ", nextUnplayedWordIfAny:", nextUnplayedWordIfAny,
                ", nextWordsAreSameLen:", nextWordsAreSameLen,
                "instruction");

        // these variables are defaults for the display instruction - they are overridden in the special cases below.
        var displayType = Const.FUTURE;
        var moveRating = Const.NO_RATING;
        var changePosition = -1;

        if (thisUnplayedWordIsTarget) {
            COV(1, CL);
            displayType = Const.TARGET;
        } else {
            COV(2, CL);
            if (nextWordsAreSameLen) {
                COV(3, CL);
                changePosition = WordChainDict.findChangedLetterLocation(thisUnplayedWord, nextUnplayedWordIfAny);
            }
        }

        COV(4, CL);
        let displayInstruction = new DisplayInstruction(thisUnplayedWord, displayType, changePosition, moveRating,
            thisUnplayedWordIsStart, thisUnplayedWordIsTarget, this.needsParLine());

        Const.GL_DEBUG && this.logDebug("addInstructionForUnplayedWord(", wordPosition, "): display instruction for",
                thisUnplayedWord, "is", displayInstruction, "instruction");

        this.instructions.push(displayInstruction);
    }

    addWordIfExists(word) {
        const CL = "Game.addWordIfExists";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("Game.addWordIfExists trying to add", word, "game");
        let result = Const.NOT_A_WORD;
        if (this.gameState.dictionary.isWord(word) || this.scrabbleDictionary.isWord(word)) {
            COV(1, CL);
            result = this.gameState.addWord(word);
        } 
        COV(2, CL);
        return result;
    }

    /* addPosition is from 0 to last word played's length
     * 
     * We record the position but don't adjust the state of the game.  We will update the game state if/when the user
     * plays a valid letter. 
     * - Returns true if no error
     * - Returns null on error (e.g. unexpected position)
     */

    playAdd(addPosition) {
        const CL = "Game.addPosition";
        if (this.nextRequiredMove != Const.ADD) {
            console.error("playing ADD but expected:", this.nextRequiredMove);
        }
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("playAdd(): addPosition:", addPosition, "this.gameState",
                this.gameState.toStr(), "game");

        let oldWord = this.lastPlayedWord();
        if ((addPosition < 0) || (addPosition > oldWord.length)) {
            console.error("Game.addPosition(): returning BAD_LETTER_POSITION");
            return Const.BAD_LETTER_POSITION;
        }
        this.addPosition = addPosition;
        this.addSpaceInProgress = true;
        this.getDisplayInstructions(); // updates state of game with next expected change location
        return Const.GOOD_MOVE; 
    }

    /* playDelete  deletePosition is 0..word.length-1
     * returns true if resulting word is in dictionary; false otherwise
     * returns null on other error (e.g. unexpected position)
     */
    playDelete(deletePosition) {
        const CL = "Game.playDelete";
        if (this.nextRequiredMove != Const.DELETE) {
            console.error("playing DELETE but expected:", this.nextRequiredMove);
        }
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("playDelete() position", deletePosition, "this.gameState:",
                this.gameState.toStr(), "game");

        let oldWord = this.lastPlayedWord();
        if ((deletePosition < 0) || (deletePosition >= oldWord.length)) {
            // Note: this is actually an error, but we have a test that verifies it,
            // so logging with logDebug() instead of console.error() here. 
            COV(1, CL);
            Const.GL_DEBUG && this.logDebug("bad adjusted delete position", deletePosition, "game")
            return Const.BAD_LETTER_POSITION;
        }

        let newWord = WordChainDict.deleteLetter(oldWord, deletePosition);
        Const.GL_DEBUG && this.logDebug("Game.playDelete(): ", oldWord, "becomes", newWord, "game");
        COV(2, CL);
        const result = this.addWordIfExists(newWord);
        this.getDisplayInstructions(); // updates state of game!
        return result;
    }

    /* playLetter
     * letterPosition given is 1 to word.length
     * If we are in the process of inserting a letter, this.addSpaceInProgress will be true.
     * We need that only so that the resulting word here grows by one before changing the letter.
     *
     * Returns true if resulting word is in dictionary; false otherwise
     */

    playLetter(letterPosition, letter) {
        const CL = "Game.playLetter";
        COV(0, CL);
        if (this.nextRequiredMove != Const.CHANGE) {
            console.error("playing CHANGE but expected:", this.nextRequiredMove);
        }
        if (letterPosition != this.holePosition) {
            console.error("***** playLetter() letter:", letter, "letterPosition:", letterPosition, "this.holePosition:", this.holePosition, "this.addPosition:", this.addPosition);
        }

        Const.GL_DEBUG && this.logDebug("Game.playLetter(): letterPosition:", letterPosition, ", letter:", letter,
                "addSpaceInProgress?", this.addSpaceInProgress, "at position:", this.addPosition,
                "this.gameState", this.gameState, "game");
        Const.GL_DEBUG && this.logDebug("steps played: ", this.gameState.getPlayedWordsAsString(), "game");

        const oldWord = this.lastPlayedWord();
        var oldWordModified = oldWord;
        if (this.addSpaceInProgress) {
            // create the next word with a hole in oldWord at the location of the space added (0 to oldWord.length);
            COV(1, CL);
            this.addSpaceInProgress = false;
            oldWordModified = WordChainDict.insertHoleBeforePosition(oldWord, letterPosition);
            Const.GL_DEBUG && this.logDebug("playLetter() added space to old word ", oldWord, "giving",  oldWordModified, "game");
        }

        // construct the new word, replacing the letter at letterPosition with 'letter'.  It was a letter for CHANGE, and '?' for ADD.
        const newWord = WordChainDict.replaceCharacterAtPosition(oldWordModified, letter, letterPosition);

        var result;
        if (oldWord == newWord) {
            COV(2, CL);
            result = Const.PICK_NEW_LETTER;
        } else {
            COV(3, CL);
            Const.GL_DEBUG && this.logDebug("Game.playLetter(): ", oldWord, "becomes", newWord, "game");
            result = this.addWordIfExists(newWord)
        }
        this.getDisplayInstructions();
        return result;

        COV(4, CL);
    }

    /////////
    // pass-throughs to GameState
    /////////

    // Returns the number of extra steps, 0..N
    getNormalizedScore() {
        const CL = "Game.getNormalizedScore";
        COV(0, CL);

        if (!this.isOver()) {
            console.error("GameState.getNormalizedScore() called before game is over");
            return 1000;
        }

        return this.gameState.getNormalizedScore();
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

    getPlayedWords() {
        const CL = "Game.getPlayedWords";
        COV(0, CL);
        return this.gameState.ratedMoves;
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

    showNextMove() {
        const CL = "Game.showNextMove";
        COV(0, CL);
        // plays the next word in the solution for the player.  The move is rated as SHOWN_MOVE
        return this.gameState.showNextMove();
    }

    // Finishes the game. Used in testing.

    finishGame() {
        const CL = "Game.finishGame";
        COV(0, CL);
        // play the remaining steps for the user.
        this.gameState.finishGame();
    }

    isOver() {
        const CL = "Game.isOver";
        COV(0, CL);
        let res = this.gameState.isOver();
        Const.GL_DEBUG && this.logDebug("Game.isOver() returns:", res, /* "gameState: ", this.gameState.toStr(),*/ "game");
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
        this.getDisplayInstructions(); // now required for proper game state 
        Const.GL_DEBUG && this.logDebug("DailyGame.constuctor() just called Game.constructor()", "game");
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

    dailyGameIsBroken() {
        const CL = "DailyGame.dailyGameIsBroken";
        COV(0, CL);
        return this.gameState.dailyGameIsBroken();
    }
}

class PracticeGame extends Game {

    constructor(dict=new WordChainDict()) {
        const CL = "PracticeGame.constructor";
        COV(0, CL);
        let gameState = PracticeGameState.factory(dict);
        super(gameState);
        Const.GL_DEBUG && this.logDebug("PracticeGame.constuctor() just called Game.constructor()", "game");
    }

    nextGame() {
        const CL = "PracticeGame.nextGame";
        COV(0, CL);
        let result = null;
        Const.GL_DEBUG && this.logDebug("PracticeGame.nextGame() gameState was", this.gameState,  "game");
        if (! this.gamesRemaining()) {
            COV(1, CL);
            Const.GL_DEBUG && this.logDebug("PracticeGame.nextGame() no games remaining",  "game");
        } else {
            COV(2, CL);
            let nGamesRemaining = this.gamesRemaining();
            // get a fresh game and update its gamesRemaining
            Persistence.clearPracticeGameState2(); 
            let newPracticeGame = new PracticeGame(); // will be from scratch after clearing game state.
            newPracticeGame.gameState.gamesRemaining = nGamesRemaining;
            newPracticeGame.gameState.persist();
            Const.GL_DEBUG && this.logDebug("PracticeGame.nextGame() new gameState is", newPracticeGame.gameState,  "game");
            result = newPracticeGame;
        }

        COV(3, CL);
        return result;
    }

    //// 
    // Pass-throughs to GameState, called from the Display classes.

    // returns the number of practice games remaining
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
