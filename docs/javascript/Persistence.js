import { BaseLogger } from './BaseLogger.js';
import * as Const from './Const.js';
import { Cookie } from './Cookie.js';

    /* -- persistence methods, for saving and recovering a game in progress, and for recording the user's
       activity (games played, etc) and results (wrong move count histogram, games played, etc)
     */

const logger = new BaseLogger();

class Persistence {

    static clearAll() {
        Cookie.clearAllCookies();
    }

    static clearAllNonDebug() {
        Cookie.clearNonDebugCookies();
    }

    // Daily game state

    static getDailyGameState2() {
        const res = Cookie.getJsonOrElse(Cookie.DAILY_GAME_STATE_2, null);
        Const.GL_DEBUG && logger.logDebug("---- Persistence.getDailyGameState2() returns:", res, "persistence");
        return res;
    }

    // we don't persist certain attributes that will be reset / recalculated on recovery
    static saveDailyGameState2(gameState) {
        let copyObj = Object.assign({}, gameState);
        delete copyObj.dictionary;
        delete copyObj.baseTimestamp;
        delete copyObj.baseDate;
        delete copyObj.dateIncrementMs;
        delete copyObj.isConstructedAsNew;
        Const.GL_DEBUG && logger.logDebug("---- Persistence.saveDailyGameState2() saving copy:", copyObj, "persistence");
        Cookie.saveJson(Cookie.DAILY_GAME_STATE_2, copyObj);
    }


    // Practice game state

    static clearPracticeGameState2() {
        Cookie.remove(Cookie.PRACTICE_GAME_STATE_2);
    }

    static getPracticeGameState2() {
        const res = Cookie.getJsonOrElse(Cookie.PRACTICE_GAME_STATE_2, null);
        Const.GL_DEBUG && logger.logDebug("---- Persistence.getPracticeGameState2() returns:", res, "persistence");
        return res;
    }

    // saves JSON blob without the dictionary
    static savePracticeGameState2(gameState) {
        let copyObj = Object.assign({}, gameState);
        delete copyObj.dictionary;
        Const.GL_DEBUG && logger.logDebug("---- Persistence.savePracticeGameState2() saving copy:", copyObj, "persistence");
        Cookie.saveJson(Cookie.PRACTICE_GAME_STATE_2, copyObj);
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
        return [ Cookie.get(Cookie.TEST_DAILY_START), Cookie.get(Cookie.TEST_DAILY_TARGET) ];
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
        return Cookie.has(Cookie.TEST_EPOCH_DAYS_AGO);
    }

    static getTestEpochDaysAgo() {
        return Cookie.getInt(Cookie.TEST_EPOCH_DAYS_AGO);
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

    // Migration methods from GameState to updated game state 2.

    static getDeprecatedStatsBlob() {
        return Cookie.getJsonOrElse(Cookie.DEP_DAILY_STATS, null);
    }

    static clearDeprecatedCookies() {
        Cookie.clearDeprecatedCookies();
    }
    // per-user-device ID methods: TODO - not being used now

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
