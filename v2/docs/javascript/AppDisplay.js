import { BaseLogger } from './BaseLogger.js';
import { WordChainDict } from './WordChainDict.js';
import { DailyGameDisplay } from './DailyGameDisplay.js';
import { HelpDisplay } from './HelpDisplay.js';
import { SettingsDisplay } from './SettingsDisplay.js';
import { StatsDisplay } from './StatsDisplay.js';
import { ElementUtilities } from './ElementUtilities.js';
import { Cookie } from './Cookie.js';
import * as Const from './Const.js';


/*
** TODO:
** Implementation
**
** Before Sharing with Initial Friends
** - Review help message
** - 30 days of daily games
** - Execute test plan on iPhone/iPad (Safari) and desk/laptop (Chrome)
**
** Deployment
** - How to create/minify/obscure one big js file
** - Buy domain wordchain.com?
** - Where to host?
** - How to manage daily game words long-term?
** - Testing on various browsers/devices
** - Cookies: make secure? Save in back-end DB?
** - Logo/favicon.ict
*/

// Synchronously wait for the word list to download.
/*
const globalWordList = await fetch(Const.DICT_URL)
  .then(resp => resp.text())
  .then(text => text.split("\n"));
  */

class AppDisplay extends BaseLogger {

    /* ----- Class Constants ----- */

    static singletonObject = null;
    static currentGameDisplay = null;

    /* ----- Construction ----- */

    constructor() {
        super();

        this.dict = new WordChainDict();
        let testWordList = ['hard', 'heard', 'hear', 'hoard', 'hoar', 'pour', 'pear', 'ear', 'head', 'herd', 'heed', 'peed', 'peer'];
        //this.dict = new WordChainDict(testWordList);

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
        // TODO: If we ultimately support a separate practice game we will need to 
        // have multple gameDiv, pickerDiv, pickerInnerDiv.
        this.lowerDiv = ElementUtilities.addElementTo("div", this.rootDiv, {id: "lower-div"});

        this.createGameDiv(this.lowerDiv);
        this.createPickerDiv(this.lowerDiv);

        this.createAuxiliaryScreens();
        this.createGameButtons();

        // This will create the GameDisplay and its game and get it going.
        // Pass pickerInnerDiv because that's where we want GameDisplay to
        // add the picker.

        this.dailyGame = new DailyGameDisplay(this, this.gameDiv, this.pickerInnerDiv, this.dict, "ear", "hard");
        AppDisplay.currentGameDisplay = this.dailyGame;
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
        // This div is the one we style as none or flex to hide/show the div.
        this.gameDiv = ElementUtilities.addElementTo("div", lowerDiv, {id: "game-div"}, null);
        this.gameDiv.style.display = "flex";
    }

    createPickerDiv(lowerDiv) {
        // We always want the picker to appear on a "line" by itself, not
        // next to the cell grid.
        //
        // A div with class "break" forces whatever comes after this div
        // to be on a "new line" when the containing div is display: flex.
        // See: https://tobiasahlin.com/blog/flexbox-break-to-new-row/
        ElementUtilities.addElementTo("div", lowerDiv, {class: "break"});

        // This div is the one we style as none or flex to hide/show the div.
        this.pickerDiv = ElementUtilities.addElementTo("div", lowerDiv, {id: "picker-div"}, null),

        // picker-div always ends up with extra space at the top. The only way I was able
        // to get rid of it is to create picker-inner-div, which has no extra space, and
        // then in the JavaScript code set the height of picker-div to match that of
        // picker-inner-div.
        this.pickerInnerDiv = ElementUtilities.addElementTo("div", this.pickerDiv, {id: "picker-inner-div"}, null);

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
        console.log("Not reimplemented!");
        return;

        // When the button was created we saved 'this' as callbackAccessor in the button
        // element; use it to access other instance data.
        const callbackAccessor = event.srcElement.callbackAccessor;

/*
REDO
        // Note when the daily game has ended; only the daily game contributes
        // to stats, so we won't need to keep track of whether (future) practice or
        // back-up daily games have been ended.
        if (callbackAccessor.game.getName() === "DailyGame") {
            callbackAccessor.dailySolutionShown = true;
            Cookie.save("DailySolutionShown", callbackAccessor.dailySolutionShown);
            callbackAccessor.incrementStat("gamesShown");
        }

        // This call to endGame will play the (remaining) words of the
        // revealed solution, just like a real game; this sets thing up
        // for the call to updateGameDisplay().
        callbackAccessor.gameTileDisplay.endGame();
        callbackAccessor.updateGameDisplay();
*/
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
        //console.log("setColors(): this.darkTheme:", this.darkTheme);
        //console.log("setColors(): this.colorblindMode:", this.colorblindMode);

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
        AppDisplay.currentGameDisplay && AppDisplay.currentGameDisplay.showMove();
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
}

export { AppDisplay };

// Create the singleton, and it all happens from there.
AppDisplay.singleton();
