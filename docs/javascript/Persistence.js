import { Cookie } from './Cookie.js';

    /* -- persistence methods, for saving and recovering a game in progress, and for recording the user's
       activity (games played, etc) and results (wrong move count histogram, games played, etc)
     */

class Persistence {

    static clearPracticeGameState() {
        Cookie.saveJson(Cookie.PRACTICE_GAME_WORDS_PLAYED, []);
    }

    static getPracticeGameState() {
        return Cookie.getJsonOrElse(Cookie.PRACTICE_GAME_WORDS_PLAYED, []);
    }

    static savePracticeGameState(gameState) {
        Cookie.saveJson(Cookie.PRACTICE_GAME_WORDS_PLAYED, gameState);
    }

    static clearDailyGameState() {
        Cookie.saveJson(Cookie.DAILY_GAME_WORDS_PLAYED, []);
    }

    static getDailyGameState() {
        return Cookie.getJsonOrElse(Cookie.DAILY_GAME_WORDS_PLAYED, []);
    }

    static saveDailyGameState(gameState) {
        Cookie.saveJson(Cookie.DAILY_GAME_WORDS_PLAYED, gameState);
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

    static getPracticeTimestamps() {
        return Cookie.getJsonOrElse(Cookie.PRACTICE_GAME_TIMESTAMPS, []);
    }

    static savePracticeTimestamps(timestamps) {
        Cookie.save(Cookie.PRACTICE_GAME_TIMESTAMPS, JSON.stringify(timestamps));
    };

    static getDailyStatsOrElse(defaultStats) {
        return Cookie.getJsonOrElse(Cookie.DAILY_STATS, defaultStats);
    }

    static saveDailyStats(dailyStats) {
        Cookie.saveJson(Cookie.DAILY_STATS, dailyStats);
    }

    static getDailySolutionShown() {
        return Cookie.getBoolean(Cookie.DAILY_SOLUTION_SHOWN);
    }

    static saveDailySolutionShown() {
        Cookie.save(Cookie.DAILY_SOLUTION_SHOWN, true);
    }

    static clearDailySolutionShown() {
        Cookie.save(Cookie.DAILY_SOLUTION_SHOWN, false);
    }

    static getPracticeSolutionShown() {
        return Cookie.getBoolean(Cookie.PRACTICE_SOLUTION_SHOWN);
    }

    static savePracticeSolutionShown() {
        Cookie.save(Cookie.PRACTICE_SOLUTION_SHOWN, true);
    }

    static clearPracticeSolutionShown() {
        Cookie.save(Cookie.PRACTICE_SOLUTION_SHOWN, false);
    }


    static getDailyGameNumber() {
        return Cookie.getInt(Cookie.DAILY_GAME_NUMBER);
    }

    static saveDailyGameNumber(gameNumber) {
        Cookie.save(Cookie.DAILY_GAME_NUMBER, gameNumber);
    }

    // debugging features

    static getDebugBaseTimestamp() {
        return Cookie.getInt(Cookie.DEBUG_BASE_TIMESTAMP);
    }

    static saveDebugBaseTimestamp(timestamp) {
        Cookie.save(Cookie.DEBUG_BASE_TIMESTAMP, timestamp);
    }

    // GUI settings

    static saveDarkTheme (darkTheme) {
        Cookie.save(Cookie.DARK_THEME, darkTheme);
    }

    static saveColorblindMode (colorblindMode) {
        Cookie.save(Cookie.COLORBLIND_MODE, colorblindMode);
    }

}

export { Persistence };
