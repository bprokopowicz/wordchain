import * as Const from './Const.js';
import { BaseLogger } from './BaseLogger.js';
import { Solver, Solution,  SolutionStep } from './Solver.js';
import { Persistence } from './Persistence.js';
import { WordChainDict } from './WordChainDict.js';
import { C, showCoverage } from './Coverage.js';

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
        C("GS.ctor.0");
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
        C("GS.iP.0");
        [start, target] = [start.toUpperCase(), target.toUpperCase()];
        const solution = Solver.solve(this.dictionary, start, target);
        if (solution.hadNoErrors()) {
            this.start = start;
            this.target = target;
            this.initialSolution = solution.getSolutionWords(); // list of bare words
            this.ratedMoves = [new RatedMove(start, Const.OK)]; // the start word is recorded as a RatedMove
            this.unplayedWords = solution.getSolutionSteps()
                .filter((step) => (!step.isPlayed))  // this will skip the start word which is marked as played
                // TODO - get isPlayed out of the Solution/Solver classes
                .map((unplayedStep) => (unplayedStep.word));
            this.persist();
            return this;
        } else {
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
        Const.GL_DEBUG && logger.logDebug("playing word:", word, "last played word", this.lastPlayedWord(), "gameState");
        if (GameState.wordHasHole(this.lastPlayedWord())) {
            // we are playing a word after a HOLE word.  Remove the HOLE word. 
            Const.GL_DEBUG && logger.logDebug("removing played word with hole", "gameState");
            this.ratedMoves.pop();
        }
        let moveRating = Const.OK; // will override below based on new solution
        if (word == this.unplayedWords[0]) {
            Const.GL_DEBUG && logger.logDebug("GameState.addWord()", word,
                    "was expected.  Popping it from unplayed", "gameState");
            // same word as WordChain used; remove the first unplayed word
            this.unplayedWords.shift();
        } else {
            let stepsRemaining = this.unplayedWords.length;
            let solution = Solver.solve(this.dictionary, word, this.target);
            Const.GL_DEBUG && logger.logDebug(word, "was not expected. recomputed solution:", solution, "gameState");
            let newStepsRemaining = solution.numWords();
            if (newStepsRemaining == stepsRemaining) {
                // different word, same length as WordChain used
                // let them know if it was a scrabble word, although not genius.
                if ( !this.dictionary.isWord(word) ) {
                    moveRating = Const.SCRABBLE_WORD;
                    // add 'word' to the standard dictionary, because it might be needed again by Solver
                    this.dictionary.addWord(word);
                };
            } else if (newStepsRemaining == stepsRemaining+1) {
                // different word, one step longer than WordChain used
                moveRating = Const.WRONG_MOVE;
            } else if (newStepsRemaining == stepsRemaining+2) {
                // different word, two steps longer than WordChain used
                moveRating = Const.DODO_MOVE;
            } else if (newStepsRemaining < stepsRemaining) {
                // different word, step shorter than WordChain used
                moveRating = Const.GENIUS_MOVE;
            }
            this.unplayedWords = solution.getSolutionSteps()
                .filter((step) => (!step.isPlayed))  
                .map((unplayedStep) => (unplayedStep.word));
        }
        this.ratedMoves.push(new RatedMove(word, moveRating));
        if (this.isOver()) {
            Const.GL_DEBUG && logger.logDebug ("GameState.addWord() game is over");
            this.updateStateAfterGame();
        }
        this.persist();
        return moveRating;
    }

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

    // The game is done if the last played word is the target, or there are too many penalties.

    isOver() {
        C("GS.iO.0");
        let res = (this.lastPlayedWord() == this.target) || this.isLoser();
        Const.GL_DEBUG && logger.logDebug("GameState.isOver() lastPlayedWord", this.lastPlayedWord(),
                "target", this.target, "returns:", res, "gameState");
        return res;
    }

    isLoser() {
        return this.numPenalties() >= Const.TOO_MANY_PENALTIES;
    }

    isWinner() {
        return this.isOver() && !this.isLoser();
    }

    finishGame() {
        C("GS.fG.0");
        // play the next unplayed words until they are all played
        while (this.unplayedWords.length > 0) {
            this.addWord(this.unplayedWords[0]);
        }
    }

    showUnplayedMoves() {
        C("GS.sUM.0");
        // show the remaining moves
        while (this.unplayedWords.length > 0) {
            this.showNextMove();
        }
    }
    
    showNextMove() {
        C("GS.sNM.0");
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

    toStr() {
        return JSON.stringify(this);
    }
}

class DailyGameState extends GameState{
    // adds gameNumber, statsBlob, penaltyHistogram, isConstructedAsNew 

    constructor(dictionary) {
        C("DGS.ctor.0");
        super(dictionary);
        this.baseDate = null;
        this.baseTimestamp = null;
        this.dateIncrementMs = 24 * 60 *60 * 1000; // one day in ms;
        this.isConstructedAsNew = false; // must be set to true in factory() if it is new
    }

    persist() {
        Persistence.saveDailyGameState2(this);
    }

    // Factory method to create a new DailyGameState object, either from recovery
    // or from scratch if there is nothing to recover or it is old.

    static factory(dictionary) {
        C("DGS.f.0");
        let recoveredObj = Persistence.getDailyGameState();
        Const.GL_DEBUG && logger.logDebug("DailyGameState.factory() recovers object:", recoveredObj, "gameState");
        if (recoveredObj == null) {
            C("DGS.f.1");
            let gameState = DailyGameState.__fromScratch(dictionary);
            gameState.persist();
            return gameState;
        }

        // Check to see if recovered game number is the test game number.  If so, we use 
        // it and don't adjust the streak.  If the test game is being played, the streak is undefined.
        // TODO: How do you test the streak, then?

        let recoveredDailyGameState = DailyGameState.__fromObj(dictionary, recoveredObj);

        Const.GL_DEBUG && logger.logDebug("DailyGameState.factory() GameState from object:",
                recoveredDailyGameState, "gameState");
        if  (recoveredDailyGameState.dailyGameNumber == Const.TEST_DAILY_GAME_NUMBER) {
            C("DGS.f.2");
            recoveredDailyGameState.persist();
            return recoveredDailyGameState;
        }

        // Check to see if the recovered daily game is today's game.  If so, use it as is.
        // Otherwise, set state to today's daily game.
        // If we recovered yesterday's game, and didn't win, the streak is over.
        // If the game we recovered is more than 2 days old, the streak is over.

        let todaysGameNumber = recoveredDailyGameState.calculateGameNumber(); // computes TODAY's game number
        if (recoveredDailyGameState.dailyGameNumber != todaysGameNumber) {
            // a new day, a new game.
            C("DGS.f.3");
            recoveredDailyGameState.isConstructedAsNew = true;

            // need a new game, but keep the recovered GameState for stats
            if (recoveredDailyGameState.dailyGameNumber <= todaysGameNumber - 2) {
                // we didn't play yesterday's game; streak is over
                recoveredDailyGameState.setStat("streak", 0);
            } else {
                // must be yesterday's game.  Did we win?
                // The case we're handling here is that it's an unfinished game.
                // If it was a lost game, we would have already set the streak
                // to 0 when it was lost.
                if (!recoveredDailyGameState.isWinner()) {
                    recoveredDailyGameState.setStat("streak", 0);
                }
            }
            // now, update game state to today's game, playing from the start.
            recoveredDailyGameState.setToTodaysGame();
        }
        recoveredDailyGameState.persist();
        return recoveredDailyGameState;
    }

    isNewDailyGame() {
        return this.isConstructedAsNew;
    }

    // this sets up today's puzzle
    setToTodaysGame() {
        C("DGS.sTTG.0");
        let dailyGameNumber = this.calculateGameNumber();
        let start, target;
        Const.GL_DEBUG && logger.logDebug("DailyGameState.setToTodaysGame() dailyGameNumber:", dailyGameNumber, "gameState");
        if (Persistence.hasTestDailyGameWords()) {
            C("DGS.sTTG.1");
            [start, target] = Persistence.getTestDailyGameWords();
            dailyGameNumber = Const.TEST_DAILY_GAME_NUMBER;
            Const.GL_DEBUG && logger.logDebug("DailyGameState.setToTodaysGame() override from test vars to dailyGameNumber:",
            dailyGameNumber, "start", start, "target", target, "gameState");
        } else {
            C("DGS.sTTG.2");
            // Valid daily game numbers run from 0 to GameWords.length-1.  If the calculated
            // value is outside that range, a place-holder game is used. 
            if ((dailyGameNumber < 0) || (dailyGameNumber >= Const.DAILY_GAMES.length)) {
                dailyGameNumber = Const.BROKEN_DAILY_GAME_NUMBER;
                [start, target] = [Const.BACKUP_DAILY_GAME_START, Const.BACKUP_DAILY_GAME_TARGET];
            } else {
                [start, target] = Const.DAILY_GAMES[dailyGameNumber];
            }
        }
        this.dailyGameNumber = dailyGameNumber;
        this.incrementStat("gamesStarted");
        return this.initializePuzzle(start, target);
    }
    
    // Don't call __fromScratch() from outside the class.
    // If test vars are set, use them here.  
    static __fromScratch(dictionary) {
        C("DGS.fS.0");

        let dailyGameState = new DailyGameState(dictionary);

        dailyGameState.constructedAsNew = true;

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
        if (dailyGameState.setToTodaysGame() != null) {
            Const.GL_DEBUG && logger.logDebug("DailyGameState.__fromScratch", dailyGameState, "gameState");
            return dailyGameState;
        } else {
            return null;
        }
    }

    // don't call __fromObj() from outside the class
    static __fromObj (dictionary, recoveredDailyGameStateObj) {
        C("DGS.fO.0");
        let dailyGameState = new DailyGameState(dictionary);
        Object.assign(dailyGameState, recoveredDailyGameStateObj);
        // Use-case for TEST_DAILY_GAME_START, TEST_DAILY_GAME_TARGET vars: 
        // if these are set, they MAY be overriding what we recovered.  If they do,
        // we re-initialize the puzzle using the test words.  If the test words are
        // the same as recovered, we go with the game as recovered.
        if (Persistence.hasTestDailyGameWords()) {
            C("DGS.fO.1");
            let [testStart, testTarget] = Persistence.getTestDailyGameWords();
            if ((testStart === dailyGameState.start) && (testTarget === dailyGameState.target)) {
                C("DGS.fO.2");
                Const.GL_DEBUG && logger.logDebug("DailyGameState.fromObj() recovered daily test game",
                        dailyGameState, "gameState");
            } else {
                C("DGS.fO.3");
                dailyGameState.dailyGameNumber = Const.TEST_DAILY_GAME_NUMBER;
                dailyGameState.initializePuzzle(testStart, testTarget);
                Const.GL_DEBUG && logger.logDebug("DailyGameState.fromObj() overriding from test vars to ", 
                        dailyGameState, "gameState")
            }
        }
        Const.GL_DEBUG && logger.logDebug("DailyGameState.__fromObj", dailyGameState, "gameState");
        return dailyGameState;
    }

    // baseTimestamp is the world-wide starting point determining for Wordchain games.
    // It is hardcoded as baseDate but can be over-ridden by setting the testing
    // var TestEpochDaysAgo.

    setBaseTimestamp() {
        C("DGS.sBT.0");
        if (this.baseTimestamp != null) {
            // already set
            return;
        }
        this.baseDate = Const.WORD_CHAIN_EPOCH_DATE;

        // Are we changing the number of minutes per day to make time move more quickly?
        if (Persistence.hasTestMinutesPerDay()) {
            C("DGS.sBT.1");
            // Yes, so override the standard one day increment.
            const debugMinPerDay = Persistence.getTestMinutesPerDay();
            this.dateIncrementMs = debugMinPerDay * 60 * 1000;
            Const.GL_DEBUG && logger.logDebug("Setting minutes per day to:",
                    debugMinPerDay, "dateIncrementMs to:", this.dateIncrementMs,
                    "daily");
        }

        // Are we changing when the Epoch starts (for debugging purposes)?
        if (Persistence.hasTestEpochDaysAgo()) {
            C("DGS.sBT.2");
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
    }

    // Increment the given stat, update the stats cookie, and update the stats display content.
    incrementStat(whichStat) {
        this.setStat(whichStat, this.getStat(whichStat) + 1);
    }

    getStat(whichStat) {
        return this.statsBlob[whichStat];
    }

    setStat(whichStat, statValue) {
        // Only set stats if this is a valid daily game.
        if (!this.gameIsBroken()) {
            this.statsBlob[whichStat] = statValue;
            Const.GL_DEBUG && logger.logDebug("DailyGameState.setStat() setting and saving", whichStat, "daily");
            this.persist();
        }
    }

    gameIsBroken() {
        return this.dailyGameNumber === Const.BROKEN_DAILY_GAME_NUMBER;
    }

    gameIsOld() {
        return (this.dailyGameNumber != Const.TEST_DAILY_GAME_NUMBER) && 
            (this.calculateGameNumber() > this.dailyGameNumber);
    }

    calculateGameNumber() {
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
        const nextGameNum = this.calculateGameNumber() + 1,
              nextGameTimestamp = this.baseTimestamp + (nextGameNum * this.dateIncrementMs),
              msUntilNextGame = nextGameTimestamp - (new Date()).getTime();

        Const.GL_DEBUG && logger.logDebug("DailyGameState.getMsUntilNextGame(): nextGameNum:",
                nextGameNum, "msUntilNextGame:", msUntilNextGame, "daily");
        return msUntilNextGame;
    }

    // Call this once and only once  whenever a daily game is finished (in addWord() or showNextMove()).
    // The caller needs to save the game state after calling this.
    updateStateAfterGame() {
        C("DGS.uSAG.0");
        if (this.isWinner()) {
            C("DGS.uSAG.1");
            this.incrementStat("gamesWon");
            this.incrementStat("streak");
        } else if (this.isLoser()) {
            C("DGS.uSAG.2");
            this.incrementStat("gamesLost");
        }

        let penaltyCount = this.numPenalties();
        if (penaltyCount >= Const.TOO_MANY_PENALTIES) {
            C("DGS.uSAG.3");
            // Failed games show the remaining words, which count as wrong steps,
            // but we don't want to count that in the stat.
            penaltyCount = Const.TOO_MANY_PENALTIES;
        }
        this.penaltyHistogram[penaltyCount] += 1;
    }
}

class PracticeGameState extends GameState{
    // adds gamesRemaining

    // don't call from outside this class
    constructor(dictionary) {
        C("PGS.ctor.0");
        super(dictionary);
    }

    persist() {
        Persistence.savePracticeGameState2(this);
    }

    // Use factory(dictionary) to create the first PracticeGameState on start-up.  It will
    // restore a game from persistence if any, or create a new game.  The restored game may
    // be finished or in progress.

    static factory(dictionary) {
        C("PGS.f.0");
        let recoveredObj = Persistence.getPracticeGameState();
        var gameState;
        if (recoveredObj == null) {
            C("PGS.f.1");
            gameState = PracticeGameState.__fromScratch(dictionary);
        } else {
            C("PGS.f.2");
            gameState = PracticeGameState.__fromObj(dictionary, recoveredObj);
            // the recovered object might be obsolete if the practice test vars were set to something else.
            if (Persistence.hasTestPracticeGameWords()) {
                let [testStart, testTarget] = Persistence.getTestPracticeGameWords();
                if ((gameState.start != testStart) || (gameState.target != testTarget)) {
                    C("PGS.f.3");
                    gameState = PracticeGameState.__fromScratch(dictionary);
                }
            }
        }
        C("PGS.f.3");
        gameState.persist();
        return gameState;
    }

    // don't call __fromObj() from outside the class
    static __fromObj (dictionary, recoveredPracticeGameStateObj) {
        C("PGS.fO.0");
        Const.GL_DEBUG && logger.logDebug("PracticeGameState.__fromObj using recovered:",
                recoveredPracticeGameStateObj, "gameState");
        let practiceGameState = new PracticeGameState(dictionary);
        Object.assign(practiceGameState, recoveredPracticeGameStateObj);
        Const.GL_DEBUG && logger.logDebug("PracticeGameState.__fromObj returning ", practiceGameState, "gameState");
        return practiceGameState;
    }

    //TODO dailyGameState not being reset after recovery, when finished.  Obvious!  We save the recovered state,
    //for stats, but need to clean out the other fields?

    // don't call __fromScratch() from outside the class
    static __fromScratch(dictionary) {
        C("PGS.fS.0");
        let practiceGameState = new PracticeGameState(dictionary);
        Const.GL_DEBUG && logger.logDebug("PracticeGameState.fromScratch() hasTestPracticeGameWords?", 
                Persistence.hasTestPracticeGameWords(), "gameState");
        var start, target;
        if (Persistence.hasTestPracticeGameWords()) {
            C("PGS.fS.1");
            [start, target] = Persistence.getTestPracticeGameWords();
        } else {
            C("PGS.fS.2");
            [start, target] = PracticeGameState.getPracticePuzzle();
        }
        if (Persistence.hasTestPracticeGamesPerDay()) {
            C("PGS.fS.3");
            practiceGameState.gamesRemaining = Persistence.getTestPracticeGamesPerDay();
        } else {
            C("PGS.fS.4");
            practiceGameState.gamesRemaining = Const.PRACTICE_GAMES_PER_DAY;
        }
        if (practiceGameState.initializePuzzle(start, target) != null) { 
            C("PGS.fS.5");
            Const.GL_DEBUG && logger.logDebug("PracticeGameState.__fromScratch", practiceGameState, "gameState");
            return practiceGameState;
        } else {
            return null;
        }
    }


    // Choose a random start/target that has a solution between
    // Const.PRACTICE_STEPS_MINIMUM and Const.PRACTICE_STEPS_MAXIMUM
    // steps. Returns an array: [startWord, targetWord].
    static getPracticePuzzle() {
        C("PGS.gPP.0");
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
        C("PGS.uSAG.0");
        this.gamesRemaining -= 1;
    }

    // called when the daily game is rolled over, originally from AppDisplay.
    // TODO = should be called from static clock manager outside of the display.

    resetPracticeGameCounter() {
        this.gamesRemaining = Const.PRACTICE_GAMES_PER_DAY;
        this.persist();
    }
}

export {GameState, DailyGameState, PracticeGameState};
