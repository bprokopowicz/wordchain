import * as Const from './Const.js';
import { BaseLogger } from './BaseLogger.js';
import { Solver, Solution } from './Solver.js';
import { Persistence } from './Persistence.js';
import { WordChainDict } from './WordChainDict.js';
import { Metrics } from './Metrics.js';
import { COV } from './Coverage.js';

class RatedMove {
    constructor (word, rating) {
        this.word = word;
        this.rating = rating;
    }
}

class GameState extends BaseLogger {

    // Both daily and practice games are constructed almost empty, with just a dictionary.
    // Use initializePuzzle(start, target) to define the puzzle:
    //     start, target, initialSolution, ratedMoves, unplayedWords
    // GameState should not be constructed except by derived classes:
    // DailyGameState and PracticeGameState
    //
    // The external API for creating a new GameState is the factory(dictionary) method in the
    // derived classes.  It will:
    // 1) recover a game in progress or completed if any (and it is today's game for daily games)
    // 2) construct a new game if the recovered daily game is old
    // 3) construct a new game if there is no recovered game (daily or practice)
    //
    constructor(dictionary) {
        const CL = "GameState.constructor";
        COV(0, CL);
        super();
        this.dictionary = dictionary.copy();
        this.ratedMoves = [];   // includes start, and target if game is finished
        this.unplayedWords = []; // includes target
        this.start = "";
        this.target = "";
        this.initialSolution = null;
    }


    // Both daily and practice games have their puzzle properties (start, target, ratedMoves, unplayedWords,
    // initialSolution) set using initializePuzzle().  The use case is a brand new game, where
    // the start word is played are the others are not.
    //
    // Attributes that are specific to daily or practice games, such as the statsBlob, or gamesRemaining
    // are handled in the derived classes.
    //
    initializePuzzle(start, target) {
        const CL = "GameState.initializePuzzle";
        COV(0, CL);
        [start, target] = [start.toUpperCase(), target.toUpperCase()];
        const solution = Solver.solve(this.dictionary, start, target);
        if (solution.hadNoErrors()) {
            COV(1, CL);
            this.start = start;
            this.target = target;
            this.initialSolution = solution.getSolutionWords(); // list of bare words, including start and target
            this.ratedMoves = [new RatedMove(start, Const.GOOD_MOVE)]; // the start word is recorded as a RatedMove
            this.unplayedWords = solution.getSolutionWords().slice(); // copy the whole solution list ...
            this.unplayedWords.shift(1); // ... and remove the start word
            this.persist();
            return this;
        } else {
            COV(2, CL);
            return null;
        }

        COV(3, CL);
    }

    // ----- utilities for accessing the played, unplayed, and target words -----

    // NOTE: Intentionally not adding coverage to these little one-liners;
    // it increases the runtime 23-fold!

    getTargetWord() {
        return this.target;
    }

    getRatedMove(i) {
        return this.ratedMoves[i];
    }

    getPlayedWord(i) {
        return this.getRatedMove(i).word;
    }

    lastRatedMove() {
        return this.getRatedMove(this.ratedMoves.length-1);
    }

    lastPlayedWord() {
        return this.lastRatedMove().word;
    }

    getWordChainSolutionLength() {
        return this.initialSolution.length;
    }

    getPlayedWordList() {
        return this.ratedMoves.map((ratedMove) => ratedMove.word);
    }

    getPlayedWordsAsString() {
        return this.getPlayedWordList().join(',');
    }

    getUnplayedWords() {
        return this.unplayedWords;
    }

    getUnplayedWord(i) {
        return this.unplayedWords[i];
    }

    getUnplayedWordsAsString() {
        return this.unplayedWords.join(',');
    }

    toStr() {
        return JSON.stringify(this);
    }

    // ----- functions called to effect game play -----

    // NOTE: these functions do not validate that word added is actually OK to add, as that
    // should be done before adding a word, in the Game class.

    // Plays 'word'.
    // Returns the move rating.
    // DOES NOT VERIFY IF word is a valid word, or if word can be reached from previous word.
    // If the game is now finished, call the end-of-game management function in the derived class

    addWord(word) {
        const CL = "GameState.addWord";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("playing word:", word, "last played word", this.lastPlayedWord(), "gameState");
        let moveRating = Const.GOOD_MOVE; // We will override this below, based on the new solution after playing 'word'
        if (word == this.unplayedWords[0]) {
            COV(1, CL);
            Const.GL_DEBUG && this.logDebug("GameState.addWord()", word,
                    "was expected.  Popping it from unplayed", "gameState");
            // same word as WordChain used; remove the first unplayed word
            this.unplayedWords.shift();
        } else {
            // The player played a different word than WordChain at this step.
            // We need to re-solve from 'word' to 'target'.
            COV(2, CL);
            const isScrabbleWord = ! this.dictionary.isWord(word);
            let stepsRemaining = this.unplayedWords.length;
            let solution = Solver.solve(this.dictionary, word, this.target);

            Const.GL_DEBUG && this.logDebug(word, "was not expected. recomputed solution:", solution, "gameState");

            let newStepsRemaining = solution.numWords();
            if (newStepsRemaining == stepsRemaining) {
                COV(3, CL);
                // different word, same length as WordChain used
                // let them know if it was a scrabble word, although not genius.
                if (isScrabbleWord) {
                    COV(4, CL);
                    moveRating = Const.SCRABBLE_MOVE;
                    // add 'word' to the standard dictionary, because it might be needed again by Solver
                    this.dictionary.addWord(word);
                };
            } else if (newStepsRemaining == stepsRemaining+1) {
                COV(5, CL);
                // different word, one step longer than WordChain used
                moveRating = Const.WRONG_MOVE;
            } else if (newStepsRemaining == stepsRemaining+2) {
                COV(6, CL);
                // different word, two steps longer than WordChain used
                moveRating = Const.DODO_MOVE;
            } else if (newStepsRemaining < stepsRemaining) {
                COV(7, CL);
                // Different word, shorter than WordChain used.
                // Note: not adding to dictionary because the Solver should never
                // need to play this word again ... it's pretty subtle.
                moveRating = Const.GENIUS_MOVE;
            }
            this.unplayedWords = solution.getSolutionWords().slice(); // get a copy (slice)
            this.unplayedWords.shift();                               // and remove the start word
            COV(8, CL);
        }
        this.ratedMoves.push(new RatedMove(word, moveRating));
        if (this.isOver()) {
            COV(9, CL);
            Const.GL_DEBUG && this.logDebug ("GameState.addWord() game is now over", "gameState");
            this.showUnplayedMoves();
            this.updateStateAfterGame(); // dispatches to sub-class for Daily vs Practice
        }
        this.persist();
        COV(10, CL);
        return moveRating;
    }

    // locationOfHole() and wordHasHole() are statics because they don't use 'this' and are called from
    // outside as well as inside this class.

    static locationOfHole(word) {
        return word.indexOf(Const.HOLE);
    }

    static wordHasHole(word) {
        return (GameState.locationOfHole(word) >= 0);
    }

    /*
     * Score indicates the best-case number of words actually used vs WordChain's solution.
     * When a game is in progress, it counts words played plus the best-case remaining words.
     * When a game is over, the remaining words are zero.
     * Score will be negative if user had one or more genius
     * moves (unless they made mistakes too).
     * Score can grow indefinetly if we allow unlimited moves.
     */

    getScore() {
        const CL = "GameState.getScore";
        COV(0, CL);
        return this.unplayedWords.length + this.ratedMoves.length - this.initialSolution.length;
    }

    /*
     * For display & stats, we limit the score from 0 to TOO_MANY_EXTRA_STEPS
     */
    getNormalizedScore() {
        const CL = "GameState.getNormalizedScore";
        COV(0, CL);
        const score = this.getScore();
        if (score < 0) {
            COV(1, CL);
            return 0;
        } else if (score >= Const.TOO_MANY_EXTRA_STEPS) {
            COV(2, CL);
            return Const.TOO_MANY_EXTRA_STEPS;
        } else {
            COV(3, CL);
            return score;
        }
        COV(4, CL);
    }

    numShownMoves() {
        const CL = "GameState.numShownMoves";
        COV(0, CL);
        return this.ratedMoves.filter((ratedMove) => ratedMove.rating == Const.SHOWN_MOVE).length;
    }

    canShowMove() {
        const CL = "GameState.canShowMove";
        COV(0, CL);
        return this.numShownMoves() < Const.MAX_SHOWN_WORDS;
    }

    // used only in testing via Game.finishGame()
    finishGame() {
        const CL = "GameState.finishGame";
        COV(0, CL);
        // play the next unplayed words until they are all played
        while (this.unplayedWords.length > 0) {
            COV(1, CL);
            this.addWord(this.unplayedWords[0]);
        }
    }

    showUnplayedMoves() {
        const CL = "GameState.showUnplayedMoves";
        COV(0, CL);
        // force-show the remaining moves
        const forceShow = true;
        while (this.unplayedWords.length > 0) {
            COV(1, CL);
            this.showNextMove(forceShow);
        }
    }

    showNextMove(forceShow = false) {
        const CL = "GameState.showNextMove";
        COV(0, CL);
        if (!this.canShowMove() && !forceShow) {
            COV(1, CL);
            Const.GL_DEBUG && this.logDebug("too many words shown", this.numShownMoves(), "gameState");
            return Const.UNEXPECTED_ERROR;
        }

        COV(2, CL);
        const alreadyOver = this.isOver();
        let nextWord = this.unplayedWords[0];
        this.unplayedWords.shift();

        if (forceShow) {
            // We're showing the words after too many extra steps.
            COV(3, CL);
            this.ratedMoves.push(new RatedMove(nextWord, Const.SHOWN_MOVE));
        } else {
            // This is a user-requested Show Move. If it's the last move, rate the move as good
            // so there's no perceived penalty.
            if (this.unplayedWords.length === 0) {
                COV(4, CL);
                this.ratedMoves.push(new RatedMove(nextWord, Const.GOOD_MOVE));
            } else {
                COV(5, CL);
                this.ratedMoves.push(new RatedMove(nextWord, Const.SHOWN_MOVE));
            }
        }
        // we update the state after a game is finished by showing a move.
        if (!alreadyOver && this.isOver()) {
            COV(6, CL);
            this.showUnplayedMoves();  // game just ended.  We mark all the unplayed moves as 'shown' to display them
            this.updateStateAfterGame();
        }
        COV(7, CL);
        this.persist();
        return Const.SHOWN_MOVE;
    }

    // ----- functions relating to end of game -----

    // The game is done if the last played word is the target, or there are too many extra steps.
    isOver() {
        const CL = "GameState.isOver";
        COV(0, CL);
        let res = (this.lastPlayedWord() == this.target) || this.isLoser();
        Const.GL_DEBUG && this.logDebug("GameState.isOver() lastPlayedWord", this.lastPlayedWord(),
                "target", this.target, "returns:", res, "gameState");
        return res;
    }

    isLoser() {
        const CL = "GameState.isLoser";
        COV(0, CL);
        return this.getScore() >= Const.TOO_MANY_EXTRA_STEPS;
    }

    isWinner() {
        const CL = "GameState.isWinner";
        COV(0, CL);
        return this.isOver() && !this.isLoser();
    }
}

class DailyGameState extends GameState{
    // adds gameNumber, statsBlob, penaltyHistogram, isConstructedAsNew

    constructor(dictionary) {
        const CL = "DailyGameState.constructor";
        COV(0, CL);
        super(dictionary);
        this.baseDate = null;
        this.baseTimestamp = null;
        this.dateIncrementMs = 24 * 60 *60 * 1000; // one day in ms;
        this.isConstructedAsNew = false; // must be set to true in factory() if it is new
    }

    persist() {
        const CL = "DailyGameState.persist";
        COV(0, CL);
        Persistence.saveDailyGameState2(this);
    }

    // Factory method to create a new DailyGameState object, either from recovery
    // or from scratch if there is nothing to recover or it is old.

    static factory(dictionary) {
        const logger = new BaseLogger();
        if (Const.GL_DEBUG) {
            logger.logDebug("DailyGameState.factory() called.", "gameState");
            /*
            if (logger.tagIsOn("gameState")) {
                console.trace();
            }
            */
        }
        const CL = "DailyGameState.factory";
        COV(0, CL);
        let result = null;
        let recoveredObj = Persistence.getDailyGameState2();
        Const.GL_DEBUG && logger.logDebug("DailyGameState.factory() recovers object:", recoveredObj, "gameState");
        if (recoveredObj == null) {
            // nothing persisted.
            COV(1, CL);
            Const.GL_DEBUG && logger.logDebug("no recovered daily game, so streak starts at 1.", "daily");
            let gameState = DailyGameState.__fromScratch(dictionary);
            gameState.isConstructedAsNew = true;
            gameState.persist();
            result = gameState;
        } else {
            COV(2, CL);

            // Check to see if recovered game number is the test game number, i.e. if we have set
            // TestDailyGameStart/Target in the local storage.  If so, we use it and don't adjust the streak.
            // If the test game is being played, the streak is undefined.

            let recoveredDailyGameState = DailyGameState.__fromObj(dictionary, recoveredObj);

            Const.GL_DEBUG && logger.logDebug("DailyGameState.factory() GameState from object:",
                    recoveredDailyGameState, "gameState");
            if  (recoveredDailyGameState.getDailyGameNumber() == Const.TEST_DAILY_GAME_NUMBER) {
                COV(3, CL);
                recoveredDailyGameState.persist();
                result = recoveredDailyGameState;
            } else {
                COV(4, CL);

                // Check to see if the recovered daily game is today's game.  If so, use it as is.
                // Otherwise, set state to today's daily game.
                // If we recovered yesterday's game the streak is still good.
                // If the game we recovered is more than 2 days old, the streak is over.

                let todaysGameNumber = recoveredDailyGameState.calculateGameNumber(); // computes TODAY's game number
                if (recoveredDailyGameState.getDailyGameNumber() != todaysGameNumber) {
                    // a new day, a new game.
                    COV(5, CL);
                    recoveredDailyGameState.isConstructedAsNew = true;

                    // need a new game, but not from scratch, to keep the recovered GameState for stats
                    if (recoveredDailyGameState.getDailyGameNumber() === todaysGameNumber - 1) {
                        COV(6, CL);
                        Const.GL_DEBUG && logger.logDebug("recovered yesterday's game, so streak continues.", "daily");
                        recoveredDailyGameState.incrementStat("streak");
                    } else {
                        // we didn't play yesterday's game; streak is over
                        COV(7, CL);
                        Const.GL_DEBUG && logger.logDebug("Did not play yesterday's game: streak is over", "daily");
                        recoveredDailyGameState.setStat("streak", 1);
                    }
                    // now, update game state to today's game, playing from the start.
                    // If setToTodaysGame() sets the game to the broken one, we will
                    // have updated the streak above, which is what we want -- the whole
                    // idea of the streak is how many days in a row the user started a game.
                    recoveredDailyGameState.setToTodaysGame();
                }

                recoveredDailyGameState.persist();
                result = recoveredDailyGameState;
            }
        }
        if (result && result.isNewDailyGame()) {
            COV(8, CL);
            Const.GL_DEBUG && logger.logDebug("record daily game started", "daily");
            Metrics.recordDailyGameStarted(result.getDailyGameNumber());
        }
        COV(9, CL);
        return result;
    }

    isNewDailyGame() {
        const CL = "DailyGameState.isNewDailyGame";
        COV(0, CL);
        return this.isConstructedAsNew;
    }

    // this sets up today's puzzle
    setToTodaysGame() {
        const CL = "DailyGameState.setToTodaysGame";
        COV(0, CL);
        let dailyGameNumber = this.calculateGameNumber();
        let start, target;
        Const.GL_DEBUG && this.logDebug("DailyGameState.setToTodaysGame() dailyGameNumber:", dailyGameNumber, "gameState");
        if (Persistence.hasTestDailyGameWords()) {
            COV(1, CL);
            [start, target] = Persistence.getTestDailyGameWords();
            dailyGameNumber = Const.TEST_DAILY_GAME_NUMBER;
            Const.GL_DEBUG && this.logDebug("DailyGameState.setToTodaysGame() override from test vars to dailyGameNumber:",
                    dailyGameNumber, "start", start, "target", target, "gameState");
        } else {
            COV(2, CL);
            // Valid daily game numbers run from 0 to GameWords.length-1.  If the calculated
            // value is outside that range, a place-holder game is used.
            if ((dailyGameNumber < 0) || (dailyGameNumber >= Const.DAILY_GAMES.length)) {
                COV(3, CL);
                dailyGameNumber = Const.BROKEN_DAILY_GAME_NUMBER;
                [start, target] = [Const.BACKUP_DAILY_GAME_START, Const.BACKUP_DAILY_GAME_TARGET];
            } else {
                COV(4, CL);
                [start, target] = Const.DAILY_GAMES[dailyGameNumber];
            }
        }
        COV(5, CL);
        this.dailyGameNumber = dailyGameNumber;
        this.incrementStat("gamesStarted");
        return this.initializePuzzle(start, target);
    }

    // Don't call __fromScratch() from outside the class.
    // If test vars are set, use them here.
    static __fromScratch(dictionary) {
        const logger = new BaseLogger();
        const CL = "DailyGameState.__fromScratch";
        COV(0, CL);

        let dailyGameState = new DailyGameState(dictionary);

        dailyGameState.isConstructedAsNew = true;

        // initialize the player's stats blob
        // Note: gamesStarted >= gamesWon + gamesLost.
        // Some games are incomplete - neither won nor lost.

        dailyGameState.statsBlob = {
            gamesStarted: 0,
            gamesWon: 0,
            gamesLost: 0,
            streak: 1, // streak can not be zero, because just starting the game via opening the app is a streak of atleast one.
        };

        // Now create a histogram for each number of wrong moves, and initialize
        // their values to 0. The stat properties for these is 0..TOO_MANY_EXTRA_STEPS.

        dailyGameState.penaltyHistogram = [];
        for (let nExtraSteps = 0; nExtraSteps <= Const.TOO_MANY_EXTRA_STEPS; nExtraSteps++) {
            dailyGameState.penaltyHistogram[nExtraSteps] = 0;
        }

        // Will return null if something goes bad; e.g. puzzle cannot be solved.
        let result = null;
        if (dailyGameState.setToTodaysGame() != null) {
            COV(1, CL);
            Const.GL_DEBUG && logger.logDebug("DailyGameState.__fromScratch", dailyGameState, "gameState");
            result = dailyGameState;
        }
        COV(2, CL);
        return result;
    }

    // don't call __fromObj() from outside the class
    static __fromObj (dictionary, recoveredDailyGameStateObj) {
        const logger = new BaseLogger();
        const CL = "DailyGameState.__fromObj";
        COV(0, CL);
        let dailyGameState = new DailyGameState(dictionary);
        Object.assign(dailyGameState, recoveredDailyGameStateObj);

        // Use-case for TEST_DAILY_GAME_START, TEST_DAILY_GAME_TARGET vars:
        // if these are set, they MAY be overriding what we recovered.  If they do,
        // we re-initialize the puzzle using the test words.  If the test words are
        // the same as recovered, we go with the game as recovered.

        if (Persistence.hasTestDailyGameWords()) {
            COV(1, CL);
            let [testStart, testTarget] = Persistence.getTestDailyGameWords();
            if ((testStart === dailyGameState.start) && (testTarget === dailyGameState.target)) {
                COV(2, CL);
                Const.GL_DEBUG && logger.logDebug("DailyGameState.fromObj() recovered daily test game",
                        dailyGameState, "gameState");
            } else {
                COV(3, CL);
                dailyGameState.dailyGameNumber = Const.TEST_DAILY_GAME_NUMBER;
                dailyGameState.initializePuzzle(testStart, testTarget);
                Const.GL_DEBUG && logger.logDebug("DailyGameState.fromObj() overriding from test vars to ",
                        dailyGameState, "gameState")
            }
        }
        Const.GL_DEBUG && logger.logDebug("DailyGameState.__fromObj", dailyGameState, "gameState");
        COV(4, CL);
        return dailyGameState;
    }

    // baseTimestamp is the world-wide starting point determining for Wordchain games.
    // It is hardcoded as baseDate but can be over-ridden by setting the testing
    // var TestEpochDaysAgo.

    setBaseTimestamp() {
        const CL = "DailyGameState.setBaseTimestamp";
        COV(0, CL);
        if (this.baseTimestamp != null) {
            COV(1, CL);
            // already set
            return;
        }
        this.baseDate = Const.WORD_CHAIN_EPOCH_DATE;

        // Are we changing the number of minutes per day to make time move more quickly?
        if (Persistence.hasTestMinutesPerDay()) {
            // Yes, so override the standard one day increment.
            const debugMinPerDay = Persistence.getTestMinutesPerDay();
            this.dateIncrementMs = debugMinPerDay * 60 * 1000;
            Const.GL_DEBUG && this.logDebug("Setting minutes per day to:",
                    debugMinPerDay, "dateIncrementMs to:", this.dateIncrementMs,
                    "daily");
        }

        // Are we changing when the Epoch starts (for debugging purposes)?
        if (Persistence.hasTestEpochDaysAgo()) {
            COV(2, CL);
            // Yes, so recalculate the base date, which we use to get the base timestamp below.
            const newEpochMs = Date.now(),
                  daysAgo = Persistence.getTestEpochDaysAgo(),
                  msAgo = daysAgo * this.dateIncrementMs;

            this.baseDate = new Date(newEpochMs - msAgo);
            Const.GL_DEBUG && this.logDebug("Setting epoch to:", daysAgo, "days ago", "daily");
        }

        this.baseTimestamp = this.baseDate.getTime();
        Const.GL_DEBUG && this.logDebug("epoch timestamp is set to:",
                new Date(this.baseTimestamp), "daily");
        COV(3, CL);
    }

    // Increment the given stat, update the stats cookie, and update the stats display content.
    incrementStat(whichStat) {
        const CL = "DailyGameState.incrementStat";
        COV(0, CL);
        this.setStat(whichStat, this.getStat(whichStat) + 1);
    }

    getDailyGameNumber() {
        const CL = "DailyGameState.getDailyGameNumber";
        COV(0, CL);
        return this.dailyGameNumber;
    }

    // Return a share graphic if the game is over, and null if not.
    // Note that the share graphic is not HTML, but rather just a string,
    // containing some Unicode characters to construct the graphic.
    getShareString() {
        const CL = "DailyGameState.getShareString";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("getShareString() gameState=", this.toStr(), "daily");

        if (! this.isOver()) {
            console.error("getShareString() called when game is not over!");
            return null;
        }

        let shareString = `WordChain #${this.getDailyGameNumber() + 1} `,
            gameWon;

        var score = this.getScore();
        if (score >= Const.TOO_MANY_EXTRA_STEPS) {
            COV(1, CL);
            gameWon = false;
        } else {
            COV(2, CL);
            gameWon = true;
        }

        // Show the emoji in NUMBERS corresponding to the score.
        // A bit of a misnomer, but the value for 0 is a star.
        shareString += Const.NUMBERS[this.getNormalizedScore()];

        // Now add some treats ...

        // Better than WordChain score.
        if (score === -1) {
            COV(3, CL);
            shareString += Const.BIRDIE;
        } else if (score <= -2) {
            // add one eagle for every point under -1
            COV(4, CL);
            const numEagles = -1 - score;  // score: -3 -> eagles:2, score: -4 -> eagles:3, etc
            for (let i = 1; i<= numEagles; i++) {
                shareString += Const.EAGLE;
            }
        }

        // Same solution as WordChain. Sadly, you can't compare arrays directly
        // in JavaScript, so we'll compare as strings.
        if (this.initialSolution.toString() === this.getPlayedWordList().toString()) {
            COV(5, CL);
            shareString += Const.COOKIE;
        }

        // Used one or more advanced words.
        if (this.userPlayedAdvancedWord()) {
            COV(6, CL);
            shareString += Const.ICE_CREAM;
        }

        COV(7, CL);

        // Add a line for the streak.
        shareString += `\nStreak: ${this.getStat('streak')}`;

        // Add a line for start/target.
        shareString += `\n${this.start} --> ${this.target}\n`;

        // Now, construct the graphic showing the lengths of the user's
        // played words, colored red or green to indicate whether that word
        // did or did not increase the solution length.
        // The target word (last) is shown in a separate, fixed color regardless
        // of success or failure so we slice it off here.

        let moveSummary = this.getMoveSummary();
        let wordsBetweenStartAndTarget = moveSummary.slice(1,-1);
        let [startRatingUnused, startLength] = moveSummary[0];
        let [targetRatingUnused, targetLength] = moveSummary.slice(-1)[0];

        // Start with the start word shown in purple
        let emoji = Const.PURPLE_SQUARE;
        shareString += emoji.repeat(startLength) + "\n";

        // Show graphic of all the words played.
        let colorblindMode = Persistence.getColorblindMode(),
            wordChainSolutionLength = this.initialSolution.length,
            // Start rowNum at 2 because we've already shown the start word.
            rowNum = 2;

        Persistence.saveDailyGameState2(this);

        for (let [moveRating, wordLength] of wordsBetweenStartAndTarget) {

            // Determine which color square to display for this word.
            if (moveRating === Const.GOOD_MOVE || moveRating === Const.SCRABBLE_MOVE) {
                // Word didn't increase the count; pick color indicating "good".
                COV(8, CL);
                emoji = colorblindMode ? Const.BLUE_SQUARE : Const.GREEN_SQUARE;
            } else if (moveRating === Const.WRONG_MOVE) {
                // Word increased the count; pick a different color
                COV(9, CL);
                emoji = colorblindMode ? Const.ORANGE_SQUARE : Const.ORANGE_SQUARE;
            } else if (moveRating === Const.GENIUS_MOVE) {
                // Word decreased the count; pick a very special color color
                COV(10, CL);
                emoji = colorblindMode ? Const.GOLD_SQUARE : Const.GOLD_SQUARE;
            } else if (moveRating === Const.DODO_MOVE) {
                // Word increased the count; pick a different color
                COV(11, CL);
                emoji = colorblindMode ? Const.ORANGE_SQUARE : Const.ORANGE_SQUARE;
            } else if (moveRating === Const.SHOWN_MOVE) {
                COV(12, CL);
                emoji = colorblindMode ? Const.GRAY_SQUARE : Const.GRAY_SQUARE;
            } else {
                console.error("Unexpected moveRating:", moveRating, ", wordLength:", wordLength);
                emoji = Const.BLACK_SQUARE;
            }

            // Now repeat that emoji for the length of the word and add a newline,
            // creating a row that looks like the row of tiles in the game.
            COV(13, CL);
            shareString += emoji.repeat(wordLength) + "\n";

            if (rowNum === wordChainSolutionLength) {
                COV(14, CL);
                shareString += "-".repeat(20) + "\n";
            }

            rowNum += 1;
        }

        // Now, add the target
        if (gameWon) {
            COV(15, CL);
            emoji = colorblindMode ? Const.BLUE_SQUARE : Const.GREEN_SQUARE;
        } else {
            COV(16, CL);
            emoji = colorblindMode ? Const.GRAY_SQUARE : Const.GRAY_SQUARE;
        }

        COV(17, CL);
        shareString += emoji.repeat(targetLength) + "\n";

        // Add the URL to the game and send the trimmed result.
        // Note that in shareCallback() we are ONLY copying to the
        // clipboard; if we ever go back to doing a "direct share"
        // we will want to append a "faux" URL.
        shareString += Const.SHARE_URL;
        return shareString.trim();
    }

    getStat(whichStat) {
        const CL = "DailyGameState.getStat";
        COV(0, CL);
        return this.statsBlob[whichStat];
    }

    setStat(whichStat, statValue) {
        const CL = "DailyGameState.setStat";
        COV(0, CL);
        // Only set stats if this is a valid daily game.
        if (!this.dailyGameIsBroken()) {
            COV(1, CL);
            this.statsBlob[whichStat] = statValue;
            Const.GL_DEBUG && this.logDebug("DailyGameState.setStat() setting and saving", whichStat, "to", statValue, "daily");
            this.persist();
        } else {
            COV(2, CL);
            Const.GL_DEBUG && this.logDebug("not saving stats because of broken daily game.", "daily");
        }
        COV(3, CL);
    }

    dailyGameIsBroken() {
        const CL = "DailyGameState.dailyGameIsBroken";
        COV(0, CL);
        return this.getDailyGameNumber() === Const.BROKEN_DAILY_GAME_NUMBER;
    }

    gameIsOld() {
        const CL = "DailyGameState.gameIsOld";
        COV(0, CL);
        const result =
            (this.getDailyGameNumber() != Const.TEST_DAILY_GAME_NUMBER) &&
            (!this.dailyGameIsBroken()) &&
            (this.calculateGameNumber() > this.getDailyGameNumber());
        Const.GL_DEBUG && this.logDebug("DailyGameState.gameIsOld() for dailyGameNumber", this.getDailyGameNumber(),
                "returns", result, "daily");
        return result;
    }

    calculateGameNumber() {
        const CL = "DailyGameState.calculateGameNumber";
        COV(0, CL);
        this.setBaseTimestamp();  // only updates on the first call
        const nowTimestamp = (new Date()).getTime();
        const msElapsed = nowTimestamp - this.baseTimestamp;
        const gameNumber = Math.floor(msElapsed / this.dateIncrementMs);
        Const.GL_DEBUG && this.logDebug("calculateGameNumber(): base: ",
                this.baseTimestamp, "now:", nowTimestamp, ", elapsed since base:",
                msElapsed, ",gameNumber:", gameNumber, "daily");
        return gameNumber;
    }

    getMsUntilNextGame() {
        // Not putting coverage here intentionally; we can't test this in our suite.
        const nextGameNum = this.calculateGameNumber() + 1,
              nextGameTimestamp = this.baseTimestamp + (nextGameNum * this.dateIncrementMs),
              msUntilNextGame = nextGameTimestamp - (new Date()).getTime();

        Const.GL_DEBUG && this.logDebug("DailyGameState.getMsUntilNextGame(): nextGameNum:",
                nextGameNum, "msUntilNextGame:", msUntilNextGame, "daily");
        return msUntilNextGame;
    }

    // A list summarizing the moves of the game.
    // Unplayed words get a move rating of Const.FUTURE
    // Use case: this is only used for creating a share string, which means the daily
    // game is over.  There can be no unnplayed words.
    // Returns an array of two-element arrays containing:
    // - move rating
    // - word length
    getMoveSummary() {
        const CL = "DailyGameState.getMoveSummary";
        COV(0, CL);
        var summary = [];

        for (let ratedMove of this.ratedMoves) {
            summary.push([ratedMove.rating, ratedMove.word.length]);
        }

        if (this.getUnplayedWords().length != 0) {
            console.error("there should not be any unplayed moves when we call DailyGameState.getMoveSummary()");
            console.trace();
        }

        for (let unplayedWord of this.getUnplayedWords()) {
            summary.push([Const.FUTURE, unplayedWord.length]);
        }
        COV(1, CL);
        return summary;
    }

    // Call this once and only once  whenever a daily game is finished (in addWord() or showNextMove()).
    // The caller needs to save the game state after calling this.
    updateStateAfterGame() {
        const CL = "DailyGameState.updateStateAfterGame";
        COV(0, CL);
        Metrics.recordDailyGameFinished(this.getDailyGameNumber());
        if (this.isWinner()) {
            COV(1, CL);
            this.incrementStat("gamesWon");
            //this.incrementStat("streak");
        } else if (this.isLoser()) {
            COV(2, CL);
            this.incrementStat("gamesLost");
            //this.setStat("streak", 0);
        }

        let extraStepsCount = this.getNormalizedScore(); // [0 .. TOO_MANY_EXTRA], not [-n,...0, 1, 2, ...)
        if (extraStepsCount >= Const.TOO_MANY_EXTRA_STEPS) {
            COV(3, CL);
            // Failed games show the remaining words, which count as wrong steps,
            // but we don't want to count that in the stat.
            extraStepsCount = Const.TOO_MANY_EXTRA_STEPS;
        }
        this.penaltyHistogram[extraStepsCount] += 1;
        COV(4, CL);
    }

    userPlayedAdvancedWord() {
        const CL = "DailyGameState.userPlayedAdvancedWord";
        COV(0, CL);

        for (let ratedMove of this.ratedMoves) {
            if (ratedMove.rating === Const.SCRABBLE_MOVE || ratedMove.rating === Const.GENIUS_MOVE) {
                COV(1, CL);
                return true;
            }
        }

        COV(2, CL);
        return false;
    }
}

class PracticeGameState extends GameState{
    // adds gamesRemaining

    // don't call from outside this class
    constructor(dictionary) {
        const CL = "PracticeGameState.constructor";
        COV(0, CL);
        super(dictionary);
    }

    persist() {
        const CL = "PracticeGameState.persist";
        COV(0, CL);
        Persistence.savePracticeGameState2(this);
    }

    // Use factory(dictionary) to create the first PracticeGameState on start-up.  It will
    // restore a game from persistence if any, or create a new game.  The restored game may
    // be finished or in progress.

    static factory(dictionary) {
        const logger = new BaseLogger();
        const CL = "PracticeGameState.factory";
        COV(0, CL);
        let recoveredObj = Persistence.getPracticeGameState2();
        var gameState;
        if (recoveredObj == null) {
            COV(1, CL);
            gameState = PracticeGameState.__fromScratch(dictionary);
        } else {
            COV(2, CL);
            gameState = PracticeGameState.__fromObj(dictionary, recoveredObj);
            // the recovered object might be obsolete if the practice test vars were set to something else.
            if (Persistence.hasTestPracticeGameWords()) {
                COV(3, CL);
                let [testStart, testTarget] = Persistence.getTestPracticeGameWords();
                if ((gameState.start != testStart) || (gameState.target != testTarget)) {
                    // The recovered practice game doesn't use the test start,target words,
                    // so we just create a brand new game, which does use the test vars given.
                    COV(4, CL);
                    gameState = PracticeGameState.__fromScratch(dictionary);
                }
            }
        }
        COV(5, CL);
        gameState.persist();
        return gameState;
    }

    // don't call __fromObj() from outside the class
    static __fromObj (dictionary, recoveredPracticeGameStateObj) {
        const logger = new BaseLogger();
        const CL = "PracticeGameState.__fromObj";
        COV(0, CL);
        Const.GL_DEBUG && logger.logDebug("PracticeGameState.__fromObj using recovered:",
                recoveredPracticeGameStateObj, "gameState");
        let practiceGameState = new PracticeGameState(dictionary);
        Object.assign(practiceGameState, recoveredPracticeGameStateObj);
        Const.GL_DEBUG && logger.logDebug("PracticeGameState.__fromObj returning ", practiceGameState, "gameState");
        return practiceGameState;
    }

    // don't call __fromScratch() from outside the class
    static __fromScratch(dictionary) {
        const logger = new BaseLogger();
        const CL = "PracticeGameState.__fromScratch";
        COV(0, CL);
        let practiceGameState = new PracticeGameState(dictionary);
        Const.GL_DEBUG && logger.logDebug("PracticeGameState.fromScratch() hasTestPracticeGameWords?",
                Persistence.hasTestPracticeGameWords(), "gameState");
        var start, target;
        if (Persistence.hasTestPracticeGameWords()) {
            COV(1, CL);
            [start, target] = Persistence.getTestPracticeGameWords();
        } else {
            COV(2, CL);
            [start, target] = PracticeGameState.getPracticePuzzle();
        }
        if (Persistence.hasTestPracticeGamesPerDay()) {
            COV(3, CL);
            practiceGameState.gamesRemaining = Persistence.getTestPracticeGamesPerDay();
        } else {
            COV(4, CL);
            practiceGameState.gamesRemaining = Const.PRACTICE_GAMES_PER_DAY;
        }
        let result = null;
        if (practiceGameState.initializePuzzle(start, target) != null) {
            COV(5, CL);
            Const.GL_DEBUG && logger.logDebug("PracticeGameState.__fromScratch", practiceGameState, "gameState");
            result = practiceGameState;
        }
        COV(6, CL);
        return result;
    }


    // Choose a random start/target that has a solution between
    // Const.PRACTICE_STEPS_MINIMUM and Const.PRACTICE_STEPS_MAXIMUM
    // steps. Returns an array: [startWord, targetWord].
    static getPracticePuzzle() {
        const logger = new BaseLogger();
        const CL = "PracticeGameState.getPracticePuzzle";
        COV(0, CL);
        let max = Const.PRACTICE_START_WORDS.length;
        let rand = Math.floor(Math.random() * max); // 0..max-1 inclusive
        let dictionary = new WordChainDict();

        let startWord = Const.PRACTICE_START_WORDS[rand];
        let puzzles = Solver.findPuzzles(dictionary,
                startWord,
                Const.PRACTICE_TARGET_WORD_LEN,
                Const.PRACTICE_REQ_WORD_LEN_1,
                Const.PRACTICE_REQ_WORD_LEN_2,
                Const.PRACTICE_STEPS_MINIMUM,
                Const.PRACTICE_STEPS_MAXIMUM,
                Const.PRACTICE_DIFFICULTY_MINIMUM,
                Const.PRACTICE_MIN_CHOICES_PER_STEP);

        if (puzzles.length > 0) {
            COV(1, CL);
            rand = Math.floor(Math.random() * puzzles.length);
            Const.GL_DEBUG && logger.logDebug("found",  puzzles.length, "puzzles starting with", startWord, "Choosing #", rand, "gameState");
            let puzzle = puzzles[rand];
            Const.GL_DEBUG && logger.logDebug("selected random puzzle: " + puzzle.toStr(), "gameState");
            return [puzzle.getStart(), puzzle.getLastWord()];
        } else {
            console.error("no practice puzzles found with start word", startWord);
            return ["dog", "bite"];
        }

        COV(2, CL);
    }

    // Call this once and only once  whenever a practice game is finished (in addWord() or showNextMove())
    // The caller needs to call persist() after calling this.
    updateStateAfterGame() {
        const CL = "PracticeGameState.updateStateAfterGame";
        COV(0, CL);
        this.gamesRemaining -= 1;
        this.persist();
        Const.GL_DEBUG && this.logDebug("      PracticeGameState.updateStateAfterGame() gamesRemaining is now:", this.gamesRemaining, "gameState");
    }

    // Called when the daily game is rolled over, originally from AppDisplay.
    resetPracticeGameCounter() {
        const CL = "PracticeGameState.resetPracticeGameCounter";
        COV(0, CL);
        this.gamesRemaining = Const.PRACTICE_GAMES_PER_DAY;
        this.persist();
    }
}

export {GameState, DailyGameState, PracticeGameState};
