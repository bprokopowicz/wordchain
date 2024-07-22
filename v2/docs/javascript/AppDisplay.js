import { BaseLogger } from './BaseLogger.js';
import { Cookie } from './Cookie.js';
import { DailyGameDisplay } from './DailyGameDisplay.js';
import { ElementUtilities } from './ElementUtilities.js';
import { HelpDisplay } from './HelpDisplay.js';
import { PracticeGameDisplay } from './PracticeGameDisplay.js';
import { SettingsDisplay } from './SettingsDisplay.js';
import { StatsDisplay } from './StatsDisplay.js';
import * as Const from './Const.js';


/*
** TODO:
**
** Implementation
** - Solution button -- add means to show WordChain's solution?
** - After a game fails should the solution be shown?
**   If so from the point of failure onward?
**   Or by the same means to show WordChain's solution?
** - Resolve all TOODs!
**
** Testing
** - Update test plan
** - Tweak for display on iPhone/iPad
**
** Before Sharing with Initial Friends
** - Review help message
** - 30 days of daily games
** - Execute test plan on iPhone/iPad (Safari) and desk/laptop (Safari/Chrome)
**
** Deployment
** - How to create/minify/obscure one big js file
** - Buy domain wordchain.com?
** - Where to host?
** - How to manage daily game words long-term?
** - Testing on various browsers/devices
** - Cookies: make secure? Obfuscate? Save in back-end DB?
** - Logo/favicon.ico
*/

/*
** See the Cookie class for a description of the cookies that this class uses.
*/


class AppDisplay extends BaseLogger {

    /* ----- Class Variables ----- */

    static singletonObject = null;

    /* ----- Construction ----- */

    constructor() {
        super();

        // Flags from Settings screen
        this.darkTheme      = Cookie.getBoolean("DarkTheme");
        this.colorblindMode = Cookie.getBoolean("ColorblindMode");

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
        this.helpDisplay = null;
        this.settingsDiv = null;
        this.statsDiv    = null;

        // Div for toast pop-ups; child of root-div.
        this.toastDiv    = null;

        // Now, create all the screens. This will create all the divs listed above.
        this.createScreens();

        // Now set the colors based on darkTheme and colorblindMode.
        this.setColors();
    }

    // Create the one and only object of this class if it hasn't yet been created.
    // Return the new or existing object.
    static singleton() {
        if (AppDisplay.singletonObject === null) {
            AppDisplay.singletonObject = new AppDisplay();
        }
        return AppDisplay.singletonObject;
    }

    // This is the entry point for creating the screens and displaying the game.
    createScreens() {
        this.rootDiv = ElementUtilities.addElementTo("div", document.body, {id: "root-div"});

        this.auxiliaryDiv = ElementUtilities.addElementTo("div", this.rootDiv, {id: "auxiliary-div", class: "auxiliary-div"});
        this.createHeaderDiv();
        this.createToastDiv();

        // The lower-div contains the divs for game setup and game play.
        this.lowerDiv = ElementUtilities.addElementTo("div", this.rootDiv, {id: "lower-div"});

        this.createPickerDiv(this.lowerDiv);
        this.createGameDiv(this.lowerDiv);

        this.createAuxiliaryScreens();
        this.createGameButtons();

        // Create divs for the daily and practice games and pickers. When switching between games,
        // these will be shown/hidden as appropriate.
        this.dailyGameDiv = ElementUtilities.addElementTo("div", this.gameDiv, {id: "daily-game-div"});
        this.practiceGameDiv = ElementUtilities.addElementTo("div", this.gameDiv, {id: "practice-game-div"});
        this.dailyPickerDiv = ElementUtilities.addElementTo("div", this.pickerDiv, {id: "daily-picker-div"});
        this.practicePickerDiv = ElementUtilities.addElementTo("div", this.pickerDiv, {id: "practice-picker-div"});

        // To start, hide the practice game divs.
        ElementUtilities.hide(this.practiceGameDiv);
        ElementUtilities.hide(this.practicePickerDiv);

        // Creation of DailyGameDisplay causes the start/target words to be determined
        // based on today's date and displays the game's grid for the user to play.
        this.dailyGame = new DailyGameDisplay(this, this.dailyGameDiv, this.dailyPickerDiv);
        this.practiceGame = null;
        this.currentGameDisplay = this.dailyGame;
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
        // Probably don't need to save these, but we will anyway!
        this.helpDisplay     = new HelpDisplay(this.auxiliaryButtonDiv, Const.HELP_PATH, this.auxiliaryDiv, this.primaryDivs);
        this.settingsDisplay = new SettingsDisplay(this.auxiliaryButtonDiv, Const.SETTINGS_PATH, this.auxiliaryDiv, this.primaryDivs, this);
        this.statsDisplay    = new StatsDisplay(this.auxiliaryButtonDiv, Const.STATS_PATH, this.auxiliaryDiv, this.primaryDivs, this);
    }

    createGameButtons() {
        // Button to show the solution.
        this.solutionButton = ElementUtilities.addElementTo(
            "button", this.gameButtonDiv,
            {id: "show-solution", class: "wordchain-button game-button"},
            "Solution");

        // Save 'this' in the solutionButton element so that we can access
        // it (via event.srcElement.callbackAccessor) in the callback.
        this.solutionButton.callbackAccessor = this;
        ElementUtilities.setButtonCallback(this.solutionButton, this.solutionCallback);

        // Button to switch between Daily and Practice games.
        this.switchGamesButton = ElementUtilities.addElementTo(
            "button", this.gameButtonDiv,
            {id: "switch-games", class: "wordchain-button game-button"},
            "Practice");

        // Save 'this' in the switchGamesButton element so that we can access
        // it (via event.srcElement.callbackAccessor) in the callback.
        this.switchGamesButton.callbackAccessor = this;
        ElementUtilities.setButtonCallback(this.switchGamesButton, this.switchGamesCallback);
    }

    createHeaderDiv() {
        // This div is the one we style as none or flex to hide/show the div.
        this.headerDiv = ElementUtilities.addElementTo("div", this.rootDiv, {id: "header-div"});
        this.headerDiv.style.display = "flex";

        // game-button-div holds buttons related to game play.
        this.gameButtonDiv = ElementUtilities.addElementTo("div", this.headerDiv, {id: "game-button-div"});

        // TODO: Add a logo icon.
        const titleDiv = ElementUtilities.addElementTo("div", this.headerDiv, {id: "title-div"});
        ElementUtilities.addElementTo("label", titleDiv, {class: "title"}, "WordChain");

        // auxiliary-button-div holds the buttons for getting to the auxiliary screens.
        this.auxiliaryButtonDiv = ElementUtilities.addElementTo("div", this.headerDiv, {id: "auxiliary-button-div"});
    }

    /* ----- Game ----- */

    createGameDiv(lowerDiv) {
        // We always want the game to appear on a "line" by itself, not
        // next to the picker grid.
        //
        // A div with class "break" forces whatever comes after this div
        // to be on a "new line" when the containing div is display: flex.
        // See: https://tobiasahlin.com/blog/flexbox-break-to-new-row/
        ElementUtilities.addElementTo("div", lowerDiv, {class: "break"});

        // This div is the one we style as none or flex to hide/show the div.
        this.gameDiv = ElementUtilities.addElementTo("div", lowerDiv, {id: "game-div"}, null);
        this.gameDiv.style.display = "flex";
    }

    createPickerDiv(lowerDiv) {
        // This div is the one we style as none or flex to hide/show the div.
        this.pickerDiv = ElementUtilities.addElementTo("div", lowerDiv, {id: "picker-div"}, null),

        // Show the picker initially by default.
        this.pickerDiv.style.display = "flex";
    }

    /* ----- Toast Notifications ----- */

    createToastDiv() {
        this.toastDiv = ElementUtilities.addElementTo("div", this.rootDiv, {id: "toast-div", class: "pop-up hide"});
    }

    /* ----- Callbacks ----- */

    // Callback for the Solution button.
    solutionCallback(event) {
        // When the button was created we saved 'this' as callbackAccessor in the button
        // element; use it to access other instance data.
        const me = event.srcElement.callbackAccessor;
        me.currentGameDisplay.showSolution();
    }

    // Callback for the Switch Games button.
    switchGamesCallback(event) {
        // When the button was created we saved 'this' as callbackAccessor in the button
        // element; use it to access other instance data.
        const me = event.srcElement.callbackAccessor,
              buttonText = event.srcElement.innerText;

        if (buttonText === "Practice") {
            me.switchToPracticeGame();
        } else {
            me.switchToDailyGame();
        }
    }

    /* ----- Utilities ----- */

    // Return the given CSS property value.
    static getCssProperty(property) {
        return getComputedStyle(document.documentElement).getPropertyValue(`--${property}`);
    }

    // Return an object with information about the daily game status.
    getDailyGameInfo() {
        return this.dailyGame.getGameInfo();
    }

    isColorblindMode() {
        return this.colorblindMode;
    }

    isDarkTheme() {
        return this.darkTheme;
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
        //
        // These need to be set according to whether the user has selected colorblind mode
        // as well as whether the user has selected light or dark mode.
        if (this.colorblindMode) {
            // Colorblind Mode is checked: set good/bad colorblind variables based on whether
            // Dark Mode is set, and set the properties affected by Colorblind Mode
            // based on those variables.
            let colorblindGood, colorblindBad;
            if (this.darkTheme) {
                colorblindGood = AppDisplay.getCssProperty("colorblind-good-dark");
                colorblindBad  = AppDisplay.getCssProperty("colorblind-bad-dark");
            } else {
                colorblindGood = AppDisplay.getCssProperty("colorblind-good-light");
                colorblindBad  = AppDisplay.getCssProperty("colorblind-bad-light");
            }
            this.setCssProperty("played-word-good-bg", colorblindGood);
            this.setCssProperty("played-word-bad-bg",  colorblindBad);

        } else {
            // Colorblind Mode is not checked: restore the affected properties based on whether
            // Dark Mode is set.
            if (this.darkTheme) {
                this.setCssProperty("played-word-good-bg",  AppDisplay.getCssProperty("non-colorblind-good-bg-dark"));
                this.setCssProperty("played-word-bad-bg",   AppDisplay.getCssProperty("non-colorblind-bad-bg-dark"));
            } else {
                this.setCssProperty("played-word-good-bg",  AppDisplay.getCssProperty("non-colorblind-good-bg-light"));
                this.setCssProperty("played-word-bad-bg",   AppDisplay.getCssProperty("non-colorblind-bad-bg-light"));
            }
        }

        // Re-show the moves to make the color changes take effect.
        this.currentGameDisplay && this.currentGameDisplay.showMove();
    }

    // Set the given CSS property to the specified value.
    setCssProperty(property, value) {
        document.documentElement.style.setProperty(`--${property}`, value);
    }

    // Show a "toast" pop-up (typically an error message).
    showToast(message) {
        this.toastDiv.innerHTML = message
        ElementUtilities.editClass(/hide/, "show", this.toastDiv);
        setTimeout(() => {
            ElementUtilities.editClass(/show/, "hide", this.toastDiv);
        }, 3000);
    }

    switchToDailyGame() {
        // Hide practice and show daily.
        ElementUtilities.hide(this.practiceGameDiv);
        ElementUtilities.hide(this.practicePickerDiv);
        ElementUtilities.show(this.dailyGameDiv);
        ElementUtilities.show(this.dailyPickerDiv);

        // Toggle the button text to Practice.
        this.switchGamesButton.innerHTML = "Practice";

        this.currentGameDisplay = this.dailyGame;
    }

    switchToPracticeGame() {
        if (this.practiceGame === null) {
            // Creation of PracticeGameDisplay causes the start/target words to be retrieved
            // from Cookies or randomly selected, and displays the game's grid for the user to play.
            this.practiceGame = new PracticeGameDisplay(this, this.practiceGameDiv, this.practicePickerDiv);
        }

        // If the game isn't valid, the user has already played the maximum number of games.
        if (! this.practiceGame.isValid()) {
            this.showToast(Const.TOO_MANY_GAMES);
            return;
        }

        // Hide daily and show practice.
        ElementUtilities.hide(this.dailyGameDiv);
        ElementUtilities.hide(this.dailyPickerDiv);
        ElementUtilities.show(this.practiceGameDiv);
        ElementUtilities.show(this.practicePickerDiv);

        // Toggle the button text to Daily.
        this.switchGamesButton.innerHTML = "Daily";

        this.currentGameDisplay = this.practiceGame;
    }
}

export { AppDisplay };

// Create the singleton, and it all happens from there.
AppDisplay.singleton();
