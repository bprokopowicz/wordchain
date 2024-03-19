import sys


class WordChainDict():
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

    def copy(self):
        return WordChainDict(list(self.wordSet))

    def findAdderWords(self, word):
        """
        Find all valid words that add one letter to word.
        """
        adders = list()

        for position in range(len(word)+1):
            for letter in self.Letters:
                potentialWord = word[0:position] + letter + word[position:]

                if potentialWord != word and self.isWord(potentialWord):
                    adders.append(potentialWord)

        return adders

    def findNextWords(self, word):
        adders       = self.findAdderWords(word)
        removers     = self.findRemoverWords(word)
        replacements = self.findReplacementWords(word)

        nextWords = replacements + adders + removers
        # the result needs to be de-duped, as there is more than one way to reach the same next word.
        # for example deleting 3rd or 4th letter in cell.
        
        return list(set(nextWords))

    def findRemoverWords(self, word):
        """
        Find all valid words with one letter removed from word.
        """
        removers = list()

        for position, letter in enumerate(word):
            potentialWord = word[0:position] + word[position+1:]

            if potentialWord != word and self.isWord(potentialWord):
                removers.append(potentialWord)

        return removers

    def findReplacementWords(self, word):
        """
        Find all valid words that are replacements of one letter in word
        with any other letter.
        """
        replacements = list()
        for position in range(len(word)):
            for letter in self.Letters:
                if position == 0:
                    potentialWord = letter + word[1:]
                elif position < len(word) - 1:
                    potentialWord = word[0:position] + letter + word[position+1:]
                else:
                    potentialWord = word[:-1] + letter

                if potentialWord != word and self.isWord(potentialWord):
                    replacements.append(potentialWord)
            
        return replacements

    def remove(self, word):
        if (not word in self.wordSet):
            print (f"Error trying to remove {word} from dictionary")
        self.wordSet.remove(word)

    def getSize(self):
        return len(self.wordSet)

    def getWordSet(self):
        return self.wordSet

    def isWord(self, word):
        return word.lower() in self.wordSet

