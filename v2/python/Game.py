from Solver import *
from WordChainDict import *

class Game:

    REPLACE_CHAR = '?'
    UNKNOWN_CHAR = '*'
    NOT_A_WORD = 'not a word'
    OK = 'OK'

    def __init__(self, dictionary, start, end):
        self.dictionary = dictionary
        self.start = start
        self.end = end
        self.partialSolution = PartialSolution(start, end)
        self.fullSolutionGivenProgress = Solver.solve(self.dictionary, self.partialSolution)

    def isValid(self):
        return self.fullSolutionGivenProgress.success()

    def getError(self):
        return self.fullSolutionGivenProgress.getError()

    def isSolved(self):
        return self.partialSolution.isSolved()

    def replace(self, index, ch): 
        oldWord = self.partialSolution.getLastWord()
        newWord = f"{oldWord[:index]}{ch}{oldWord[index+1:]}"
        return self.addWordIfExists(newWord)

    def remove(self, index):
        oldWord = self.partialSolution.getLastWord()
        newWord = f"{oldWord[:index]}{oldWord[index+1:]}"
        return self.addWordIfExists(newWord)

    def insert(self, index, ch): 
        oldWord = self.partialSolution.getLastWord()
        newWord = f"{oldWord[:index]}{ch}{oldWord[index:]}"
        return self.addWordIfExists(newWord)

    # in the actual game, only valid inputs will be given because the user must select one of the given inputs.
    def addWordIfExists(self, word):
        if self.dictionary.isWord(word):
            self.partialSolution.addWord(word)
            self.fullSolutionGivenProgress = Solver.solve(self.dictionary, self.partialSolution)
            return self.OK
        else:
            return f"{self.NOT_A_WORD} {word}"

    # words not yet played should just use ***** and '?' to indicate shape of changes
    def showUnplayedWord(self, word, previousWord):
        unplayedWord = ""
        if len(word) == len(previousWord):
            for position, letter in enumerate(word):
                if word[position] == previousWord[position]:
                   unplayedWord += self.UNKNOWN_CHAR
                else:
                    unplayedWord += self.REPLACE_CHAR
        else:
            # add or remove a letter yielding n chars
            unplayedWord = self.UNKNOWN_CHAR*len(word)
        return unplayedWord

    def nextWordHint(self):
        previousWord = self.partialSolution.getLastWord()
        word = self.fullSolutionGivenProgress.getNthWord(self.partialSolution.numWords())
        hint = ""
        if len(word) == len(previousWord):
            hint = self.showUnplayedWord(word, previousWord)
            hint += " give replacement letter: "
        elif len(word) < len(previousWord):
            # remove a letter numbered 1..len(previousWord)
            hint =  "123456789abcde"[0:len(previousWord)]
            hint += " give one location to delete: "
        else:
            # add a letter somewhere in previousi, including before and after:
            for i in range (0, len(previousWord)):
                hint += str(i) 
                hint += previousWord[i]
            hint += str(len(previousWord))
            hint += " give  ic to insert 'c' at position i: "
        
        return hint
    

    def asciiDisplay(self):
        display = []
        for i in range(self.fullSolutionGivenProgress.numWords()):
            word = self.fullSolutionGivenProgress.getNthWord(i)
            if i < self.partialSolution.numWords():
                display.append(word)
            else:
                # this word should be shown as an unplayed shape, not the actual letters
                display.append(self.showUnplayedWord(word, previousWord))
            previousWord=word

        display.append(self.end)
        return "\n".join(display)
