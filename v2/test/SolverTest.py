#!/usr/bin/env /usr/bin/python3

import os
import sys
import unittest

sys.path.insert(0, "../python")

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
        solution = Solver.solve(self.miniDict, "flump", "bat")
        self.assertIsNotNone(solution.getError(), "Expected 'flump' error'")

    def test_badTo(self):
        solution = Solver.solve(self.miniDict, "bat", "oolaloobamboomlaloo")
        self.assertIsNotNone(solution.getError(), "Expected 'oolaloobamboomlaloo' error")


    def test_identitySequence(self):
        solution = Solver.solve(self.miniDict, "bat", "bat")
        self.assertTrue(solution.success(), "Expected success; got error: {}".format(solution.getError()))
        self.assertEqual(solution.getWordList(), ['bat'], "Unexpected solution")
        self.assertEqual(solution.numSteps(), 0, "Unexpected number of steps")

    def test_oneStepAdder(self):
        solution = Solver.solve(self.smallDict, "bad", "bade")
        self.assertTrue(solution.success(), "Epxected success" )
        self.assertEqual(solution.numSteps(), 1, "Unexpected number of steps")

    def test_oneStepRemover(self):
        solution = Solver.solve(self.smallDict, "bade", "bad")
        self.assertTrue(solution.success(), "Expected success; got error: {}".format(solution.getError()))
        self.assertEqual(solution.numSteps(), 1, "Unexpected number of steps")

    def test_oneStepReplacer(self):
        solution = Solver.solve(self.smallDict, "bad", "cad")
        self.assertTrue(solution.success(), "Expected success; got error: {}".format(solution.getError()))
        self.assertEqual(solution.numSteps(), 1, "Unexpected number of steps")

    def test_oneStepNope(self):
        solution = Solver.solve(self.miniDict, "bat", "dog")
        self.assertFalse(solution.success(), "Expected failure" )

    def test_twoStep1(self):
        solution = Solver.solve(self.smallDict, "bat", "scad")
        self.assertTrue(solution.success(), "Expected success; got error: {}".format(solution.getError()))
        self.assertEqual(solution.numSteps(), 3, "Unexpected number of steps")

    def test_twoStep2(self):
        solution = Solver.solve(self.smallDict, "scad", "bat")
        self.assertTrue(solution.success(), "Expected success; got error: {}".format(solution.getError()))
        self.assertEqual(solution.numSteps(), 3, "Unexpected number of steps")

    def test_fullDict(self):
        solution = Solver.solve(self.fullDict, "taco", "bimbo")
        self.assertTrue(solution.success(), "Expected success; got error: {}".format(solution.getError()))
        expectedSolution = "['taco', 'tao', 'tab', 'lab', 'lamb', 'limb', 'limbo', 'bimbo'] [7 steps]"
        foundSolution = solution.summarize()
        self.assertEqual(foundSolution, expectedSolution, "Unexpected solution: {}".format(foundSolution))


if __name__ == '__main__':
    sys.exit(TestBase.main(__file__))

