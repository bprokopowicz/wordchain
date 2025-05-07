import * as Const from './Const.js';
import { BaseLogger } from './BaseLogger.js';
import { Solver, Solution,  SolutionStep } from './Solver.js';
import { Persistence } from './Persistence.js';

class PlayedWord {
    constructor (word, rating) {
        this.word = word;
        this.rating = rating;
    }
}

class GameState {

    // Both daily and practice games have constructed almost empty, with just a dictionary.
    // Use setFromSolution(solution) to define the puzzle:
    //     start, target, initialSolution, playedWords, unplayedWords
    // GameState should not be constructed except by derived classes:
    // DailyGameState and PracticeGameState

    constructor(dictionary) {
        this.dictionary = dictionary;
        this.playedWords = [];   // includes start
        this.unplayedWords = []; // does NOT include target TODO: should include target
        this.start = "";
        this.target = "";
        this.initialSolution = null;

    }

    static logger = new BaseLogger();

    // both daily and practice games have their puzzle properties (start, target, played words,
    // initialSolution set using initialize.  The use case is a brand new game, where
    // the start word is played are the others are not.

    // attributes
    // start: string for initial word
    // target: string for final word
    // initialSolution: the solution from start to target, stored as list of bare words
    // playedWords: array of PlayedWord: initially just the start word
    // unplayedWords: arrays of strings: initially everything from second word to target
    // 

    initialize(start, target) {
        const solution = Solver.solve(this.dictionary, start, target);
        if (solution.hadNoErrors()) {
            let dailyGameState = new DailyGameState(this.dictionary);
            this.start = start;
            this.target = target;
            this.initialSolution = solution.getSolutionWords();
            this.playedWords.push(new PlayedWord(start, Const.OK));
            this.unplayedWords = solution.getSolutionSteps()
                .filter((step) => (!step.isPlayed))  // this will skip the start word which is marked as played
                // TODO - get isPlayed out of the Solution/Solver classes
                .map((unplayedStep) => (unplayedStep.word));
            return this;
        } else {
            return null;
        }
    }

    // utilities for accessing the played words as strings (for testing)

    playedWordsAsString() {
        return this.playedWords.map((playedWord) => playedWord.word).join(',');
    }

    unplayedWordsAsString() {
        return this.unplayedWords.join(',');
    }

    // game play - does not validate that word added is actually OK to add, as that 
    // should be done before adding a word.

    addSpace(spaceNumber) {
        // adds a played word as a copy of the last played word, with a '?' inserted in the 
        // the new space
        let lastWord = this.playedWords[this.playedWords-1].word;
        let [pre,post] = [lastWord.substring(0, spaceNumber), lastWord.substring(spaceNumber)];
        let wordWithSpace = pre + Const.HOLE + post;
        this.playedWords.push(new PlayedWord(wordWithSpace, Const.OK));
    }

    // play 'word'.  Returns the move rating.
    // If 'word' was the expected next word, we need to re-solve and adjust the unplayed
    // words.  
    // DOES NOT VERIFY IF word is a valid word, or if word can be reached from previous word.
    // Return: the moveRating for playing this word.

    addWord(word) {
        let lastWord = this.playedWords[this.playedWords.length-1].word;
        if (lastWord.indexOf(Const.HOLE) >= 0) {
            // we are playing a word after a HOLE word.  Remove the HOLE word. 
            this.playedWords.pop();
        }
        let moveRating = Const.OK; // will override below based on new solution
        if (word == this.unplayedWords[0]) {
            // same word as WordChain used
            this.unplayedWords.pop();
            this.playedWords.push(new PlayedWord(word, moveRating));
        } else {
            let stepsRemaining = this.unplayedWords.length;
            let solution = Solver.solve(this.dictionary, word, this.target);
            let newStepsRemaining = solution.numWords();
            if (newStepsRemaining == stepsRemaining) {
                // different word, same length as WordChain used
                // let them know if it was a scrabble word, although not genius.
                if ( !this.dictionary.isWord(word) ) {
                    moveRating = Const.SCRABBLE_WORD;
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
            this.playedWords.push(new PlayedWord(word, moveRating));
            this.unplayedWords = solution.getSolutionSteps()
                .filter((step) => (!step.isPlayed))  
                .map((unplayedStep) => (unplayedStep.word));
        }
        Persistence.saveDailyGameState2(this);
    }
}

class DailyGameState extends GameState{
    // with gameNumber, date info, streak, and stats

    constructor(dictionary) {
        super(dictionary);
        this.baseDate = null;
        this.baseTimestamp = null;
        this.dateIncrementMs = 24 * 60 *60 * 1000; // one day in ms;
    }

    // one factory method to create a new DailyGameState object, either from recovery
    // or from scratch if there is nothing to recover or it is old.

    static factory(dictionary) {
        let recoveredObj = Persistence.getDailyGameState();
        if (Array.isArray(recoveredObj) && (recoveredObj.length == 0)) {
            // we get an empty list if there is no recovered obj.  TODO - use null
            return DailyGameState.fromScratch(dictionary);
        }

        // Check to see if recovered game number is today's game number or the test game number.
        // If not, we can't use the recovered game.
        let recoveredDailyGameState = DailyGameState.fromObj(dictionary, recoveredObj);
        if (recoveredDailyGameState.dailyGameNumber != recoveredDailyGameState.todaysGameNumber() &&
            (recoveredDailyGameState.dailyGameNumber != Const.TEST_DAILY_GAME_NUMBER)) {
            return DailyGameState.fromScratch(dictionary);
        }
        return recoveredDailyGameState;
    }

    // Don't call fromScratch() from outside the class.
    // If test vars are set, use them here.  They are not use in recovery.
    static fromScratch(dictionary) {
        let dailyGameState = new DailyGameState(dictionary);
        let dailyGameNumber = dailyGameState.todaysGameNumber();
        let start, target;

        if (Persistence.hasTestDailyGameWords()) {
            [start, target] = Persistence.getTestDailyGameWords();
            dailyGameNumber = Const.TEST_DAILY_GAME_NUMBER;
        } else {

            // Valid daily game numbers run from 0 to GameWords.length-1.  If the calculated
            //  value is outside that range, a place-holder game is used. 

            if ((dailyGameNumber < 0) || (dailyGameNumber >= Const.DAILY_GAMES.length)) {
                dailyGameNumber = Const.BROKEN_DAILY_GAME_NUMBER;
                [start, target] = [Const.BACKUP_DAILY_GAME_START, Const.BACKUP_DAILY_GAME_TARGET];
            } else {
                [start, target] = Const.DAILY_GAMES[dailyGameNumber];
            }
        }
        dailyGameState.dailyGameNumber = dailyGameNumber;
        if (dailyGameState.initialize(start, target) == null) {
            return null;
        } 
        Persistence.saveDailyGameState2(dailyGameState); // saves a JSON blob
        return dailyGameState;
    }

    // don't call fromObj() from outside the class
    static fromObj (dictionary, recoveredDailyGameStateObj) {
        let dailyGameState = new DailyGameState(dictionary);
        Object.assign(dailyGameState, recoveredDailyGameStateObj);
        return dailyGameState;
    }

    // baseTimestamp is the world-wide starting point determining for Wordchain games.
    // It is hardcoded as baseDate but can be over-ridden by setting the testing
    // var TestEpochDaysAgo.

    setBaseTimestamp() {
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
            Const.GL_DEBUG && GameState.logger.logDebug("Setting minutes per day to:",
                    debugMinPerDay, "dateIncrementMs to:", this.dateIncrementMs,
                    "daily");
        }

        // Are we changing when the Epoch starts (for debugging purposes)?
        if (Persistence.hasTestEpochDaysAgo()) {
            // Yes, so recalculate the base date, which we use to get the base timestamp below.
            const newEpochMs = Date.now(),
                  daysAgo = Persistence.getTestEpochDaysAgo(),
                  msAgo = daysAgo * this.dateIncrementMs;

            this.baseDate = new Date(newEpochMs - msAgo);
            Const.GL_DEBUG && GameState.logger.logDebug("Setting epoch to:", daysAgo, "days ago", "daily");
        }

        this.baseTimestamp = this.baseDate.getTime();
        Const.GL_DEBUG && GameState.logger.logDebug("epoch timestamp is set to:",
                new Date(this.baseTimestamp), "daily");
    }

    todaysGameNumber() {
        this.setBaseTimestamp();  // only updates on the first call
        const nowTimestamp = (new Date()).getTime();
        const msElapsed = nowTimestamp - this.baseTimestamp;
        const gameNumber = Math.floor(msElapsed / this.dateIncrementMs);
        Const.GL_DEBUG && GameState.logger.logDebug("calculateGameNumber(): base: ",
                this.baseTimestamp, "now:", nowTimestamp, ", elapsed since base:",
                msElapsed, ",gameNumber:", gameNumber, "daily");
        return gameNumber;
    }
}

class PracticeGameState extends GameState{
    // with gamesRemaining, and nextGame();

    // don't call from outside this class
    constructor(dictionary) {
        super(dictionary);
    }

    // Use factory(dictionary) to create the first PracticeGameState on start-up.  It will
    // restore a game from persistence if any, or create a new game.  The restored game may
    // be finished or in progress.

    static factory(dictionary) {
        let recoveredObj = Persistence.getPracticeGameState();
        if (recoveredObj == null) {
            return PracticeGameState.fromScratch(dictionary);
        } else {
            return PracticeGameState.fromObj(dictionary, recoveredObj);
        }
    }

    // don't call fromObj() from outside the class
    static fromObj (dictionary, recoveredPracticeGameStateObj) {
        Object.assign(practiceGameState, recoveredPracticeGameStateObj);
        return practiceGameState;
    }

    // don't call fromScratch() from outside the class
    static fromScratch(dictionary) {
        let practiceGameState = new PracticeGameState(dictionary);
        let [start, target]  =  Game.getPracticePuzzle();
        if (practiceGameState.initialize(start, target) == null) {
            return null;
        }
        practiceGameState.gamesRemaining = Const.PRACTICE_GAMES_PER_DAY;
        Persistence.savePracticeGameState(practiceGameState);
        return PracticeGameState;
    }

    // returns a new game if available, or null
    nextGame() {
        if (this.gamesRemaining > 0) {
            let newGame = PracticeGameState.fromScratch(dictionary);
            newGame.gamesRemaining = newGame.gamesRemaining - 1;
            Persistence.savePracticeGameState(newGame);
            return newGame;
        } else {
            return null;
        }
    }
}

export {GameState, DailyGameState, PracticeGameState};
