import { Cookie } from './Cookie.js';
import { ElementUtilities } from './ElementUtilities.js';
import { Game } from './Game.js';
import { GameDisplay } from './GameDisplay.js';
import * as Const from './Const.js';

/*
** See the Cookie class for a description of the cookies that this class uses.
*/

class PracticeGameDisplay extends GameDisplay {

    /* ----- Class Variables ----- */

    static MaxGamesIntervalMs = 24 * 60 *60 * 1000; // one day in ms

    /* ----- Construction ----- */

    constructor(appDisplay, gameDiv, pickerDiv) {
        super(appDisplay, gameDiv, pickerDiv, "practice-picker");

        // Are we debugging the number of practice games allowed?
        if (this.queryVars.has(Const.QUERY_STRING_DEBUG_MINUTES_PER_DAY) ) {
            PracticeGameDisplay.MaxGamesIntervalMs = this.queryVars.get(Const.QUERY_STRING_DEBUG_MINUTES_PER_DAY) * 60 * 1000;
        }

        // We use timestamps to ensure the user doesn't play more than the maximum
        // number of timestamps per day; 

        if (this.anyGamesRemaining()) {
            this.updateWords();
        }
    }

    // this is a virtual function of the base class.  It is called after any play that adds a new 
    // word to the solution (delete or letter picked).  

    updateGamePersistence(gameResult) {
        if (Game.moveIsValid(gameResult)) {
            Cookie.saveJson(Cookie.PRACTICE_GAME_WORDS_PLAYED, this.gameState);
        } 
    }


    /* ----- Callbacks ----- */

    // newGameCallback() should only be exposed to the user if we already know that there are practice games remaining.
    newGameCallback(event) {
        this.updateWords();
    }

    /* ----- Utilities ----- */

    // This will be called from GameDisplay when the game is determined to be over.
    additionalGameOverActions() {
        this.logDebug("PracticeGameDisplay.additionalGameOverActions() called", "practice");
        // Clear out the practice game words in the cookies.
        Cookie.remove(Cookie.PRACTICE_GAME_START);
        Cookie.remove(Cookie.PRACTICE_GAME_TARGET);

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
        // TODO: Add an "are you sure?"
        this.game.finishGame();

        // Pass "true" to showGameAfterMove() to indicate the user has elected to show the
        // solution so that the happy "game won" toast is not shown.
        this.showGameAfterMove(true);
    }

    // anyGamesRemaining() cleans up the saved list of recently played games' timestamps.
    // It removes ones that are more than 24 hours old, and returns true/false depening 
    // on how many are  left compared to the allowed number per day.

    anyGamesRemaining() {
        let now = (new Date()).getTime();

        let practiceGameTimestamps = Cookie.getJsonOrElse(Cookie.PRACTICE_GAME_TIMESTAMPS, []);

        // remove any any games that have aged out. 

        practiceGameTimestamps = practiceGameTimestamps
            .filter(timestamp => (now-timestamp) < PracticeGameDisplay.MaxGamesIntervalMs);

        // update the cookie now that we have removed any expired timestamps
        Cookie.save(Cookie.PRACTICE_GAME_TIMESTAMPS, JSON.stringify(practiceGameTimestamps));

        // return value indicates if there are any practice games left today.
        let ret = (practiceGameTimestamps.length < Const.PRACTICE_GAMES_PER_DAY);
        this.logDebug("anyGamesRemaining(): ", ret, "practice");
        return ret;
    }

    addTimestamp() {
        // Save the timestamp of this game in the instance and cookies.
        let updateTime = (new Date()).getTime();
        let practiceGameTimestamps = Cookie.getJsonOrElse(Cookie.PRACTICE_GAME_TIMESTAMPS, []);
        practiceGameTimestamps.push(updateTime);
        if (practiceGameTimestamps.length > Const.PRACTICE_GAMES_PER_DAY) {
            console.error("should not be trying to start a practice game after ", Const.PRACTICE_GAMES_PER_DAY, " games played");
        }
        Cookie.save(Cookie.PRACTICE_GAME_TIMESTAMPS, JSON.stringify(practiceGameTimestamps));
    }

    // updateWords starts a new game.  It should not be possible to call it if there are no more games left.
    // startWord and targetWord are parameters for testing only.
    updateWords(startWord=null, targetWord=null) {

        let wordsPlayed = [];
        if (startWord && targetWord) {
            this.startWord = startWord;
            this.targetWord = targetWord;
            this.addTimestamp();
        } else {
            // See if we have words in the cookie.
            this.startWord  = Cookie.get(Cookie.PRACTICE_GAME_START);
            this.targetWord = Cookie.get(Cookie.PRACTICE_GAME_TARGET);

            if (!this.startWord || this.startWord.length === 0) {
                // No words in the cookie; get new ones from the Game class and save them.
                this.addTimestamp();
                [this.startWord, this.targetWord] = Game.getPracticePuzzle();
                //[this.startWord, this.targetWord] = ["FATE", "CAT"];
                Cookie.save(Cookie.PRACTICE_GAME_START, this.startWord);
                Cookie.save(Cookie.PRACTICE_GAME_TARGET, this.targetWord);
                Cookie.saveJson(Cookie.PRACTICE_GAME_WORDS_PLAYED, []);
            } else {
                // We did have start/target words; get any words already played.
                // Don't add a timestamp for this recovered game-in-progress.
                wordsPlayed = Cookie.getJsonOrElse(Cookie.PRACTICE_GAME_WORDS_PLAYED, []);
            }
        }

        // Now we're ready to construct (and display) the game.
        this.constructGame(this.startWord, this.targetWord, wordsPlayed);
    }
}

export { PracticeGameDisplay };
