import { BaseLogger } from './BaseLogger.js';``
import * as Const from './Const.js';

// Synchronously wait for the word list to download.
// This code runs before any other code
// Pop the last entry which is always an empty string following the last new-line.
// TODO: This should use Const.DICT_URL.

const globalWordList = await fetch("http:/docs/resources/WordChainDict")
    .then(resp => resp.text())
    .then(text => text.split("\n"))
    .then(words => words.map((x)=>x.toUpperCase()))
    .then(words => words.slice(0,-1));

const scrabbleWordList = await fetch("http:/docs/resources/Scrabble3-6")
    .then(resp => resp.text())
    .then(text => text.split("\n"))
    .then(words => words.map((x)=>x.toUpperCase()))
    .then(words => words.slice(0,-1));

class WordChainDict extends BaseLogger {

    constructor(wordList=[]) {
        super();

        if (wordList.length == 0) {
            this.shuffleArray(globalWordList);
            this.wordSet = new Set(globalWordList);
        } else {
            this.shuffleArray(wordList);
            this.wordSet = new Set(wordList.map((x)=>x.toUpperCase()));
        }

        Const.GL_DEBUG && this.logDebug(`Dictionary has ${this.getSize()} words.`, "dictionary");
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
        let newDict = new WordChainDict(wordList);  
        Const.GL_DEBUG && this.logDebug(`dictionary copy has ${newDict.getSize()} words.`, "dictionary");
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
                Const.GL_DEBUG && this.logDebug(`>>>>> potential: ${potentialWord}`, "dictionary-details");

                if (this.isWord(potentialWord)) {
                    Const.GL_DEBUG && this.logDebug(`>>>>> adding adder: ${potentialWord}`, "dictionary-details");
                    adders.add(potentialWord);
                }
            }
        }

        Const.GL_DEBUG && this.logDebug(`adders for ${word}: ${Array.from(adders).sort()}`, "dictionary-details");
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
        Const.GL_DEBUG && this.logDebug(`nextWords for ${word}: ${nextWordsSortedArray}`, "dictionary");
        return nextWordsSortedArray;

    }

    // Find the words that result from removing one letter anywhere in word.
    findRemoverWords(word) {
        let removers = new Set();

        // Test isWord() when we remove each each letter in word.
        for (let wordIndex = 0; wordIndex < word.length; wordIndex++) {
            let potentialWord = word.substr(0, wordIndex) + word.substr(wordIndex+1);
            Const.GL_DEBUG && this.logDebug(`>>>>> potential: ${potentialWord}`, "dictionary-details");
            if (this.isWord(potentialWord)) {
                Const.GL_DEBUG && this.logDebug(`>>>>> adding remover: ${potentialWord}`, "dictionary-details");
                removers.add(potentialWord);
            }
        }

        Const.GL_DEBUG && this.logDebug(`removers for ${word}: ${Array.from(removers).sort()}`, "dictionary-details");
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

                Const.GL_DEBUG && this.logDebug(`>>>>> potential: ${potentialWord}`, "dictionary-details");
                if (potentialWord !== word && this.isWord(potentialWord)) {
                    Const.GL_DEBUG && this.logDebug(`>>>>> adding replacement: ${potentialWord}`, "dictionary-details");
                    replacements.add(potentialWord);
                }
            }
        }

        Const.GL_DEBUG && this.logDebug(`replacements for ${word}: ${Array.from(replacements).sort()}`, "dictionary-details");
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

        const result = this.wordSet.has(theWord);
        Const.GL_DEBUG && this.logDebug(`is ${theWord} in Dictionary of ${this.getSize()} words: ${result}`, "dictionary-details");
        return result;
    }

    addWord(word) {
        this.wordSet.add(word.toUpperCase());
    }

    removeWord(word) {
        this.wordSet.delete(word.toUpperCase());
    }
};

export { WordChainDict, globalWordList, scrabbleWordList };
