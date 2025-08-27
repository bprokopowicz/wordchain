import { Persistence } from './Persistence.js';
import * as Const from './Const.js';

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

    // Testing for record() is done by inspected window.dataLayer[]
    // eventData is an optional object of parameters (key: value) for the event.

    static record(eventName, eventData = {}) {
        if (! window.dataLayer) {
            console.error("can't record event:", eventName, "because window.dataLayer is missing.");
            return;
        }
        let eventObj = {event: eventName}
        let payload = { ...eventObj, ...eventData };
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
