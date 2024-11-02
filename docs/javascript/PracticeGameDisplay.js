import { ElementUtilities } from './ElementUtilities.js';
import { Game } from './Game.js';
import { GameDisplay } from './GameDisplay.js';
import { Persistence } from './Persistence.js';
import * as Const from './Const.js';

class PracticeGameDisplay extends GameDisplay {

    /* ----- Construction ----- */

    constructor(appDisplay, gameDiv, pickerDiv) {
        super(appDisplay, gameDiv, pickerDiv, "practice-picker");

        this.practiceGamesPerDay = Const.PRACTICE_GAMES_PER_DAY; // can be overridden using URL query vars or the setter func
        // Are we debugging the number of practice games allowed?
        this.maxGamesIntervalMs = 24 * 60 *60 * 1000; // one day in ms
        if (this.queryVars.has(Const.QUERY_STRING_DEBUG_MINUTES_PER_DAY) ) {
            this.maxGamesIntervalMs = this.queryVars.get(Const.QUERY_STRING_DEBUG_MINUTES_PER_DAY) * 60 * 1000;
        }

        if (this.queryVars.has(Const.QUERY_STRING_PRACTICE_GAMES_PER_DAY) ) {
            this.practiceGamesPerDay = this.queryVars.get(Const.QUERY_STRING_PRACTICE_GAMES_PER_DAY);
        }
        // We use timestamps to ensure the user doesn't play more than the maximum
        // number of timestamps per day; 

        if (this.anyGamesRemaining()) {
            this.updateWords();
        }
    }

    setPracticeGamesPerDay(n) {
        this.practiceGamesPerDay = n;
    }

    // this is a virtual function of the base class.  It is called after any play that adds a new 
    // word to the solution (delete or letter picked).  

    updateGameInProgressPersistence(gameResult) {
        if (Game.moveIsValid(gameResult)) {
            Persistence.savePracticeGameState(this.gameState);
        } 
    }

    // this is a virtual function that tells the display if the user requested the solution for the (practice) game in progress
    getSolutionShown() {
        return Persistence.getPracticeSolutionShown();
    }

    /* ----- Callbacks ----- */

    // newGameCallback() should only be exposed to the user if we already know that there are practice games remaining.
    newGameCallback(event) {
        this.updateWords();
    }

    /* ----- Utilities ----- */

    // This will be called from GameDisplay when the game is determined to be over.
    additionalGameOverActions() {
        Const.GL_DEBUG && this.logDebug("PracticeGameDisplay.additionalGameOverActions() called", "practice");
        // Clear out the practice game words in the cookies.
        Persistence.clearPracticeGameDef();

        // If we have games remaining, add a button to the "post game div" to start a new game.`
        if (this.anyGamesRemaining()) {
            this.newGameButton = ElementUtilities.addElementTo(
                "button", this.postGameDiv,
                {id: "new-game", class: "wordchain-button game-button"},
                "New Game");

            // Save 'this' as the callback obj.
            ElementUtilities.setButtonCallback(this.newGameButton, this, this.newGameCallback);
        }
    }

    // Called from AppDisplay when "Solution" button is clicked.
    showSolution() {
        // TODO-PRODUCTION: Add an "are you sure?"
        this.game.finishGame();
        Persistence.savePracticeSolutionShown();
        this.showGameAfterMove();
    }

    // anyGamesRemaining() cleans up the saved list of recently played games' timestamps.
    // It removes ones that are more than 24 hours old, and returns true/false depening 
    // on how many are  left compared to the allowed number per day.

    anyGamesRemaining() {
        let now = (new Date()).getTime();

        let practiceGameTimestamps = Persistence.getPracticeTimestamps();

        // remove any any games that have aged out. 

        practiceGameTimestamps = practiceGameTimestamps
            .filter(timestamp => (now-timestamp) < this.maxGamesIntervalMs);

        // update the cookie now that we have removed any expired timestamps
        Persistence.savePracticeTimestamps(practiceGameTimestamps);

        // return value indicates if there are any practice games left today.
        let ret = (practiceGameTimestamps.length < this.practiceGamesPerDay);
        Const.GL_DEBUG && this.logDebug("anyGamesRemaining(): ", ret, "practice");
        return ret;
    }

    addNewPracticeGameTimestamp() {
        // Save the timestamp of this game in the instance and cookies.
        let updateTime = (new Date()).getTime();
        let practiceGameTimestamps = Persistence.getPracticeTimestamps();
        practiceGameTimestamps.push(updateTime);
        if (practiceGameTimestamps.length > this.practiceGamesPerDay) {
            console.error("should not be trying to start a practice game after ", this.practiceGamesPerDay, " games played");
        }
        Persistence.savePracticeTimestamps(practiceGameTimestamps);
    }

    // updateWords starts a new game.  It should not be possible to call it if there are no more games left.
    // startWord and targetWord are parameters for testing only.
    updateWords(startWord=null, targetWord=null) {

        Persistence.clearPracticeSolutionShown();
        let gameState = [];
        if (startWord && targetWord) {
            this.startWord = startWord;
            this.targetWord = targetWord;
            this.addNewPracticeGameTimestamp();
        } else {
            // See if we have words in the cookie.
            [this.startWord, this.targetWord] = Persistence.getPracticeGameDef();

            if (!this.startWord || this.startWord.length === 0) {
                // No words in the cookie; get new ones from the Game class and save them.
                [this.startWord, this.targetWord] = Game.getPracticePuzzle();
                //[this.startWord, this.targetWord] = ["FATE", "CAT"];
                this.addNewPracticeGameTimestamp();
                Persistence.savePracticeGameDef(this.startWord, this.targetWord);
                Persistence.clearPracticeGameState();
            } else {
                // We did have start/target words; get any words already played.
                // Don't add a timestamp for this recovered game-in-progress.
                gameState = Persistence.getPracticeGameState();
            }
        }

        // Now we're ready to construct (and display) the game.  
        this.constructGame(this.startWord, this.targetWord, gameState);
    }
}

export { PracticeGameDisplay };
