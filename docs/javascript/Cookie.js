/*
** Summary of cookies used:
**
**  Debug
**     String: set to a comma-separated list of debug tags to turn on.
**
**  per user-device-browser ID
**     WCID
**        Integer: assigned randomly per browser&device
**
**  Primarily used in AppDisplay; set in SettingsDisplay
**
**     DarkTheme
**        Boolean: whether user has chosen dark theme
**     ColorblindMode (also used in StatsDisplay)
**        Boolean: whether user has chosen colorblind mode
**     ConfirmationMode
**        Boolean: whether user has chosen confirmation mode (chosen by default)
**
**  Primarily used and set in DailyGameDisplay
**
**     DailyGameState
**
**  Used and set in PracticeGameDisplay
**
**     PracticeGameState
**
**  Used In testing
**    TestDailyStart
**      String: override any daily game and start with this word
**    TestDailyTarget
**      String: override any daily game and end with this word
**    TestPracticeStart
**      String: override any practice game and start with this word
**    TestPracticeTarget
**      String: override any practice game and end with this word
**    TestMinutesPerDay
**      Int: overrides the length of day for calculating daily game number and practice game daily limit reset
**    TestEpochDaysAgo
**      Int: overrides the base time of the WordChain epoch from a fixed value to this many days ago from today.
**    TestPracticeGamesPerDay
**      Int: overrides the limit on how many practice games per day you can play

*/


// The original implementation of this class used real cookies, but that didn't work
// on iOS, so it was changed to this much, much simpler localStorage approach -- bam!
// Didn't even need to change any calling code.
class Cookie {

    static DEBUG = "Debug";
    static WCID = "wcid";
    static DARK_THEME = "DarkTheme";
    static COLORBLIND_MODE = "ColorblindMode";
    static CONFIRMATION_MODE = "ConfirmationMode";
    static DAILY_GAME_STATE_2 = "DailyGameState2";
    static PRACTICE_GAME_STATE_2 = "PracticeGameState2";

    // deprecated cookies, used only in migration
    static DEP_DAILY_GAME_NUMBER = "DailyGameNumber";
    static DEP_DAILY_GAME_STATE = "DailyGameState";
    static DEP_DAILY_GAME_WORDS_PLAYED = "DailyGameWordsPlayed";
    static DEP_DAILY_STATS = "DailyStats";
    static DEP_LAST_WON_DAILY_GAME_NUMBER = "LastWonDailyGameNumber";
    static DEP_PRACTICE_GAME_START = "PracticeGameStart";
    static DEP_PRACTICE_GAME_STATE = "PracticeGameState";
    static DEP_PRACTICE_GAME_TARGET = "PracticeGameTarget";
    static DEP_PRACTICE_GAME_WORDS_PLAYED = "PracticeGameWordsPlayed";
    static DEP_PRACTICE_GAMES_REMAINING = "PracticeGameWordsPlayed";

    // These 3 are used for testing persistence only.  They don't affect game play
    static TEST_INT = "TestInt";
    static TEST_BOOL = "TestBool";
    static TEST_OBJ = "TestObj";

    // These variables control game set-up for testing
    static TEST_DAILY_START = "TestDailyStart";
    static TEST_DAILY_TARGET = "TestDailyTarget";
    static TEST_PRACTICE_START = "TestPracticeStart";
    static TEST_PRACTICE_TARGET = "TestPracticeTarget";
    static TEST_MINUTES_PER_DAY = "TestMinutesPerDay";
    static TEST_EPOCH_DAYS_AGO = "TestEpochDaysAgo";
    static TEST_PRACTICE_GAMES_PER_DAY = "TestPracticeGamesPerDay";

    static ALL_COOKIE_NAMES = [
        Cookie.DEBUG,
        Cookie.WCID,
        Cookie.DARK_THEME,
        Cookie.COLORBLIND_MODE,
        Cookie.CONFIRMATION_MODE,
        Cookie.DAILY_GAME_STATE_2,
        Cookie.PRACTICE_GAME_STATE_2,
        Cookie.TEST_INT,
        Cookie.TEST_BOOL,
        Cookie.TEST_OBJ,
        Cookie.TEST_DAILY_START,
        Cookie.TEST_DAILY_TARGET,
        Cookie.TEST_PRACTICE_START,
        Cookie.TEST_PRACTICE_TARGET,
        Cookie.TEST_MINUTES_PER_DAY,
        Cookie.TEST_EPOCH_DAYS_AGO,
        Cookie.TEST_PRACTICE_GAMES_PER_DAY,
        Cookie.DEP_DAILY_GAME_NUMBER,
        Cookie.DEP_DAILY_GAME_STATE,
        Cookie.DEP_DAILY_GAME_WORDS_PLAYED,
        Cookie.DEP_DAILY_STATS,
        Cookie.DEP_LAST_WON_DAILY_GAME_NUMBER,
        Cookie.DEP_PRACTICE_GAME_START,
        Cookie.DEP_PRACTICE_GAME_STATE,
        Cookie.DEP_PRACTICE_GAME_TARGET,
        Cookie.DEP_PRACTICE_GAME_WORDS_PLAYED,
        Cookie.DEP_PRACTICE_GAMES_REMAINING,
    ];

    static clearAllCookies() {
        for (const cookieName of Cookie.ALL_COOKIE_NAMES) {
            Cookie.remove(cookieName);
        }
    }

    static clearNonDebugCookies() {
        for (const cookieName of Cookie.ALL_COOKIE_NAMES) {
            if (cookieName.startsWith("Debug"))  {
                // don't remove
            } else {
                Cookie.remove(cookieName);
            }
        }
    }

    static clearDeprecatedCookies() {
        Cookie.remove(Cookie.DEP_DAILY_GAME_NUMBER);
        Cookie.remove(Cookie.DEP_DAILY_GAME_STATE);
        Cookie.remove(Cookie.DEP_DAILY_GAME_WORDS_PLAYED);
        Cookie.remove(Cookie.DEP_DAILY_STATS);
        Cookie.remove(Cookie.DEP_LAST_WON_DAILY_GAME_NUMBER);
        Cookie.remove(Cookie.DEP_PRACTICE_GAME_START);
        Cookie.remove(Cookie.DEP_PRACTICE_GAME_STATE);
        Cookie.remove(Cookie.DEP_PRACTICE_GAME_TARGET);
        Cookie.remove(Cookie.DEP_PRACTICE_GAME_WORDS_PLAYED);
        Cookie.remove(Cookie.DEP_PRACTICE_GAMES_REMAINING);
    }

    static has(name) {
        return Cookie.get(name) != null;
    }

    static get(name) {
        if ((window.localStorage == null) ) {
            console.error("ERROR: Cookie.get(): name:", name, "has null local storage for window: ", window);
            return null;
        }
        return window.localStorage.getItem(name);
    }

    static getBoolean(name) {
        var result = Cookie.get(name) === "true";
        return Cookie.get(name) === "true";
    }

    static getInt(name) {
        const strVal = Cookie.get(name);
        return strVal ? parseInt(strVal) : null;
    }

    static getJsonOrElse(name, defaultVal) {
        const strVal = Cookie.get(name);
        if (strVal) {
            return JSON.parse(strVal);
        } else {
            return defaultVal;
        }
    }

    static remove(name) {
        window.localStorage.removeItem(name);
    }

    static save(name, value) {
        if (name == null) {
            console.error("trying to save cookie named null with value:", value, " - ignored.");
        } else if (value == null) {
            console.error("trying to save cookie named:", name, " with null value - ignored.");
        } else if (!Cookie.ALL_COOKIE_NAMES.includes(name)) {
            console.error("trying to save cookie with unrecognized cookie name:", name, " - ignored.");
        } else {
            window.localStorage.setItem(name, value.toString());
        }
    }

    static saveJson(name, val) {
        Cookie.save(name, JSON.stringify(val));
    }
}

export { Cookie };
