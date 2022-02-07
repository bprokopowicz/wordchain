import os
import sys
import unittest

sys.path.insert(0, "../src")

from TestBase import *
from Solver import *
from GamePlay import *
from WordSeqDict import *

class GamePlayTest(TestBase):

    @classmethod

    def correctFirstWord(self):
        solution = Solver(self.smallDict, "scad", "bat").solveIt()
        # scad, scat, cat, bat
        game_play = GamePlay(self.smallDict, solution)
        play_result = game_play.addWord("scat")
        self.assertEqual(play_result, GamePlay.OK)
     

if __name__ == '__main__':
    TestBase.main(__file__.replace(".py", ""))

