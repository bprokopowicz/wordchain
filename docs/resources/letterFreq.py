#!/usr/bin/env /usr/bin/python3

import re
import sys



def main():
    inFileName     = sys.argv[1]

    with open(inFileName, "r") as inFile:
        startsWithLower = []
        keepWords = set()

        numWordsContainingLetter = [];
        for letter in range(26):
            numWordsContainingLetter.append(0);

        ordA = ord('a');
        wc = 0;
        for word in [word.strip() for word in inFile]:

            # Make sure all alphabetic.
            if not re.match(r'^[a-zA-Z]+$', word):
                continue

            # Make sure there is a vowel.
            if not re.match('^.*[aeiouyAEIOUY].*$', word):
                continue

            # get unique letters in word
            wc = wc+1;
            letters = list(set(word));
            for letter in letters:
                index = ord(letter) - ordA;
                numWordsContainingLetter[index] = numWordsContainingLetter[index] + 1;

    for letter in range(26):
        print (chr(letter + ordA), 100.0 * (numWordsContainingLetter[letter] / wc));


if __name__ == '__main__':
    main()
