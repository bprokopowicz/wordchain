import { BaseLogger } from './BaseLogger.js';

class WordChainDict extends BaseLogger {
    constructor(wordList=[]) {
        super();

        if (wordList.length == 0) {

            // fetch the word list from the interwebs.
            // TODO put this URL into Const
            //const url = "https://bprokopowicz.github.io/wordchain/resources/dict/WordFreqDict";
            const url = "http://localhost:8000/docs/resources/WordFreqDict";
            this.logDebug(`Downloading dictionary from ${url}`, "dictionary");

            wordList = ["can", "not", "read", "words"];
            (async() => {
                console.log("In async");
                const response = await fetch(url);
                const wordFileText = await response.text();
                console.log(`finished await response.  Read ${wordFileText.length} chars.`);
                wordList = wordFileText.split("\n");
                console.log(`Read ${wordList.length} words.`);
            })();
            // Without pop() we get an empty string in the set.
            wordList.pop();
        }
        this.wordSet = new Set(wordList.map((x)=>x.toUpperCase()));
        this.logDebug(`Dictionary has ${this.getSize()} words.`, "dictionary");
        this.logDebug(`they are: ${this.getWordList()}.`, "dictionary");
    }

    // duplicate a dictionary.  Useful before destructively searching a dictionary to avoid repeats.

    copy() {
        let newDict = new WordChainDict(this.getWordList());  // a non-empty placeholder to avoid fetching the whole dictionary
        this.logDebug(`dictionary copy has ${newDict.getSize()} words.`, "dictionary");
        return newDict;
    }

    // Find the words that result from adding one letter
    // anywhere in word.
    findAdderWords(word) {
        let adders = new Set();
        let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

        // Test isWord() when we add each letter A-Z in each position of the word.
        // Note: must go until wordIndex <= word.length (not the typical <
        // for a loop through a sequence) so that we also add letters to
        // the end of the word to find adders.
        for (let wordIndex = 0; wordIndex <= word.length; wordIndex++) {
            for (let letterIndex = 0; letterIndex < 26; letterIndex++) {
                let letter = alphabet.substr(letterIndex, 1);

                let potentialWord = word.substr(0, wordIndex) + letter + word.substr(wordIndex);
                this.logDebug(`>>>>> potential: ${potentialWord}`, "adderDetail");

                if (this.isWord(potentialWord)) {
                    this.logDebug(`>>>>> adding adder: ${potentialWord}`, "adderDetail");
                    adders.add(potentialWord);
                }
            }
        }

        this.logDebug(`adders for ${word}: ${Array.from(adders).sort()}`, "adders");
        return adders;
    }

    // Get all of the words that can come after word by adding, removing,
    // or replacing a letter.
    findNextWords(word) {
        let adders       = this.findAdderWords(word);
        let removers     = this.findRemoverWords(word);
        let replacements = this.findReplacementWords(word);

        // nextWords is the union of the 3 sets.
        let nextWords = new Set([...adders, ...removers, ...replacements]);
        this.logDebug(`nextWords for ${word}: ${Array.from(nextWords).sort()}`, "next");

        return nextWords;
    }

    // Find the words that result from removing one letter anywhere in word.
    findRemoverWords(word) {
        let removers = new Set();

        // Test isWord() when we remove each each letter in word.
        for (let wordIndex = 0; wordIndex < word.length; wordIndex++) {
            let potentialWord = word.substr(0, wordIndex) + word.substr(wordIndex+1);
            this.logDebug(`>>>>> potential: ${potentialWord}`, "removerDetail");
            if (this.isWord(potentialWord)) {
                this.logDebug(`>>>>> adding remover: ${potentialWord}`, "removerDetail");
                removers.add(potentialWord);
            }
        }

        this.logDebug(`removers for ${word}: ${Array.from(removers).sort()}`, "removers");
        return removers;
    }

    // Find the words that result from replacing one letter anywhere in word.
    findReplacementWords(word) {
        let replacements = new Set();
        let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

        // Test isWord() when we replace each letter A-Z for each letter of the word.
        for (let wordIndex = 0; wordIndex < word.length; wordIndex++) {
            for (let letterIndex = 0; letterIndex < 26; letterIndex++) {
                let letter = alphabet.substr(letterIndex, 1);

                // Construct the potential word, replacing the current letter in word
                // with the current letter from A-Z.
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

    // Get the size of the dictionary.
    getSize() {
        return this.wordSet.size;
    }

    getWordList() {
        return Array.from(this.wordSet);
    }

    isLoaded() {
        return this.wordSet !== null;
    }

    // Test whether a word is in the dictionary.
    // Give a default of empty string so word is not undefined,
    // because  you can't get the length of undefined.
    isWord(word="") {
        let theWord = word.toUpperCase();
        if (theWord.length === 0) {
            throw new Error("WordChainDict.isWord(): Word cannot have length 0");
        }

        return this.wordSet.has(theWord);
    }

    removeWord(word) {
        this.wordSet.delete(word.toUpperCase());
    }
};

export { WordChainDict };
