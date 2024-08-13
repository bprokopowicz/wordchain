import { Cookie } from './Cookie.js';

class BaseLogger {
    constructor() {
    }

    logDebug(...args) {
        let debugTags = Cookie.get('Debug'),
            messageTags = args[arguments.length - 1];
        
        if (typeof messageTags === "string") {
            if (debugTags && messageTags) {

                let argumentsAsArray = Array.from(arguments),
                    itemsToLog = argumentsAsArray.slice(0, -1),
                    tagsTurnedOn = new Set(debugTags.split(',')),
                    tagsForMessage = new Set(messageTags.split(','));

                const intersection = new Set(Array.from(tagsTurnedOn).filter(x => tagsForMessage.has(x)));

                if (intersection.size !== 0) {
                    console.log(...itemsToLog);
                }
            }
        } else {
            console.error("Last argument of logDebug() is not a string;\n", ...args);
        }

    }
}

export { BaseLogger };
