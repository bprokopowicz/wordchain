#!/usr/bin/env /usr/bin/python3

import sys

sys.path.insert(0, "../src")

from Solver import *
from Game import *
from WordChainDict import *

def main():
    wordChainDict = WordChainDict()

    prompt = "="*40 + "\nEnter solve|play word1 word2 or 'q' to quit: "

    while (True):
        line = input(prompt).strip()

        if line == "q":
            break

        try:
            cmd, word1, word2 = line.split(" ")
            if cmd not in ["solve", "play"]:
                print("command {} is not supported".format(cmd))
                continue

            if not wordChainDict.isWord(word1):
                print("{} is not in the dictionary".format(word1))
                continue

            if not wordChainDict.isWord(word2):
                print("{} is not in the dictionary".format(word2))
                continue
        except:
            print("D'oh! you forgot to give two words")
            continue

        solution = Solver(wordChainDict, word1, word2).solveIt()
        if not solution.success():
            print("No solution: {}".format(solution.getError()))
        else:
            if cmd == "solve":
                print("SOLUTION: {}".format(solution.summarize()))
            elif cmd == "play":
                game = Game(wordChainDict, solution)
                while (not game.isSolved()):
                    print(game.showGame())
                    word = input("\n >>> ").strip()

                    if word == '-quit' or word == '-quitall':
                        break
                    if word == '-dump':
                        print("SOLUTION: {}".format(game.solution.getWordList()))
                        continue
                    if word == '-dumpall':
                        print("SOLUTION: {}".format(game.solution.getWordList()))
                        print("PROGRESS: {}".format(game.solutionInProgress.getWordList()))
                        continue

                    playResult = game.playWord(word)
                    print(playResult)

                if word == "-quit":
                    print("BYE QUITTER!\n")
                elif word == "-quitall":
                    print("BYE QUITTER!\n")
                    break
                else:
                    print("YOU WIN!!!!\n")

if __name__ == '__main__':
    main()
