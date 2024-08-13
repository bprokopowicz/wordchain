#!/usr/bin/env /usr/bin/python3

import re
import sys


def main():
    if len(sys.argv) < 3:
        print("USAGE: intersect.py <file1> <file2>\nWrites both.txt file1Onlyl.txt file2Only2.txt\n");
        sys.exit(1)

    file1  = sys.argv[1]
    file2  = sys.argv[2]
    file1Words = set()
    file2Words = set()

    with open(file1, "r") as f:
        for word in [line.strip() for line in f]:
            file1Words.add(word.lower())

    with open(file2, "r") as f:
        for word in [line.strip() for line in f]:
            file2Words.add(word.lower())

    file1NotFile2 = file1Words - file2Words
    file2NotFile1 = file2Words - file1Words
    bothWords = file1Words.intersection(file2Words)

    with open("both.txt", "w") as outFile:
        for word in sorted(bothWords):
            outFile.write("{}\n".format(word))

    with open("file1Only.txt", "w") as outFile:
        for word in sorted(file1NotFile2):
            outFile.write("{}\n".format(word))

    with open("file2Only.txt", "w") as outFile:
        for word in sorted(file2NotFile1):
            outFile.write("{}\n".format(word))

if __name__ == '__main__':
    main()
