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
        this.testSolverLongChain();
        this.testGameNotShortestSolutionBug();
        this.testSolverFastestDirection();
        this.testSolverReverseSearchNoSolution();
    }

    testSolverIdentitySequence() {
        this.name = "SolverIdentitySequence";
        const dict = new WordChainDict(["BAD", "BAT", "CAD", "CAT", "DOG"]);
        const solution = Solver.solve(dict, "BAT", "BAT");

        this.verify(solution.success(), `error in solving 'BAT' to 'BAT': ${solution.getError()}`) &&
            this.verify((solution.numSteps() === 0), "solution for 'BAT' to 'BAT' is not 0") &&
            this.verify((solution.getStart() === 'BAT'), "first word for 'BAT' to 'BAT' is not 'BAT'") &&
            this.verify((solution.getTarget() === 'BAT'), "last word for 'BAT' to 'BAT' is not 'BAT'") &&
            this.success();
    }

    testSolverOneStep() {
        this.name = "SolverOneStep"
        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);

        // Adder
        const solutionBadBade = Solver.solve(smallDict, "BAD", "BADE");
        // Remover
        const solutionBadeBad = Solver.solve(smallDict, "BADE", "BAD");
        // Replacer
        const solutionBatCat = Solver.solve(smallDict, "BAT", "CAT");
        // Nope
        const solutionNope = Solver.solve(smallDict, "BAT", "DOG");

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
        this.name = "SolverTwoStep"
        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);

        const solutionBatScad = Solver.solve(smallDict, "BAT", "SCAD");
        const solutionScadBat = Solver.solve(smallDict, "SCAD", "BAT");

        this.verify(solutionBatScad.success(), `error on 'BAT' to 'SCAD': ${solutionBatScad.getError()}`) &&
            this.verify(solutionScadBat.success(), `error on 'SCAD' to 'BAT': ${solutionScadBat.getError()}`) &&
            this.verify((solutionBatScad.numSteps() === 3), `expected 3 step for 'BAT' to 'SCAD': ${solutionBatScad.getSolutionSteps()}`) &&
            this.verify((solutionScadBat.numSteps() === 3), `expected 3 step for 'SCAD' to 'BAT': ${solutionScadBat.getSolutionSteps()}`) &&
            this.success();
    }

    testSolverLongChain() {
        this.name = "SolverLongChain";

        const solutionTacoBimbo = Solver.solve(this.fullDict, "TACO", "BIMBO");
        const foundWords = solutionTacoBimbo.getSolutionSteps().map((step)=>step.word);
        const expectedWords = [ "TACO", "TAO", "TAB", "LAB", "LAMB", "LIMB", "LIMBO", "BIMBO" ];

        this.verify(solutionTacoBimbo.success(), `error on 'TACO' to 'BIMBO': ${solutionTacoBimbo.getError()}`) &&
            this.verify((foundWords.toString() == expectedWords.toString()), `foundWords: ${foundWords} is not as expected: ${expectedWords}`) &&
            this.success();
    }


    testSolverFastestDirection() {
        this.name = "SolverFastestDirection";

        // This takes too long if the solver doesn't try to go from 'matzo'
        // to 'ball' because 'ball' has so many next words.
        const solutionMatzoBall = Solver.solve(this.fullDict, "MATZO", "BALL");
            this.verify((solutionMatzoBall.getError()=== "No solution"), `expected quick 'No solution' on 'MATZO' TO 'BALL': ${solutionMatzoBall.getError()}`) &&
            this.success();
    }

    testSolverReverseSearchNoSolution() {
        this.name = "SolverReverseSearchNoSolution";
        const triedReverseSearchNoSolution = Solver.solve(this.fullDict, "FROG", "ECHO");
        this.verify(!triedReverseSearchNoSolution.isSolved(), `expected 'No solution' on 'FROG' to 'ECHO'`) &&
        this.success();
    }

    /*
    ** Game tests
    */

    runGameTests() {
        this.testGameCorrectFirstWord();
        this.testGameDeleteWrongLetter();
        this.testGameDeleteBadPosition();
        this.testGameDifferentWordFromInitialSolution();
        this.testGameCompleteSmallDict();
        this.testGameCompleteFullDict();
        this.testGameDisplayInstructions();
        this.testGameDisplayInstructionsMistakes();
        this.testGameDisplayInstructionsDifferentPath();
    }

    testGameCorrectFirstWord() {
        this.name = "GameCorrectFirstWord";

        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);
        const steps = [];
        const game = new Game("SCAD", "BAT", steps, smallDict);

        const playResult = game.playDelete(1);
        this.verify((playResult === Const.OK), "Word played not OK") &&
            this.success();
    }

    testGameDeleteWrongLetter() {
        this.name = "GameDeleteLetterNotAWord";

        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);
        const steps = [];
        const game = new Game("SCAD", "BAT", steps, smallDict);

        const playResult = game.playDelete(3);
        this.verify((playResult === Const.NOT_A_WORD), "NOT_A_WORD after deleting wrong letter") &&
            this.success();
    }

    testGameDeleteBadPosition() {
        this.name = "GameDeleteBadPosition";

        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);
        const steps = [];
        const game = new Game("SCAD", "BAT", steps, smallDict);

        const playResult = game.playDelete(6);
        this.verify((playResult === Const.BAD_POSITION), "Delete attempted at bad position") &&
            this.success();
    }


    testGameDifferentWordFromInitialSolution() {
        this.name = "GameDifferentWordFromInitialSolution";

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
        this.name = "GameCompleteSmallDict";

        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);
        const solution = Solver.solve(smallDict, "BAD", "SCAD");
        const isPlayed = true;
        const isCorrect = true;
        const fullSolutionAsTuples = solution.getSolutionSteps().map((step)=>[step.word, isPlayed, isCorrect]);
        const game = new Game("BAD", "SCAD", fullSolutionAsTuples, smallDict);

        this.verify(game.isOver(), "Game initialized with full solution is not solved") &&
            this.success();
    }

    testGameCompleteFullDict() {
        this.name = "GameCompleteFullDict";
        const solution = Solver.solve(this.fullDict, "bad", "word");
        const isPlayed = true;
        const isCorrect = true;
        const fullSolutionAsTuples = solution.getSolutionSteps().map((step)=>[step.word, isPlayed, isCorrect]);
        const game = new Game("bad", "word", fullSolutionAsTuples, this.fullDict);

        this.verify(game.isOver(), "Game initialized with full solution is not solved") &&
            this.success();
    }

    testGameNotShortestSolutionBug() {
        this.name = "GameNotShortestSolutionBug";
        const solution = Solver.solve(this.fullDict, "BROKEN", "BAKED");
        const foundWords = solution.getSolutionSteps().map((step)=>step.word);
        const expectedWords = [ "BROKEN", "BROKE", "BRAKE", "BAKE", "BAKED" ];
        this.verify(solution.success(), `error on 'BROKEN' to 'BAKED': ${solution.getError()}`) &&
            this.verify((foundWords.toString() == expectedWords.toString()), `solution: ${foundWords} is not expected: ${expectedWords}`) &&
            this.success();
    }

    testGameDisplayInstructions() {
        this.name = "GameDisplayInstructions";
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
        this.verify((afterDeleteInstructions[0].toStr() === "(played,word:SCAD,wasCorrect:true)"), `after delete instruction[0] is ${afterDeleteInstructions[0].toStr()}`) &&
        this.verify((afterDeleteInstructions[1].toStr() === "(change,word:CAD,changePosition:1)"), `after delete instruction[1] is ${afterDeleteInstructions[1].toStr()}`) &&
        this.verify((afterDeleteInstructions[2].toStr() === "(future,word:BAD,changePosition:3)"), `after delete instruction[2] is ${afterDeleteInstructions[2].toStr()}`) &&
        this.verify((afterDeleteInstructions[3].toStr() === "(target,word:BAT)"), `after delete instruction[3] is ${afterDeleteInstructions[3].toStr()}`) &&
        this.verify((playLetterBResult === Const.OK), "playLetterBResult(1) not OK") &&
        this.verify((afterPlayLetterBInstructions[0].toStr() === "(played,word:SCAD,wasCorrect:true)"), `after delete instruction[0] is ${afterPlayLetterBInstructions[0].toStr()}`) &&
        this.verify((afterPlayLetterBInstructions[1].toStr() === "(played,word:CAD,wasCorrect:true)"), `after delete instruction[1] is ${afterPlayLetterBInstructions[1].toStr()}`) &&
        this.verify((afterPlayLetterBInstructions[2].toStr() === "(change,word:BAD,changePosition:3)"), `after delete instruction[2] is ${afterPlayLetterBInstructions[2].toStr()}`) &&
        this.verify((afterPlayLetterBInstructions[3].toStr() === "(target,word:BAT)"), `after delete instruction[3] is ${afterPlayLetterBInstructions[3].toStr()}`) &&
        this.verify((playLetterTResult === Const.OK), "playLetterTResult(1) not OK") &&
        this.verify((afterPlayLetterTInstructions[0].toStr() === "(played,word:SCAD,wasCorrect:true)"), `after delete instruction[0] is ${afterPlayLetterTInstructions[0].toStr()}`) &&
        this.verify((afterPlayLetterTInstructions[1].toStr() === "(played,word:CAD,wasCorrect:true)"), `after delete instruction[1] is ${afterPlayLetterTInstructions[1].toStr()}`) &&
        this.verify((afterPlayLetterTInstructions[2].toStr() === "(played,word:BAD,wasCorrect:true)"), `after delete instruction[2] is ${afterPlayLetterTInstructions[2].toStr()}`) &&
        this.verify((afterPlayLetterTInstructions[3].toStr() === "(target,word:BAT)"), `after delete instruction[3] is ${afterPlayLetterTInstructions[3].toStr()}`) &&
            this.success();
    }

    testGameDisplayInstructionsMistakes() {
        this.name = "GameDisplayInstructionsMistakes";
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
        this.verify((cadToCarInstructions[0].toStr() === "(played,word:SCAD,wasCorrect:true)"), `after playing R, instruction[0] is ${cadToCarInstructions[0].toStr()}`) &&
        this.verify((cadToCarInstructions[1].toStr() === "(played,word:CAD,wasCorrect:true)"), `after playing R, instruction[1] is ${cadToCarInstructions[1].toStr()}`) &&
        this.verify((cadToCarInstructions[2].toStr() === "(change,word:CAR,changePosition:3)"), `after playing R, instruction[1] is ${cadToCarInstructions[2].toStr()}`) &&
        this.verify((cadToCarInstructions[3].toStr() === "(future,word:CAT,changePosition:1)"), `after playing R, instruction[2] is ${cadToCarInstructions[3].toStr()}`) &&
        this.verify((cadToCarInstructions[4].toStr() === "(target,word:BAT)"), `after playing R, instruction[3] is ${cadToCarInstructions[4].toStr()}`) &&
            this.success();
    }

    testGameDisplayInstructionsDifferentPath() {
        this.name = "GameDisplayInstructionsDifferentPath";
        const steps = [];
        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "CAR", "DOG", "SCAD"]);
        const game = new Game("SCAD", "BAT", steps, smallDict); // shortest solution is SCAD,CAD,BAD,BAT or SCAD,CAD,CAT,BAT but via BAD is earlier

        game.playDelete(1); // SCAD to CAD

        const cadToCatResult = game.playLetter(3,"T"); // CAD TO CAT
        const cadToCatInstructions = game.getDisplayInstructions(); // SCAD,CAD,CAT,BAT

        this.verify((cadToCatResult === Const.OK), `playLetter(3,T) expected ${Const.OK}, got ${cadToCatResult}`) &&
        this.verify((cadToCatInstructions[0].toStr() === "(played,word:SCAD,wasCorrect:true)"), `after playing R, instruction[0] is ${cadToCatInstructions[0].toStr()}`) &&
        this.verify((cadToCatInstructions[1].toStr() === "(played,word:CAD,wasCorrect:true)"), `after playing R, instruction[1] is ${cadToCatInstructions[1].toStr()}`) &&
        this.verify((cadToCatInstructions[2].toStr() === "(change,word:CAT,changePosition:1)"), `after playing R, instruction[2] is ${cadToCatInstructions[3].toStr()}`) &&
        this.verify((cadToCatInstructions[3].toStr() === "(target,word:BAT)"), `after playing R, instruction[3] is ${cadToCatInstructions[3].toStr()}`) &&
            this.success();
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
