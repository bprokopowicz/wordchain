import { BaseLogger } from './BaseLogger.js';
import { WordChainDict } from './WordChainDict.js';
import { Solver } from './Solver.js';
import { Game } from './Game.js';
import { ElementUtilities } from './ElementUtilities.js';


/*
** TODO:
** - Header div across whole screen
** - Better handling of colors
** - Replace alerts
** - Support hard keyboard entry
** - Keyboard for practice mode (Will need to change the click bindings for all buttons
**   - show in a grid like the other letters, but with "start word" and "target word" labels?
*/

/*
** Forwarding functions
**
** When "this.startGameCallback" is passed, for example, as the listener on calls within the
** within the Display class to addEventListener(), Chrome appears to call it (but refers
** to it as HTMLButtonElement.startGameCallback, which doesn't exist!) and "this" within the
** method is of type HTMLButtonElement, so the call within to "this.checkWord()" resolves
** to HTMLButtonElement.checkword, which is is not a function. This kind of makes
** sense (except for why it  was able to call the Display.startGameCallback()
** method at all!).
**
** At that point I introduced the singleton idea. I thought that passing
** Display.singleton().startGameCallback as the listener would work, but this also resulted in
** "HTMLButtonElement.checkWord() is not a function." Sigh. I really don't understand why that
** is not working. But we carry on; introducing the "forwarding function" did the trick.
*/

function dailyGameCallback() {
    Display.singleton().dailyGameCallback();
}

function keyboardCallback() {
    // Here the "this" being the button works in our favor -- we can get
    // its data-key attribute value, which is the letter of the key that
    // was clicked.
    Display.singleton().keyPressCallback(this.getAttribute("data-key"));
}

function practiceGameCallback() {
    Display.singleton().practiceGameCallback();
}

function startGameCallback() {
    Display.singleton().startGameCallback();
}

function endGameCallback() {
    Display.singleton().endGameCallback();
}


// Singleton class Display.

class Display extends BaseLogger {
    static singletonObject = null;

    // Constants for create*Div() methods.
    static HIDDEN = true;
    static SHOWN  = false;

    // Constants for showGameTiles() method.
    static SHOW_SOLUTION = true;
    static SHOW_STEPS    = false;

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
        this.outerDiv    = null;
        this.practiceDiv = null;
        this.solutionDiv = null;
        this.keyboardDiv = null;

        this.keyboardButtons = [];
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

        this.outerDiv = ElementUtilities.addElementTo("div", this.rootDiv, {id: "outer-div"});
        this.createPracticeDiv(Display.HIDDEN);
        this.createSolutionDiv(Display.SHOWN);
        this.createKeyboardDiv(Display.SHOWN);

        this.dailyGameCallback();
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
        this.practiceGameButton.addEventListener("click", practiceGameCallback);
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

        // Add keys for row 3, which has the DELETE/ENTER "action buttons" on the left and right.
        this.addActionButton(row3, "←");
        this.addLetterButton(row3, "z");
        this.addLetterButton(row3, "x");
        this.addLetterButton(row3, "c");
        this.addLetterButton(row3, "v");
        this.addLetterButton(row3, "b");
        this.addLetterButton(row3, "n");
        this.addLetterButton(row3, "m");
        this.addActionButton(row3, "↵");

        // Add the same click callback to each button.
        for (let button of this.keyboardButtons) {
            button.addEventListener("click", keyboardCallback);
        }
    }

    /* ----- Practice ----- */

    createPracticeDiv(hidden) {
        this.practiceDiv = ElementUtilities.addElementTo("div", this.outerDiv, {id: "practice-div"});
        if (hidden) {
            this.practiceDiv.style.display = "none";
        }

        ElementUtilities.addElementTo("label",   this.practiceDiv, {}, "Start word: ");
        ElementUtilities.addElementTo("input",   this.practiceDiv, {id: "game-start-word", type: "text"});
        ElementUtilities.addElementTo("p",       this.practiceDiv);
        ElementUtilities.addElementTo("label",   this.practiceDiv, {}, "Target word: ");
        ElementUtilities.addElementTo("input",   this.practiceDiv, {id: "game-target-word", type: "text"});
        ElementUtilities.addElementTo("p",       this.practiceDiv);
        const startGameButton = ElementUtilities.addElementTo(
            "button", this.practiceDiv,
            {id: "start-game", class: "game-button"},
            "Start Game");
        startGameButton.addEventListener("click", startGameCallback);
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
                this.game = this.dailyGame
                this.showGameTiles(Display.SHOW_SOLUTION);
                return;
            }

            ElementUtilities.setElementValue("game-start-word", startWord);
            ElementUtilities.setElementValue("game-target-word", targetWord);

            ElementUtilities.editClass(/not-active/, "active-button", this.dailyGameButton);
            ElementUtilities.editClass(/active-button/, "not-active", this.practiceGameButton);

            // No need to check solution for success -- daily games will be
            // pre-verified to have a solution.
            const solution = Solver.fastSolve(this.dict, startWord, targetWord);

            if (!this.dailyGame) {
                this.dailyGame = new Game(this.dict, solution);
            }
            this.game = this.dailyGame
            this.showGameTiles(Display.SHOW_STEPS);
        }, 200);
    }

    endGameCallback() {
        this.showGameTiles(Display.SHOW_SOLUTION);
    }

    keyPressCallback(keyValue) {
        if (keyValue === "←") {
            this.keyPressDelete();
        } else if (keyValue === "↵") {
            this.keyPressEnter();
        } else {
            this.keyPressLetter(keyValue);
        }
    }

    // This is the callback for the Practice and Start New Game buttons.
    practiceGameCallback() {
        ElementUtilities.setElementValue("game-start-word", "");
        ElementUtilities.setElementValue("game-target-word", "");

        ElementUtilities.editClass(/not-active/, "active-button", this.practiceGameButton);
        ElementUtilities.editClass(/active-button/, "not-active", this.dailyGameButton);


        if (this.practiceGame !== null) {
            this.game = this.practiceGame;
            this.showGameTiles(Display.SHOW_STEPS);
        } else {
            this.solutionDiv.style.display = "none";
            this.keyboardDiv.style.display = "none";
            this.practiceDiv.style.display = "block";
        }
    }

    startGameCallback() {
        const startWord = this.checkWord("game-start-word")
        if (! startWord) {
            alert("Invalid starting word.");
            return;
        }

        const targetWord = this.checkWord("game-target-word")
        if (! targetWord) {
            alert("Invalid target word.");
            return;
        }

        if (startWord === targetWord) {
            alert("Hollow congratulations for creating an already solved game.");
            return
        }

        const solution = Solver.fastSolve(this.dict, startWord, targetWord);

        if (!solution.success()) {
            alert("No solution! Please Pick new start and/or target words.")
            return;
        }

        this.practiceGame = new Game(this.dict, solution);
        this.game = this.practiceGame;
        this.showGameTiles(Display.SHOW_STEPS);
    }

    /*
    ** METHODS FOR DEALING WITH SOLUTION TILES
    */

    editClassForCurrentWord(fromPattern, toString, element, elementGetter) {

        if (element) {
            ElementUtilities.editClass(fromPattern, toString, element);
        } else {
            let elements = [];
            const wordLength = this.getCurrentWordLength();
            for (let col = 0; col < wordLength; col++) {
                elements.push(elementGetter(this.currentRow, col));
            }

            ElementUtilities.editClass(fromPattern, toString, elements);
        }
    }

    editLetterClass(fromPattern, toString, element=null) {
        this.editClassForCurrentWord(fromPattern, toString, element, Display.getLetterElement);
    }

    editTileClass(fromPattern, toString, element=null) {
        this.editClassForCurrentWord(fromPattern, toString, element, Display.getTileElement);
    }

    getCurrentWordLength() {
        const rowElement = Display.getTileRowElement(this.currentRow);
        return rowElement.getAttribute("data-word-length");
    }

    static getLetterElement(row, col) {
        return ElementUtilities.getElement(Display.getLetterId(row, col), false);
    }

    static getLetterId(row, col) {
        return `letter-${row}-${col}`;
    }

    static getTileElement(row, col) {
        return ElementUtilities.getElement(Display.getTileId(row, col), false);
    }

    static getTileId(row, col) {
        return `tile-${row}-${col}`;
    }

    static getTileRowElement(row) {
        return ElementUtilities.getElement(Display.getTileRowId(row));
    }

    static getTileRowId(row) {
        return `tile-row-${row}`;
    }

    getWordFromTiles() {
        let column = 0;
        let enteredWord = '';
        while (true) {
            const letterElement = Display.getLetterElement(this.currentRow, column);
            if (! letterElement) {
                break;
            }

            const letter = letterElement.innerHTML;
            if (letter === Game.CHANGE | letter === Game.NO_CHANGE) {
                alert("Not enough letters");
                return null;
            }
            enteredWord += letter;
            column++;
        }

        return enteredWord;
    }

    keyPressDelete() {
        // If user clicks delete beyond beginning of row, just return;
        if (this.currentColumn <= 0) {
            return;
        }
        this.currentColumn--;

        const tileElement = Display.getTileElement(this.currentRow, this.currentColumn);

        if (tileElement.getAttribute("data-tile-type") === "change") {
            this.editTileClass(/no-change/, "letter-change", tileElement);
        }
        this.editTileClass(/no-enter/, "tile-enter", tileElement);

        if (this.currentColumn != this.getCurrentWordLength() - 1) {
            const nextTileElement = Display.getTileElement(this.currentRow, this.currentColumn + 1);
            this.editTileClass(/tile-enter/, "no-enter", nextTileElement);
        }

        const letterElement = Display.getLetterElement(this.currentRow, this.currentColumn);
        letterElement.innerHTML = Game.NO_CHANGE;
        this.editLetterClass(/shown-letter/, "hidden-letter", letterElement);
        this.editLetterClass(/not-a-word/, "is-a-word");
    }

    keyPressEnter() {
        const enteredWord = this.getWordFromTiles();
        if (! enteredWord) {
            return;
        }

        if (! this.dict.isWord(enteredWord)) {
            // Tile letter color already changed to indicate it's not a word.
            return;
        }

        const gameResult = this.game.playWord(enteredWord);

        if (gameResult !== Game.OK) {
            alert (gameResult);
        } else {
            this.showGameTiles(Display.SHOW_STEPS);
            if (this.game.isSolved()) {
                // Show the alert after 50 ms; this little delay results in the last word
                // appearing on the display before the the alert pop-up.
                setTimeout(() => {
                    alert("Good job! You solved it!")
                }, 50);
            }
        }
    }

    keyPressLetter(keyValue) {
        // If current row has not been set, then we must be displaying a solution.
        if (! this.currentRow) {
            return;
        }

        if (this.currentColumn < 0) {
            this.currentColumn = 0;
        }

        const tileElement = Display.getTileElement(this.currentRow, this.currentColumn);

        // If user types or clicks beyond the last box in the current word being
        // played, just return.
        if (! tileElement) {
            return;
        }

        tileElement.setAttribute("class", "tile no-enter no-change");

        const letterElement = Display.getLetterElement(this.currentRow, this.currentColumn);
        letterElement.innerHTML = keyValue.toUpperCase();
        this.editLetterClass(/hidden-letter/, "shown-letter", letterElement);

        this.currentColumn++;

        if (this.currentColumn >= this.getCurrentWordLength()) {
            const enteredWord = this.getWordFromTiles();
            if (! this.dict.isWord(enteredWord)) {
                this.editLetterClass(/is-a-word/, "not-a-word");
            }
        } else {
            // Next element is the one to show as the one that the clicked
            // letter will set.
            const nextTileElement = Display.getTileElement(this.currentRow, this.currentColumn);
            this.editTileClass(/no-enter/, "tile-enter", nextTileElement);
        }
    }

    showGameTiles(showSolution) {
        // Just return if we haven't started the game yet.
        if (! this.game) {
            return;
        }

        this.updateGameTiles(showSolution);

        if (showSolution) {
            // Game is over; don't show keyboard.
            this.keyboardDiv.style.display = "none";

            // Note which game is over, and add Start New Game button if
            // playing practice game.
            if (this.game === this.dailyGame) {
                this.dailyGameOver = true;
            } else {
                this.practiceGameOver = true;

                // Set practiceGame to null so practiceGameCallback() knows to
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
                startNewGameButton.addEventListener("click", practiceGameCallback);
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

    updateGameTiles(showSolution) {
        // Delete current child elements.
        ElementUtilities.deleteChildren(this.solutionDiv);

        const tableElement = ElementUtilities.addElementTo("table", this.solutionDiv);
        const tbodyElement = ElementUtilities.addElementTo("tbody", tableElement);

        // This will hold the row number where letters typed/clicked will go.
        this.currentRow = null;

        // This will hold the column number where the next letter typed/clicked
        // will go (until ENTER) -- it is set in keyPress().
        this.currentColumn = 0;

        let gameSteps;
        if (showSolution) {
            gameSteps = this.game.getKnownSolution().getWords();
        } else {
            gameSteps = this.game.showGame();
        }

        for (let row = 0; row < gameSteps.length; row++) {
            const word = gameSteps[row];
            const rowElement = ElementUtilities.addElementTo("tr", tbodyElement, {id: Display.getTileRowId(row)});
            rowElement.setAttribute("data-word-length", word.length);

            for (let col = 0; col < word.length; col++) {

                const letter = word[col].toUpperCase();
                let tileClass = "tile";

                // First row containing a CHANGE or NO_CHANGE is the current row.
                if (this.currentRow === null && (letter === Game.CHANGE|| letter === Game.NO_CHANGE)) {
                    this.currentRow = row;
                    tileClass += " tile-enter";
                } else {
                    tileClass += " no-enter";
                }

                // Set tileType and letterClass.
                let tileType = "no-change";
                let letterClass = "is-a-word";
                if (letter === Game.CHANGE) {
                    tileClass += " letter-change";
                    tileType = "change";
                    letterClass += " hidden-letter";
                } else if (letter === Game.NO_CHANGE) {
                    tileClass += " no-change";
                    letterClass += " hidden-letter";
                } else {
                    tileClass += " no-change";
                    letterClass += " shown-letter";
                }

                if (row == 0) {
                    letterClass += " start-word";
                } else if (row == gameSteps.length - 1) {
                    letterClass += " target-word";
                }

                const tileId = Display.getTileId(row, col);
                const letterId = Display.getLetterId(row, col);
                const tdElement = ElementUtilities.addElementTo("td", rowElement, {id: tileId, class: tileClass, 'data-tile-type': tileType});
                ElementUtilities.addElementTo("div", tdElement, {id: letterId, class: letterClass}, letter);
            }
        }
    }

    /*
    ** MISCELLANEOUS UTILITIES
    */

    checkWord(elementId) {
        let word = ElementUtilities.getElementValue(elementId);
        word = word.trim().toLowerCase();
        if (word.length === 0 || !this.dict.isWord(word)) {
            return null;
        }

        return word;
    }
}

export { Display };

if (GLdisplayGame) {
    Display.singleton().displayGame();
}
