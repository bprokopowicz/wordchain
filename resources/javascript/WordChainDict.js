class WordChainDict extends BaseLogger {
    constructor() {
        super();
        this.loadDict();  
    }

    async fetchText(filePath) {
        let response = await fetch(filePath);
        let data = await response.text();
        return data;
    }

    async loadDict() {
        //let wordFileText = await this.fetchText("http://localhost:8000/dict/WordFreq38807");
        let wordFileText = await this.fetchText("/dict/WordFreq38807");
        let wordList = wordFileText.split("\n");
        // Without pop() we get an empty string in the set.
        wordList.pop();
        this.wordSet = new Set(wordList);
    }

    findAdderWords(word) {
        let adders = new Set();
        let alphabet = "abcdefghijklmnopqrstuvwxyz"

        for (let wordIndex = 0; wordIndex < word.length; wordIndex++) {
            for (let letterIndex = 0; letterIndex < 26; letterIndex++) {
                let letter = alphabet.substr(letterIndex, 1);
                let potentialWord = word.substr(0, wordIndex) + letter + word.substr(wordIndex);
                this.logDebug(`>>>>> potential: ${potentialWord}`, "adderDetail");
                if (potentialWord !== word && this.isWord(potentialWord)) {
                    this.logDebug(`>>>>> adding adder: ${potentialWord}`, "adderDetail");
                    adders.add(potentialWord);
                }
            }
        }

        this.logDebug(`adders for ${word}: ${Array.from(adders).sort()}`, "adders");
        return adders;
    }

    findNextWords(word) {
        let adders       = this.findAdderWords(word);
        let removers     = this.findRemoverWords(word);
        let replacements = this.findReplacementWords(word);

        // nextWords is the union of the 3 sets.
        let nextWords = new Set([...adders, ...removers, ...replacements]);
        this.logDebug(`nextWords for ${word}: ${Array.from(nextWords).sort()}`, "next");

        return nextWords;
    }

    findRemoverWords(word) {
        let removers = new Set();

        for (let wordIndex = 0; wordIndex < word.length; wordIndex++) {
            let potentialWord = word.substr(0, wordIndex) + word.substr(wordIndex+1);
            this.logDebug(`>>>>> potential: ${potentialWord}`, "removerDetail");
            if (potentialWord !== word && this.isWord(potentialWord)) {
                this.logDebug(`>>>>> adding remover: ${potentialWord}`, "removerDetail");
                removers.add(potentialWord);
            }
        }

        this.logDebug(`removers for ${word}: ${Array.from(removers).sort()}`, "removers");
        return removers;
    }

    findReplacementWords(word) {
        let replacements = new Set();
        let alphabet = "abcdefghijklmnopqrstuvwxyz"

        for (let wordIndex = 0; wordIndex < word.length; wordIndex++) {
            for (let letterIndex = 0; letterIndex < 26; letterIndex++) {
                let letter = alphabet.substr(letterIndex, 1);
                let potentialWord = '';

                if (wordIndex === 0) {
                    potentialWord = letter + word.substr(1)
                } else if (wordIndex < word.length - 1) {
                    potentialWord = word.substr(0, wordIndex) + letter + word.substr(wordIndex+1);
                } else {
                    potentialWord = word.substr(0, word.length - 1) + letter;
                }

                this.logDebug(`>>>>> potential: ${potentialWord}`, "replDetail");
                if (potentialWord !== word && this.isWord(potentialWord)) {
                    this.logDebug(`>>>>> adding replacement: ${potentialWord}`, "replDetail");
                    replacements.add(potentialWord);
                }
            }
        }

        this.logDebug(`replacements for ${word}: ${Array.from(replacements).sort()}`, "replacements");
        return replacements;
    }

    getSize() {
        return this.wordSet.length;
    }

    isWord(word="") {
        let theWord = word;
        if (theWord.length === 0) {
            throw new Error("WordChainDict.isWord(): Word cannot have length 0");
        }

        return this.wordSet.has(theWord);
    }
};

var GLdictionary = new WordChainDict();
