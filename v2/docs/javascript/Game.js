import { DisplayInstruction } from './DisplayInstruction.js';
import { Solver, Solution, PlayedWord} from './Solver.js';
import { WordChainDict } from './WordChainDict.js';
import * as Const from './Const.js'

// DisplayInstruction properties:
//
// word:           empty string for future
// displayType:    add, addChange, delete, change, future, played, target
// changePosition: not relevant for played or target
// wasCorrect:     not relevant for future


class Game {

    constructor(startWord, targetWord, wordsPlayedSoFar) {
        console.log("constructor(): startWord:", startWord, ", targetWord:", targetWord);
        startWord = startWord.toUpperCase();
        targetWord = targetWord.toUpperCase();
        this.dictionary = new WordChainDict();
        this.wordToDisplayIndex = 0;
        if (wordsPlayedSoFar.length == 0) {
            this.partialSolution = Solution.newEmptySolution(startWord, targetWord);
            this.fullSolutionGivenProgress = Solver.solve(this.dictionary, startWord, targetWord);
        } else {
            this.partialSolution = Solution.newPartialSolution(this.dictionary, wordsPlayedSoFar, targetWord);
            this.fullSolutionGivenProgress = Solver.resolve(this.dictionary, this.partialSolution);
            console.log("Game has re-constructed patial solution: " + this.partialSolution.toStr());
        }
    }

    getWordsPlayedSoFar() {
        // return a list of words, including start word.
        return this.partialSolution.getPlayedWords().map((playedWord)=>playedWord.word);
    }

    // Return DisplayInstruction for the current 'wordToDisplayIndex'.  .
    // The words displayed go from 0 to the number of steps in the full solution + 1

/*
      soln  played instruction  display
    beginning - words played: 1 (start word) 
    0 cat   cat  cat,START    cat
    1 bat        cat,CHANGE@1 ?at
    2 bart       bart,FUTURE  XXXX
    3 barts      barts,TARGET barts

    user types 'b' - words played: 2
    0 cat   cat  cat,PLAYED   cat
    1 bat   bat  bat,PLAYED   bat
    2 bart       bat,ADD      +b+a+t+
    3 barts      barts,TARGET barts

    user clicks +2 - words played: 3 and set doing-insert
    0 cat   cat   cat,PLAYED    cat
    1 bat   bat   bat,PLAYED    bat
    2 bart  ba?t  ba?t,CHANGE@3 ba?t
    3 barts       barts,TARGET  barts

    user types r  - words played: still 3 reset doing-insert
    0 cat   cat   cat,PLAYED   cat
    1 bat   bat   bat,PLAYED   bat
    2 bart  bart  bart,ADD    +b+a+r+t+
    3 barts       barts,TARGET barts

    user clicks +4 - words played: 4 and set doing-insert
    0 cat   cat    cat,PLAYED    cat
    1 bat   bat    bat,PLAYED    bat
    2 bart  bart   bart,PLAYED   bart
    3 barts bart?  bart?,CHANGE@5 bart?

    user types s - words played still 4 and reset doing-insert
    0 cat   cat    cat,PLAYED   cat
    1 bat   bat    bat,PLAYED   bat
    2 bart  bart   bart,PLAYED  bart
    3 barts barts  barts,TARGET barts

    The words up to and including the last-played word, if any, are PLAYED.
    EXCEPTION: if "doing-insert" is true, or equivalently, the last played word
    has a hole in it, it should be displayed using the played word as usual, but the action should be CHANGE@ hole location.
    The next word (after the played list is exhausted) is the ACTIVE WORD to reach
    The words after the active word are FUTURE until TARGET.
    */

    // Choose a random start/target that has a solution between
    // Const.PRACTICE_STEPS_MINIMUM and Const.PRACTICE_STEPS_MAXIMUM
    // steps. Returns an array: [startWord, targetWord].
    static getPracticePuzzle() {
        let min = 0;
        let max = Const.PRACTICE_START_WORDS.length;
        let rand = Math.floor(Math.random() * max); // 0..max-1 inclusive
        let dictionary = new WordChainDict();

        let startWord = Const.PRACTICE_START_WORDS[rand];
        let puzzles = Solver.findPuzzles(dictionary, startWord,
              Const.PRACTICE_MAX_SHORTEST_WORD, Const.PRACTICE_MIN_LONGEST_WORD,
              Const.PRACTICE_STEPS_MINIMUM, Const.PRACTICE_STEPS_MAXIMUM,
              Const.PRACTICE_DIFFICULTY_MINIMUM);
        
        rand = Math.floor(Math.random() * puzzles.length); 
        console.log(`found ${puzzles.length} puzzles starting with ${startWord}.  Choosing #${rand}`);
        let puzzle = puzzles[rand];
        console.log("selected random puzzle: " + puzzle.toStr());

        return [puzzle.getStart(), puzzle.getLastWord()];
        return ["dog", "bite"];
    }

    // Finishes the game. When getNextDisplayInstruction() is called after this,
    // the game can be displayed just the same as if a user finished with all
    // correct moves.
    finishGame() {
        this.partialSolution = this.fullSolutionGivenProgress.copy();
    }

    // Gets information about the game that enables generation of stats and share graphic.
    // Returns an object like this:
    //
    //  {
    //      over: true if user has found target word or steps-minSteps >= Const.TOO_MANY_WRONG_MOVES
    //      wrongMoves: how many wrong moves the user played
    //      // This would only be used if over is true.
    //      gameSummary: array of wordInfo, where wordInfo is an object with two properties: wordLength, wasCorrect
    //  }
    getGameInfo() {
        return {
            over: this.isOver(),
            wrongMoves: this.partialSolution.wrongMoves(),
            gameSummary: this.partialSolution.getPlayedWords().map((playedWord)=>new Object({wordLength: playedWord.word.length, wasCorrect: playedWord.wasCorrect()})),
        };
    }

    getNextDisplayInstruction() {
        console.log("played so far: " + this.partialSolution.toStr());
        console.log("known solution as played: " + this.fullSolutionGivenProgress.toStr());
        console.log(`get display instruction for word number: ${this.wordToDisplayIndex}`);

        // after displaying all the words in the full solution, return null to stop the calling loop 
        let highestIndex = this.fullSolutionGivenProgress.numSteps(); 
        let lastWordPlayedIndex = this.partialSolution.numSteps();

        if (lastWordPlayedIndex == highestIndex && !this.partialSolution.isSolved()) {
            // this is a special case where the partial solution is the same length as the real solution,
            // but not solved yet.   In this case, the last word in the partial solution is the target word with a hole.
            highestIndex += 1;
        }

        if (this.wordToDisplayIndex > highestIndex ) {
            this.wordToDisplayIndex = 0;
            console.log ("done iterating over all words in solution");
            return null;
        }

        let displayInstruction = null;

        if (this.wordToDisplayIndex == 0) {
            displayInstruction = this.instructionForStartWord();
        }
        else if (this.wordToDisplayIndex == highestIndex) {
            displayInstruction = this.instructionForTargetWord();
        } 
        else if (this.wordToDisplayIndex < lastWordPlayedIndex) {
            displayInstruction =  this.instructionForPlayedWord();
        } 
        else if (this.wordToDisplayIndex == lastWordPlayedIndex) {
            displayInstruction =  this.instructionForLastPlayedWord();
        }
        else if (this.wordToDisplayIndex > lastWordPlayedIndex) {
            displayInstruction = this.instructionForFutureWord();
        } else {
            console.log ("unhandled display instruction index: " + this.wordToDisplayIndex);
        }
        this.wordToDisplayIndex += 1;
        console.log ("Display instructions are: " + displayInstruction.toStr());
        return displayInstruction;
    }

    instructionForStartWord() {
        // For now, show as a played word.  Maybe later a special display for the start word.
        let wasCorrect = true;
        let startWord = this.partialSolution.getStart();
        if (this.partialSolution.numSteps() == 0) {
            let nextWord = this.fullSolutionGivenProgress.getNthWord(1);
            return this.displayInstructionForPlayingFromWordToWord(startWord, nextWord, wasCorrect);
        } else {
            let changePosition = -1;
            return new DisplayInstruction(startWord, Const.PLAYED, changePosition, wasCorrect);
        }
    }

    instructionForPlayedWord() {
        let playedWord = this.partialSolution.playedWords[this.wordToDisplayIndex];
        let changePosition = -1;
        return new DisplayInstruction(playedWord.word, Const.PLAYED, changePosition, playedWord.wasCorrect());
    }

    instructionForFutureWord() {
        // we show hints in the future words that require a single letter-change to the next word
        let futureWord = this.fullSolutionGivenProgress.getNthWord(this.wordToDisplayIndex);
        let nextFutureWord = this.fullSolutionGivenProgress.getNthWord(this.wordToDisplayIndex+1);
        let wasCorrect = true;
        let displayInstruction = this.displayInstructionForPlayingFromWordToWord(futureWord, nextFutureWord, wasCorrect);
        displayInstruction.displayType = Const.FUTURE;
        return displayInstruction;
    }

    instructionForLastPlayedWord() {
        // we are displaying the last played word, which is the active word.  We give instructions for
        // how to go from that word to the next word in the solution.
        let lastPlayedWordIndex = this.wordToDisplayIndex;
        let lastPlayedWord = this.partialSolution.playedWords[lastPlayedWordIndex];
        let lastWord = lastPlayedWord.word;  // the string itself
        let wasCorrect = lastPlayedWord.wasCorrect();
        if (Game.wordHasHole(lastWord)) {
            // after user clicks plus somewhere, the list of played words includes the last word played with a hole
            // in it where the user clicked '+'.  This word with a hole is what we will return to the display to show.
            // the last word in the played list is the word with a hole
            let indexOfHole = Game.locationOfHole(lastWord);
            return new DisplayInstruction(lastWord, Const.CHANGE, indexOfHole+1, wasCorrect);
        } else {
            let nextWord = this.fullSolutionGivenProgress.getNthWord(lastPlayedWordIndex + 1);
            return this.displayInstructionForPlayingFromWordToWord(lastWord, nextWord, wasCorrect);
        }
    }

    // this method is for displaying the actual, given target unconditionally.  
    instructionForTargetWord() {
        let targetWord = this.fullSolutionGivenProgress.getTarget();
        let wasCorrect = true;
        let changePosition=-1;
        return new DisplayInstruction(targetWord, Const.TARGET, changePosition, wasCorrect);
    }

    // how to display the last word that needs to be changed to give the next word.
    displayInstructionForPlayingFromWordToWord(lastWordPlayed, nextWord, wasCorrect) {
        if (nextWord.length == lastWordPlayed.length) {
            // which letter changed?
            let changedCharIndex = -1;
            for (let i=0; i<lastWordPlayed.length; i++) {
                if (nextWord[i] != lastWordPlayed[i]) {
                    changedCharIndex = i;
                    break;
                }
            }
            if (changedCharIndex == -1) {
                throw new Error(`${nextWord} and ${lastWordPlayed} should differ by one letter but don't`);
            }
            return new DisplayInstruction(lastWordPlayed, Const.CHANGE, changedCharIndex+1, wasCorrect);
        } else if (nextWord.length == lastWordPlayed.length+1) {
            // we display '+'s to let the user add a hole
            return new DisplayInstruction(lastWordPlayed, Const.ADD, 0, wasCorrect);
        } else if (nextWord.length == lastWordPlayed.length-1) {
            // we display '-'s to let the user delete a letter 
            return new DisplayInstruction(lastWordPlayed, Const.DELETE, 0, wasCorrect);
        } else {
            throw new Error(`${nextWord} and ${lastWordPlayed} have more than 1 letter length difference.`);
        }
    }

    // Return true if game is over; false otherwise.
    isOver() {
        return this.partialSolution.isSolved() || this.partialSolution.wrongMoves() >= Const.TOO_MANY_WRONG_MOVES;
    }

    addWordIfExists(word) {
        if (this.dictionary.isWord(word)) {
            let currentSolutionLength = this.fullSolutionGivenProgress.numSteps();;
            let partialSolutionWithNewWord = this.partialSolution.copy();
            let penalty = 0;
            partialSolutionWithNewWord.addWord(word, penalty);
            this.fullSolutionGivenProgress = Solver.resolve(this.dictionary, partialSolutionWithNewWord);
            let newSolutionLength = this.fullSolutionGivenProgress.numSteps();;
            penalty = newSolutionLength - currentSolutionLength;
            this.partialSolution.addWord(word,  penalty);
            console.log(`After adding ${word} the partial solution is: ${this.partialSolution.toStr()}`);
            return Const.OK;
        } else {
            return Const.NOT_A_WORD
        }
    }

    static HOLE() {return "?";}

    static locationOfHole(word) {
        return word.indexOf(Game.HOLE());
    }

    static wordHasHole(word) {
        return Game.locationOfHole(word) >= 0;
    }
    
    // addPosition is from 0 to last word played's length
    // This adds a word-with-a-hole-in-it to the partial solution.
    // Then, when displaying the last word given (the action word)
    // it should have n+1 letters, one of which is ' '.  And it should
    // be compared to the solution at the same place.
    // returns true if no error
    // returns null on error (e.g. unexpected position)
    playAdd(addPosition) {
        console.log("playAdd(): addPosition:", addPosition);
        let oldWord = this.partialSolution.getLastWord();
        if ((addPosition < 0) || (addPosition > this.partialSolution.getLastWord().length)) {
            return Const.BAD_LETTER_POSITION;
        }
        // We put in a blank for where the letter hole is.
        let newWord = oldWord.substring(0,addPosition) + Game.HOLE() + oldWord.substring(addPosition);
        this.partialSolution.addWord(newWord);
        return Const.OK;
    }

    // deletePosition is 1 to word.length
    // returns true if resulting word is in dictionary; false otherwise
    // returns null on other error (e.g. unexpected position)
    playDelete(deletePosition) {
        let oldWord = this.partialSolution.getLastWord();
        console.log("playDelete(): deletePosition:", deletePosition, " in: ", oldWord);
        // adjust to zero-based
        deletePosition -= 1;
        if ((deletePosition < 0) || (deletePosition >= oldWord.length)) {
            console.log("bad adjusted delete position", deletePosition)
        }
        let newWord = oldWord.substring(0,deletePosition) + oldWord.substring(deletePosition+1);
        return this.addWordIfExists(newWord);
    }

    // letterPosition given is 1 to word.length
    // returns true if resulting word is in dictionary; false otherwise
    // returns null on other error (e.g. unexpected position)
    playLetter(letterPosition, letter) {
        console.log("playLetter(): letterPosition:", letterPosition, ", letter:", letter);
        console.log("solution so far is: ", this.partialSolution.toStr());
        letterPosition -= 1;
        let oldWord = this.partialSolution.getLastWord();
        let newWord = oldWord.substring(0,letterPosition) + letter + oldWord.substring(letterPosition+1);
        if (Game.wordHasHole(oldWord)) {
            this.partialSolution.removeLastWord(); // it will be replaced by the same word without the hole, below.
        }
        console.log("playLetter(): new word is: ", newWord);
        return this.addWordIfExists(newWord)
    }

    // Return true if the game has been won; false otherwise.
    // If over() would return false this should return false.
    isWinner() {
        console.log("winner() - returning", this.partialSolution.isSolved());
        return this.partialSolution.isSolved();
    }
}

export { Game };
