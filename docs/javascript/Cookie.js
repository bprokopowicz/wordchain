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
*/


// The original implementation of this class used real cookies, but that didn't work
// on iOS, so it was changed to this much, much simpler localStorage approach -- bam!
// Didn't even need to change any calling code.
class Cookie {
    static get(name) {
        return localStorage.getItem(name);
    }

    static getBoolean(name) {
        return Cookie.get(name) === "true";
    }

    static getInt(name) {
        const strVal = Cookie.get(name);
        return strVal ? parseInt(strVal) : null;
    }

    static getJsonOrElse(name, defaultVal=null) {
        const strVal = Cookie.get(name);
        if (strVal) {
            return JSON.parse(strVal);
        } else {
            return defaultVal;
        }
    }

    static remove(name, secure) {
        localStorage.removeItem(name);
    }

    static save(name, value) {
        localStorage.setItem(name, value.toString());
    }

    static saveInt(name, intVal) {
        Cookie.save(name, intVal);
    }

    static saveJson(name, val) {
        Cookie.save(name, JSON.stringify(val));
    }
}

export { Cookie };
