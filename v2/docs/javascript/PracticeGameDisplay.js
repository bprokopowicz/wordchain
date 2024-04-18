import { Cookie } from './Cookie.js';
import { ElementUtilities } from './ElementUtilities.js';
import { Game } from './Game.js';
import { GameDisplay } from './GameDisplay.js';
import * as Const from './Const.js';

class PracticeGameDisplay extends GameDisplay {

    /* ----- Class Variables ----- */

    static MaxGamesIntervalMs = 24 * 60 *60 * 1000; // one day in ms

    /* ----- Construction ----- */

    constructor(appDisplay, gameDiv, pickerDiv, dict) {
        super(appDisplay, gameDiv, pickerDiv, dict);

        // Debug-only cookie that can be manually added to the time period.
        this.debugPracticeGameIntervalMin = Cookie.getInt("DebugPracticeGameIntervalMin");

        // Are we debugging limiting practice games?
        if (this.debugPracticeGameIntervalMin) {
            PracticeGameDisplay.MaxGamesIntervalMs = debugPracticeGameIntervalMin * 60 * 1000;
        }

        // We use timestamps to ensure the user doesn't play more than the maximum
        // number of timestamps per day; this.anyGamesRemaining will be set according
        // to whether <max> games have been played in the last 24 hours.
        this.updateTimestamps();

        if (this.anyGamesRemaining) {
            this.updateWords();
        }
    }

    /* ----- Callbacks ----- */

    newGameCallback(event) {
        // When the button was created we saved 'this' as callbackAccessor in the button
        // element; use it to access other instance data.
        const me = event.srcElement.callbackAccessor;
        me.updateWords();
    }

    /* ----- Utilities ----- */

    // This will be called in GameDisplay when the game is determined to be over.
    additionalGameOverActions() {
        // Clear out the practice game words in the cookies.
        Cookie.save("PracticeStart", "");
        Cookie.save("PracticeTarget", "");

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

    updateWords() {
        // Save the timestamp of this game in the instance and cookies.
        this.practiceGameTimestamps.push(this.updateTime);
        Cookie.save("PracticeGameTimestamps", JSON.stringify(this.practiceGameTimestamps));

        // See if we have words in the cookie.
        this.startWord  = Cookie.get("PracticeStart");
        this.targetWord = Cookie.get("PracticeTarget");

        // If not, get new ones from the Game class and save them.
        if (!this.startWord || this.startWord.length === 0) {
            [this.startWord, this.targetWord] = Game.getPracticePuzzle();
            Cookie.save("PracticeStart", this.startWord);
            Cookie.save("PracticeTarget", this.targetWord);
        }

        // Now we're ready to construct (and display) the game.
        this.constructGame(this.startWord, this.targetWord);
    }
}

export { PracticeGameDisplay };
