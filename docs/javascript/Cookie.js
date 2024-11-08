/*
** Summary of cookies used:
**
**  Debug
**     String: set to a comma-separated list of debug tags to turn on.
**
**  Primarily used in AppDisplay; set in SettingsDisplay
**
**     DarkTheme
**        Boolean: whether user has chosen dark theme
**     ColorblindMode (also used in StatsDisplay)
**        Boolean: whether user has chosen colorblind mode
**
**  Primarily used and set in DailyGameDisplay
**
**     DailyGameNumber
**        Integer: calculated daily game number based on current time.
**     DailyGameWordsPlayed
**        List: words played including start word (and target if game is over).
**     DailyStats (also used in StatsDisplay)
**        Object: see explanation of properties in DailyStats.
**     DailySolutionShown:
**        Boolean: saved to true when user clicks 'Solution'.  Applies to the current game number only.
**
**  Used and set in PracticeGameDisplay
**
**     PracticeGameStart
**        String: Current practice game start word
**     PracticeGameTarget
**        String: Current practice game target word
**     PracticeGameWordsPlayed
**        List: words played including start word (and target if game is over).
**     PracticeGameTimestamps
**        List: Epoch timestamps of when practice words were started, used to limit the
**        number of practice games allowed in a day.
**
**   Obsolete
**     HardMode, TypeSavingMode
*/


// The original implementation of this class used real cookies, but that didn't work
// on iOS, so it was changed to this much, much simpler localStorage approach -- bam!
// Didn't even need to change any calling code.
class Cookie {

    static DEBUG = "Debug";
    static DARK_THEME = "DarkTheme";
    static COLORBLIND_MODE = "ColorblindMode";
    static DAILY_GAME_NUMBER = "DailyGameNumber";
    static DAILY_GAME_WORDS_PLAYED = "DailyGameWordsPlayed";
    static DAILY_STATS = "DailyStats";
    static DAILY_SOLUTION_SHOWN = "DailySolutionShown";
    static DEBUG_BASE_TIMESTAMP = "DebugBaseTimestamp";
    static PRACTICE_GAME_START = "PracticeGameStart";
    static PRACTICE_GAME_TARGET = "PracticeGameTarget";
    static PRACTICE_GAME_WORDS_PLAYED = "PracticeGameWordsPlayed";
    static PRACTICE_GAME_TIMESTAMPS = "PracticeGameTimestamps";
    static PRACTICE_SOLUTION_SHOWN = "PracticeSolutionShown";
    static TEST_INT = "testint";
    static TEST_BOOL = "testbool";
    static TEST_OBJ = "testobj";

    static ALL_COOKIE_NAMES = [
        Cookie.DEBUG,
        Cookie.DARK_THEME,
        Cookie.COLORBLIND_MODE,
        Cookie.DAILY_GAME_NUMBER,
        Cookie.DAILY_GAME_WORDS_PLAYED,
        Cookie.DAILY_STATS,
        Cookie.DAILY_SOLUTION_SHOWN,
        Cookie.DEBUG_BASE_TIMESTAMP,
        Cookie.PRACTICE_GAME_START,
        Cookie.PRACTICE_GAME_TARGET,
        Cookie.PRACTICE_GAME_WORDS_PLAYED,
        Cookie.PRACTICE_GAME_TIMESTAMPS,
        Cookie.PRACTICE_SOLUTION_SHOWN,
        Cookie.TEST_INT,
        Cookie.TEST_BOOL,
        Cookie.TEST_OBJ
    ];

    static clearAllCookies() {
        for (const cookieName of Cookie.ALL_COOKIE_NAMES) {
            Cookie.remove(cookieName);
        }
    }

    static clearNonDebugCookies() {
        for (const cookieName of Cookie.ALL_COOKIE_NAMES) {
            if (cookieName.indexOf("Debug") < 0) {
                Cookie.remove(cookieName);
            }
        }
    }

    static get(name) {
        if ((window.localStorage == null) ) {
            // TODO-PRODUCTION: Why does this occur sometimes?
            console.error("ERROR: Cookie.get(): name:", name, "has null local storage for window: ", window);
            return null;
        }
        return window.localStorage.getItem(name);
    }

    static getBoolean(name) {
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
