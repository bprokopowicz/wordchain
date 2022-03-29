import { TileDisplay, GameTileDisplay, PracticeTileDisplay } from './TileDisplay.js';
import { BaseLogger } from './BaseLogger.js';
import { WordChainDict } from './WordChainDict.js';
import { Solver } from './Solver.js';
import { Game } from './Game.js';
import { ElementUtilities } from './ElementUtilities.js';


/*
** TODO:
** Implementation
** - Outline tiles:
**   - green if played word does not increase solution length
**   - else outline red.
**   - this can drive the share image.
** - Better handling of colors
** - Better images on ENTER/BACKSPACE keys
** - Auto-fill unchanged letters (NOT in hard mode)
** - Share graphic: mini version of tile outline/colors
**   - need to keep track of words that increase solution length in Game.
**   - call Game.getStepCount() before/after playing words; keep track in TileDisplay
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
** - Logo
*/

/*
** Forwarding functions
**
** When "this.startPracticeGameCallback" is passed, for example, as the listener on calls
** within the AppDisplay class to addEventListener(), Chrome appears to call it (but refers
** to it as HTMLButtonElement.startPracticeGameCallback, which doesn't exist!) and "this"
** within the method is of type HTMLButtonElement, so the call within to "this.checkWord()"
** resolves to HTMLButtonElement.checkword, which is is not a function. This kind of makes
** sense (except for why it  was able to call the AppDisplay.startPracticeGameCallback()
** method at all!).
**
** At that point I introduced the singleton idea. I thought that passing
** AppDisplay.singleton().startPracticeGameCallback as the listener would work, but this
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

function practiceCallback() {
    AppDisplay.singleton().practiceCallback();
}

function softKeyboardCallback() {
    // Here the "this" being the button works in our favor -- we can get
    // its data-key attribute value, which is the letter of the key that
    // was clicked.
    AppDisplay.singleton().keyboardCallback(this.getAttribute("data-key"));
}

function startNewGameCallback() {
    AppDisplay.singleton().startNewGameCallback();
}

function startPracticeGameCallback() {
    AppDisplay.singleton().startPracticeGameCallback();
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
        const button = ElementUtilities.addElementTo("button", rowElement, {'data-key': letter, class: "keyboard-key keyboard-wide-key"}, letter);
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
        this.startPracticeGameButton = ElementUtilities.addElementTo(
            "button", this.practiceButtonsDiv,
            {id: "start-game", class: "wordchain-button game-button"},
            "Start Practice Game");
        ElementUtilities.setButtonCallback(this.startPracticeGameButton, startPracticeGameCallback);

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

        // Create a div for the game play words and buttons and create a div within that to hold the tiles.
        this.gameWordsDiv = ElementUtilities.addElementTo("div", this.solutionDiv, {id: "game-words-div"});

        // Add another break
        ElementUtilities.addElementTo("div", this.solutionDiv, {class: "break"});

        // Now create a div for the buttons in this display and add the buttons.
        this.solutionButtonsDiv = ElementUtilities.addElementTo("div", this.solutionDiv, {id: "solution-buttons-div"});

        ElementUtilities.addElementTo("div", this.solutionButtonsDiv, {class: "break"});
        this.startNewGameButton = ElementUtilities.addElementTo(
            "button", this.solutionButtonsDiv,
            {id: "start-new-game", class: "wordchain-button game-button"},
            "Start New Game");
        ElementUtilities.setButtonCallback(this.startNewGameButton, startNewGameCallback);

        // Since we start with a daily game, of which there is only one per day,
        // we set it's style.display to be "none" so it does not show; it will be
        // changed when a practice game is shown.
        this.startNewGameButton.style.display = "none";

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
        this.practiceTileDisplay.showPracticeWordTiles();
    }

    // Callback for the Daily header button.
    dailyCallback() {
        // Make Daily button active, and Practice inactive.
        ElementUtilities.editClass(/not-active/, "active-button", this.dailyGameButton);
        ElementUtilities.editClass(/active-button/, "not-active", this.practiceGameButton);

        // Don't display the Start New Game button.
        this.startNewGameButton.style.display = "none";

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

    // If practice div is hidden we are playing a game.
    playingGame() {
        return ElementUtilities.isHidden(this.practiceDiv)
    }

    // This is the callback for the Practice header button.
    // It is also called in startNewGameCallback().
    practiceCallback() {
        ElementUtilities.editClass(/not-active/, "active-button", this.practiceGameButton);
        ElementUtilities.editClass(/active-button/, "not-active", this.dailyGameButton);

        // If we have an ongoing practice game update the display, passing this.practiceGame
        // so that the current game is updated.
        if (this.practiceGame !== null) {
            // Display the Start New Game button.
            this.updateGameDisplay(this.practiceGame);

        // Otherwise, show the practice word selection tiles and ensure the right divs are showing.
        } else {
            // Delete the children in the solutionDiv, so the id attributes
            // of the practice word tiles won't be the same as those of the game tiles.
            // Element IDs must be unique or else undefined behavior occurs -- we use
            // the ID to find the element, and if there are two it is undefined which
            // one will be acted upon.
            ElementUtilities.deleteChildren(this.gameWordsDiv);

            this.practiceTileDisplay.showPracticeWordTiles();
            this.solutionDiv.style.display = "none";
            this.keyboardDiv.style.display = "block";
            this.practiceDiv.style.display = "flex";
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
            this.practiceTileDisplay.showPracticeWordTiles();
        } else if (ElementUtilities.isLetter(keyValue)) {
            this.practiceTileDisplay.keyPressLetter(keyValue);
        }
        // No other keys cause a change.
    }

    // Callback for the Show Solution button
    showSolutionCallback() {
        this.gameTileDisplay.endGame();
        this.updateGameDisplay()
    }

    // Callback for the Start New Game button that appears when playing a practice
    // game, along side the Show Solution button.
    startNewGameCallback() {
        // Set practiceGame to null so practiceCallback() knows to get new start/target words.
        this.practiceGame = null;

        // Reset the start/end words so the display will be blank again.
        this.practiceTileDisplay.resetWords();

        // The rest is the same as clicking the Practice header button.
        this.practiceCallback();
    }

    // Callback for the Start Practice Game button in the practice game setup screen.
    startPracticeGameCallback() {
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
            this.showToast(TileDisplay.NO_SOLUTION);
            return;
        }

        // Just for fun, a little snark.
        if (solution.isSolved) {
            this.showToast("Solved (a bit of a hollow victory, though)");
        }

        // Delete the children in the practiceWordsDiv, so the id attributes
        // of the game tiles won't be the same as those of the practice tiles.
        // Element IDs must be unique or else undefined behavior occurs -- we use
        // the ID to find the element, and if there are two it is undefined which
        // one will be acted upon.
        ElementUtilities.deleteChildren(this.practiceWordsDiv);

        this.startNewGameButton.style.display = "block";
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

        this.gameTileDisplay.showSteps();
        
        // Determine whether to show the keyboard based on whether
        // the game has been solved.
        if (this.game.isSolved()) {
            this.keyboardDiv.style.display = "none";
        } else {
            this.keyboardDiv.style.display = "block";
        }

        // Show Start New Game button if playing practice game.
        if (this.game !== this.dailyGame) {
            this.startNewGameButton.style.display = "block";
        }

        this.solutionDiv.style.display = "flex";
        this.practiceDiv.style.display = "none";
    }
}

export { AppDisplay };

AppDisplay.singleton().displayGame();
