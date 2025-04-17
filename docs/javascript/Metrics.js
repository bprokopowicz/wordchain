import { Persistence } from './Persistence.js';
import * as Const from './Const.js';

/**
 ** Static methods to record events (game started, game finished) tagged with a per-user&device&browser 
 ** permanent ID known as the WCID
 **/

class Metrics {

    // Events are recorded in the query string when fetching the METRICS_URL.
    static GAME_STARTED = "gs";
    static GAME_FINISHED = "gf";
    static GAME_NUMBER = "gn";
    static GAME_WORDS_PLAYED = "gwp";
    static EVENT_DATA = "data";

    static WCID = "wcid";

    // abbreviations for word ratings:

    static abbrev = new Map([
        [Const.OK, 'ok'],
        [Const.WRONG_MOVE, 'wm'],
        [Const.GENIUS_MOVE, 'gm'],
        [Const.SCRABBLE_WORD, 'aw'], // advanced word
        [Const.SHOWN_MOVE, 'sm'],
        [Const.DODO_MOVE, 'dm'],
        [true, '1'],
        [false, '0']
    ]);

    // a dummy file that is retrieved from the current server
    static METRICS_URL = "/docs/resources/wcm"; 

    // an event-recording url looks like /docs/resources/wcm?wcid=<nnn>&<event>[&data=<datastr>]

    static record(eventName, eventData=null) {
        const wcid = Persistence.getWCID();
        let url = `${Metrics.METRICS_URL}?${wcid}&${eventName}`;
        if (eventData != null) {
            url = url + '&' + Metrics.EVENT_DATA + '='+ eventData;
        }
        fetch(url);
        return url; // for testing
    }

    static recordGameStarted() {
        return Metrics.record(Metrics.GAME_STARTED); // return value for testing
    }

    static recordGameFinished() {
        return Metrics.record(Metrics.GAME_FINISHED); // return value for testing
    }

    // record the game, given the GameState list of 'word, wasPlayed, rating'
    // recorded as /wcm?gwp&data=(word1:wasPlayed:rating),(word2:wasPlayed:rating),...)
    static recordGameWordsPlayed(gameState) {
        const eventData = gameState.map(tup => `(${tup[0]}:${this.abbrev.get(tup[1])}:${this.abbrev.get(tup[2])})`);
        const eventDataStr = eventData.join();
        return Metrics.record(Metrics.GAME_WORDS_PLAYED, eventDataStr); // return value for testing
    }
}

export { Metrics };
