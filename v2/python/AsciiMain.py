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
        hint = game.nextWordHint()
        play = input(f"{hint}: ").strip()
        # play is either a letter (replace) number (remove) or i,c insert c at i
        if (play.isdigit()):
            res = game.remove(int(play)-1)
        elif (len(play) == 1):
            char = play
            replaceCharAt = hint.find(Game.REPLACE_CHAR)
            res = game.replace(replaceCharAt, char)
        elif (len(play) == 2):
            #player gives ic
            insertCharAt = int(play[0])
            char = play[1]
            res = game.insert(insertCharAt, char)
        else:
            res = "bad input; try again"
        print (f"{res}\n")

def solve():
    words = input ("give start,end:").strip().split(',')
    start = words[0]
    end = words[1]
    dictionary = WordChainDict()
    partialSolution=PartialSolution(start, end)
    startTime = time.time_ns()
    solution = Solver.solve(dictionary, partialSolution)
    endTime = time.time_ns()
    if (solution.isSolved()):
        print (solution.display())
    else:
        print (solution.getError())
    print (f"{(endTime - startTime) / 1000000000.0} seconds")

def find():
    firstWord = input("give first word: ").strip()
    lowWordLen = int(input("must have word as short as: ").strip())
    highWordLen = int(input("must have word as long as: ").strip())
    minWords = int(input("Must require >n words inclusive: ").strip())
    maxWords = int(input("Must require <n words inclusive: ").strip())
    dictionary = WordChainDict()
    results = Solver.find(dictionary, firstWord, lowWordLen, highWordLen, minWords, maxWords)
    print ("I found these solutions:\n")
    for solution in results:
        print (",".join(solution))

if __name__ == '__main__':
    main()

