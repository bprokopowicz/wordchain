import { BaseLogger } from './BaseLogger.js';
import { ElementUtilities } from './ElementUtilities.js';
import { Game } from './Game.js';

class TileDisplay extends BaseLogger {

    // This will appear as a Toast Notification
    static NOT_A_WORD = "Not a word";
    static TOO_SHORT  = "Too short";

    // This will NOT appear as a Toast Notification
    static OK = "OK"

    static TILES_ALL_ALPHABETIC = true;
    static TILES_NOT_ALL_ALPHABETIC = false;

    constructor(dict, containingDiv) {
        super();

        this.dict = dict;
        this.containingDiv = containingDiv;
    }

    editClassForCurrentWord(fromPattern, toString, element, elementGetter) {
        if (element) {
            ElementUtilities.editClass(fromPattern, toString, element);
        } else {
            let elements = [];
            const wordLength = this.getCurrentWordLength();
            for (let col = 1; col <= wordLength; col++) {
                elements.push(elementGetter(this.currentRow, col));
            }

            ElementUtilities.editClass(fromPattern, toString, elements);
        }
    }

    editLetterClass(fromPattern, toString, element=null) {
        this.editClassForCurrentWord(fromPattern, toString, element, TileDisplay.getLetterElement);
    }

    editTileClass(fromPattern, toString, element=null) {
        this.editClassForCurrentWord(fromPattern, toString, element, TileDisplay.getTileElement);
    }

    getCurrentWordLength() {
        const rowElement = TileDisplay.getTileRowElement(this.currentRow);
        return rowElement.getAttribute("data-word-length");
    }

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

    getWordFromTiles(requireAllAlphabetic) {
        let column = 1;
        let enteredWord = '';
        while (true) {
            const letterElement = TileDisplay.getLetterElement(this.currentRow, column);
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

    keyPressDelete() {
        // If user clicks delete beyond beginning of row, just return;
        if (this.currentColumn <= 1) {
            return;
        }
        this.currentColumn--;

        const tileElement = TileDisplay.getTileElement(this.currentRow, this.currentColumn);

        if (tileElement.getAttribute("data-tile-type") === "change") {
            this.editTileClass(/no-change/, "letter-change", tileElement);
        }
        this.editTileClass(/no-enter/, "tile-enter", tileElement);

        if (this.currentColumn != this.getCurrentWordLength()) {
            const nextTileElement = TileDisplay.getTileElement(this.currentRow, this.currentColumn + 1);
            this.editTileClass(/tile-enter/, "no-enter", nextTileElement);
        }

        const letterElement = TileDisplay.getLetterElement(this.currentRow, this.currentColumn);
        letterElement.innerHTML = Game.NO_CHANGE;
        this.editLetterClass(/shown-letter/, "hidden-letter", letterElement);
        this.editLetterClass(/not-a-word/, "is-a-word");
    }

    keyPressLetter(keyValue, wordLength) {
        if (this.currentColumn < 1) {
            this.currentColumn = 1;
        }

        const tileElement = TileDisplay.getTileElement(this.currentRow, this.currentColumn);

        // If user types or clicks beyond the last box in the current word being
        // played, just return.
        if (! tileElement) {
            return;
        }

        tileElement.setAttribute("class", "tile no-enter no-change");

        const letterElement = TileDisplay.getLetterElement(this.currentRow, this.currentColumn);
        letterElement.innerHTML = keyValue.toUpperCase();
        this.editLetterClass(/hidden-letter/, "shown-letter", letterElement);

        this.currentColumn++;

        if (this.currentColumn > wordLength) {
            const enteredWord = this.getWordFromTiles(TileDisplay.TILES_ALL_ALPHABETIC);
            if (! this.dict.isWord(enteredWord)) {
                this.editLetterClass(/is-a-word/, "not-a-word");
            }
        } else {
            // Next element is the one to show as the one that the clicked
            // letter will set.
            const nextTileElement = TileDisplay.getTileElement(this.currentRow, this.currentColumn);
            this.editTileClass(/no-enter/, "tile-enter", nextTileElement);
        }
    }

    showTiles(wordList, containingDiv, isNewRow, isEntryTile, rowLabels=[]) {
        // Delete current child elements.
        ElementUtilities.deleteChildren(containingDiv);

        const tableElement = ElementUtilities.addElementTo("table", containingDiv);
        const tbodyElement = ElementUtilities.addElementTo("tbody", tableElement);

        // This will hold the row number where letters typed/clicked will go.
        this.currentRow = null;

        // This will hold the column number where the next letter typed/clicked
        // will go (until ENTER) -- it is set in keyPressLetter().
        this.currentColumn = 1;

        let tileEntryDetermined = false;
        for (let row = 0; row < wordList.length; row++) {
            const word = wordList[row];
            const rowElement = ElementUtilities.addElementTo("tr", tbodyElement, {id: TileDisplay.getTileRowId(row)});
            rowElement.setAttribute("data-word-length", word.length);

            for (let col = 0; col <= word.length; col++) {
                if (col === 0) {
                    const tileId    = TileDisplay.getTileId(row, col);
                    const letterId  = TileDisplay.getLetterId(row, col);
                    const tileType  = "no-change";
                    const tileClass = (rowLabels.length !== 0) ? "tile-label" : "tile-label-blank";
                    const label     = (rowLabels.length !== 0) ? rowLabels[row] : "";

                    const tdElement = ElementUtilities.addElementTo(
                        "td", rowElement,
                        {id: tileId, class: tileClass, 'data-tile-type': tileType}
                        );
                    ElementUtilities.addElementTo("div", tdElement, {id: letterId, class: "label-word"}, label);
                    continue;
                }

                const letter = word[col-1].toUpperCase();
                let tileClass = "tile";

                if ((this.currentRow === null) && isNewRow(word, col)) {
                    this.currentRow = row;
                }

                if ((row === this.currentRow) && ! tileEntryDetermined && isEntryTile(word, col)) {
                    tileClass += " tile-enter";
                    tileEntryDetermined = true;
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

                if (row == wordList.length - 1) {
                    letterClass += " target-word";
                }

                const tileId = TileDisplay.getTileId(row, col);
                const letterId = TileDisplay.getLetterId(row, col);
                const tdElement = ElementUtilities.addElementTo("td", rowElement, {id: tileId, class: tileClass, 'data-tile-type': tileType});
                ElementUtilities.addElementTo("div", tdElement, {id: letterId, class: letterClass}, letter);
            }
        }
    }
}

class GameTileDisplay extends TileDisplay {
    // These will appear as Toast Notifications
    static ALREADY_PLAYED = "Already played";
    static INCOMPLETE = "Incomplete"
    static NO_SOLUTION = "No solution";
    static NOT_ONE_STEP = "Not one step";

    static GAME_TO_TILE_DISPLAY = {};

    constructor(game, dict, solutionDiv) {
        super(dict, solutionDiv);

        this.setGame(game);
        this.dict = dict;
        this.solutionDiv = solutionDiv;

        GameTileDisplay.GAME_TO_TILE_DISPLAY[Game.OK]           = TileDisplay.OK;
        GameTileDisplay.GAME_TO_TILE_DISPLAY[Game.NOT_ONE_STEP] = GameTileDisplay.NOT_ONE_STEP;
        GameTileDisplay.GAME_TO_TILE_DISPLAY[Game.DEAD_END]     = GameTileDisplay.NO_SOLUTION;
        GameTileDisplay.GAME_TO_TILE_DISPLAY[Game.DUPLICATE]    = GameTileDisplay.ALREADY_PLAYED;
    }

    keyPressEnter() {
        const enteredWord = this.getWordFromTiles(TileDisplay.TILES_ALL_ALPHABETIC);
        if (! enteredWord) {
            return GameTileDisplay.INCOMPLETE;
        }

        if (! this.dict.isWord(enteredWord)) {
            // Tile letter color already changed to indicate it's not a word.
            return TileDisplay.NOT_A_WORD;
        }

        return GameTileDisplay.GAME_TO_TILE_DISPLAY[this.game.playWord(enteredWord)];
    }

    keyPressLetter(keyValue) {
        super.keyPressLetter(keyValue, this.getCurrentWordLength());
    }

    setGame(game) {
        this.game = game;
    }

    showGameTiles(showSolution) {
        // Just return if we haven't started the game yet.
        if (! this.game) {
            return;
        }

        let gameSteps;
        if (showSolution) {
            gameSteps = this.game.getKnownSolution().getWords();
        } else {
            gameSteps = this.game.showGame();
        }
        this.showTiles(
            gameSteps,
            this.solutionDiv,
            (word, column) => {return ! ElementUtilities.isLetter(word[column-1]);},
            (word, column) => {return ! ElementUtilities.isLetter(word[column-1]);},
            );
    }

    showSolution() {
        this.showGameTiles(true);
    }

    showSteps() {
        this.showGameTiles(false);
    }

}

class PracticeTileDisplay extends TileDisplay {
    static MIN_WORD_LENGTH = 3;
    static MAX_WORD_LENGTH = 6;

    static PLACEHOLDER = "*";

    constructor(dict, practiceDiv) {
        super(dict, practiceDiv);

        this.resetWords();
        this.dict = dict;
        this.practiceDiv = practiceDiv;
    }

    getWords() {
        const startWord  = this.startWord[0]  === PracticeTileDisplay.PLACEHOLDER ? "" : this.startWord;
        const targetWord = this.targetWord[0] === PracticeTileDisplay.PLACEHOLDER ? "" : this.targetWord;
        return [startWord, targetWord];
    }

    keyPressEnter() {
        // Practice word tiles will contain placeholder characters, so not all alphabetic.
        const enteredWord = this.getWordFromTiles(TileDisplay.TILES_NOT_ALL_ALPHABETIC);
        if (enteredWord.length === 0) {
            // Ignore enter if no word yet.
            return TileDisplay.OK;
        }
        if (enteredWord.length < PracticeTileDisplay.MIN_WORD_LENGTH) {
            return TileDisplay.TOO_SHORT;
        }

        if (! this.dict.isWord(enteredWord)) {
            // Tile letter color already changed to indicate it's not a word.
            return TileDisplay.NOT_A_WORD;
        }

        if (this.currentRow === 0) {
            this.startWord = enteredWord;
        } else {
            this.targetWord = enteredWord;
        }

        return TileDisplay.OK;
    }

    keyPressLetter(keyValue) {
        super.keyPressLetter(keyValue, PracticeTileDisplay.MAX_WORD_LENGTH);
    }

    resetWords() {
        this.startWord  = PracticeTileDisplay.PLACEHOLDER.repeat(PracticeTileDisplay.MAX_WORD_LENGTH);
        this.targetWord = this.startWord;
    }

    showPracticeWords() {
        this.showTiles(
            [this.startWord, this.targetWord],
            this.practiceDiv,
            (word, column) => {return ((column === 1) && (word[0] === PracticeTileDisplay.PLACEHOLDER));},
            (word, column) => {
                let firstUnenteredLetter = word.indexOf(PracticeTileDisplay.PLACEHOLDER);
                return (firstUnenteredLetter < 0) ? false : firstUnenteredLetter + 1 === column;
            },
            ["Start word:", "Target word:"]
            );
    }
}

export { TileDisplay, GameTileDisplay, PracticeTileDisplay };
