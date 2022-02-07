#!/usr/bin/env /usr/bin/python3

import sys

sys.path.insert(0, "../src")

from Solver import *
from WordSeqDict import *

def main():
    wordSeqDict = WordSeqDict()

    prompt = "="*40 + "\nEnter solve|play words1 word2two 'q' to quit: "

    print(prompt)
    for line in sys.stdin:
        line = line.strip()

        if line == "q":
            break

        try:
            cmd, word1, word2 = line.strip().split(" ")
            if cmd not in ["solve", "play"]:
                print("command {} is not supported".format(cmd))
                print(prompt)
                continue
        except:
            print("D'oh! you forgot to give two words")
            print(prompt)
            continue

        solution = Solver(wordSeqDict, word1, word2).solveIt()
        if not solution.success():
            print("OOPS: {}".format(solution.getError()))
        else:
            if cmd == "solve":
                print("SOLUTION: {}".format(solution.summarize()))
            elif cmd == "play":
                solution.play()

        print(prompt)


if __name__ == '__main__':
    main()
