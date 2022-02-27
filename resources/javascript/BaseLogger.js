class BaseLogger {
    constructor() {
    }

    logDebug(message, tags) {
        let tagsTurnedOn = new Set();
        let tagsForMessage = new Set();

        if (GLdebug) {
            tagsTurnedOn = new Set(GLdebug.split(','));
        } 

        if (tags) {
            tagsForMessage = new Set(tags.split(','));
        }

        const intersection = new Set(Array.from(tagsTurnedOn).filter(x => tagsForMessage.has(x)));

        if (intersection.size !== 0) {
            console.log(message);
        }
    }
}
