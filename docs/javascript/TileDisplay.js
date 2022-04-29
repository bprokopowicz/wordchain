import { BaseLogger } from './BaseLogger.js';
import { ElementUtilities } from './ElementUtilities.js';
import { Game } from './Game.js';
import { Cookie } from './Cookie.js';
import * as Const from './Const.js';

// TileDisplay is a base class that provides common functionality for manipulating
// a grid of tiles for:
// - daily and practice game play
// - practice game word selection
//
// The tiles form a grid where:
// - rows are numbered 0 to N-1
//   - NOTE: The grid for practice game word selection will always have 2 rows
// - columns are numbered 0 to M-1, where:
//   - column 0 is a label for the row
//     - Through CSS styling, column 0 is not shown for the game play grid
//   - column 1 through M-1 hold the letters in the word associated with that row
//
// So, while words are indexed 0 to M-1 the corresponding columns are indexed 1 to M.
// The instance variables currentRow and currentColumn are used to keep track of the
// which tile the keyboard (hard or soft) will affect.
//
// HTML table, tr, and td elements are used to construct the grid. Each tile has two parts:
// - A td element, styled with:
//   - a bold border if the tile should be change during game play
//   - a background color if it is the one that will receive keyboard input
// - A div element that contains the tile contents (a letter, *, or !)
//   - Only letters are visible (achieved via CSS styling)
//   - Letters that are not a word are styled to be red to indicate the error
//
// Each of the grid elements (except for the table element, which we never need to "address")
// have a unique "id" attribute with this naming convention:
// - tile-<row>-<col>
// - letter-<row>-<col>
// - tile-row-<row>

class TileDisplay extends BaseLogger {

    constructor(dict) {
        super();
        this.dict = dict;
    }

    // Edit the element class for a single letter or tile, indicated with row/column,
    // given a pattern to replace and a string to replace it with. An "elementGetter"
    // method is supplied that takes a row and column of the tile grid and returns
    // the corresponding element. The main code calls one of the two wrappers below,
    // which default to the current tile.
    editClassForCurrentWord(fromPattern, toString, row, column, elementGetter) {
        if (!row) {
            row = this.currentRow;
            column = this.currentColumn;
        }

        const element = elementGetter(row, column);
        if (element) {
            ElementUtilities.editClass(fromPattern, toString, element);
        }
    }

    editLetterClass(fromPattern, toString, row=null, column=null) {
        this.editClassForCurrentWord(fromPattern, toString, row, column, TileDisplay.getLetterElement);
    }

    editTileClass(fromPattern, toString, row=null, column=null) {
        this.editClassForCurrentWord(fromPattern, toString, row, column, TileDisplay.getTileElement);
    }

    static getCssProperty(property) {
        return getComputedStyle(document.documentElement).getPropertyValue(`--${property}`);
    }

    static setCssProperty(property, value) {
        return document.documentElement.style.setProperty(`--${property}`, value);
    }

    // Gets the length of the word for the current row, using the data-word-length
    // attribute that is set on the row element when it is created.
    getCurrentWordLength() {
        const rowElement = TileDisplay.getTileRowElement(this.currentRow);
        return rowElement.getAttribute("data-word-length");
    }

    // The next 6 methods provide a consistent way of getting tr, td, and letter div
    // elements for a given row and column.

    static getLetterElement(row, col) {
        return ElementUtilities.getElement(TileDisplay.getLetterId(row, col), false);
    }

    static getLetterId(row, col) {
        return `letter-${row}-${col}`;
    }

    static getTileElement(row, col) {
        return ElementUtilities.getElement(TileDisplay.getTileId(row, col), false);
    }

    static getTileId(row, col) {
        return `tile-${row}-${col}`;
    }

    static getTileRowElement(row) {
        return ElementUtilities.getElement(TileDisplay.getTileRowId(row));
    }

    static getTileRowId(row) {
        return `tile-row-${row}`;
    }

    // Gets the word from the tiles in specified row (or the current row by default).
    getWordFromTiles(row=null) {
        if (row === null) {
            row = this.currentRow;
        }

        // We'll build up the entered word from the tils as we loop.
        let enteredWord = '';
        for (let column = 1; column <= Const.MAX_WORD_LENGTH; column++) {
            // If it doesn't exist we got 'em all.
            const letterElement = TileDisplay.getLetterElement(row, column);
            if (! letterElement) {
                break;
            }

            // If it's not a letter, that marks the end of the word.`
            const letter = letterElement.innerHTML;
            if (! ElementUtilities.isLetter(letter)) {
                break;
            }

            enteredWord += letter;
        }

        return enteredWord.toLowerCase();
    }

    // This method is called from the hard or soft keydown callback in the AppDisplay
    // class when the BACKSPACE key is pressed to delete the previously entered letter.
    keyPressDelete() {
        // If user clicks delete beyond beginning of row, just return;
        if (this.currentColumn <= 1) {
            return;
        }

        // We've moved back, so style the current input tile element (if we're not past
        // the end of the tile row) to indicate it is no longer the input tile element.
        this.editTileClass(/input-tile/, "not-input-tile");

        // Current column is now one back.
        this.currentColumn--;

        // Get the tile element for this row/column and if it is a tile that the game "says"
        // should be changed next, style it to indicate that ... unless the user has
        // selected hard mode.
        const tileElement = TileDisplay.getTileElement(this.currentRow, this.currentColumn);
        if ((tileElement.getAttribute("data-outline-change-type") === "letter-change") && (! this.hardMode)) {
            this.editTileClass(/no-change/, "letter-change");
        }

        // Similarly, if our data indicates this tile had been grayed, change its class.
        if ((tileElement.getAttribute("data-outline-color-type") === "tile-grayed")) {
            this.editTileClass(/tile-not-grayed/, "tile-grayed");
        }

        // Show that this tile element is the one that will get input.
        this.editTileClass(/not-input-tile/, "input-tile");

        // Set the letter to Const.NO_CHANGE so the rest of the app knows
        // this is not an entered letter yet, and style it accordingly.
        const letterElement = TileDisplay.getLetterElement(this.currentRow, this.currentColumn);
        letterElement.innerHTML = Const.NO_CHANGE;
        this.editLetterClass(/shown-letter/, "hidden-letter");
    }

    // This method is called indirectly (from a derived class method of the same name)
    // from the hard or soft keydown callback in the AppDisplay class when a letter key
    // is pressed/clicked.
    keyPressLetter(keyValue, wordLength) {
        // If the had backspaced beyond the first letter, reset to the first.
        if (this.currentColumn < 1) {
            this.currentColumn = 1;
        }

        const tileElement = TileDisplay.getTileElement(this.currentRow, this.currentColumn);

        // If user has typed or clicked beyond the last box in the current word being
        // played, just return.
        if (! tileElement) {
            return;
        }

        // Once the user enters a letter, this current tile no longer is the
        // one to get input, nor is it the one that is supposed to be changed,
        // so style accordingly.
        tileElement.setAttribute("class", "tile not-input-tile no-change tile-not-grayed");

        // Show the letter that was typed.
        const letterElement = TileDisplay.getLetterElement(this.currentRow, this.currentColumn);
        letterElement.innerHTML = keyValue.toUpperCase();

        this.editLetterClass(/hidden-letter/, "shown-letter");

        // Move ahead one letter.
        this.currentColumn++;

        // If we haven't moved beyond the last tile, style the current tile to
        // indicate it will receive input.
        this.editTileClass(/not-input-tile/, "input-tile");
    }
}

// This class specializes TileDisplay to display the grid of tiles for
// daily/practice game play.

class GameTileDisplay extends TileDisplay {

    constructor(game, dict, solutionDiv, appDisplay) {
        super(dict);

        this.setGame(game);
        this.dict = dict;
        this.solutionDiv = solutionDiv;
        this.appDisplay = appDisplay;

        this.hardMode = false;
    }

    // Color the tiles in the game display to indicate for each of the user's
    // played words whether it made the solution longer (red) or not (green).
    colorTiles() {
        let countHistory = this.game.getCountHistory();

        if (countHistory.length === 0) {
            return;
        }

        // The count history is a list of how many steps were required to
        // solve the game at the very beginning ("the best solution") and
        // then for each step thereafter. So the number of rows that we
        // will color is one fewer than the length.
        const numRows = countHistory.length - 1;

        // Shift off the first count -- this is the best solution count,
        // so it's the previous count for the first word played.
        let previousCount = countHistory.shift();

        // Go through all the rows except the first and last, because they
        // hold the start/target words, which do not get colored.
        for (let row = 1; row <= numRows; row++) {
            // Now, shift off the next count, corresponding to row.
            let nextCount = countHistory.shift();
            this.logDebug(`row: ${row}, previousCount: ${previousCount}, nextCount: ${nextCount}`, "tileColor");

            // Determine the class based on whether the solution length increased.
            let tileColorClass;
            if (nextCount <= previousCount) {
                tileColorClass = " solution-same-length";
            } else {
                tileColorClass = " solution-longer";
            }
            this.logDebug(`tileColorClass: ${tileColorClass}`, "tileColor");

            // Color all the elements in this row; first make a list of them,
            // and let editClass() do the rest. Note that the entire tile display
            // is recreated as each word is played, so we never have to undo
            // this color styling.
            let tileElements = [];
            for (let col = 1; col <= Const.MAX_WORD_LENGTH; col++) {
                const tileElement = TileDisplay.getTileElement(row, col);

                // If this tile doesn't exist, it means we've colored all the tiles,
                // so we are done.
                if (tileElement === null) {
                    break;
                }
                this.logDebug(`push row: ${row}, col: ${col}`, "tileColor");
                tileElements.push(tileElement);
            }
            ElementUtilities.editClass(/$/, tileColorClass, tileElements);

            // Set up for the next iteration.
            previousCount = nextCount;
        }
    }

    getNumFilledWords() {
        return this.currentRow + 1;
    }

    // This is called when the user clicks the Show Solution button
    // and is simply passed along to the game.
    endGame() {
        // Solution in progress includes start word and all the words
        // that the user played.
        const userSolutionWords = this.game.getSolutionInProgress().getWords();

        // Known solution includes start word, the words the user played,
        // the remaining words for a best solution, and the target word.
        let wordsToPlay = this.game.getKnownSolution().getWords();

        // Remove the target word from the known solution words. We don't want
        // to play the target word, because the user doesn't play the target word.
        wordsToPlay.pop()

        // Remove the words that are already in the user's solution.
        wordsToPlay.splice(0, userSolutionWords.length);

        // Loop through the words in the known solution that haven't yet been
        // played and play them. This way, when the game is displayed the solution
        // will be shown.
        for (let word of wordsToPlay) {
            this.game.playWord(word);
        }

        if (this.game.getName() === "PracticeGame") {
            // Clear out the game in the cookies so that if the user reloads
            // and clicks Practice they get taken to the screen to enter letters.
            Cookie.set(this.game.getName(), "");
        } else {
            // Save cookie.
            this.setGameCookie();
        }
    }

    static isUnfilledLetter(letter) {
        return letter == Const.CHANGE ||letter == Const.NO_CHANGE;
    }

    // This method is called from the hard or soft keydown callback in the AppDisplay
    // class when the BACKSPACE key is pressed during game play.
    keyPressDelete() {
        if (Game.isTypeSavingWord(this.currentWord)) {
            return;
        }
        super.keyPressDelete();
    }

    // This method is called from the hard or soft keydown callback in the AppDisplay
    // class when the ENTER key is pressed to enter a word during game play.
    keyPressEnter() {
        const enteredWord = this.getWordFromTiles();
        if (enteredWord.length < Const.MIN_WORD_LENGTH) {
            return Const.TOO_SHORT;
        }

        // Return if the word is not in our dictionary.
        if (! this.dict.isWord(enteredWord)) {
            // Tile letter color already changed to indicate it's not a word.
            return Const.NOT_A_WORD;
        }

        // Play the word. If the word was OK, construct an array of the words
        // played so far, plus the target word, and save it as a cookie.
        const playResult = this.game.playWord(enteredWord);
        if (playResult === Const.OK) {
            this.setGameCookie();
        }

        return playResult;
    }

    // This method is called from the hard or soft keydown callback in the AppDisplay
    // class when a letter key is pressed during game play.
    keyPressLetter(keyValue) {
        // Display tiles up to the the current word's length.
        super.keyPressLetter(keyValue, this.getCurrentWordLength());

        if (this.typeSavingMode) {
            // Determine whether all tiles in the current word have letters.
            let wordComplete = true;
            for (let col = 1; col <= Const.MAX_WORD_LENGTH; col++) {
                const letterElement = TileDisplay.getLetterElement(this.currentRow, col);
                const letter = letterElement.innerHTML;
                if (letter == Const.EXTRA) {
                    break;
                }
                if (! ElementUtilities.isLetter(letter)) {
                    wordComplete = false;
                    break;
                }
            }

            // If the current word is a type-saving word, and all the letters are filled in,
            // then automatically "press" enter. We do this by calling back to AppDisplay's
            // callback, so we get the exact same behavior. Note that this.currentWord is
            // the word as returned from Game.showGame(), and now we ask the Game class to
            // let us know if it's a word to which type-saving was applied.
            if (Game.isTypeSavingWord(this.currentWord) && wordComplete) {
                // The base class keyPressLetter() advances the column and changes the
                // styling of the next tile to be the input tile. But with a type-saving
                // word we want to stay in the same place, and make that tile be the
                // input tile in case the entered letter is not a word.

                // First, undo the styling to indicate that the current tile is not
                // the input tile.
                this.editTileClass(/input-tile/, "not-input-tile");

                // Now, move the current column back.
                this.currentColumn--;

                // And make this (original) current column the input tile.
                this.editTileClass(/not-input-tile/, "input-tile");

                this.appDisplay.gameKeyboardCallback(Const.ENTER);
            }
        }
    }

    // This method is called when the user clicks the Daily and Practice
    // buttons to switch games, or when the user clicks the Start Practice Game
    // button to start a new practice game.
    setGame(game) {
        this.game = game;
        this.setGameCookie();
    }

    // Set the cookie containing the words for the current game.
    setGameCookie() {
        // The list of solution words includes the start word and all
        // the words that the user has played. Get the list and
        // add the target word to it.
        let solutionWords = this.game.getSolutionInProgress().getWords();
        solutionWords.push(this.game.getTarget());

        Cookie.set(this.game.getName(), JSON.stringify(solutionWords));
    }

    // This method is called when the user changes the Game Play Mode setting.
    setHardMode(hardMode) {
        this.hardMode = hardMode;
    }

    // This method is called when the user changes the Game Play Mode setting.
    setTypeSavingMode(typeSavingMode) {
        this.typeSavingMode = typeSavingMode;
        this.game.setTypeSavingMode(typeSavingMode);
    }

    // Show the game steps given, either a daily/practice game in progress or a solution.
    showSteps() {
        const wordList = this.game.showGame();

        // Create the table and body elements.
        const tableElement = ElementUtilities.addElementTo("table", this.solutionDiv);
        const tbodyElement = ElementUtilities.addElementTo("tbody", tableElement);

        // These will hold the row number where letters typed/clicked will go,
        // and the corresponding word from wordList.
        this.currentRow = null;
        this.currentWord = "";

        // This will hold the column number where the next letter typed/clicked
        // will go (until ENTER) -- it is changed in keyPressLetter/Enter/Delete().
        this.currentColumn = 1;

        // Construct the tiles for each row, and determine which is the current row
        // (the one containing the tile that will receive input) the current column
        // (the column of the tile that will receive input).
        let inputTileDetermined = false;
        for (let row = 0; row < wordList.length; row++) {
            const word = wordList[row];

            // Create a <tr> to hold the tiles for this row.
            const rowElement = ElementUtilities.addElementTo("tr", tbodyElement, {id: TileDisplay.getTileRowId(row)});
            rowElement.setAttribute("data-word-length", word.length);

            // Construct the <td> and <div> elements for the tile.
            // No labels for the game rows, so we'll start col at 1.
            for (let col = 1; col <= Const.MAX_WORD_LENGTH; col++) {
                // Construct IDs for the tile and letter.
                const tileId    = TileDisplay.getTileId(row, col);
                const letterId  = TileDisplay.getLetterId(row, col);

                // Get the letter corresponding to col. Note: subtract 1 from col, because our
                // non-label columns start at 1.
                let letter = word[col-1]
                if (ElementUtilities.isLetter(letter)) {
                    letter = letter.toUpperCase();
                }

                // The first and last rows are the start and target words;
                // give them their own style.
                if (row == 0 || row == wordList.length - 1) {
                    // For the start/target words we don't show any extra tiles, so we are
                    // done once we hit a non-letter.
                    if (!ElementUtilities.isLetter(letter)) {
                        break;
                    }

                    // The styling for the start/target words is invariant, so add
                    // the tile and letter and move on to the next letter in the word.
                    const tdElement = ElementUtilities.addElementTo("td", rowElement, {id: tileId, class: "tile start-target-tile"});
                    ElementUtilities.addElementTo("div", tdElement, {id: letterId, class: "start-target-letter shown-letter"}, letter);
                    continue
                }

                // At this point, we know we are displaying neither the start nor
                // target row; the tiles will have different styling depending on
                // various criteria. Set defaults for variables that will indicate
                // what classes we need for the tile and letter elements.
                let tileOutlineColorClass = "tile-not-grayed";
                let tileOutlineChangeClass = "no-change";
                let tileColorClass = "not-input-tile";
                let letterHiddenClass = "hidden-letter";

                // Determine whether this is the current row: the first row whose word has
                // an unfilled letter is the current row.
                // is the current row.
                if ((this.currentRow === null) && GameTileDisplay.isUnfilledLetter(letter)) {
                    this.currentRow  = row;
                    this.currentWord = word;
                }

                // Determine whether this is the input tile and set style variable accordingly.
                // The first unfilled tile (in in the current row's word) is the one to receive input.
                if ((row === this.currentRow) && (! inputTileDetermined) && GameTileDisplay.isUnfilledLetter(letter)) {
                    this.currentColumn = col;
                    tileColorClass = "input-tile";
                    inputTileDetermined = true;
                }

                // Update the styling variables based on the letter in the word.
                if (letter === Const.CHANGE) {
                    // This is a letter in a to-be-filled-in word that is the same length as the preceding
                    // word, and this is the letter that should be changed. NOTE if the user has selected
                    // hard mode this will not be shown differently.
                    if (! this.hardMode) {
                        tileOutlineChangeClass = "letter-change";
                    }
                } else if (letter === Const.NO_CHANGE) {
                    // This is a letter in a to-be-filled-in word that requires no special styling.
                } else if (letter === Const.EXTRA) {
                    // This is a letter beyond the end of the word in "our solution".
                    if (this.currentRow === null) {
                        // We have not set current row, so this is a word that the
                        // user has played, and we don't display extra tiles, so we're done
                        // with this row.
                        continue;
                    } else {
                        // The user has not played this word, and we want to give the user an opportunity
                        // to choose a longer word, if appropriate. It is appropriate if the length of the
                        // previous word in the solution is not shorter than this word; you can't add
                        // two letters in one step. We show a tile with a gray outline to indicate
                        // it's not filled in our solution.
                        // NOTE: We cannot get the length of the words in wordList; they are all
                        // MAX_WORD_LENGTH, so we must use the game class interface.
                        if (this.game.getWordLength(row) <= this.game.getWordLength(row - 1)) {
                            tileOutlineColorClass = "tile-grayed";
                        } else {
                            // No extra tile needed, so we are done with displaying this word.
                            break;
                        }
                    }
                } else {
                    // This is a letter in an already played word, so we need to show it.
                    letterHiddenClass = "shown-letter";
                }

                // Now set the tile class based on all the variables we've set.
                // All tiles get class 'tile'
                const tileClass = `tile ${tileOutlineColorClass} ${tileOutlineChangeClass} ${tileColorClass}`;

                // And set the letter class based on the variables we've set.
                const letterClass = `${letterHiddenClass}`;

                // Finally, create the tile and letter elements.
                // Set the data-outline-change-type attribute, which is used to enable keyPressDelete() to
                // tell whether, if the user backspaces, how the tileOutlineClass needs to be reset.
                const tdElement = ElementUtilities.addElementTo(
                    "td", rowElement,
                    {
                        id: tileId,
                        class: tileClass,
                        'data-outline-change-type': tileOutlineChangeClass,
                        'data-outline-color-type': tileOutlineColorClass,
                    });
                ElementUtilities.addElementTo("div", tdElement, {id: letterId, class: letterClass}, letter);

                // We only need to show one grayed out tile per word (because a word can only
                // grow one letter per step), so break out if we've added it.
                if (tileOutlineColorClass === "tile-grayed") {
                    break;
                }
            } // end for col
        } // end for row

        // Color the tile rows according to whether the played word has
        // lengthened the solution or not.
        this.colorTiles();
    }
}

// This class specializes TileDisplay to display the grid of tiles for
// practice game word selection.

class PracticeTileDisplay extends TileDisplay {

    constructor(dict, practiceDiv) {
        super(dict);

        this.resetWords();
        this.dict = dict;
        this.practiceDiv = practiceDiv;
    }

    // Get the letters in the start word tiles, set this.startWord accordingly,
    // and return the word.
    getStartWord() {
        this.startWord = this.getWordFromTiles(0);
        if (this.startWord.length === 0) {
            this.startWord = Const.PLACEHOLDER_WORD;
        }
        return this.startWord;
    }

    // Get the letters in the target word tiles, set this.targetWord accordingly,
    // and return the word.
    getTargetWord() {
        this.targetWord = this.getWordFromTiles(1);
        if (this.targetWord.length === 0) {
            this.targetWord = Const.PLACEHOLDER_WORD;
        }
        return this.targetWord;
    }

    // This method is called from the hard or soft keydown callback in the Display
    // class when the ENTER key is pressed to enter a word during practice game
    // word selection. It returns a TileDisplay code.
    keyPressEnter() {
        // Practice word tiles will contain placeholder characters, so not all alphabetic.
        const enteredWord = this.getWordFromTiles();
        if (enteredWord.length === 0) {
            // Ignore enter if no word yet.
            return Const.OK;
        }

        // Return if the word is too short.
        if (enteredWord.length < Const.MIN_WORD_LENGTH) {
            return Const.TOO_SHORT;
        }

        // Return if the word is not in the dictionary.
        if (! this.dict.isWord(enteredWord)) {
            // Tile letter color already changed to indicate it's not a word.
            return Const.NOT_A_WORD;
        }

        // Determine which word was entered.
        if (this.currentRow === 0) {
            this.startWord = enteredWord;
        } else {
            this.targetWord = enteredWord;
        }

        return Const.OK;
    }

    // This method is called from the hard or soft keydown callback in the Display
    // class when a letter key is pressed during practice game word selection.
    keyPressLetter(keyValue) {
        // Display tiles up to the maximum word length.
        super.keyPressLetter(keyValue, Const.MAX_WORD_LENGTH);
    }

    // Reset one or both of the start/target words to the "placeholder word".
    resetWords(resetType=Const.RESET_BOTH) {

        if (resetType === Const.RESET_BOTH ||
            resetType === Const.RESET_START) {
            this.startWord = Const.PLACEHOLDER_WORD;
        }

        if (resetType === Const.RESET_BOTH ||
            resetType === Const.RESET_TARGET) {
            this.targetWord = Const.PLACEHOLDER_WORD;
        }
    }

    // Display the tiles for entering the start/target words for
    // a practice game.
    showPracticeWords() {
        const wordList = [this.startWord, this.targetWord];

        const tableElement = ElementUtilities.addElementTo("table", this.practiceDiv);
        const tbodyElement = ElementUtilities.addElementTo("tbody", tableElement);

        // This will hold the row number where letters typed/clicked will go.
        this.currentRow = null;

        // This will hold the column number where the next letter typed/clicked
        // will go (until ENTER) -- it is changed in keyPressLetter() and keyPressDelete().
        this.currentColumn = 1;

        let inputTileDetermined = false;
        const rowLabels = ["Start word:", "Target word:"];
        for (let row = 0; row < wordList.length; row++) {
            const word = wordList[row];

            // Create a <tr> to hold the tiles for this row.
            const rowElement = ElementUtilities.addElementTo("tr", tbodyElement, {id: TileDisplay.getTileRowId(row)});
            rowElement.setAttribute("data-word-length", word.length);

            // Construct the <td> and <div> elements for the tile.
            for (let col = 0; col <= word.length; col++) {
                // Construct IDs for the tile and letter.
                const tileId    = TileDisplay.getTileId(row, col);
                const letterId  = TileDisplay.getLetterId(row, col);

                // Give column 0 special styling to show label.
                if (col === 0) {
                    const tileClass = "tile-label";
                    const label     = rowLabels[row];

                    // Now, construct the elements.
                    const tdElement = ElementUtilities.addElementTo(
                        "td", rowElement,
                        {id: tileId, class: tileClass});
                    ElementUtilities.addElementTo("div", tdElement, {id: letterId, class: "label-word"}, label);

                    continue;
                }

                // If we're here we're dealing with a letter tile (not a label).
                // Pull out the letter.
                const letter = word[col-1].toUpperCase();

                // Determine whether this is the current row. The first row whose word begins
                // with a placeholder is current: it needs to be entered.
                if ((this.currentRow === null) && (col === 1) && (word[0] === Const.PLACEHOLDER)){
                    this.currentRow = row;
                }

                let tileClass = "tile";

                // Determine whether this is the input tile and style accordingly.
                // The first non-alphabetic tile (in in the current row's word)
                // is the one to receive input.
                if ((row === this.currentRow) && (! inputTileDetermined) && (! ElementUtilities.isLetter(word[col-1]))) {
                    tileClass += " input-tile";
                    inputTileDetermined = true;
                } else {
                    tileClass += " not-input-tile";
                }

                // Set letterClass based on the letter in the word.
                let letterClass;
                if (letter === Const.NO_CHANGE) {
                    // Letter hasn't been entered yet; don't show the NO_CHANGE.
                    letterClass = "hidden-letter";
                } else {
                    // Letter has been entered; show it.
                    letterClass = "shown-letter";
                }

                // Finally, create the elements.
                const tdElement = ElementUtilities.addElementTo(
                    "td", rowElement,
                    {id: tileId, class: tileClass});
                ElementUtilities.addElementTo("div", tdElement, {id: letterId, class: letterClass}, letter);
            } // end for col
        } // end for row
    }
}

export { TileDisplay, GameTileDisplay, PracticeTileDisplay };
