// Turn on/off debugging.  We use var instead of const so that we can turn it on/off from 
// code as well as by hard-coding it here.
// Javascript requires a module-local setter function to set an exported value from outside
// the module.  All exported values are read-only even if not declared using "export const".  

export let GL_DEBUG = false;

export function SET_GL_DEBUG(value) {
    GL_DEBUG = value;
}

// Constants for URLs. (CURRENTLY UNUSED)
export const URL_ROOT = "https://bprokopowicz.github.io/wordchain/";
export const DICT_URL = "https:/wordchain/docs/resources/WordChainDict";
export const SCRABBLE_DICT_URL = "https:/wordchain/docs/resources/Scrabble3-6";

// Constants for practice game word selection screen
// TODO-PRODUCTION: Uncomment
//export const PRACTICE_GAMES_PER_DAY = 3;       // Real value
export let PRACTICE_GAMES_PER_DAY = 1000;    // For beta testing
export const PRACTICE_STEPS_MINIMUM = 6;
export const PRACTICE_STEPS_MAXIMUM = 8;
export const PRACTICE_DIFFICULTY_MINIMUM = 20;
export const PRACTICE_TARGET_WORD_LEN = 0;     // 0 means any target word length is OK
export const PRACTICE_REQ_WORD_LEN_1 = 4;
export const PRACTICE_REQ_WORD_LEN_2 = 6;
export const PRACTICE_MIN_CHOICES_PER_STEP = 2;
export const PRACTICE_START_WORDS = ["FACE", "GRASP", "SPACE", "PLATE", "TRAIL", "PLANT", "HOUSE", "SNORE", "SNOW", "BROIL", "WRITE", "SONG", "FISH", "WASH", "SINK"];

// Constants for game play toast notifications.
// Note: OK is not displayed.
// --- Returned from Game class.
export const OK               = "ok";
export const NOT_A_WORD       = "Not in word list";
// --- Displayed from one of the *Display classes.
export const GAME_WON         = "Solved!";
export const GAME_LOST        = "Too many wrong moves";
export const PICK_NEW_LETTER  = "Pick a different letter";      // Displayed when user selects the letter already in the cell to be changed.
export const UNEXPECTED_ERROR = "Yikes! Something went wrong";
export const TOO_MANY_GAMES   = `Only ${PRACTICE_GAMES_PER_DAY} games allowed per day`;
export const NO_DAILY         = "Unable to create daily game;<br>here is a fun back-up";
export const SHARE_FAILED     = "Failed to share";
export const SHARE_COPIED     = "Copied to clipboard";
export const SHARE_INSECURE   = "Cannot share in insecure environment";
export const NO_STATS         = "Stats unavailable";
export const WRONG_MOVE       = "D'oh! Wrong move";
export const GENIUS_MOVE      = "Genius play!";
export const DODO_MOVE        = "Ugh! Dodo move!";
export const BAD_POSITION     = "Bad letter position";
export const NEW_DAILY_GAME   = "Time for a new Daily game";

// If we force the daily game using stored test variables, this will be the game number.
export const TEST_DAILY_GAME_NUMBER = -1;

// Returns from Game class that indicate a bug in its input from GameDisplay.
export const BAD_LETTER_POSITION = "bad letter position";

// DisplayInstruction displayTypes.
export const ADD       = "add";
export const CHANGE    = "change";
export const DELETE    = "delete";
export const FUTURE    = "future";
export const PLAYED    = "played";
export const TARGET    = "target";

// Special characters used in Game.showGame() return string;
// a few other classes use these.
export const NO_CHANGE_CHAR = "*";
export const CHANGE_CHAR    = "!";
export const INSERT_CHAR    = "+";

export const MIN_WORD_LENGTH = 3;
export const MAX_WORD_LENGTH = 6;

// The starting date for the daily game -- needs to change when sending
// to Beta and Production.
export const WORD_CHAIN_EPOCH_DATE = "2024-11-01T00:00:00.000+00:00";

// words to use if we are past the date of the last defined daily game words.
export const BACKUP_DAILY_GAME_START  = "daily";
export const BACKUP_DAILY_GAME_TARGET = "broken";

// How frequently whe check whether it's time for a new Daily game.
export const DAILY_GAME_CHANGE_CHECK_INTERVAL = 60 * 1000;

// Constants for settings screen
export const EMAIL_HREF = "mailto:bonnie.prokopowicz@gmail.com?subject=WordChain%20Feedback";
export const FAQ_HREF   = "FAQ.html";

// Constants for sharing graphic and stats screen
// Emoji code strings for share string
export const RED_SQUARE     = "\u{1F7E5}";     // Wrong moves in graphic
export const GREEN_SQUARE   = "\u{1F7E9}";     // Correct moves in graphic
export const PURPLE_SQUARE  = "\u{1F7EA}";     // Unchosen moves in graphic (start and target);
export const ORANGE_SQUARE  = "\u{1F7E7}";     // Wrong moves in graphic -- colorblind
export const GOLD_SQUARE    = "\u{1F7E8}";     // Genius moves in graphic
export const BLUE_SQUARE    = "\u{1F7E6}";     // Correct moves in graphic -- colorblind
export const BROWN_SQUARE   = "\u{1F7EB}";     // Dodo moves in graphic
export const STAR           = "\u{2B50}";      // No wrong moves in first share line
export const CONFOUNDED     = "\u{1F616}";     // Too many wrong moves in first share line and stats graph
export const FIRE           = "\u{1F525}";     // CURRENTLY NOT USED: Hard mode in first share line
export const ROCKET         = "\u{1F680}";     // Unused
export const FIREWORKS      = "\u{1F386}";     // Unused
export const TROPHY         = "\u{1F3C6}";     // Unused
export const LINK           = "\u{1F517}";     // Unused
export const CHAINS         = "\u{26D3}";      // Unused
// Not technically a const, but we are going to overwrite it at
// <TOO_MANY_WRONG_MOVES> to change the symbol to CONFOUNDED.
export var NUMBERS        = [                // Used in first share line
    STAR,                           // 0
    "\u{0031}\u{FE0F}\u{20E3}",     // 1
    "\u{0032}\u{FE0F}\u{20E3}",
    "\u{0033}\u{FE0F}\u{20E3}",
    "\u{0034}\u{FE0F}\u{20E3}",
    "\u{0035}\u{FE0F}\u{20E3}",
    "\u{0036}\u{FE0F}\u{20E3}",
    "\u{0037}\u{FE0F}\u{20E3}",
    "\u{0038}\u{FE0F}\u{20E3}",
    "\u{0031}\u{FE0F}\u{20E3}",
    "\u{0039}\u{FE0F}\u{20E3}",     // 9
];
export const SCORE_TEXT   = [
    "0 -- no mistakes!",
    "1 wrong word",
    "2 wrong words",
    "3 wrong words",
    "4 wrong words",
    "5 -- too many mistakes!",
];

// Instead of a number, if the user has had too many wrong moves
// use the CONFOUNDED emoji.
export const TOO_MANY_WRONG_MOVES = 5;  // Shouldn't be > 9; relates to NUMBERS array above
NUMBERS[TOO_MANY_WRONG_MOVES] = CONFOUNDED

// SVG (Scalable Vector Graphics) paths for icons.
export const CLOSE_PATH = "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z";
export const HELP_PATH = "M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z";
export const MENU_PATH = "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z";
export const SETTINGS_PATH = "M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z";
export const STATS_PATH = "M16,11V3H8v6H2v12h20V11H16z M10,5h4v14h-4V5z M4,11h4v8H4V11z M20,19h-4v-6h4V19z";
