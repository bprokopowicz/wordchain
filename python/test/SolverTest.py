#!/usr/bin/env /usr/bin/python3

import os
import sys
import unittest

sys.path.insert(0, "../src")

from TestBase import *
from Solver import *
from WordChainDict import *

class SolverTest(TestBase):

    @classmethod
    def setUpClass(cls):
        cls.miniDict = WordChainDict(["bad", "bat", "cad", "cat", "dog"])
        cls.smallDict = WordChainDict(["bad", "bade", "bat", "bate", "cad", "cat", "dog", "scad"])
        cls.fullDict = WordChainDict()

    def test_badFrom(self):
        solution = Solver(self.miniDict, "flump", "bat").solveIt()
        self.assertIsNotNone(solution.getError(), "Expected 'flump' error'")

    def test_badTo(self):
        solution = Solver(self.miniDict, "bat", "oolaloobamboomlaloo").solveIt()
        self.assertIsNotNone(solution.getError(), "Expected 'oolaloobamboomlaloo' error")

    """
    def test_alphabeticOrderOfPartialSolutions1(self):
        solution1 = Solution([], "scad")
        solution2 = Solution([], "scad")
        solution1.addWord("cad")
        solution2.addWord("sad")
        d1 = solution1.distance
        d2 = solution2.distance
        print("d1:{} d2:{}\n".format(d1, d2))
        self.assertTrue(d1 < d2, "distances in wrong order for cad and sad to scad")

    def test_alphabeticOrderOfPartialSolutions2(self):
        solution1 = Solution([], "limbo")
        solution2 = Solution([], "limbo")
        solution1.addWord("lame")
        solution2.addWord("lice")
        d1 = solution1.distance
        d2 = solution2.distance
        print("d1:{} d2:{}\n".format(d1, d2))
        self.assertTrue(d1 < d2, "distances in wrong order for lame and lice to limbo")
    """

    def test_identitySequence(self):
        solution = Solver(self.miniDict, "bat", "bat").solveIt()
        self.assertTrue(solution.success(), "Expected success; got error: {}".format(solution.getError()))
        self.assertEqual(solution.getWordList(), ['bat'], "Unexpected solution")
        self.assertEqual(solution.numSteps(), 0, "Unexpected number of steps")

    """
    def test_oneStepDepth(self):
        solution = Solver(self.miniDict, "bat", "cat").solveIt(depth=True)
        self.assertEqual(solution.numSteps(), 3, "Unexpected number of steps")
        self.assertTrue(solution.success(), "Expected success; got error: {}".format(solution.getError()))
    """

    def test_oneStepAdder(self):
        solution = Solver(self.smallDict, "bad", "bade").solveIt()
        self.assertTrue(solution.success(), "Epxected success" )
        self.assertEqual(solution.numSteps(), 1, "Unexpected number of steps")

    def test_oneStepRemover(self):
        solution = Solver(self.smallDict, "bade", "bad").solveIt()
        self.assertTrue(solution.success(), "Expected success; got error: {}".format(solution.getError()))
        self.assertEqual(solution.numSteps(), 1, "Unexpected number of steps")

    def test_oneStepReplacer(self):
        solution = Solver(self.miniDict, "bat", "cat").solveIt()
        self.assertTrue(solution.success(), "Expected success; got error: {}".format(solution.getError()))
        self.assertEqual(solution.numSteps(), 1, "Unexpected number of steps")

    def test_oneStepNope(self):
        solution = Solver(self.miniDict, "bat", "dog").solveIt()
        self.assertFalse(solution.success(), "Expected failure" )

    def test_twoStep1(self):
        solution = Solver(self.smallDict, "bat", "scad").solveIt()
        self.assertTrue(solution.success(), "Expected success; got error: {}".format(solution.getError()))
        self.assertEqual(solution.numSteps(), 3, "Unexpected number of steps")

    def test_twoStep2(self):
        solution = Solver(self.smallDict, "scad", "bat").solveIt()
        self.assertTrue(solution.success(), "Expected success; got error: {}".format(solution.getError()))
        self.assertEqual(solution.numSteps(), 3, "Unexpected number of steps")

    def test_fullDict(self):
        solution = Solver(self.fullDict, "taco", "bimbo").solveIt()
        self.assertTrue(solution.success(), "Expected success; got error: {}".format(solution.getError()))
        expectedSolution = "['taco', 'taro', 'tare', 'tame', 'time', 'lime', 'limo', 'limbo', 'bimbo'] [8 steps]"

        foundSolution = solution.summarize()
        self.assertEqual(foundSolution, expectedSolution, "Unexpected solution: {}".format(foundSolution))

    def test_wordDistanceSameLength(self):
        distance = Solution.wordDistance("dog", "dot")
        self.assertEqual(distance, 1, "'dog' to 'dot' distance incorrect")

        distance = Solution.wordDistance("dog", "cat")
        self.assertEqual(distance, 3, "'dog' to 'cat' distance incorrect")

    def test_wordDistanceFirstShorter(self):
        distance = Solution.wordDistance("dog", "goat")
        self.assertEqual(distance, 3, "'dog' to 'goat' distance incorrect")
        
    def test_wordDistanceFirstLonger(self):
        distance = Solution.wordDistance("goat", "dog")
        self.assertEqual(distance, 3, "'goat' to 'dog' distance incorrect")
        
    def test_enumeration(self):
        aaValue = 0*26 + 0 
        self.assertEqual(Solution.wordEnumerator("aa"), aaValue, "Unexpected enumumerator for 'aa'")
        bbValue = 1*26 + 1 
        self.assertEqual(Solution.wordEnumerator("bb"), bbValue, "Unexpected enumumerator for 'bb'")
        bcValue = 1*26 + 2 
        self.assertEqual(Solution.wordEnumerator("bc"), bcValue, "Unexpected enumumerator for 'bc'")
        ccValue = 2*26 + 2 
        self.assertEqual(Solution.wordEnumerator("cc"), ccValue, "Unexpected enumumerator for 'cc'")
        cageValue = 2*26*26*26 + 0*26*26 + 6*26 + 4
        self.assertEqual(Solution.wordEnumerator("cage"), cageValue, "Unexpected enumumerator for 'cage'")

if __name__ == '__main__':
    sys.exit(TestBase.main(__file__))

