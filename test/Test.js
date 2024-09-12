import { BaseLogger } from '../docs/javascript/BaseLogger.js';
import { WordChainDict, globalWordList, scrabbleWordList } from '../docs/javascript/WordChainDict.js';
import { Solver, Solution } from '../docs/javascript/Solver.js';
import { Game } from '../docs/javascript/Game.js';
import { Cookie } from '../docs/javascript/Cookie.js';
import * as Const from '../docs/javascript/Const.js';

import { ElementUtilities } from '../docs/javascript/ElementUtilities.js';

// use: inTheFuture(2000).then( (foo=this) => {foo.doSomething(arg1, arg2)})
// the method will called as this.doSomething(arg1, arg2);

function inTheFuture(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class TestClassForCookie {
    constructor() {
        this.nums = [];
        this.field = "";
    }
}

// A MockEventSrcElement just has an attributes map that we can populate during testing so that
// when we call a callback, that callback can get the necessary elements from it.
// The only attributes we use in this way are the AdditionPosition and DeletionPosition
class MockEventSrcElement {
    constructor() {
        this.attributes = new Map();
    }

    getAttribute(attributeName) {
        return this.attributes.get(attributeName);
    }

    setAttribute(attributeName, value) {
        return this.attributes.set(attributeName, value);
    }
}

// A MockEvent acts like an Event in that it has a srcElement.  Some of the application code's callbacks use the attributes
// of the srcElement to determine what part of the game is being operated on.  We don't use the actual GUI src elements 
// in testing; we send MockEventSrcElements to the callbacks via a MockEvent.

class MockEvent {
    constructor (mockEventSrcElement) {
        this.srcElement = mockEventSrcElement;
    }
}

// Singleton class Test.

class Test extends BaseLogger {
    static singletonObject = null;

    constructor() {
        super();

        this.testName = "NOT SET";
        this.tinyList  = ["APPLE", "PEAR", "BANANA"];
        this.smallList = ["BAD", "BADE", "BALD", "BAT", "BATE", "BID", "CAD", "CAT", "DOG", "SCAD"]
        this.fullDict = new WordChainDict(globalWordList);
        this.scrabbleDict = new WordChainDict(scrabbleWordList);
        this.messages = [];
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
        this.addTitle("WordChain Test Suite - allow 10+ seconds to complete.  Set Const.GL_DEBUG=false; Browser popups must be allowed.");

        var runAll         = ElementUtilities.addElementTo("button", this.outerDiv, {id: "runAll",         class: "testButton" }, "Run All Tests"),
            runDict        = ElementUtilities.addElementTo("button", this.outerDiv, {id: "runDict",        class: "testButton" }, "Run Dict Tests"),
            runSolver      = ElementUtilities.addElementTo("button", this.outerDiv, {id: "runSolver",      class: "testButton" }, "Run Solver Tests"),
            runGame        = ElementUtilities.addElementTo("button", this.outerDiv, {id: "runGame",        class: "testButton" }, "Run Game Tests"),
            runApp         = ElementUtilities.addElementTo("button", this.outerDiv, {id: "runApp",         class: "testButton" }, "Run App Tests");


        for (let button of [runAll, runDict, runSolver, runGame, runApp]) {
            ElementUtilities.setButtonCallback(button, this, this.runTestsCallback);
        }

        ElementUtilities.addElementTo("label", this.outerDiv, {id: "testResults"}, "");
    }

    runTestsCallback(event) {

        const buttonId = event.srcElement.getAttribute("id");

        if (this.testingInProgress) {
            console.log("Testing already in progress, please wait for results ...");
            return;
        } else {
            console.log("Testing started, please wait for results ...");
        }
        this.successCount = 0;
        this.failureCount = 0;
        this.testAssertionCount = 0;
        this.totalAssertionCount = 0;
        this.messages = [];
        this.needToWaitForAsyncResults = false;

        this.testingStartTime = Date.now();

        if (buttonId == "runAll" || buttonId == "runDict") {
            this.runDictTests();
        }
        if (buttonId == "runAll" || buttonId == "runSolver") {
            this.runSolverTests();
        }
        if (buttonId == "runAll" || buttonId == "runGame") {
            this.runGameTests();
        }
        if (buttonId == "runAll" || buttonId == "runApp") {
            this.runAppTests();
        }

        // we may need to pause before checking results because App Tess run separately
        this.waitForResultsThenShowThem();
        this.testingInProgress = false;
    }

    waitForResultsThenShowThem() {
        if (this.getResultsAreReady()) {
            this.logDebug("results are ready - show them.", "test");
            this.showResults();
            console.log(`Testing took ${Date.now() - this.testingStartTime} ms.`);
        }  else {
            const sleepTime = 1000;
            this.logDebug("pausing  ", sleepTime, " for needToWaitForAsyncResults.");
            inTheFuture(sleepTime).then( (foo=this) => { foo.waitForResultsThenShowThem();});
        }
    }

    showResults() {
        let results = "";

        results += `<br>Success count: ${this.successCount}<br>`;
        results += `Failure count: ${this.failureCount}<br>`;
        results += `Total assertions verified: ${this.totalAssertionCount}<p>`;
        results += this.messages.join("<br>");

        ElementUtilities.setElementHTML("testResults", results);
    }

    verify(truthValue, message) {
        if (! truthValue) {
            this.messages.push(`${this.testName}: Failed: ${message}`);
            this.failureCount += 1;
        } else {
            this.testAssertionCount += 1;
            this.totalAssertionCount += 1;
        }
        return truthValue;
    }

    success(testName) {
        this.messages.push(`${this.testName} (${this.testAssertionCount}) succeeded.`);
        this.testAssertionCount = 0;
        this.successCount += 1;
    }

     practiceGameTest() {
        this.testName = "PracticeGame";

        this.logDebug("theAppDisplay: ", this.getNewAppWindow().theAppDisplay, "test");
        Cookie.clearNonDebugCookies(this.getNewAppWindow());

        this.logDebug("Switching to practice game", "test");
        this.getNewAppWindow().theAppDisplay.switchToPracticeGame();
        this.logDebug("Done switching to practice game", "test");

        let practiceGame = this.getNewAppWindow().theAppDisplay.practiceGame;
        this.logDebug("updating practice game to TEST->PILOT", "test");
        practiceGame.updateWords("TEST","PILOT");
        this.logDebug("done updating practice game to TEST->PILOT", "test");

        let gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;
        let srcElement = new MockEventSrcElement(gameDisplay);
        let mockEvent = new MockEvent(srcElement);
        let unused = "";

        // solve the puzzle directly: TEST LEST LET LOT PLOT PILOT
        //  TEST -> LEST
        gameDisplay.letterPicker.saveLetterPosition(1);
        let resultL1 = gameDisplay.letterPicker.selectionMade("L", unused);

        // LEST -> LET
        mockEvent.srcElement.setAttribute("deletionPosition", "3");
        let resultDelete3 = gameDisplay.deletionClickCallback(mockEvent);

        // LET -> LIT - wrong move!
        gameDisplay.letterPicker.saveLetterPosition(2);
        let resultI2Wrong = gameDisplay.letterPicker.selectionMade("I", unused);

        // LIT -> LOT
        gameDisplay.letterPicker.saveLetterPosition(2);
        let resultO2 = gameDisplay.letterPicker.selectionMade("O", unused);

        // LOT -> xLOT
        mockEvent.srcElement.setAttribute("additionPosition", "0");
        let resultAddition0 = gameDisplay.additionClickCallback(mockEvent);

        // xLOT -> PLOT
        gameDisplay.letterPicker.saveLetterPosition(1);
        let resultP1 = gameDisplay.letterPicker.selectionMade("P", unused);

        // PLOT -> PxLOT
        mockEvent.srcElement.setAttribute("additionPosition", "1");
        let resultAddition1 = gameDisplay.additionClickCallback(mockEvent);

        // PxLOT -> PILOT
        gameDisplay.letterPicker.saveLetterPosition(2);
        let resultI2 = gameDisplay.letterPicker.selectionMade("I", unused);

        this.verify((resultL1 === Const.OK), `playLetter(1, L) returns ${resultL1}, not ${Const.OK}`) &&
            this.verify((resultDelete3 === Const.OK), `playDelete(3) returns ${resultDelete3}, not ${Const.OK}`) &&
            this.verify((resultI2Wrong === Const.WRONG_MOVE), `playLetter(2, O) returns ${resultO2}, not ${Const.OK}`) &&
            this.verify((resultO2 === Const.OK), `playLetter(2, O) returns ${resultO2}, not ${Const.OK}`) &&
            this.verify((resultAddition0 === Const.OK), `playAdd(0) returns ${resultAddition0}, not ${Const.OK}`) &&
            this.verify((resultP1 === Const.OK), `playLetter(1, P) returns ${resultP1}, not ${Const.OK}`) &&
            this.verify((resultAddition1 === Const.OK), `playAdd(1) returns ${resultAddition1}, not ${Const.OK}`) &&
            this.verify((resultI2 === Const.OK), `playLetter(2, I) returns ${resultI2}, not ${Const.OK}`) &&
            this.success();
        this.runNextTest();
     }

   /*
    ** WordChainDict tests
    */

    runDictTests() {
        const startTestTime = Date.now();
        this.logDebug("running dictionary tests ...", "test");
        this.testDictTiming();
        this.testDictIsWord();
        this.testDictAdders();
        this.testDictRemovers();
        this.testDictReplacements();
        this.testDictFull();
        this.testScrabbleDict();
        const endTestTime = Date.now();
        this.logDebug(`dictionary tests elapsed time: ${endTestTime - startTestTime} ms`, "test");
    }

    testDictTiming() {
        let startTestTime = Date.now();
        const copyDict = this.fullDict.copy();
        let endTestTime = Date.now();
        this.logDebug(`dictionary copy elapsed time: ${endTestTime - startTestTime} ms`, "test");
        startTestTime = Date.now();
        let i = 0;
        while (i < 1000) {
            i++;
            let adders = copyDict.findAdderWords("READ");
        }
        endTestTime = Date.now();
        this.logDebug(`dictionary findAdders in copy elapsed time: ${endTestTime - startTestTime} ms`, "test");
    }

    testDictIsWord() {
        this.testName = "DictIsWord";
        const tinyDict  = new WordChainDict(this.tinyList);
        this.verify((tinyDict.getSize() === 3), "size !== 3") &&
            this.verify(tinyDict.isWord("APPLE"), "APPLE is not a word") &&
            this.verify(tinyDict.isWord("apPlE"), "apPlE is not a word") &&
            this.verify(!tinyDict.isWord("PEACH"), "PEACH is not a word") &&
            this.success();
    }

    testDictAdders() {
        this.testName = "DictAdders";
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
        this.testName = "DictRemovers";
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
        this.testName = "DictReplacements";
        const smallDict = new WordChainDict(this.smallList);

        const badReplacements = smallDict.findReplacementWords("BAD");
        const cadReplacements = smallDict.findReplacementWords("CAD");

        this.verify(cadReplacements.has("BAD"), "'BAD' is not in 'CAD' replacements") &&
            this.verify(badReplacements.has("BID"), "'BID' is not in 'BAD' replacements") &&
            this.verify(badReplacements.has("BAT"), "'BAT' is not in 'BAD' replacements") &&
            this.success();
    }

    testDictFull() {
        this.testName = "DictFull";

        const dictSize = this.fullDict.getSize();
        const expectedMinDictSize = 15989;

        const catAdders = this.fullDict.findAdderWords("CAT");
        const addersSize = catAdders.size;
        const expectedAddersSize = 6; /*scat, chat, coat, cart, cast, cats*/

        const badeReplacements = this.fullDict.findAdderWords("BADE");
        const replacementsSize = badeReplacements.size;
        const expectedReplacementsSize = 2;

        this.verify((dictSize >= expectedMinDictSize), `full dictionary has ${dictSize} words; expected at least ${expectedMinDictSize}`) &&
            this.verify(this.fullDict.isWord("PLACE"), "'PLACE' is missing in dict") &&
            this.verify(this.fullDict.isWord("PlAcE"), "'PlAcE' is missing in dict") &&
            this.verify(!this.fullDict.isWord("ZIZZAMATIZZATEEZYMAN"), "'ZIZZAMATIZZATEEZYMAN' should not be in dict") &&
            this.verify((addersSize == expectedAddersSize), `adders has ${addersSize} words; expected ${expectedAddersSize}`) &&
            this.verify((replacementsSize == expectedReplacementsSize), `adders has ${replacementsSize} words; expected ${expectedReplacementsSize}`) &&
            this.success();
    }

    testScrabbleDict() {
        this.testName = "ScrabbleDict";
        this.verify (this.scrabbleDict.isWord("aargh"), "aargh is missing in scrabble dict") &&
        this.verify (this.scrabbleDict.isWord("zzz"), "zzz is missing in scrabble dict") &&
        this.verify (!this.scrabbleDict.isWord("zzzbrother"), "zzzbrother should not be in scrabble dict") &&
        this.success();
    }
    /*
    ** Solver tests
    */

    runSolverTests() {
        const startTestTime = Date.now();
        this.testSolverIdentitySequence();
        this.testSolverOneStep();
        this.testSolverMultiStep();
        this.testSolverLongChain();
        this.testGameNotShortestSolutionBug();
        this.testSolverBothDirections();
        this.testSolverSearchNoSolution();
        this.testPuzzleFinder();
        const endTestTime = Date.now();
        this.logDebug(`solver tests elapsed time: ${endTestTime - startTestTime} ms`, "test");
    }

    testSolverIdentitySequence() {
        const startTestTime = Date.now();
        this.testName = "SolverIdentitySequence";
        const dict = new WordChainDict(["BAD", "BAT", "CAD", "CAT", "DOG"]);
        const solution = Solver.solve(dict, "BAT", "BAT");

        this.verify(solution.success(), `error in solving 'BAT' to 'BAT': ${solution.getError()}`) &&
            this.verify((solution.numSteps() === 0), "solution for 'BAT' to 'BAT' is not 0") &&
            this.verify((solution.getStart() === 'BAT'), "first word for 'BAT' to 'BAT' is not 'BAT'") &&
            this.verify((solution.getTarget() === 'BAT'), "last word for 'BAT' to 'BAT' is not 'BAT'") &&
            this.success();
        const endTestTime = Date.now();
        this.logDebug(`${this.testName} elapsed time: ${endTestTime - startTestTime} ms`, "test");
    }

    testSolverOneStep() {
        const startTestTime = Date.now();
        this.testName = "SolverOneStep"
        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);

        // Adder
        const solutionBadBade = Solver.solve(smallDict, "BAD", "BADE");
        // Remover
        const solutionBadeBad = Solver.solve(smallDict, "BADE", "BAD");
        // Replacer
        const solutionBatCat = Solver.solve(smallDict, "BAT", "CAT");
        // Nope
        const solutionNope = Solver.solve(smallDict, "BAT", "DOG");

        const endTestTime = Date.now();
        this.logDebug(`${this.testName} elapsed time: ${endTestTime - startTestTime} ms`, "test");

        this.verify(solutionBadBade.success(), `error on adder 'BAD' to 'BADE': ${solutionBadBade.getError()}`) &&
            this.verify(solutionBadeBad.success(), `error on remover 'BADE' to 'BAD': ${solutionBadeBad.getError()}`) &&
            this.verify(solutionBatCat.success(), `error on replacer 'BAT' to 'CAT': ${solutionBatCat.getError()}`) &&
            this.verify((solutionBadBade.numSteps() === 1), `expected 1 step for 'BAD' to 'BADE': ${solutionBadBade.getSolutionSteps()}`) &&
            this.verify((solutionBadeBad.numSteps() === 1), `expected 1 step for 'BADE' to 'BAD': ${solutionBadeBad.getSolutionSteps()}`) &&
            this.verify((solutionBatCat.numSteps() === 1), `expected 1 step for 'BAT' to 'CAT': ${solutionBatCat.getSolutionSteps()}`) &&
            this.verify(!solutionNope.success(), "expected failure for 'BAT' to 'DOG'")&&
            this.success();

    }

    testSolverMultiStep() {
        const startTestTime = Date.now();
        this.testName = "SolverTwoStep"
        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);

        const solutionBatScad = Solver.solve(smallDict, "BAT", "SCAD");
        const solutionScadBat = Solver.solve(smallDict, "SCAD", "BAT");

        const endTestTime = Date.now();
        this.logDebug(`${this.testName} elapsed time: ${endTestTime - startTestTime} ms`, "test");

        this.verify(solutionBatScad.success(), `error on 'BAT' to 'SCAD': ${solutionBatScad.getError()}`) &&
            this.verify(solutionScadBat.success(), `error on 'SCAD' to 'BAT': ${solutionScadBat.getError()}`) &&
            this.verify((solutionBatScad.numSteps() === 3), `expected 3 step for 'BAT' to 'SCAD': ${solutionBatScad.getSolutionSteps()}`) &&
            this.verify((solutionScadBat.numSteps() === 3), `expected 3 step for 'SCAD' to 'BAT': ${solutionScadBat.getSolutionSteps()}`) &&
            this.success();
    }

    testSolverLongChain() {
        this.testName = "SolverLongChain";
        const startTestTime = Date.now();

        const solutionTacoBimbo = Solver.solve(this.fullDict, "TACO", "BIMBO");
        const foundWords = solutionTacoBimbo.getSolutionSteps().map((step)=>step.word);
        const expectedWords = [ "TACO", "TAO", "TAB", "LAB", "LAMB", "LIMB", "LIMBO", "BIMBO" ];

        const endTestTime = Date.now();
        this.logDebug(`${this.testName} elapsed time: ${endTestTime - startTestTime} ms`, "test");

        this.verify(solutionTacoBimbo.success(), `error on 'TACO' to 'BIMBO': ${solutionTacoBimbo.getError()}`) &&
            this.verify((foundWords.toString() == expectedWords.toString()), `foundWords: ${foundWords} is not as expected: ${expectedWords}`) &&
            this.success();
    }


    testSolverBothDirections() {
        this.testName = "SolverBothDirections";
        let startTestTime = Date.now();

        // This takes too long if the solver doesn't try to go from 'matzo'
        // to 'ball' because 'ball' has so many next words.
        const solutionMatzoBall = Solver.solve(this.fullDict, "MATZO", "BALL");
        let endTestTime = Date.now();
        const elapsedForwardTime = endTestTime - startTestTime;
        startTestTime = Date.now();
        const solutionBallMatzo = Solver.solve(this.fullDict, "BALL", "MATZO");
        endTestTime = Date.now();
        const elapsedReverseTime = endTestTime - startTestTime;

        this.logDebug(`${this.testName} MATZO to BALL elapsed time: ${elapsedForwardTime} ms`, "test");
        this.logDebug(`${this.testName} BALL to MATZO elapsed time: ${elapsedReverseTime} ms`, "test");

        this.verify((solutionMatzoBall.getError()=== "No solution"), `expected quick 'No solution' on 'MATZO' TO 'BALL': ${solutionMatzoBall.getError()}`) &&
        this.verify((solutionBallMatzo.getError()=== "No solution"), `expected slow 'No solution' on 'BALL' TO 'MATZO': ${solutionBallMatzo.getError()}`) &&
        this.verify((100*elapsedForwardTime < elapsedReverseTime), `expected fast path ${elapsedForwardTime} to be at least 100x shorter than reverse path ${elapsedReverseTime}`) &&
        this.success();
    }

    testSolverSearchNoSolution() {
        const startTestTime = Date.now();
        this.testName = "SolverSearchNoSolution";
        const triedSearchNoSolution = Solver.solve(this.fullDict, "FROG", "ECHO");
        const endTestTime = Date.now();
        this.logDebug(`${this.testName} elapsed time: ${endTestTime - startTestTime} ms`, "test");

        this.verify(!triedSearchNoSolution.isSolved(), `expected 'No solution' on 'FROG' to 'ECHO'`) &&
        this.success();
    }

    testPuzzleFinder() {
        const startTestTime = Date.now();
        this.testName = "PuzzleFinder";

        const startWord = "BLUE",
              reqWordLen1 = 3,
              reqWordLen2 = 5,
              minSteps = 7,
              maxSteps = 9,
              minDifficulty = 45,
              targetWordLen = 5,
              expectedNumberOfPuzzles = 664;

        const suitablePuzzles =
            Solver.findPuzzles(this.fullDict, startWord, targetWordLen, reqWordLen1, reqWordLen2, minSteps, maxSteps, minDifficulty)
            .map(puzzle => `${puzzle.getTarget()}:${puzzle.difficulty}`);
        suitablePuzzles.sort();

        const [targetWord, difficulty] = suitablePuzzles[0].split(":");
        const solution = Solver.solve(this.fullDict, startWord, targetWord);
        this.verify(suitablePuzzles.length == expectedNumberOfPuzzles, `expected ${expectedNumberOfPuzzles}, got ${suitablePuzzles.length}`) &&
            this.verify(solution.numSteps() >= minSteps, `solution too short ${solution.numSteps()} not ${minSteps}`) &&
            this.verify(solution.numSteps() <= maxSteps, `solution too long ${solution.numSteps()} not ${maxSteps}`) &&
            this.verify(solution.hasWordOfLength(reqWordLen1), `solution missing word of length ${reqWordLen1}`) &&
            this.verify(solution.hasWordOfLength(reqWordLen2), `solution missing word of length ${reqWordLen2}`) &&
            this.verify(difficulty >= minDifficulty, `solution to easy: ${difficulty} is not at least ${minDifficulty}`) &&
            this.success();
    }


    /*
    ** Game tests
    */

    runGameTests() {
        const startTestTime = Date.now();
        this.testGameCorrectFirstWord();
        this.testGameDeleteWrongLetter();
        this.testGameDeleteBadPosition();
        this.testGameDifferentWordFromInitialSolution();
        this.testGameCompleteSmallDict();
        this.testGameCompleteFullDict();
        this.testGameDisplayInstructions();
        this.testGameDisplayInstructionsMistakes();
        this.testGameDisplayInstructionsDifferentPath();
        this.testGameUsingScrabbleWord();
        this.testGameUsingGeniusMove();
        this.testGameFinish();
        const endTestTime = Date.now();
        this.logDebug(`game tests elapsed time: ${endTestTime - startTestTime} ms`, "test");
    }

    testGameCorrectFirstWord() {
        this.testName = "GameCorrectFirstWord";

        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);
        const steps = [];
        const game = new Game("SCAD", "BAT", steps, smallDict);

        const playResult = game.playDelete(1);
        this.verify((playResult === Const.OK), "Word played not OK") &&
            this.success();
    }

    testGameDeleteWrongLetter() {
        this.testName = "GameDeleteLetterNotAWord";

        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);
        const steps = [];
        const game = new Game("SCAD", "BAT", steps, smallDict);

        const playResult = game.playDelete(3);
        this.verify((playResult === Const.NOT_A_WORD), "NOT_A_WORD after deleting wrong letter") &&
            this.success();
    }

    testGameDeleteBadPosition() {
        this.testName = "GameDeleteBadPosition";

        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);
        const steps = [];
        const game = new Game("SCAD", "BAT", steps, smallDict);

        const playResult = game.playDelete(6);
        this.verify((playResult === Const.BAD_POSITION), "Delete attempted at bad position") &&
            this.success();
    }


    testGameDifferentWordFromInitialSolution() {
        this.testName = "GameDifferentWordFromInitialSolution";

        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAT", "DOG", "SCAD"]);
        const origSolution = Solver.solve(smallDict, "BAD", "CAT");
        const steps = [];
        const game = new Game("BAD", "CAT", steps, smallDict);
        const origWord1 = game.remainingSteps.getNthWord(0);

        if ( !(this.verify((origWord1 === "BAT"), "original solution should have BAT as first word") &&
        // "bade" is not in the original solution
            this.verify(! origSolution.getSolutionWords().includes('BADE'), "Original solution should not have 'BADE'"))) return;

        const playAddResult = game.playAdd(3);
        if (!this.verify((playAddResult === Const.OK), "playAdd(3) not OK")) return;

        const playLetterResult = game.playLetter(4, "E");
        if (!this.verify((playLetterResult === Const.WRONG_MOVE), `playLetter(4, E) returns ${playLetterResult}, not WRONG_MOVE`)) return;
        this.logDebug("After playLetter(4,E), game.remainingSteps are:" + game.remainingSteps.toStr(), "game");

        const newPlayedWord = game.playedSteps.getNthWord(1);
        if (!this.verify((newPlayedWord === "BADE"), `Played word 1 should be BADE, not: ${newPlayedWord}`))  return;
        const newSolutionWord0 = game.remainingSteps.getNthWord(0);
        this.verify((newSolutionWord0 === "BAD"), `New solution should continue with BAD, not: ${newSolutionWord0}`) &&
            this.success();
    }

    testGameCompleteSmallDict() {
        this.testName = "GameCompleteSmallDict";

        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);
        const solution = Solver.solve(smallDict, "BAD", "SCAD");
        const isPlayed = true;
        const moveRating = Const.OK;
        const fullSolutionAsTuples = solution.getSolutionSteps().map((step)=>[step.word, isPlayed, moveRating]);
        const game = new Game("BAD", "SCAD", fullSolutionAsTuples, smallDict);

        this.verify(game.isOver(), "Game initialized with full solution is not solved") &&
            this.success();
    }

    testGameCompleteFullDict() {
        this.testName = "GameCompleteFullDict";
        const solution = Solver.solve(this.fullDict, "bad", "word");
        const isPlayed = true;
        const moveRating = Const.OK;
        const fullSolutionAsTuples = solution.getSolutionSteps().map((step)=>[step.word, isPlayed, moveRating]);
        const game = new Game("bad", "word", fullSolutionAsTuples, this.fullDict);

        this.verify(game.isOver(), "Game initialized with full solution is not solved") &&
            this.success();
    }

    testGameNotShortestSolutionBug() {
        this.testName = "GameNotShortestSolutionBug";
        const solution = Solver.solve(this.fullDict, "BROKEN", "BAKED");
        const foundWords = solution.getSolutionSteps().map((step)=>step.word);
        const expectedWords = [ "BROKEN", "BROKE", "BRAKE", "BAKE", "BAKED" ];
        this.verify(solution.success(), `error on 'BROKEN' to 'BAKED': ${solution.getError()}`) &&
            this.verify((foundWords.toString() == expectedWords.toString()), `solution: ${foundWords} is not expected: ${expectedWords}`) &&
            this.success();
    }

    testGameDisplayInstructions() {
        this.testName = "GameDisplayInstructions";
        const steps = [];
        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);
        const game = new Game("SCAD", "BAT", steps, smallDict);
        const initialInstructions = game.getDisplayInstructions();

        const playDeleteResult = game.playDelete(1); // SCAD to CAD
        const afterDeleteInstructions = game.getDisplayInstructions();

        const playLetterBResult = game.playLetter(1, "B"); // CAD to BAD
        const afterPlayLetterBInstructions = game.getDisplayInstructions();

        const playLetterTResult = game.playLetter(3, "T"); // CAD to BAD
        const afterPlayLetterTInstructions = game.getDisplayInstructions();

        this.verify((initialInstructions.length === 4), `Display instructions length should be 4, not ${initialInstructions.length}`) &&
        this.verify((initialInstructions[0].toStr() === "(delete,word:SCAD)"), `initial instruction[0] is ${initialInstructions[0].toStr()}`) &&
        this.verify((initialInstructions[1].toStr() === "(future,word:CAD,changePosition:1)"), `initial instruction[1] is ${initialInstructions[1].toStr()}`) &&
        this.verify((initialInstructions[2].toStr() === "(future,word:BAD,changePosition:3)"), `initial instruction[2] is ${initialInstructions[2].toStr()}`) &&
        this.verify((initialInstructions[3].toStr() === "(target,word:BAT)"), `initial instruction[3] is ${initialInstructions[3].toStr()}`) &&
        this.verify((playDeleteResult === Const.OK), "playDelete(1) not OK") &&
        this.verify((afterDeleteInstructions[0].toStr() === `(played,word:SCAD,moveRating:${Const.OK})`), `after delete instruction[0] is ${afterDeleteInstructions[0].toStr()}`) &&
        this.verify((afterDeleteInstructions[1].toStr() === "(change,word:CAD,changePosition:1)"), `after delete instruction[1] is ${afterDeleteInstructions[1].toStr()}`) &&
        this.verify((afterDeleteInstructions[2].toStr() === "(future,word:BAD,changePosition:3)"), `after delete instruction[2] is ${afterDeleteInstructions[2].toStr()}`) &&
        this.verify((afterDeleteInstructions[3].toStr() === "(target,word:BAT)"), `after delete instruction[3] is ${afterDeleteInstructions[3].toStr()}`) &&
        this.verify((playLetterBResult === Const.OK), "playLetterBResult(1) not OK") &&
        this.verify((afterPlayLetterBInstructions[0].toStr() === `(played,word:SCAD,moveRating:${Const.OK})`), `after play letter B  instruction[0] is ${afterPlayLetterBInstructions[0].toStr()}`) &&
        this.verify((afterPlayLetterBInstructions[1].toStr() === `(played,word:CAD,moveRating:${Const.OK})`), `after play letter B  instruction[1] is ${afterPlayLetterBInstructions[1].toStr()}`) &&
        this.verify((afterPlayLetterBInstructions[2].toStr() === "(change,word:BAD,changePosition:3)"), `after play letter B  instruction[2] is ${afterPlayLetterBInstructions[2].toStr()}`) &&
        this.verify((afterPlayLetterBInstructions[3].toStr() === "(target,word:BAT)"), `after play letter B  instruction[3] is ${afterPlayLetterBInstructions[3].toStr()}`) &&
        this.verify((playLetterTResult === Const.OK), "playLetterTResult(1) not OK") &&
        this.verify((afterPlayLetterTInstructions[0].toStr() === `(played,word:SCAD,moveRating:${Const.OK})`), `after play letter T instruction[0] is ${afterPlayLetterTInstructions[0].toStr()}`) &&
        this.verify((afterPlayLetterTInstructions[1].toStr() === `(played,word:CAD,moveRating:${Const.OK})`), `after play letter T instruction[1] is ${afterPlayLetterTInstructions[1].toStr()}`) &&
        this.verify((afterPlayLetterTInstructions[2].toStr() === `(played,word:BAD,moveRating:${Const.OK})`), `after play letter T instruction[2] is ${afterPlayLetterTInstructions[2].toStr()}`) &&
        this.verify((afterPlayLetterTInstructions[3].toStr() === `(played,word:BAT,moveRating:${Const.OK})`), `after play letter T instruction[3] is ${afterPlayLetterTInstructions[3].toStr()}`) &&
            this.success();
    }

    testGameDisplayInstructionsMistakes() {
        this.testName = "GameDisplayInstructionsMistakes";
        const steps = [];
        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "CAR", "DOG", "SCAD"]);
        const game = new Game("SCAD", "BAT", steps, smallDict); // shortest solution is SCAD,CAD,BAD,BAT or SCAD,CAD,CAT,BAT but via BAD is earlier

        const playDeleteResult = game.playDelete(4); // SCAD to SCA
        const afterDeleteInstructions = game.getDisplayInstructions();

        game.playDelete(1); // SCAD to CAD

        const cadToCarResult = game.playLetter(3,"R"); // CAD TO CAR
        const cadToCarInstructions = game.getDisplayInstructions(); // SCAD,CAD,CAR,CAT,BAT

        this.verify((playDeleteResult === Const.NOT_A_WORD), `playDelete(4) expected ${Const.NOT_A_WORD}, got ${playDeleteResult}`) &&
        this.verify((afterDeleteInstructions[0].toStr() === "(delete,word:SCAD)"), `after delete, instruction[0] is ${afterDeleteInstructions[0].toStr()}`) &&
        this.verify((afterDeleteInstructions[1].toStr() === "(future,word:CAD,changePosition:1)"), `after delete, instruction[1] is ${afterDeleteInstructions[1].toStr()}`) &&
        this.verify((afterDeleteInstructions[2].toStr() === "(future,word:BAD,changePosition:3)"), `after delete, instruction[2] is ${afterDeleteInstructions[2].toStr()}`) &&
        this.verify((afterDeleteInstructions[3].toStr() === "(target,word:BAT)"), `after delete, instruction[3] is ${afterDeleteInstructions[3].toStr()}`) &&
        this.verify((cadToCarResult === Const.WRONG_MOVE), `playLetter(3,R) expected ${Const.WRONG_MOVE}, got ${cadToCarResult}`) &&
        this.verify((cadToCarInstructions[0].toStr() === `(played,word:SCAD,moveRating:${Const.OK})`), `after playing R, instruction[0] is ${cadToCarInstructions[0].toStr()}`) &&
        this.verify((cadToCarInstructions[1].toStr() === `(played,word:CAD,moveRating:${Const.OK})`), `after playing R, instruction[1] is ${cadToCarInstructions[1].toStr()}`) &&
        this.verify((cadToCarInstructions[2].toStr() === "(change,word:CAR,changePosition:3)"), `after playing R, instruction[1] is ${cadToCarInstructions[2].toStr()}`) &&
        this.verify((cadToCarInstructions[3].toStr() === "(future,word:CAT,changePosition:1)"), `after playing R, instruction[2] is ${cadToCarInstructions[3].toStr()}`) &&
        this.verify((cadToCarInstructions[4].toStr() === "(target,word:BAT)"), `after playing R, instruction[3] is ${cadToCarInstructions[4].toStr()}`) &&
            this.success();
    }

    testGameDisplayInstructionsDifferentPath() {
        this.testName = "GameDisplayInstructionsDifferentPath";
        const steps = [];
        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "CAR", "DOG", "SCAD"]);
        const game = new Game("SCAD", "BAT", steps, smallDict); // shortest solution is SCAD,CAD,BAD,BAT or SCAD,CAD,CAT,BAT but via BAD is earlier

        game.playDelete(1); // SCAD to CAD

        const cadToCatResult = game.playLetter(3,"T"); // CAD TO CAT
        const cadToCatInstructions = game.getDisplayInstructions(); // SCAD,CAD,CAT,BAT

        this.verify((cadToCatResult === Const.OK), `playLetter(3,T) expected ${Const.OK}, got ${cadToCatResult}`) &&
        this.verify((cadToCatInstructions[0].toStr() === `(played,word:SCAD,moveRating:${Const.OK})`), `after playing R, instruction[0] is ${cadToCatInstructions[0].toStr()}`) &&
        this.verify((cadToCatInstructions[1].toStr() === `(played,word:CAD,moveRating:${Const.OK})`), `after playing R, instruction[1] is ${cadToCatInstructions[1].toStr()}`) &&
        this.verify((cadToCatInstructions[2].toStr() === "(change,word:CAT,changePosition:1)"), `after playing R, instruction[2] is ${cadToCatInstructions[3].toStr()}`) &&
        this.verify((cadToCatInstructions[3].toStr() === "(target,word:BAT)"), `after playing R, instruction[3] is ${cadToCatInstructions[3].toStr()}`) &&
            this.success();
    }

    testGameUsingScrabbleWord() {
        this.testName = "GameUsingScrabbleWord";
        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "CAR", "DOG", "SCAD", "SAG", "SAT"]);
        const steps = [];
        const game = new Game("SCAD", "BAT", steps, smallDict); // shortest solution is SCAD,CAD,BAD,BAT or SCAD,CAD,CAT,BAT

        const scadToScagResult = game.playLetter(4,"G"); // SCAD to SCAG uses scrabble word
        const scagToSagResult = game.playDelete(2); // SCAG to SAG.
        const displayInstructionsAfterSAG = game.getDisplayInstructions(); // Solution should now be SCAD, SCAG, SAG, SAT, BAT
        this.verify((scadToScagResult === Const.WRONG_MOVE), `playLetter(4,G) expected ${Const.WRONG_MOVE}, got ${scadToScagResult}`) &&
        this.verify((scagToSagResult === Const.OK), `playDelete(2) expected ${Const.OK}, got ${scagToSagResult}`) &&
        this.verify((displayInstructionsAfterSAG[0].toStr() === `(played,word:SCAD,moveRating:${Const.OK})`), `after playing SAG, instruction[0] is ${displayInstructionsAfterSAG[0].toStr()}`) &&
        this.verify((displayInstructionsAfterSAG[1].toStr() === `(played,word:SCAG,moveRating:${Const.WRONG_MOVE})`), `after playing SAG, instruction[1] is ${displayInstructionsAfterSAG[1].toStr()}`) &&
        this.verify((displayInstructionsAfterSAG[2].toStr() === "(change,word:SAG,changePosition:3)"), `after playing SAG, instruction[2] is ${displayInstructionsAfterSAG[2].toStr()}`) &&
        this.verify((displayInstructionsAfterSAG[3].toStr() === "(future,word:SAT,changePosition:1)"), `after playing SAG, instruction[3] is ${displayInstructionsAfterSAG[3].toStr()}`) &&
            this.success();
    }

    testGameUsingGeniusMove() {
        this.testName = "GameUsingGeniusMove";
        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "CAR", "DOG", "SCAD", "SAG", "SAT"]);
        const steps = [];
        const game = new Game("SCAD", "SAG", steps, smallDict); // shortest solution is SCAD,CAD,CAT,SAT,SAG
                                                                // but genius solution is SCAD,SCAG,SAG

        const scadToScagResult = game.playLetter(4,"G"); // SCAD to SCAG uses scrabble word
        const scagToSagResult = game.playDelete(2); // SCAG to SAG.
        const displayInstructionsAfterSAG = game.getDisplayInstructions(); // Solution should now be SCAD, SCAG, SAG, SAT, BAT
        this.verify((scadToScagResult === Const.GENIUS_MOVE), `playLetter(4,G) expected ${Const.GENIUS_MOVE}, got ${scadToScagResult}`) &&
        this.verify((scagToSagResult === Const.OK), `playDelete(2) expected ${Const.OK}, got ${scagToSagResult}`) &&
            this.success();
    }

    testGameFinish() {
        this.testName = "GameFinish";

        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);
        const steps = [];
        const game = new Game("SCAD", "BAT", steps, smallDict);

        const playResult = game.playDelete(1);
        game.finishGame();
        const displayInstructionsAfterFinish = game.getDisplayInstructions(); // Solution should now be SCAD, CAD, CAT, BAT
        this.verify((playResult === Const.OK), "Word played not OK") &&
            this.verify((displayInstructionsAfterFinish.length === 4), `after finishGame(), expected 4 display instructions, got ${displayInstructionsAfterFinish.length}`) &&
            this.verify(game.isOver()) &&
            this.success();
    }

    /*
    ** Additional testing assets
    */

    // ===== AppDisplay Tester =====

    geniusMoveAndShareTest() {
        this.testName = "GeniusMoveDisplay";

        Cookie.clearNonDebugCookies(this.getNewAppWindow());
        this.getNewAppWindow().theAppDisplay.switchToDailyGame();

        let gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;

        let srcElement = new MockEventSrcElement(gameDisplay);
        let mockEvent = new MockEvent(srcElement);

        // regular solution:                SHORT SHOOT HOOT BOOT BOOR POOR
        // solve the puzzle like a genius:  SHORT SHOOT HOOT HOOR POOR

        //  SHORT -> SHOOT
        let unused = "";
        gameDisplay.letterPicker.saveLetterPosition(4);
        let resultO4 = gameDisplay.letterPicker.selectionMade("O", unused);

        // SHOOT -> HOOT
        mockEvent.srcElement.setAttribute("deletionPosition", "1");
        let resultDelete1 = gameDisplay.deletionClickCallback(mockEvent);

        // HOOT -> HOOR genius move
        gameDisplay.letterPicker.saveLetterPosition(4);
        let resultR4Genius = gameDisplay.letterPicker.selectionMade("R", unused);

        // HOOR -> POOR  we are skipping this - it's enough that we saw the genius move
        gameDisplay.letterPicker.saveLetterPosition(1);
        let resultP1 = gameDisplay.letterPicker.selectionMade("P", unused);

        // While we're here, let's look at the share ...
        let statsDisplay = this.getNewAppWindow().theAppDisplay.statsDisplay;
        this.logDebug("theAppDisplay", this.getNewAppWindow().theAppDisplay, "test");
        this.logDebug("gameDisplay", gameDisplay, "test");
        this.logDebug("theAppDisplay.statsDisplay", statsDisplay, "test");

        let statsSrcElement = new MockEventSrcElement(statsDisplay);
        let statsMockEvent = new MockEvent(statsSrcElement);
        let shareString = statsDisplay.shareCallback(statsMockEvent);

        let expectedShareString = `WordChain #${Const.STATIC_DAILY_GAME_NUMBER} ⭐\n\n🟪🟪🟪🟪🟪\n🟩🟩🟩🟩🟩\n🟩🟩🟩🟩\n🌟🌟🌟🌟\n🟪🟪🟪🟪`;

        this.verify((resultO4 === Const.OK), `playLetter(4, O) returns ${resultO4}, not ${Const.OK}`) &&
            this.verify((resultDelete1 === Const.OK), `playDelete(1) returns ${resultDelete1}, not ${Const.OK}`) &&
            this.verify((resultR4Genius === Const.GENIUS_MOVE), `playLetter(4, R) returns ${resultR4Genius}, not ${Const.GENIUS_MOVE}`) &&
            this.verify((resultP1 === Const.OK), `playLetter(1, P) returns ${resultP1}, not ${Const.OK}`) &&
            this.verify((shareString === expectedShareString), `sharestring: expected '${expectedShareString}', got '${shareString}'`) &&
            this.success();
        this.runNextTest();
    }

    cookieRestartTest() {
        this.logDebug("new window should be open; saving cookies via new window", "test");
        var testObj = new TestClassForCookie();
        testObj.nums.push(3);
        testObj.nums.push(5);
        testObj.field = "hello";
        Cookie.saveJson(Cookie.TEST_OBJ, testObj, this.getNewAppWindow());
        Cookie.save(Cookie.TEST_INT, 42, this.getNewAppWindow());
        Cookie.save(Cookie.TEST_BOOL, true, this.getNewAppWindow());

        // now close the window,
        this.closeNewAppWindow();
        this.openTheTestAppWindow();
        // and then wait for the window and finish the test ...
        this.waitForAppDisplayThenRunFunc(this.finishCookieRestartTest);
    }

    finishCookieRestartTest() {
        // need to set the test testName here for recording results
        this.testName = "CookieRestart";
        this.logDebug("new window should be re-opened; restoring values via cookies in new window", "test");
        var testIntRestored = Cookie.getInt(Cookie.TEST_INT, this.getNewAppWindow());
        var testBoolRestored = Cookie.getBoolean(Cookie.TEST_BOOL, this.getNewAppWindow());
        var testObjRestored = Cookie.getJsonOrElse(Cookie.TEST_OBJ, null, this.getNewAppWindow());
        this.verify((testIntRestored == 42), `testIntRestored is ${testIntRestored}, not 42`) &&
            this.verify(testBoolRestored, `testBoolRestored is ${testBoolRestored}, not true`) &&
            this.verify((testObjRestored.nums.length == 2), `testObjRestored.length is ${testObjRestored.length}, not 2`) &&
            this.verify((testObjRestored.nums[0] == 3), `testObjRestored[0]is ${testObjRestored[0]}, not 3`) &&
            this.verify((testObjRestored.nums[1] == 5), `testObjRestored[1]is ${testObjRestored[1]}, not 5`) &&
            this.verify((testObjRestored.field == "hello"), `testObjRestored.field is '${testObjRestored.field}', not hello`) &&
            this.success();
        Cookie.clearNonDebugCookies();
        this.runNextTest();
    }

    closeNewAppWindow() {
        if (this.getNewAppWindow()) {
            this.getNewAppWindow().close();
            this.newWindow = null;
        }
    }

    dailyGameNormalFinishStatsTest() {
        this.testName = "DailyGameNormalFinishStats";

        // The newly opened URL should be showing the test daily game by default;
        let gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;

        let srcElement = new MockEventSrcElement(gameDisplay);
        let mockEvent = new MockEvent(srcElement);

        // when opened with ?testing in the URL, the daily game will always
        // be SHORT -> POOR
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR

        //  SHORT -> SHOOT
        let unused = "";
        gameDisplay.letterPicker.saveLetterPosition(4);
        gameDisplay.letterPicker.selectionMade("O", unused);

        // SHOOT -> HOOT
        mockEvent.srcElement.setAttribute("deletionPosition", "1");
        gameDisplay.deletionClickCallback(mockEvent);

        // HOOT -> BOOT
        gameDisplay.letterPicker.saveLetterPosition(1);
        gameDisplay.letterPicker.selectionMade("B", unused);

        // BOOT -> BOOR
        gameDisplay.letterPicker.saveLetterPosition(4);
        gameDisplay.letterPicker.selectionMade("R", unused);

        // BOOR -> POOR
        gameDisplay.letterPicker.saveLetterPosition(1);
        gameDisplay.letterPicker.selectionMade("P", unused);

        // game is done.  Let's see what the saved stats and words played are:
        const appDisplay = this.getNewAppWindow().theAppDisplay;
        const statsDisplay = appDisplay.statsDisplay;

        // check the saved stats cookie
        let dailyStats = Cookie.getJsonOrElse(Cookie.DAILY_STATS, null);

        let expGP=1, actGP=dailyStats.gamesPlayed;
        let expGS=0, actGS=dailyStats.gamesShown;

        // open the stats window.  This should compute the shareString, start the countdown clock and update the dailyStats variable
        let statsSrcElement = new MockEventSrcElement(statsDisplay);
        let statsMockEvent = new MockEvent(statsSrcElement);
        statsDisplay.openAuxiliaryCallback(statsMockEvent);
        
        // the statsContainer is a GUI element with at least 3 children: Played, Completion %, and Shown
        let statsContainer = statsDisplay.statsContainer;

        // When statsContainer is logged, it sometimes logs as an object with 3 children, but other times as 
        // something that looks like formatted HTML.  This test relies on the object with children form.  The 
        // children have a field called innerText that is set to value\nlabel.  We verify this against the expected
        // inner text.

        this.logDebug("displayGameStatsTest: appDisplay:", appDisplay, "test");
        this.logDebug("displayGameStatsTest: statsDisplay", statsDisplay, "test");
        this.logDebug("displayGameStatsTest: dailyStats", dailyStats, "test");
        this.logDebug("displayGameStatsTest: statsContainer", statsContainer, "test");

        let expCL = 3;
        let actCL = statsContainer.children.length;

        let expPlayed = '1\nPlayed';
        let actPlayed = statsContainer.children[0].innerText;

        let expCompletion = '0.0\nCompletion %';
        let actCompletion = statsContainer.children[1].innerText;

        let expShown = '0\nShown';
        let actShown = statsContainer.children[2].innerText;

        // now, get the share string:
        let actShareString = statsDisplay.shareCallback(mockEvent);
        let expShareString = `WordChain #${Const.STATIC_DAILY_GAME_NUMBER} ⭐\n\n🟪🟪🟪🟪🟪\n🟩🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟪🟪🟪🟪`;

        this.verify(expGP==actGP, `expected dailyStats.gamesPlayed==${expGP}1, got ${actGP}`) &&
            this.verify(expGS==actGS, `expected dailyStats.gamesShown==${expGS}1, got ${actGS}`) &&
            this.verify(actCL==expCL, `expected statsContainer.children.length==${expCL}, got ${actCL}`) &&
            this.verify(actPlayed==expPlayed, `expected statsContainer.children.0.innerText==${expPlayed}, got ${actPlayed}`) &&
            this.verify(actCompletion==expCompletion, `expected statsContainer.children.1.innerText=='${expCompletion}', got '${actCompletion}'`) &&
            this.verify(actShown==expShown, `expected statsContainer.children.2.innerText=='${expShown}', got '${actShown}'`) &&
            this.verify(actShareString==expShareString, `expected share string=='${expShareString}', got '${actShareString}'`) &&
            this.success();

        this.runNextTest();
    }

    dailyGameOneMistakeShareTest() {
        this.testName = "DailyGameOneMistakeShare";

        // The newly opened URL should be showing the test daily game by default;
        let gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;

        let srcElement = new MockEventSrcElement(gameDisplay);
        let mockEvent = new MockEvent(srcElement);

        // when opened with ?testing in the URL, the daily game will always
        // be SHORT -> POOR
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR

        //  SHORT -> SHOOT
        let unused = "";
        gameDisplay.letterPicker.saveLetterPosition(4);
        gameDisplay.letterPicker.selectionMade("O", unused);

        // SHOOT -> HOOT
        mockEvent.srcElement.setAttribute("deletionPosition", "1");
        gameDisplay.deletionClickCallback(mockEvent);

        // HOOT -> BOOT
        gameDisplay.letterPicker.saveLetterPosition(1);
        gameDisplay.letterPicker.selectionMade("B", unused);

        // BOOT -> BOOK  D'OH wrong move
        gameDisplay.letterPicker.saveLetterPosition(4);
        gameDisplay.letterPicker.selectionMade("K", unused);

        // BOOK -> BOOR
        gameDisplay.letterPicker.saveLetterPosition(4);
        gameDisplay.letterPicker.selectionMade("R", unused);

        // BOOR -> POOR
        gameDisplay.letterPicker.saveLetterPosition(1);
        gameDisplay.letterPicker.selectionMade("P", unused);

        // game is done.  Let's see what the saved stats and words played are:
        const appDisplay = this.getNewAppWindow().theAppDisplay;
        const statsDisplay = appDisplay.statsDisplay;

        let statsSrcElement = new MockEventSrcElement(statsDisplay);
        let statsMockEvent = new MockEvent(statsSrcElement);
        statsDisplay.openAuxiliaryCallback(statsMockEvent);
        
        //  get the share string:
        let actShareString = statsDisplay.shareCallback(mockEvent);
        let expShareString = `WordChain #${Const.STATIC_DAILY_GAME_NUMBER} 1️⃣\n\n🟪🟪🟪🟪🟪\n🟩🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟥🟥🟥🟥\n🟩🟩🟩🟩\n🟪🟪🟪🟪`;

        this.verify(actShareString==expShareString, `expected share string=='${expShareString}', got '${actShareString}'`) &&
            this.success();

        this.runNextTest();
    }

    dailyGameTooManyMistakesShareTest() {
        this.testName = "DailyGameTooManyMistakesShare";

        // The newly opened URL should be showing the test daily game by default;
        let gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;
        let game = gameDisplay.game;

        let srcElement = new MockEventSrcElement(gameDisplay);
        let mockEvent = new MockEvent(srcElement);

        // when opened with ?testing in the URL, the daily game will always
        // be SHORT -> POOR
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR

        //  SHORT -> SHOOT
        let unused = "";
        gameDisplay.letterPicker.saveLetterPosition(4);
        gameDisplay.letterPicker.selectionMade("O", unused);

        // SHOOT -> HOOT
        mockEvent.srcElement.setAttribute("deletionPosition", "1");
        gameDisplay.deletionClickCallback(mockEvent);

        // HOOT -> BOOT
        gameDisplay.letterPicker.saveLetterPosition(1);
        gameDisplay.letterPicker.selectionMade("B", unused);

        // BOOT -> BOOK  D'OH wrong move 1
        gameDisplay.letterPicker.saveLetterPosition(4);
        gameDisplay.letterPicker.selectionMade("K", unused);

        // BOOK -> BOOB  D'OH wrong move 2
        gameDisplay.letterPicker.saveLetterPosition(4);
        gameDisplay.letterPicker.selectionMade("B", unused);

        // BOOB -> BOOT  D'OH wrong move 3
        gameDisplay.letterPicker.saveLetterPosition(4);
        gameDisplay.letterPicker.selectionMade("T", unused);

        // BOOT -> BOOK  D'OH wrong move 4
        gameDisplay.letterPicker.saveLetterPosition(4);
        gameDisplay.letterPicker.selectionMade("K", unused);

        this.verify(!game.isOver(), "after 4 wrong moves, game should not be over!");

        // BOOK -> BOOT  D'OH wrong move 5
        gameDisplay.letterPicker.saveLetterPosition(4);
        gameDisplay.letterPicker.selectionMade("T", unused);

        // game should be over if Const.TOO_MANY_WRONG_MOVES is 5
        this.verify(game.isOver(), "after 5 wrong moves, game is not over!");

/*
TODO - what if these are played after the game is over?  They should not be adding to the share or game state.
        // BOOT -> BOOR
        gameDisplay.letterPicker.saveLetterPosition(4);
        gameDisplay.letterPicker.selectionMade("R", unused);

        // BOOR -> POOR
        gameDisplay.letterPicker.saveLetterPosition(1);
        gameDisplay.letterPicker.selectionMade("P", unused);

*/
        // game is done.  Let's see what the saved stats and words played are:
        const appDisplay = this.getNewAppWindow().theAppDisplay;
        const statsDisplay = appDisplay.statsDisplay;

        // check the saved stats cookie
        let dailyStats = Cookie.getJsonOrElse(Cookie.DAILY_STATS, null);

        // open the stats window.  This should compute the shareString, start the countdown clock and update the dailyStats variable
        let statsSrcElement = new MockEventSrcElement(statsDisplay);
        let statsMockEvent = new MockEvent(statsSrcElement);
        statsDisplay.openAuxiliaryCallback(statsMockEvent);
        
        //  get the share string.  Note that after the final mistake, no more words are shown (unplayed) leading to the target.
        let actShareString = statsDisplay.shareCallback(mockEvent);
        let expShareString = `WordChain #${Const.STATIC_DAILY_GAME_NUMBER} 😖\n\n🟪🟪🟪🟪🟪\n🟩🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟥🟥🟥🟥\n🟥🟥🟥🟥\n🟥🟥🟥🟥\n🟥🟥🟥🟥\n🟥🟥🟥🟥\n🟪🟪🟪🟪`;

        this.verify(actShareString==expShareString, `expected share string=='${expShareString}', got '${actShareString}'`) &&
            this.success();

        this.runNextTest();
    }

    dailyGameRestartTest() {
        // The newly opened URL should be showing the daily game by default;
        let gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;

        let srcElement = new MockEventSrcElement(gameDisplay);
        let mockEvent = new MockEvent(srcElement);

        // when opened with ?testing in the URL, the daily game will always
        // be SHORT -> POOR
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR

        // play two moves, then close and try to restore ...
        //  SHORT -> SHOOT
        let unused = "";
        gameDisplay.letterPicker.saveLetterPosition(4);
        gameDisplay.letterPicker.selectionMade("O", unused);

        // SHOOT -> HOOT
        mockEvent.srcElement.setAttribute("deletionPosition", "1");
        gameDisplay.deletionClickCallback(mockEvent);

        // close the game window
        this.getNewAppWindow().close();

        // and re-open it, without the testing suffix which forces a new static daily game.
        const useTestingURL = false;
        this.openTheTestAppWindow(useTestingURL);
        this.waitForAppDisplayThenRunFunc(this.continueRestoreGameTest);
    }

    // called after first restart in the middle of the game.
    continueRestoreGameTest() {
        // we should be running the daily game SHORT -> POOR with SHOOT, HOOT already played.
        this.testName = "DailyGameRestart";
        const gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;
        const game = gameDisplay.game;
        const di = game.getDisplayInstructions();
        this.verify((di.length == 6), `expected 6 display instructions after restore, got ${di.length}`) &&
        this.verify((di[0].toStr() === "(played,word:SHORT,moveRating:ok)"), `instruction[0] is ${di[0].toStr()}`) &&
        this.verify((di[1].toStr() === "(played,word:SHOOT,moveRating:ok)"), `instruction[1] is ${di[1].toStr()}`) &&
        this.verify((di[2].toStr() === "(change,word:HOOT,changePosition:1)"), `instruction[2] is ${di[2].toStr()}`) &&
        this.verify((di[3].toStr() === "(future,word:BOOT,changePosition:4)"), `instruction[3] is ${di[3].toStr()}`) &&
        this.verify((di[4].toStr() === "(future,word:BOOR,changePosition:1)"), `instruction[4] is ${di[4].toStr()}`) &&
        this.verify((di[5].toStr() === "(target,word:POOR)"), `instruction[5] is ${di[5].toStr()}`);

        // finish the game. ( ... BOOT BOOR POOR)
        const unused = "";
        gameDisplay.letterPicker.saveLetterPosition(1);
        const playedB = gameDisplay.letterPicker.selectionMade("B", unused);
        gameDisplay.letterPicker.saveLetterPosition(4);
        const playedR = gameDisplay.letterPicker.selectionMade("R", unused);
        gameDisplay.letterPicker.saveLetterPosition(1);
        const playedP = gameDisplay.letterPicker.selectionMade("P", unused);

        this.verify((playedB == Const.OK), `played B, got ${playedB}, not `, Const.OK) &&
        this.verify((playedR == Const.OK), `played R, got ${playedR}, not `, Const.OK) &&
        this.verify((playedP == Const.OK), `played P, got ${playedP}, not `, Const.OK); 

        // .. and close and re-open it after it is solved
        const useTestingURL = false;
        this.openTheTestAppWindow(useTestingURL);
        this.waitForAppDisplayThenRunFunc(this.finishRestoreGameTest);
    }

    finishRestoreGameTest() {
        // game should be done; stats should be saved.
        const gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;
        const game = gameDisplay.game;
        Const.GL_DEBUG && this.logDebug("restored daily game after finishing it; display instructions are: ",
                game.getDisplayInstructions(), "test");
        this.verify (game.isWinner(), "Expected gameisWinner() true, got: ", game.isWinner()) &&
            this.success();
        Cookie.clearNonDebugCookies();
        this.runNextTest();
    }

    openTheTestAppWindow(useTestingURL=true) {
        let suffix = "";
        if (useTestingURL) {
            suffix = "?testing";
        }
        this.newWindow = window.open('/wordchain/docs/html/WordChain.html' + suffix, 'AppDisplayTest', 'width=600,height=800');
        // pass our debug settings to the child window
        Cookie.save(Cookie.DEBUG, Cookie.get(Cookie.DEBUG), this.getNewAppWindow());
        // set the child's console to our console.
        this.newWindow.console = console;
        /*

        TODO - this sometimes cause the browser share code to fail with console error:

         NotAllowedError: Failed to execute 'share' on 'Navigator': Must be handling a user gesture to perform a share request.
    at StatsDisplay.shareCallback (/wordchain/docs/javascript/StatsDisplay.js:99:27)
    at Test.geniusMoveAndShareTest (Test.js:834:40)
    at Test.waitForAppDisplayThenRunFunc (Test.js:992:13)

        BUT, the share string is calculated correctly and the test passes.  What fails is putting the
        share-string into the browser itself during testing.
        */
    }

    runAppTests() {
        this.appTestList = [
            this.dailyGameNormalFinishStatsTest,
            this.dailyGameOneMistakeShareTest,
            this.dailyGameTooManyMistakesShareTest,
            this.geniusMoveAndShareTest,
            this.cookieRestartTest,
            this.dailyGameRestartTest,
            this.practiceGameTest,
        ];
        this.needToWaitForAsyncResults = true;
        this.runNextTest();
    }

    runNextTest() {
        var testFunc = this.appTestList.shift();
        this.logDebug("runNextTest() testFunc=", testFunc, "test");
        if (testFunc) {
            // clear our own cookies
            Cookie.clearNonDebugCookies();

            // close and re-open the test App window
            this.closeNewAppWindow();
            this.openTheTestAppWindow();

            // and then wait for the window and begin the next test ...
            this.waitForAppDisplayThenRunFunc(testFunc);
        } else {
            this.closeNewAppWindow();
            this.needToWaitForAsyncResults = false;
        }
    }

    getNewAppWindow() {
        return this.newWindow;
    }

    // We get access to the AppDisplay for the game in the new window through the window's attribute 'theAppDisplay.'
    waitForAppDisplayThenRunFunc(func) {
        if (this.getNewAppWindow() && this.getNewAppWindow().theAppDisplayIsReady) {
            this.logDebug("new window AppDisplay is ready; calling func now.", "test");
            // How to call this class's member function 'func' with 'this' properly set.
            var boundFunc = func.bind(this);
            boundFunc();
        } else {
            const sleepTime = 1000;
            this.logDebug("pausing ", sleepTime, " for new window AppDisplay to be ready.");
            inTheFuture(sleepTime).then( (foo=this) => { foo.waitForAppDisplayThenRunFunc(func);});
        }
    }

    getResultsAreReady() {
        return ! this.needToWaitForAsyncResults;
    }

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

        ElementUtilities.setButtonCallback(button, this, this.findCallback);

    }

    findCallback(event) {

        const word = ElementUtilities.getElementValue("someWord").toUpperCase();
        var result = `${word} in common dictionary: `;

        if (this.fullDict.isWord(word)) {
            result += "Y";
        } else {
            result += "N";
        }
        result += `; in scrabble dictionary: `;
        if (this.scrabbleDict.isWord(word)) {
            result += "Y";
        } else {
            result += "N";
        }

        const nextWords = [...this.fullDict.findNextWords(word)];
        result += `; ${nextWords.length} words from ${word}: ${nextWords.join(",")}`;
        ElementUtilities.setElementHTML("findAnswer", result);
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

        ElementUtilities.setButtonCallback(button, this, this.solveCallback);
    }

    solveCallback(event) {

        const startWord = ElementUtilities.getElementValue("solverStartWord").toUpperCase();

        if (! this.fullDict.isWord(startWord)) {
            alert("Starting word is empty or not a word");
            return;
        }

        const targetWord = ElementUtilities.getElementValue("solverTargetWord").toUpperCase();
        if (! this.fullDict.isWord(targetWord)) {
            alert("Target word is empty or not a word");
            return;
        }

        const start = Date.now();
        const solution = Solver.solve(this.fullDict, startWord, targetWord);
        const end = Date.now();
        solution.calculateDifficulty(this.fullDict);
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

        ElementUtilities.setButtonCallback(button, this, this.puzzleFinderFindCallback);
    }

    puzzleFinderFindCallback(event) {
        const startWord = ElementUtilities.getElementValue("puzzleFinderStartWord");

        if (! this.fullDict.isWord(startWord)) {
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
            Solver.findPuzzles(this.fullDict, startWord, targetWordLen, reqWordLen1, reqWordLen2, minSteps, maxSteps, minDifficulty)
            .map(puzzle => `${puzzle.getTarget()}:${puzzle.difficulty}`);
        goodTargetsWithDifficulty.sort();

        ElementUtilities.setElementHTML("puzzleFinderAnswer", goodTargetsWithDifficulty.join(","));
    }
}

Test.singleton().display();

export { Test };
