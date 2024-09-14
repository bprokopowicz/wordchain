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
**     PlayerStats
**        PlayerStats struct: saved as JSON
**     DailyGameNumber
**        Integer: calculated daily game number based on current time.
**     DailyGameWordsPlayed
**        List: words played including start word (and target if game is over).
**     DailySolutionShown (also used in StatsDisplay)
**        Boolean: whether user has opted to show the daily solution (in which case
**        there will be no option to share).
**     DailyStats (also used in StatsDisplay)
**        Object: see explanation of properties in DailyStats.
**     DebugStaticDaily
**        Boolean: Set to True to avoid standard daily game calculations and use a statc start/target.
**     DebugDailyMinPerDay
**        Integer: Number of minutes to consider one day when debugging daily games.
**     DebugBaseTimestamp
**        Integer: Epoch timestamp used when DebugDateIncrementMin is not zero or null
**        (Code will set this; doesn't need to be set manually)
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
**     DebugPracticeMinPerDay
**        Integer: Number of minutes to consider one day when debugging practice games.
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
    static PLAYER_STATS = "PlayerStats";
    static DAILY_GAME_NUMBER = "DailyGameNumber";
    static DAILY_GAME_WORDS_PLAYED = "DailyGameWordsPlayed";
    static DAILY_SOLUTION_SHOWN = "DailySolutionShown";
    static DAILY_STATS = "DailyStats";
    static DEBUG_DAILY_MIN_PER_DAY = "DebugDailyMinPerDay";
    static DEBUG_BASE_TIMESTAMP = "DebugBaseTimestamp";
    static PRACTICE_GAME_START = "PracticeGameStart";
    static PRACTICE_GAME_TARGET = "PracticeGameTarget";
    static PRACTICE_GAME_WORDS_PLAYED = "PracticeGameWordsPlayed";
    static PRACTICE_GAME_TIMESTAMPS = "PracticeGameTimestamps";
    static DEBUG_PRACTICE_MIN_PER_DAY = "DebugPracticeMinPerDay";
    static HARD_MODE = "HardMode";
    static TYPE_SAVING_MODE = "TypeSavingMode";
    static TEST_INT = "testint";
    static TEST_BOOL = "testbool";
    static TEST_OBJ = "testobj";

    static ALL_COOKIE_NAMES = [
        Cookie.DEBUG,
        Cookie.DARK_THEME,
        Cookie.COLORBLIND_MODE,
        Cookie.DAILY_GAME_NUMBER,
        Cookie.DAILY_GAME_WORDS_PLAYED,
        Cookie.DAILY_SOLUTION_SHOWN,
        Cookie.DAILY_STATS,
        Cookie.DEBUG_DAILY_MIN_PER_DAY,
        Cookie.DEBUG_BASE_TIMESTAMP,
        Cookie.PLAYER_STATS,
        Cookie.PRACTICE_GAME_START,
        Cookie.PRACTICE_GAME_TARGET,
        Cookie.PRACTICE_GAME_WORDS_PLAYED,
        Cookie.PRACTICE_GAME_TIMESTAMPS,
        Cookie.DEBUG_PRACTICE_MIN_PER_DAY,
        Cookie.HARD_MODE,
        Cookie.TYPE_SAVING_MODE,
        Cookie.TEST_INT,
        Cookie.TEST_BOOL,
        Cookie.TEST_OBJ
    ];

    static clearAllCookies(theWindow=window) {
        for (const cookieName of Cookie.ALL_COOKIE_NAMES) {
            Cookie.remove(cookieName, theWindow);
        }
    }

    static clearNonDebugCookies(theWindow=window) {
        for (const cookieName of Cookie.ALL_COOKIE_NAMES) {
            if (cookieName.indexOf("Debug") < 0) {
                Cookie.remove(cookieName, theWindow);
            }
        }
    }

    static get(name, theWindow=window) {
        return theWindow.localStorage.getItem(name);
    }

    static getBoolean(name, theWindow=window) {
        return Cookie.get(name, theWindow) === "true";
    }

    static getInt(name, theWindow=window) {
        const strVal = Cookie.get(name, theWindow);
        return strVal ? parseInt(strVal) : null;
    }

    static getJsonOrElse(name, defaultVal, theWindow=window) {
        const strVal = Cookie.get(name, theWindow);
        if (strVal) {
            return JSON.parse(strVal);
        } else {
            return defaultVal;
        }
    }

    static remove(name, theWindow=window) {
        theWindow.localStorage.removeItem(name);
    }

    static save(name, value, theWindow=window) {
        if (name == null) {
            console.error("trying to save cookie named null with value:", value, " - ignored.");
        } else {
            if (value == null) {
                console.error("trying to save cookie named:", name, " with null value - ignored.");
            } else {
                theWindow.localStorage.setItem(name, value.toString());
            }
        }
    }

    static saveJson(name, val, theWindow=window) {
        Cookie.save(name, JSON.stringify(val), theWindow);
    }
}

export { Cookie };
