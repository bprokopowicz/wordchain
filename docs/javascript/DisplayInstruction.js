import * as Const from './Const.js';

// This class provides the interface between the GameDisplay and Game/GameState classes.
// When displaying the game grid, GameDisplay requests display instructions from
// Game in a loop. Game Display converts the DisplayInstruction into web elements.
// A fresh grid is displayed with each user interaction (click of
// an add/delete button or selection of a letter to change the word).
//
// See Const.js for definitions of constant strings for the displayTypes.
class DisplayInstruction {
    //
    // word:
    //     - the word to display
    //     - may have a '?' in it; see below
    //     - is ignored for displayType future; only length of it is used
    //
    // displayType:
    //     PLAYED_ADD:
    //         - letter background color based on move rating
    //         - word displayed as active (yellow background)
    //         - plus signs displayed
    //         - changePosition should be 0 (no letters with thick borders)
    //     WORD_AFTER_ADD:
    //         - no letter background color
    //         - word displayed as active (yellow background)
    //         - letter at changePosition will have a thick border, unless changePosition is 0
    //         - word length is one more than length of preceding word
    //         - one letter in word is '?'
    //         - moveRating unused
    //         - WORD_AFTER_ADD is not in the same instruction list as its companion PLAYED_ADD
    //           (unlike WORD_AFTER_CHANGE); it's in the next instruction list, following a
    //           PLAYED instruction.
    //     PLAYED_CHANGE:
    //         - letter background color based on move rating
    //         - word displayed as active (yellow background)
    //         - letter at changePosition will have a thick border
    //     WORD_AFTER_CHANGE:
    //         - no letter background color
    //         - word NOT displayed as active
    //         - letter at changePosition will have a thick border, unless changePosition is 0
    //         - word length is equal to length of preceding word
    //         - one letter in word is '?'
    //         - moveRating unused
    //         - WORD_AFTER_CHANGE is in the same instruction list as its companion PLAYED_CHANGE
    //           (unlike WORD_AFTER_ADD), immediately after it.
    //     PLAYED_DELETE:
    //         - letter background color based on move rating
    //         - word displayed as active (yellow background)
    //         - minus signs displayed
    //         - changePosition should be 0 (no letters with thick borders)
    //     FUTURE:
    //         - word NOT displayed as active
    //         - no letter background color
    //         - letter at changePosition will have a thick border
    //         - all letters in word are blank
    //         - moveRating unused
    //     PLAYED:
    //         - word NOT displayed as active
    //         - letter background color based on move rating
    //         - changePosition should be 0 (no letters with thick borders) -- actually irrelevant
    //
    //     TARGET:
    //         - word NOT displayed as active
    //         - one letter in word MAY BE '?' (if it follows a playedChange)
    //         - letter background color purple or green???
    //         - changePosition should be 0 (no letters with thick borders) -- actually irrelevant
    //
    //     On a fresh game, the start word instruction will be one of 'playedAdd', 'playedDelet',
    //     or 'playedChange'; the start word is always thought of as a played word.
    //
    //     The target word instruction will always be 'target' or 'wordAfterAdd' -- in the
    //     latter case the target word will have a '?' in it. The 'target' instruction word will
    //     have a '?' in it if the prior instruction is 'playedChange'.
    //
    // changePosition: 1..word.length
    //     - the position in the word that should change
    //     - 0 if no change
    //
    // moveRating:
    //     DODO_MOVE:
    //         - a word that increased the solution length by 2
    //
    //     GENIUS_MOVE:
    //         - a word that was in the Scrabble dictionary and causes the solution to get shorter
    //
    //     GOOD_MOVE:
    //         - a word that did NOT increase the solution length
    //
    //     NO_RATING:
    //         - a word for which there is no rating
    //         - instruction where isStartWord is true
    //         - a word in a WORD_AFTER_ADD/CHANGE or FUTURE instruction
    //         - a TARGET instruction before the game is complete
    //
    //     SCRABBLE_MOVE:
    //         - a word that was in the Scrabble dictionary
    //         - does not cause the solution to get shorter (GENIUS_MOVE)
    //         - does not cause the solution to get longer (WRONG_MOVE or DODO_MOVE)
    //
    //     SHOWN_MOVE:
    //         - a word given to the player when he/she clicks 'Show Move'
    //
    //     WRONG_MOVE:
    //         - a word that increased the solution length by 1
    //
    // isStartWord: true for the first word in list of display instructions; false otherwise
    //
    // showParLine: true if "par line" should be shown at the bottom of this word; false otherwise
    //              (NOTE: this should be true for exactly one instruction per list of
    //              DisplayInstruction; initially it's the target word instruction.)
    //
    constructor(word, displayType, changePosition, moveRating, isStartWord, showParLine) {
        this.word = word;
        this.displayType = displayType;
        this.changePosition = changePosition;
        this.moveRating = moveRating;
        this.isStartWord = isStartWord;
        this.showParLine = showParLine;
    }

    copy() {
        return new DisplayInstruction(
            this.word,
            this.displayType,
            this.changePosition,
            this.moveRating
        );
    }

    // Used for debugging only.
    toStr() {
        var returnStr = `(${this.displayType}`;

        returnStr += `,word:${this.word}`;
        returnStr += `,changePosition:${this.changePosition}`;
        returnStr += `,moveRating:${this.moveRating}`;
        returnStr += `,isStartWord:${this.isStartWord}`;
        returnStr += `,showParLine:${this.showParLine}`;

        returnStr += ")";

        return returnStr;
    }

    // ============================ FAUX GAMES ============================

    // Would be nice if all of these cases were covered (has a *):
    //
    // * 1  - First move is Add
    // * 2  - First move is Change
    // * 3  - First move is Delete
    //   4  - Add then Add
    // * 5  - Add then Change
    //   6  - Add then Delete
    // * 7  - Change then Add
    //   8  - Change then Change
    //   9  - Change then Delete
    // * 10 - Delete then Add
    // * 11 - Delete then Change
    // * 12 - Delete then Delete
    // * 13 - Last move is Add
    // * 14 - Last move is Change
    // * 15 - Last move is Delete
    //
    // Would also be nice to have an example where there are several wrong moves,
    // to show the par line in various places.

    // Add (not to target) followed by change; last move Change
    // Covers cases: 1, 5, 14
    static FAUX_1 = [
        [
                                 // word      displayType              change  moveRating           isStart  parLine
            new DisplayInstruction("CORN",    Const.PLAYED_ADD,        0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("ACORN",   Const.FUTURE,            2,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("ADORN",   Const.FUTURE,            5,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("ADORE",   Const.TARGET,            0,      Const.NO_RATING,     false,   true),
        ],
        [
            // User clicks first '+'
            new DisplayInstruction("CORN",    Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("?CORN",   Const.WORD_AFTER_ADD,    2,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("ADORN",   Const.FUTURE,            5,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("ADORE",   Const.TARGET,            0,      Const.NO_RATING,     false,   true),
        ],
        [
            // User plays 'A'
            new DisplayInstruction("CORN",    Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("ACORN",   Const.PLAYED_CHANGE,     2,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("A?ORN",   Const.WORD_AFTER_CHANGE, 5,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("ADORE",   Const.TARGET,            0,      Const.NO_RATING,     false,   true),
        ],
        [
            // User plays 'D'
            new DisplayInstruction("CORN",    Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("ACORN",   Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("ADOR?",   Const.PLAYED_CHANGE,     5,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("ADORE",   Const.TARGET,            0,      Const.NO_RATING,     false,   true),
        ],
        [
            // User plays 'E'
            new DisplayInstruction("CORN",    Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("ACORN",   Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("ADORN",   Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("ADORE",   Const.TARGET,            0,      Const.GOOD_MOVE,     false,   true),
        ],
    ];

    // Change and last move Add -- no mistakes.
    // Covers cases: 2, 7, 13
    static FAUX_2 = [
        [
                                 // word      displayType              change  moveRating           isStart  parLine
            new DisplayInstruction("BORN",    Const.PLAYED_CHANGE,     1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("?ORN",    Const.WORD_AFTER_CHANGE, 0,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("ACORN",   Const.TARGET,            0,      Const.NO_RATING,     false,   true),
        ],
        [
            // User plays 'C'
            new DisplayInstruction("BORN",    Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CORN",    Const.PLAYED_ADD,        0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("ACORN",   Const.TARGET,            0,      Const.NO_RATING,     false,   true),
        ],
        [
            // User clicks first '+'
            new DisplayInstruction("BORN",    Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CORN",    Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("?CORN",   Const.WORD_AFTER_ADD,    0,      Const.NO_RATING,     false,   true),
        ],
        [
            // User plays 'A'
            new DisplayInstruction("BORN",    Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CORN",    Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("ACORN",   Const.TARGET,            0,      Const.GOOD_MOVE,     false,   true),
        ],
    ];

    // Change and last move Add -- mistake on finishing add.
    // Covers cases: 2, 7, 14
    static FAUX_3 = [
        [
                                 // word      displayType              change  moveRating           isStart  parLine
            new DisplayInstruction("BORN",    Const.PLAYED_CHANGE,     1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("?ORN",    Const.WORD_AFTER_CHANGE, 0,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("ACORN",   Const.TARGET,            0,      Const.NO_RATING,     false,   true),
        ],
        [
            // User plays 'C'
            new DisplayInstruction("BORN",    Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CORN",    Const.PLAYED_ADD,        0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("ACORN",   Const.TARGET,            0,      Const.NO_RATING,     false,   true),
        ],
        [
            // User clicks first '+'
            new DisplayInstruction("BORN",    Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CORN",    Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("?CORN",   Const.WORD_AFTER_ADD,    0,      Const.NO_RATING,     false,   true),
        ],
        [
            // User plays 'S'
            new DisplayInstruction("BORN",    Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CORN",    Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("SCORN",   Const.PLAYED_CHANGE,     1,      Const.WRONG_MOVE,    false,   true),
            new DisplayInstruction("?CORN",   Const.WORD_AFTER_CHANGE, 0,      Const.NO_RATING,     false,   false),
        ],
        [
            // User plays 'A'
            new DisplayInstruction("BORN",    Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CORN",    Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("SCORN",   Const.PLAYED,            0,      Const.WRONG_MOVE,    false,   true),
            new DisplayInstruction("ACORN",   Const.TARGET,            0,      Const.GOOD_MOVE,     false,   false),
        ],
    ];

    // Two deletion moves.
    // Covers cases: 3, 12, 15
    static FAUX_4 = [
        [
                                 // word      displayType              change  moveRating           isStart  parLine
            new DisplayInstruction("PLACE",   Const.PLAYED_DELETE,     0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("LACE",    Const.FUTURE,            0,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("ACE",     Const.TARGET,            0,      Const.NO_RATING,     false,   true),
        ],
        [
            // User clicks first '-'
            new DisplayInstruction("PLACE",   Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("LACE",    Const.PLAYED_DELETE,     0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("ACE",     Const.TARGET,            0,      Const.NO_RATING,     false,   true),
        ],
        [
            // User clicks first '-'
            new DisplayInstruction("PLACE",   Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("LACE",    Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("ACE",     Const.TARGET,            0,      Const.GOOD_MOVE,     false,   true),
        ],
    ];

    // Deletion, change, and a last move Add
    // Covers cases: 3, 11, 14
    static FAUX_5 = [
        [
                                 // word      displayType              change  moveRating           isStart  parLine
            new DisplayInstruction("PLACE",   Const.PLAYED_DELETE,     0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("LACE",    Const.FUTURE,            0,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("RACE",    Const.TARGET,            0,      Const.NO_RATING,     false,   true),
        ],
        [
            // User clicks first '-'
            new DisplayInstruction("PLACE",   Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("LACE",    Const.PLAYED_CHANGE,     1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("?ACE",    Const.WORD_AFTER_CHANGE, 0,      Const.NO_RATING,     false,   true),
        ],
        [
            // User plays 'R'
            new DisplayInstruction("PLACE",   Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("LACE",    Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("RACE",    Const.TARGET,            0,      Const.GOOD_MOVE,     false,   true),
        ],
    ];
}

export { DisplayInstruction };
