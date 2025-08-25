import { Persistence } from './Persistence.js';
import * as Const from './Const.js';

/**
 ** Static methods to record events (game started, game finished) 
 ** TODO: add a per user-device unique WordChain ID as a parameter to all these.
 **/

class Metrics {

    // these are strings that name 'events' for the GA4 server.  
    static GAME_STARTED = "game_started";

    static GAME_FINISHED = "game_finished";
    // these are strings that name parameters of events for the GA4 server
    static GAME_NUMBER = "game_number"; // TODO  - add as a parameter 
    static WCID = "wcid";

    // Doesn't rercord event parameters yet.
    // Testing is done by inspected window.dataLayer[]

    static record(eventName) {
        if (! window.dataLayer) {
            console.error("can't record event:", eventName, "because window.dataLayer is missing.");
            return;
        }
        window.dataLayer.push({'event': eventName});
    }

    static recordDailyGameStarted() {
        Metrics.record(Metrics.GAME_STARTED); 
    }

    static recordDailyGameFinished() {
        Metrics.record(Metrics.GAME_FINISHED);
    }
}

export { Metrics };
