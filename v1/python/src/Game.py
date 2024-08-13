import copy
import heapq
import sys

sys.path.insert(0, "../src")

from GenericBaseClass import *
from Solver import *
from WordChainDict import *

class Game(GenericBaseClass):
    OK = "ok"
    NOT_A_WORD = "not a word"
    NOT_ONE_STEP = "not one step away"
    DEAD_END = "no solution from this word"
    DUPLICATE = "word already played"

    def __init__(self, wordChainDict, solution):
        self.wordChainDict = wordChainDict
        self.solution = solution
        firstWord = solution.getFirstWord()
        self.solutionInProgress = Solution([firstWord], solution.target)

    def isSolved(self):
        return (self.solutionInProgress.isSolved() or
                self.solutionInProgress.getLastWord() == self.solution.getPenultimateWord())

    def playReplaceChar(self, index, c):
        # replace char at index in last word with 'c' 
        inWord = self.solutionInProgress.getLastWord()
        newWord = f"{inWord[:index]}{c}{inWord[index+1:]}"
        return self.playWord(newWord)

    def playRemoveChar(self, index): 
        #index is given as one of [0 .. len)
        inWord = self.solutionInProgress.getLastWord()
        newWord = f"{inWord[:index]}{inWord[index+1:]}"
        return self.playWord(newWord)
        
    def playInsertChar(self, index, c):
        # insert char at index in last word with 'c' 
        inWord = self.solutionInProgress.getLastWord()
        newWord = f"{inWord[:index]}{c}{inWord[index:]}"
        return self.playWord(newWord)

    def playWord(self, word):
        if not self.wordChainDict.isWord(word):
            return Game.NOT_A_WORD

        lastWordPlayed = self.solutionInProgress.getLastWord()

        if not word in self.wordChainDict.findNextWords(lastWordPlayed):
            return Game.NOT_ONE_STEP

        if self.solutionInProgress.isWordInSolution(word):
            return Game.DUPLICATE
            
        nextStep = self.solutionInProgress.numSteps() + 1
        if self.solution.getWordByStep(nextStep) == word:
            self.solutionInProgress.addWord(word)
            return Game.OK

        newSolver = Solver(self.wordChainDict, word, self.solution.getTarget())
        potentialNewSolution = newSolver.solveIt(solutionPrefix=self.solutionInProgress.getWordList())
        if potentialNewSolution.isSolved():
            self.solution = potentialNewSolution
            self.solutionInProgress.addWord(word)
            return Game.OK
        else:
            return Game.DEAD_END

    def showGame(self):
        playedWords = self.solutionInProgress.getWordList()
        solutionWords = self.solution.getWordList()
        resultStr = "";

        for i in range(0, len(solutionWords)):
            stepStr = "{:5s}".format("[{}]".format(i))
            if (i <= self.solutionInProgress.numSteps()):
                resultStr += "{}{}\n".format(stepStr, playedWords[i])
            else:
                resultStr += "{}{}\n".format(stepStr, self.showUnplayedWord(solutionWords[i], solutionWords[i-1]))
        return resultStr

    def showSolution(self):
        return str(self.solution.getWordList())


    # words not yet played should just use ***** and '!' to indicate shape of changes
    def showUnplayedWord(self, word, previousWord):
        unplayedWord = ""
        if len(word) == len(previousWord):
            for position, letter in enumerate(word):
                if word[position] == previousWord[position]:
                   unplayedWord += "*"
                else:
                    unplayedWord += "!"
        else:
            # add or remove a letter yielding n chars
            unplayedWord = "*****************"[0:len(word)]
                
        return unplayedWord 

    def showWordHint(self, word, previousWord):
        hint = ""
        if len(word) == len(previousWord):
            hint = self.showUnplayedWord(word, previousWord)
        elif len(word) < len(previousWord):
            # remove a letter numbered 1..len(previousWord)
            hint =  "123456789abcde"[0:len(previousWord)]
        else:
            # add a letter somewhere in previousi, including before and after: 
            for i in range (0, len(previousWord)):
                hint += str(i)
                hint += previousWord[i]
            hint += str(len(previousWord))

        return hint

