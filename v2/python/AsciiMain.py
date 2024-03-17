#!/usr/bin/env /usr/bin/python3

import sys
from Command import *
from Game import *

#sys.path.insert(0, "../src")

from WordChainDict import *

def main():
    while (1):
        command = Command.askForCommand()
        if (command == Command.QUIT):
            break
        if (command == Command.PLAY):
            play()
        if (command == Command.SOLVE):
            solve()

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
        elif (',' in play):
            pair = play.split(',')
            insertCharAt = int(pair[0])
            char = pair[1]
            res = game.insert(insertCharAt, char)
        elif (len(play) == 1):
            char = play
            replaceCharAt = hint.find(Game.REPLACE_CHAR)
            res = game.replace(replaceCharAt, char)
        else:
            res = "bad input; try again"
        print (f"{res}\n")

def solve():
    words = input ("give start,end:").strip().split(',')
    start = words[0]
    end = words[1]
    dictionary = WordChainDict()
    partialSolution=PartialSolution(start, end)
    solution = Solver.solve(dictionary, partialSolution)
    print (solution.display())

if __name__ == '__main__':
    main()

