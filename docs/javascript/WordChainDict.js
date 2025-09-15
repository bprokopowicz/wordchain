import { BaseLogger } from './BaseLogger.js';``
import * as Const from './Const.js';
import { COV } from './Coverage.js';

// Synchronously wait for the word list to download.
// This code runs before any other code
// Pop the last entry which is always an empty string following the last new-line.

const globalWordList = await fetch(Const.DICT_URL)
    .then(resp => resp.text())
    .then(text => text.split("\n"))
    .then(words => words.map((x)=>x.toUpperCase()))
    .then(words => words.slice(0,-1));

const scrabbleWordList = await fetch(Const.SCRABBLE_DICT_URL)
    .then(resp => resp.text())
    .then(text => text.split("\n"))
    .then(words => words.map((x)=>x.toUpperCase()))
    .then(words => words.slice(0,-1));

class WordChainDict extends BaseLogger {

    constructor(wordList=[]) {
        super();
        const CL = "WordChainDict.constructor"; 
        COV(0, CL);

        if (wordList.length == 0) {
            COV(1, CL);
            this.shuffleArray(globalWordList);
            this.wordSet = new Set(globalWordList);
        } else {
            COV(2, CL);
            this.shuffleArray(wordList);
            this.wordSet = new Set(wordList.map((x)=>x.toUpperCase()));
        }
        COV(3, CL);

        Const.GL_DEBUG && this.logDebug("Dictionary has", this.getSize(), " words.", "dictionary");
    }

    shuffleArray(array) {
        const CL = "WordChainDict.shuffleArray";
        COV(0, CL);
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // duplicate a dictionary.  Useful before destructively searching a dictionary to avoid repeats.

    copy() {
        const CL = "WordChainDict.copy";
        COV(0, CL);
        let wordList = this.getWordList();
        let newDict = new WordChainDict(wordList);
        Const.GL_DEBUG && this.logDebug("dictionary copy has ", newDict.getSize(), " words.", "dictionary");
        return newDict;
    }

    // Find the words that result from adding one letter
    // anywhere in word.
    findAdderWords(word) {
        const CL = "WordChainDict.findAdderWords";
        COV(0, CL);
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
                Const.GL_DEBUG && this.logDebug(">>>>> potential: ", potentialWord, "dictionary-details");

                if (this.isWord(potentialWord)) {
                    COV(1, CL);
                    Const.GL_DEBUG && this.logDebug(">>>>> adding adder: ", potentialWord, "dictionary-details");
                    adders.add(potentialWord);
                }
            }
        }

        COV(2, CL);
        Const.GL_DEBUG && this.logDebug("adders for ", word, ": ", Array.from(adders).sort(), "dictionary-details");
        return adders;
    }

    // Get all of the words that can come after word by adding, removing,
    // or replacing a letter.
    findNextWords(word) {
        const CL = "WordChainDict.findNextWords";
        COV(0, CL);
        let adders       = this.findAdderWords(word);
        let removers     = this.findRemoverWords(word);
        let replacements = this.findReplacementWords(word);

        // nextWords is the union of the 3 sets.
        let nextWords = new Set([...adders, ...removers, ...replacements]);

        let nextWordsSortedArray = Array.from(nextWords);
        nextWordsSortedArray.sort();
        Const.GL_DEBUG && this.logDebug("nextWords for ", word, ": ", nextWordsSortedArray, "dictionary");
        return nextWordsSortedArray;
    }

    // Find the words that result from removing one letter anywhere in word.
    findRemoverWords(word) {
        const CL = "WordChainDict.findRemoverWords";
        COV(0, CL);
        let removers = new Set();

        // Test isWord() when we remove each each letter in word.
        for (let wordIndex = 0; wordIndex < word.length; wordIndex++) {
            let potentialWord = word.substr(0, wordIndex) + word.substr(wordIndex+1);
            Const.GL_DEBUG && this.logDebug(">>>>> potential: ", potentialWord, "dictionary-details");
            if (this.isWord(potentialWord)) {
                COV(1, CL);
                Const.GL_DEBUG && this.logDebug(">>>>> adding remover: ", potentialWord, "dictionary-details");
                removers.add(potentialWord);
            }
        }

        Const.GL_DEBUG && this.logDebug("removers for ", word, ": ", Array.from(removers).sort(), "dictionary-details");
        return removers;
    }

    // Find the words that result from replacing the letter at a specific location
    findReplacementWordsAtLoc(word, wordIndex) {
        const CL = "WordChainDict.findReplacementWords";
        COV(0, CL);
        let replacements = new Set();
        let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

        // Test isWord() when we replace each letter A-Z for 'letter' of the word.
        const currentLetter = word.substr(wordIndex, 1);

        for (let alphaIndex = 0; alphaIndex < 26; alphaIndex++) {
            let newLetter = alphabet.substr(alphaIndex, 1);
            if (newLetter != currentLetter) { // don't re-create the same word
                COV(1, CL);
                // Construct the potential word, replacing the current letter in word 
                // with the newLetter from A-Z.
                let potentialWord = '';
                if (wordIndex === 0) {
                    COV(2, CL);
                    potentialWord = newLetter + word.substr(1)
                } else if (wordIndex < word.length - 1) {
                    COV(3, CL);
                    potentialWord = word.substr(0, wordIndex) + newLetter + word.substr(wordIndex+1);
                } else {
                    COV(4, CL);
                    potentialWord = word.substr(0, word.length - 1) + newLetter;
                }

                Const.GL_DEBUG && this.logDebug(">>>>> potential: ", potentialWord, "dictionary-details");
                if (this.isWord(potentialWord)) {
                    COV(5, CL);
                    Const.GL_DEBUG && this.logDebug(">>>>> adding replacement: ", potentialWord, "dictionary-details");
                    replacements.add(potentialWord);
                }
            }
        }

        COV(6, CL);
        Const.GL_DEBUG && this.logDebug("changes from", word, ": ", Array.from(replacements).sort(), "dictionary-details");
        return replacements;
    }


    // Find the words that result from replacing one letter anywhere in word.
    findReplacementWords(word) {
        const CL = "WordChainDict.1findReplacementWords";
        COV(0, CL);
        let replacements = new Set();
        for (let wordIndex = 0; wordIndex < word.length; wordIndex++) {
            for (const replacement of this.findReplacementWordsAtLoc(word, wordIndex)) {
                replacements.add(replacement);
            }
        }

        Const.GL_DEBUG && this.logDebug("replacements for ", word, ": ", Array.from(replacements).sort(), "dictionary-details");
        return replacements;
    }

    // returns zero-based location of (first, if any) changed letter.  
    // -1 if no letters are different.
    static findChangedLetterLocation(word1, word2) {
        const CL = "WordChainDict.findChangedLetterLocation";
        COV(0, CL);
        if (word1.length != word2.length) {
            console.error("findChangedLetterLocation() must be given same-length words.");
            return -1;
        }
        for (let i=0; i < word1.length; i++) {
            if (word1[i] != word2[i]) {
                COV(1, CL);
                return i;
            }       
        }           
        console.error("can't find difference between ", word1, " and ", word2);
        return -1;
    }    

    // put the HOLE characted at 'pos' in 'word'.  pos is 1-indexed, to agree with changePosition in the display code.
    static putHoleAtCharacterPos(word, pos) {
        const wordWithHole = word.substring(0, pos-1) + Const.HOLE + word.substring(pos);
        return wordWithHole;
    }

    // findOptionsAtWordStep is only used to measure a solution's difficulty.  Given the known step
    // 'thisWord' -> 'nextWord', what are all the words possible that have the
    // same "shape" as the change thisWord -> nextWord?
    // E.g. if thisWord -> nextWord is a delete letter, find all the possible delete letters with 'thisWord'.
    // If thisWord->nextWord is a change letter at 2, find all the possible changes at letter 2 in thisWord.

    findOptionsAtWordStep(thisWord, nextWord) {
        const CL = "WordChainDict.findOptionsAtWordStep";
        COV(0, CL);
        var replacementWords;
        if (thisWord.length == nextWord.length) {
            COV(1, CL);
            // we tell the user which letter location to change, so only the changes of that
            // location should count towards difficulty
            let loc = WordChainDict.findChangedLetterLocation(thisWord, nextWord);
            if (loc >= 0) {
                replacementWords = this.findReplacementWordsAtLoc(thisWord, loc);
            } else {
                console.error("can't find location of changed letter from ", thisWord, " to ", nextWord)
            }
        } else if (thisWord.length > nextWord.length ){
            COV(2, CL);
            replacementWords = this.findRemoverWords(thisWord);
        } else {
            COV(3, CL);
            replacementWords = this.findAdderWords(thisWord);
        }
        Const.GL_DEBUG && this.logDebug("options from", thisWord, "to", nextWord, "are:", replacementWords, "dictionary");
        COV(4, CL);
        return replacementWords;
    }

    // Get the size of the dictionary.
    getSize() {
        const CL = "WordChainDict.getSize";
        COV(0, CL);
        return this.wordSet.size;
    }

    getWordList() {
        const CL = "WordChainDict.getWordList";
        COV(0, CL);
        return Array.from(this.wordSet);
    }

    // Test whether a word is in the dictionary.
    // Give a default of empty string so word is not undefined,
    // because  you can't get the length of undefined.
    isWord(word="") {
        const CL = "WordChainDict.isWord";
        COV(0, CL);
        let theWord = word.toUpperCase();
        if (theWord.length === 0) {
            throw new Error("WordChainDict.isWord(): Word cannot have length 0");
        }

        const result = this.wordSet.has(theWord);
        Const.GL_DEBUG && this.logDebug("is ", theWord, " in Dictionary? ", result, "dictionary-details");
        return result;
    }

    addWord(word) {
        const CL = "WordChainDict.addWord";
        COV(0, CL);
        this.wordSet.add(word.toUpperCase());
    }

    removeWord(word) {
        const CL = "WordChainDict.removeWord";
        COV(0, CL);
        this.wordSet.delete(word.toUpperCase());
    }
};

export { WordChainDict, globalWordList, scrabbleWordList };
