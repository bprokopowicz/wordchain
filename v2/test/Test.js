import { BaseLogger } from '../docs/javascript/BaseLogger.js';
import { WordChainDict } from '../docs/javascript/WordChainDict.js';
import { Solver, Solution } from '../docs/javascript/Solver.js';
import { Game } from '../docs/javascript/Game.js';
import * as Const from '../docs/javascript/Const.js';

import { ElementUtilities } from '../docs/javascript/ElementUtilities.js';

const url = "https://bprokopowicz.github.io/wordchain/resources/dict/WordFreqDict";

const globalWordList = await fetch(url)
  .then(resp => resp.text())
  .then(text => text.split("\n"));

// Singleton class Test.

class Test extends BaseLogger {
    static singletonObject = null;

    constructor() {
        super();

        this.name = "NOT SET";
        this.tinyList  = ["APPLE", "PEAR", "BANANA"];
        this.smallList = ["BAD", "BADE", "BALD", "BAT", "BATE", "BID", "CAD", "CAT", "DOG", "SCAD"]
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
        this.displayTestSuite();
        this.displayDictTester();
        this.displaySolverTester();
        this.displayPuzzleFinderTester();
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

        var runAll    = ElementUtilities.addElementTo("button", this.outerDiv, {id: "runAll",    class: "testButton" }, "Run All Tests"),
            runDict   = ElementUtilities.addElementTo("button", this.outerDiv, {id: "runDict",   class: "testButton" }, "Run Dict Tests"),
            runSolver = ElementUtilities.addElementTo("button", this.outerDiv, {id: "runSolver", class: "testButton" }, "Run Solver Tests"),
            runGame   = ElementUtilities.addElementTo("button", this.outerDiv, {id: "runGame",   class: "testButton" }, "Run Game Tests");

        ElementUtilities.addElementTo("p", this.outerDiv);

        for (let button of [runAll, runDict, runSolver, runGame]) {
            button.callbackAccessor = this;
            ElementUtilities.setButtonCallback(button, this.runTestsCallback);
        }

        ElementUtilities.addElementTo("label", this.outerDiv, {id: "testResults"}, "");
    }

    runTestsCallback(event) {
        // When the button was created we saved 'this' as callbackAccessor in the button
        // element; use it to access other instance data.
        const me = event.srcElement.callbackAccessor,
              buttonId = event.srcElement.getAttribute("id");

        me.successCount = 0;
        me.failureCount = 0;
        me.messages = [];

        if (buttonId == "runAll" || buttonId == "runDict") {
            me.runDictTests();
        } else if (buttonId == "runAll" || buttonId == "runSolver") {
            me.runSolverTests();
        } else if (buttonId == "runAll" || buttonId == "runGame") {
            me.runGameTests();
        }

        me.showResults();
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
            this.verify(tinyDict.isWord("APPLE"), "APPLE is not a word") &&
            this.verify(tinyDict.isWord("apPlE"), "apPlE is not a word") &&
            this.verify(!tinyDict.isWord("PEACH"), "PEACH is not a word") &&
            this.success();
    }

    testDictAdders() {
        this.name = "DictAdders";
        const smallDict = new WordChainDict(this.smallList);

        const cadAdders = smallDict.findAdderWords("CAD");
        const badAdders = smallDict.findAdderWords("BAD");
        const batAdders = smallDict.findAdderWords("BAT");

        this.verify(cadAdders.has("SCAD"), "'SCAD' is not in 'CAD' adders") &&
            this.verify(badAdders.has("BALD"), "'BALD' is not in 'BAD' adders") &&
            this.verify(batAdders.has("BATE"), "'BATE' is not in 'BAT' adders") &&
            this.success();
    }

    testDictRemovers() {
        this.name = "DictRemovers";
        const smallDict = new WordChainDict(this.smallList);

        const ccadRemovers = smallDict.findRemoverWords("CCAD");
        const baldRemovers = smallDict.findRemoverWords("BALD");
        const bateRemovers = smallDict.findRemoverWords("BATE");

        this.verify(ccadRemovers.has("CAD"), "'CAD' is not in 'CCAD' removers") &&
            this.verify(baldRemovers.has("BAD"), "'BAD' is not in 'BALD' removers") &&
            this.verify(bateRemovers.has("BAT"), "'BAT' is not in 'BATE' removers") &&
            this.success();
    }

    testDictReplacements() {
        this.name = "DictReplacements";
        const smallDict = new WordChainDict(this.smallList);

        const badReplacements = smallDict.findReplacementWords("BAD");
        const cadReplacements = smallDict.findReplacementWords("CAD");

        this.verify(cadReplacements.has("BAD"), "'BAD' is not in 'CAD' replacements") &&
            this.verify(badReplacements.has("BID"), "'BID' is not in 'BAD' replacements") &&
            this.verify(badReplacements.has("BAT"), "'BAT' is not in 'BAD' replacements") &&
            this.success();
    }

    testDictFull() {
        this.name = "DictFull";

        const dictSize = this.fullDict.getSize();
        const expectedMinDictSize = 16000;

        const catAdders = this.fullDict.findAdderWords("CAT");
        const addersSize = catAdders.size;
        const expectedAddersSize = 9;

        const badeReplacements = this.fullDict.findAdderWords("BADE");
        const replacementsSize = badeReplacements.size;
        const expectedReplacementsSize = 2;

        this.verify((dictSize >= expectedMinDictSize), `full dictionary has ${dictSize} words; expected at least ${expectedMinDictSize}`) &&
            this.verify(this.fullDict.isWord("PLACe"), "'PLACE' is not in dict") &&
            this.verify(this.fullDict.isWord("PlAcE"), "'PlAcE' is not in dict") &&
            this.verify(!this.fullDict.isWord("ZIZZAMATIZZATEEZYMAN"), "'ZIZZAMATIZZATEEZYMAN' is in dict") &&
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
        const dict = new WordChainDict(["BAD", "BAT", "CAD", "CAT", "DOG"]);
        const solution = Solver.fastSolve(dict, "BAT", "BAT");

        this.verify(solution.success(), `error in solving 'BAT' to 'BAT': ${solution.getError()}`) &&
            this.verify((solution.numSteps() === 0), "solution for 'BAT' to 'BAT' is not 0") &&
            this.verify((solution.getFirstWord() === 'BAT'), "first word for 'BAT' to 'BAT' is not 'BAT'") &&
            this.verify((solution.getLastWord() === 'BAT'), "last word for 'BAT' to 'BAT' is not 'BAT'") &&
            this.success();
    }

    testSolverOneStep() {
        this.name = "SolverOneStep"
        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);

        // Adder
        const solutionBadBade = Solver.fastSolve(smallDict, "BAD", "BADE");
        // Remover
        const solutionBadeBad = Solver.fastSolve(smallDict, "BADE", "BAD");
        // Replacer
        const solutionBatCat = Solver.fastSolve(smallDict, "BAT", "CAT");
        // Nope
        const solutionNope = Solver.fastSolve(smallDict, "BAT", "DOG");

        this.verify(solutionBadBade.success(), `error on adder 'BAD' to 'BADE': ${solutionBadBade.getError()}`) &&
            this.verify(solutionBadeBad.success(), `error on remover 'BADE' to 'BAD': ${solutionBadeBad.getError()}`) &&
            this.verify(solutionBatCat.success(), `error on replacer 'BAT' to 'CAT': ${solutionBatCat.getError()}`) &&
            this.verify((solutionBadBade.numSteps() === 1), `expected 1 step for 'BAD' to 'BADE': ${solutionBadBade.getWords()}`) &&
            this.verify((solutionBadeBad.numSteps() === 1), `expected 1 step for 'BADE' to 'BAD': ${solutionBadeBad.getWords()}`) &&
            this.verify((solutionBatCat.numSteps() === 1), `expected 1 step for 'BAT' to 'CAT': ${solutionBatCat.getWords()}`) &&
            this.verify(!solutionNope.success(), "expected failure for 'BAT' to 'DOG'")&&
            this.success();

    }

    testSolverMultiStep() {
        this.name = "SolverTwoStep"
        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);

        const solutionBatScad = Solver.fastSolve(smallDict, "BAT", "SCAD");
        const solutionScadBat = Solver.fastSolve(smallDict, "SCAD", "BAT");

        this.verify(solutionBatScad.success(), `error on 'BAT' to 'SCAD': ${solutionBatScad.getError()}`) &&
            this.verify(solutionScadBat.success(), `error on 'SCAD' to 'BAT': ${solutionScadBat.getError()}`) &&
            this.verify((solutionBatScad.numSteps() === 3), `expected 3 step for 'BAT' to 'SCAD': ${solutionBatScad.getWords()}`) &&
            this.verify((solutionScadBat.numSteps() === 3), `expected 3 step for 'SCAD' to 'BAT': ${solutionScadBat.getWords()}`) &&
            this.success();
    }

    testSolverDistance() {
        this.name = "SolverDistance";

        // Same length.
        const distanceDogDot = Solution.wordDistance("DOG", "DOT");
        const distanceDogCat = Solution.wordDistance("DOG", "CAT");
        // First word shorter.
        const distanceDogGoat = Solution.wordDistance("DOG", "GOAT");
        // First word longer.
        const distanceGoatDog = Solution.wordDistance("GOAT", "DOG");

        this.verify((distanceDogDot === 1), `'DOG' to 'DOT' distance incorrect: ${distanceDogDot}`) &&
            this.verify((distanceDogCat === 3), `'DOG' to 'CAT' distance incorrect: ${distanceDogCat}`) &&
            this.verify((distanceDogGoat === 3), `'DOG' to 'GOAT' distance incorrect: ${distanceDogGoat}`) &&
            this.verify((distanceGoatDog === 3), `'GOAT' to 'DOG' distance incorrect: ${distanceGoatDog}`) &&
            this.success();
    }

    testSolverLongChain() {
        this.name = "SolverLongChain";

        const solutionTacoBimbo = Solver.fastSolve(this.fullDict, "TACO", "BIMBO");
        const foundWords = solutionTacoBimbo.getWords();
        const expectedWords = [ "TACO", "TAO", "TAB", "LAB", "LAMB", "LIMB", "LIMBO", "BIMBO" ];

        this.verify(solutionTacoBimbo.success(), `error on 'TACO' to 'BIMBO': ${solutionTacoBimbo.getError()}`) &&
            this.verify((foundWords.toString() == expectedWords.toString()), `foundWords: ${foundWords} is not as expected: ${expectedWords}`) &&
            this.success();
    }


    testSolverFastestDirection() {
        this.name = "SolverFastestDirection";

        // This takes too long if the solver doesn't try to go from 'matzo'
        // to 'ball' because 'ball' has so many next words.
        const solutionMatzoBall = Solver.fastSolve(this.fullDict, "MATZO", "BALL");
            this.verify((solutionMatzoBall.getError()=== "No solution"), `expected quick 'No solution' on 'MATZO' TO 'BALL': ${solutionMatzoBall.getError()}`) &&
            this.success();
    }

    testSolverReverseSearchNoSolution() {
        this.name = "SolverReverseSearchNoSolution";
        const triedReverseSearchNoSolution = Solver.fastSolve(this.fullDict, "FROG", "ECHO");
        this.verify(!triedReverseSearchNoSolution.isSolved(), `expected 'No solution' on 'FROG' to 'ECHO'`) &&
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

        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);
        const solution = Solver.fastSolve(smallDict, "SCAD", "BAT");
        const game = new Game("SMALL", smallDict, solution);

        const playResult = game.playWord("CAD");
        this.verify((playResult === Const.OK), "Word played not OK") &&
            this.success();
    }

    testGameNotOneStep() {
        this.name = "GameNotOneStep";

        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);
        const solution = Solver.fastSolve(smallDict, "SCAD", "BAT");
        const game = new Game("small", smallDict, solution);

        const playResult = game.playWord("DOG");
        this.verify((playResult === Const.NOT_ONE_STEP), "Word played not NOT_ONE_STEP") &&
            this.success();
    }

    testGameDifferentWordFromInitialSolution() {
        this.name = "GameDifferentWordFromInitialSolution";

        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);
        const origSolution = Solver.fastSolve(smallDict, "BAD", "CAT");
        const game = new Game("SMALL", smallDict, origSolution);
        const origStep2 = game.getKnownSolution().getWordByStep(2)

        // "bade" is not in the original solution (but we'll verify that below)..
        const playResult = game.playWord("BADE");
        const knownStep1 = game.getKnownSolution().getWordByStep(1)
        const knownStep2 = game.getKnownSolution().getWordByStep(2)

        this.verify((playResult === Const.OK), "Word played not OK") &&
            this.verify((! origSolution.wordList.includes('BADE')), "Original solution has 'BADE'") &&
            this.verify((knownStep1 === "BADE"), `Known step 1 unexpected: ${knownStep1}`) &&
            this.verify((knownStep2 !== origStep2), `Known step 2 same as original: ${knownStep2}`) &&
            this.success();
    }

    testGameCompleteSmallDict() {
        this.name = "GameCompleteSmallDict";

        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);
        const solution = Solver.fastSolve(smallDict, "BAD", "SCAD");
        const game = new Game("small", smallDict, solution);

        const playResult1 = game.playWord("CAD");
        const playResult2 = game.playWord("SCAD");

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
            this.verify((knownStep1 === "CAD"), `Known step 1 unexpected: ${knownStep1}`) &&
            this.verify((inProgStep1 === "CAD"), `In progress step 1 unexpected: ${inProgStep1}`) &&
            this.verify((knownStep2 !== origStep2), `Known step 2 same as original: ${knownStep2}`) &&
            this.success();
    }

    testGameNotShortestSolutionBug() {
        this.name = "GameNotShortestSolutionBug";
        const solution = Solver.fastSolve(this.fullDict, "BROKEN", "BAKED");
        const foundWords = solution.getWords();
        const expectedWords = [ "BROKEN", "BROKE", "BRAKE", "BAKE", "BAKED" ];
        this.verify(solution.success(), `error on 'BROKEN' to 'BAKED': ${solution.getError()}`) &&
            this.verify((foundWords.toString() == expectedWords.toString()), `solution: ${foundWords} is not expected: ${expectedWords}`) &&
            this.success();
    }


    testGameSolutionCannotHavePlayedWord() {
        this.name = "GameSolutionCannotHavePlayedWord";
        const origSolution = Solver.fastSolve(this.fullDict, "CAT", "DOG");
        const game = new Game("full", this.fullDict, origSolution);

        let playResult = game.playWord("CATS");
        let wordsAfterFromWord = game.getKnownSolution().getWords().slice(1);

        this.verify((playResult === Const.OK), "No solution from 'CAT, CATS' to 'DOG'") &&
            this.verify(! wordsAfterFromWord.includes("cat"), "Solution of 'CATS' to 'DOG' contains 'CAT'") &&
            this.success();
    }

    testGameTypeSavingMode() {
        this.name = "GameTypeSavingMode";
        const origSolution = Solver.fastSolve(this.fullDict, "CAT", "DOG");
        const typeSavingMode = true;
        const game = new Game("full", this.fullDict, origSolution, typeSavingMode);
        let gameWords = game.showGame();
        this.verify(gameWords[1] === "c!t+++") && this.success();
    }

    /*
    ** Additional testing assets
    */

    // ===== Dictionary Tester =====

    displayDictTester() {
        this.addTitle("Dictionary Tester");

        ElementUtilities.addElementTo("label", this.outerDiv, {}, "word: ");
        ElementUtilities.addElementTo("input", this.outerDiv, {id: "someWord", type: "text"});
        ElementUtilities.addElementTo("p", this.outerDiv);

        var button = ElementUtilities.addElementTo("button", this.outerDiv, {id: "find"}, "find");

        ElementUtilities.addElementTo("p", this.outerDiv);
        ElementUtilities.addElementTo("label", this.outerDiv, {id: "findAnswer"}, " Click the button to find the word and following words.");
        ElementUtilities.addElementTo("p", this.outerDiv);

        button.callbackAccessor = this;
        ElementUtilities.setButtonCallback(button, this.findCallback);

    }

    findCallback(event) {
        const me = event.srcElement.callbackAccessor;

        const word = ElementUtilities.getElementValue("someWord");
        if (! me.fullDict.isWord(word)) {
            alert(`${word} is not a word`);
            return;
        }

        const nextWords = [...me.fullDict.findNextWords(word)];
        ElementUtilities.setElementHTML("findAnswer", `${nextWords.length} words from ${word}: ${nextWords.join(",")}`);
    }

    // ===== Solver Tester =====

    displaySolverTester() {
        this.addTitle("Solver Tester");

        ElementUtilities.addElementTo("label", this.outerDiv, {}, "Start word: ");
        ElementUtilities.addElementTo("input", this.outerDiv, {id: "solverStartWord", type: "text"});
        ElementUtilities.addElementTo("p", this.outerDiv);

        ElementUtilities.addElementTo("label", this.outerDiv, {}, "Target word: ");
        ElementUtilities.addElementTo("input", this.outerDiv, {id: "solverTargetWord", type: "text"});
        ElementUtilities.addElementTo("p", this.outerDiv);

        var button = ElementUtilities.addElementTo("button", this.outerDiv, {id: "solve"}, "Solve!");

        ElementUtilities.addElementTo("p", this.outerDiv);
        ElementUtilities.addElementTo("label", this.outerDiv, {id: "solveAnswer"}, "Click the button to see the chain.");
        ElementUtilities.addElementTo("p", this.outerDiv);
        ElementUtilities.addElementTo("label", this.outerDiv, {id: "solveTiming"}, "");
        ElementUtilities.addElementTo("p", this.outerDiv);

        button.callbackAccessor = this;
        ElementUtilities.setButtonCallback(button, this.solveCallback);
    }

    solveCallback(event) {
        const me = event.srcElement.callbackAccessor,
              startWord = ElementUtilities.getElementValue("solverStartWord");

        if (! me.fullDict.isWord(startWord)) {
            alert("Starting word is empty or not a word");
            return;
        }

        const targetWord = ElementUtilities.getElementValue("solverTargetWord");
        if (! me.fullDict.isWord(targetWord)) {
            alert("Target word is empty or not a word");
            return;
        }

        const start = Date.now();
        const solution = Solver.solve(me.fullDict, startWord, targetWord);
        const end = Date.now();
        solution.calculateDifficulty(me.fullDict);
        ElementUtilities.setElementHTML("solveAnswer", solution.toHtml());
        ElementUtilities.setElementHTML("solveTiming",  `took ${(end-start)} ms`);
    }

    // ===== Puzzle Finder =====

    displayPuzzleFinderTester() {
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

        ElementUtilities.addElementTo("label", this.outerDiv, {}, "min words: ");
        ElementUtilities.addElementTo("input", this.outerDiv, {id: "puzzleFinderMinWords", type: "text", value: "1"});
        ElementUtilities.addElementTo("p", this.outerDiv);

        ElementUtilities.addElementTo("label", this.outerDiv, {}, "max words: ");
        ElementUtilities.addElementTo("input", this.outerDiv, {id: "puzzleFinderMaxWords", type: "text", value: "1000"});
        ElementUtilities.addElementTo("p", this.outerDiv);

        ElementUtilities.addElementTo("label", this.outerDiv, {}, "min difficulty: ");
        ElementUtilities.addElementTo("input", this.outerDiv, {id: "puzzleFinderMinDifficulty", type: "text", value: "1" });
        ElementUtilities.addElementTo("p", this.outerDiv);

        var button = ElementUtilities.addElementTo("button", this.outerDiv, {id: "puzzleFinderFind"}, "Find!");

        ElementUtilities.addElementTo("p", this.outerDiv);
        ElementUtilities.addElementTo("label", this.outerDiv, {id: "puzzleFinderAnswer"}, "Click the button to see the target words.");
        ElementUtilities.addElementTo("p", this.outerDiv);

        button.callbackAccessor = this;
        ElementUtilities.setButtonCallback(button, this.puzzleFinderFindCallback);
    }

    puzzleFinderFindCallback(event) {
        const me = event.srcElement.callbackAccessor,
              startWord = ElementUtilities.getElementValue("puzzleFinderStartWord");

        if (! me.fullDict.isWord(startWord)) {
            alert("Starting word is empty or not a word");
            return;
        }

        const reqWordLen1 = parseInt(ElementUtilities.getElementValue("puzzleFinderReqWordLen1")),
              reqWordLen2 = parseInt(ElementUtilities.getElementValue("puzzleFinderReqWordLen2")),
              minSteps = parseInt(ElementUtilities.getElementValue("puzzleFinderMinWords")),
              maxSteps = parseInt(ElementUtilities.getElementValue("puzzleFinderMaxWords")),
              minDifficulty = parseInt(ElementUtilities.getElementValue("puzzleFinderMinDifficulty")),
              targetWordLen = parseInt(ElementUtilities.getElementValue("puzzleFinderFinalWordLen"));

        const goodTargetsWithDifficulty = 
            Solver.findPuzzles(me.fullDict, startWord, targetWordLen, reqWordLen1, reqWordLen2, minSteps, maxSteps, minDifficulty)
            .map(puzzle => `${puzzle.getTarget()}:${puzzle.difficulty}`);
        goodTargetsWithDifficulty.sort();

        ElementUtilities.setElementHTML("puzzleFinderAnswer", goodTargetsWithDifficulty.join(","));
    }
}


Test.singleton().display();

export { Test };
