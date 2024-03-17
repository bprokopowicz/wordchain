import copy
import heapq
import sys

class Solver():
    # solve our puzzle fromWord to targetWord, with a partial solution already given.  The 
    # partial solution may be just the starting word and the end word.
    # static method
    def solve(dictionary, startingSolution):
        
        workingSolutions = []
        heapq.heappush(workingSolutions, startingSolution)

        while len(workingSolutions) != 0:
            solution = heapq.heappop(workingSolutions)
            #print(f"first working solution: {solution}")

            if solution.isSolved():
                return solution

            lastWord = solution.getLastWord()
            nextWords = dictionary.findNextWords(lastWord)
            nextWords -= solution.getWordSet()

            # Without sorting nextWords, we did not consistently find the same solution.
            for word in sorted(nextWords):
                newWorkingSolution = solution.copy().addWord(word)
                heapq.heappush(workingSolutions, newWorkingSolution)
                #print(f"adding working solution: {newWorkingSolution}")

            if len(workingSolutions) % 1000 == 0:
                print(f"#working solutions: {len(workingSolutions)}")

        return solution.addError("No solution") 
            
class PartialSolution():

    def __init__(self, fromWord, targetWord, distance=100):
        self.wordsSoFar = [fromWord]
        self.targetWord = targetWord
        self.errorMessage = None
        self.distance = distance 

    def __eq__(self, other):
        return self.distance == other.distance

    def __ne__(self, other):
        return self.distance != other.distance

    def __ge__(self, other):
        return self.distance >= other.distance

    def __gt__(self, other):
        return self.distance > other.distance

    def __le__(self, other):
        return self.distance <= other.distance

    def __lt__(self, other):
        return self.distance < other.distance

    def __str__(self):
        if self.errorMessage:
            return self.errorMessage
        else:
            wordList = ",".join(self.wordsSoFar)
            return f"{wordList} [distance is {self.distance}]"
    
    def addError(self, errorMessage):
        self.errorMessage = errorMessage
        return self

    def addWord(self, newWord):
        self.wordsSoFar.append(newWord)
        self.distance = self.wordDistance(newWord, self.targetWord) + len(self.wordsSoFar)
        return self

    def copy(self):
        newCopy = PartialSolution(self.wordsSoFar[0], self.targetWord, self.distance)
        newCopy.wordsSoFar = self.getWordList()
        return newCopy
        
    def display(self):
        return "\n".join(self.wordsSoFar);

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

    def getWordSet(self):
        return set(self.wordsSoFar)

    def getWordList(self):
        return copy.copy(self.wordsSoFar)

    def isSolved(self):
        return self.targetWord == self.getLastWord()

    def isWordInSolution(self, word):
        return word in self.wordsSoFar

    def numWords(self):
        return len(self.wordsSoFar)

    def numSteps(self):
        return self.numWords() - 1

    def success(self):
        return self.errorMessage is None

    def summarize(self):
        return "{} [{} steps]".format(self.wordsSoFar, self.numSteps())
        
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
                distance = PartialSolution.wordDistance(testWord, smallerWord)
                if distance < smallestDistance:
                    smallestDistance = distance

            distance = smallestDistance + 1

        return distance
