import copy
import heapq
import sys

sys.path.insert(0, "../src")

from GenericBaseClass import *

class Solver(GenericBaseClass):
    def __init__(self, wordSeqDict, fromWord, toWord):
        self.wordSeqDict = wordSeqDict
        self.fromWord = fromWord
        self.toWord = toWord

    def breadthFirstSolve(self, startingSolution):

        workingSolutions = []
        heapq.heappush(workingSolutions, startingSolution)

        longestSolution = 0
        while len(workingSolutions) != 0:
            solution = heapq.heappop(workingSolutions)
            self.logDebug("first working solution: {}".format(solution), tags="solveDetail")
            if solution.numSteps() > longestSolution:
                longestSolution = solution.numSteps()
                self.logDebug("longestSolution: {}".format(longestSolution), tags="perf")

            if solution.isSolved():
                return solution

            lastWord = solution.getLastWord()
            nextWords = self.wordSeqDict.findNextWords(lastWord)
            nextWords -= solution.getWordSet()

            for word in nextWords:
                newWorkingSolution = solution.copy().addWord(word)
                self.logDebug("   adding {}".format(newWorkingSolution), tags="solveDetail")
                heapq.heappush(workingSolutions, newWorkingSolution)

            if len(workingSolutions) % 1000 == 0:
                self.logDebug("workingSolutions length: {}".format(len(workingSolutions)), tags="perf")

            self.logDebug("-----", tags="solveDetail")
            
        return solution.addError("No solution") 

    def depthFirstSolve(self, solution):
        if solution.isSolved():
            return solution

        lastWord = solution.getLastWord()
        nextWords = self.wordSeqDict.findReplacementWords(lastWord)

        # Remove words in nextWords that are already in solution
        nextWords -= solution.getWordSet()

        if not nextWords:
            return solution.addError("Stuck at {}".format(lastWord))

        for word in nextWords:
            solution.addWord(word)
            newSolution = self.depthFirstSolve(solution)
            if newSolution.success():
                return newSolution
            
        return solution.addError("No solution") 

    def solveIt(self, depth=False):
        solution = Solution(list(), self.toWord)

        if not self.wordSeqDict.isWord(self.fromWord): 
            return solution.addError("Sorry, '{}' is not a word".format(self.fromWord))
            
        if not self.wordSeqDict.isWord(self.toWord): 
            return solution.addError("Sorry, '{}' is not a word".format(self.toWord))

        solution.addWord(self.fromWord)
        if depth:
            return self.depthFirstSolve(solution)
        else:
            return self.breadthFirstSolve(solution)
            
class Solution(GenericBaseClass):
    def __init__(self, wordList, target, distance=None):
        self.wordList = copy.copy(wordList)
        self.target = target
        self.errorMessage = None
        self.distance = 100 if distance is None else distance

    def __eq__(self, other):
        return self.distance == other.distance

    def __lt__(self, other):
        return self.distance < other.distance

    def __str__(self):
        if self.errorMessage:
            return self.errorMessage
        else:
            return "{} [distance to '{}' is {}]".format(self.wordList, self.target, self.distance)
    
    def addError(self, errorMessage):
        self.errorMessage = errorMessage
        return self

    def addWord(self, newWord):
        self.wordList.append(newWord)
        self.distance = self.wordDistance(newWord, self.target) + len(self.wordList)
        return self

    def copy(self):
        return Solution(self.wordList, self.target, self.distance)
        
    def getError(self):
        return self.errorMessage

    def getLastWord(self):
        return self.wordList[-1]

    def getFirstWord(self):
        return self.wordList[0]

    def getWordSet(self):
        return set(self.wordList)

    def getWordList(self):
        return self.wordList

    def isSolved(self):
        return self.target == self.getLastWord()

    @staticmethod
    def wordDistance(word1, word2):
        len1 = len(word1)
        len2 = len(word2)

        if len1 == len2:
            matches = 0
            for index in range(len1):
                if word1[index] == word2[index]:
                    matches += 1
            distance = len1 - matches

        elif abs(len1 - len2) >= 2:
            distance = 100
        else:
            if len1 > len2:
                largerWord  = word1
                smallerWord = word2
            else:
                largerWord  = word2
                smallerWord = word1

            # Knock out letters one by one in largerWord, take smallest distance
            smallestDistance = 100
            for index in range(len(largerWord)):
                testWord = largerWord[0:index] + largerWord[index+1:] 
                distance = Solution.wordDistance(testWord, smallerWord)
                if distance < smallestDistance:
                    smallestDistance = distance

            distance = smallestDistance + 1

        return distance

    def numSteps(self):
        return len(self.wordList) - 1

    def play(self):
        print("TODO\n")

    def success(self):
        return self.errorMessage is None

    def summarize(self):
        return "{} [{} steps]".format(self.wordList, self.numSteps())

    def display(self):
        return "\n".join(self.wordList);
        
