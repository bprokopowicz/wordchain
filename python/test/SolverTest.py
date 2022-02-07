import os
import sys
import unittest

sys.path.insert(0, "../src")

from TestBase import *
from Solver import *
from WordSeqDict import *

class SolverTest(TestBase):

    @classmethod
    def setUpClass(cls):
        cls.miniDict = WordSeqDict(["bad", "bat", "cad", "cat", "dog"])
        cls.smallDict = WordSeqDict(["bad", "bade", "bat", "bate", "cad", "cat", "dog", "scad"])
        cls.fullDict = WordSeqDict()

    def test_badFrom(self):
        solution = Solver(self.miniDict, "flump", "bat").solveIt()
        self.assertIsNotNone(solution.getError(), "Expected 'flump' error'")

    def test_badTo(self):
        solution = Solver(self.miniDict, "bat", "oolaloobamboomlaloo").solveIt()
        self.assertIsNotNone(solution.getError(), "Expected 'oolaloobamboomlaloo' error")

    def test_identitySequence(self):
        solution = Solver(self.miniDict, "bat", "bat").solveIt()
        self.assertTrue(solution.success(), "Expected success; got error: {}".format(solution.getError()))
        self.assertEqual(solution.getWordList(), ['bat'], "Unexpected solution")
        self.assertEqual(solution.numSteps(), 0, "Unexpected number of steps")

    def test_oneStepDepth(self):
        solution = Solver(self.miniDict, "bat", "cat").solveIt(depth=True)
        self.assertEqual(solution.numSteps(), 3, "Unexpected number of steps")
        self.assertTrue(solution.success(), "Expected success; got error: {}".format(solution.getError()))

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
        print("SOLUTION: {}".format(solution.summarize()))
        self.assertEqual(solution.numSteps(), 6, "Unexpected number of steps")

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
        

if __name__ == '__main__':
    TestBase.main(__file__.replace(".py", ""))

