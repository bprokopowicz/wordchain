import * as Const from './Const.js';
import { BaseLogger } from './BaseLogger.js';
import { Solver, Solution } from './Solver.js';
import { Persistence } from './Persistence.js';
import { WordChainDict } from './WordChainDict.js';
import { COV } from './Coverage.js';

class RatedMove {
    constructor (word, rating) {
        this.word = word;
        this.rating = rating;
    }
}

const logger = new BaseLogger();

class GameState {

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
            this.ratedMoves = [new RatedMove(start, Const.OK)]; // the start word is recorded as a RatedMove
            this.unplayedWords = solution.getSolutionWords().slice(); // copy the whole solution list ...
            this.unplayedWords.shift(1); // ... and remove the start word
            this.persist();
            return this;
        } else {
            COV(2, CL);
            return null;
        }
    }

    // ----- utilities for accessing the played and unplayed words -----

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

    removeLastPlayedWord() {
        // This is used when the last played word has a hole, like F?AT, and we play 'L'.  
        // We need to remove F?AT from the played words and we will add FLAT if it is a word.
        // But if we play 'M', FMAT is not a word, so we don't add it to played words. 
        this.ratedMoves.pop();
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

    addSpace(spaceNumber) {
        // Adds a played word as a copy of the last played word, with a '?' inserted in the 
        // the new space.
        let lastWord = this.lastPlayedWord();
        let [pre, post] = [lastWord.substring(0, spaceNumber), lastWord.substring(spaceNumber)];
        let wordWithSpace = pre + Const.HOLE + post;
        this.ratedMoves.push(new RatedMove(wordWithSpace, Const.OK));
        return Const.OK;
    }

    // Plays 'word'.  
    // Returns the move rating.
    // DOES NOT VERIFY IF word is a valid word, or if word can be reached from previous word.
    // If the game is now finished, call the end-of-game management function in the derived class

    addWord(word) {
        const CL = "GameState.addWord";
        COV(0, CL);
        Const.GL_DEBUG && logger.logDebug("playing word:", word, "last played word", this.lastPlayedWord(), "gameState");
        if (GameState.wordHasHole(this.lastPlayedWord())) {
            COV(1, CL);
            // we are playing a word after a HOLE word.  Remove the HOLE word. 
            Const.GL_DEBUG && logger.logDebug("removing played word with hole", "gameState");
            this.ratedMoves.pop();
        }
        let moveRating = Const.OK; // We will override this below, based on the new solution after playing 'word'
        if (word == this.unplayedWords[0]) {
            COV(2, CL);
            Const.GL_DEBUG && logger.logDebug("GameState.addWord()", word,
                    "was expected.  Popping it from unplayed", "gameState");
            // same word as WordChain used; remove the first unplayed word
            this.unplayedWords.shift();
        } else {
            // The player played a different word than WordChain at this step.
            // We need to re-solve from 'word' to 'target'.
            COV(3, CL);
            let stepsRemaining = this.unplayedWords.length;
            let solution = Solver.solve(this.dictionary, word, this.target);
            Const.GL_DEBUG && logger.logDebug(word, "was not expected. recomputed solution:", solution, "gameState");
            let newStepsRemaining = solution.numWords();
            if (newStepsRemaining == stepsRemaining) {
                COV(4, CL);
                // different word, same length as WordChain used
                // let them know if it was a scrabble word, although not genius.
                if ( !this.dictionary.isWord(word) ) {
                    moveRating = Const.SCRABBLE_WORD;
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
                // different word, shorter than WordChain used
                moveRating = Const.GENIUS_MOVE;
            }
            this.unplayedWords = solution.getSolutionWords().slice(); // get a copy (slice)
            this.unplayedWords.shift();                               // and remove the start word
            COV(8, CL);
        }
        this.ratedMoves.push(new RatedMove(word, moveRating));
        if (this.isOver()) {
            COV(9, CL);
            Const.GL_DEBUG && logger.logDebug ("GameState.addWord() game is over");
            this.updateStateAfterGame();
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

    isPenalty(rating) {
        return (rating == Const.WRONG_MOVE) || (rating == Const.DODO_MOVE) || (rating == Const.SHOWN_MOVE);
    }

    // Count the number of mistakes and shown moves.  Limit the result to no more than TOO_MANY_PENALTIES
    numPenalties() {
        let numPenalties = this.ratedMoves.filter((ratedMove) => this.isPenalty(ratedMove.rating)).length;
        if (numPenalties > Const.TOO_MANY_PENALTIES) {
            numPenalties = Const.TOO_MANY_PENALTIES;
        }
        return numPenalties;
    }

    finishGame() {
        const CL = "GameState.finishGame";
        COV(0, CL);
        // play the next unplayed words until they are all played
        while (this.unplayedWords.length > 0) {
            this.addWord(this.unplayedWords[0]);
        }
    }

    showUnplayedMoves() {
        const CL = "GameState.showUnplayedMoves";
        COV(0, CL);
        // show the remaining moves
        while (this.unplayedWords.length > 0) {
            this.showNextMove();
        }
    }
    
    showNextMove() {
        const CL = "GameState.showNextMove";
        COV(0, CL);
        const alreadyOver = this.isOver();
        let nextWord = this.unplayedWords[0];
        this.unplayedWords.shift();
        this.ratedMoves.push(new RatedMove(nextWord, Const.SHOWN_MOVE));
        // we update the state once after a game is finished by showing a move.  
        if (!alreadyOver && this.isOver()) {
            this.updateStateAfterGame();
        }
        this.persist();
        return Const.SHOWN_MOVE;
    }

    // ----- functions relating to end of game -----

    // The game is done if the last played word is the target, or there are too many penalties.
    isOver() {
        const CL = "GameState.isOver";
        COV(0, CL);
        let res = (this.lastPlayedWord() == this.target) || this.isLoser();
        Const.GL_DEBUG && logger.logDebug("GameState.isOver() lastPlayedWord", this.lastPlayedWord(),
                "target", this.target, "returns:", res, "gameState");
        return res;
    }

    isLoser() {
        const CL = "GameState.isLoser";
        COV(0, CL);
        return this.numPenalties() >= Const.TOO_MANY_PENALTIES;
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

    updateFromDeprecatedStatsBlob() {
        const CL = "DailyGameState.updateFromDeprecatedStatsBlob";
        COV(0, CL);
        let depStatsBlob = Persistence.getDeprecatedStatsBlob();
        if (depStatsBlob != null) {
            COV(1, CL);
            this.statsBlob = {
              gamesStarted: depStatsBlob.gamesStarted,
              gamesWon: depStatsBlob.gamesWon,
              gamesLost: depStatsBlob.gamesLost,
              streak: depStatsBlob.streak,
            };
            for (let i=0; i <= Const.TOO_MANY_PENALTIES; i++) {
                this.penaltyHistogram[i] = depStatsBlob[i];
            }
        }
        COV(2, CL);
    }

    // Factory method to create a new DailyGameState object, either from recovery
    // or from scratch if there is nothing to recover or it is old.

    static factory(dictionary) {
        if (Const.GL_DEBUG) {
            logger.logDebug("DailyGameState.factory() called.", "gameState");
            console.trace();
        }
        const CL = "DailyGameState.factory";
        COV(0, CL);
        let result = null;
        let recoveredObj = Persistence.getDailyGameState2();
        Const.GL_DEBUG && logger.logDebug("DailyGameState.factory() recovers object:", recoveredObj, "gameState");
        if (recoveredObj == null) {
            // nothing persisted. 
            COV(1, CL);
            let gameState = DailyGameState.__fromScratch(dictionary);
            gameState.isConstructedAsNew = true;
            gameState.updateFromDeprecatedStatsBlob();
            gameState.persist();
            result =  gameState;
        } else {
            COV(2, CL);

            // Check to see if recovered game number is the test game number, i.e. if we have set
            // TestDailyGameStart/Target in the local storage.  If so, we use it and don't adjust the streak.
            // If the test game is being played, the streak is undefined.

            let recoveredDailyGameState = DailyGameState.__fromObj(dictionary, recoveredObj);

            Const.GL_DEBUG && logger.logDebug("DailyGameState.factory() GameState from object:",
                    recoveredDailyGameState, "gameState");
            if  (recoveredDailyGameState.dailyGameNumber == Const.TEST_DAILY_GAME_NUMBER) {
                COV(3, CL);
                recoveredDailyGameState.persist();
                result = recoveredDailyGameState;
            } else {

                // Check to see if the recovered daily game is today's game.  If so, use it as is.
                // Otherwise, set state to today's daily game.
                // If we recovered yesterday's game, and didn't win, the streak is over.
                // If the game we recovered is more than 2 days old, the streak is over.

                COV(4, CL);
                let todaysGameNumber = recoveredDailyGameState.calculateGameNumber(); // computes TODAY's game number
                if (recoveredDailyGameState.dailyGameNumber != todaysGameNumber) {
                    // a new day, a new game.
                    COV(5, CL);
                    recoveredDailyGameState.isConstructedAsNew = true;

                    // need a new game, but not from scratch, to keep the recovered GameState for stats
                    if (recoveredDailyGameState.dailyGameNumber <= todaysGameNumber - 2) {
                        // we didn't play yesterday's game; streak is over
                        COV(6, CL);
                        Const.GL_DEBUG && logger.logDebug("Did not play yesterday's game: streak is over", "daily");
                        recoveredDailyGameState.setStat("streak", 0);
                    } else {
                        // must be yesterday's game.  Did we win?
                        // The case we're handling here is that it's an unfinished game.
                        // If it was a lost game, we would have already set the streak
                        // to 0 when it was lost.
                        COV(7, CL);
                        if (!recoveredDailyGameState.isWinner()) {
                            recoveredDailyGameState.setStat("streak", 0);
                        }
                    }
                    // now, update game state to today's game, playing from the start.
                    recoveredDailyGameState.setToTodaysGame();
                }

                recoveredDailyGameState.updateFromDeprecatedStatsBlob();
                recoveredDailyGameState.persist();
                result = recoveredDailyGameState;
            }
        }
        COV(8, CL);
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
        Const.GL_DEBUG && logger.logDebug("DailyGameState.setToTodaysGame() dailyGameNumber:", dailyGameNumber, "gameState");
        if (Persistence.hasTestDailyGameWords()) {
            COV(1, CL);
            [start, target] = Persistence.getTestDailyGameWords();
            dailyGameNumber = Const.TEST_DAILY_GAME_NUMBER;
            Const.GL_DEBUG && logger.logDebug("DailyGameState.setToTodaysGame() override from test vars to dailyGameNumber:",
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
            streak: 0,
        };

        // Now create a histogram for each number of wrong moves, and initialize
        // their values to 0. The stat properties for these is 0..TOO_MANY_PENALTIES.

        dailyGameState.penaltyHistogram = [];
        for (let nPenalties = 0; nPenalties <= Const.TOO_MANY_PENALTIES; nPenalties++) {
            dailyGameState.penaltyHistogram[nPenalties] = 0;
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
            // already set
            return;
        }
        this.baseDate = Const.WORD_CHAIN_EPOCH_DATE;

        // Are we changing the number of minutes per day to make time move more quickly?
        if (Persistence.hasTestMinutesPerDay()) {
            // Yes, so override the standard one day increment.
            const debugMinPerDay = Persistence.getTestMinutesPerDay();
            this.dateIncrementMs = debugMinPerDay * 60 * 1000;
            Const.GL_DEBUG && logger.logDebug("Setting minutes per day to:",
                    debugMinPerDay, "dateIncrementMs to:", this.dateIncrementMs,
                    "daily");
        }

        // Are we changing when the Epoch starts (for debugging purposes)?
        if (Persistence.hasTestEpochDaysAgo()) {
            COV(1, CL);
            // Yes, so recalculate the base date, which we use to get the base timestamp below.
            const newEpochMs = Date.now(),
                  daysAgo = Persistence.getTestEpochDaysAgo(),
                  msAgo = daysAgo * this.dateIncrementMs;

            this.baseDate = new Date(newEpochMs - msAgo);
            Const.GL_DEBUG && logger.logDebug("Setting epoch to:", daysAgo, "days ago", "daily");
        }

        this.baseTimestamp = this.baseDate.getTime();
        Const.GL_DEBUG && logger.logDebug("epoch timestamp is set to:",
                new Date(this.baseTimestamp), "daily");
        COV(2, CL);
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

        // Determine what emoji to use to show the user's "score".
        if (this.numPenalties() >= Const.TOO_MANY_PENALTIES) {
            COV(1, CL);
            // Too many wrong moves.
            shareString += Const.CONFOUNDED;
            gameWon = false;
        } else {
            COV(2, CL);
            // Show the emoji in NUMBERS corresponding to how many wrong moves.
            // A bit of a misnomer, but the value for 0 is a star.
            shareString += Const.NUMBERS[this.numPenalties()];
            gameWon = true;
        }

        COV(3, CL);

        // Add a line for the streak.
        shareString += `\nStreak: ${this.getStat('streak')}`;

        // Add a line the start/target.
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

        // start with the start word shown in purple
        let emoji = Const.PURPLE_SQUARE;
        shareString += emoji.repeat(startLength) + "\n";

        // Show all the words played.
        let colorblindMode = Persistence.getColorblindMode();
        Persistence.saveDailyGameState2(this);
        for (let [moveRating, wordLength] of wordsBetweenStartAndTarget) {

            // We don't include unplayed words in the share string. This happens when
            // there are too many wrong moves. The moveSummary includes the correct
            // unplayed words leading from the last wrong word to the target, but we
            // don't want to show them.
            // TODO - this use-case is obsolete.  When there are too many wrong moves,
            // the future words get summarized as SHOWN_MOVE, not FUTURE.

            if ((moveRating == Const.FUTURE) || (moveRating == Const.CHANGE_NEXT)) {
                break;
            }

            // Determine which color square to display for this word.
            if (moveRating === Const.OK || moveRating === Const.SCRABBLE_WORD) {
                // Word didn't increase the count; pick color indicating "good".
                COV(4, CL);
                emoji = colorblindMode ? Const.BLUE_SQUARE : Const.GREEN_SQUARE;
            } else if (moveRating === Const.WRONG_MOVE) {
                // Word increased the count; pick color indicating "bad".
                COV(5, CL);
                emoji = colorblindMode ? Const.ORANGE_SQUARE : Const.RED_SQUARE;
            } else if (moveRating === Const.GENIUS_MOVE) {
                COV(6, CL);
                emoji = colorblindMode ? Const.GOLD_SQUARE : Const.GOLD_SQUARE;
            } else if (moveRating === Const.DODO_MOVE) {
                // These used to be brown squares, but they were off-putting.
                COV(7, CL);
                emoji = colorblindMode ? Const.ORANGE_SQUARE : Const.RED_SQUARE;
            } else if (moveRating === Const.SHOWN_MOVE) {
                COV(8, CL);
                emoji = colorblindMode ? Const.GRAY_SQUARE : Const.GRAY_SQUARE;
            }

            // Now repeat that emoji for the length of the word and add a newline,
            // creating a row that looks like the row of tiles in the game.
            COV(9, CL);
            shareString += emoji.repeat(wordLength) + "\n";
        }

        // Now, add the target
        if (gameWon) {
            COV(10, CL);
            emoji = colorblindMode ? Const.BLUE_SQUARE : Const.GREEN_SQUARE;
        } else {
            COV(11, CL);
            emoji = colorblindMode ? Const.ORANGE_SQUARE : Const.RED_SQUARE;
        }

        COV(12, CL);
        shareString += emoji.repeat(targetLength) + "\n";

        // Add the URL to the game and send the trimmed result.
        // Note that in shareCallback() we are ONLY copying to the
        // clipboard; if we ever go back to doing a "direct share"
        // we will want to append Const.SHARE_URL_FOR_FB, a "faux" URL.
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
        if (!this.gameIsBroken()) {
            COV(1, CL);
            this.statsBlob[whichStat] = statValue;
            Const.GL_DEBUG && logger.logDebug("DailyGameState.setStat() setting and saving", whichStat, "to", statValue, "daily");
            this.persist();
        }
        COV(2, CL);
    }

    gameIsBroken() {
        const CL = "DailyGameState.gameIsBroken";
        COV(0, CL);
        return this.dailyGameNumber === Const.BROKEN_DAILY_GAME_NUMBER;
    }

    gameIsOld() {
        const CL = "DailyGameState.gameIsOld";
        COV(0, CL);
        Const.GL_DEBUG && logger.logDebug("DailyGameState.gameIsOld() dailyGameNumber:", this.dailyGameNumber , "daily");
        return
            (this.dailyGameNumber != Const.TEST_DAILY_GAME_NUMBER) &&
            (!this.gameIsBroken()) && 
            (this.calculateGameNumber() > this.dailyGameNumber);
    }

    calculateGameNumber() {
        const CL = "DailyGameState.calculateGameNumber";
        COV(0, CL);
        this.setBaseTimestamp();  // only updates on the first call
        const nowTimestamp = (new Date()).getTime();
        const msElapsed = nowTimestamp - this.baseTimestamp;
        const gameNumber = Math.floor(msElapsed / this.dateIncrementMs);
        Const.GL_DEBUG && logger.logDebug("calculateGameNumber(): base: ",
                this.baseTimestamp, "now:", nowTimestamp, ", elapsed since base:",
                msElapsed, ",gameNumber:", gameNumber, "daily");
        return gameNumber;
    }

    getMsUntilNextGame() {
        const CL = "DailyGameState.getMsUntilNextGame";
        COV(0, CL);
        const nextGameNum = this.calculateGameNumber() + 1,
              nextGameTimestamp = this.baseTimestamp + (nextGameNum * this.dateIncrementMs),
              msUntilNextGame = nextGameTimestamp - (new Date()).getTime();

        Const.GL_DEBUG && logger.logDebug("DailyGameState.getMsUntilNextGame(): nextGameNum:",
                nextGameNum, "msUntilNextGame:", msUntilNextGame, "daily");
        return msUntilNextGame;
    }

    // A list summarizing the moves of the game.
    // Unplayed words get a move rating of Const.FUTURE
    // Use case: this is only used for creating a share string, which means the daily
    // game is over.  There can be no unnplayed words.
    // TODO - don't return unplayed words in a share string?

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
        return summary;
    }   

    // Call this once and only once  whenever a daily game is finished (in addWord() or showNextMove()).
    // The caller needs to save the game state after calling this.
    updateStateAfterGame() {
        const CL = "DailyGameState.updateStateAfterGame";
        COV(0, CL);
        if (this.isWinner()) {
            COV(1, CL);
            this.incrementStat("gamesWon");
            this.incrementStat("streak");
        } else if (this.isLoser()) {
            COV(2, CL);
            this.incrementStat("gamesLost");
            this.setStat("streak", 0);
        }

        let penaltyCount = this.numPenalties();
        if (penaltyCount >= Const.TOO_MANY_PENALTIES) {
            COV(3, CL);
            // Failed games show the remaining words, which count as wrong steps,
            // but we don't want to count that in the stat.
            penaltyCount = Const.TOO_MANY_PENALTIES;
        }
        this.penaltyHistogram[penaltyCount] += 1;
        COV(4, CL);
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
                let [testStart, testTarget] = Persistence.getTestPracticeGameWords();
                if ((gameState.start != testStart) || (gameState.target != testTarget)) {
                    // The recovered practice game doesn't use the test start,target words, 
                    // so we just create a brand new game, which does use the test vars given.
                    COV(3, CL);
                    gameState = PracticeGameState.__fromScratch(dictionary);
                }
            }
        }
        COV(4, CL);
        gameState.persist();
        return gameState;
    }

    // don't call __fromObj() from outside the class
    static __fromObj (dictionary, recoveredPracticeGameStateObj) {
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
            rand = Math.floor(Math.random() * puzzles.length);
            Const.GL_DEBUG && logger.logDebug("found",  puzzles.length, "puzzles starting with", startWord, "Choosing #", rand, "gameState");
            let puzzle = puzzles[rand];
            Const.GL_DEBUG && logger.logDebug("selected random puzzle: " + puzzle.toStr(), "gameState");
            return [puzzle.getStart(), puzzle.getLastWord()];
        } else {
            console.error("no practice puzzles found with start word", startWord);
            return ["dog", "bite"];
        }

    }

    // Call this once and only once  whenever a practice game is finished (in addWord() or showNextMove())
    // The caller needs to call persist() after calling this.
    updateStateAfterGame() {
        const CL = "PracticeGameState.updateStateAfterGame";
        COV(0, CL);
        this.gamesRemaining -= 1;
    }

    // called when the daily game is rolled over, originally from AppDisplay.
    // TODO = should be called from static clock manager outside of the display.
    resetPracticeGameCounter() {
        const CL = "PracticeGameState.resetPracticeGameCounter";
        COV(0, CL);
        this.gamesRemaining = Const.PRACTICE_GAMES_PER_DAY;
        this.persist();
    }
}

export {GameState, DailyGameState, PracticeGameState};
