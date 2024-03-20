#!/usr/bin/env /usr/bin/python3

import sys

sys.path.insert(0, "../src")

from Solver import *
from Game import *
from WordChainDict import *

def main():
    wordChainDict = WordChainDict()

    mainPrompt = "="*40 + "\nEnter solve|play word1 word2 or 'q' to quit: "

    while (1==1):

        line = input(mainPrompt).strip()
        if line == 'q':
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
            print("No solution")
        else:
            if cmd == "solve":
                print("SOLUTION: {}".format(solution.summarize()))
            elif cmd == "play":
                game = Game(wordChainDict, solution)
                while (not game.isSolved()):
                    print(game.showGame())
                    nWordsPlayed = game.solutionInProgress.numSteps()
                    if (nWordsPlayed == 0):
                        lastWordPlayed = game.solutionInProgress.getWordList()[0]
                    else: 
                        lastWordPlayed = game.solutionInProgress.getWordList()[nWordsPlayed]
                    nextWordInSolution = game.solution.getWordList()[nWordsPlayed+1]
                    nextWordHint = game.showWordHint(nextWordInSolution, lastWordPlayed)

                    # for changing one letter (default case, override for insert/remove below

                    instructions = "enter one letter: "
                    action = "replace"
                    display = nextWordHint

                    if nextWordHint[0] == '1':
                        # this is for removing a letter at position n
                        instructions = "remove which position: "
                        action = "remove"
                        display = "{}\n{}".format(lastWordPlayed,nextWordHint)
                    elif len(lastWordPlayed) < len(nextWordInSolution):
                        # this is for specifying where to add a letter and which letter
                        instructions = "give i,c to add c at position i: "
                        action = "insert"
                    prompt = "{} {}".format(display, instructions)
                    command = input(prompt).strip()

                    if command == '-quit' or command == '-quitall':
                        break
                    if command == '-dump':
                        print("SOLUTION: {}".format(game.solution.getWordList()))
                        continue
                    if command == '-dumpall':
                        print("SOLUTION: {}".format(game.solution.getWordList()))
                        print("PROGRESS: {}".format(game.solutionInProgress.getWordList()))
                        continue

                    if (action == 'replace'):
                        # command is just one char to replace the '!' in hint
                        char = command
                        index = nextWordHint.find('!')
                        playResult = game.playReplaceChar(index, char)
                    elif (action == 'remove'):
                        # command is just one int from 0 .. nChars
                        playResult = game.playRemoveChar(int(command)-1)
                    elif (action == 'insert'):
                        # command is i,c
                        index = int(command[0])
                        char = command[2]
                        playResult = game.playInsertChar(index, char)
                    print(playResult)
                # end of game loop must be a win? not really
                print("YOU WIN!!!!\n")

if __name__ == '__main__':
    main()
