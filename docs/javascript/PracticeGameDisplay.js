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

        // Debug-only cookie that can be manually added to the time period.
        this.debugMinPerDay = Cookie.getInt("DebugPracticeMinPerDay");

        // Are we debugging limiting practice games?
        if (this.debugMinPerDay) {
            PracticeGameDisplay.MaxGamesIntervalMs = debugMinPerDay * 60 * 1000;
        }

        // We use timestamps to ensure the user doesn't play more than the maximum
        // number of timestamps per day; this.anyGamesRemaining will be set according
        // to whether <max> games have been played in the last 24 hours.
        this.updateTimestamps();

        if (this.anyGamesRemaining) {
            this.updateWords();
        }
    }

    /* ----- Pseudo Callbacks ----- */

    // Override superclass letterPicked() to update gameState and PracticeGameWordsPlayed cookie.
    letterPicked(letter, letterPosition) {
        if (this.game.isOver()) {
            console.error("PracticeGameDisplay.letterPicked(): game is already over");
            return Const.UNEXPECTED_ERROR;
        } 

        let gameResult = super.letterPicked(letter, letterPosition);

        if (gameResult === Const.OK) {
            this.practiceGameWordsPlayed = this.gameState;
            Cookie.saveJson("PracticeGameWordsPlayed", this.practiceGameWordsPlayed);
        } 
        return gameResult;
    } 

    /* ----- Callbacks ----- */

    newGameCallback(event) {
        // When the button was created we saved 'this' as callbackAccessor in the button
        // element; use it to access other instance data.
        const me = event.srcElement.callbackAccessor;
        me.updateWords();
    }

    // NOTE: No need to override additionClickCallback() an addition doesn't actually provide
    // a word and therefore we have no need to update the PracticeGameWordsPlayed cookie;
    // we'll pick up the new word in pickerChangeCallback().

    // Override superclass callback to update PracticeGameWordsPlayed cookie.
    deletionClickCallback(event) {
        let me = event.srcElement.callbackAccessor;

        if (me.game.isOver()) {
            console.error("PracticeGameDisplay.deletionClickCallback(): game is already over");
            return Const.UNEXPECTED_ERROR;
        }

        let gameResult = super.deletionClickCallback(event);

        if (gameResult === Const.OK) {
            me.practiceGameWordsPlayed = me.gameState;
            Cookie.saveJson("PracticeGameWordsPlayed", me.practiceGameWordsPlayed);
        }
        return gameResult;
    }

    /* ----- Utilities ----- */

    // This will be called in GameDisplay when the game is determined to be over.
    additionalGameOverActions() {
        // Clear out the practice game words in the cookies.
        Cookie.save("PracticeGameStart", "");
        Cookie.save("PracticeGameTarget", "");

        this.updateTimestamps();

        // If we have games remaining, add a button to the "post game div" to start a new game.`
        if (this.anyGamesRemaining) {
            this.newGameButton = ElementUtilities.addElementTo(
                "button", this.postGameDiv,
                {id: "new-game", class: "wordchain-button game-button"},
                "New Game");

            // Save 'this' in the newGameButton element so that we can access
            // it (via event.srcElement.callbackAccessor) in the callback.
            this.newGameButton.callbackAccessor = this;
            ElementUtilities.setButtonCallback(this.newGameButton, this.newGameCallback);
        }
    }

    isValid() {
        return this.anyGamesRemaining;
    }

    // Called from AppDisplay when "Solution" button is clicked.
    showSolution() {
        // TODO: Add an "are you sure?"
        this.game.finishGame();

        // Pass "true" to showMove() to indicate the user has elected to show the
        // solution so that the happy "game won" toast is not shown.
        this.showMove(true);
    }

    updateTimestamps() {
        this.updateTime = (new Date()).getTime();

        this.practiceGameTimestamps = Cookie.getJsonOrElse("PracticeGameTimestamps", []);

        // Make sure the user hasn't used up their practice games for the day.
        if (this.practiceGameTimestamps.length >= Const.PRACTICE_GAMES_PER_DAY) {
            let popped = false;

            // See whether any games have aged out. The list is a queue, with the
            // first item being the oldest.
            while (this.practiceGameTimestamps.length != 0) {
                const timeSinceLastGame = this.updateTime - this.practiceGameTimestamps[0];
                if (timeSinceLastGame > PracticeGameDisplay.MaxGamesIntervalMs) {
                    // This one has aged out; pop it and note that we popped one,
                    // i.e. that the user can play a game.
                    this.practiceGameTimestamps.shift();
                    popped = true;
                } else {
                    // This hasn't aged out, and anything on the list is newer,
                    // so we're done.
                    break;
                }
            }

            // If we didn't pop anything, all games are too new.
            if (! popped) {
                this.anyGamesRemaining = false;
                return;
            }
        }

        this.anyGamesRemaining = true;
    }

    updateWords(startWord=null, targetWord=null) {

        if (startWord && targetWord) {
            this.startWord = startWord;
            this.targetWord = targetWord;
            this.practiceGameWordsPlayed = [];
        } else {
            // Save the timestamp of this game in the instance and cookies.
            this.practiceGameTimestamps.push(this.updateTime);
            Cookie.save("PracticeGameTimestamps", JSON.stringify(this.practiceGameTimestamps));

            // See if we have words in the cookie.
            this.startWord  = Cookie.get("PracticeGameStart");
            this.targetWord = Cookie.get("PracticeGameTarget");

            if (!this.startWord || this.startWord.length === 0) {
                // No words in the cookie; get new ones from the Game class and save them.
                [this.startWord, this.targetWord] = Game.getPracticePuzzle();
                //this.startWord = "FATE";
                //this.targetWord = "CAT";
                Cookie.save("PracticeGameStart", this.startWord);
                Cookie.save("PracticeGameTarget", this.targetWord);
                Cookie.saveJson("PracticeGameWordsPlayed", []);
                this.practiceGameWordsPlayed = [];
            } else {
                // We did have start/target words; get any words already played.
                this.practiceGameWordsPlayed = Cookie.getJsonOrElse("PracticeGameWordsPlayed", []);
            }
        }

        // Now we're ready to construct (and display) the game.
        this.constructGame(this.startWord, this.targetWord, this.practiceGameWordsPlayed);
    }
}

export { PracticeGameDisplay };
