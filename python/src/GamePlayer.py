import copy
import heapq
import sys

sys.path.insert(0, "../src")

from GenericBaseClass import *
from Solver import *
from WordSeqDict import *

class GamePlayer(GenericBaseClass):
    OK = 1
    NOT_A_WORD = 2
    WRONG = 3

    def __init__(self, wordSeqDict, solution)):
        self.wordSeqDict = wordSeqDict
        self.solution = solution
        startingWord = solution.getFirstWord()
        self.game = Solution([firstWord]], solution.target)

    def playWord(self, word):
        if !self.wordSeqDict.isWord(word):
            return NOT_A_WORD

        self.game.addWord(word)

        if (self.soltion.getWordList().at(self.game.numSteps()) == word):
            return OK

        return WRONG
        self.fullDict.isWord
