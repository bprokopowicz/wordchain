import { BaseLogger } from './BaseLogger.js';
import { ElementUtilities } from './ElementUtilities.js';
import { Game } from './Game.js';
import { Picker } from './Picker.js';
import * as Const from './Const.js';

import { AdditionCell, DeletionCell, ActiveLetterCell, FutureLetterCell, PlayedLetterCell, TargetLetterCell } from './Cell.js';


class GameDisplay extends BaseLogger {

    /* ----- Construction ----- */

    constructor(appDisplay, gameDiv, pickerDiv, pickerId) {

        super();

        this.appDisplay = appDisplay;

        this.gameDiv   = gameDiv;
        this.pickerDiv = pickerDiv;
        this.pickerId = pickerId;

        this.createPicker();

        // This will be (re)populated in showGameAfterMove().
        // This is an array of three-element arrays, which act like a Python tuple:
        // the word, whether it was played, and whether it was correct(relevant
        // only if it was played).
        this.gameState = [];

        // parse any URL query-string variables and save them as this.queryVars[]
        this.parseQueryString();


        // Derived class constructor must call constructGame().
    }

    /* ----- Query string variable parsing */

    parseQueryString() {
        const queryString = window.location.search;
        this.queryVars = new Map();
        var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
        for (let pair of pairs) {
            var keyVal = pair.split('=');
            this.queryVars.set(keyVal[0], keyVal[1] || '');
        }
    }

    /* ----- Picker ----- */

    createPicker() {
        this.letterPicker = new Picker(this, this.pickerDiv, this.pickerId);
        this.currentLetter = " ";
    }

    disablePicker() {
        this.letterPicker.disable();
    }

    enablePicker() {
        this.letterPicker.enable();
    }

    // This is kind of a callback, but doesn't really follow our callback
    // protocol because of how the picker is implemented as a separate object.
    letterPicked(letter, letterPosition) {
        Const.GL_DEBUG && this.logDebug("letterPicked(): letter:", letter, ", letterPosition:", letterPosition, "picker");

        if (this.game.isOver()) {
            console.error("GameDisplay.letterPicked(): game is already over");
            return Const.UNEXPECTED_ERROR;
        }

        if (letter === this.currentLetter) {
            this.letterPicker.clear();
            this.appDisplay.showToast(Const.PICK_NEW_LETTER);
            return Const.PICK_NEW_LETTER;
        }

        let gameResult = this.game.playLetter(letterPosition, letter);
        this.processGameResult(gameResult);
        // if the sub-class wants to persist anything after a letter is picked, it should do it by overriding this "pure-virtual" call.
        this.updateGameInProgressPersistence(gameResult);
        return gameResult;
    }

    /* ----- Game ----- */

    addTd() {
        return ElementUtilities.addElementTo("td", this.rowElement, {class: 'td-game'});
    }

    // Called from derived class!
    constructGame(start, target, gameState) {
        Const.GL_DEBUG && this.logDebug ("GameDisplay.constructGame(): start: ", start, " target: ", target, " gameState: ", gameState, "game");
        this.game = new Game(start, target, gameState);
        this.showGameAfterMove();
        this.wrongMoves = 0;
    }

    displayAdd(displayInstruction) {
        const me = this;

        function getCell(letter, letterPosition) {
            return new ActiveLetterCell(letter, letterPosition, me.letterPicker,
                displayInstruction.moveRating, displayInstruction.changePosition);
        }

        this.pickerEnabled = false;
        // Pass false for hideAdditionCells.
        this.displayCommon(displayInstruction, getCell, false);
    }

    displayChange(displayInstruction) {
        const me = this;

        function getCell(letter, letterPosition) {
            return new ActiveLetterCell(letter, letterPosition, me.letterPicker,
                displayInstruction.moveRating, displayInstruction.changePosition);
        }

        // changePosition goes 1..wordLength, so need to subtract 1.
        this.currentLetter = displayInstruction.word[displayInstruction.changePosition - 1];
        this.pickerEnabled = true;
        this.displayCommon(displayInstruction, getCell);
    }

    displayDelete(displayInstruction, tableElement) {
        const me = this;

        // First, display the letter cells.
        function getActiveLetterCell(letter, letterPosition) {
            return new ActiveLetterCell(letter, letterPosition, me.letterPicker,
                displayInstruction.moveRating, displayInstruction.changePosition);
        }

        this.displayCommon(displayInstruction, getActiveLetterCell);

        // Now we add an extra <tr> element for the deletion cell row.
        this.rowElement = ElementUtilities.addElementTo("tr", tableElement, {class: "tr-game"});

        // we need to use a copy of 'this' as 'me' in the body of this local function
        function getDeletionCell(letter, letterPosition) {
            return new DeletionCell(letterPosition, me, me.deletionClickCallback);
        }

        // Disable the picker (because it is not used during deletion) and then display.
        this.pickerEnabled = false;
        this.displayCommon(displayInstruction, getDeletionCell);
    }

    displayFuture(displayInstruction) {
        function getCell(letter, letterPosition) {
            return new FutureLetterCell(letter, letterPosition, displayInstruction.changePosition);
        }

        this.displayCommon(displayInstruction, getCell);
    }

    displayPlayed(displayInstruction) {
        function getCell(letter, letterPosition) {
            return new PlayedLetterCell(letter, displayInstruction.moveRating);
        }

        this.displayCommon(displayInstruction, getCell);
    }

    displayTarget(displayInstruction) {
        var gameOver = false;
        var rating = Const.OK;

        function getCell(letter, __letterPosition) {
            return new TargetLetterCell(letter, rating, gameOver);
        }

        // The only condition for displaying the Target as not OK is if the game is
        // over and we are not a winner (too many wrong moves, etc)
        if (this.game.isOver()) {
            gameOver = true;

            if (this.game.isWinner()) {
                rating = Const.OK;
            } else {
                rating = Const.WRONG_MOVE;
            }
        }

        this.displayCommon(displayInstruction, getCell);
    }

    getGame() {
        return this.game;
    }

    showGameAfterMove() {
        const container = ElementUtilities.addElementTo("div", this.gameDiv, {class: "game-container"}),
              tableDiv = ElementUtilities.addElementTo("div", container, {class: "table-div"}),
              tableElement = ElementUtilities.addElementTo("table", tableDiv, {class: "table-game"});

        // see if the user requested the solution.  Daily and Practice subclasses manage this separately in a pure
        // virtual function getSolutionShown()
        let userRequestedSolution = this.getSolutionShown();
        Const.GL_DEBUG && this.logDebug("showGameAfterMove() userRequestedSolution=", userRequestedSolution, "game");
        // Create an element that can be used to add buttons (or whatever) after the display of
        // elements for the game.
        this.postGameDiv = ElementUtilities.addElementTo("div", container, {class: "break post-game-div"});

        this.rowElement = ElementUtilities.addElementTo("tr", tableElement, {class: "tr-game"});

        // We'll build up the game state from the displayInstruction objects
        // that the game returns. The derived classes will save the state in
        // a cookie.
        this.gameState = [];

        let displayInstructions = this.game.getDisplayInstructions();

        // all words are played words until we hit the first future or target word:
        let wordWasPlayed = true;

        for (let displayInstruction of displayInstructions) {
            Const.GL_DEBUG && this.logDebug("displayInstruction:", displayInstruction, "instruction");

            if ((displayInstruction.displayType == Const.FUTURE) || (displayInstruction.displayType == Const.TARGET)) {
                wordWasPlayed = false;
            }
            this.gameState.push([
                displayInstruction.word,
                wordWasPlayed,
                displayInstruction.moveRating
                ]);

            if (displayInstruction.displayType === Const.ADD) {
                this.displayAdd(displayInstruction);
                ElementUtilities.addClass(this.rowElement, "tr-game-active");
            } else if (displayInstruction.displayType === Const.CHANGE) {
                this.displayChange(displayInstruction);
                ElementUtilities.addClass(this.rowElement, "tr-game-active");
            } else if (displayInstruction.displayType === Const.DELETE) {
                // This method adds another row, so unlike the others,
                // it needs access to the table element.
                this.displayDelete(displayInstruction, tableElement);
                ElementUtilities.addClass(this.rowElement, "tr-game-active");
            } else if (displayInstruction.displayType === Const.FUTURE) {
                this.displayFuture(displayInstruction);
            } else if (displayInstruction.displayType === Const.PLAYED) {
                this.displayPlayed(displayInstruction);
            } else if (displayInstruction.displayType === Const.TARGET) {
                this.displayTarget(displayInstruction);
            } else {
                console.error("Unexpected displayType: ", displayInstruction.displayType);
            }

            this.rowElement = ElementUtilities.addElementTo("tr", tableElement, {class: "tr-game"});
        }

        // Were there more wrong words than the last time we showed a move?
        // If so, we need to show a toast message.
        const wrongMoveCount = this.getWrongMoveCount()
        if (wrongMoveCount > this.wrongMoves) {
            this.appDisplay.showToast(Const.WRONG_MOVE);
            this.wrongMoves = wrongMoveCount;
        }

        // Delete old move and add new one.
        ElementUtilities.deleteChildren(this.gameDiv);
        ElementUtilities.addElementTo(container, this.gameDiv);

        if (this.pickerEnabled) {
            this.enablePicker();
        } else {
            this.disablePicker();
        }

        if (this.game.isOver()) {
            if (!userRequestedSolution) {
                if (this.game.isWinner()) {
                    this.appDisplay.showToast(Const.GAME_WON);
                } else {
                    this.appDisplay.showToast(Const.GAME_LOST);
                }
            }
            this.disablePicker();

            // If the derived class defined a function to do additional things when
            // the game is over, call the function.
            if (this.additionalGameOverActions) {
                this.additionalGameOverActions();
            }
        }
    }

    /* ----- Callbacks ----- */

    additionClickCallback(event) {

        if (this.game.isOver()) {
            console.error("GameDisplay.additionClickCallback(): game is already over");
            return Const.UNEXPECTED_ERROR;
        }

        Const.GL_DEBUG && this.logDebug("GameDisplay.additionClickCallback(): event: ", event, "callback");
        let additionPosition = parseInt(event.srcElement.getAttribute('additionPosition')),
            gameResult = this.game.playAdd(additionPosition);

        this.processGameResult(gameResult);
        return gameResult;
    }

    deletionClickCallback(event) {

        if (this.game.isOver()) {
            console.error("GameDisplay.deletionClickCallback(): game is already over");
            return Const.UNEXPECTED_ERROR;
        }

        Const.GL_DEBUG && this.logDebug("GameDisplay.deletionClickCallback(): event: ", event, "callback");
        let deletionPosition = parseInt(event.srcElement.getAttribute('deletionPosition')),
            gameResult = this.game.playDelete(deletionPosition);

        this.processGameResult(gameResult);
        this.updateGameInProgressPersistence(gameResult);
        return gameResult;
    }

    /* ----- Utilities ----- */

    displayCommon(displayInstruction, cellCreator, hideAdditionCells=true) {
        var additionPosition = 0,
            cell = null,
            tdElement = null,
            wordLength = displayInstruction.wordLength,
            word = displayInstruction.word,
            letters = word.length !== 0 ? word.split('') : ' '.repeat(wordLength),
            moveRating = displayInstruction.moveRating;

        tdElement = this.addTd();
        // callback function
        cell = new AdditionCell(additionPosition, hideAdditionCells, this, this.additionClickCallback);

        ElementUtilities.addElementTo(cell.getElement(), tdElement);
        additionPosition++;

        for (let letterIndex = 0; letterIndex < wordLength; letterIndex++) {
            tdElement = this.addTd();
            cell = cellCreator(letters[letterIndex], letterIndex + 1);
            ElementUtilities.addElementTo(cell.getElement(), tdElement);
            cell = new AdditionCell(additionPosition, hideAdditionCells, this, this.additionClickCallback);

            tdElement = this.addTd();

            ElementUtilities.addElementTo(cell.getElement(), tdElement);
            additionPosition++;
        }
    }

    // A list summarizing the moves of the game.
    // Unplayed words get a move rating of Const.FUTURE
    getMoveSummary() {
        var summary = [];

        for (let [word, wasPlayed, moveRating] of this.gameState) {
            if (wasPlayed) {
                summary.push([moveRating, word.length]);
            } else {
                summary.push([Const.FUTURE, word.length]);
            }
        }

        return summary;
    }

    getWrongMoveCount() {
        let wrongMoveCount = 0;
        for (let [word, __wasPlayed, moveRating] of this.gameState) {
            if (moveRating == Const.WRONG_MOVE) {
                wrongMoveCount++;
            }
        }
        return wrongMoveCount;
    }

    processGameResult(gameResult) {
        Const.GL_DEBUG && this.logDebug("GameDisplay.processGameResult() gameResult: ", gameResult, "callback");
        if (gameResult === Const.BAD_OPERATION || gameResult === Const.BAD_LETTER_POSITION) {
            console.error(gameResult);
            this.appDisplay.showToast(Const.UNEXPECTED_ERROR);
            // TODO: Should end the game or some such ...
        } else if (gameResult !== Const.OK) {
            this.appDisplay.showToast(gameResult); // D'OH, Genius move are possible results as of Oct 2024.
        }

        this.showGameAfterMove();
    }

}

export { GameDisplay };
