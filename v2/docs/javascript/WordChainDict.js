import { BaseLogger } from './BaseLogger.js';``

// Synchronously wait for the word list to download.
// Pop the last entry which is always an empty string following the last new-line.
// TODO: This should use Const.DICT_URL.
const globalWordList = await fetch("http://localhost:8000/docs/resources/WordFreqDict")
    .then(resp => resp.text())
    .then(text => text.split("\n"))
    .then(words => words.map((x)=>x.toUpperCase()))
    .then(words => words.slice(0,-1));

class WordChainDict extends BaseLogger {
    constructor(wordList=[]) {
        super();

        if (wordList.length == 0) {
            this.wordSet = new Set(globalWordList);
        } else {
            this.wordSet = new Set(wordList.map((x)=>x.toUpperCase()));
        }

        this.logDebug(`Dictionary has ${this.getSize()} words.`, "dictionary");
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // duplicate a dictionary.  Useful before destructively searching a dictionary to avoid repeats.

    copy() {
        let wordList = this.getWordList();
        this.shuffleArray(wordList);
        let newDict = new WordChainDict(wordList);  
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

        let nextWordsSortedArray = Array.from(nextWords);
        nextWordsSortedArray.sort();
        this.logDebug(`nextWords for ${word}: ${nextWordsSortedArray}`);
        return nextWordsSortedArray;

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
