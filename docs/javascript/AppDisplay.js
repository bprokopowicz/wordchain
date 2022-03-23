import { TileDisplay, GameTileDisplay, PracticeTileDisplay } from './TileDisplay.js';
import { BaseLogger } from './BaseLogger.js';
import { WordChainDict } from './WordChainDict.js';
import { Solver } from './Solver.js';
import { Game } from './Game.js';
import { ElementUtilities } from './ElementUtilities.js';


/*
** TODO:
** Implementation
** - Better handling of colors
** - Better images on ENTER/BACKSPACE keys
** - Auto-fill unchanged letters (NOT in hard mode)
** - Outline tiles:
**   - green if played word does not increase solution length
**   - else outline red.
**   - this can drive the share image.
** - Share graphic: mini version of tile outline/colors
**   - need to keep track of words that increase solution length in Game.
**   - call Game.getStepCount() before/after playing words; keep track in TileDisplay
** - What is the "score" of the game?
** - Hard mode ... extra X points?
**
** Deployment
** - How to display/keep track of stats? (Learn about cookies.)
** - How to create/minify one big js file
** - Buy domain wordchain.com?
** - Where to host?
** - How to manage daily game words?
** - Testing on various browsers/devices
** - Settings menu
** - Help screen
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

function endGameCallback() {
    AppDisplay.singleton().endGameCallback();
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

        this.dailyGameOver    = false;
        this.practiceGameOver = false;

        // This will be whichever game is current.
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

        this.dailyCallback();
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

        this.practiceWordsDiv = ElementUtilities.addElementTo("div", this.practiceDiv, {id: "practice-words-div"});

        // Add another break
        ElementUtilities.addElementTo("div", this.practiceDiv, {class: "break"});

        this.practiceButtonsDiv = ElementUtilities.addElementTo("div", this.practiceDiv, {id: "practice-buttons-div"});
        const startPracticeGameButton = ElementUtilities.addElementTo(
            "button", this.practiceButtonsDiv,
            {id: "start-game", class: "wordchain-button game-button"},
            "Start Practice Game");
        ElementUtilities.setButtonCallback(startPracticeGameButton, startPracticeGameCallback);

        const clearLettersButton = ElementUtilities.addElementTo(
            "button", this.practiceButtonsDiv,
            {id: "clear-letters", class: "wordchain-button game-button"},
            "Clear Letters");
        ElementUtilities.setButtonCallback(clearLettersButton, clearLettersCallback);
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
        this.practiceTileDisplay.showPracticeWords();
    }

    // Callback for the Daily header button.
    dailyCallback() {
        // TEMPORARY
        const startWord = "cat";
        const targetWord = "dog";

        // TODO: Takes a while for dictionary to load ... not sure what we have doesn't wait.
        // 100 ms not enough; 200 ms does the trick. Note: still being served from github.
        setTimeout(() => {
            ElementUtilities.editClass(/not-active/, "active-button", this.dailyGameButton);
            ElementUtilities.editClass(/active-button/, "not-active", this.practiceGameButton);

            if (this.dailyGameOver) {
                this.game = this.dailyGame;
                this.gameTileDisplay.setGame(this.game);
                this.gameTileDisplay.showSolution();
                this.displaySolution();
                return;
            }

            // No need to check solution for success -- daily games will be
            // pre-verified to have a solution.
            const solution = Solver.fastSolve(this.dict, startWord, targetWord);

            if (!this.dailyGame) {
                this.dailyGame = new Game(this.dict, solution);
                this.gameTileDisplay = new GameTileDisplay(this.dailyGame, this.dict, this.solutionDiv);
            }
            this.game = this.dailyGame;
            this.gameTileDisplay.setGame(this.game);
            this.gameTileDisplay.showSteps();
            this.displaySteps();
        }, 200);
    }

    // Callback for the End Game button
    endGameCallback() {
        if (this.game === this.practiceGame) {
            this.practiceTileDisplay.resetWords();
        }
        this.gameTileDisplay.showSolution();
        this.displaySolution();
    }

    // Global keyboard callback; calls specific game/practice callback
    // based on whether the practis div is hidden.
    keyboardCallback(keyValue) {
        if (ElementUtilities.isHidden(this.practiceDiv)) {
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
                this.gameTileDisplay.showSteps();
                this.displaySteps();
            }

            if (this.game.isSolved()) {
                // Show the alert after 50 ms; this little delay results in the last word
                // appearing on the display before the the alert pop-up.
                setTimeout(() => {
                    this.showToast("Solved!")
                    if (this.game == this.dailyGame) {
                        this.endGameCallback();
                    }
                }, 50);
            }
        } else if (ElementUtilities.isLetter(keyValue)) {
            this.gameTileDisplay.keyPressLetter(keyValue);
        }
        // No other keys cause a change.
    }

    // This is the callback for the Practice header button.
    practiceCallback() {
        ElementUtilities.editClass(/not-active/, "active-button", this.practiceGameButton);
        ElementUtilities.editClass(/active-button/, "not-active", this.dailyGameButton);


        // If we have an ongoing practice game set this.game to it and redraw.
        if (this.practiceGame !== null) {
            this.game = this.practiceGame;
            this.gameTileDisplay.setGame(this.game);
            this.gameTileDisplay.showSteps();
            this.displaySteps();

        // Otherwise, create the practice tile display if we haven't yet
        // and then ensure the right divs are showing. The user will see the
        // screen to enter start/end words.
        } else {
            if (! this.practiceTileDisplay) {
                this.practiceTileDisplay = new PracticeTileDisplay(this.dict, this.practiceWordsDiv);
                this.practiceTileDisplay.resetWords();
            }
            this.practiceTileDisplay.showPracticeWords();
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
            this.practiceTileDisplay.showPracticeWords();
        } else if (ElementUtilities.isLetter(keyValue)) {
            this.practiceTileDisplay.keyPressLetter(keyValue);
        }
        // No other keys cause a change.
    }

    // Callback for the Start New Game button that appears after
    // ending a practice game; this allows the user to see the solution
    // until they are ready to start a new one.
    startNewGameCallback() {
        // Set practiceGame to null so practiceCallback() knows to
        // get new start/target words.
        this.practiceGame = null;

        // Set practiceTileDisplay to null so practiceCallback() knows to
        // reset the practice game words in the tiles.
        this.practiceTileDisplay = null;

        this.practiceCallback();
    }

    // Callback for the Start Practice button in the practice game setup screen.
    startPracticeGameCallback() {
        const startWord  = this.practiceTileDisplay.getStartWord();
        const targetWord = this.practiceTileDisplay.getTargetWord();
        let result;

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

        if (startWord === targetWord) {
            this.showToast("Hollow congratulations for creating an already solved game.");
            return
        }

        const solution = Solver.fastSolve(this.dict, startWord, targetWord);
        if (!solution.success()) {
            this.showToast(TileDisplay.NO_SOLUTION);
            return;
        }

        this.practiceGame = new Game(this.dict, solution);
        this.game = this.practiceGame;
        this.gameTileDisplay.setGame(this.game);

        // Delete the children in the practiceWordsDiv, so the id attributes
        // of the game tiles won't be the same as those of the practice tiles.
        // Element IDs must be unique or else undefined behavior occurs -- we use
        // the ID to find the element, and if there are two it is undefined which
        // one will be acted upon.
        ElementUtilities.deleteChildren(this.practiceWordsDiv);
        this.gameTileDisplay.showSteps();
        this.displaySteps();
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

    displaySolution() {
        this.updateDisplay(true);
    }

    displaySteps() {
        this.updateDisplay(false);
    }

    showToast(message) {
        this.toastDiv.innerHTML = message
        ElementUtilities.editClass(/hide/, "show", this.toastDiv);
        setTimeout(() => {
            ElementUtilities.editClass(/show/, "hide", this.toastDiv);
        }, 3000);
    }

    updateDisplay(showSolution) {
        if (showSolution) {
            // Game is over; don't show keyboard.
            this.keyboardDiv.style.display = "none";

            // Note which game is over, and add Start New Game button if
            // playing practice game.
            if (this.game === this.dailyGame) {
                this.dailyGameOver = true;
            } else {
                this.practiceGameOver = true;

                // Set practiceGame to null so practiceCallback() knows to
                // get new start/target words.
                this.practiceGame = null;

                // The div with class "break" forces the button to be on a "new line" with display: flex.
                // to be on a "new line" with display: flex, which we use for this div.
                // See: https://tobiasahlin.com/blog/flexbox-break-to-new-row/
                ElementUtilities.addElementTo("div", this.solutionDiv, {class: "break"});
                const startNewGameButton = ElementUtilities.addElementTo(
                    "button", this.solutionDiv,
                    {id: "start-new-game", class: "wordchain-button game-button"},
                    "Start New Game");
                ElementUtilities.setButtonCallback(startNewGameButton, startNewGameCallback);
            }
        } else {
            // Game not over; add End Game button and show keyboard.

            // The div with class "break" forces the button to be on a "new line" with display: flex.
            // to be on a "new line" with display: flex, which we use for this div.
            // See: https://tobiasahlin.com/blog/flexbox-break-to-new-row/
            ElementUtilities.addElementTo("div", this.solutionDiv, {class: "break"});
            const endGameButton = ElementUtilities.addElementTo(
                "button", this.solutionDiv,
                {id: "end-game", class: "wordchain-button game-button"},
                "End Game");
            ElementUtilities.setButtonCallback(endGameButton, endGameCallback);

            this.keyboardDiv.style.display = "block";
        }

        this.solutionDiv.style.display = "flex";
        this.practiceDiv.style.display = "none";
    }
}

export { AppDisplay };

AppDisplay.singleton().displayGame();
