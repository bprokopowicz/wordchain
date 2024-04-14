class DisplayInstruction {
    constructor(word, displayType, changePosition, wasCorrect) {
        this.word = word;
        this.wordLength = word.length;
        this.displayType = displayType;
        this.changePosition = changePosition;
        this.wasCorrect = wasCorrect;
    }

    toStr() {

        var returnStr = `${this.displayType}`;

        if (this.word.length !== 0) {
            returnStr += ` word: ${this.word}`;
        } else {
            returnStr += ` wordLength: ${this.wordLength}`;
        }

        if (this.displayType !== "future") {
            returnStr += `, wasCorrect: ${this.wasCorrect}`;
        }

        if (this.displayType === "change" || this.displayType === "future") {
            returnStr += `, changePosition: ${this.changePosition}`;
        }

        if (this.endOfGame) {
            returnStr += "<p>=== END OF GAME!";
        }

        return returnStr;
    }
}

export { DisplayInstruction };
