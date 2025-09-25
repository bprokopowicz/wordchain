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
    }

    getDisplayInstructions() {
        const CL = "Game.getDisplayInstructions";
        COV(0, CL);
        this.instructions = [];
        const nPlayedWords = this.gameState.ratedMoves.length,
              nUnplayedWords = this.gameState.unplayedWords.length;

        for (let i = 0; i < nPlayedWords-1; i++) {
            this.addInstructionForPlayedWord(i);
        }

        this.addInstructionForLastPlayedWord();

        if (nUnplayedWords > 0) {
            COV(1, CL);
            this.addInstructionForFirstUnplayedWord();

            for (let i = 1; i < nUnplayedWords; i++) {
                this.addInstructionForUnplayedWord(i);
            }
        }

        return this.instructions;
    }

    needsParLine() {
        const CL = "Game.needsParLine";
        COV(0, CL);
        return (this.instructions.length + 1 === this.gameState.getWordChainSolutionLength());
    }

    /*
       For each word in played list except last:
       (Start word counts as played, so in the first list
       of the game, this chunk doesn't apply.)
       - displayType = PLAYED
       - changePosition = -1 
       - If word is start word:
       - moveRating = NO_RATING
       - Else:
       - moveRating != NO_RATING
     */

    addInstructionForPlayedWord(i) {
        const CL = "Game.addInstructionsForPlayedWord";
        COV(0, CL);
        const ratedMove = this.gameState.getRatedMove(i);
        const displayType = Const.PLAYED;
        const changePosition = -1;
        const isStartWord = (i === 0);
        const moveRating = isStartWord ? Const.NO_RATING : ratedMove.rating;

        Const.GL_DEBUG && this.logDebug("addInstructionForPlayedWord(", i, ")",
                "  ratedMove:", ratedMove,
                ", displayType:", displayType,
                ", changePosition:", changePosition,
                ", moveRating:", moveRating,
                ", isStartWord:", isStartWord,
                "instruction");

        let displayInstruction = new DisplayInstruction(ratedMove.word, displayType, changePosition, moveRating, isStartWord, this.needsParLine());
        Const.GL_DEBUG && this.logDebug("addInstructionPlayedWord(", i, "): display instruction for", ratedMove.word, "is",
                displayInstruction, "instruction");
        this.instructions.push(displayInstruction);
    }

    /*
       For last played word:
       (which is start word in the first play of the game)
        - If there are no more unplayed words (last played is the target word; game is done.):
            displayType = TARGET
            changePosition = -1 
            moveRating != NO_RATING (good, genius, etc)
        - Else
            if first unplayed word is longer than lastPlayedWord:
              displayType = PLAYED_ADD
              changePosition = -1
            Else if first unplayed word is shorter than lastPlayedWord:
              displayType = PLAYED_DELETE
              changePosition = -1
            Else:
              displayType = PLAYED_CHANGE
              changePosition = location of diff between last played word and first unplayed word.
     */

    addInstructionForLastPlayedWord() {
        const CL = "Game.addInstructionsForLastPlayedWord";
        COV(0, CL);
        const lastRatedMove = this.gameState.lastRatedMove();
        const lastPlayedWord = lastRatedMove.word;
        const nPlayedWords = this.gameState.ratedMoves.length;
        const lastPlayedWordIsTarget = this.gameState.getUnplayedWords().length === 0;
        const lastPlayedWordIsStart = nPlayedWords === 1;
        const moveRating = (this.instructions.length == 0) ? Const.NO_RATING : lastRatedMove.rating;
        var changePosition = -1; 
        var displayType;

        Const.GL_DEBUG && this.logDebug("addInstructionForLastPlayedWord():",
                ", lastRatedMove:", lastRatedMove,
                ", lastPlayedWord:", lastPlayedWord,
                ", lastPlayedWordIsTarget:", lastPlayedWordIsTarget,
                ", lastPlayedWordIsStart:", lastPlayedWordIsStart,
                ", moveRating:", moveRating,
                "instruction");

        if (lastPlayedWordIsTarget) {
            COV(1, CL);
            displayType = Const.TARGET; //TODO this might be wrong.  Need tests with coverage
        } else {
            // check to see if we are in the process of adding a space to the last played word
            if (this.addSpaceInProgress) {
                COV(2, CL);
                displayType = Const.PLAYED; 
            } else {
                COV(3, CL);
                const unplayedWord = this.gameState.getUnplayedWord(0);
                const fromLen = lastRatedMove.word.length;
                const toLen = unplayedWord.length;
                if (toLen > fromLen) {
                    COV(4, CL);
                    displayType = Const.PLAYED_ADD;
                } else if (toLen === fromLen) {
                    COV(5, CL);
                    displayType = Const.PLAYED_CHANGE;
                    changePosition = WordChainDict.findChangedLetterLocation(lastRatedMove.word, unplayedWord);
                } else {
                    COV(6, CL);
                    displayType = Const.PLAYED_DELETE;
                }
            }
        }
        COV(7, CL);
        let displayInstruction = new DisplayInstruction(lastPlayedWord, displayType, changePosition, moveRating, lastPlayedWordIsStart, this.needsParLine());
        Const.GL_DEBUG && this.logDebug("addInstructionLastPlayedWord(): display instruction for",
                lastPlayedWord, "is", displayInstruction, "instruction");
        this.instructions.push(displayInstruction);
    }

    /*
        For first unplayed word:
        - If previousDisplayType is PLAYED_ADD:
          - displayType = FUTURE or TARGET
          - if the second unplayed word is same length as first unplayed word: changePosition is pos of difference between them.
          - moveRating = NO_RATING
        - Else if previousDisplayType is PLAYED_DELETE:
          - displayType = FUTURE or TARGET
          - if second unplayed word is same length as first unplayed word: changePosition is pos of difference between them.
          - moveRating = NO_RATING
        - Else if previousDisplayType is PLAYED_CHANGE:
          - displayType = WORD_AFTER_CHANGE (even if the word is the target)
          - word in instruction needs to have hole where the previous instruction (PLAYED_CHANGE) changePosition is.
          - if the second unplayed word is same length as first unplayed word: changePosition = changePosition of lastPlayedMove?
          - moveRating = NO_RATING
        - Else if previousDisplayType is PLAYED:
            - If first unplayed word is longer than last played word:
              - displayType = WORD_AFTER_ADD
              - the first unplayed word will need a hole where the space was added.  
              - if second unplayed word is same length as first unplayed word: changePosition is pos of difference between them.
              - moveRating = NO_RATING
            - Else if first unplayed word is target word: 
              - displayType = TARGET
              - changePosition = -1
              - moveRating != NO_RATING (background of cells is based on moveRating) TODO - what case is this?
            - Else:
              - displayType = FUTURE
              - if second unplayed word is same length as first unplayed word: changePosition is pos of difference between them.
              - moveRating = NO_RATING
     */

    addInstructionForFirstUnplayedWord() {
        const CL = "Game.addInstructionsForFirstUnplayedWord";
        COV(0, CL);
        const lastRatedMove = this.gameState.lastRatedMove();
        const lastPlayedWord = lastRatedMove.word;
        const firstUnplayedWord = this.gameState.getUnplayedWord(0);
        const firstUnplayedWordIsTarget = this.gameState.getUnplayedWords().length == 1;
        const firstUnplayedWordIsStart = false;  // start word is by definition always played
        const nextUnplayedWordIfAny = firstUnplayedWordIsTarget ? null : this.gameState.getUnplayedWord(1);
        const nextWordsAreSameLen = (nextUnplayedWordIfAny != null) && (firstUnplayedWord.length === nextUnplayedWordIfAny.length);
        const previousDisplayInstruction = this.instructions[this.instructions.length-1];
        const previousDisplayType = previousDisplayInstruction.displayType;

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
        const changePosition = ! nextWordsAreSameLen ? -1 :
            WordChainDict.findChangedLetterLocation(firstUnplayedWord, nextUnplayedWordIfAny);

        if (previousDisplayType === Const.PLAYED_ADD) {
            COV(1, CL);
            // nothing more to do
        } else if (previousDisplayType === Const.PLAYED_DELETE) {
            COV(2, CL);
            // nothing more to do
        } else if (previousDisplayType=== Const.PLAYED_CHANGE) {
            COV(3, CL);
            displayType = Const.WORD_AFTER_CHANGE;
            // Add the hole in this word-after-change.  The change position is in the prior display instruction.
            const holePosition = previousDisplayInstruction.changePosition; 
            displayedFirstUnplayedWord = WordChainDict.replaceCharacterAtPositionWithHole(firstUnplayedWord, holePosition);

        } else if (previousDisplayType === Const.PLAYED) {
            COV(4, CL);
            if (firstUnplayedWord.length > lastPlayedWord.length) {
                COV(5, CL);
                if (! this.addSpaceInProgress) {
                    console.error("this.addSpaceInProgress is false when adding display type WORD_AFTER_ADD");
                }
                displayType = Const.WORD_AFTER_ADD;
                // Add the hole where the user added space to this first unplayed word here;
                // Note: addPosition is 0..word.length, which is what insertHoleBeforePosition() expects.
                displayedFirstUnplayedWord = WordChainDict.insertHoleBeforePosition(lastPlayedWord, this.addPosition);
            } else if (firstUnplayedWordIsTarget) {
                // target following Const.PLAYED is only for the game being finished.  
                // TODO - I think this is impossible.  
                COV(6, CL);
                displayType = Const.TARGET;
            } else {
                COV(7, CL);
                displayType = Const.FUTURE;
            }

        } else {
            console.error("unknown previous display type", previousDisplayType);
            return;
        }
        COV(8, CL);
        let displayInstruction = new DisplayInstruction(displayedFirstUnplayedWord, displayType, changePosition, moveRating,
                firstUnplayedWordIsStart, this.needsParLine());
        Const.GL_DEBUG && this.logDebug("addInstructionForFirstUnplayedWord(): display instruction for",
                firstUnplayedWord, "is", displayInstruction, "instruction");
        this.instructions.push(displayInstruction);
    };

    /*
        For remaining unplayed words (if any):
        - If word is target:
          - displayType = TARGET
          - changePosition = -1
          - moveRating != NO_RATING (background of cells is based on moveRating)
        -Else:
         - displayType = FUTURE
         - if next word is same length: changePosition >= 0
         - moveRating = NO_RATING
     */
 
    addInstructionForUnplayedWord(i) {
        const CL = "Game.addInstructionsForUnplayedWord";
        COV(0, CL);
        const thisUnplayedWord = this.gameState.getUnplayedWord(i);
        const thisUnplayedWordIsTarget = (i === this.gameState.getUnplayedWords().length - 1);
        const nextUnplayedWordIfAny = thisUnplayedWordIsTarget ? null : this.gameState.getUnplayedWord(i + 1);
        const nextWordsAreSameLen = (nextUnplayedWordIfAny != null) && (thisUnplayedWord.length === nextUnplayedWordIfAny.length);
        const isStartWord = false;  // start word is by definition always played

        Const.GL_DEBUG && this.logDebug("addInstructionForUnplayedWord(", i, 
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
        let displayInstruction = new DisplayInstruction(thisUnplayedWord, displayType, changePosition, moveRating, isStartWord, this.needsParLine());
        Const.GL_DEBUG && this.logDebug("addInstructionForUnplayedWord(", i, "): display instruction for",
                thisUnplayedWord, "is", displayInstruction, "instruction");
        this.instructions.push(displayInstruction);
    }

    addWordIfExists(word) {
        const CL = "Game.addWordIfExists";
        COV(0, CL);
        // this.gameState.removeWordWithHoleIfNecessary();
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
     * playsA letter at the space's location.
     * - Returns true if no error
     * - Returns null on error (e.g. unexpected position)
     */

    playAdd(addPosition) {
        const CL = "Game.addPosition";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("playAdd(): addPosition:", addPosition, "this.gameState",
                this.gameState.toStr(), "game");

        let oldWord = this.lastPlayedWord();
        if ((addPosition < 0) || (addPosition > oldWord.length)) {
            return Const.BAD_LETTER_POSITION;
        }
        this.addPosition = addPosition;
        this.addSpaceInProgress = true;
        return Const.GOOD_MOVE; 
    }

    /* playDelete  deletePosition is 0..word.length-1
     * returns true if resulting word is in dictionary; false otherwise
     * returns null on other error (e.g. unexpected position)
     */
    playDelete(deletePosition) {
        const CL = "Game.playDelete";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("playDelete() position", deletePosition, "this.gameState:",
                this.gameState.toStr(), "game");
        let oldWord = this.lastPlayedWord();
        if ((deletePosition < 0) || (deletePosition >= oldWord.length)) {
            Const.GL_DEBUG && this.logDebug("bad adjusted delete position", deletePosition, "game")
                return Const.BAD_POSITION;
        }
        let newWord = oldWord.substring(0,deletePosition) + oldWord.substring(deletePosition+1);
        Const.GL_DEBUG && this.logDebug("Game.playDelete(): ", oldWord, "becomes", newWord, "game");
        return this.addWordIfExists(newWord);
    }

    /* playLetter
     * letterPosition given is 1 to word.length
     * Returns true if resulting word is in dictionary; false otherwise
     */
    playLetter(letterPosition, letter) {
        const CL = "Game.playLetter";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("Game.playLetter(): letterPosition:", letterPosition, ", letter:", letter,
                "addSpaceInProgress?", this.addSpaceInProgress, "at position:", this.addPosition,
                "this.gameState", this.gameState, "game");
        Const.GL_DEBUG && this.logDebug("steps played: ", this.gameState.getPlayedWordsAsString(), "game");

        const oldWord = this.lastPlayedWord();
        var oldWordModified = oldWord;
        if (this.addSpaceInProgress) {
            COV(1, CL);
            this.addSpaceInProgress = false;
            // put the hole into oldWord at the location of the space added (0 to oldWord.length);
            oldWordModified = oldWord.substr(0,this.addPosition) + Const.HOLE + oldWord.substr(this.addPosition);
            Const.GL_DEBUG && this.logDebug("playLetter() added space to old word giving",  oldWordModified, "game");
        }

        // construct the new word with 'letter' at letterPosition.
        const newWord = oldWordModified.substring(0,letterPosition) + letter + oldWordModified.substring(letterPosition+1);

        if (oldWord == newWord) {
            COV(2, CL);
            return Const.PICK_NEW_LETTER;
        } else {
            COV(3, CL);
            Const.GL_DEBUG && this.logDebug("Game.playLetter(): ", oldWord, "becomes", newWord, "game");
            return this.addWordIfExists(newWord)
        }
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
        // plays the next word in the solution for the player.  The move is rated as
        // SHOWN_MOVE
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
