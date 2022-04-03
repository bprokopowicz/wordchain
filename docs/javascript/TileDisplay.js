import { BaseLogger } from './BaseLogger.js';
import { ElementUtilities } from './ElementUtilities.js';
import { Game } from './Game.js';

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

    // These will appear as a Toast Notification
    static NOT_A_WORD = "Not a word";
    static TOO_SHORT  = "Too short";

    // This will NOT appear as a Toast Notification
    static OK = "OK"

    static TILES_ALL_ALPHABETIC = true;
    static TILES_NOT_ALL_ALPHABETIC = false;

    constructor(dict) {
        super();
        this.dict = dict;
    }

    // Edit the element class for a single letter or all the letters in the
    // current word, given a pattern to replace and a string to replace it with.
    // If a non-null element is given (presumably a tile or letter in the current word)
    // just that element is modified. Otherwise an "elementGetter" method is supplied that
    // takes a row and column of the tile grid and returns the corresponding element.
    // The main code calls one of the two wrappers below.
    editClassForCurrentWord(fromPattern, toString, element, elementGetter) {
        let elements = [];
        if (element) {
            elements.push(element)
        } else {
            const wordLength = this.getCurrentWordLength();
            for (let col = 1; col <= wordLength; col++) {
                elements.push(elementGetter(this.currentRow, col));
            }
        }
        ElementUtilities.editClass(fromPattern, toString, elements);
    }

    editLetterClass(fromPattern, toString, element=null) {
        this.editClassForCurrentWord(fromPattern, toString, element, TileDisplay.getLetterElement);
    }

    editTileClass(fromPattern, toString, element=null) {
        this.editClassForCurrentWord(fromPattern, toString, element, TileDisplay.getTileElement);
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
    // If requireAllAlphabetic is true, when a non-alphabetic is encountered
    // this function will return null. Otherwise, it returns all the alphabetic
    // tile values as a string.
    getWordFromTiles(requireAllAlphabetic, row=null) {
        if (row === null) {
            row = this.currentRow;
        }

        // We'll build up the entered word from the tils as we loop.
        let enteredWord = '';
        let column = 1;
        while (true) {
            const letterElement = TileDisplay.getLetterElement(row, column);
            if (! letterElement) {
                break;
            }

            const letter = letterElement.innerHTML;
            if (! ElementUtilities.isLetter(letter)) {
                // If we hit a non-alphabetic (e.g. a placeholder character for the
                // game or in practice word start/target word) and we require all
                // alphabetic for a word, that signifies that we don't yet have
                // a complete word, so return null. Otherwise, break and return the
                // the alphabetic characters.
                if (requireAllAlphabetic) {
                    return null;
                } else {
                    break;
                }
            }
            enteredWord += letter;
            column++;
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

        // We've moved back, so style the current input tile element to
        // indicate it is no longer the input tile element.
        const initialInputTileElement = TileDisplay.getTileElement(this.currentRow, this.currentColumn);
        this.editTileClass(/tile-enter/, "no-enter", initialInputTileElement);

        // Current column is now one back.
        this.currentColumn--;

        // Get the tile element for this row and if it is a tile that the game "says"
        // should be changed next, style it to indicate that ... unless the user has
        // selected hard mode.
        const tileElement = TileDisplay.getTileElement(this.currentRow, this.currentColumn);
        if ((tileElement.getAttribute("data-tile-type") === "change") && (! this.hardMode)) {
            this.editTileClass(/no-change/, "letter-change", tileElement);
        }

        // Show that this tile element is the one that will get input.
        this.editTileClass(/no-enter/, "tile-enter", tileElement);

        // Set the letter to Game.NO_CHANGE so the rest of the app knows
        // this is not an entered letter yet, and style it accordingly.
        const letterElement = TileDisplay.getLetterElement(this.currentRow, this.currentColumn);
        letterElement.innerHTML = Game.NO_CHANGE;
        this.editLetterClass(/shown-letter/, "hidden-letter", letterElement);

        // In case we had styled as not a word during game play, restyle once the
        // user backspaces to fix it.
        this.editLetterClass(/not-a-word/, "is-a-word");
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
        tileElement.setAttribute("class", "tile no-enter no-change");

        // Show the letter that was typed.
        const letterElement = TileDisplay.getLetterElement(this.currentRow, this.currentColumn);
        letterElement.innerHTML = keyValue.toUpperCase();
        this.editLetterClass(/hidden-letter/, "shown-letter", letterElement);

        // Move ahead one letter.
        this.currentColumn++;

        // If the whole word has been entered check to see whether it's in the dictionary,
        // and if not, style it to indicate that.
        if (this.currentColumn > wordLength) {
            const enteredWord = this.getWordFromTiles(TileDisplay.TILES_ALL_ALPHABETIC);
            if (! this.dict.isWord(enteredWord)) {
                this.editLetterClass(/is-a-word/, "not-a-word");
            }

        // Otherwise, the style the next tile to indicate it will receive input.
        } else {
            const nextTileElement = TileDisplay.getTileElement(this.currentRow, this.currentColumn);
            this.editTileClass(/no-enter/, "tile-enter", nextTileElement);
        }
    }
}

// This class specializes TileDisplay to display the grid of tiles for
// daily/practice game play.

class GameTileDisplay extends TileDisplay {
    // These will appear as Toast Notifications
    static ALREADY_PLAYED = "Already played";
    static INCOMPLETE = "Word Incomplete"
    static NO_SOLUTION = "No solution";
    static NOT_ONE_STEP = "Not one step";

    // Mapping from Game class values to TileDisplay/GameTileDisplay values.
    static GAME_TO_TILE_DISPLAY = {};

    constructor(game, dict, solutionDiv) {
        super(dict);

        this.setGame(game);
        this.dict = dict;
        this.solutionDiv = solutionDiv;

        this.hardMode = false;

        GameTileDisplay.GAME_TO_TILE_DISPLAY[Game.OK]           = TileDisplay.OK;
        GameTileDisplay.GAME_TO_TILE_DISPLAY[Game.NOT_ONE_STEP] = GameTileDisplay.NOT_ONE_STEP;
        GameTileDisplay.GAME_TO_TILE_DISPLAY[Game.DEAD_END]     = GameTileDisplay.NO_SOLUTION;
        GameTileDisplay.GAME_TO_TILE_DISPLAY[Game.DUPLICATE]    = GameTileDisplay.ALREADY_PLAYED;
    }

    // Color the tiles in the game display to indicate for each of the user's
    // played words whether it made the solution longer (red) or not (green).
    colorTiles() {
        // Make a copy of the game's count history because we're going to shift
        // all of the items off of it and we don't want to clobber what's in the
        // game object.
        let countHistory = [...this.game.getCountHistory()];

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
            for (let col = 1; col <= PracticeTileDisplay.MAX_WORD_LENGTH; col++) {
                const tileElement = TileDisplay.getTileElement(row, col);
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

    // This is called when the user clicks the Show Solution button
    // and is simply passed along to the game.
    endGame() {
        this.game.endGame();
    }

    // This method is called from the hard or soft keydown callback in the AppDisplay
    // class when the ENTER key is pressed to enter a word during game play.
    keyPressEnter() {
        const enteredWord = this.getWordFromTiles(TileDisplay.TILES_ALL_ALPHABETIC);
        if (! enteredWord) {
            return GameTileDisplay.INCOMPLETE;
        }

        // Return if the word is not in our dictionary.
        if (! this.dict.isWord(enteredWord)) {
            // Tile letter color already changed to indicate it's not a word.
            return TileDisplay.NOT_A_WORD;
        }

        // Play the word.
        const playResult = this.game.playWord(enteredWord);

        // Return (a translated version of) the result.
        return GameTileDisplay.GAME_TO_TILE_DISPLAY[playResult];
    }

    // This method is called from the hard or soft keydown callback in the AppDisplay
    // class when a letter key is pressed during game play.
    keyPressLetter(keyValue) {
        // Display tiles up to the the current word's length.
        super.keyPressLetter(keyValue, this.getCurrentWordLength());
    }

    // This method is called when the user clicks the Daily and Practice
    // buttons to switch games, or when the user clicks the Start Practice Game
    // button to start a new practice game.
    setGame(game) {
        this.game = game;
    }

    // This method is called when the user changes the Hard Mode setting.
    setHardMode(hardMode) {
        this.hardMode = hardMode;
    }

    // Show the game steps given, either a daily/practice game in progress or a solution.
    showSteps() {
        const wordList = this.game.showGame();

        // Create the table and body elements.
        const tableElement = ElementUtilities.addElementTo("table", this.solutionDiv);
        const tbodyElement = ElementUtilities.addElementTo("tbody", tableElement);

        // This will hold the row number where letters typed/clicked will go.
        this.currentRow = null;

        // This will hold the column number where the next letter typed/clicked
        // will go (until ENTER) -- it is changed in keyPressLetter() and keyPressDelete().
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
            for (let col = 0; col <= word.length; col++) {
                // Construct IDs for the tile and letter.
                const tileId    = TileDisplay.getTileId(row, col);
                const letterId  = TileDisplay.getLetterId(row, col);

                // Set the tile type, which will be updated as we go.
                let tileType = "no-change";

                // Give column 0 special styling to not show the label.
                if (col === 0) {
                    // Now, construct the elements.
                    const tdElement = ElementUtilities.addElementTo(
                        "td", rowElement,
                        {id: tileId, class: "tile-label-blank", 'data-tile-type': tileType}
                        );
                    continue;
                }

                // If we're here we're dealing with a letter tile (not a label).
                // Pull out the letter.
                const letter = word[col-1].toUpperCase();

                let tileClass = "tile";
                let letterClass = "is-a-word";

                // Determine whether this is the current row: the first row whose word has
                // a non-alphabetic character is the current row.
                // Note: subtract 1 from col, because our non-label columns start at 1.
                if ((this.currentRow === null) && ! ElementUtilities.isLetter(word[col-1])) {
                    this.currentRow = row;
                }

                // The first and last rows are the start and target words;
                // give them their own style.
                if (row == 0 || row == wordList.length - 1) {
                    letterClass += " start-target-letter";
                    tileClass   += " start-target-tile";
                } else {
                    // Determine whether this is the input tile and style accordingly.
                    // The first non-alphabetic tile (in in the current row's word)
                    // is the one to receive input.
                    if (! inputTileDetermined && ! ElementUtilities.isLetter(word[col-1])) {
                        tileClass += " tile-enter";
                        inputTileDetermined = true;
                    } else {
                        tileClass += " no-enter";
                    }
                }

                // Set tileType, tileClass, and letterClass based on the letter in the word.
                if (letter === Game.CHANGE) {
                    // This is a letter in a to-be-filled-in word that is the same length as the preceding
                    // word, and this is the letter that should be changed. NOTE if the user has selected
                    // hard mode this will not be shown differently.
                    if (! this.hardMode) {
                        tileClass += " letter-change";
                        tileType = "change";
                    }
                    letterClass += " hidden-letter";
                } else if (letter === Game.NO_CHANGE) {
                    // This is a letter in a to-be-filled-in word that does not get "change this one"
                    // styling, but should be hidden (because it's still to be filled in!).
                    // No harm in giving the tile class "no-change" class even if the user has
                    // selected hard mode.
                    tileClass += " no-change";
                    letterClass += " hidden-letter";
                } else {
                    // This is a letter in an already played word, so show it, but without "change this
                    // one" styling (again, regardles of hard mode).
                    tileClass += " no-change";
                    letterClass += " shown-letter";
                }

                // Finally, create the tile and letter elements.
                const tdElement = ElementUtilities.addElementTo(
                    "td", rowElement,
                    {id: tileId, class: tileClass, 'data-tile-type': tileType});
                ElementUtilities.addElementTo("div", tdElement, {id: letterId, class: letterClass}, letter);
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
    static MIN_WORD_LENGTH = 3;
    static MAX_WORD_LENGTH = 6;

    static PLACEHOLDER = "*";
    static PLACEHOLDER_WORD = PracticeTileDisplay.PLACEHOLDER.repeat(PracticeTileDisplay.MAX_WORD_LENGTH);

    static RESET_START  = "start";
    static RESET_TARGET = "target";
    static RESET_BOTH   = "both";

    constructor(dict, practiceDiv) {
        super(dict);

        this.resetWords();
        this.dict = dict;
        this.practiceDiv = practiceDiv;
    }

    // Get the letters in the start word tiles, set this.startWord accordingly,
    // and return the word.
    getStartWord() {
        this.startWord = this.getWordFromTiles(TileDisplay.TILES_NOT_ALL_ALPHABETIC, 0);
        if (this.startWord.length === 0) {
            this.startWord = PracticeTileDisplay.PLACEHOLDER_WORD;
        }
        return this.startWord;
    }

    // Get the letters in the target word tiles, set this.targetWord accordingly,
    // and return the word.
    getTargetWord() {
        this.targetWord = this.getWordFromTiles(TileDisplay.TILES_NOT_ALL_ALPHABETIC, 1);
        if (this.targetWord.length === 0) {
            this.targetWord = PracticeTileDisplay.PLACEHOLDER_WORD;
        }
        return this.targetWord;
    }

    // This method is called from the hard or soft keydown callback in the Display
    // class when the ENTER key is pressed to enter a word during practice game
    // word selection. It returns a TileDisplay code.
    keyPressEnter() {
        // Practice word tiles will contain placeholder characters, so not all alphabetic.
        const enteredWord = this.getWordFromTiles(TileDisplay.TILES_NOT_ALL_ALPHABETIC);
        if (enteredWord.length === 0) {
            // Ignore enter if no word yet.
            return TileDisplay.OK;
        }

        // Return if the word is too short.
        if (enteredWord.length < PracticeTileDisplay.MIN_WORD_LENGTH) {
            return TileDisplay.TOO_SHORT;
        }

        // Return if the word is not in the dictionary.
        if (! this.dict.isWord(enteredWord)) {
            // Tile letter color already changed to indicate it's not a word.
            return TileDisplay.NOT_A_WORD;
        }

        // Determine which word was entered.
        if (this.currentRow === 0) {
            this.startWord = enteredWord;
        } else {
            this.targetWord = enteredWord;
        }

        return TileDisplay.OK;
    }

    // This method is called from the hard or soft keydown callback in the Display
    // class when a letter key is pressed during practice game word selection.
    keyPressLetter(keyValue) {
        // Display tiles up to the maximum word length.
        super.keyPressLetter(keyValue, PracticeTileDisplay.MAX_WORD_LENGTH);
    }

    // Reset one or both of the start/target words to the "placeholder word".
    resetWords(resetType=PracticeTileDisplay.RESET_BOTH) {

        if (resetType === PracticeTileDisplay.RESET_BOTH ||
            resetType === PracticeTileDisplay.RESET_START) {
            this.startWord = PracticeTileDisplay.PLACEHOLDER_WORD;
        }

        if (resetType === PracticeTileDisplay.RESET_BOTH ||
            resetType === PracticeTileDisplay.RESET_TARGET) {
            this.targetWord = PracticeTileDisplay.PLACEHOLDER_WORD;
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
        const tileType  = "no-change";
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
                        {id: tileId, class: tileClass, 'data-tile-type': tileType});
                    ElementUtilities.addElementTo("div", tdElement, {id: letterId, class: "label-word"}, label);

                    continue;
                }

                // If we're here we're dealing with a letter tile (not a label).
                // Pull out the letter.
                const letter = word[col-1].toUpperCase();

                // Determine whether this is the current row. The first row whose word begins
                // with a placeholder is current: it needs to be entered.
                if ((this.currentRow === null) && (col === 1) && (word[0] === PracticeTileDisplay.PLACEHOLDER)){
                    this.currentRow = row;
                }

                let tileClass = "tile";

                // Determine whether this is the input tile and style accordingly.
                // The first non-alphabetic tile (in in the current row's word)
                // is the one to receive input.
                if ((row === this.currentRow) && (! inputTileDetermined) && (! ElementUtilities.isLetter(word[col-1]))) {
                    tileClass += " tile-enter";
                    inputTileDetermined = true;
                } else {
                    tileClass += " no-enter";
                }

                // Set letterClass based on the letter in the word.
                let letterClass;
                if (letter === Game.NO_CHANGE) {
                    // Letter hasn't been entered yet; don't show the NO_CHANGE.
                    letterClass = "hidden-letter";
                } else {
                    // Letter has been entered; show it.
                    letterClass = "shown-letter";
                }

                // Finally, create the elements.
                const tdElement = ElementUtilities.addElementTo(
                    "td", rowElement,
                    {id: tileId, class: tileClass, 'data-tile-type': tileType});
                ElementUtilities.addElementTo("div", tdElement, {id: letterId, class: letterClass}, letter);
            } // end for col
        } // end for row
    }
}

export { TileDisplay, GameTileDisplay, PracticeTileDisplay };
