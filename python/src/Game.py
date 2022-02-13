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
            if (i <= self.solutionInProgress.numSteps()):
                resultStr += "[{}] {}".format(i, self.showPlayedWord(playedWords[i]))
            #elif (i == self.solution.numSteps()) :
            #    resultStr += "[{}] {}".format(i, self.showLastWord(self.solution.getLastWord()))
            else:
                resultStr += "[{}] {}".format(i, self.showUnguessedWord(solutionWords[i], solutionWords[i-1]))
        return resultStr

    """
    def showLastWord(self, word):
        return "{}\n".format(word)
    """

    def showPlayedWord(self, word):
        return "{}\n".format(word)

    def showSolution(self):
        return str(self.solution.getWordList())

    def showUnguessedWord(self, word, previousWord):
        if len(word) == len(previousWord):
            unguessedWord = ""
            for position, letter in enumerate(word):
                if word[position] == previousWord[position]:
                    unguessedWord += "*"
                else:
                    unguessedWord += "!"
        else:
            unguessedWord = "*"*len(word)

        return unguessedWord + "\n"

