import sys

sys.path.insert(0, "../src")

from GenericBaseClass import *

class WordChainDict(GenericBaseClass):
    Letters = [chr(l) for l in range(ord('a'), ord('z')+1)] 

    def __init__(self, wordList=None, maxLength=None):
        if wordList:
            wordList = [word.lower() for word in wordList]
        else:
            #dictFile = open("../../resources/ScrabbleDict279498", "r")
            #dictFile = open("../../resources/EnableDict172819", "r")
            #dictFile = open("../../resources/WordFreq38807", "r")
            dictFile = open("../../docs/resources/dict/WordFreqDict", "r")
            wordList = [line.strip().lower() for line in dictFile]
            dictFile.close()

        if not maxLength:
            maxLength = 20

        self.wordSet = set()
        for word in wordList:
            if word and word[0] != '#' and len(word) >= 3 and len(word) <= maxLength:
                self.wordSet.add(word)

    def __str__(self):
        return str(list(self.wordSet)[0:20])

    def findAdderWords(self, word):
        """
        Find all valid words that add one letter to word.
        """
        adders = set()

        for position in range(len(word)+1):
            for letter in self.Letters:
                potentialWord = word[0:position] + letter + word[position:]

                if potentialWord != word and self.isWord(potentialWord):
                    self.logDebug(">>>>> adding adder: {}".format(potentialWord), tags="addDetail")
                    adders.add(potentialWord)

        self.logDebug("adders for '{}': {}".format(word, sorted(adders)), "add,findDetail")
        return adders

    def findNextWords(self, word):
        adders       = self.findAdderWords(word)
        removers     = self.findRemoverWords(word)
        replacements = self.findReplacementWords(word)

        nextWords = replacements | adders | removers
        self.logDebug("nextWords for '{}': {}".format(word, sorted(nextWords)), tags="find")
        return nextWords

    def findRemoverWords(self, word):
        """
        Find all valid words with one letter removed from word.
        """
        removers = set()

        for position, letter in enumerate(word):
            potentialWord = word[0:position] + word[position+1:]

            if potentialWord != word and self.isWord(potentialWord):
                self.logDebug(">>>>> adding remover: {}".format(potentialWord), tags="removeDetail")
                removers.add(potentialWord)

        self.logDebug("removers for '{}': {}".format(word, sorted(removers)), tags="remove,findDetail")

        return removers

    def findReplacementWords(self, word):
        """
        Find all valid words that are replacements of one letter in word
        with any other letter.
        """
        replacements = set()
        for position in range(len(word)):
            for letter in self.Letters:
                if position == 0:
                    potentialWord = letter + word[1:]
                elif position < len(word) - 1:
                    potentialWord = word[0:position] + letter + word[position+1:]
                else:
                    potentialWord = word[:-1] + letter

                if potentialWord != word and self.isWord(potentialWord):
                    self.logDebug(">>>>> adding replacement: {}".format(potentialWord), tags="replaceDetail")
                    replacements.add(potentialWord)
            
        self.logDebug("replacements for '{}': {}".format(word, sorted(replacements)), "replace,findDetail")
        return replacements

    def getSize(self):
        return len(self.wordSet)

    def isWord(self, word):
        return word.lower() in self.wordSet

