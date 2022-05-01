import { BaseLogger } from '../docs/javascript/BaseLogger.js';
import { WordChainDict } from '../docs/javascript/WordChainDict.js';
import { Solver, Solution } from '../docs/javascript/Solver.js';
import { Game } from '../docs/javascript/Game.js';
import * as Const from '../docs/javascript/Const.js';

import { ElementUtilities } from '../docs/javascript/ElementUtilities.js';

// Forwarding functions; see big comment in AppDisplay.js explaining how these came about.

const url = "https://bprokopowicz.github.io/wordchain/resources/dict/WordFreqDict";

const globalWordList = await fetch(url)
  .then(resp => resp.text())
  .then(text => text.split("\n"));

function runTestsCallback() {
    Test.singleton().runTestsCallback();
}

function lookupCallback() {
    Test.singleton().lookupCallback();
}

function solveCallback() {
    Test.singleton().solveCallback();
}

function puzzleFinderFindCallback() {
    Test.singleton().puzzleFinderFindCallback();
}

// Singleton class Test.

class Test extends BaseLogger {
    static singletonObject = null;

    constructor() {
        super();

        this.name = "NOT SET";
        this.tinyList  = ["apple", "pear", "banana"];
        this.smallList = ["bad", "bade", "bald", "bat", "bate", "bid", "cad", "cat", "dog", "scad"]
        this.fullDict = new WordChainDict(globalWordList);
    }

    static singleton() {
        if (Test.singletonObject === null) {
            Test.singletonObject = new Test();
        }
        return Test.singletonObject;
    }

    display() {
        this.outerDiv = ElementUtilities.addElement("div", {style: "margin: 2rem;"});
        console.log(this.outerDiv);
        this.displayTestSuite();
        this.displayDictTest();
        this.displaySolverTest();
        this.displayPuzzleFinderTest();
        ElementUtilities.addElementTo("hr", this.outerDiv);
    }

    addTitle(title) {
        ElementUtilities.addElementTo("hr", this.outerDiv);
        ElementUtilities.addElementTo("p", this.outerDiv);
        ElementUtilities.addElementTo("h2", this.outerDiv, {}, title);
        ElementUtilities.addElementTo("p", this.outerDiv);
    }

    /*
    ** Testing Framework
    */

    displayTestSuite() {
        this.addTitle("WordChain Test Suite");
        ElementUtilities.addElementTo("button", this.outerDiv, {id: "runTests"}, "Run Tests");
        ElementUtilities.addElementTo("p", this.outerDiv);
        ElementUtilities.addElementTo("label", this.outerDiv, {id: "testResults"}, "");
        ElementUtilities.addElementTo("p", this.outerDiv);

        ElementUtilities.getElement("runTests").addEventListener("click", runTestsCallback);
    }

    runTestsCallback() {
        this.successCount = 0;
        this.failureCount = 0;
        this.messages = [];

        this.runAllTests();
        this.showResults();
    }

    showResults() {
        let results = "";

        results += `Success count: ${this.successCount}<br>`;
        results += `Failure count: ${this.failureCount}<p>`;
        results += this.messages.join("<br>");

        ElementUtilities.setElementHTML("testResults", results);
    }

    verify(truthValue, message) {
        if (! truthValue) {
            this.messages.push(`${this.name}: Failed: ${message}`);
            this.failureCount += 1;
        }
        return truthValue;
    }

    success(testName) {
        this.messages.push(`${this.name}: Succeeded`);
        this.successCount += 1;
    }

    /*
    ** All tests
    */
    runAllTests() {
        this.runDictTests();
        this.runSolverTests();
        this.runGameTests();
    }

    /*
    ** WordChainDict tests
    */

    runDictTests() {
        this.testDictIsWord();
        this.testDictAdders();
        this.testDictRemovers();
        this.testDictReplacements();
        this.testDictFull();
    }

    testDictIsWord() {
        this.name = "DictIsWord";
        const tinyDict  = new WordChainDict(this.tinyList);
        this.verify((tinyDict.getSize() === 3), "size !== 3") &&
            this.verify(tinyDict.isWord("apple"), "apple is not a word") &&
            this.verify(tinyDict.isWord("apPlE"), "apPlE is not a word") &&
            this.verify(!tinyDict.isWord("peach"), "peach is not a word") &&
            this.success();
    }

    testDictAdders() {
        this.name = "DictAdders";
        const smallDict = new WordChainDict(this.smallList);

        const cadAdders = smallDict.findAdderWords("cad");
        const badAdders = smallDict.findAdderWords("bad");
        const batAdders = smallDict.findAdderWords("bat");

        this.verify(cadAdders.has("scad"), "'scad' is not in 'cad' adders") &&
            this.verify(badAdders.has("bald"), "'bald' is not in 'bad' adders") &&
            this.verify(batAdders.has("bate"), "'bate' is not in 'bat' adders") &&
            this.success();
    }

    testDictRemovers() {
        this.name = "DictRemovers";
        const smallDict = new WordChainDict(this.smallList);

        const ccadRemovers = smallDict.findRemoverWords("ccad");
        const baldRemovers = smallDict.findRemoverWords("bald");
        const bateRemovers = smallDict.findRemoverWords("bate");

        this.verify(ccadRemovers.has("cad"), "'cad' is not in 'ccad' removers") &&
            this.verify(baldRemovers.has("bad"), "'bad' is not in 'bald' removers") &&
            this.verify(bateRemovers.has("bat"), "'bat' is not in 'bate' removers") &&
            this.success();
    }

    testDictReplacements() {
        this.name = "DictReplacements";
        const smallDict = new WordChainDict(this.smallList);

        const badReplacements = smallDict.findReplacementWords("bad");
        const cadReplacements = smallDict.findReplacementWords("cad");

        this.verify(cadReplacements.has("bad"), "'bad' is not in 'cad' replacements") &&
            this.verify(badReplacements.has("bid"), "'bid' is not in 'bad' replacements") &&
            this.verify(badReplacements.has("bat"), "'bat' is not in 'bad' replacements") &&
            this.success();
    }

    testDictFull() {
        this.name = "DictFull";

        const dictSize = this.fullDict.getSize();
        const expectedMinDictSize = 16000;

        const catAdders = this.fullDict.findAdderWords("cat");
        const addersSize = catAdders.size;
        const expectedAddersSize = 9;

        const badeReplacements = this.fullDict.findAdderWords("bade");
        const replacementsSize = badeReplacements.size;
        const expectedReplacementsSize = 2;

        this.verify((dictSize >= expectedMinDictSize), `full dictionary has ${dictSize} words; expected at least ${expectedMinDictSize}`) &&
            this.verify(this.fullDict.isWord("place"), "'place' is not in dict") &&
            this.verify(this.fullDict.isWord("PlAcE"), "'PlAcE' is not in dict") &&
            this.verify(!this.fullDict.isWord("zizzamatizzateezyman"), "'zizzamatizzateezyman' is in dict") &&
            this.verify((addersSize == expectedAddersSize), `adders has ${addersSize} words; expected ${expectedAddersSize}`) &&
            this.verify((replacementsSize == expectedReplacementsSize), `adders has ${replacementsSize} words; expected ${expectedReplacementsSize}`) &&
            this.success();
    }

    /*
    ** Solver tests
    */

    runSolverTests() {
        this.testSolverIdentitySequence();
        this.testSolverOneStep();
        this.testSolverMultiStep();
        this.testSolverDistance();
        this.testSolverLongChain();
        this.testGameNotShortestSolutionBug();
        this.testSolverFastestDirection();
        this.testSolverReverseSearchNoSolution();
    }

    testSolverIdentitySequence() {
        this.name = "SolverIdentitySequence";
        const dict = new WordChainDict(["bad", "bat", "cad", "cat", "dog"]);
        const solution = Solver.fastSolve(dict, "bat", "bat");

        this.verify(solution.success(), `error in solving 'bat' to 'bat': ${solution.getError()}`) &&
            this.verify((solution.numSteps() === 0), "solution for 'bat' to 'bat' is not 0") &&
            this.verify((solution.getFirstWord() === 'bat'), "first word for 'bat' to 'bat' is not 'bat'") &&
            this.verify((solution.getLastWord() === 'bat'), "last word for 'bat' to 'bat' is not 'bat'") &&
            this.success();
    }

    testSolverOneStep() {
        this.name = "SolverOneStep"
        const smallDict = new WordChainDict(["bad", "bade", "bat", "bate", "cad", "cat", "dog", "scad"]);

        // Adder
        const solutionBadBade = Solver.fastSolve(smallDict, "bad", "bade");
        // Remover
        const solutionBadeBad = Solver.fastSolve(smallDict, "bade", "bad");
        // Replacer
        const solutionBatCat = Solver.fastSolve(smallDict, "bat", "cat");
        // Nope
        const solutionNope = Solver.fastSolve(smallDict, "bat", "dog");

        this.verify(solutionBadBade.success(), `error on adder 'bad' to 'bade': ${solutionBadBade.getError()}`) &&
            this.verify(solutionBadeBad.success(), `error on remover 'bade' to 'bad': ${solutionBadeBad.getError()}`) &&
            this.verify(solutionBatCat.success(), `error on replacer 'bat' to 'cat': ${solutionBatCat.getError()}`) &&
            this.verify((solutionBadBade.numSteps() === 1), `expected 1 step for 'bad' to 'bade': ${solutionBadBade.getWords()}`) &&
            this.verify((solutionBadeBad.numSteps() === 1), `expected 1 step for 'bade' to 'bad': ${solutionBadeBad.getWords()}`) &&
            this.verify((solutionBatCat.numSteps() === 1), `expected 1 step for 'bat' to 'cat': ${solutionBatCat.getWords()}`) &&
            this.verify(!solutionNope.success(), "expected failure for 'bat' to 'dog'")&&
            this.success();

    }

    testSolverMultiStep() {
        this.name = "SolverTwoStep"
        const smallDict = new WordChainDict(["bad", "bade", "bat", "bate", "cad", "cat", "dog", "scad"]);

        const solutionBatScad = Solver.fastSolve(smallDict, "bat", "scad");
        const solutionScadBat = Solver.fastSolve(smallDict, "scad", "bat");

        this.verify(solutionBatScad.success(), `error on 'bat' to 'scad': ${solutionBatScad.getError()}`) &&
            this.verify(solutionScadBat.success(), `error on 'scad' to 'bat': ${solutionScadBat.getError()}`) &&
            this.verify((solutionBatScad.numSteps() === 3), `expected 3 step for 'bat' to 'scad': ${solutionBatScad.getWords()}`) &&
            this.verify((solutionScadBat.numSteps() === 3), `expected 3 step for 'scad' to 'bat': ${solutionScadBat.getWords()}`) &&
            this.success();
    }

    testSolverDistance() {
        this.name = "SolverDistance";

        // Same length.
        const distanceDogDot = Solution.wordDistance("dog", "dot");
        const distanceDogCat = Solution.wordDistance("dog", "cat");
        // First word shorter.
        const distanceDogGoat = Solution.wordDistance("dog", "goat");
        // First word longer.
        const distanceGoatDog = Solution.wordDistance("goat", "dog");

        this.verify((distanceDogDot === 1), `'dog' to 'dot' distance incorrect: ${distanceDogDot}`) &&
            this.verify((distanceDogCat === 3), `'dog' to 'cat' distance incorrect: ${distanceDogCat}`) &&
            this.verify((distanceDogGoat === 3), `'dog' to 'goat' distance incorrect: ${distanceDogGoat}`) &&
            this.verify((distanceGoatDog === 3), `'goat' to 'dog' distance incorrect: ${distanceGoatDog}`) &&
            this.success();
    }

    testSolverLongChain() {
        this.name = "SolverLongChain";

        const solutionTacoBimbo = Solver.fastSolve(this.fullDict, "taco", "bimbo");
        const foundWords = solutionTacoBimbo.getWords();
        const expectedWords = [ "taco", "tao", "tab", "lab", "lamb", "limb", "limbo", "bimbo" ];

        this.verify(solutionTacoBimbo.success(), `error on 'taco' to 'bimbo': ${solutionTacoBimbo.getError()}`) &&
            this.verify((foundWords.toString() == expectedWords.toString()), `foundWords: ${foundWords} is not as expected: ${expectedWords}`) &&
            this.success();
    }


    testSolverFastestDirection() {
        this.name = "SolverFastestDirection";

        // This takes too long if the solver doesn't try to go from 'matzo'
        // to 'ball' because 'ball' has so many next words.
        const solutionMatzoBall = Solver.fastSolve(this.fullDict, "matzo", "ball");
            this.verify((solutionMatzoBall.getError()=== "No solution"), `expected quick 'No solution' on 'matzo' to 'ball': ${solutionMatzoBall.getError()}`) &&
            this.success();
    }

    testSolverReverseSearchNoSolution() {
        this.name = "SolverReverseSearchNoSolution";
        const triedReverseSearchNoSolution = Solver.fastSolve(this.fullDict, "frog", "echo");
        this.verify(!triedReverseSearchNoSolution.isSolved(), `expected 'No solution' on 'frog' to 'echo'`) &&
        this.success();
    }
    /*
    ** Game tests
    */

    runGameTests() {
        this.testGameCorrectFirstWord();
        this.testGameNotOneStep();
        this.testGameDifferentWordFromInitialSolution();
        this.testGameCompleteSmallDict();
        this.testGameCompleteFullDict();
        this.testGameSolutionCannotHavePlayedWord();
        this.testGameTypeSavingMode();
    }

    testGameCorrectFirstWord() {
        this.name = "GameCorrectFirstWord";

        const smallDict = new WordChainDict(["bad", "bade", "bat", "bate", "cad", "cat", "dog", "scad"])
        const solution = Solver.fastSolve(smallDict, "scad", "bat");
        const game = new Game("small", smallDict, solution);

        const playResult = game.playWord("cad");
        this.verify((playResult === Const.OK), "Word played not OK") &&
            this.success();
    }

    testGameNotOneStep() {
        this.name = "GameNotOneStep";

        const smallDict = new WordChainDict(["bad", "bade", "bat", "bate", "cad", "cat", "dog", "scad"])
        const solution = Solver.fastSolve(smallDict, "scad", "bat");
        const game = new Game("small", smallDict, solution);

        const playResult = game.playWord("dog");
        this.verify((playResult === Const.NOT_ONE_STEP), "Word played not NOT_ONE_STEP") &&
            this.success();
    }

    testGameDifferentWordFromInitialSolution() {
        this.name = "GameDifferentWordFromInitialSolution";

        const smallDict = new WordChainDict(["bad", "bade", "bat", "bate", "cad", "cat", "dog", "scad"])
        const origSolution = Solver.fastSolve(smallDict, "bad", "cat");
        const game = new Game("small", smallDict, origSolution);
        const origStep2 = game.getKnownSolution().getWordByStep(2)

        // "bade" is not in the original solution (but we'll verify that below)..
        const playResult = game.playWord("bade");
        const knownStep1 = game.getKnownSolution().getWordByStep(1)
        const knownStep2 = game.getKnownSolution().getWordByStep(2)

        this.verify((playResult === Const.OK), "Word played not OK") &&
            this.verify((! origSolution.wordList.includes('bade')), "Original solution has 'bade'") &&
            this.verify((knownStep1 === "bade"), `Known step 1 unexpected: ${knownStep1}`) &&
            this.verify((knownStep2 !== origStep2), `Known step 2 same as original: ${knownStep2}`) &&
            this.success();
    }

    testGameCompleteSmallDict() {
        this.name = "GameCompleteSmallDict";

        const smallDict = new WordChainDict(["bad", "bade", "bat", "bate", "cad", "cat", "dog", "scad"])
        const solution = Solver.fastSolve(smallDict, "bad", "scad");
        const game = new Game("small", smallDict, solution);

        const playResult1 = game.playWord("cad");
        const playResult2 = game.playWord("scad");

        this.verify((playResult1 === Const.OK), "Word 1 played not OK") &&
            this.verify((playResult2 === Const.OK), "Word 2 played not OK") &&
            this.verify(game.getSolutionInProgress().isSolved(), `Solution in progress is not solved`) &&
            this.success();
    }

    testGameCompleteFullDict() {
        this.name = "GameCompleteFullDict";
        const origSolution = Solver.fastSolve(this.fullDict, "bad", "word");
        const game = new Game("full", this.fullDict, origSolution);
        const origStep2 = game.getKnownSolution().getWordByStep(2)

        const playResult = game.playWord("cad");
        const knownStep1  = game.getKnownSolution().getWordByStep(1)
        const knownStep2  = game.getKnownSolution().getWordByStep(2)
        const inProgStep1 = game.getSolutionInProgress().getWordByStep(1)

        this.verify((playResult === Const.OK), "Word played not OK") &&
            this.verify((knownStep1 === "cad"), `Known step 1 unexpected: ${knownStep1}`) &&
            this.verify((inProgStep1 === "cad"), `In progress step 1 unexpected: ${inProgStep1}`) &&
            this.verify((knownStep2 !== origStep2), `Known step 2 same as original: ${knownStep2}`) &&
            this.success();
    }

    testGameNotShortestSolutionBug() {
        this.name = "GameNotShortestSolutionBug";
        const solution = Solver.fastSolve(this.fullDict, "broken", "baked");
        const foundWords = solution.getWords();
        const expectedWords = [ "broken", "broke", "brake", "bake", "baked" ];
        this.verify(solution.success(), `error on 'broken' to 'baked': ${solution.getError()}`) &&
                this.verify((foundWords.toString() == expectedWords.toString()), `solution: ${foundWords} is not expected: ${expectedWords}`) &&
                this.success();
    }


    testGameSolutionCannotHavePlayedWord() {
        this.name = "GameSolutionCannotHavePlayedWord";
        const origSolution = Solver.fastSolve(this.fullDict, "cat", "dog");
        const game = new Game("full", this.fullDict, origSolution);

        let playResult = game.playWord("cats")
        let wordsAfterFromWord = game.getKnownSolution().getWords().slice(1)

        this.verify((playResult === Const.OK), "No solution from 'cat, cats' to 'dog'") &&
            this.verify(! wordsAfterFromWord.includes("cat"), "Solution of 'cats' to 'dog' contains 'cat'") &&
            this.success();
    }

    testGameTypeSavingMode() {
        this.name = "GameTypeSavingMode";
        const origSolution = Solver.fastSolve(this.fullDict, "cat", "dog");
        const typeSavingMode = true;
        const game = new Game("full", this.fullDict, origSolution, typeSavingMode);
        let gameWords = game.showGame();
        this.verify(gameWords[1] === "c!t+++") && this.success();
    }

    /*
    ** Additional testing assets
    */

    // Dictionary testing

    displayDictTest() {
        this.addTitle("Dictionary Tester");
        ElementUtilities.addElementTo("label", this.outerDiv, {}, "word: ");
        ElementUtilities.addElementTo("input", this.outerDiv, {id: "someWord", type: "text"});
        ElementUtilities.addElementTo("p", this.outerDiv);
        ElementUtilities.addElementTo("button", this.outerDiv, {id: "lookup"}, "lookup");
        ElementUtilities.addElementTo("p", this.outerDiv);
        ElementUtilities.addElementTo("label", this.outerDiv, {id: "lookupAnswer"}, " Click the button to look up the word.");
        ElementUtilities.addElementTo("p", this.outerDiv);

        ElementUtilities.getElement("lookup").addEventListener("click", lookupCallback);
    }

    lookupCallback() {
        const word = ElementUtilities.getElementValue("someWord");
        if (! this.fullDict.isWord(word)) {
            alert(`${word} is not a word`);
            return;
        }

        const nextWords = [...this.fullDict.findNextWords(word)];
        ElementUtilities.setElementHTML("lookupAnswer", `${nextWords.length} words from ${word}: ${nextWords.join(",")}`);
    }

    // Solver testing

    displaySolverTest() {
        this.addTitle("Solver Tester");
        ElementUtilities.addElementTo("label", this.outerDiv, {}, "Start word: ");
        ElementUtilities.addElementTo("input", this.outerDiv, {id: "solverStartWord", type: "text"});
        ElementUtilities.addElementTo("p", this.outerDiv);
        ElementUtilities.addElementTo("label", this.outerDiv, {}, "Target word: ");
        ElementUtilities.addElementTo("input", this.outerDiv, {id: "solverTargetWord", type: "text"});
        ElementUtilities.addElementTo("p", this.outerDiv);
        ElementUtilities.addElementTo("button", this.outerDiv, {id: "solve"}, "Solve!");
        ElementUtilities.addElementTo("p", this.outerDiv);
        ElementUtilities.addElementTo("label", this.outerDiv, {id: "solveAnswer"}, "Click the button to see the chain.");
        ElementUtilities.addElementTo("p", this.outerDiv);

        ElementUtilities.getElement("solve").addEventListener("click", solveCallback);
    }

    solveCallback() {
        const startWord = ElementUtilities.getElementValue("solverStartWord");
        if (! this.fullDict.isWord(startWord)) {
            alert("Starting word is empty or not a word");
            return;
        }

        const targetWord = ElementUtilities.getElementValue("solverTargetWord");
        if (! this.fullDict.isWord(targetWord)) {
            alert("Target word is empty or not a word");
            return;
        }

        const solution = Solver.fastSolve(this.fullDict, startWord, targetWord);
        ElementUtilities.setElementHTML("solveAnswer", solution.toHtml());
    }

    // Puzzle Finder
    displayPuzzleFinderTest() {
        this.addTitle("Puzzle Finder");
        ElementUtilities.addElementTo("label", this.outerDiv, {}, "Start word: ");
        ElementUtilities.addElementTo("input", this.outerDiv, {id: "puzzleFinderStartWord", type: "text"});
        ElementUtilities.addElementTo("p", this.outerDiv);
        ElementUtilities.addElementTo("label", this.outerDiv, {}, "required word len 1: ");
        ElementUtilities.addElementTo("input", this.outerDiv, {id: "puzzleFinderReqWordLen1", type: "text"});
        ElementUtilities.addElementTo("p", this.outerDiv);
        ElementUtilities.addElementTo("label", this.outerDiv, {}, "required word len 2: ");
        ElementUtilities.addElementTo("input", this.outerDiv, {id: "puzzleFinderReqWordLen2", type: "text"});
        ElementUtilities.addElementTo("p", this.outerDiv);
        ElementUtilities.addElementTo("label", this.outerDiv, {}, "final word len: ");
        ElementUtilities.addElementTo("input", this.outerDiv, {id: "puzzleFinderFinalWordLen", type: "text"});
        ElementUtilities.addElementTo("p", this.outerDiv);
        ElementUtilities.addElementTo("label", this.outerDiv, {}, "min steps: ");
        ElementUtilities.addElementTo("input", this.outerDiv, {id: "puzzleFinderMinSteps", type: "text"});
        ElementUtilities.addElementTo("p", this.outerDiv);
        ElementUtilities.addElementTo("label", this.outerDiv, {}, "max steps: ");
        ElementUtilities.addElementTo("input", this.outerDiv, {id: "puzzleFinderMaxSteps", type: "text"});
        ElementUtilities.addElementTo("p", this.outerDiv);
        ElementUtilities.addElementTo("label", this.outerDiv, {}, "min difficulty: ");
        ElementUtilities.addElementTo("input", this.outerDiv, {id: "puzzleFinderMinDifficulty", type: "text"});
        ElementUtilities.addElementTo("p", this.outerDiv);
        ElementUtilities.addElementTo("label", this.outerDiv, {}, "max difficulty: ");
        ElementUtilities.addElementTo("input", this.outerDiv, {id: "puzzleFinderMaxDifficulty", type: "text"});
        ElementUtilities.addElementTo("p", this.outerDiv);

        ElementUtilities.addElementTo("button", this.outerDiv, {id: "puzzleFinderFind"}, "Find!");
        ElementUtilities.addElementTo("p", this.outerDiv);
        ElementUtilities.addElementTo("label", this.outerDiv, {id: "puzzleFinderAnswer"}, "Click the button to see the target words.");
        ElementUtilities.addElementTo("p", this.outerDiv);

        ElementUtilities.getElement("puzzleFinderFind").addEventListener("click", puzzleFinderFindCallback);
    }

    puzzleFinderFindCallback() {
        const startWord = ElementUtilities.getElementValue("puzzleFinderStartWord");
        if (! this.fullDict.isWord(startWord)) {
            alert("Starting word is empty or not a word");
            return;
        }

        const reqWordLen1 = parseInt(ElementUtilities.getElementValue("puzzleFinderReqWordLen1"));
        const reqWordLen2 = parseInt(ElementUtilities.getElementValue("puzzleFinderReqWordLen2"));
        const minSteps = parseInt(ElementUtilities.getElementValue("puzzleFinderMinSteps"));
        const maxSteps = parseInt(ElementUtilities.getElementValue("puzzleFinderMaxSteps"));
        const minDifficulty = parseInt(ElementUtilities.getElementValue("puzzleFinderMinDifficulty"));
        const maxDifficulty = parseInt(ElementUtilities.getElementValue("puzzleFinderMaxDifficulty"));
        const targetWordLen = parseInt(ElementUtilities.getElementValue("puzzleFinderFinalWordLen"));


        const goodTargetsWithDifficulty =
            [...this.fullDict.getWords()]
            .filter(targetWord => (targetWord.length === targetWordLen))
            .map(targetWord => {
                console.log("target: ", targetWord);
                const solution = Solver.fastSolve(this.fullDict, startWord, targetWord);
                if ( solution.isSolved() &&
                    (solution.numSteps() >= minSteps) &&
                    (solution.numSteps() <= maxSteps) &&
                    (solution.difficulty >= minDifficulty) &&
                    (solution.difficulty <= maxDifficulty) &&
                    (solution.getWords().filter(word => (word.length === reqWordLen1)).length > 0) &&
                    (solution.getWords().filter(word => (word.length === reqWordLen2)).length > 0)
                   ) {
                    return [targetWord, solution.difficulty];
                } else {
                   return [];
                }
            })
            .filter (pair => (pair.length == 2))
            .map(pair => pair.join(":"));

        ElementUtilities.setElementHTML("puzzleFinderAnswer", goodTargetsWithDifficulty.join(","));
    }
}


Test.singleton().display();

export { Test };
