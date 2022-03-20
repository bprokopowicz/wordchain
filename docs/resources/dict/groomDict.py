#!/usr/bin/env /usr/bin/python3

import re
import sys

"""
From this directory execute:

SRC=../../../../DictionarySource
./groomDict.py $SRC/lemmas_60k_words_m2068.txt $SRC/MISSING_FROM_WordFreq WordFreqDict
"""

def main():
    inFileName    = sys.argv[1]
    extraFileName = sys.argv[2]
    outFileName   = sys.argv[3]

    if len(sys.argv) < 4:
        print("USAGE: groomDict.py inFile extraWordsFile outFile")
        sys.exit(1)

    with open(inFileName, "r") as inFile:
        numGoodLines = 0 
        numGoodWords = 0 

        startsWithUpper = []
        startsWithLower = []
        keepWords = set()

        for line in [line.strip() for line in inFile]:
            if '\t' not in line:
                continue
            if 'lemRank' in line:
                continue

            fields = line.split('\t')
            if len(fields) != 6:
                continue

            numGoodLines += 1

            word = fields[5]

            if not re.match(r'^[a-zA-Z]+$', word):
                continue

            numGoodWords += 1

            """
            if word[0].isupper():
                startsWithUpper.append(word)
            else:
                startsWithLower.append(word)
            """

            if len(word) >= 3 and len(word) <= 6:
                keepWords.add(word)

    with open(extraFileName, "r") as extraFile:
        for line in [line.strip() for line in extraFile]:
            keepWords.add(word)

    """
    print("numGoodLines: {}".format(numGoodLines))
    print("numGoodWords: {}".format(numGoodWords))
    print("numUpper: {}".format(len(startsWithUpper)))
    print("numLower: {}".format(len(startsWithLower)))
    """

    print("length of keepWords: {}".format(len(keepWords)))

    with open(outFileName, "w") as outFile:
        for word in sorted(keepWords):
            outFile.write("{}\n".format(word))

if __name__ == '__main__':
    main()
