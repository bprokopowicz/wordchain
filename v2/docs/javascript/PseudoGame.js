import { DisplayInstruction } from './DisplayInstruction.js';

// word:           empty string for future
// wordLength:     word.length OR solutionWord.length in the case of future
// displayType:    played, add, delete, change, target, future
// changePosition: relevant only for change or future
// wasCorrect:     Not relevant for target or future

// This a list of list of DisplayInstruction.
// - Each "outer" list represents a move (one or two "panels" in the mock-up spreadsheet).
// - Each "inner" list is the sequence of DisplayInstruction objects to show for the move.
//    that AppDisplay would expect to receive from Game.
const LastMoveReplacer = [
    //                         word,     wordLength, displayType, changePosition, wasCorrect, endOfGame
    [
        new DisplayInstruction("HARD",   4,          "add",       0,              true,       false),
        new DisplayInstruction("",       5,          "future",    0,              true,       false),
        new DisplayInstruction("",       4,          "future",    1,              true,       false),
        new DisplayInstruction("PEAR",   4,          "target",    0,              true,       false),
    ],
    [
        new DisplayInstruction("HARD",   4,          "played",    0,              true,       false),
        new DisplayInstruction("H ARD",  5,          "addchange", 2,              true,       false),
        new DisplayInstruction("",       4,          "future",    1,              true,       false),
        new DisplayInstruction("PEAR",   4,          "target",    0,              true,       false),
    ],
    [
        new DisplayInstruction("HARD",   4,          "played",    0,              true,       false),
        new DisplayInstruction("HEARD",  5,          "delete",    0,              true,       false),
        new DisplayInstruction("",       4,          "future",    1,              true,       false),
        new DisplayInstruction("PEAR",   4,          "target",    0,              true,       false),
    ],
    [
        new DisplayInstruction("HARD",   4,          "played",    0,              true,       false),
        new DisplayInstruction("HEARD",  5,          "played",    0,              true,       false),
        new DisplayInstruction("HEAR",   4,          "change",    1,              true,       false),
        new DisplayInstruction("PEAR",   4,          "target",    0,              true,       true),
    ],
];

const Games = {
    lastMoveReplacer: LastMoveReplacer,
};

class Game {

    constructor(game) {
        this.setGame(game);
    }

    setGame(game) {
        this.game = Games[game];
        this.moveIndex = 0;
        this.instructionIndex = 0;
    }

    getNextDisplayInstruction() {
        console.log(`getNextDisplayInstruction(): moveIndex: ${this.moveIndex}, instructionIndex: ${this.instructionIndex}`);
        if (this.moveIndex >= this.game.length) {
            return null;
        }

        if (this.instructionIndex < this.game[this.moveIndex].length) {
            return this.game[this.moveIndex][this.instructionIndex++];
        } else {
            return null;
        }
    }

    over() {
        return this.moveIndex >= this.game.length;
    }

    pseudoMove() {
        this.moveIndex++;
        this.instructionIndex = 0;
        //console.log(`pseudoMove(): moveIndex: ${this.moveIndex}, instructionIndex: ${this.instructionIndex}`);
    }

    winner() {
        return false;
    }
}

export { Game };
