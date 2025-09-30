import { BaseLogger } from './BaseLogger.js';
import { DailyGameDisplay, PracticeGameDisplay } from './GameDisplay.js';
import { ElementUtilities } from './ElementUtilities.js';
import { HelpDisplay } from './HelpDisplay.js';
import { Persistence } from './Persistence.js';
import { SettingsDisplay } from './SettingsDisplay.js';
import { StatsDisplay } from './StatsDisplay.js';
import { COV } from './Coverage.js';
import * as Const from './Const.js';


/*
** See the Cookie class for a description of the cookies that this class uses.
*/


class AppDisplay extends BaseLogger {

    /* ----- Class Variables ----- */

    static singletonObject = null;

    /* ----- Construction ----- */

    constructor() {
        const CL = "AppDisplay.constructor";
        COV(0, CL);
        super();
        // these two variables are accessed from Test.js so that we
        // can control the application from the testing code.
        window.theAppDisplayIsReady = false;
        window.theAppDisplay = this;

        // Flags from Settings screen

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

        // This will be set after the game displays are constructed.
        this.currentGameDisplay = null;

        // Now, create all the screens. This will create all the divs listed above.
        this.createScreens();

        // Now set the colors based on darkTheme and colorblindMode.
        this.setColors();

        // Now, start the interval timer to check for new games:
        this.startTimingCheckInterval();

        window.theAppDisplayIsReady = true;

        // for testing, we keep track of the last toast displayed, if any
        this.lastToast = null;

        this.showedNoDaily = false;
        this.showNoDaily();

        this.updatePracticeGameStatus();
        Persistence.clearDeprecatedCookies();
    }

    startTimingCheckInterval() {
        const CL = "AppDisplay.startTimingCheckInterval";
        COV(0, CL);
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
        Const.GL_DEBUG && this.logDebug("startTimingCheckInterval() created timer id: ", this.checkDailyIntervalTimer, "display");
    }

    stopTimingCheckInterval() {
        const CL = "AppDisplay.stopTimingCheckInterval";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("stopTimingCheckInterval() called", "display");
        if (this.checkDailyIntervalTimer) {
            COV(1, CL);
            Const.GL_DEBUG && this.logDebug("stopTimingCheckInterval() clearing old timer id: ", this.checkDailyIntervalTimer, "display");
            clearInterval(this.checkDailyIntervalTimer);
            this.checkDailyIntervalTimer = null;
        }
        COV(2, CL);
    }

    // Create the one and only object of this class if it hasn't yet been created.
    // Return the new or existing object.
    static singleton() {
        const CL = "AppDisplay.singleton";
        COV(0, CL);
        if (AppDisplay.singletonObject === null) {
            COV(1, CL);
            AppDisplay.singletonObject = new AppDisplay();
        }
        return AppDisplay.singletonObject;
    }

    // For automated testing only!
    resetSingletonObject() {
        const CL = "AppDisplay.resetSingletonObject";
        // so that we don't keep adding #root-div to the same document on each reset:
        COV(0, CL);
        document.getElementById("root-div").remove();
        this.stopTimingCheckInterval();
        this.statsDisplay.stopCountdownClock();
        AppDisplay.singletonObject = new AppDisplay();
    }

    // This is the entry point for creating the screens and displaying the game.
    createScreens() {
        const CL = "AppDisplay.createScreens";
        COV(0, CL);
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
        // It MUST be initialized before the practiceGameDisplay, because there is a dependence
        // on whether or not the daily game is a new game or a continuation of today's game.  If it is a new
        // game, that means that the practice game counter should be reset

        this.dailyGameDisplay = new DailyGameDisplay(this, this.dailyGameDiv, this.dailyPickerDiv);
        this.practiceGameDisplay = new PracticeGameDisplay(this, this.practiceGameDiv, this.practicePickerDiv);
        /* TODO  - not managing the practice counter here...  */
        if (this.dailyGameDisplay.isNewDailyGame()) {
            COV(1, CL);
            Const.GL_DEBUG && this.logDebug("AppDisplay.createScreens() calling resetPracticeGameCounter()", "display");
            this.resetPracticeGameCounter();
        }

        COV(2, CL);
        this.setCurrentGameDisplay(this.dailyGameDisplay);
    }

    /* ----- Header ----- */

    createAuxiliaryScreens() {
        const CL = "AppDisplay.createAuxiliaryScreens";
        COV(0, CL);
        // This is the set of divs that need to be hidden when an auxiliary screen is
        // shown, and shown when an auxiliary screen is closed.
        this.primaryDivs = [
            this.headerDiv,
            this.gameDiv,
            this.pickerDiv,
        ];

        // Now create objects for each of the auxiliary screens.
        // We don't need to save these in the object, but we will anyway!
        this.helpDisplay = new HelpDisplay(
            this.auxiliaryButtonDiv, {text: "HOW TO PLAY"}, this.auxiliaryDiv, this.primaryDivs);

        this.statsDisplay = new StatsDisplay(
            this.auxiliaryButtonDiv, {svg: Const.STATS_PATH}, this.auxiliaryDiv, this.primaryDivs, this);

        this.settingsDisplay = new SettingsDisplay(
            this.auxiliaryButtonDiv, {svg: Const.SETTINGS_PATH}, this.auxiliaryDiv, this.primaryDivs, this);
    }

    createGameButtons() {
        // Buttons to switch between Daily and Practice games.
        // Only one is showing at any given time.
        const CL = "AppDisplay.createGameButtons";
        COV(0, CL);
        this.switchToDailyGameButton = ElementUtilities.addElementTo(
            "button", this.gameButtonDiv,
            {id: "switch-to-daily-game", class: "app-button header-button"},
            "Switch to Daily");
        ElementUtilities.setButtonCallback(this.switchToDailyGameButton, this, this.switchToDailyGameCallback);

        this.switchToPracticeGameButton = ElementUtilities.addElementTo(
            "button", this.gameButtonDiv,
            {id: "switch-to-practice-game", class: "app-button header-button"},
            "Switch to Practice");
        ElementUtilities.setButtonCallback(this.switchToPracticeGameButton, this, this.switchToPracticeGameCallback);

        // We start on the daily game screen, so the Practice button should be visible.
        ElementUtilities.hide(this.switchToDailyGameButton);
        ElementUtilities.show(this.switchToPracticeGameButton);
    }

    createHeaderDiv() {
        // This div is one we style as none or flex to hide/show the div.
        // NOTE: It is important to set the style explicitly so that the
        // hide/show code in AuxiliaryDisplay will work properly.
        const CL = "AppDisplay.createHeaderDiv";
        COV(0, CL);
        this.headerDiv = ElementUtilities.addElementTo("div", this.upperDiv, {id: "header-div"});
        this.headerDiv.style.display = "flex";

        // Top row of header has the title and all the buttons.
        this.headerDivTop = ElementUtilities.addElementTo("div", this.headerDiv, {id: "header-div-top"});

        // game-button-div holds buttons related to game play.
        this.gameButtonDiv = ElementUtilities.addElementTo("div", this.headerDivTop, {id: "game-button-div"});
        this.createGameButtons();

        const titleDiv = ElementUtilities.addElementTo("div", this.headerDivTop, {id: "title-div"});
        ElementUtilities.addElementTo("label", titleDiv, {class: "title"}, "WordChain");

        // auxiliary-button-div holds the buttons for getting to the auxiliary screens.
        this.auxiliaryButtonDiv = ElementUtilities.addElementTo("div", this.headerDivTop, {id: "auxiliary-button-div"});

        ElementUtilities.addElementTo("div", this.headerDiv, {class: "break", id: "header-break"});

        // Bottom row of header just has the tagline.
        this.headerDivBottom = ElementUtilities.addElementTo("div", this.headerDiv, {id: "header-div-bottom"});
        this.tagline = ElementUtilities.addElementTo("label", this.headerDivBottom, {class: "tagline"}, Const.GAME_TAGLINE);
    }

    /* ----- Game ----- */

    createGameDiv(lowerDiv) {
        // We always want the game to appear on a "line" by itself, not
        // next to the picker grid, so add a break.
        const CL = "AppDisplay.createGameDiv";
        COV(0, CL);
        ElementUtilities.addBreak(lowerDiv);

        // This div is one we style as none or flex to hide/show the div.
        // NOTE: It is important to set the style explicitly so that the
        // hide/show code in AuxiliaryDisplay will work properly.
        this.gameDiv = ElementUtilities.addElementTo("div", lowerDiv, {id: "mama-game-div", class: "game-div"}, null);
        this.gameDiv.style.display = "flex";
    }

    createPickerDiv(parentDiv) {
        const CL = "AppDisplay.createPickerDiv";
        COV(0, CL);
        // This div is the one we style as none or flex to hide/show the div.
        ElementUtilities.addBreak(parentDiv);
        this.pickerDiv = ElementUtilities.addElementTo("div", parentDiv, {id: "picker-div"}, null);

        // This div is one we style as none or flex to hide/show the div.
        // NOTE: It is important to set the style explicitly so that the
        // hide/show code in AuxiliaryDisplay will work properly.
        this.pickerDiv.style.display = "flex";
    }

    /* ----- Callbacks ----- */

    switchToDailyGameCallback(__event) {
        // Hide practice and show daily.
        const CL = "AppDisplay.switchToDailyGameCallback";
        COV(0, CL);
        ElementUtilities.hide(this.practiceGameDiv);
        ElementUtilities.hide(this.practicePickerDiv);
        ElementUtilities.show(this.dailyGameDiv);
        ElementUtilities.show(this.dailyPickerDiv);

        // On the daily game screen, the Practice button is visible.
        // updatePracticeGameStatus() will enable the button if there
        // are practice games available.
        this.updatePracticeGameStatus();
        ElementUtilities.show(this.switchToPracticeGameButton);
        ElementUtilities.hide(this.switchToDailyGameButton);

        this.setCurrentGameDisplay(this.dailyGameDisplay);
    }

    // We used to create the practice game here, but moved it to the constructor,
    // so that there is no pause when switching to the practice game for the first time.
    // If the user has already played the maximum number of games, we disallow any more.
    switchToPracticeGameCallback(__event) {
        const CL = "AppDisplay.switchToPracticeGameCallback";
        COV(0, CL);

        // Hide daily and show practice.
        ElementUtilities.hide(this.dailyGameDiv);
        ElementUtilities.hide(this.dailyPickerDiv);
        ElementUtilities.show(this.practiceGameDiv);
        ElementUtilities.show(this.practicePickerDiv);

        // On the practice game screen, the Daily button is visible.
        ElementUtilities.show(this.switchToDailyGameButton);
        ElementUtilities.hide(this.switchToPracticeGameButton);

        this.setCurrentGameDisplay(this.practiceGameDisplay);
    }

    /* ----- Utilities ----- */

    // Check whether it is time for a new Daily game. This will recalculate
    // game number and if it has changed will reset internal state accordingly.
    checkForNewDailyGame() {
        const CL = "AppDisplay.checkForNewDailyGame";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("checkForNewDailyGame() called; timer id: ", this.checkDailyIntervalTimer, "display");
        const isNewGame = this.dailyGameDisplay.updateDailyGameData();
        if (isNewGame) {
            COV(1, CL);
            this.showToast(Const.NEW_DAILY_GAME);
            this.showNoDaily();
            this.statsDisplay.refresh();
            this.statsDisplay.updateShareButton();
            this.resetPracticeGameCounter();
            return true; // for testing only
        }
        return false;    // for testing only
        COV(2, CL);
    }

    getShare() {
        const CL = "AppDisplay.getShare";
        COV(0, CL);

        const dailyGameState = this.getDailyGameState(),
              shareString = dailyGameState.getShareString();

        if (shareString) {
            COV(1, CL);
            // We are currently copying to clipboard rather than the commented
            // out "direct share first" code below because Facebook annoyingly
            // won't properly share text along with a URL. When a URL is included
            // in the text OR when it is included with a separate 'url' property
            // in the object passed to navigator.share(), Facebook ONLY shows
            // a clickable URL (sans our icon!) -- no share graphic!
            // This approach requires users to paste their share to the app of
            // their choice -- and both the graphic and a clickable URL will appear.
            let copiedToClipboard = false;
            if (typeof navigator.clipboard === "object") {
                COV(2, CL);
                navigator.clipboard.writeText(`${shareString}`);
                copiedToClipboard = true;
                this.showToast(Const.SHARE_TO_PASTE);
            } else {
                // TODO This is never reached from the testscurrently.  IF we add it,
                // we need to update the COV points from here out in this function.
                // COV(3, CL);
                this.showToast(Const.SHARE_INSECURE);
            }

            /*
            *************************************************************************************************
            * NOTE: If we uncomment this code to do a direct share, we will need to use
            * Const.SHARE_URL_FOR_FB in the share string. We may want to write the share
            * graphic with the real URL to the clipboard clipboard after this if-else if-else.
            *
            * Const.GL_DEBUG && this.logDebug("shareCallback() navigator: ", navigator, "daily");
            * // Are we in a *secure* environment that has a "share" button, like a smart phone?
            * let shareData = { text: shareString, };
            * if ((typeof navigator.canShare === "function") && navigator.canShare(shareData)) {
            *   // Yes -- use the button to share the shareString.
            *   navigator.share(shareData)
            *   .catch((error) => {
            *       if (error.toString().indexOf("cancellation") < 0) {
            *           console.error("Failed to share: ", error);
            *           this.showToast(Const.SHARE_FAILED);
            *       }
            *   });
            * // Are we in a *secure* environment that has access to clipboard (probably on a laptop/desktop)?
            * } else if (typeof navigator.clipboard === "object") {
            *    navigator.clipboard.writeText(shareString);
            *    this.showToast(Const.SHARE_COPIED);
            * // Insecure.
            * } else {
            *   this.showToast(Const.SHARE_INSECURE);
            * }
            *************************************************************************************************
            */
        }

        COV(3, CL);
        return shareString; // used in testing only
    }

    resetPracticeGameCounter() {
        //TODO - don't manage this here
        const CL = "AppDisplay.resetPracticeGameCounter";
        COV(0, CL);
        this.practiceGameDisplay.resetPracticeGameCounter();
    }

    isDailyGameOver() {
        const CL = "AppDisplay.isDailyGameOver";
        COV(0, CL);
        return this.dailyGameDisplay.gameIsOver();
    }

    isDailyGameBroken() {
        const CL = "AppDisplay.isDailyGameBroken";
        COV(0, CL);
        return this.dailyGameDisplay.dailyGameIsBroken();
    }

    // Return the given CSS property value.
    static getCssProperty(property) {
        const CL = "AppDisplay.getCssProperty";
        COV(0, CL);
        return getComputedStyle(document.documentElement).getPropertyValue(`--${property}`);
    }

    getDailyGameState() {
        const CL = "AppDisplay.getDailyGameState";
        COV(0, CL);
        return this.dailyGameDisplay.getGameState();
    }

    getMsUntilNextGame() {
        const CL = "AppDisplay.getMsUntilNextGame";
        COV(0, CL);
        return this.dailyGameDisplay.getMsUntilNextGame();
    }

    refreshStats() {
        const CL = "AppDisplay.refreshStats";
        COV(0, CL);
        this.statsDisplay.refresh();
    }

    // Set color properties according to the Dark Theme and Colorblind Mode settings.
    setColors() {
        const CL = "AppDisplay.setColors";
        COV(0, CL);
        // Change the document class name to switch the colors in general.
        if (Persistence.getDarkTheme()) {
            COV(1, CL);
            document.documentElement.className = "dark-mode";
        } else {
            COV(2, CL);
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
        if (Persistence.getColorblindMode()) {
            COV(3, CL);
            // Colorblind Mode is checked: set good/bad colorblind variables based on whether
            // Dark Mode is set, and set the properties affected by Colorblind Mode
            // based on those variables.
            if (Persistence.getDarkTheme()) {
                COV(4, CL);
                this.setCssProperty("played-word-good-bg",   AppDisplay.getCssProperty("colorblind-good-bg-dark"));
                this.setCssProperty("played-word-bad-bg",    AppDisplay.getCssProperty("colorblind-bad-bg-dark"));
                this.setCssProperty("played-word-genius-bg", AppDisplay.getCssProperty("colorblind-genius-bg-dark"));
                this.setCssProperty("played-word-dodo-bg",   AppDisplay.getCssProperty("colorblind-dodo-bg-dark"));
                this.setCssProperty("played-word-shown-bg",  AppDisplay.getCssProperty("colorblind-shown-bg-dark"));
            } else {
                COV(5, CL);
                this.setCssProperty("played-word-good-bg",   AppDisplay.getCssProperty("colorblind-good-bg-light"));
                this.setCssProperty("played-word-bad-bg",    AppDisplay.getCssProperty("colorblind-bad-bg-light"));
                this.setCssProperty("played-word-genius-bg", AppDisplay.getCssProperty("colorblind-genius-bg-light"));
                this.setCssProperty("played-word-dodo-bg",   AppDisplay.getCssProperty("colorblind-dodo-bg-light"));
                this.setCssProperty("played-word-shown-bg",  AppDisplay.getCssProperty("colorblind-shown-bg-light"));
            }
        } else {
            // Colorblind Mode is not checked: restore the affected properties based on whether
            // Dark Mode is set.
            COV(6, CL);
            if (Persistence.getDarkTheme()) {
                COV(7, CL);
                this.setCssProperty("played-word-good-bg",   AppDisplay.getCssProperty("non-colorblind-good-bg-dark"));
                this.setCssProperty("played-word-bad-bg",    AppDisplay.getCssProperty("non-colorblind-bad-bg-dark"));
                this.setCssProperty("played-word-genius-bg", AppDisplay.getCssProperty("non-colorblind-genius-bg-dark"));
                this.setCssProperty("played-word-dodo-bg",   AppDisplay.getCssProperty("non-colorblind-dodo-bg-dark"));
                this.setCssProperty("played-word-shown-bg",  AppDisplay.getCssProperty("colorblind-shown-bg-dark"));
            } else {
                COV(8, CL);
                this.setCssProperty("played-word-good-bg",   AppDisplay.getCssProperty("non-colorblind-good-bg-light"));
                this.setCssProperty("played-word-bad-bg",    AppDisplay.getCssProperty("non-colorblind-bad-bg-light"));
                this.setCssProperty("played-word-genius-bg", AppDisplay.getCssProperty("non-colorblind-genius-bg-light"));
                this.setCssProperty("played-word-dodo-bg",   AppDisplay.getCssProperty("non-colorblind-dodo-bg-light"));
                this.setCssProperty("played-word-shown-bg",  AppDisplay.getCssProperty("colorblind-shown-bg-light"));
            }
        }

        // Re-show the moves to make the color changes take effect.
        // Pass true to indicate that toast display should be skipped.
        COV(9, CL);
        const skipToast = true;
    }

    // Set the given CSS property to the specified value.
    setCssProperty(property, value) {
        const CL = "AppDisplay.setCssProperty";
        COV(0, CL);
        document.documentElement.style.setProperty(`--${property}`, value);
    }

    // Set the current game display and update the header tagline.
    setCurrentGameDisplay(gameDisplay) {
        this.currentGameDisplay = gameDisplay;

        // Now update the header tagline to include the target word.
        const targetWord = gameDisplay.getTargetWord();
        ElementUtilities.setElementText(this.tagline, `${Const.GAME_TAGLINE} '${targetWord}'`)
    }

    // Show a "no daily game" toast if we haven't already.
    showNoDaily() {
        const CL = "AppDisplay.showNoDaily";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("AppDisplay.showNoDaily() this.showedNoDaily:", this.showedNoDaily, "dailyGameNumber():",
                this.dailyGameDisplay.dailyGameNumber(), "display");
        if (!this.showedNoDaily && this.dailyGameDisplay.dailyGameNumber() === Const.BROKEN_DAILY_GAME_NUMBER) {
            COV(1, CL);
            this.showedNoDaily = true;
            this.showToast(Const.NO_DAILY);
        }
        COV(2, CL);
    }

    // Show a "toast" pop-up (typically an error message).
    showToast(message, duration=Const.SHOW_TOAST_DURATION) {
        const CL = "AppDisplay.showToast";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("AppDisplay.showToast(): ", message, "display");
        this.lastToast = message;
        this.toastDiv.innerHTML = message
        ElementUtilities.editClass(/hide/, "show", this.toastDiv);
        setTimeout(() => {
            ElementUtilities.editClass(/show/, "hide", this.toastDiv);
        }, duration);
    }

    getAndClearLastToast() {
        const result = this.lastToast;
        this.clearLastToast();
        return result;
    }

    clearLastToast() {
        this.lastToast = null;
    }

    // This is called on construction, when the periodic timer fires, and
    // when switching to the Daily Game screen.
    updatePracticeGameStatus() {
        const CL = "AppDisplay.updatePracticeGameStatus";
        COV(0, CL);
        if (this.practiceGameDisplay.anyGamesRemaining()) {
            COV(1, CL);
            ElementUtilities.enableButton(this.switchToPracticeGameButton);

            // Notify the display that games are available so that the New Game
            // button can be enabled.
            this.practiceGameDisplay.practiceGamesAvailable();
        }
        COV(2, CL);
    }
}

export { AppDisplay };

// Create the singleton, and it all happens from there.
// IMPORTANT: Do NOT import this file from Test.js!
AppDisplay.singleton();
