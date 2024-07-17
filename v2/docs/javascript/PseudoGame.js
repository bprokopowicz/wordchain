import { DisplayInstruction } from './DisplayInstruction.js';
import { Game } from './Game.js';
import * as Const from './Const.js';

// word:           string is ignored for future; only length of it is used
// displayType:    add, addChange, delete, change, future, played, target
// changePosition: not relevant for played or target
// moveRating:     OK, WRONG_MOVE, or GENIUS_MOVEl not relevant for future

// This a list of list of DisplayInstruction.
// - Each "outer" list represents a move (one or two "panels" in the mock-up spreadsheet).
// - Each "inner" list is the sequence of DisplayInstruction objects to show for the move.
//    that AppDisplay would expect to receive from Game.
// 
// add, addChange, delete, change are used for the active word.
// There should be exactly ONE of these in any sequence of moves ("inner" list) except the final one.
const LastMoveReplacer = [
    //                         word,     displayType, changePosition, moveRating
    [
        new DisplayInstruction("HARD",   "add",       0,              Const.OK),
        new DisplayInstruction("HEARD",  "future",    0,              Const.OK),
        new DisplayInstruction("HEAR",   "future",    1,              Const.OK),
        new DisplayInstruction("PEAR",   "target",    0,              Const.OK),
    ],
    // after user pressed '+' between H and A
    [
        new DisplayInstruction("HARD",   "played",    0,              Const.OK),
        new DisplayInstruction("H ARD",  "addchange", 2,              Const.OK),
        new DisplayInstruction("HEAR",   "future",    1,              Const.OK),
        new DisplayInstruction("PEAR",   "target",    0,              Const.OK),
    ],
    // after user selected 'E'
    [
        new DisplayInstruction("HARD",   "played",    0,              Const.OK),
        new DisplayInstruction("HEARD",  "delete",    0,              Const.OK),
        new DisplayInstruction("HEAR",   "future",    1,              Const.OK),
        new DisplayInstruction("PEAR",   "target",    0,              Const.OK),
    ],
    // after deletes letter 5 'D'
    [
        new DisplayInstruction("HARD",   "played",    0,              Const.OK),
        new DisplayInstruction("HEARD",  "played",    0,              Const.OK),
        new DisplayInstruction("HEAR",   "change",    1,              Const.OK),
        new DisplayInstruction("PEAR",   "target",    0,              Const.OK),
    ],
    [
        new DisplayInstruction("HARD",   "played",    0,              Const.OK),
        new DisplayInstruction("HEARD",  "played",    0,              Const.OK),
        new DisplayInstruction("HEAR",   "played",    0,              Const.OK),
        new DisplayInstruction("PEAR",   "target",    0,              Const.OK),
    ],
];

const PickWrongReplacer = [
    //                         word,     displayType, changePosition, moveRating
    [
        new DisplayInstruction("FATE",   "delete",    0,              Const.OK),
        new DisplayInstruction("FAT",    "future",    1,              Const.OK),
        new DisplayInstruction("SAT",    "future",    3,              Const.OK),
        new DisplayInstruction("SAP",    "future",    2,              Const.OK),
        new DisplayInstruction("SOP",    "target",    0,              Const.OK),
    ],
    [
        new DisplayInstruction("FATE",   "played",    0,              Const.OK),
        new DisplayInstruction("FAT",    "change",    1,              Const.OK),
        new DisplayInstruction("SAT",    "future",    3,              Const.OK),
        new DisplayInstruction("SAP",    "future",    2,              Const.OK),
        new DisplayInstruction("SOP",    "target",    0,              Const.OK),
    ],
    [
        new DisplayInstruction("FATE",   "played",    0,              Const.OK),
        new DisplayInstruction("FAT",    "played",    0,              Const.OK),
        new DisplayInstruction("SAT",    "change",    3,              Const.OK),
        new DisplayInstruction("SAP",    "future",    2,              Const.OK),
        new DisplayInstruction("SOP",    "target",    0,              Const.OK),
    ],
    [
        new DisplayInstruction("FATE",   "played",    0,              Const.OK),
        new DisplayInstruction("FAT",    "played",    0,              Const.OK),
        new DisplayInstruction("SAT",    "played",    0,              Const.OK),
        new DisplayInstruction("SAG",    "change",    3,              Const.WRONG_MOVE),
        new DisplayInstruction("SAP",    "future",    2,              Const.OK),
        new DisplayInstruction("SOP",    "target",    0,              Const.OK),
    ],
    [
        new DisplayInstruction("FATE",   "played",    0,              Const.OK),
        new DisplayInstruction("FAT",    "played",    0,              Const.OK),
        new DisplayInstruction("SAT",    "played",    0,              Const.OK),
        new DisplayInstruction("SAG",    "played",    0,              Const.WRONG_MOVE),
        new DisplayInstruction("SAP",    "change",    2,              Const.OK),
        new DisplayInstruction("SOP",    "target",    0,              Const.OK),
    ],
    [
        new DisplayInstruction("FATE",   "played",    0,              Const.OK),
        new DisplayInstruction("FAT",    "played",    1,              Const.OK),
        new DisplayInstruction("SAT",    "played",    3,              Const.OK),
        new DisplayInstruction("SAG",    "played",    2,              Const.WRONG_MOVE),
        new DisplayInstruction("SAP",    "played",    2,              Const.OK),
        new DisplayInstruction("SOP",    "target",    0,              Const.OK),
    ],
];

const Games = {
    hard: {
        pear: LastMoveReplacer
    },
    fate: {
        sop: PickWrongReplacer,
    }
};

class PseudoGame extends Game {

    constructor(dictionary, startWord, targetWord) {
        super(dictionary, startWord, targetWord);
        this.game = Games[startWord][targetWord];
        this.dictionary = dictionary;
        this.moveIndex = 0;
        this.instructionIndex = 0;
    }

    getNextDisplayInstruction() {
        //console.log(`getNextDisplayInstruction(): moveIndex: ${this.moveIndex}, instructionIndex: ${this.instructionIndex}`);
        if (this.moveIndex > this.game.length) {
            return null;
        }

        if (this.instructionIndex < this.game[this.moveIndex].length) {
            return this.game[this.moveIndex][this.instructionIndex++];
        } else {
            this.instructionIndex = 0;
            return null;
        }
    }

    over() {
        return this.moveIndex >= this.game.length;
    }

    // addPosition is 0 to word.length
    playAdd(addPosition) {
        console.log("playAdd(): addPosition:", addPosition);
        this.pseudoMove();
        return true;
    }

    // deletePosition is 1 to word.length
    playDelete(deletePosition) {
        console.log("playDelete(): deletePosition:", deletePosition);
        this.pseudoMove();
        return true;
    }

    // letterPosition is 1 to word.length
    playLetter(letterPosition, letter) {
        console.log("playLetter(): letterPosition:", letterPosition, ", letter:", letter);
        this.pseudoMove();
        return true;
    }

    pseudoMove() {
        this.moveIndex++;
        this.instructionIndex = 0;
        console.log(`pseudoMove(): moveIndex: ${this.moveIndex}, instructionIndex: ${this.instructionIndex}`);
    }

    winner() {
        return true;
    }
}

export { PseudoGame };
