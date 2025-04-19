import { Cookie } from './Cookie.js';

    /* -- persistence methods, for saving and recovering a game in progress, and for recording the user's
       activity (games played, etc) and results (wrong move count histogram, games played, etc)
     */

class Persistence {

    static clearAll() {
        Cookie.clearAllCookies();
    }

    static clearAllNonDebug() {
        Cookie.clearNonDebugCookies();
    }

    // Daily game state

    // REFACTOR game state
    static clearDailyGameState() {
        Cookie.saveJson(Cookie.DAILY_GAME_STATE, []);
    }

    static getDailyGameState() {
        return Cookie.getJsonOrElse(Cookie.DAILY_GAME_STATE, []);
    }

    static saveDailyGameState(gameState) {
        Cookie.saveJson(Cookie.DAILY_GAME_STATE, gameState);
    }

    static getDailyStatsOrElse(defaultStats) {
        let stats = Cookie.getJsonOrElse(Cookie.DAILY_STATS, defaultStats);
        if ( stats === defaultStats) {
            return stats;
        }
        // sanity checking on the recovered stats, in case some are missing (e.g. new version adds a stat)
        if (!stats.gamesStarted) {
            stats.gamesStarted = 0;
        }
        if (!stats.gamesWon) {
            stats.gamesWon = 0;
        }
        if (!stats.gamesLost) {
            stats.gamesLost = 0;
        }
        if (!stats.streak) {
            stats.streak = 0;
        }
        return stats;
    }

    static saveDailyStats(dailyStats) {
        Cookie.saveJson(Cookie.DAILY_STATS, dailyStats);
    }

    static getDailyGameNumber() {
        return Cookie.getInt(Cookie.DAILY_GAME_NUMBER);
    }

    static saveDailyGameNumber(gameNumber) {
        Cookie.save(Cookie.DAILY_GAME_NUMBER, gameNumber);
    }

    static clearDailyGameNumber() {
        Cookie.remove(Cookie.DAILY_GAME_NUMBER);
    }

    static getLastWonDailyGameNumber() {
        return Cookie.getInt(Cookie.LAST_WON_DAILY_GAME_NUMBER);
    }

    static hasLastWonDailyGameNumber() {
        return Cookie.has(Cookie.LAST_WON_DAILY_GAME_NUMBER);
    }

    static saveLastWonDailyGameNumber(gameNumber) {
        Cookie.save(Cookie.LAST_WON_DAILY_GAME_NUMBER, gameNumber);
    }

    static clearLastWonDailyGameNumber() {
        Cookie.remove(Cookie.LAST_WON_DAILY_GAME_NUMBER);
    }

    // Practice game state

    // REFACTOR game state
    static clearPracticeGameState() {
        Cookie.saveJson(Cookie.PRACTICE_GAME_STATE, []);
    }

    static getPracticeGameState() {
        return Cookie.getJsonOrElse(Cookie.PRACTICE_GAME_STATE, []);
    }

    static savePracticeGameState(gameState) {
        Cookie.saveJson(Cookie.PRACTICE_GAME_STATE, gameState);
    }

    static clearPracticeGameDef() {
        Cookie.remove(Cookie.PRACTICE_GAME_START);
        Cookie.remove(Cookie.PRACTICE_GAME_TARGET);
    }

    static savePracticeGameDef(startWord, targetWord) {
        Cookie.save(Cookie.PRACTICE_GAME_START, startWord);
        Cookie.save(Cookie.PRACTICE_GAME_TARGET, targetWord);
    }

    static getPracticeGameDef() {
        return [Cookie.get(Cookie.PRACTICE_GAME_START), Cookie.get(Cookie.PRACTICE_GAME_TARGET)];
    }

    static getPracticeGamesRemaining() {
        return Cookie.getInt(Cookie.PRACTICE_GAMES_REMAINING);
    }

    static hasPracticeGamesRemaining() {
        return Cookie.has(Cookie.PRACTICE_GAMES_REMAINING);
    }

    static savePracticeGamesRemaining(gamesRemaining) {
        Cookie.save(Cookie.PRACTICE_GAMES_REMAINING, gamesRemaining);
    };

    // GUI settings

    static getDarkTheme() {
        return Cookie.getBoolean(Cookie.DARK_THEME)
    }

    static saveDarkTheme(darkTheme) {
        Cookie.save(Cookie.DARK_THEME, darkTheme);
    }

    static getColorblindMode() {
        return Cookie.getBoolean(Cookie.COLORBLIND_MODE)
    }

    static saveColorblindMode(colorblindMode) {
        Cookie.save(Cookie.COLORBLIND_MODE, colorblindMode);
    }

    static getConfirmationMode() {
        return Cookie.getBoolean(Cookie.CONFIRMATION_MODE)
    }

    static hasConfirmationMode() {
        return Cookie.has(Cookie.CONFIRMATION_MODE);
    }

    static saveConfirmationMode(confirmationMode) {
        Cookie.save(Cookie.CONFIRMATION_MODE, confirmationMode);
    }

    // Testing vars -- Daily game

    static hasTestDailyGameWords() {
        return Cookie.has(Cookie.TEST_DAILY_START) && Cookie.has(Cookie.TEST_DAILY_TARGET);
    }

    static getTestDailyGameWords() {
        return [
            Cookie.get(Cookie.TEST_DAILY_START),
            Cookie.get(Cookie.TEST_DAILY_TARGET)
        ];
    }

    static saveTestDailyGameWords(start, target) {
        Cookie.save(Cookie.TEST_DAILY_START, start);
        Cookie.save(Cookie.TEST_DAILY_TARGET, target);
    }

    static clearTestDailyGameWords() {
        Cookie.remove(Cookie.TEST_DAILY_START);
        Cookie.remove(Cookie.TEST_DAILY_TARGET);
    }

    // Testing vars -- Practice game

    static hasTestPracticeGameWords() {
        return Cookie.has(Cookie.TEST_PRACTICE_START) && Cookie.has(Cookie.TEST_PRACTICE_TARGET);
    }

    static getTestPracticeGameWords() {
        return [ Cookie.get(Cookie.TEST_PRACTICE_START), Cookie.get(Cookie.TEST_PRACTICE_TARGET) ];
    }

    static saveTestPracticeGameWords(start, target) {
        Cookie.save(Cookie.TEST_PRACTICE_START, start);
        Cookie.save(Cookie.TEST_PRACTICE_TARGET, target);
    }

    static hasTestMinutesPerDay() {
        return Cookie.has(Cookie.TEST_MINUTES_PER_DAY);
    }

    static getTestMinutesPerDay() {
        return Cookie.getInt(Cookie.TEST_MINUTES_PER_DAY);
    }

    static saveTestMinutesPerDay(n) {
        Cookie.save(Cookie.TEST_MINUTES_PER_DAY, n);
    }

    static hasTestEpochDaysAgo() {
        let rc = Cookie.has(Cookie.TEST_EPOCH_DAYS_AGO);
        return rc;
    }

    static getTestEpochDaysAgo() {
        let rc = Cookie.getInt(Cookie.TEST_EPOCH_DAYS_AGO);
        return rc;
    }

    static saveTestEpochDaysAgo(n) {
        Cookie.save(Cookie.TEST_EPOCH_DAYS_AGO, n);
    }

    static hasTestPracticeGamesPerDay() {
        return Cookie.has(Cookie.TEST_PRACTICE_GAMES_PER_DAY);
    }

    static getTestPracticeGamesPerDay() {
        return Cookie.getInt(Cookie.TEST_PRACTICE_GAMES_PER_DAY);
    }

    static saveTestPracticeGamesPerDay(n) {
        Cookie.save(Cookie.TEST_PRACTICE_GAMES_PER_DAY, n);
    }

    // per-user-device ID methods:

    static newWCID() {
        // generate an integer with 15 random digits.  The biggest JS integer is 9,xxx,xxx,xxx,xxx,xxx which is 16 digits.  
        let x = 0;
        for (let d = 0; d < 15; d++) {
            let randomDigit = Math.floor(Math.random() * 10);
            x = x * 10 + randomDigit;
        }
        return x;
    }

    // returns a new WCIDif not found
    static getWCID() {
        let wcid = Cookie.getInt(Cookie.WCID);
        if (wcid == null) {
            wcid = Persistence.newWCID();
            Persistence.setWCID(wcid);
        }
        return wcid;
    }

    static hasWCID() {
        return Cookie.has(Cookie.WCID);
    }

    static setWCID(n) {
        Cookie.save(Cookie.WCID, n);
    }
}
export { Persistence };
