import { TileDisplay, GameTileDisplay, PracticeTileDisplay } from './TileDisplay.js';
import { BaseLogger } from './BaseLogger.js';
import { WordChainDict } from './WordChainDict.js';
import { Solver } from './Solver.js';
import { Game } from './Game.js';
import { ElementUtilities } from './ElementUtilities.js';


/*
** TODO:
** - Comments in Display.js and TileDIsplay.js
** - Better handling of colors
** - Better images on ENTER/BACKSPACE keys
** - Clear Words button in practice div
** - Center elements of practice div
** - Auto-fill unchanged letters (NOT in hard mode)
** - What is the "score" of the game?
** - Hard mode ... extra X points?
** - What is the "share" graphic?
*/

/*
** Forwarding functions
**
** When "this.startDailyGameCallback" is passed, for example, as the listener on calls within the
** within the Display class to addEventListener(), Chrome appears to call it (but refers
** to it as HTMLButtonElement.startDailyGameCallback, which doesn't exist!) and "this" within the
** method is of type HTMLButtonElement, so the call within to "this.checkWord()" resolves
** to HTMLButtonElement.checkword, which is is not a function. This kind of makes
** sense (except for why it  was able to call the Display.startDailyGameCallback()
** method at all!).
**
** At that point I introduced the singleton idea. I thought that passing
** Display.singleton().startDailyGameCallback as the listener would work, but this also resulted in
** "HTMLButtonElement.checkWord() is not a function." Sigh. I really don't understand why that
** is not working. But we carry on; introducing the "forwarding function" did the trick.
*/

function dailyGameCallback() {
    Display.singleton().dailyGameCallback();
}

function endGameCallback() {
    Display.singleton().endGameCallback();
}

function hardKeyboardCallback(event) {
    if (event.key == "Backspace") {
        Display.singleton().keyboardCallback(Display.BACKSPACE);
    }
    else if (event.key == "Enter") {
        Display.singleton().keyboardCallback(Display.ENTER);
    } else {
        Display.singleton().keyboardCallback(event.key.toString().toLowerCase());
    }
}

function practiceCallback() {
    Display.singleton().practiceCallback();
}

function softKeyboardCallback() {
    // Here the "this" being the button works in our favor -- we can get
    // its data-key attribute value, which is the letter of the key that
    // was clicked.
    Display.singleton().keyboardCallback(this.getAttribute("data-key"));
}

/*
function startDailyGameCallback() {
    Display.singleton().startDailyGameCallback();
}
*/

function startNewGameCallback() {
    Display.singleton().startNewGameCallback();
}

function startPracticeGameCallback() {
    Display.singleton().startPracticeGameCallback();
}


// Singleton class Display.

class Display extends BaseLogger {
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
        if (Display.singletonObject === null) {
            Display.singletonObject = new Display();
        }
        return Display.singletonObject;
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
        this.createPracticeDiv(Display.HIDDEN);
        this.createSolutionDiv(Display.SHOWN);
        this.createKeyboardDiv(Display.SHOWN);

        window.addEventListener("keydown", hardKeyboardCallback);

        this.dailyGameCallback();
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
            {id: "daily-game", class: "header-button active-button"},
            "Daily");
        this.dailyGameButton.addEventListener("click", dailyGameCallback);

        this.practiceGameButton = ElementUtilities.addElementTo(
            "button", titleDiv,
            {id: "practice-game", class: "header-button not-active"},
            "Practice");
        this.practiceGameButton.addEventListener("click", practiceCallback);
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
        this.addActionButton(row3, Display.BACKSPACE);
        this.addLetterButton(row3, "z");
        this.addLetterButton(row3, "x");
        this.addLetterButton(row3, "c");
        this.addLetterButton(row3, "v");
        this.addLetterButton(row3, "b");
        this.addLetterButton(row3, "n");
        this.addLetterButton(row3, "m");
        this.addActionButton(row3, Display.ENTER);

        // Add the same click callback to each button.
        for (let button of this.keyboardButtons) {
            button.addEventListener("click", softKeyboardCallback);
        }
    }

    /* ----- Practice ----- */

    createPracticeDiv(hidden) {
        this.practiceDiv = ElementUtilities.addElementTo("div", this.outerDiv, {id: "practice-div"});
        if (hidden) {
            this.practiceDiv.style.display = "none";
        }


        const helpText = `Words can be up to ${PracticeTileDisplay.MAX_WORD_LENGTH} letters. Press Return Key when done with a word.`
        ElementUtilities.addElementTo("label", this.practiceDiv, {class: "help-info"}, helpText);
        this.practiceWordsDiv   = ElementUtilities.addElementTo("div", this.practiceDiv, {id: "practice-words-div"});
        this.practiceButtonsDiv = ElementUtilities.addElementTo("div", this.practiceDiv, {id: "practice-buttons-div"});

        const startPracticeGameButton = ElementUtilities.addElementTo(
            "button", this.practiceButtonsDiv,
            {id: "start-game", class: "game-button"},
            "Start Practice Game");
        startPracticeGameButton.addEventListener("click", startPracticeGameCallback);
    }

    /* ----- Solution ----- */

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

    dailyGameCallback() {
        // TEMPORARY
        const startWord = "cat";
        const targetWord = "dog";

        // TODO: Takes a while for dictionary to load ... not sure what we have doesn't wait.
        // 100 ms not enough; 200 ms does the trick. Note: still being served from github.
        setTimeout(() => {
            if (this.dailyGameOver) {
                this.game = this.dailyGame;
                this.gameTileDisplay.setGame(this.game);
                this.gameTileDisplay.showSolution();
                this.displaySolution();
                return;
            }

            ElementUtilities.editClass(/not-active/, "active-button", this.dailyGameButton);
            ElementUtilities.editClass(/active-button/, "not-active", this.practiceGameButton);

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

    endGameCallback() {
        this.gameTileDisplay.showSolution();
        this.displaySolution();
    }

    keyboardCallback(keyValue) {
        if (ElementUtilities.isHidden(this.practiceDiv)) {
            this.gameKeyboardCallback(keyValue);
        } else {
            this.practiceKeyboardCallback(keyValue);
        }
    }

    gameKeyboardCallback(keyValue) {
        if (keyValue === Display.BACKSPACE) {
            this.gameTileDisplay.keyPressDelete();
        } else if (keyValue === Display.ENTER) {
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

    // This is the callback for the Practice buttons.
    practiceCallback() {
        ElementUtilities.editClass(/not-active/, "active-button", this.practiceGameButton);
        ElementUtilities.editClass(/active-button/, "not-active", this.dailyGameButton);


        if (this.practiceGame !== null) {
            this.game = this.practiceGame;
            this.gameTileDisplay.setGame(this.game);
            this.gameTileDisplay.showSteps();
            this.displaySteps();
        } else {
            if (! this.practiceTileDisplay) {
                this.practiceTileDisplay = new PracticeTileDisplay(this.dict, this.practiceWordsDiv);
                this.practiceTileDisplay.resetWords();
            }
            this.practiceTileDisplay.showPracticeWords();
            this.solutionDiv.style.display = "none";
            this.keyboardDiv.style.display = "block";
            this.practiceDiv.style.display = "block";
        }
    }

    practiceKeyboardCallback(keyValue) {
        if (keyValue === Display.BACKSPACE) {
            this.practiceTileDisplay.keyPressDelete();
        } else if (keyValue === Display.ENTER) {
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

    startDailyGameCallback() {
        this.gameTileDisplay.showSteps();
        this.displaySteps();
    }

    startNewGameCallback() {
        // Set practiceGame to null so practiceCallback() knows to
        // get new start/target words.
        this.practiceGame = null;

        // Set practiceTileDisplay to null so practiceCallback() knows to
        // reset the practice game words in the tiles.
        this.practiceTileDisplay = null;

        this.practiceCallback();
    }

    startPracticeGameCallback() {
        const gameWords  = this.practiceTileDisplay.getWords();
        const startWord  = gameWords[0];
        const targetWord = gameWords[1];
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
        if (word.length === 0) {
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
                    {id: "start-new-game", class: "game-button"},
                    "Start New Game");
                startNewGameButton.addEventListener("click", startNewGameCallback);
            }
        } else {
            // Game not over; add End Game button and show keyboard.

            // The div with class "break" forces the button to be on a "new line" with display: flex.
            // to be on a "new line" with display: flex, which we use for this div.
            // See: https://tobiasahlin.com/blog/flexbox-break-to-new-row/
            ElementUtilities.addElementTo("div", this.solutionDiv, {class: "break"});
            const endGameButton = ElementUtilities.addElementTo(
                "button", this.solutionDiv,
                {id: "end-game", class: "game-button"},
                "End Game");
            endGameButton.addEventListener("click", endGameCallback);

            this.keyboardDiv.style.display = "block";
        }

        this.solutionDiv.style.display = "flex";
        this.practiceDiv.style.display = "none";
    }
}

export { Display };

if (GLdisplayGame) {
    Display.singleton().displayGame();
}
