#!/usr/bin/env /usr/bin/python3

import os
import sys
import unittest

sys.path.insert(0, "../src")

from TestBase import *
from Solver import *
from Game import *
from WordChainDict import *

class GameTest(TestBase):

    @classmethod
    def setUpClass(cls):
        cls.miniDict = WordChainDict(["bad", "bat", "cad", "cat", "dog"])
        cls.smallDict = WordChainDict(["bad", "bade", "bat", "bate", "cad", "cat", "dog", "scad"])
        cls.fullDict = WordChainDict()

    def test_correctFirstWord(self):
        solution = Solver(self.smallDict, "scad", "bat").solveIt()
        # scad, cad, cat, bat
        game = Game(self.smallDict, solution)
        playResult = game.playWord("cad")
        self.assertEqual(playResult, Game.OK)

    def test_notAWord(self):
        solution = Solver(self.smallDict, "scad", "bat").solveIt()
        game = Game(self.smallDict, solution)
        playResult = game.playWord("trushi")
        self.assertEqual(playResult, Game.NOT_A_WORD)

    def test_notOneStep(self):
        # NOTE: This solution is not deterministic, but it doesn't matter for this test.
        solution = Solver(self.smallDict, "scad", "bat").solveIt()
        game = Game(self.smallDict, solution)
        playResult = game.playWord("dog")
        self.assertEqual(playResult, Game.NOT_ONE_STEP)
                 
    def test_differentWordFromOriginalSolution(self):
        origSolution = Solver(self.smallDict, "bad", "cat").solveIt()
        game = Game(self.smallDict, origSolution)
        origStep2 = game.solution.getWordByStep(2)

        # Bade is not in original solution.
        playResult = game.playWord("bade")
        curStep1 = game.solution.getWordByStep(1)
        curStep2 = game.solution.getWordByStep(2)

        self.assertEqual(playResult, Game.OK, "unexpected playResult")
        self.assertEqual(curStep1, "bade", "current step 1 is not what was played")
        self.assertNotEqual(curStep2, origStep2, "current step 2 is the same as original")

    def test_fullGame1(self):
        solution = Solver(self.smallDict, "bad", "scad").solveIt()
        game = Game(self.smallDict, solution)
        playResult = game.playWord("cad")
        self.assertEqual(playResult, Game.OK, "playing 'cad'")
        playResult = game.playWord("scad")
        self.assertEqual(playResult, Game.OK, "playing 'scad'")
        self.assertTrue(game.isSolved())

    def test_fullGame2(self):
        origSolution = Solver(self.fullDict, "fine", "word").solveIt()
        game = Game(self.fullDict, origSolution)
        origStep2 = game.solution.getWordByStep(2)

        playResult = game.playWord("wine")
        self.assertEqual(playResult, Game.OK, "playing wine")

        curSolutionStep1 = game.solution.getWordByStep(1)
        self.assertEqual(curSolutionStep1, "wine", "current solution step 1 is not what was played")

        solutionInProgressStep1 = game.solutionInProgress.getWordByStep(1)
        self.assertEqual(solutionInProgressStep1, "wine", "solution in progress step 1 is not what was played")

        curSolutionStep2 = game.solution.getWordByStep(2)
        self.assertNotEqual(curSolutionStep2, origStep2, "current step 2 is not different from original")

        # TODO: Continue playing
        #self.assertTrue(game.isSolved())
        
    def test_displayStartingGame(self):
        theDict = WordChainDict(["blum", "bum", "but", "tut"])
        solution = Solver(theDict, "blum", "tut").solveIt()
        game = Game(theDict, solution)
        playResult = game.playWord("bum")
        self.assertEqual(playResult, Game.OK, "playing bum")
        expected="[0]  blum\n[1]  bum\n[2]  **!\n[3]  !**\n"
        self.assertEqual(game.showGame(), expected)


if __name__ == '__main__':
    sys.exit(TestBase.main(__file__))
