import { BaseLogger } from './BaseLogger.js';
import { ElementUtilities } from './ElementUtilities.js';
import { Game } from './Game.js';

class TileDisplay extends BaseLogger {

    constructor(game, dict, solutionDiv) {
        super();

        this.setGame(game);
        this.dict = dict;
        this.solutionDiv = solutionDiv;
    }

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

    getWordFromTiles() {
        let column = 0;
        let enteredWord = '';
        while (true) {
            const letterElement = TileDisplay.getLetterElement(this.currentRow, column);
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

        const tileElement = TileDisplay.getTileElement(this.currentRow, this.currentColumn);

        if (tileElement.getAttribute("data-tile-type") === "change") {
            this.editTileClass(/no-change/, "letter-change", tileElement);
        }
        this.editTileClass(/no-enter/, "tile-enter", tileElement);

        if (this.currentColumn != this.getCurrentWordLength() - 1) {
            const nextTileElement = TileDisplay.getTileElement(this.currentRow, this.currentColumn + 1);
            this.editTileClass(/tile-enter/, "no-enter", nextTileElement);
        }

        const letterElement = TileDisplay.getLetterElement(this.currentRow, this.currentColumn);
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

        return this.game.playWord(enteredWord);

        /*
        if (gameResult !== Game.OK) {
            alert(gameResult);
        } else {
            this.showGameTiles(Display.SHOW_STEPS);
            this.updateDisplay(Display.SHOW_STEPS);
        }
        */
    }

    keyPressLetter(keyValue) {
        // If current row has not been set, then we must be displaying a solution.
        if (! this.currentRow) {
            return;
        }

        if (this.currentColumn < 0) {
            this.currentColumn = 0;
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

        if (this.currentColumn >= this.getCurrentWordLength()) {
            const enteredWord = this.getWordFromTiles();
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

    showGameTiles(showSolution) {
        // Just return if we haven't started the game yet.
        if (! this.game) {
            return;
        }

        // Delete current child elements.
        ElementUtilities.deleteChildren(this.solutionDiv);

        const tableElement = ElementUtilities.addElementTo("table", this.solutionDiv);
        const tbodyElement = ElementUtilities.addElementTo("tbody", tableElement);

        // This will hold the row number where letters typed/clicked will go.
        this.currentRow = null;

        // This will hold the column number where the next letter typed/clicked
        // will go (until ENTER) -- it is set in keyPressLetter().
        this.currentColumn = 0;

        let gameSteps;
        if (showSolution) {
            gameSteps = this.game.getKnownSolution().getWords();
        } else {
            gameSteps = this.game.showGame();
        }

        for (let row = 0; row < gameSteps.length; row++) {
            const word = gameSteps[row];
            const rowElement = ElementUtilities.addElementTo("tr", tbodyElement, {id: TileDisplay.getTileRowId(row)});
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

                const tileId = TileDisplay.getTileId(row, col);
                const letterId = TileDisplay.getLetterId(row, col);
                const tdElement = ElementUtilities.addElementTo("td", rowElement, {id: tileId, class: tileClass, 'data-tile-type': tileType});
                ElementUtilities.addElementTo("div", tdElement, {id: letterId, class: letterClass}, letter);
            }
        }

    }

    setGame(game) {
        this.game = game;
    }

}

export { TileDisplay };
