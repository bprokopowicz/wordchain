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

        // Derived class constructor must call constructGame().
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

    displayAdd(displayInstruction, isStartWord) {
        const me = this;

        // Disable the picker; it's not used for ADD moves.
        this.pickerEnabled = false;

        function getCell(letter, letterPosition) {
            return new ActiveLetterCell(letter, letterPosition, me.letterPicker,
                displayInstruction.moveRating, displayInstruction.changePosition, isStartWord);
        }

        const hideAdditionCells = false;
        this.displayCommon(displayInstruction, getCell, hideAdditionCells);
    }

    displayChange(displayInstruction, isStartWord) {
        const me = this;

        // We need the picker for CHANGE moves.
        this.pickerEnabled = true;

        function getCell(letter, letterPosition) {
            return new ActiveLetterCell(letter, letterPosition, me.letterPicker,
                displayInstruction.moveRating, displayInstruction.changePosition, isStartWord);
        }

        // changePosition goes 1..wordLength, so need to subtract 1.
        this.currentLetter = displayInstruction.word[displayInstruction.changePosition - 1];

        const hideAdditionCells = true;
        this.displayCommon(displayInstruction, getCell, hideAdditionCells);
    }

    displayDelete(displayInstruction, tableElement, isStartWord) {
        const me = this;

        // Disable the picker; it's not used for DELETE moves.
        this.pickerEnabled = false;

        function getActiveLetterCell(letter, letterPosition) {
            return new ActiveLetterCell(letter, letterPosition, me.letterPicker,
                displayInstruction.moveRating, displayInstruction.changePosition, isStartWord);
        }

        // First, display the letter cells.
        const hideAdditionCells = true;
        this.displayCommon(displayInstruction, getActiveLetterCell, hideAdditionCells);

        // Now we add an extra <tr> element for the deletion cell row.
        this.rowElement = ElementUtilities.addElementTo("tr", tableElement, {class: "tr-game"});

        // We need to use a copy of 'this' as 'me' in the body of this local function.
        function getDeletionCell(letter, letterPosition) {
            return new DeletionCell(letterPosition, me, me.deletionClickCallback);
        }

        this.displayCommon(displayInstruction, getDeletionCell, hideAdditionCells);
    }

    displayFuture(displayInstruction) {
        function getCell(letter, letterPosition) {
            return new FutureLetterCell(letter, letterPosition, displayInstruction.changePosition);
        }

        this.displayCommon(displayInstruction, getCell);
    }

    displayPlayed(displayInstruction, isStartWord) {
        function getCell(letter, letterPosition) {
            return new PlayedLetterCell(letter, displayInstruction.moveRating, isStartWord);
        }

        this.displayCommon(displayInstruction, getCell);
    }

    // we only display the Target as Target if the game is not over.  If it is over, it will be
    // displayed as Played, not Target.

    displayTarget(displayInstruction) {

        function getCell(letter, __letterPosition) {
            return new TargetLetterCell(letter);
        }

        this.displayCommon(displayInstruction, getCell);
    }

    getGame() {
        return this.game;
    }

    getSolutionShown() {
        // this is a "pure virtual" function that should never be called directly.
        error.log("GameDisplay.getSolutionShown() should never be called.  Only call subclass implementations");
        return false;
    }

    canShowSolution() {
        // We can only show the solution if it isn't already shown or if the game is not won.
        return !(this.getSolutionShown() || this.game.isWinner())
    }

    showGameAfterMove(skipToast=false) {
        const container = ElementUtilities.addElementTo("div", this.gameDiv, {class: "game-container"}),
              tableDiv = ElementUtilities.addElementTo("div", container, {class: "table-div"}),
              tableElement = ElementUtilities.addElementTo("table", tableDiv, {class: "table-game"});

        // See whether the user requested the solution.
        // Daily and Practice subclasses manage this separately in a pure virtual function getSolutionShown()
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

        let isStartWord = true;
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
                this.displayAdd(displayInstruction, isStartWord);
                ElementUtilities.addClass(this.rowElement, "tr-game-active");
            } else if (displayInstruction.displayType === Const.CHANGE) {
                this.displayChange(displayInstruction, isStartWord);
                ElementUtilities.addClass(this.rowElement, "tr-game-active");
            } else if (displayInstruction.displayType === Const.DELETE) {
                // This method adds another row, so unlike the others,
                // it needs access to the table element.
                this.displayDelete(displayInstruction, tableElement, isStartWord);
                ElementUtilities.addClass(this.rowElement, "tr-game-active");
            } else if (displayInstruction.displayType === Const.FUTURE) {
                this.displayFuture(displayInstruction);
            } else if (displayInstruction.displayType === Const.PLAYED) {
                this.displayPlayed(displayInstruction, isStartWord);
            } else if (displayInstruction.displayType === Const.TARGET) {
                this.displayTarget(displayInstruction);
            } else {
                console.error("Unexpected displayType: ", displayInstruction.displayType);
            }

            isStartWord = false;

            this.rowElement = ElementUtilities.addElementTo("tr", tableElement, {class: "tr-game"});
        }

        // Were there more wrong words than the last time we showed a move?
        // If so, we need to show a toast message.
        const wrongMoveCount = this.getWrongMoveCount()
        if (wrongMoveCount > this.wrongMoves) {
            if (! skipToast)
            {
                this.appDisplay.showToast(Const.WRONG_MOVE);
            }
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
            if (!userRequestedSolution && !skipToast) {
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

        // Enable or disable the Solution button.
        this.appDisplay.setSolutionStatus();
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

    // cellCreator is a factory method to produce the right kind of cell,
    // including when the cell is for the start word.
    displayCommon(displayInstruction, cellCreator, hideAdditionCells=true) {
        var additionPosition = 0,
            cell = null,
            tdElement = null,
            wordLength = displayInstruction.wordLength,
            word = displayInstruction.word,
            letters = word.length !== 0 ? word.split('') : ' '.repeat(wordLength),
            moveRating = displayInstruction.moveRating;


        // We add AdditionCells for every word we display so that we use up their
        // space, thus making the letter cells always line up properly.
        // The AdditionCells are hidden except when displaying an active row that
        // requires adding a letter.
        tdElement = this.addTd();
        cell = new AdditionCell(additionPosition, hideAdditionCells, this, this.additionClickCallback);

        ElementUtilities.addElementTo(cell.getElement(), tdElement);
        additionPosition++;

        for (let letterIndex = 0; letterIndex < wordLength; letterIndex++) {
            // Add the cell for this current letter.
            tdElement = this.addTd();
            cell = cellCreator(letters[letterIndex], letterIndex + 1);
            ElementUtilities.addElementTo(cell.getElement(), tdElement);

            // Add the next addition cell.
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

    // count how many wrong moves.  Don't include the target word, which is marked as a 
    // wrong move if we have too many mistakes, but isn't really a wrong move.
    getWrongMoveCount() {
        let wrongMoveCount = 0;
        let gameStateWithoutTarget = this.gameState.slice();
        gameStateWithoutTarget.pop();
        for (let [word, __wasPlayed, moveRating] of gameStateWithoutTarget) {
            if (moveRating == Const.WRONG_MOVE) {
                wrongMoveCount++;
            }
        }
        return wrongMoveCount;
    }

    processGameResult(gameResult) {
        Const.GL_DEBUG && this.logDebug("GameDisplay.processGameResult() gameResult: ", gameResult, "callback");
        if (gameResult === Const.BAD_LETTER_POSITION) {
            console.error(gameResult);
            this.appDisplay.showToast(Const.UNEXPECTED_ERROR);
            // TODO-PRODUCTION: Should end the game or some such ...
        } else if (gameResult !== Const.OK) {
            this.appDisplay.showToast(gameResult); // D'OH, Genius move are possible results as of Oct 2024.
        }

        this.showGameAfterMove();
    }

}

export { GameDisplay };
