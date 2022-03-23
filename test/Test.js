import { BaseLogger } from '../docs/javascript/BaseLogger.js';
import { WordChainDict } from '../docs/javascript/WordChainDict.js';
import { Solver, Solution } from '../docs/javascript/Solver.js';
import { Game } from '../docs/javascript/Game.js';
import { ElementUtilities } from '../docs/javascript/ElementUtilities.js';

// Forwarding functions; see big comment in AppDisplay.js explaining how these came about.

function runTestsCallback() {
    Test.singleton().runTestsCallback();
}

function lookupCallback() {
    Test.singleton().lookupCallback();
}

function solveCallback() {
    Test.singleton().solveCallback();
}

// Singleton class Test.

class Test extends BaseLogger {
    static singletonObject = null;

    constructor() {
        super();

        this.name = "NOT SET";
        this.tinyList  = ["apple", "pear", "banana"];
        this.smallList = ["bad", "bade", "bald", "bat", "bate", "bid", "cad", "cat", "dog", "scad"]
        this.fullDict = new WordChainDict();
    }

    static singleton() {
        if (Test.singletonObject === null) {
            Test.singletonObject = new Test();
        }
        return Test.singletonObject;
    }

    display() {
        this.displayTestSuite();
        this.displayDictTest();
        this.displaySolverTest();
        ElementUtilities.addElement("hr");
    }

    addTitle(title) {
        ElementUtilities.addElement("hr");
        ElementUtilities.addElement("p");
        ElementUtilities.addElement("h2", {}, title);
        ElementUtilities.addElement("p");
    }

    /*
    ** Testing Framework
    */

    displayTestSuite() {
        this.addTitle("WordChain Test Suite");
        ElementUtilities.addElement("button", {id: "runTests"}, "Run Tests");
        ElementUtilities.addElement("p");
        ElementUtilities.addElement("label", {id: "testResults"}, "");
        ElementUtilities.addElement("p");

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

        // For some reason this did not work -- seems to be a timing issue;
        // fullDict.wordSet was not yet populated by the time getSize() was
        // called. Maybe could make this method asyc and do:
        // await new WordChainDict(), but creating it in the constructor
        // seemed to work. Then I just decided to use GLdictionary.
        //const fullDict = new WordChainDict();
        const dictSize = this.fullDict.getSize();
        const expectedDictSize = 16604;

        const catAdders = this.fullDict.findAdderWords("cat");
        const addersSize = catAdders.size;
        const expectedAddersSize = 9;

        const badeReplacements = this.fullDict.findAdderWords("bade");
        const replacementsSize = badeReplacements.size;
        const expectedReplacementsSize = 2;

        this.verify((dictSize == expectedDictSize), `full dictionary has ${dictSize} words; expected ${expectedDictSize}`) &&
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
        this.testSolverFastestDirection();
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
        const expectedWords = [ "taco", "tao", "tam", "lam", "lamb", "limb", "limbo", "bimbo" ];

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
    }

    testGameCorrectFirstWord() {
        this.name = "GameCorrectFirstWord";

        const smallDict = new WordChainDict(["bad", "bade", "bat", "bate", "cad", "cat", "dog", "scad"])
        const solution = Solver.fastSolve(smallDict, "scad", "bat");
        const game = new Game(smallDict, solution);

        const playResult = game.playWord("cad");
        this.verify((playResult === Game.OK), "Word played not OK") &&
            this.success();
    }

    testGameNotOneStep() {
        this.name = "GameNotOneStep";

        const smallDict = new WordChainDict(["bad", "bade", "bat", "bate", "cad", "cat", "dog", "scad"])
        const solution = Solver.fastSolve(smallDict, "scad", "bat");
        const game = new Game(smallDict, solution);

        const playResult = game.playWord("dog");
        this.verify((playResult === Game.NOT_ONE_STEP), "Word played not NOT_ONE_STEP") &&
            this.success();
    }

    testGameDifferentWordFromInitialSolution() {
        this.name = "GameDifferentWordFromInitialSolution";

        const smallDict = new WordChainDict(["bad", "bade", "bat", "bate", "cad", "cat", "dog", "scad"])
        const origSolution = Solver.fastSolve(smallDict, "bad", "cat");
        const game = new Game(smallDict, origSolution);
        const origStep2 = game.getKnownSolution().getWordByStep(2)

        // "bade" is not in the original solution (but we'll verify that below)..
        const playResult = game.playWord("bade");
        const knownStep1 = game.getKnownSolution().getWordByStep(1)
        const knownStep2 = game.getKnownSolution().getWordByStep(2)

        this.verify((playResult === Game.OK), "Word played not OK") &&
            this.verify((! origSolution.getWordSet().has('bade')), "Original solution has 'bade'") &&
            this.verify((knownStep1 === "bade"), `Known step 1 unexpected: ${knownStep1}`) &&
            this.verify((knownStep2 !== origStep2), `Known step 2 same as original: ${knownStep2}`) &&
            this.success();
    }

    testGameCompleteSmallDict() {
        this.name = "GameCompleteSmallDict";

        const smallDict = new WordChainDict(["bad", "bade", "bat", "bate", "cad", "cat", "dog", "scad"])
        const solution = Solver.fastSolve(smallDict, "bad", "scad");
        const game = new Game(smallDict, solution);

        const playResult1 = game.playWord("cad");
        const playResult2 = game.playWord("scad");

        this.verify((playResult1 === Game.OK), "Word 1 played not OK") &&
            this.verify((playResult2 === Game.OK), "Word 2 played not OK") &&
            this.verify(game.getSolutionInProgress().isSolved(), `Solution in progress is not solved`) &&
            this.success();
    }

    testGameCompleteFullDict() {
        const origSolution = Solver.fastSolve(this.fullDict, "bad", "word");
        const game = new Game(this.fullDict, origSolution);
        const origStep2 = game.getKnownSolution().getWordByStep(2)

        const playResult = game.playWord("cad");
        const knownStep1  = game.getKnownSolution().getWordByStep(1)
        const knownStep2  = game.getKnownSolution().getWordByStep(2)
        const inProgStep1 = game.getSolutionInProgress().getWordByStep(1)

        this.verify((playResult === Game.OK), "Word played not OK") &&
            this.verify((knownStep1 === "cad"), `Known step 1 unexpected: ${knownStep1}`) &&
            this.verify((inProgStep1 === "cad"), `In progress step 1 unexpected: ${inProgStep1}`) &&
            this.verify((knownStep2 !== origStep2), `Known step 2 same as original: ${knownStep2}`) &&
            this.success();
    }

    testGameSolutionCannotHavePlayedWord() {
        const origSolution = Solver.fastSolve(this.fullDict, "cat", "dog");
        const game = new Game(this.fullDict, origSolution);

        let playResult = game.playWord("cats")
        let wordsAfterFromWord = game.getKnownSolution().getWords().slice(1)

        this.verify((playResult === Game.OK), "No solution from 'cat, cats' to 'dog'") &&
            this.verify(! wordsAfterFromWord.includes("cat"), "Solution of 'cats' to 'dog' contains 'cat'") &&
            this.success();
    }

    /*
    ** Additional testing assets
    */

    // Dictionary testing

    displayDictTest() {
        this.addTitle("Dictionary Tester");
        ElementUtilities.addElement("label", {}, "word: ");
        ElementUtilities.addElement("input", {id: "someWord", type: "text"});
        ElementUtilities.addElement("p");
        ElementUtilities.addElement("button", {id: "lookup"}, "lookup");
        ElementUtilities.addElement("p");
        ElementUtilities.addElement("label", {id: "lookupAnswer"}, " Click the button to look up the word.");
        ElementUtilities.addElement("p");

        ElementUtilities.getElement("lookup").addEventListener("click", lookupCallback);
    }

    lookupCallback() {
        const word = ElementUtilities.getElementValue("someWord");
        if (! this.checkWord("someWord")) {
            alert(`${word} is not a word`);
            return;
        }

        const nextWords = [...this.dict.findNextWords(word)].join(", ");
        ElementUtilities.setElementHTML("lookupAnswer", `Words after ${word}: ${nextWords}`);
    }

    // Solver testing

    displaySolverTest() {
        this.addTitle("Solver Tester");
        ElementUtilities.addElement("label", {}, "Start word: ");
        ElementUtilities.addElement("input", {id: "solverStartWord", type: "text"});
        ElementUtilities.addElement("p");
        ElementUtilities.addElement("label", {}, "Target word: ");
        ElementUtilities.addElement("input", {id: "solverTargetWord", type: "text"}, "Target word:");
        ElementUtilities.addElement("p");
        ElementUtilities.addElement("button", {id: "solve"}, "Solve!");
        ElementUtilities.addElement("p");
        ElementUtilities.addElement("label", {id: "solveAnswer"}, "Click the button to see the chain.");
        ElementUtilities.addElement("p");

        ElementUtilities.getElement("solve").addEventListener("click", solveCallback);
    }

    solveCallback() {
        const startWord = this.checkWord("solverStartWord")
        if (! startWord) {
            alert("Starting word is empty or not a word");
            return;
        }

        const targetWord = this.checkWord("solverTargetWord")
        if (! targetWord) {
            alert("Target word is empty or not a word");
            return;
        }

        const solution = Solver.fastSolve(this.dict, startWord, targetWord);
        ElementUtilities.setElementHTML("solveAnswer", solution.toHtml());
    }
}

Test.singleton().display();

export { Test };
