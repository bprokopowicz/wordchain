#!/usr/bin/env /usr/bin/python3

import re
import sys


def main():
    if len(sys.argv) < 4:
        print("USAGE: python3 lengthLimit.py <file> min-len max-len\nWrites ok.txt tooShort.txt tooLong.txt\n");
        sys.exit(1)

    inputFile = sys.argv[1];
    minLen = int(sys.argv[2])
    maxLen = int(sys.argv[3])
    tooShort = set()
    tooLong = set()
    justRight = set()

    with open(inputFile, "r") as f:
        for word in [line.strip() for line in f]:
            if (len(word) < minLen):
                tooShort.add(word)
            elif (len(word) > maxLen):
                tooLong.add(word)
            else:
                justRight.add(word)

    with open("tooShort.txt", "w") as outFile:
        for word in sorted(tooShort):
            outFile.write("{}\n".format(word))

    with open("tooLong.txt", "w") as outFile:
        for word in sorted(tooLong):
            outFile.write("{}\n".format(word))

    with open("ok.txt", "w") as outFile:
        for word in sorted(justRight):
            outFile.write("{}\n".format(word))

if __name__ == '__main__':
    main()
