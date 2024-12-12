import { Cookie } from './Cookie.js';

class BaseLogger {
    constructor() {
    }

    logDebug(...args) {
        let debugTags = Cookie.get(Cookie.DEBUG),
            messageTags = args[arguments.length - 1];

        if (typeof messageTags === "string") {
            if (debugTags && messageTags) {

                let argumentsAsArray = Array.from(arguments),
                    itemsToLog = argumentsAsArray.slice(0, -1),
                    tagsTurnedOn = debugTags.split(','),
                    tagsForMessage = messageTags.split(',');

                for (const tagTurnedOn of tagsTurnedOn) {
                    if ((tagTurnedOn == "all") || tagsForMessage.includes(tagTurnedOn)) {
                        console.log(...itemsToLog);
                        break;
                    }
                }
            }
        } else {
            console.error("Last argument of logDebug() is not a string;\n", ...args);
        }
    }
}

export { BaseLogger };
