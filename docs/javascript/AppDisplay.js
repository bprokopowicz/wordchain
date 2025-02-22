import { BaseLogger } from './BaseLogger.js';
import { DailyGameDisplay } from './DailyGameDisplay.js';
import { ElementUtilities } from './ElementUtilities.js';
import { HelpDisplay } from './HelpDisplay.js';
import { Persistence } from './Persistence.js';
import { PracticeGameDisplay } from './PracticeGameDisplay.js';
import { SettingsDisplay } from './SettingsDisplay.js';
import { StatsDisplay } from './StatsDisplay.js';
import * as Const from './Const.js';


/*
** See the Cookie class for a description of the cookies that this class uses.
*/


class AppDisplay extends BaseLogger {

    /* ----- Class Variables ----- */

    static singletonObject = null;

    /* ----- Construction ----- */

    constructor() {
        super();
        // these two variables are accessed from Test.js so that we
        // can control the application from the testing code.
        window.theAppDisplayIsReady = false;
        window.theAppDisplay = this;

        // Flags from Settings screen

        // These flags are false by default.
        this.darkTheme        = Persistence.getDarkTheme();
        this.colorblindMode   = Persistence.getColorblindMode();

        // Confirmation mode is false by default.
        if (! Persistence.hasConfirmationMode()) {
            this.confirmationMode = false;
            Persistence.saveConfirmationMode(this.confirmationMode);
        } else {
            this.confirmationMode = Persistence.getConfirmationMode();
        }

        // The mother of all divs.
        this.rootDiv = null;

        // Holds all the auxiliary screens (Help, Settings, Stats) and MUST be the
        // first child of rootDiv so that when shown the screens will be at the
        // top of the viewport.
        this.auxiliaryDiv = null;

        // Divs that appear during game play; header/lower are children of root-div.
        this.headerDiv        = null;
        this.lowerDiv         = null; // Contains the following divs
        this.gameDiv          = null;
        this.pickerDiv        = null;

        // Objects that hold AuxiliaryDisplay derived class objects for the Help, Settings, Stats screens.
        this.helpDisplay     = null;
        this.settingsDisplay = null;
        this.statsDisplay    = null;

        // Div for toast pop-ups; child of root-div.
        this.toastDiv    = null;

        // Now, create all the screens. This will create all the divs listed above.
        this.createScreens();
        this.setSolutionStatus();

        // Now set the colors based on darkTheme and colorblindMode.
        this.setColors();

        // Now, start the interval timer to check for new games:
        this.startTimingCheckInterval();

        window.theAppDisplayIsReady = true;

        this.showedNoDaily = false;
        this.showNoDaily();

        this.updatePracticeGameStatus();
    }

    startTimingCheckInterval() {
        Const.GL_DEBUG && this.logDebug("startTimingCheckInterval() called", "display");
        // Stop any timer already running.
        this.stopTimingCheckInterval();

        // Set a timer to check periodically whether:
        // - it's time for a new Daily game
        // - it's time to enable Practice games
        this.checkDailyIntervalTimer = setInterval(() => {
                this.checkForNewDailyGame();
                this.updatePracticeGameStatus();
                }, Const.DAILY_GAME_CHANGE_CHECK_INTERVAL);
        Const.GL_DEBUG && this.logDebug("startTimingCheckInterval() created timer id: ", this.checkDailyIntervalTimer,  "display");
    }

    stopTimingCheckInterval() {
        Const.GL_DEBUG && this.logDebug("stopTimingCheckInterval() called", "display");
        if (this.checkDailyIntervalTimer) {
            Const.GL_DEBUG && this.logDebug("stopTimingCheckInterval() clearing old timer id: ", this.checkDailyIntervalTimer, "display");
            clearInterval(this.checkDailyIntervalTimer);
            this.checkDailyIntervalTimer = null;
        }
    }

    // Create the one and only object of this class if it hasn't yet been created.
    // Return the new or existing object.
    static singleton() {
        if (AppDisplay.singletonObject === null) {
            AppDisplay.singletonObject = new AppDisplay();
        }
        return AppDisplay.singletonObject;
    }

    // For automated testing only!
    resetSingletonObject() {
        // so that we don't keep adding #root-div to the same document on each reset:
        document.getElementById("root-div").remove();
        this.stopTimingCheckInterval();
        this.statsDisplay.stopCountdownClock();
        AppDisplay.singletonObject = new AppDisplay();
    }

    // This is the entry point for creating the screens and displaying the game.
    createScreens() {
        this.rootDiv = ElementUtilities.addElementTo("div", document.body, {id: "root-div"});

        // The upper-div contains the divs for the header and picker.
        this.upperDiv = ElementUtilities.addElementTo("div", this.rootDiv, {id: "upper-div"});
        this.createHeaderDiv();
        this.createPickerDiv(this.upperDiv);
        this.dailyPickerDiv = ElementUtilities.addElementTo("div", this.pickerDiv, {id: "daily-picker-div"});
        this.practicePickerDiv = ElementUtilities.addElementTo("div", this.pickerDiv, {id: "practice-picker-div"});

        // The lower-div contains the divs for game play. When switching between games,
        // these the game and picker divs be shown/hidden as appropriate.
        this.lowerDiv = ElementUtilities.addElementTo("div", this.rootDiv, {id: "lower-div"});
        this.createGameDiv(this.lowerDiv);
        this.dailyGameDiv = ElementUtilities.addElementTo("div", this.gameDiv, {id: "daily-game-div", class: "game-div"});
        this.practiceGameDiv = ElementUtilities.addElementTo("div", this.gameDiv, {id: "practice-game-div", class: "game-div"});

        // The auxiliary-div contains all the auxiliary screens.
        this.auxiliaryDiv = ElementUtilities.addElementTo("div", this.rootDiv, {id: "auxiliary-div", class: "auxiliary-div"});
        this.createAuxiliaryScreens();

        // The root-div also contains a copyright div. NOTE: this needs to be in
        // root-div because it needs to come after the auxiliary screens or else
        // the copyright will appear at the top on those screens.
        ElementUtilities.addBreak(this.rootDiv);
        this.copyrightDiv = ElementUtilities.addElementTo("div", this.rootDiv, {id: "copyright-div"}, Const.COPYRIGHT);

        // The toast-div displays all messages to the user.
        this.toastDiv = ElementUtilities.addElementTo("div", this.rootDiv, {id: "toast-div", class: "pop-up hide"});

        // To start, hide the practice divs.
        ElementUtilities.hide(this.practiceGameDiv);
        ElementUtilities.hide(this.practicePickerDiv);

        // Creation of DailyGameDisplay causes the start/target words to be determined
        // based on today's date and displays the game's grid for the user to play.
        this.dailyGameDisplay = new DailyGameDisplay(this, this.dailyGameDiv, this.dailyPickerDiv);
        this.practiceGameDisplay = new PracticeGameDisplay(this, this.practiceGameDiv, this.practicePickerDiv);
        this.currentGameDisplay = this.dailyGameDisplay;
    }

    /* ----- Header ----- */

    createAuxiliaryScreens() {
        // This is the set of divs that need to be hidden when an auxiliary screen is
        // shown, and shown when an auxiliary screen is closed.
        this.primaryDivs = [
            this.headerDiv,
            this.gameDiv,
            this.pickerDiv,
        ];

        // Now create objects for each of the auxiliary screens.
        // We don't need to save these in the object, but we will anyway!
        this.helpDisplay     = new HelpDisplay(this.auxiliaryButtonDiv, Const.HELP_PATH, this.auxiliaryDiv, this.primaryDivs);
        this.statsDisplay    = new StatsDisplay(this.auxiliaryButtonDiv, Const.STATS_PATH, this.auxiliaryDiv, this.primaryDivs, this);
        this.settingsDisplay = new SettingsDisplay(this.auxiliaryButtonDiv, Const.SETTINGS_PATH, this.auxiliaryDiv, this.primaryDivs, this);
    }

    createGameButtons() {
        // Button to switch between Daily and Practice games.
        this.switchGamesButton = ElementUtilities.addElementTo(
            "button", this.gameButtonDiv,
            {id: "switch-games", class: "app-button header-button"},
            "Practice");
        ElementUtilities.setButtonCallback(this.switchGamesButton, this, this.switchGamesCallback);

        // Disable the practice button initially, if there are more games available
        // it will get enabled almost immediately: we start an interval timer in
        // constructor() and it will enable the button if there are games available.
        this.disablePracticeButton();

        // Button to show the solution.
        this.solutionButton = ElementUtilities.addElementTo(
            "button", this.gameButtonDiv,
            {id: "show-solution", class: "app-button header-button"},
            "Solution");

        // Pass 'this' to the callback for the solutionButton element so that we can access ourself.
        ElementUtilities.setButtonCallback(this.solutionButton, this, this.solutionCallback);
    }

    createHeaderDiv() {
        // This div is one we style as none or flex to hide/show the div.
        // NOTE: It is important to set the style explicitly so that the
        // hide/show code in AuxiliaryDisplay will work properly.
        this.headerDiv = ElementUtilities.addElementTo("div", this.upperDiv, {id: "header-div"});
        this.headerDiv.style.display = "flex";

        // game-button-div holds buttons related to game play.
        this.gameButtonDiv = ElementUtilities.addElementTo("div", this.headerDiv, {id: "game-button-div"});
        this.createGameButtons();

        const titleDiv = ElementUtilities.addElementTo("div", this.headerDiv, {id: "title-div"});
        ElementUtilities.addElementTo("label", titleDiv, {class: "title"}, "WordChain");

        // auxiliary-button-div holds the buttons for getting to the auxiliary screens.
        this.auxiliaryButtonDiv = ElementUtilities.addElementTo("div", this.headerDiv, {id: "auxiliary-button-div"});
    }

    /* ----- Game ----- */

    createGameDiv(lowerDiv) {
        // We always want the game to appear on a "line" by itself, not
        // next to the picker grid, so add a break.
        ElementUtilities.addBreak(lowerDiv);

        // This div is one we style as none or flex to hide/show the div.
        // NOTE: It is important to set the style explicitly so that the
        // hide/show code in AuxiliaryDisplay will work properly.
        this.gameDiv = ElementUtilities.addElementTo("div", lowerDiv, {id: "mama-game-div", class: "game-div"}, null);
        this.gameDiv.style.display = "flex";
    }

    createPickerDiv(parentDiv) {
        // This div is the one we style as none or flex to hide/show the div.
        ElementUtilities.addBreak(parentDiv);
        this.pickerDiv = ElementUtilities.addElementTo("div", parentDiv, {id: "picker-div"}, null);

        // This div is one we style as none or flex to hide/show the div.
        // NOTE: It is important to set the style explicitly so that the
        // hide/show code in AuxiliaryDisplay will work properly.
        this.pickerDiv.style.display = "flex";

    }

    /* ----- Callbacks ----- */

    // Callback for the Solution button.
    solutionCallback(event) {
        if (this.solutionButton.enabled) {
            this.currentGameDisplay.showSolution();
        }
    }

    // Callback for the Switch Games button.
    switchGamesCallback(event) {
        const buttonText = event.srcElement.innerText;
        if (buttonText === "Practice") {
            this.switchToPracticeGame();
        } else {
            this.switchToDailyGame();
        }
    }

    /* ----- Utilities ----- */

    // Check whether it is time for a new Daily game. This will recalculate
    // game number and if it has changed will reset internal state accordingly.
    checkForNewDailyGame() {
        Const.GL_DEBUG && this.logDebug("checkForNewDailyGame() called; timer id: ", this.checkDailyIntervalTimer, "display");
        let isNewDailyGame = this.dailyGameDisplay.updateDailyGameData();
        if (isNewDailyGame) {
            this.showToast(Const.NEW_DAILY_GAME);
            this.showNoDaily();
        }
    }

    isDailyGameOver() {
        return this.dailyGameDisplay.gameIsOver();
    }

    isDailyGameBroken() {
        return this.dailyGameDisplay.gameIsBroken();
    }

    disableButton(button) {
        ElementUtilities.addClass(button, "button-disabled");
    }

    enableButton(button) {
        ElementUtilities.removeClass(button, "button-disabled");
    }

    disablePracticeButton() {
        const buttonText = this.switchGamesButton.innerHTML;
        if (buttonText == "Practice") {
            this.disableButton(this.switchGamesButton);
        }
        this.switchGamesButton.practiceEnabled = false;
    }

    enablePracticeButton() {
        const buttonText = this.switchGamesButton.innerHTML;
        if (buttonText == "Practice") {
            this.enableButton(this.switchGamesButton);
        }
        this.switchGamesButton.practiceEnabled = true;
    }

    disableSolutionButton() {
        this.disableButton(this.solutionButton);
        this.solutionButton.enabled = false;
    }

    enableSolutionButton() {
        this.enableButton(this.solutionButton);
        this.solutionButton.enabled = true;
    }

    // Return the given CSS property value.
    static getCssProperty(property) {
        return getComputedStyle(document.documentElement).getPropertyValue(`--${property}`);
    }

    // Return an object with information about the daily game status.
    getDailyGameInfo() {
        return this.dailyGameDisplay.getGameInfo();
    }

    getMsUntilNextGame() {
        Const.GL_DEBUG && this.logDebug("AppDisplay.getMsUntilNextGame() called", "display");
        return this.dailyGameDisplay.getMsUntilNextGame();
    }

    isColorblindMode() {
        return this.colorblindMode;
    }

    isConfirmationMode() {
        return this.confirmationMode;
    }

    isDarkTheme() {
        return this.darkTheme;
    }

    // PracticeGameDisplay calls this when the user finishes a game
    // and there are no more remaining in this 24-hour period.
    practiceGamesUsedUp() {
        this.disablePracticeButton();
    }

    // Set color properties according to the Dark Theme and Colorblind Mode settings.
    setColors() {
        // Change the document class name to switch the colors in general.
        if (this.darkTheme) {
            document.documentElement.className = "dark-mode";
        } else {
            document.documentElement.className = "light-mode";
        }

        // The "properties affected by Colorblind Mode" are:
        //
        // played-word-good-bg
        // played-word-bad-bg
        // played-word-genius-bg
        //
        // These need to be set according to whether the user has selected colorblind mode
        // as well as whether the user has selected light or dark mode.
        if (this.colorblindMode) {
            // Colorblind Mode is checked: set good/bad colorblind variables based on whether
            // Dark Mode is set, and set the properties affected by Colorblind Mode
            // based on those variables.
            if (this.darkTheme) {
                this.setCssProperty("played-word-good-bg",   AppDisplay.getCssProperty("colorblind-good-bg-dark"));
                this.setCssProperty("played-word-bad-bg",    AppDisplay.getCssProperty("colorblind-bad-bg-dark"));
                this.setCssProperty("played-word-genius-bg", AppDisplay.getCssProperty("colorblind-genius-bg-dark"));
                this.setCssProperty("played-word-dodo-bg",   AppDisplay.getCssProperty("colorblind-dodo-bg-dark"));
            } else {
                this.setCssProperty("played-word-good-bg",   AppDisplay.getCssProperty("colorblind-good-bg-light"));
                this.setCssProperty("played-word-bad-bg",    AppDisplay.getCssProperty("colorblind-bad-bg-light"));
                this.setCssProperty("played-word-genius-bg", AppDisplay.getCssProperty("colorblind-genius-bg-light"));
                this.setCssProperty("played-word-dodo-bg",   AppDisplay.getCssProperty("colorblind-dodo-bg-light"));
            }
        } else {
            // Colorblind Mode is not checked: restore the affected properties based on whether
            // Dark Mode is set.
            if (this.darkTheme) {
                this.setCssProperty("played-word-good-bg",   AppDisplay.getCssProperty("non-colorblind-good-bg-dark"));
                this.setCssProperty("played-word-bad-bg",    AppDisplay.getCssProperty("non-colorblind-bad-bg-dark"));
                this.setCssProperty("played-word-genius-bg", AppDisplay.getCssProperty("non-colorblind-genius-bg-dark"));
                this.setCssProperty("played-word-dodo-bg",   AppDisplay.getCssProperty("non-colorblind-dodo-bg-dark"));
            } else {
                this.setCssProperty("played-word-good-bg",   AppDisplay.getCssProperty("non-colorblind-good-bg-light"));
                this.setCssProperty("played-word-bad-bg",    AppDisplay.getCssProperty("non-colorblind-bad-bg-light"));
                this.setCssProperty("played-word-genius-bg", AppDisplay.getCssProperty("non-colorblind-genius-bg-light"));
                this.setCssProperty("played-word-dodo-bg",   AppDisplay.getCssProperty("non-colorblind-dodo-bg-light"));
            }
        }

        // Re-show the moves to make the color changes take effect.
        // Pass true to indicate that toast display should be skipped.
        const skipToast=true;
        this.currentGameDisplay && this.currentGameDisplay.showGameAfterMove(skipToast);
    }

    // Set the given CSS property to the specified value.
    setCssProperty(property, value) {
        document.documentElement.style.setProperty(`--${property}`, value);
    }

    setSolutionStatus() {
        // Enable or disable the solution button.
        if (this.currentGameDisplay && this.currentGameDisplay.canShowSolution())
        {
            this.enableSolutionButton();
        } else {
            this.disableSolutionButton();
        }
    }

    // Show a "no daily game" toast if we haven't already.
    showNoDaily() {
        if (!this.showedNoDaily && Persistence.getDailyGameNumber() === Const.BROKEN_DAILY_GAME_NUMBER) {
            this.showedNoDaily = true;
            this.showToast(Const.NO_DAILY);
        }
    }

    // Show a "toast" pop-up (typically an error message).
    showToast(message, duration=Const.SHOW_TOAST_DURATION) {
        this.toastDiv.innerHTML = message
        ElementUtilities.editClass(/hide/, "show", this.toastDiv);
        setTimeout(() => {
            ElementUtilities.editClass(/show/, "hide", this.toastDiv);
        }, duration);
    }

    switchToDailyGame() {
        // Hide practice and show daily.
        ElementUtilities.hide(this.practiceGameDiv);
        ElementUtilities.hide(this.practicePickerDiv);
        ElementUtilities.show(this.dailyGameDiv);
        ElementUtilities.show(this.dailyPickerDiv);

        // Toggle the button text to Practice.
        this.switchGamesButton.innerHTML = "Practice";
        if (! this.switchGamesButton.practiceEnabled) {
            this.disablePracticeButton();
        }

        this.currentGameDisplay = this.dailyGameDisplay;
        this.setSolutionStatus();
    }

    // We used to create the practice game here, but moved it to the constructor,
    // so that there is no pause when switching to the practice game for the first time.
    // If the user has already played the maximum number of games, we disallow any more.
    switchToPracticeGame() {
        if (! this.switchGamesButton.practiceEnabled) {
            return
        }

        // Hide daily and show practice.
        ElementUtilities.hide(this.dailyGameDiv);
        ElementUtilities.hide(this.dailyPickerDiv);
        ElementUtilities.show(this.practiceGameDiv);
        ElementUtilities.show(this.practicePickerDiv);

        // Toggle the button text to Daily.
        this.switchGamesButton.innerHTML = "Daily";

        this.currentGameDisplay = this.practiceGameDisplay;
        this.setSolutionStatus();

        // This will begin the game, counting it toward the user's games per day.
        this.practiceGameDisplay.startGame();
    }

    updatePracticeGameStatus() {
        if (this.practiceGameDisplay.anyGamesRemaining()) {
            this.enablePracticeButton();

            // Notify the display that games are available so that the New Game
            // button can be enabled.
            this.practiceGameDisplay.practiceGamesAvailable();
        }
    }
}

export { AppDisplay };

// Create the singleton, and it all happens from there.
// IMPORTANT: Do NOT import this file from Test.js!
AppDisplay.singleton();
