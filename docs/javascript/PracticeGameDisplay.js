import { ElementUtilities } from './ElementUtilities.js';
import { Game } from './Game.js';
import { GameDisplay } from './GameDisplay.js';
import { Persistence } from './Persistence.js';
import * as Const from './Const.js';

class PracticeGameDisplay extends GameDisplay {

    /* ----- Construction ----- */

    constructor(appDisplay, gameDiv, pickerDiv) {
        super(appDisplay, gameDiv, pickerDiv, "practice-picker");

        this.practiceGamesPerDay = Const.PRACTICE_GAMES_PER_DAY; // can be overridden using testing vars

        // Are we debugging the number of practice games allowed?
        this.maxGamesIntervalMs = 24 * 60 *60 * 1000; // one day in ms
        if (Persistence.hasTestMinutesPerDay()) {
            this.maxGamesIntervalMs = Persistence.getTestMinutesPerDay() * 60 * 1000;
        }

        if (Persistence.hasTestPracticeGamesPerDay()) {
            this.practiceGamesPerDay = Persistence.getTestPracticeGamesPerDay();
        }

        // Add a button to the "post game div" to start a new game.
        // This will be disabled and enabled as the user plays games
        // and time marches on to allow more games in a rolling 24
        // hour period. Initially disable the button; it is enabled
        // when the game is over.
        this.newGameButton = ElementUtilities.addElementTo(
            "button", this.postGameDiv,
            {id: "new-game", class: "app-button non-header-button"},
            "New Game");
        ElementUtilities.setButtonCallback(this.newGameButton, this, this.newGameCallback);
        this.appDisplay.disableButton(this.newGameButton);

        // We use timestamps to ensure the user doesn't play more than the maximum
        // number of games per day.
        this.needToAddTimestamp = false;
        if (this.anyGamesRemaining()) {
            this.updateWords();
        }
    }

    setPracticeGamesPerDay(n) {
        this.practiceGamesPerDay = n;
    }

    // This is a pure virtual function in the base class. It is called after any play that adds a new
    // word to the solution (delete or letter picked).
    updateGameInProgressPersistence(gameResult) {
        if (Game.moveIsValid(gameResult)) {
            Persistence.savePracticeGameState(this.gameState);
        }
    }

    // This is a virtual function that tells the display if the user requested the solution for
    // the (practice) game in progress.
    getSolutionShown() {
        const ret = Persistence.getPracticeSolutionShown();
        Const.GL_DEBUG && this.logDebug("PracticeGameDisplay.getSolutionShown() returns: ", ret, "practice");
        return ret;
    }

    /* ----- Callbacks ----- */

    // newGameCallback() should only be exposed to the user if we already know that there are practice games remaining.
    newGameCallback(event) {
        this.updateWords();

        // We will add a timestamp in this case, because newGameCallback()
        // will only be called when a game is over; otherwise, the button
        // is disabled.
        this.startGame();
    }

    /* ----- Utilities ----- */

    // This will be called from GameDisplay when the game is determined to be over.
    additionalGameOverActions() {
        Const.GL_DEBUG && this.logDebug("PracticeGameDisplay.additionalGameOverActions() called", "practice");
        // Clear out the practice game words in the cookies.
        Persistence.clearPracticeGameDef();

        if (this.anyGamesRemaining()) {
            this.appDisplay.enableButton(this.newGameButton);
        } else {
            this.appDisplay.disableButton(this.newGameButton);

            // Notify AppDisplay that there are no more games so it can
            // disable its practice button.
            this.appDisplay.practiceGamesUsedUp();
        }
    }

    // Called from AppDisplay when "Solution" button is clicked.
    showSolution() {
        // TODO-PRODUCTION: Add an "are you sure?"
        this.game.finishGame();
        this.showGameAfterMove();

        Persistence.savePracticeGameState(this.gameState);
        Persistence.savePracticeSolutionShown();
    }

    // anyGamesRemaining() cleans up the saved list of recently played games' timestamps.
    // It removes ones that are more than 24 hours old, and returns true/false depening
    // on how many are  left compared to the allowed number per day.
    anyGamesRemaining() {
        let now = (new Date()).getTime();

        let practiceGameTimestamps = Persistence.getPracticeTimestamps();

        // Remove any any games that have aged out.

        practiceGameTimestamps = practiceGameTimestamps
            .filter(timestamp => (now-timestamp) < this.maxGamesIntervalMs);

        // Update the cookie now that we have removed any expired timestamps
        Persistence.savePracticeTimestamps(practiceGameTimestamps);

        // Return value indicates if there are any practice games left today.
        let thereAreGamesRemaining = (practiceGameTimestamps.length < this.practiceGamesPerDay);
        Const.GL_DEBUG && this.logDebug("anyGamesRemaining(): ", thereAreGamesRemaining, "practice");

        return thereAreGamesRemaining;
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

    // AppDisplay calls this when its periodic check determines more
    // games are available again.
    practiceGamesAvailable() {
        // Enable only if we're not in the middle of a game.
        if (this.gameIsOver()) {
            this.appDisplay.enableButton(this.newGameButton);
        }
    }

    // Called when the user switches to the Practice game or clicks New Game button.
    startGame() {
        if (this.needToAddTimestamp) {
            this.addNewPracticeGameTimestamp();
            this.needToAddTimestamp = false;
        }
    }

    // updateWords() creates a practice game. It should not be possible to call it if there are no more
    // practice games left.
    //
    // - If there are test vars to define the start and target, they will be used.
    // - If there is no practice game in progress in persistance, we get a new practice puzzle.
    // - Otherwise, the in-progress game will be created from persistence.
    //
    // Note that this is called in the constructor, but the user may not play it
    // right away and we shouldn't count that towards their games per day until
    // they actually start to play the game. Here, we're going to note that we
    // need to count it (i.e. need to add a timestamp).
    updateWords() {

        Const.GL_DEBUG && this.logDebug("PracticeGameDisplay.updateWords()", "test");
        Persistence.clearPracticeSolutionShown();
        let gameState = [];

        if (Persistence.hasTestPracticeGameWords()) {
            [this.startWord, this.targetWord] = Persistence.getTestPracticeGameWords();
            Const.GL_DEBUG && this.logDebug("PracticeGameDisplay.updateWords() setting game from test vars to ", this.startWord, this.targetWord, "test");
            this.needToAddTimestamp = true;
        } else {
            // See if we have words for a practice game in progress
            [this.startWord, this.targetWord] = Persistence.getPracticeGameDef();

            if (!this.startWord || this.startWord.length === 0) {
                // No words in the cookie; get new ones from the Game class and save them.
                [this.startWord, this.targetWord] = Game.getPracticePuzzle();
                this.needToAddTimestamp = true;

                Persistence.savePracticeGameDef(this.startWord, this.targetWord);
                Persistence.clearPracticeGameState();
            } else {
                // We did have start/target words; get any words already played.
                // Don't add a timestamp for this recovered game-in-progress.
                gameState = Persistence.getPracticeGameState();
            }
        }

        // Disable the New Games button because we're either in a new game
        // or a recovered game and the button is only enabled when a game is over.
        this.appDisplay.disableButton(this.newGameButton);

        // Now we're ready to construct (and display) the game.
        this.constructGame(this.startWord, this.targetWord, gameState);
    }

    // This is a pure virtual function in the base class.
    wasShown() {
        return Persistence.getPracticeSolutionShown();
    }
}

export { PracticeGameDisplay };
