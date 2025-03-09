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
            {class: "app-button non-header-button"},
            "New Game");
        ElementUtilities.setButtonCallback(this.newGameButton, this, this.newGameCallback);
        ElementUtilities.disableButton(this.newGameButton);

        // We use timestamps to ensure the user doesn't play more than the maximum
        // number of games per day. We're creating a practice game ahead of time, but
        // we're not going to add the timestamp until the user actually switches to
        // the practice game screen; createOrRestoreGame() will set this flag to false
        // if it recovers a game in progress.
        this.needToAddTimestamp = true;
        this.createOrRestoreGame();
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

    /* ----- Callbacks ----- */

    // newGameCallback() should only be exposed to the user if we already know that there are practice games remaining.
    newGameCallback(event) {
        // Clear out info from current game.
        ElementUtilities.deleteChildren(this.resultsDiv);
        ElementUtilities.deleteChildren(this.originalSolutionDiv);

        // Note that newGameCallback() will only be called when a game is over;
        // otherwise, the button is disabled.
        this.createGame();
        this.addNewPracticeGameTimestamp();
    }

    /* ----- Utilities ----- */

    // This will be called from GameDisplay when the game is determined to be over.
    additionalGameOverActions() {
        Const.GL_DEBUG && this.logDebug("PracticeGameDisplay.additionalGameOverActions() called", "practice");
        // Clear out the practice game words in the cookies.
        Persistence.clearPracticeGameDef();

        if (this.anyGamesRemaining()) {
            ElementUtilities.enableButton(this.newGameButton);
        } else {
            ElementUtilities.disableButton(this.newGameButton);

            // Notify AppDisplay that there are no more games so it can
            // disable its practice button.
            this.appDisplay.practiceGamesUsedUp();
        }
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
            ElementUtilities.enableButton(this.newGameButton);
        }
    }

    // Called when the user switches to the Practice game.
    recordGameTimestampIfNeeded() {
        if (this.needToAddTimestamp) {
            this.addNewPracticeGameTimestamp();
            this.needToAddTimestamp = false;
        }
    }

    // Called from newGameCallback() and createOrRestoreGame() during construction.
    createGame() {
        Const.GL_DEBUG && this.logDebug("PracticeGameDisplay.createGame()", "test");
        Persistence.clearPracticeGameState();

        if (Persistence.hasTestPracticeGameWords()) {
            [this.startWord, this.targetWord] = Persistence.getTestPracticeGameWords();
            Const.GL_DEBUG && this.logDebug("PracticeGameDisplay.createGame() setting game from test vars to ", this.startWord, this.targetWord, "test");
        } else {
            [this.startWord, this.targetWord] = Game.getPracticePuzzle();
            Persistence.savePracticeGameDef(this.startWord, this.targetWord);
        }

        this.startGameAndDisableNewGameButton();
    }

    // createOrRestoreGame() is called from constructor() to pre-create a practice game
    // or restore an in-progress game from cookies.
    //
    // - If there are test vars to define the start and target, they will be used.
    // - If there is no practice game in progress in persistance, we get a new practice puzzle.
    // - Otherwise, the in-progress game will be created from persistence.
    //
    // Note that this is called in the constructor, but the user may not play it
    // right away and we shouldn't count that towards their games per day until
    // they actually start to play the game. Here, we're going to note that we
    // need to count it (i.e. need to add a timestamp).
    createOrRestoreGame() {

        Const.GL_DEBUG && this.logDebug("PracticeGameDisplay.createOrRestoreGame()", "test");

        // See if we have words for a practice game in progress
        [this.startWord, this.targetWord] = Persistence.getPracticeGameDef();
        if (this.startWord && this.startWord.length !== 0) {
            // We did have start/target words; get any words already played.
            // Don't add a timestamp for this recovered game-in-progress
            // if/when the user switches to the practice game screen.
            this.needToAddTimestamp = false;
            this.startGameAndDisableNewGameButton();
        } else {
            this.createGame();
        }
    }

    startGameAndDisableNewGameButton() {
        let gameState = Persistence.getPracticeGameState();

        // Disable the New Games button until the game is over.
        ElementUtilities.disableButton(this.newGameButton);

        // Construct (and display) the game.
        this.constructGame(this.startWord, this.targetWord, gameState);
    }
}

export { PracticeGameDisplay };
