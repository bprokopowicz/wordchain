import copy
import sys
from collections import deque

class Solver():
    # solve the puzzle fromWord to targetWord
    # When solving, do not repeat a word in the growing solution.  It IS OK to repeat a word in the 
    # starting solution (backing up from a dead-end).

    # static methods solve (dict,a,b) and resolve(dict,solutionSoFar)

    # solve the puzzle fromWord to targetWord, with a partial solution already given.  The 
    # partial solution may be just the starting word and the end word.
    def solve(dictionary, fromWord, toWord, debug=0):
        startingSolution = PartialSolution(fromWord, toWord)
        if (not dictionary.isWord(fromWord)):
            startingSolution.addError(fromWord + " is not a word.")
        if (not dictionary.isWord(toWord)):
            startingSolution.addError(toWord + " is not a word.")
        if (startingSolution.getError()):
            return startingSolution
        return Solver.resolve(dictionary, startingSolution, debug)

    def resolve(dictionary, startingSolution, debug=0):
        # make a local copy because we remove words from it while searching
        dictionary = dictionary.copy()
        workingSolutions = deque()
        wordsAlreadySearched = set()
        workingSolutions.append(startingSolution)
        numWordsSearched = 0

        while len(workingSolutions) != 0:
            #solution = heapq.heappop(workingSolutions)
            solution = workingSolutions.popleft()

            if solution.isSolved():
                return solution

            lastWord = solution.getLastWord()
            nextWords = set(dictionary.findNextWords(lastWord)) 

            # Without sorting nextWords, we did not consistently find the same solution.
            for word in sorted(nextWords):
                newWorkingSolution = solution.copy().addWord(word)
                dictionary.remove(word)
                workingSolutions.append(newWorkingSolution)
                if (debug):
                    print(f"adding working solution: {newWorkingSolution}")
                numWordsSearched += 1
                if (debug and (numWordsSearched % 1000 == 0)):
                    print(f"#words searched: {numWordsSearched}")

        return solution.addError("No solution") 
            
    def isDesired(puzzle, lowWordLen, highWordLen, minWords, maxWords):
        if puzzle.numWords() < minWords:
            return 0;
        if puzzle.numWords() > maxWords:
            return 0;
        if (puzzle.shortestWordLen() > lowWordLen):
            return 0;
        if (puzzle.longestWordLen() < highWordLen):
            return 0;
        return 1;

    # find puzzles using a starting word that have solutions meeting criteria 
    # for shortest word, longest word, and number of words.

    # idea - find solutions by looking at the first step and then apply the
    # adjusted criteria recursively.  E.g minSteps -> minSteps - 1 after a step
    # lowWordLen can be set to infinity if it is accomplished on a step
    # highWordLen can go to zero.  But if you need to reach low or high word counts,
    # favor looking at reduce/add a character next words before same length words.
    # returns a list of solutions, each as a word-lists.  NO, FOR NOW JUST PRINT THEM
    #
    def findPuzzles(dictionary, startWord, lowWordLen, highWordLen, minWords, maxWords):

        dictionary = dictionary.copy()
        desiredPuzzles = list()
        if not dictionary.isWord(startWord):
            print (startWord + " is not a word.")
            return desiredPuzzles
        # search forever until all suitable puzzles are found
        firstPuzzle = PartialSolution(startWord, "dummy-end")
        listOfPossiblePuzzles = deque()
        listOfPossiblePuzzles.append(firstPuzzle)
        while len(listOfPossiblePuzzles) > 0:
            puzzle = listOfPossiblePuzzles.popleft()
            if (Solver.isDesired(puzzle, lowWordLen, highWordLen, minWords, maxWords)):
                desiredPuzzles.append(puzzle)
            #keep looking if not too long already
            if (puzzle.numWords() < maxWords):
                nextWords = dictionary.findNextWords(puzzle.getLastWord())
                for nextWord in nextWords:
                    dictionary.remove(nextWord)
                    newPuzzle = puzzle.copy()
                    newPuzzle.addWord(nextWord)
                    listOfPossiblePuzzles.append(newPuzzle)
        return desiredPuzzles
        
class PartialSolution():

    def __init__(self, fromWord, targetWord):
        self.wordsSoFar = [fromWord]
        self.targetWord = targetWord
        self.errorMessage = None

    def __str__(self):
        if self.errorMessage:
            return self.errorMessage
        else:
            wordList = ",".join(self.wordsSoFar)
            return f"{wordList}"
    
    def addError(self, errorMessage):
        if (self.errorMessage):
            self.errorMessage += errorMessage
        else:
            self.errorMessage = errorMessage
        return self

    def addWord(self, newWord):
        self.wordsSoFar.append(newWord)
        return self

    def removeLastWord(self):
        self.wordsSoFar.pop()

    def copy(self):
        newCopy = PartialSolution(self.wordsSoFar[0], self.targetWord)
        newCopy.wordsSoFar = self.getWordList()
        return newCopy
        
    def str(self):
        return ",".join(self.wordsSoFar);

    def getError(self):
        return self.errorMessage

    def getFirstWord(self):
        return self.wordsSoFar[0]

    def getLastWord(self):
        return self.wordsSoFar[-1]

    def getPenultimateWord(self):
        if len(self.wordsSoFar) == 1:
            raise RuntimeError("getPenultimateWord(): self.wordsSoFar is length 1")
        self.wordsSoFar[-2]

    def getTarget(self):
        return self.targetWord

    #zero-based
    def getNthWord(self, n):
        return self.wordsSoFar[n]

    def shortestWordLen(self):
        return len(min(self.wordsSoFar, key=len))

    def longestWordLen(self):
        return len(max(self.wordsSoFar, key=len))

    def getWordList(self):
        return copy.copy(self.wordsSoFar)

    def isSolved(self):
        return self.targetWord == self.getLastWord()

    def numWords(self):
        return len(self.wordsSoFar)

    def numSteps(self):
        return self.numWords() - 1

    def success(self):
        return self.errorMessage is None

    def summarize(self):
        return "{} [{} steps]".format(self.wordsSoFar, self.numSteps())
