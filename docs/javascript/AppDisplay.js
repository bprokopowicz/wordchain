import { TileDisplay, GameTileDisplay, PracticeTileDisplay } from './TileDisplay.js';
import { BaseLogger } from './BaseLogger.js';
import { WordChainDict } from './WordChainDict.js';
import { Solver } from './Solver.js';
import { Game } from './Game.js';
import { ElementUtilities } from './ElementUtilities.js';


/*
** TODO:
** Implementation
** - Auto-fill unchanged letters (NOT in hard mode)
** - Share graphic: mini version of tile outline/colors
** - What is the "score" of the game?
**   - Hard mode ... extra X points?
**   - No score? Just indicate hard in the share graphic?
**
** Before Sharing with Initial Friends
** - Help screen
** - Fix dictionary loading - deterministic; remove setTimeout()
** - At least a temporary way to have different daily games for 30 days or so
**
** Deployment
** - How to display/keep track of stats? (Learn about cookies.)
** - How to create/minify one big js file
** - Buy domain wordchain.com?
** - Where to host?
** - How to manage daily game words?
**   - Maybe add a section to Test.js to generate potential daily games
**   - Possible criteria:
**     - Start/target word length 3-5
**     - Solution #steps 5-6
**     - Words change length >= 2 times
** - Testing on various browsers/devices
** - Settings menu
**   - Dark mode
**   - Colorblind mode
**   - Hard mode
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

function clearLettersCallback() {
    AppDisplay.singleton().clearLettersCallback();
}

function dailyCallback() {
    AppDisplay.singleton().dailyCallback();
}

function showSolutionCallback() {
    AppDisplay.singleton().showSolutionCallback();
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

function newGameCallback() {
    AppDisplay.singleton().newGameCallback();
}

function practiceCallback() {
    AppDisplay.singleton().practiceCallback();
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


// Singleton class AppDisplay.

class AppDisplay extends BaseLogger {
    static singletonObject = null;

    // Constants for create*Div() methods.
    static HIDDEN = true;
    static SHOWN  = false;

    // Constants for keyboard action buttons.
    static BACKSPACE = "←";
    static ENTER = "↵";

    // SVG paths for keyboard keys.
    static BACKSPACE_PATH = "M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H7.07L2.4 12l4.66-7H22v14zm-11.59-2L14 13.41 17.59 17 19 15.59 15.41 12 19 8.41 17.59 7 14 10.59 10.41 7 9 8.41 12.59 12 9 15.59z";
    static ENTER_PATH = "M19 7v4H5.83l3.58-3.59L8 6l-6 6 6 6 1.41-1.41L5.83 13H21V7h-2z";

    // SVG paths for icons.
    static HELP_PATH = "M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z";
    static MENU_PATH = "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z";
    static SETTINGS_PATH = "M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z";
    static STATS_PATH = "M16,11V3H8v6H2v12h20V11H16z M10,5h4v14h-4V5z M4,11h4v8H4V11z M20,19h-4v-6h4V19z";

    constructor() {
        super();

        this.dict = new WordChainDict();

        this.dailyGame    = null;
        this.practiceGame = null;

        // this.game will be set to whichever game is current.
        this.game = null;

        this.rootDiv     = null;
        this.headerDiv   = null;
        this.practiceDiv = null;
        this.solutionDiv = null;
        this.keyboardDiv = null;

        this.keyboardButtons = [];

        this.gameTileDisplay     = null;
        this.practiceTileDisplay = null;
    }

    static singleton() {
        if (AppDisplay.singletonObject === null) {
            AppDisplay.singletonObject = new AppDisplay();
        }
        return AppDisplay.singletonObject;
    }

    /*
    ** METHODS TO CONSTRUCT THE DISPLAY
    */

    // This is the entry point for displaying the game.
    displayGame() {
        this.rootDiv = ElementUtilities.addElementTo("div", document.body, {id: "root-div"});
        this.createHeaderDiv();
        this.createToastDiv();

        this.outerDiv = ElementUtilities.addElementTo("div", this.rootDiv, {id: "outer-div"});
        this.createPracticeDiv(AppDisplay.HIDDEN);
        this.createSolutionDiv(AppDisplay.SHOWN);
        this.createKeyboardDiv(AppDisplay.SHOWN);

        window.addEventListener("keydown", hardKeyboardCallback);

        this.constructDailyGame();
    }

    /* ----- Toast Notifications ----- */

    createToastDiv() {
        this.toastDiv = ElementUtilities.addElementTo("div", this.rootDiv, {id: "toast-div", class: "toast hide"});
    }

    /* ----- Header ----- */

    createHeaderDiv() {
        this.headerDiv = ElementUtilities.addElementTo("div", this.rootDiv, {id: "header-div"});

        const titleDiv = ElementUtilities.addElementTo("div", this.headerDiv, {id: "title-div"});

        ElementUtilities.addElementTo("label", titleDiv, {class: "title"}, "WordChain");

        this.dailyGameButton = ElementUtilities.addElementTo(
            "button", titleDiv,
            {id: "daily-game", class: "wordchain-button header-button active-button"},
            "Daily");
        ElementUtilities.setButtonCallback(this.dailyGameButton, dailyCallback);

        this.practiceGameButton = ElementUtilities.addElementTo(
            "button", titleDiv,
            {id: "practice-game", class: "wordchain-button header-button not-active"},
            "Practice");
        ElementUtilities.setButtonCallback(this.practiceGameButton, practiceCallback);
    }

    /* ----- Keyboard ----- */

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

    addLetterButton(rowElement, letter) {
        const button = ElementUtilities.addElementTo("button", rowElement, {'data-key': letter, class: "keyboard-key"}, letter);
        this.keyboardButtons.push(button);
    }

    addSpacer(rowElement) {
        ElementUtilities.addElementTo("div", rowElement, {class: "keyboard-key keyboard-spacer"});
    }

    createKeyboardDiv(hidden) {
        this.keyboardDiv = ElementUtilities.addElementTo("div", this.outerDiv, {id: "keyboard-div"}, null);
        if (hidden) {
            this.keyboardDiv.style.display = "none";
        }

        ElementUtilities.addElementTo("p", this.keyboardDiv);

        const row1 = ElementUtilities.addElementTo("div", this.keyboardDiv, {class: "keyboard-row"});
        const row2 = ElementUtilities.addElementTo("div", this.keyboardDiv, {class: "keyboard-row"});
        const row3 = ElementUtilities.addElementTo("div", this.keyboardDiv, {class: "keyboard-row"});

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

    /* ----- Practice Game Setup ----- */

    createPracticeDiv(hidden) {
        this.practiceDiv = ElementUtilities.addElementTo("div", this.outerDiv, {id: "practice-div"});
        if (hidden) {
            this.practiceDiv.style.display = "none";
        }

        const helpText = `Words can be up to ${PracticeTileDisplay.MAX_WORD_LENGTH} letters. Press the Return key to enter a word.`
        ElementUtilities.addElementTo("label", this.practiceDiv, {class: "help-info"}, helpText);
        // The div with class "break" forces whatever comes after this div
        // to be on a "new line" with display: flex, which we use for this div.
        // See: https://tobiasahlin.com/blog/flexbox-break-to-new-row/
        ElementUtilities.addElementTo("div", this.practiceDiv, {class: "break"});

        // Create a div for selecting practice game start/target words, and create
        // a div within that to hold the tiles.
        this.practiceWordsDiv = ElementUtilities.addElementTo("div", this.practiceDiv, {id: "practice-words-div"});
        this.practiceTileDisplay = new PracticeTileDisplay(this.dict, this.practiceWordsDiv);
        this.practiceTileDisplay.resetWords();

        // Add another break
        ElementUtilities.addElementTo("div", this.practiceDiv, {class: "break"});

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

    createSolutionDiv(hidden) {
        this.solutionDiv = ElementUtilities.addElementTo("div", this.outerDiv, {id: "solution-div"}, null);
        if (hidden) {
            this.solutionDiv.style.display = "none";
        }

        // The div with class "break" forces whatever comes after this div
        // to be on a "new line" with display: flex, which we use for this div.
        // See: https://tobiasahlin.com/blog/flexbox-break-to-new-row/
        ElementUtilities.addElementTo("div", this.outerDiv, {class: "break"});

        // Create a div for the game play words which will hold the tiles.
        this.gameWordsDiv = ElementUtilities.addElementTo("div", this.solutionDiv, {id: "game-words-div"});

        // Add another break
        ElementUtilities.addElementTo("div", this.solutionDiv, {class: "break"});

        // Now create a div for the buttons in this display and add the buttons.
        this.solutionButtonsDiv = ElementUtilities.addElementTo("div", this.solutionDiv, {id: "solution-buttons-div"});

        ElementUtilities.addElementTo("div", this.solutionButtonsDiv, {class: "break"});
        this.newGameButton = ElementUtilities.addElementTo(
            "button", this.solutionButtonsDiv,
            {id: "start-new-game", class: "wordchain-button game-button"},
            "New Game");
        ElementUtilities.setButtonCallback(this.newGameButton, newGameCallback);

        // Since we start with a daily game, of which there is only one per day,
        // we set it's style.display to be "none" so it does not show; it will be
        // changed when a practice game is shown.
        this.newGameButton.style.display = "none";

        // The default is to show this button, which we want for both daily and practice games;
        // users should be able to display the solution for either.
        this.showSolutionButton = ElementUtilities.addElementTo(
            "button", this.solutionButtonsDiv,
            {id: "show-solution", class: "wordchain-button game-button"},
            "Show Solution");
        ElementUtilities.setButtonCallback(this.showSolutionButton, showSolutionCallback);
    }

    /*
    ** BUTTON CALLBACKS
    */

    // Callback for the Clear Letters button in the practice game setup screen.
    clearLettersCallback() {
        const startWord  = this.practiceTileDisplay.getStartWord();
        const targetWord = this.practiceTileDisplay.getTargetWord();

        // If the target word is already empty reset the start word;
        // otherwise reset the target word.
        if (targetWord[0] === PracticeTileDisplay.PLACEHOLDER) {
            this.practiceTileDisplay.resetWords(PracticeTileDisplay.RESET_START);
        } else {
            this.practiceTileDisplay.resetWords(PracticeTileDisplay.RESET_TARGET);
        }
        this.updatePracticeDisplay();
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

    // Global keyboard callback; calls specific game/practice callback
    // based on whether the practis div is hidden.
    keyboardCallback(keyValue) {
        if (this.playingGame()) {
            this.gameKeyboardCallback(keyValue);
        } else {
            this.practiceKeyboardCallback(keyValue);
        }
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
                }, 50);
            }
        } else if (ElementUtilities.isLetter(keyValue)) {
            this.gameTileDisplay.keyPressLetter(keyValue);
        }
        // No other keys cause a change.
    }

    // Callback for the New Game button that appears when playing a practice
    // game, along side the Show Solution button.
    newGameCallback() {
        // Set practiceGame to null so practiceCallback() knows to get new start/target words.
        this.practiceGame = null;

        // Reset the start/end words so the display will be blank again.
        this.practiceTileDisplay.resetWords();

        // The rest is the same as clicking the Practice header button.
        this.practiceCallback();
    }

    // If practice div is hidden we are playing a game.
    playingGame() {
        return ElementUtilities.isHidden(this.practiceDiv)
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

    // Callback for the Show Solution button that appears for both daily and practice games.
    showSolutionCallback() {
        this.gameTileDisplay.endGame();
        this.updateGameDisplay()
    }

    // Callback for the Start Game button in the practice game setup screen.
    startGameCallback() {
        const startWord  = this.practiceTileDisplay.getStartWord();
        const targetWord = this.practiceTileDisplay.getTargetWord();
        let result;

        // Validate that the user's start/target words have actually been entered
        // and are in the dictionary.
        result = this.checkWord(startWord, "Start");
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
        this.practiceGame = new Game(this.dict, solution);
        this.updateGameDisplay(this.practiceGame);
    }

    /*
    ** UTILITIES
    */

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

    constructDailyGame() {
        // TEMPORARY
        const startWord = "cat";
        const targetWord = "dog";

        // TODO: Takes a while for dictionary to load ... not sure what we have doesn't wait.
        // 100 ms not enough; 200 ms does the trick. Note: still being served from github.
        setTimeout(() => {
            // No need to check solution for success -- daily games will be
            // pre-verified to have a solution.
            const solution = Solver.fastSolve(this.dict, startWord, targetWord);

            this.dailyGame = new Game(this.dict, solution);
            this.gameTileDisplay = new GameTileDisplay(this.dailyGame, this.dict, this.gameWordsDiv);

            this.dailyCallback();
        }, 200);
    }

    showToast(message) {
        this.toastDiv.innerHTML = message
        ElementUtilities.editClass(/hide/, "show", this.toastDiv);
        setTimeout(() => {
            ElementUtilities.editClass(/show/, "hide", this.toastDiv);
        }, 3000);
    }

    updateGameDisplay(currentGame=null) {
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

        this.gameTileDisplay.showSteps();

        // Determine whether to show the keyboard based on whether
        // the game has been solved.
        if (this.game.isSolved()) {
            this.keyboardDiv.style.display = "none";
        } else {
            this.keyboardDiv.style.display = "block";
        }

        // Show New Game button if playing practice game.
        if (this.game !== this.dailyGame) {
            this.newGameButton.style.display = "block";
        }

        // Show solution div and hide practice div.
        this.solutionDiv.style.display = "flex";
        this.practiceDiv.style.display = "none";
    }

    updatePracticeDisplay() {
        // Delete the children in both "tile/word divs" because the same IDs
        // are used for tile/letter elements across these two divs.
        // Element IDs MUST be unique or else undefined behavior occurs -- we use
        // the ID to find the element, and if there are two elements with the
        // same ID it is undefined which one will be acted upon.
        // New tiles will be created in showPracticeWords().
        ElementUtilities.deleteChildren(this.practiceWordsDiv);
        ElementUtilities.deleteChildren(this.gameWordsDiv);

        this.practiceTileDisplay.showPracticeWords();

        // Keyboard is always shown in the practice display.
        this.keyboardDiv.style.display = "block";

        // Hide solution div and show practice div.
        this.solutionDiv.style.display = "none";
        this.practiceDiv.style.display = "flex";
    }
}

export { AppDisplay };

AppDisplay.singleton().displayGame();
