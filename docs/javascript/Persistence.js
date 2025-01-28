import { Cookie } from './Cookie.js';

    /* -- persistence methods, for saving and recovering a game in progress, and for recording the user's
       activity (games played, etc) and results (wrong move count histogram, games played, etc)
     */

class Persistence {

    // Daily game state

    static clearDailyGameState() {
        Cookie.saveJson(Cookie.DAILY_GAME_WORDS_PLAYED, []);
    }

    static getDailyGameState() {
        return Cookie.getJsonOrElse(Cookie.DAILY_GAME_WORDS_PLAYED, []);
    }

    static saveDailyGameState(gameState) {
        Cookie.saveJson(Cookie.DAILY_GAME_WORDS_PLAYED, gameState);
    }

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

    static getDailyGameNumber() {
        return Cookie.getInt(Cookie.DAILY_GAME_NUMBER);
    }

    static saveDailyGameNumber(gameNumber) {
        Cookie.save(Cookie.DAILY_GAME_NUMBER, gameNumber);
    }

    static clearDailyGameNumber() {
        Cookie.remove(Cookie.DAILY_GAME_NUMBER);
    }

    // Practice game state

    static clearPracticeGameState() {
        Cookie.saveJson(Cookie.PRACTICE_GAME_WORDS_PLAYED, []);
    }

    static getPracticeGameState() {
        return Cookie.getJsonOrElse(Cookie.PRACTICE_GAME_WORDS_PLAYED, []);
    }

    static savePracticeGameState(gameState) {
        Cookie.saveJson(Cookie.PRACTICE_GAME_WORDS_PLAYED, gameState);
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

    static getPracticeSolutionShown() {
        return Cookie.getBoolean(Cookie.PRACTICE_SOLUTION_SHOWN);
    }

    static savePracticeSolutionShown() {
        Cookie.save(Cookie.PRACTICE_SOLUTION_SHOWN, true);
    }

    static clearPracticeSolutionShown() {
        Cookie.save(Cookie.PRACTICE_SOLUTION_SHOWN, false);
    }


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
}
export { Persistence };
