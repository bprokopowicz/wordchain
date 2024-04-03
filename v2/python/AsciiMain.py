#!/usr/bin/env /usr/bin/python3

import sys
import time
from Game import *

#sys.path.insert(0, "../src")

from WordChainDict import *

class Command:
    QUIT = 1
    PLAY = 2
    SOLVE = 3
    FIND = 4

    def askForCommand():
        while (1):
            line = input("play, solve, find, or quit: ").strip()
            if (line == "play"):
                return Command.PLAY
            if (line == "quit"):
                return Command.QUIT
            if (line == "solve"):
                return Command.SOLVE
            if (line == "find"):
                return Command.FIND


def main():
    while (1):
        command = Command.askForCommand()
        if (command == Command.QUIT):
            break
        if (command == Command.PLAY):
            play()
        if (command == Command.SOLVE):
            solve()
        if (command == Command.FIND):
            find()

def play():
    words = input ("give start,end:").strip().split(',')
    start = words[0]
    end = words[1]
    dictionary = WordChainDict()
    game = Game(dictionary, start, end)
    #check here for non-words and no solution
    if (not game.isValid()):
        print (game.getError())
        return

    while (not game.isSolved()):
        print(game.asciiDisplay())
        hintAndPlayType = game.nextWordHint()
        hint = hintAndPlayType[0]
        playType = hintAndPlayType[1]
        play = input(f"{hint}: ").strip()
        # play is either a letter (replace) number (remove) or i,c insert c at i
        if (playType == Game.REDUCE):
            res = game.remove(int(play)-1)
        elif (playType == Game.REPLACE):
            char = play
            replaceCharAt = hint.find(Game.REPLACE_CHAR)
            res = game.replace(replaceCharAt, char)
        elif (playType == Game.INCREASE):
            #player gives i
            insertCharAt = int(play[0])
            res = game.insertSpace(insertCharAt)
        else:
            res = "error; game is confused about next play"
            return
        print (f"{res}\n")

def solve():
    words = input ("give start,end:").strip().split(',')
    start = words[0]
    end = words[1]
    dictionary = WordChainDict()
    startTime = time.time_ns()
    solution = Solver.solve(dictionary, start, end)
    endTime = time.time_ns()
    if (solution.isSolved()):
        print (f"{solution}\n")
    else:
        print (solution.getError())
    print (f"{(endTime - startTime) / 1000000000.0} seconds")

def find():
    firstWord = input("give first word: ").strip()
    lowWordLen = int(input("must have word as short as: ").strip())
    highWordLen = int(input("must have word as long as: ").strip())
    minWords = int(input("Must require at least n words: ").strip())
    maxWords = int(input("Must require at most n words: ").strip())
    dictionary = WordChainDict()
    puzzles = Solver.findPuzzles(dictionary, firstWord, lowWordLen, highWordLen, minWords, maxWords)
    print ('I found these puzzles:\n')
    for puzzle in puzzles:
        print (puzzle)

if __name__ == '__main__':
    main()

