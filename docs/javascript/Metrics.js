import { Persistence } from './Persistence.js';
import * as Const from './Const.js';
import { BaseLogger } from './BaseLogger.js';

/**
 ** Static methods to record events (game started, game finished) 
 ** TODO: add a per user-device unique WordChain ID as a parameter to all these.
 **/

class Metrics {

    // these are strings that name 'events' for Google analytics.  
    static GAME_STARTED = "game_started";
    static GAME_FINISHED = "game_finished";

    // these are strings that name parameters of events for the GA4 server
    static GAME_NUMBER = "game_number"; 
    static WCID = "wcid";

    static logger = new BaseLogger();

    // Testing for record() is done by inspected window.dataLayer[]
    // eventData is an optional object of parameters (key: value) for the event.

    static testing = false;
    static testingPrefix = "test_";

    static record(eventName, eventData = {}) {
        if (! window.dataLayer) {
            console.error("can't record event:", eventName, "because window.dataLayer is missing.");
            return;
        }
        let prefix = "";
        if (Metrics.testing) {
            prefix = Metrics.testingPrefix;
        }
        let eventObj = {event: prefix + eventName}
        let payload = { ...eventObj, ...eventData };
        Const.GL_DEBUG && Metrics.logger.logDebug("Metrics.record() pushing payload to dataLayer:", payload, "metrics");
        window.dataLayer.push(payload);
    }

    static recordDailyGameStarted(gameNumber) {
        let eventData = {};
        eventData[Metrics.GAME_NUMBER] = gameNumber;
        Metrics.record(Metrics.GAME_STARTED, eventData); 
    }

    static recordDailyGameFinished(gameNumber) {
        let eventData = {};
        eventData[Metrics.GAME_NUMBER] = gameNumber;
        Metrics.record(Metrics.GAME_FINISHED, eventData);
    }
}

export { Metrics };
