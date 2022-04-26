import { TileDisplay, GameTileDisplay, PracticeTileDisplay } from './TileDisplay.js';
import { BaseLogger } from './BaseLogger.js';
import { WordChainDict } from './WordChainDict.js';
import { Solver } from './Solver.js';
import { Game } from './Game.js';
import { ElementUtilities } from './ElementUtilities.js';
import { Cookie } from './Cookie.js';
import { DailyGame } from './DailyGame.js';


/*
** TODO:
** Implementation
**
** Before Sharing with Initial Friends
** - Adjust phone/iPad styling
** - Create a faq and fix link
** - Review help message
** - Change practice game max back to 3
** - 30 days of daily games
**
** Deployment
** - How to create/minify/obscure one big js file
** - Buy domain wordchain.com?
** - Where to host?
** - How to manage daily game words long-term?
** - Testing on various browsers/devices
** - Cookies: make secure?
** - Logo/favicon.ict
*/

/*
** Forwarding functions
**
** When "this.startGameCallback" is passed, for example, as the listener on calls
** within the AppDisplay class to addEventListener(), Chrome appears to call it (but refers
** to it as HTMLButtonElement.startGameCallback, which doesn't exist!) and "this"
** within the method is of type HTMLButtonElement, so the call within to "this.checkWord()"
** resolves to HTMLButtonElement.checkword, which is is not a function. This kind of makes
** sense (except for why it  was able to call the AppDisplay.startGameCallback()
** method at all!).
**
** At that point I introduced the singleton idea. I thought that passing
** AppDisplay.singleton().startGameCallback as the listener would work, but this
** also resulted in "HTMLButtonElement.checkWord() is not a function." Sigh. I really don't
** understand why that is not working. But we carry on; introducing the "forwarding function"
** did the trick.
*/


function checkboxCallback(event) {
    AppDisplay.singleton().checkboxCallback(event);
}

function clearLettersCallback() {
    AppDisplay.singleton().clearLettersCallback();
}

function closeAuxiliaryCallback(event) {
    AppDisplay.singleton().closeAuxiliaryCallback(event);
}

function dailyCallback() {
    AppDisplay.singleton().dailyCallback();
}

function hardKeyboardCallback(event) {
    if (event.key == "Backspace") {
        AppDisplay.singleton().keyboardCallback(AppDisplay.BACKSPACE);
    }
    else if (event.key == "Enter") {
        AppDisplay.singleton().keyboardCallback(AppDisplay.ENTER);
    } else {
        AppDisplay.singleton().keyboardCallback(event.key.toString().toLowerCase());
    }
}

function helpCloseCallback() {
    AppDisplay.singleton().helpCloseCallback();
}

function newGameCallback() {
    AppDisplay.singleton().newGameCallback();
}

function openAuxiliaryCallback(event) {
    AppDisplay.singleton().openAuxiliaryCallback(event);
}

function practiceCallback() {
    AppDisplay.singleton().practiceCallback();
}

function radioCallback(event) {
    AppDisplay.singleton().radioCallback(event);
}

function shareCallback() {
    AppDisplay.singleton().shareCallback();
}

function showSolutionCallback() {
    AppDisplay.singleton().showSolutionCallback();
}

function softKeyboardCallback() {
    // Here the "this" being the button works in our favor -- we can get
    // its data-key attribute value, which is the letter of the key that
    // was clicked.
    AppDisplay.singleton().keyboardCallback(this.getAttribute("data-key"));
}

function startGameCallback() {
    AppDisplay.singleton().startGameCallback();
}


// Synchronously wait for the word list to download.
const url = "https://bprokopowicz.github.io/wordchain/resources/dict/WordFreqDict";
const globalWordList = await fetch(url)
  .then(resp => resp.text())
  .then(text => text.split("\n"));

/*
** ==========================
** SINGLETON CLASS AppDisplay
** ==========================
*/

class AppDisplay extends BaseLogger {
    /*
    ** ===============
    ** CLASS VARIABLES
    ** ===============
    */

    static singletonObject = null;

    static PRACTICE_GAMES_PER_DAY = 30;
    static TOO_MANY_EXTRA_STEPS   = 6;  // Shouldnt be > 9

    // Constants for keyboard action buttons.
    static BACKSPACE = "←";
    static ENTER = "↵";

    // SVG (Scalable Vector Graphics) paths for keyboard keys, copy/pasted from
    // various corners of the interwebs.
    static BACKSPACE_PATH = "M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H7.07L2.4 12l4.66-7H22v14zm-11.59-2L14 13.41 17.59 17 19 15.59 15.41 12 19 8.41 17.59 7 14 10.59 10.41 7 9 8.41 12.59 12 9 15.59z";
    static ENTER_PATH = "M19 7v4H5.83l3.58-3.59L8 6l-6 6 6 6 1.41-1.41L5.83 13H21V7h-2z";

    // SVG paths for icons.
    static CLOSE_PATH = "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z";
    static HELP_PATH = "M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z";
    static MENU_PATH = "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z";
    static SETTINGS_PATH = "M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z";
    static STATS_PATH = "M16,11V3H8v6H2v12h20V11H16z M10,5h4v14h-4V5z M4,11h4v8H4V11z M20,19h-4v-6h4V19z";

    static EMAIL_HREF = "mailto:bonnie.prokopowicz@gmail.com?subject=WordChain%20Feedback";
    static FAQ_HREF = "http://www.prokopowicz.org";

    // Emoji code strings for share string
    static RED_SQUARE     = "\u{1F7E5}";     // Extra steps in graphic
    static GREEN_SQUARE   = "\u{1F7E9}";     // No extra steps in graphic
    static ORANGE_SQUARE  = "\u{1F7E7}";     // Extra steps in graphic -- colorblind
    static BLUE_SQUARE    = "\u{1F7E6}";     // No extra steps in graphic -- colorblind
    static STAR           = "\u{2B50}";      // No extra steps in first share line
    static CONFOUNDED     = "\u{1F616}";     // Too many extra steps in first share line
    static FIRE           = "\u{1F525}";     // Hard mode in first share line
    static ROCKET         = "\u{1F680}";     // Unused
    static FIREWORKS      = "\u{1F386}";     // Unused
    static TROPHY         = "\u{1F3C6}";     // Unused
    static LINK           = "\u{1F517}";     // Unused
    static CHAINS         = "\u{26D3}";      // Unused
    static NUMBERS        = [                // Used in first share line
        AppDisplay.STAR,                // 0
        "\u{0031}\u{FE0F}\u{20E3}",     // 1
        "\u{0032}\u{FE0F}\u{20E3}",
        "\u{0033}\u{FE0F}\u{20E3}",
        "\u{0034}\u{FE0F}\u{20E3}",
        "\u{0035}\u{FE0F}\u{20E3}",
        "\u{0036}\u{FE0F}\u{20E3}",
        "\u{0037}\u{FE0F}\u{20E3}",
        "\u{0038}\u{FE0F}\u{20E3}",
        "\u{0031}\u{FE0F}\u{20E3}",
        "\u{0039}\u{FE0F}\u{20E3}",     // 9
    ]

    static MaxGamesTimePeriod = 24 * 60 *60 * 1000; // one day in ms

    /*
    ** ============
    ** CONSTRUCTION
    ** ============
    */

    constructor() {
        super();

        this.dict = new WordChainDict(globalWordList);

        this.dailyGame    = null;
        this.practiceGame = null;

        // this.game will be set to whichever game is current.
        this.game = null;

        // The mother of all divs.
        this.rootDiv = null;

        // Divs that appear during game setup and play; header/lower are children of root-div.
        this.headerDiv   = null;
        this.lowerDiv    = null; // Contains the following 3 divs
        this.practiceDiv = null;
        this.solutionDiv = null;
        this.keyboardDiv = null;

        // Buttons in the keyboard div; used to add event listeners to them.
        this.keyboardButtons = [];

        // Divs that hold auxiliary screens (Help, Settings, Stats); all children of root-div.
        this.helpDiv     = null;
        this.settingsDiv = null;
        this.statsDiv    = null;

        // Div for toast pop-ups; child of root-div.
        this.toastDiv    = null;

        // This is the set of divs that need to be hidden when an auxiliary screen is
        // shown, and shown when an auxiliary screen is cclosed. Methods that create the
        // divs will add them to this list.
        this.primaryDivs = [];

        // Objects for the tile displays.
        this.gameTileDisplay     = null;
        this.practiceTileDisplay = null;

        // Per-setting flags; get initial values from cookies.
        this.darkTheme      = null;
        this.colorblindMode = null;
        this.hardMode       = null;
        this.typeSavingMode = null;
        this.getCookies();

        // Debug-only cookie that can be manually added to the time period.
        const debugPracticeGameTimePeriod = Cookie.get("DebugPracticeGameTimePeriod");

        // Are we debugging limiting practice games?
        // (Cookies are stored as strings, so if we have a cookie, convert it to a number.)
        if (debugPracticeGameTimePeriod && parseInt(debugPracticeGameTimePeriod)) {
            AppDisplay.MaxGamesTimePeriod = debugPracticeGameTimePeriod * 60 * 1000;
        }

        // Create a backup daily game, in case we cannot get one.
        const solution = Solver.fastSolve(this.dict, "daily", "broken");
        this.backupDailyGame = new Game("BackupDailyGame", this.dict, solution, this.typeSavingMode);

        // Now, create all the elements.
        this.displayGame();
    }

    // Create the one and only object of this class if it hasn't yet been created.
    // Return the new or existing object.
    static singleton() {
        if (AppDisplay.singletonObject === null) {
            AppDisplay.singletonObject = new AppDisplay();
        }
        return AppDisplay.singletonObject;
    }

    /*
    ** ================================
    ** METHODS TO CONSTRUCT THE DISPLAY
    ** ================================
    */

    // This is the entry point for displaying the game.
    displayGame() {
        this.rootDiv = ElementUtilities.addElementTo("div", document.body, {id: "root-div"});
        this.createHeaderDiv();

        // These all "live" under root-div, and are initially not shown.
        // The first three are "auxiliary screens"
        this.createHelpDiv();
        this.createSettingsDiv();
        this.createStatsDiv();
        this.createToastDiv();

        // The lower-div contains the divs for game setup and game play.
        this.lowerDiv = ElementUtilities.addElementTo("div", this.rootDiv, {id: "lower-div"});
        this.createPracticeDiv();
        this.createSolutionDiv();
        this.createKeyboardDiv();

        // All hard keyboard events go to one listener.
        window.addEventListener("keydown", hardKeyboardCallback);

        // Construct a practice game (only gets constructed if the user already had one
        // in progress in the cookies).
        this.constructPracticeGame();

        // Construct a daily game (either a new one or an in-progress one) and display it.
        this.constructDailyGame();
    }

    /* ----- Header ----- */

    createHeaderDiv() {
        // This div is the one we style as none or flex to hide/show the div.
        this.headerDiv = ElementUtilities.addElementTo("div", this.rootDiv, {id: "header-div"});
        this.headerDiv.style.display = "flex";
        this.primaryDivs.push(this.headerDiv);

        // left-button-div is a placeholder for now. It allows styling that puts title-div
        // and right-button-div where we want them.
        const leftButtonDiv = ElementUtilities.addElementTo("div", this.headerDiv, {id: "left-button-div"});

        // title-div holds the title as well as the Daily/Practice buttons.
        // TODO: Add a logo icon.
        const titleDiv = ElementUtilities.addElementTo("div", this.headerDiv, {id: "title-div"});

        ElementUtilities.addElementTo("label", titleDiv, {class: "title"}, "WordChain");

        this.dailyGameButton = ElementUtilities.addElementTo(
            "button", leftButtonDiv,
            {id: "daily-game", class: "wordchain-button header-game-button active-button"},
            "Daily");
        ElementUtilities.setButtonCallback(this.dailyGameButton, dailyCallback);

        this.practiceGameButton = ElementUtilities.addElementTo(
            "button", leftButtonDiv,
            {id: "practice-game", class: "wordchain-button header-game-button not-active"},
            "Practice");
        ElementUtilities.setButtonCallback(this.practiceGameButton, practiceCallback);

        // right-button-div holds the buttons for getting to the auxiliary screens.
        const rightButtonDiv = ElementUtilities.addElementTo("div", this.headerDiv, {id: "right-button-div"});

        const buttonClass = "header-aux-button"
        this.createSvgButton(rightButtonDiv, buttonClass, openAuxiliaryCallback, AppDisplay.HELP_PATH, "help-div");
        this.createSvgButton(rightButtonDiv, buttonClass, openAuxiliaryCallback, AppDisplay.STATS_PATH, "stats-div");
        this.createSvgButton(rightButtonDiv, buttonClass, openAuxiliaryCallback, AppDisplay.SETTINGS_PATH, "settings-div");
    }

    /* ----- GAME SETUP AND PLAY SCREENS ----- */

    /* ----- Practice Game Setup ----- */

    createPracticeDiv() {
        // This div is the one we style as none or flex to hide/show the div.
        this.practiceDiv = ElementUtilities.addElementTo("div", this.lowerDiv, {id: "practice-div"});
        this.practiceDiv.style.display = "none";
        this.primaryDivs.push(this.practiceDiv);

        const helpText = `Words can be up to ${Game.MAX_WORD_LENGTH} letters. Press the Return key to enter a word.`
        ElementUtilities.addElementTo("label", this.practiceDiv, {class: "help-info"}, helpText);

        // Create a div for selecting practice game start/target words, and create
        // a div within that to hold the tiles.
        this.practiceWordsDiv = ElementUtilities.addElementTo("div", this.practiceDiv, {id: "practice-words-div"});
        this.practiceTileDisplay = new PracticeTileDisplay(this.dict, this.practiceWordsDiv);
        this.practiceTileDisplay.resetWords();

        // Now create a div for the buttons in this display and add the buttons.
        this.practiceButtonsDiv = ElementUtilities.addElementTo("div", this.practiceDiv, {id: "practice-buttons-div"});

        this.startGameButton = ElementUtilities.addElementTo(
            "button", this.practiceButtonsDiv,
            {id: "start-game", class: "wordchain-button game-button"},
            "Start Game");
        ElementUtilities.setButtonCallback(this.startGameButton, startGameCallback);

        this.clearLettersButton = ElementUtilities.addElementTo(
            "button", this.practiceButtonsDiv,
            {id: "clear-letters", class: "wordchain-button game-button"},
            "Clear Letters");
        ElementUtilities.setButtonCallback(this.clearLettersButton, clearLettersCallback);
    }

    /* ----- Daily/Practice Game Solution ----- */

    createSolutionDiv() {
        // This div is the one we style as none or flex to hide/show the div.
        this.solutionDiv = ElementUtilities.addElementTo("div", this.lowerDiv, {id: "solution-div"}, null);
        this.solutionDiv.style.display = "flex";
        this.primaryDivs.push(this.solutionDiv);

        // Create a div for the game play words which will hold the tiles.
        this.gameWordsDiv = ElementUtilities.addElementTo("div", this.solutionDiv, {id: "game-words-div"});

        // Now create a div for the buttons in this display and add the buttons.
        this.solutionButtonsDiv = ElementUtilities.addElementTo("div", this.solutionDiv, {id: "solution-buttons-div"});

        this.newGameButton = ElementUtilities.addElementTo(
            "button", this.solutionButtonsDiv,
            {id: "start-new-game", class: "wordchain-button game-button"},
            "New Game");
        ElementUtilities.setButtonCallback(this.newGameButton, newGameCallback);

        this.shareButton = ElementUtilities.addElementTo(
            "button", this.solutionButtonsDiv,
            {id: "share", class: "wordchain-button game-button"},
            "Share");
        ElementUtilities.setButtonCallback(this.shareButton, shareCallback);

        // Since we start with a daily game, of which there is only one per day,
        // we set its style.display to be "none" so it does not show; it will be
        // changed when a practice game is shown.
        this.newGameButton.style.display = "none";

        // The share button will be shown if the user completes the daily game.
        this.shareButton.style.display = "none";

        // The default is to show this button, which we want for both daily and practice games;
        // users should be able to display the solution for either.
        this.showSolutionButton = ElementUtilities.addElementTo(
            "button", this.solutionButtonsDiv,
            {id: "show-solution", class: "wordchain-button game-button"},
            "Show Solution");
        ElementUtilities.setButtonCallback(this.showSolutionButton, showSolutionCallback);
    }

    /* ----- Keyboard ----- */

    // This method is used to add the ENTER and BACKSPACE buttons.
    addActionButton(rowElement, letter) {
        let svgPath;
        if (letter === AppDisplay.ENTER) {
            svgPath = AppDisplay.ENTER_PATH;
        } else {
            svgPath = AppDisplay.BACKSPACE_PATH;
        }

        const button = ElementUtilities.addElementTo("button", rowElement, {'data-key': letter, class: "keyboard-key keyboard-wide-key"});
        const svg    = ElementUtilities.addElementTo("svg", button, {viewBox: "0 0 24 24", style: "width: 24; height: 24;"});
        const path   = ElementUtilities.addElementTo("path", svg, {d: svgPath});

        this.keyboardButtons.push(button);
    }

    // This method is used to add the letter buttons.
    addLetterButton(rowElement, letter) {
        const button = ElementUtilities.addElementTo("button", rowElement, {'data-key': letter, class: "keyboard-key"}, letter);
        this.keyboardButtons.push(button);
    }

    // This method adds a spacer so the middle row is indented.
    addSpacer(rowElement) {
        ElementUtilities.addElementTo("div", rowElement, {class: "keyboard-key keyboard-spacer"});
        // This isn't a button, so we don't add it to this.keyboardButtons.
    }

    createKeyboardDiv() {
        // We always want the keyboard to appear on a "line" by itself, not
        // next to the tile grid.
        //
        // A div with class "break" forces whatever comes after this div
        // to be on a "new line" when the containing div is display: flex.
        // See: https://tobiasahlin.com/blog/flexbox-break-to-new-row/
        ElementUtilities.addElementTo("div", this.lowerDiv, {class: "break"});

        // This div is the one we style as none or flex to hide/show the div.
        this.keyboardDiv = ElementUtilities.addElementTo("div", this.lowerDiv, {id: "keyboard-div"}, null);
        this.keyboardDiv.style.display = "flex";
        this.primaryDivs.push(this.keyboardDiv);

        this.keyboardInnerDiv = ElementUtilities.addElementTo("div", this.keyboardDiv, {id: "keyboard-inner-div"}, null);

        // Create the keyboard rows; the tiles will be added to each row in turn.
        const row1 = ElementUtilities.addElementTo("div", this.keyboardInnerDiv, {class: "keyboard-row"});
        const row2 = ElementUtilities.addElementTo("div", this.keyboardInnerDiv, {class: "keyboard-row"});
        const row3 = ElementUtilities.addElementTo("div", this.keyboardInnerDiv, {class: "keyboard-row"});

        // Add keys for row 1
        this.addLetterButton(row1, "q");
        this.addLetterButton(row1, "w");
        this.addLetterButton(row1, "e");
        this.addLetterButton(row1, "r");
        this.addLetterButton(row1, "t");
        this.addLetterButton(row1, "y");
        this.addLetterButton(row1, "u");
        this.addLetterButton(row1, "i");
        this.addLetterButton(row1, "o");
        this.addLetterButton(row1, "p");

        // Add keys for row 2, starting and ending with a spacer so the keys are a little indented.
        this.addSpacer(row2);
        this.addLetterButton(row2, "a");
        this.addLetterButton(row2, "s");
        this.addLetterButton(row2, "d");
        this.addLetterButton(row2, "f");
        this.addLetterButton(row2, "g");
        this.addLetterButton(row2, "h");
        this.addLetterButton(row2, "j");
        this.addLetterButton(row2, "k");
        this.addLetterButton(row2, "l");
        this.addSpacer(row2);

        // Add keys for row 3, which has the BACKSPACE/ENTER "action buttons" on the left and right.
        this.addActionButton(row3, AppDisplay.BACKSPACE);
        this.addLetterButton(row3, "z");
        this.addLetterButton(row3, "x");
        this.addLetterButton(row3, "c");
        this.addLetterButton(row3, "v");
        this.addLetterButton(row3, "b");
        this.addLetterButton(row3, "n");
        this.addLetterButton(row3, "m");
        this.addActionButton(row3, AppDisplay.ENTER);

        // Add the same click callback to each button.
        for (let button of this.keyboardButtons) {
            button.addEventListener("click", softKeyboardCallback);
        }
    }

    /* ----- AUXILIARY SCREENS ----- */

    /* ----- Help ----- */

    createHelpDiv() {
        let helpContainerDiv;
        [this.helpDiv, helpContainerDiv] = this.createAuxiliaryDiv("help-div", closeAuxiliaryCallback);

        const helpHTML = `
        <h1 align=center>HOW TO PLAY</h1>
        <h2>
        Change words one step at a time to get from the starting word
        to the target word in as few steps as possible.
        </h2>
        <p>
        A step consists of adding, deleting, or changing a letter.
        <p>
        WordChain shows letter boxes for the shortest solution.
        When playing in normal mode, the boxes around letters that should be changed
        are thicker. Hard mode eliminates these hints, and type-saver mode fills in
        the other letters for you.
        </p>
        <p>
        An extra letter is shown with a gray outline in case you want to chose
        a longer word (and a different solution path) next.
        </p>
        <p>
        If you play a word that increases the number of steps from the start to the target word,
        the background of its letters will be red; otherwise they will be green
        (or orange/blue in colorblind mode).
        </p>
        <h3>
        Every day there will be a new daily WordChain game, and you can play up to ${AppDisplay.PRACTICE_GAMES_PER_DAY}
        practice games per day. Have fun!
        </h3>
        `
        const contentDiv = ElementUtilities.addElementTo("div", helpContainerDiv, {id: "help-content-div",}, helpHTML);
    }

    /* ----- Settings ----- */

    // Add a setting to settings-div's content div.
    addSetting(title, settingClass, description="") {
        // Create a div for one setting.
        const settingDiv = ElementUtilities.addElementTo("div", this.settingsContentDiv, {class: settingClass});

        // Create a div for just the text to be displayed.
        const textDiv = ElementUtilities.addElementTo("div", settingDiv, {class: "setting-text"});
        ElementUtilities.addElementTo("div", textDiv, {class: "setting-title"}, title);
        ElementUtilities.addElementTo("div", textDiv, {class: "setting-description"}, description);

        // Create and return a div to hold the interactive part.
        return ElementUtilities.addElementTo("div", settingDiv, {});
    }

    // Add a setting whose input is a checkbox.
    addCheckboxSetting(title, id, value, description) {
        // setting-simple class styles the contents of the setting (title/description,
        // checkbox input) horizontally.
        const interactiveDiv = this.addSetting(title, "setting-simple", description);

        const checkbox = ElementUtilities.addElementTo("input", interactiveDiv,
            {type: "checkbox", id: id, class: "setting-checkbox"});
        checkbox.addEventListener("change", checkboxCallback);
        checkbox.checked = value;
    }

    // Add a setting whose "input" is clicking a link.
    addLinkSetting(title, linkText, linkHref, description) {
        // setting-simple class styles the contents of the setting (title/description, link)
        // horizontally.
        const interactiveDiv = this.addSetting(title, "setting-simple", description);
        ElementUtilities.addElementTo("a", interactiveDiv, {href: linkHref}, linkText);
    }

    // Add a setting whose input is a (mutually exclusive) set of radio buttons.
    addRadioSetting(title, radioInfoList, radioName, description) {
        // setting-complex class styles the contents of the setting (title/description, radio inputs
        // and their labels) vertically, i.e. title/description on one line, then each input on
        // a subsequent line.
        const interactiveDiv = this.addSetting(title, "setting-complex", description);

        // To get nice formatting, especially on smaller devices where the description will wrap,
        // create a table.
        const table = ElementUtilities.addElementTo("table", interactiveDiv, {class: "radio-container"});

        // radioInfoList is a list of objects containing properties: id, description, and checked.
        for (let radioInfo of radioInfoList) {
            // One row for each option.
            const tableRow = ElementUtilities.addElementTo("tr", table, {});

            // Column 1: the radio input. Set its checked attribute according to the info,
            // and add an event listener to handle changes to it. We'll use the same listener
            // for all the radio inputs.
            const tdCol1 = ElementUtilities.addElementTo("td", tableRow, {});
            const radio = ElementUtilities.addElementTo("input", tdCol1,
                {id: radioInfo.id, value: radioInfo.id, name: radioName, class: "setting-radio", type: "radio"});
            radio.checked = radioInfo.checked;
            radio.addEventListener("change", radioCallback);

            // Column 2: the description of the radio item.
            const tdCol2 = ElementUtilities.addElementTo("td", tableRow, {});
            ElementUtilities.addElementTo("label", tdCol2, {class: "radio-label"}, radioInfo.desc);
        }
    }

    createSettingsDiv() {

        let settingsContainerDiv;
        [this.settingsDiv, settingsContainerDiv] = this.createAuxiliaryDiv("settings-div", closeAuxiliaryCallback);

        // Add a div for the content, which will be centered (because of the styling of aux-container-div).
        // within settingsContainerDiv as a block (because of settings-content-div styling).
        this.settingsContentDiv = ElementUtilities.addElementTo("div", settingsContainerDiv, {id: "settings-content-div",});
        ElementUtilities.addElementTo("h1", this.settingsContentDiv, {align: "center"}, "SETTINGS");

        // All the settings will be added to settings-content-div.
        this.addCheckboxSetting("Dark Theme",      "dark",                  this.darkTheme);
        this.addCheckboxSetting("Colorblind Mode", "colorblind",            this.colorblindMode);

        const radioInfo = [{
                id:      "Normal",
                desc:    "<b>Normal:</b> Letter-change steps are indicated with a thick letter box outline",
                checked: !(this.hardMode || this.typeSavingMode),
            }, {
                id:      "Type-Saving",
                desc:    "<b>Type-Saving:</b> Letters are automatically filled in when the word has not changed length",
                checked: this.typeSavingMode,
            }, {
                id:      "Hard",
                desc:    "<b>Hard:</b> No automatically filled letters or thick outline",
                checked: this.hardMode,
            }
        ]
        this.addRadioSetting("Game Play Mode", radioInfo, "game-play-mode");

        const feedbackDescription = "Dictionary suggestions? Gripes? Things you love? Feature ideas?";
        this.addLinkSetting("Feedback",   "Email", AppDisplay.EMAIL_HREF, feedbackDescription);
        this.addLinkSetting("Questions?", "FAQ",   AppDisplay.FAQ_HREF);
    }

    /* ----- Stats ----- */

    createStatsDiv() {
        let statsContainerDiv;
        [this.statsDiv, statsContainerDiv] = this.createAuxiliaryDiv("stats-div", closeAuxiliaryCallback);

        // Add a div for the content, which will be centered (because of the styling of aux-container-div).
    // within settingsContainerDiv as a block (because of stats-content-div styling).
        const contentDiv = ElementUtilities.addElementTo("div", statsContainerDiv, {id: "stats-content-div",});

        ElementUtilities.addElementTo("h1", contentDiv, {}, "DAILY GAME STATISTICS");
        this.statsContainer = ElementUtilities.addElementTo("div", contentDiv, {id: "stats-container-div"});

        ElementUtilities.addElementTo("hr", contentDiv, {});

        ElementUtilities.addElementTo("h1", contentDiv, {}, "EXTRA STEPS COUNTS");
        this.statsDistribution = ElementUtilities.addElementTo("div", contentDiv, {id: "distribution-div"});

        ElementUtilities.addElementTo("hr", contentDiv, {});

        ElementUtilities.addElementTo("h1", contentDiv, {}, "NEXT DAILY GAME IN");
        const countdown = ElementUtilities.addElementTo("div", contentDiv, {id: "countdown-div"});
        this.countdownClock = ElementUtilities.addElementTo("div", countdown, {id: "countdown-clock"});
    }

    /* ----- Toast Notifications ----- */

    createToastDiv() {
        this.toastDiv = ElementUtilities.addElementTo("div", this.rootDiv, {id: "toast-div", class: "pop-up hide"});
    }

    /*
    ** ========================================
    ** BUTTON, CHECKBOX, AND KEYBOARD CALLBACKS
    ** ========================================
    */

    // Callback for Settings checkbox changes.
    checkboxCallback(event) {
        // The id attribute in the event's srcElement property tells us which setting whas changed.
        const checkboxId = event.srcElement.getAttribute("id");

        // The checked attribute in the event's srcElement property tells us whether the
        // checkbox was checked or unchecked. Set the boolean corresponding to the
        // checkbox's id according to that.
        if (checkboxId === "dark") {
            this.darkTheme = event.srcElement.checked ? true : false;
            Cookie.set("darkTheme", this.darkTheme);
            this.setColors();

        } else if (checkboxId === "colorblind") {
            this.colorblindMode = event.srcElement.checked ? true : false;
            Cookie.set("colorblindMode", this.colorblindMode);
            this.setColors();

        }
    }

    // Callback for the Clear Letters button in the practice game setup screen.
    clearLettersCallback() {
        const startWord  = this.practiceTileDisplay.getStartWord();
        const targetWord = this.practiceTileDisplay.getTargetWord();

        // If the target word is already empty, reset the start word;
        // otherwise reset the target word.
        if (targetWord[0] === PracticeTileDisplay.PLACEHOLDER) {
            this.practiceTileDisplay.resetWords(PracticeTileDisplay.RESET_START);
        } else {
            this.practiceTileDisplay.resetWords(PracticeTileDisplay.RESET_TARGET);
        }
        this.updatePracticeDisplay();
    }

    // Callback for closing an Auxiliary screen.
    closeAuxiliaryCallback(event) {
        // When the button was created with createSvgButton() we set the attribute
        // "data-related-div" on each element that comprises the button. Its value
        // is the ID of the div that needs to be closed which we
        // do by setting its display to "none".
        const sourceElementId = event.srcElement.getAttribute("data-related-div");
        const sourceElement = ElementUtilities.getElement(sourceElementId);

        if (sourceElementId === "stats-div") {
            this.stopCountdownClock();
        }

        sourceElement.style.display = "none";

        // Now restore the divs that we saved when the auxiliary screen was opened.
        this.restoreHiddenDivs();
    }

    // Callback for the Daily header button.
    dailyCallback() {
        // Make Daily button active, and Practice inactive.
        ElementUtilities.editClass(/not-active/, "active-button", this.dailyGameButton);
        ElementUtilities.editClass(/active-button/, "not-active", this.practiceGameButton);

        // Don't display the New Game button.
        this.newGameButton.style.display = "none";

        this.updateGameDisplay(this.dailyGame);
    }

    // This is the keyboard callback for daily/practice game play.
    gameKeyboardCallback(keyValue) {
        if (keyValue === AppDisplay.BACKSPACE) {
            this.gameTileDisplay.keyPressDelete();
        } else if (keyValue === AppDisplay.ENTER) {
            const gameResult = this.gameTileDisplay.keyPressEnter();
            if (gameResult !== TileDisplay.OK) {
                this.showToast(gameResult);
            } else {
                this.updateGameDisplay();
            }

            if (this.game.isSolved()) {
                // Show the alert after 50 ms; this little delay results in the last word
                // appearing on the display before the the alert pop-up.
                setTimeout(() => {
                    this.showToast("Solved!")
                    this.updateGameDisplay();

                    if (this.game.getName() === "DailyGame") {
                        // Set information relating to complete games: share graphic.
                        // and statistics.
                        this.saveGameInfo(this.dailyGame, true);
                    }
                }, 50);
            }
        } else if (ElementUtilities.isLetter(keyValue)) {
            this.gameTileDisplay.keyPressLetter(keyValue);
        }
        // No other keys cause a change.
    }

    // Global keyboard callback; calls specific game/practice callback
    // based on whether the user is playing the game or setting up words
    // for a practice game.
    keyboardCallback(keyValue) {
        if (this.playingGame()) {
            this.gameKeyboardCallback(keyValue);
        } else {
            this.practiceKeyboardCallback(keyValue);
        }
    }

    // Callback for the New Game button that appears when playing a practice
    // game, along side the Show Solution button.
    newGameCallback() {
        // Set practiceGame to null so practiceCallback() knows to get new start/target words.
        this.practiceGame = null;

        // Reset the start/end words so the display will be blank again.
        this.practiceTileDisplay.resetWords();

        // Clear out the cookie for the words played for the current practice game.
        Cookie.set(this.game.getName(), "");

        // The rest is the same as clicking the Practice header button.
        this.practiceCallback();
    }

    // Callback for opening an Auxiliary screen.
    openAuxiliaryCallback(event) {
        // Hide the divs that are currently showing and save information
        // so we can restore them.
        this.hideShownDivs(event);

        // When the button was created with createSvgButton() we set the attribute
        // "data-related-div" on each element that comprises the button. Its value
        // is the ID of the div that needs to be opened, or displayed, which we
        // do by setting its display to "flex".
        const sourceElementId = event.srcElement.getAttribute("data-related-div");
        const sourceElement = ElementUtilities.getElement(sourceElementId);

        if (sourceElementId === "stats-div") {
            this.updateStatsContent();
            this.startCountdownClock();
        }
        sourceElement.style.display = "flex";
    }

    // This is the callback for the Practice header button.
    // It is also called in newGameCallback().
    practiceCallback() {
        ElementUtilities.editClass(/not-active/, "active-button", this.practiceGameButton);
        ElementUtilities.editClass(/active-button/, "not-active", this.dailyGameButton);

        // If we have an ongoing practice game update the display, passing this.practiceGame
        // so that the current game is updated.
        if (this.practiceGame !== null) {
            // Display the New Game button.
            this.updateGameDisplay(this.practiceGame);

        // Otherwise, show the practice word selection tiles.
        } else {
            this.updatePracticeDisplay();
        }
    }

    // This is the keyboard callback for practice game start/target word entry.
    practiceKeyboardCallback(keyValue) {
        if (keyValue === AppDisplay.BACKSPACE) {
            this.practiceTileDisplay.keyPressDelete();
        } else if (keyValue === AppDisplay.ENTER) {
            const result = this.practiceTileDisplay.keyPressEnter();
            if (result !== TileDisplay.OK) {
                this.showToast(result);
            }
            this.updatePracticeDisplay();
        } else if (ElementUtilities.isLetter(keyValue)) {
            this.practiceTileDisplay.keyPressLetter(keyValue);
        }
        // No other keys cause a change.
    }

    // Callback for Settings radio button changes.
    radioCallback(event) {
        const selection = event.srcElement.value;
        if (selection == "Hard") {
            this.hardMode = true;
            this.typeSavingMode = false;
        } else if (selection === "Type-Saving") {
            this.typeSavingMode = true;
            this.hardMode = false;
        } else {
            this.typeSavingMode = false;
            this.hardMode = false;
        }

        // Save both cookies.
        Cookie.set("hardMode", this.hardMode);
        Cookie.set("typeSavingMode", this.typeSavingMode);

        // Hard and Type-Saving modes are implemented in the game tile display,
        // so tell it what our modes are now.
        this.gameTileDisplay.setHardMode(this.hardMode);
        this.gameTileDisplay.setTypeSavingMode(this.typeSavingMode);
    }

    // Callback for the Share button on the Stats screen.
    shareCallback() {
        if (navigator.share) {
            navigator.share({
                text: this.shareString,
            })
            .catch((error) => {
                this.showToast("Failed to share")
                console.log("Failed to share: ", error);
            });
        } else {
            this.showToast("Copied to clipboard")
            navigator.clipboard.writeText(this.shareString);
        }
    }

    // Callback for the Show Solution button that appears for both daily and practice games.
    // (And also back-up daily games.)
    showSolutionCallback() {
        // Note when the daily game has ended; only the daily game contributes
        // to stats, so we don't need to keep track of whether practice or
        // back-up daily games have been ended.
        if (this.game.getName() === "DailyGame") {
            this.dailyGameEnded = true;
            Cookie.set("DailyGameEnded", this.dailyGameEnded);
            this.incrementStat("gamesShown");
        }

        // This call to endGame will play the (remaining) words of the
        // revealed solution, just like a real game; this sets thing up
        // for the call to updateGameDisplay().
        this.gameTileDisplay.endGame();
        this.updateGameDisplay();
    }

    // Callback for the Start Game button in the practice game setup screen.
    startGameCallback() {
        const now = (new Date()).getTime();

        // Make sure the user hasn't used up their practice games for the day.
        if (this.practiceGameTimestamps.length >= AppDisplay.PRACTICE_GAMES_PER_DAY) {
            let popped = false;

            // See whether any games have aged out. The list is a queue, with the
            // first item being the oldest.
            while (this.practiceGameTimestamps.length != 0) {
                const timeSinceLastGame = now - this.practiceGameTimestamps[0];
                if (timeSinceLastGame > AppDisplay.MaxGamesTimePeriod) {
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
                this.showToast(`Only ${AppDisplay.PRACTICE_GAMES_PER_DAY} games allowed per day`);
                return;
            }
        }

        // Save the timestamp of this game in the instance and cookies.
        this.practiceGameTimestamps.push(now);
        Cookie.set("PracticeGameTimestamps", JSON.stringify(this.practiceGameTimestamps));

        // Get the user's words from the tiles.
        const startWord  = this.practiceTileDisplay.getStartWord();
        const targetWord = this.practiceTileDisplay.getTargetWord();

        // Validate that the user's start/target words have actually been entered
        // and are in the dictionary.
        let result = this.checkWord(startWord, "Start");
        if (result !== null) {
            this.showToast(result);
            return;
        }
        result = this.checkWord(targetWord, "Target");
        if (result !== null) {
            this.showToast(result);
            return;
        }

        // Don't create a game if the words are the same.
        if (startWord === targetWord) {
            this.showToast("Words are the same");
            return
        }

        // Don't let them use the same words as the daily game.
        if ((startWord == this.dailyStartWord && targetWord == this.dailyTargetWord) ||
            (startWord == this.dailyTargetWord && targetWord == this.dailyStartWord)) {
            this.showToast("Cannot use the daily game words; nice try, though");
            return
        }

        // Don't create a game if there is no path to a solution with the selected words.
        const solution = Solver.fastSolve(this.dict, startWord, targetWord);
        if (!solution.success()) {
            this.showToast(GameTileDisplay.NO_SOLUTION);
            return;
        }

        // Just for fun, a little snark.
        if (solution.numSteps() === 1) {
            this.showToast("Solved; a bit of a hollow victory, though");
        }

        this.newGameButton.style.display = "block";
        this.practiceGame = new Game("PracticeGame", this.dict, solution, this.typeSavingMode);
        this.updateGameDisplay(this.practiceGame);
    }

    /*
    ** ===============
    ** UTILITY METHODS
    ** ===============
    */

    // Check whether a start/target word has been entered and is valid.
    checkWord(word, descriptor) {
        word = word.trim().toLowerCase();
        if (word.length === 0 || word[0] === PracticeTileDisplay.PLACEHOLDER) {
            return `${descriptor} word has not been entered`;
        }
        if (!this.dict.isWord(word)) {
            return `${descriptor} word '${word}' is not in the dictionary`;
        }

        return null;
    }

    // Create and display today's daily game.
    constructDailyGame() {

        // Get today's daily game; we'll use it to determine whether it is time
        // to create a new game.
        const todaysDaily = new DailyGame();

        if (! todaysDaily.isValidGame()) {
            // No daily game? Something went awry; use the backup.
            this.showToast("Unable to create daily game;<br>here is a fun back-up");
            this.dailyGame = this.backupDailyGame;
        } else {
            // If we've never saved a daily game number in the cookies or
            // the number we saved isn't today's game number, set things up
            // for a new daily game.
            if ((! this.dailyGameNumber) || (this.dailyGameNumber != todaysDaily.getNumber())) {
                // New daily game! Save the number and some other data in our object and cookies.
                this.dailyGameNumber = todaysDaily.getNumber();
                this.dailyGameEnded  = false;
                Cookie.set("DailyGameNumber", this.dailyGameNumber);
                Cookie.set("DailyGameEnded", this.dailyGameEnded);
                this.incrementStat("gamesPlayed");
                if (this.hardMode) {
                    this.incrementStat("gamesPlayedHardMode");
                }

                // Create a solution from today's daily game start/target words.
                // No need to check solution for success -- daily games will be
                // pre-verified to have a solution.
                const solution = Solver.fastSolve(this.dict, todaysDaily.getStart(), todaysDaily.getTarget());
                this.dailyGame = new Game("DailyGame", this.dict, solution, this.typeSavingMode);
            } else {
                // Existing daily game; reconstruct it from the cookie (which we've saved
                // as this.dailyGameWords).
                this.dailyGame = this.constructGameFromCookieWords("DailyGame", this.dailyGameWords);
            }
        }

        // Save the start/target words so we can prevent the user from creating
        // a practice game using these words.
        this.dailyStartWord = this.dailyGame.getStart();
        this.dailyTargetWord = this.dailyGame.getTarget();

        /*
        if (this.dailyGameWords) {
            this.dailyGame = this.constructGameFromCookieWords("DailyGame", this.dailyGameWords);
        } else {
            // TEMPORARY
            let startWord = "cat";
            let targetWord = "dog";
            this.incrementStat("gamesPlayed");
            if (this.hardMode) {
                this.incrementStat("gamesPlayedHardMode");
            }

            const solution = Solver.fastSolve(this.dict, startWord, targetWord);
            this.dailyGame = new Game("DailyGame", this.dict, solution);
            this.dailyGameEnded = false;
            Cookie.set("DailyGameEnded", this.dailyGameEnded);
        }
        */

        // Now use the daily game to construct the tile display.
        this.gameTileDisplay = new GameTileDisplay(this.dailyGame, this.dict, this.gameWordsDiv, this);

        // Hard and Type-Saving modes are implemented in the game tile display,
        // so tell it what our modes are.
        this.gameTileDisplay.setHardMode(this.hardMode);
        this.gameTileDisplay.setTypeSavingMode(this.typeSavingMode);

        // Now, pretend the user clicked the Daily button, because we need
        // to do exactly the same thing.
        this.dailyCallback();
    }

    constructGameFromCookieWords(name, words) {
        // Make a copy of the array of words because we will modify it.
        words = [...words];

        // The cookie words are the start word, the words played so far, and
        // the target word. Pick off the start and target words and create a solution.
        const startWord = words.shift();
        const targetWord = words.pop();
        const solution = Solver.fastSolve(this.dict, startWord, targetWord);

        // Use the solution to create a new game.
        let game = new Game(name, this.dict, solution, this.typeSavingMode);

        // The words remaining in the list are the words that the user played;
        // play the game with them. No need to check the result because we only
        // save in-progress games with good words to the cookies.
        for (let word of words) {
            game.playWord(word);
        }

        if (name === "DailyGame" && game.isSolved() && !this.dailyGameEnded) {
            // Save the share graphic, but not stats; stats were already saved when the game completed.
            this.saveGameInfo(game, false);
        }

        return game
    }

    constructPracticeGame() {
        if (this.practiceGameWords) {
            this.practiceGame = this.constructGameFromCookieWords("PracticeGame", this.practiceGameWords);
        }
    }

    // This is a common method for creating the elements that are part of all Auxiliary screens.
    createAuxiliaryDiv(divId) {
        // This div is the one we style as none or flex to hide/show the div (always none at first).
        // It will be centered in its parent div because of how root-div is styled.
        const outerDiv = ElementUtilities.addElementTo("div", this.rootDiv, {id: divId, class: "auxiliary-div"});
        outerDiv.style.display = "none";

        // This div will be centered within its parent div (because of how auxiliary-div is styled).
        const containerDiv = ElementUtilities.addElementTo("div", outerDiv, {class: "auxiliary-container-div"});

        // This div will be centered in its parent div because of how auxiliary-container-div is
        // styled, but its content (the button) will be right-justified in this div because of the
        // styling of close-button-div..
        const buttonDiv = ElementUtilities.addElementTo("div", containerDiv, {class: "close-button-div",});
        this.createSvgButton(buttonDiv, "close-button", closeAuxiliaryCallback, AppDisplay.CLOSE_PATH, divId);

        // Add a break so that the content appears below the close button.
        ElementUtilities.addElementTo("div", containerDiv, {class: "break"});

        return [outerDiv, containerDiv];
    }

    // This is a common method for creating a button that has an SVG image
    // (as opposed to just text).
    createSvgButton(buttonContainer, buttonClass, buttonCallback, svgPath, relatedDiv="") {
        // First, create the button element itself and add a callback for it.
        // On this and the elements created below we add an attribute "data-related-div"
        // which, when given, is the ID of the div that this button relates to.
        // This allows us to have common callbacks for opening and closing auxiliary
        // screens, for example.
        const button = ElementUtilities.addElementTo("button", buttonContainer,
            {class: buttonClass, "data-related-div": relatedDiv});
        ElementUtilities.setButtonCallback(button, buttonCallback);

        // Now, the create the svg element.
        // TODO: Should make the width controllable.
        const svg = ElementUtilities.addElementTo("svg", button,
            {viewBox: "0 0 24 24", style: "width: 24; height: 24;", stroke: "None", "data-related-div": relatedDiv});

        // Finally, add the path, whose "d" attribute is passed to us
        // using the big, ugly class constants.
        const path = ElementUtilities.addElementTo("path", svg, {d: svgPath, "data-related-div": relatedDiv});
    }

    // Set the settings flags and other instance variables from the cookie values.
    // If the values were never set, Cookie.get() will return null and the the value
    // will be initialized. Flags will be initialized to false.
    getCookies() {
        this.darkTheme      = Cookie.get("darkTheme") === "true";
        this.colorblindMode = Cookie.get("colorblindMode") === "true";
        this.hardMode       = Cookie.get("hardMode") === "true";
        this.typeSavingMode = Cookie.get("typeSavingMode") === "true";

        // Now set the colors based on darkTheme and colorblindMode.
        this.setColors();

        // The starting word, played words, and target words.
        const dailyGameWords = Cookie.get("DailyGame");
        if (dailyGameWords) {
            this.dailyGameWords = JSON.parse(dailyGameWords);
        } else {
            this.dailyGameWords = null;
        }

        // This keeps track of whether the user clicked the Show Solution button
        // for the daily game.
        this.dailyGameEnded = Cookie.get("DailyGameEnded") === "true";

        // This keeps track of the most recently played daily game number.
        this.dailyGameNumber = Cookie.get("DailyGameNumber");

        // The starting word, played words, and target words.
        const practiceGameWords = Cookie.get("PracticeGame");
        if (practiceGameWords) {
            this.practiceGameWords = JSON.parse(practiceGameWords);
        } else {
            this.practiceGameWords = null;
        }

        // These timestamps are used to ensure the user doesn't play more than
        // the maximum number of timestamps per day.
        const practiceGameTimestamps = Cookie.get("PracticeGameTimestamps");
        if (practiceGameTimestamps) {
            this.practiceGameTimestamps = JSON.parse(practiceGameTimestamps);
        } else {
            this.practiceGameTimestamps = [];
        }

        // If we have a cookie for daily stats parse it, otherwise construct initial stats
        // and save them to the cookies.
        const dailyStats = Cookie.get("DailyStats");
        if (dailyStats) {
            this.dailyStats = JSON.parse(dailyStats);
        } else {
            this.dailyStats = {};
            this.dailyStats.gamesPlayed         = 0;
            this.dailyStats.gamesPlayedHardMode = 0;
            this.dailyStats.gamesCompleted      = 0;
            this.dailyStats.gamesShown          = 0;
            this.dailyStats.tooManyExtraSteps   = 0;
            for (let extraSteps = 0; extraSteps < AppDisplay.TOO_MANY_EXTRA_STEPS; extraSteps++) {
                this.dailyStats[extraSteps] = 0;
            }

            Cookie.set("DailyStats", JSON.stringify(this.dailyStats));
        }
    }

    // Return the given CSS property value.
    static getCssProperty(property) {
        return getComputedStyle(document.documentElement).getPropertyValue(`--${property}`);
    }

    // Hide shown divs while showing an auxiliary screen (Help, Settings, Stats).
    // Keep track of what divs were showing so they can be restored.
    hideShownDivs() {
        // To be saved for restoreHiddenDivs() to use.
        this.activeDivs = [];

        // Go through all the primary divs that were added to the list
        // during display creation.
        for (let div of this.primaryDivs) {
            const divStyle = div.getAttribute("style");
            // If the "style" attribute does NOT have "none" in it,
            // then it is showing; save it.
            if (! divStyle.includes("none")) {
                this.activeDivs.push(div);

                // Set the attribute "data-save-style" on the div, which will be
                // used to restore the div.
                div.setAttribute("data-save-style", divStyle);

                // And hide it.
                div.setAttribute("style", "display: none;");
            }
        }
    }

    // Increment the given stat, update the stats cookie, and update the stats display content.
    incrementStat(whichStat) {
        this.dailyStats[whichStat] += 1;
        Cookie.set("DailyStats", JSON.stringify(this.dailyStats));
        this.updateStatsContent();
    }

    // Return true if we are playing a game (i.e. if practice-div,
    // used for game setup, is hidden).
    playingGame() {
        return ElementUtilities.isHidden(this.practiceDiv)
    }

    // Restore divs hidden with hideShownDivs().
    restoreHiddenDivs() {
        for (let div of this.activeDivs) {
            // Get the attribute that we saved so we know what style
            // to put on the div.
            const divStyle = div.getAttribute("data-save-style");

            // If restoring solution-div, update the colors affected  by settings
            // and update the game display to make those changes take effect.
            if (div.getAttribute("id") == "solution-div") {
                this.setColors();
                this.updateGameDisplay();
            }

            // Now set the attribute, which will show the div.
            div.setAttribute("style", divStyle);
        }
    }

    // Save a share graphic and (optionally) update statistics for thie specified game.
    // Note that the share graphic is not HTML, but rather just a string, containing
    // some Unicode characters to construct the graphic. The user will not be able
    // to share unless the game is complete, so here we'll use the known solution.
    saveGameInfo(game, updateStats) {
        // Get the game's solution, and number of words.
        // the known solution includes the start word, but not the target word;
        // the number of steps is the length of the list.
        const userSolution = game.getKnownSolution();
        const userSolutionSteps = userSolution.numSteps();
        const userWords = userSolution.getWords();

        // The words from the solution include the start and target words;
        userWords.shift();
        userWords.pop();

        // The count history is a list of how many steps were required to  solve the
        // game at the very beginning ("the best solution") and then for each step
        // thereafter. Pop off the first number in the history and save that as the
        // minimum solution length.
        const countHistory = game.getCountHistory();
        const minimumSolutionSteps = countHistory.shift();

        if (updateStats) {
            this.incrementStat("gamesCompleted");
        }

        let shareString = `WordChain #${this.dailyGameNumber} `;

        // Determine what emoji to use to show the user's "score".
        const extraSteps = userSolutionSteps - minimumSolutionSteps;
        if (extraSteps >= AppDisplay.TOO_MANY_EXTRA_STEPS) {
            // Too many extra steps.
            shareString += AppDisplay.CONFOUNDED;
            if (updateStats) {
                this.incrementStat("tooManyExtraSteps");
            }
        } else {
            // Show the emoji in NUMBERS corresponding to how many extra steps.
            // A bit of a misnomer, but the value for 0 is a star.
            shareString += AppDisplay.NUMBERS[extraSteps];
            if (updateStats) {
                this.incrementStat(extraSteps);
            }
        }

        // Add special indicator if user played in hard mode, and a couple of newlines.
        const hardModeIndicator = this.hardMode ? AppDisplay.FIRE : "";
        shareString += ` ${hardModeIndicator}\n\n`;

        // Now, construct the graphic showing the lengths of the user's
        // played words, colored red or green to indicate whether that word
        // did or did not increase the solution length.
        let previousCount = minimumSolutionSteps;
        for (let word of userWords) {
            // Shift off the next count, which corresponds to the word that the user played.
            let nextCount = countHistory.shift();

            // Determine which color square to display for this word.
            let emoji;
            if (nextCount <= previousCount) {
                // Word didn't increase the count; pick color indicating "good".
                emoji = this.colorblindMode ? AppDisplay.BLUE_SQUARE : AppDisplay.GREEN_SQUARE;
            } else {
                // Word increased the count; pick color indicating "bad".
                emoji = this.colorblindMode ? AppDisplay.ORANGE_SQUARE : AppDisplay.RED_SQUARE;
            }

            // Now repeat that emoji for the length of the word and add a newline,
            // creating a row that looks like the row of tiles in the game.
            shareString += emoji.repeat(word.length) + "\n";

            // Set up for the next iteration.
            previousCount = nextCount;
        }

        this.shareString = shareString;
    }

    // Set the given CSS property to the specified value.
    static setCssProperty(property, value) {
        document.documentElement.style.setProperty(`--${property}`, value);
    }

    // Set color properties according to the Dark Theme and Colorblind Mode settings.
    setColors() {
        // Change the document class name to switch the colors in general.
        if (this.darkTheme) {
            document.documentElement.className = "dark-mode";
        } else {
            document.documentElement.className = "light-mode";
        }

        // The properties with "dark" and "light" in the name are globallydefined in the
        // CSS file, and the "properties affected by Colorblind Mode" are set in that file
        // using those global properties.
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
            AppDisplay.setCssProperty("played-word-same-bg",   colorblindGood);
            AppDisplay.setCssProperty("played-word-longer-bg", colorblindBad);
            AppDisplay.setCssProperty("invalid-word-letter-fg", colorblindBad);

        } else {
            // Colorblind Mode is not checked: restore the affected properties based on whether
            // Dark Mode is set.
            if (this.darkTheme) {
                AppDisplay.setCssProperty("played-word-same-bg",    AppDisplay.getCssProperty("played-word-same-bg-dark"));
                AppDisplay.setCssProperty("played-word-longer-bg",  AppDisplay.getCssProperty("played-word-longer-bg-dark"));
                AppDisplay.setCssProperty("invalid-word-letter-fg", AppDisplay.getCssProperty("invalid-word-letter-fg-dark"));
            } else {
                AppDisplay.setCssProperty("played-word-same-bg",    AppDisplay.getCssProperty("played-word-same-bg-light"));
                AppDisplay.setCssProperty("played-word-longer-bg",  AppDisplay.getCssProperty("played-word-longer-bg-light"));
                AppDisplay.setCssProperty("invalid-word-letter-fg", AppDisplay.getCssProperty("invalid-word-letter-fg-light"));
            }
        }
    }

    // Show a "toast" pop-up (typically an error message).
    showToast(message) {
        this.toastDiv.innerHTML = message
        ElementUtilities.editClass(/hide/, "show", this.toastDiv);
        setTimeout(() => {
            ElementUtilities.editClass(/show/, "hide", this.toastDiv);
        }, 3000);
    }

    // This is called when the user opens the Stats screen to display a
    // countdown clock until the next daily game is available.
    startCountdownClock() {
        function msToDuration(ms) {
            return new Date(ms).toISOString().substr(11, 8);
        }

        // Set the initial clock display.
        let msUntilNextGame = DailyGame.getMsUntilNextGame();
        this.countdownClock.textContent = msToDuration(msUntilNextGame);

        // Set a timer to change the clock and display every second.
        this.clockIntervalTimer = setInterval(() => {
            msUntilNextGame -= 1000;
            this.countdownClock.textContent = msToDuration(msUntilNextGame);
        }, 1000);
    }

    // This is called when the user Xes out of Stats screen.
    stopCountdownClock() {
        clearInterval(this.clockIntervalTimer);
    }

    // Update the daily/practice game screen (solution-div).
    updateGameDisplay(currentGame=null) {
        // If currentGame is given, it means we are changing the game between
        // daily and practice games, so we update instance variables accordingly.
        if (currentGame !== null) {
            this.game = currentGame;
            this.gameTileDisplay.setGame(currentGame);
        }

        // Delete the children in both "tile/word divs" because the same IDs
        // are used for tile/letter elements across these two divs.
        // Element IDs MUST be unique or else undefined behavior occurs -- we use
        // the ID to find the element, and if there are two elements with the
        // same ID it is undefined which one will be acted upon.
        // New tiles will be created in showSteps().
        ElementUtilities.deleteChildren(this.practiceWordsDiv);
        ElementUtilities.deleteChildren(this.gameWordsDiv);

        // Show current state of the game in all its glory.
        this.gameTileDisplay.showSteps();

        // Determine whether to show the keyboard based on whether
        // the game has been solved.
        if (this.game.isSolved()) {
            this.keyboardDiv.style.display = "none";
            this.showSolutionButton.style.display = "none";
        } else {
            this.keyboardDiv.style.display = "flex";
            this.showSolutionButton.style.display = "block";
        }

        // Show solution div and hide practice div.
        this.solutionDiv.style.display = "flex";
        this.practiceDiv.style.display = "none";

        // Get height of keyboard-inner-div and use it to set height of keyboard-div.
        // This takes care of a really irritating problem with Safari on iOS, in which
        // keyboard-div is sized with extra space at the top that occludes the game
        // buttons unnecessarily (i.e. when there is plenty of room for them except
        // for the extra size of keyboard-div).
        const innerDivHeight = this.keyboardInnerDiv.offsetHeight;
        this.keyboardDiv.style.height = `${innerDivHeight}px`

        if (this.game.getName() === "DailyGame") {
            // If daily game has been solved (and the Show Solution button
            // wasn't used), show share button.
            if (this.game.isSolved() && !this.dailyGameEnded) {
                this.shareButton.style.display = "block";
            } else {
                this.shareButton.style.display = "none";
            }
        } else if (this.game.getName() !== "BackupDailyGame") {
            // Show New Game button if playing practice game, but not share button.
            this.newGameButton.style.display = "block";
            this.shareButton.style.display = "none";
        }

        if (this.gameTileDisplay.getNumFilledWords() <= 2) {
            // Scroll to top of page to show beginning of game.
            window.scrollTo(0, 0);
        } else {
            // Scroll to the bottom of the page so we show where the play occurs.
            window.scrollTo(0, document.body.scrollHeight);
        }
    }

    // Update the practice game word selection screen (practice-div).
    updatePracticeDisplay() {
        // Delete the children in both "tile/word divs" because the same IDs
        // are used for tile/letter elements across these two divs.
        // Element IDs MUST be unique or else undefined behavior occurs -- we use
        // the ID to find the element, and if there are two elements with the
        // same ID it is undefined which one will be acted upon.
        // New tiles will be created in showPracticeWords().
        ElementUtilities.deleteChildren(this.practiceWordsDiv);
        ElementUtilities.deleteChildren(this.gameWordsDiv);

        // Show the current state of practice game word selection.
        this.practiceTileDisplay.showPracticeWords();

        // Keyboard is always shown in the practice display.
        this.keyboardDiv.style.display = "flex";

        // Hide solution div and show practice div.
        this.solutionDiv.style.display = "none";
        this.practiceDiv.style.display = "flex";

        // Scroll to top of page.
        window.scrollTo(0, 0);
    }

    // Update the statistics and distribution graph.
    updateStatsContent() {
        // Clear out the containers that we're about to add to.
        ElementUtilities.deleteChildren(this.statsContainer);
        ElementUtilities.deleteChildren(this.statsDistribution);

        let oneStat;

        // Local function to add a stat.
        function addStat(value, label, parentDiv) {
            oneStat = ElementUtilities.addElementTo("div", parentDiv, {class: "one-stat"});
            ElementUtilities.addElementTo("div", oneStat, {class: "one-stat-value"}, value);
            ElementUtilities.addElementTo("div", oneStat, {class: "one-stat-label"}, label);
        }

        // Calculate percentage stats.
        const completionPercent = ((this.dailyStats.gamesCompleted / this.dailyStats.gamesPlayed) * 100).toFixed(1);
        const hardModePercent   = ((this.dailyStats.gamesPlayedHardMode / this.dailyStats.gamesPlayed) * 100).toFixed(1);

        // Add the stats.
        addStat(this.dailyStats.gamesPlayed, "Played", this.statsContainer);
        addStat(completionPercent, "Completion %", this.statsContainer);
        addStat(hardModePercent, "Hard Mode %", this.statsContainer);
        addStat(this.dailyStats.gamesShown, "Shown", this.statsContainer);

        // Determine the maximum value among all the "extra step values".
        let maxValue = 0;
        for (let extraSteps = 0; extraSteps < AppDisplay.TOO_MANY_EXTRA_STEPS; extraSteps++) {
            if (this.dailyStats[extraSteps] > maxValue) {
                maxValue = this.dailyStats[extraSteps];
            }
        }
        if (this.dailyStats.tooManyExtraSteps > maxValue) {
            maxValue = this.dailyStats.tooManyExtraSteps;
        }

        // Local function to add a bar.
        function addBar(barValue, barLabel, parentDiv) {

            // Calculate the width of the bar as a percentage of the maximum value determined above.
            // If width calculates to 0, set it to 5 so there's a bar to contain the value.
            let width = Math.round((barValue / maxValue) * 100);
            if (width === 0) {
                width = 10;
            }

            // Add a div for this bar.
            const oneBar = ElementUtilities.addElementTo("div", parentDiv, {class: "one-bar"});

            // Add a div for the "label" -- the emoji for the this bar -- and the bar itself.
            ElementUtilities.addElementTo("div", oneBar, {class: "one-bar-label"}, barLabel);
            const bar = ElementUtilities.addElementTo("div", oneBar, {class: "one-bar-bar", style: `width: ${width}%;`});

            // Add a div to the bar for its value.
            ElementUtilities.addElementTo("div", bar, {class: "one-bar-value"}, barValue);
        }

        // Add a bar for each of the "regular" values; the emojis for these are in AppDisplay.NUMBERS.
        for (let extraSteps = 0; extraSteps < AppDisplay.TOO_MANY_EXTRA_STEPS; extraSteps++) {
            const barValue = this.dailyStats[extraSteps];
            addBar(barValue, AppDisplay.NUMBERS[extraSteps], this.statsDistribution);
        }

        // Add a bar for too many extra steps.
        addBar(this.dailyStats.tooManyExtraSteps, AppDisplay.CONFOUNDED, this.statsDistribution);
    }
}

export { AppDisplay };

// Create the singleton, and it all happens from there.
AppDisplay.singleton();
