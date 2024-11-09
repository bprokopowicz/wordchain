import { BaseLogger } from '../docs/javascript/BaseLogger.js';
import { WordChainDict, globalWordList, scrabbleWordList } from '../docs/javascript/WordChainDict.js';
import { Solver, Solution } from '../docs/javascript/Solver.js';
import { Game } from '../docs/javascript/Game.js';
import { Cookie } from '../docs/javascript/Cookie.js';
import { Persistence } from '../docs/javascript/Persistence.js';
import { DailyGameDisplay } from '../docs/javascript/DailyGameDisplay.js'
import { PracticeGameDisplay } from '../docs/javascript/PracticeGameDisplay.js'
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
// The only attributes we use in this way are the additionPosition and deletionPosition
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

        this.uestName = "NOT SET";
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
    ** Overall Testing Framework
    */

    displayTestSuite() {
        let debugWarning = "";
        if (Const.GL_DEBUG) {
            debugWarning = "  Set Const.GL_DEBUG=false for performance";
        }
        this.addTitle("WordChain Test Suite - allow 30+ seconds to complete; browser popups must be allowed." + debugWarning);

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

        // we may need to pause before checking results because App Tests run separately
        let boundFunc = this.showResultsIfReadyThenStop.bind(this);
        this.resultsIntervalId = window.setInterval(boundFunc, 500);
        this.testingInProgress = true;
    }

    showResults() {
        let results = "";

        results += `<br>Success count: ${this.successCount}<br>`;
        results += `Failure count: ${this.failureCount}<br>`;
        results += `Total assertions verified: ${this.totalAssertionCount}<p>`;
        results += this.messages.join("<br>");

        ElementUtilities.setElementHTML("testResults", results);
    }

    success(testName) {
        this.messages.push(`${this.testName} (${this.testAssertionCount}) succeeded.`);
        this.testAssertionCount = 0;
        this.successCount += 1;
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

    // this function re-executes itself every 'sleepTime' milliseconds from the beginning 
    // of testing until the results are ready.
    showResultsIfReadyThenStop() {
        this.logDebug("checking if results are ready", "test");
        if (this.getResultsAreReady()) {
            this.testingInProgress = false;
            this.logDebug("results are ready - show them.", "test");
            this.showResults();
            window.clearInterval(this.resultsIntervalId);
            console.log(`Testing took ${Date.now() - this.testingStartTime} ms.`);
        }  
    }

    /*
    ** App Testing Framework
    */

    // This map can be passed to openTheTestAppWindow or reOpenTheTestAppWindow to set the 
    // WordChain epoch manually.

    static EpochTwoDaysAgo = new Map([ [Const.QUERY_STRING_EPOCH_DAYS_AGO, "2"] ]);
    static EpochThreeDaysAgo = new Map([ [Const.QUERY_STRING_EPOCH_DAYS_AGO, "3"] ]);

    closeNewAppWindow() {
        if (this.getNewAppWindow()) {
            this.getNewAppWindow().close();
            this.newWindow = null;
        }
    }

    getNewAppWindow() {
        return this.newWindow;
    }

    getResultsAreReady() {
        return ! this.needToWaitForAsyncResults;
    }

    openTheTestAppWindow(queryVars=new Map()) {
        let suffix = "";
        function appendKeyVal(val, key, map) {
            if (suffix == "") {
                suffix="?";
            } else {
                suffix += "&";
            }
            if (val.length > 0) {
                suffix += `${key}=${val}`;
            } else {
                suffix += key;
            }
        }
        queryVars.forEach( appendKeyVal );
        let url = '/wordchain/docs/html/WordChain.html' + suffix;
        this.logDebug("!! Opening window at ", url, "test");

        // Setting the width/height is what makes a separate window open
        // instead of a new browser tab. HOWEVER, in iOS/Chrome, the appearance
        // is a new tab. In iOS/Safari this doesn't work -- we get failures to
        // download some source files and we don't know why!
        let windowFeatures = "width=300,height=400";
        let windowName = "AppDisplayTest";
        //this.newWindow = window.open(url, windowName, windowFeatures);
        this.newWindow = open(url, windowName, windowFeatures);
        if (this.newWindow === null)
        {
            // Will be logged in waitForAppDisplayThenRunFunc. 
            this.logDebug("!! this.newWindow is null", "test");
            return;
        } 
        // set the child's console to our console. This doesn't work reliably, especially when the child window has a crashing bug.
        this.newWindow.console = console;
    }

    runNextAppTest() {
        let lastAppTestStartTime = this.appTestStartTime;
        this.appTestStartTime = Date.now();
        if (lastAppTestStartTime != null) {
            this.logDebug(this.testName, " took ", this.appTestStartTime - lastAppTestStartTime, " ms", "test");
        }
        // before running any test, which might be multi-game, clear the multi-game counter and results accumulator
        this.multiGameCountdown = null;
        this.multiGameResults = null;
        let testFunc = this.appTestList.shift();
        if (testFunc) {
            let shortFuncName = testFunc.toString().split(' ')[0];
            this.logDebug("!! runNextAppTest() testFunc=", shortFuncName, "test");
            // clear cookies and reopen the window in testing mode 
            const clearCookies = true;
            this.reOpenTheTestAppWindow(clearCookies, Test.EpochTwoDaysAgo);
            // and then wait for the window and begin the next test ...
            this.waitForAppDisplayThenRunFunc(testFunc);
        } else {
            this.closeNewAppWindow();
            this.needToWaitForAsyncResults = false;
        }
    }

    reOpenTheTestAppWindow(clearCookies, queryVars) {
        // clear our own cookies
        if (clearCookies) {
            Cookie.clearNonDebugCookies();
        }

        // close and re-open the test App window
        this.closeNewAppWindow();
        this.openTheTestAppWindow(queryVars);
    }

    // We get access to the AppDisplay for the game in the new window through the window's attribute 'theAppDisplay.'
    // If the new window is ready (it has set theAppDisplayIsReady) we run 'func' bound to 'this'.  If not,
    // we wait and check again ...

    waitForAppDisplayThenRunFunc(func, isRewait=false) {
        let shortFuncName = func.toString().split(' ')[0];
        if (isRewait) {
            this.logDebug("!! re-checking if new AppDisplay is ready after wait time: ", Date.now() - this.inTheFutureSetAt, " ms.", "test");
        } else {
            this.logDebug("!! first checking if new AppDisplay is ready.", "test");
        }

        let newWindow = this.getNewAppWindow();
        if (newWindow === null) {
            this.testName="in between tests";
            this.verify(false, `new app window is null waiting for:  ${shortFuncName}`);
            console.error("new app window is null - tests cannot continue.");
            this.needToWaitForAsyncResults = false;
            return;
        }

        if ((newWindow.localStorage != null) && newWindow.theAppDisplayIsReady) {
            this.logDebug("!! new window AppDisplay is ready; calling: ",  shortFuncName, "test");
            this.inTheFutureSetAt = null;
            // How to call this class's member function 'func' with 'this' properly set.
            let boundFunc = func.bind(this);
            boundFunc();
        } else {
            const sleepTime = 200;
            this.logDebug("!! Not ready - waiting ", sleepTime, " ms for new AppDisplay.", "test");
            const isRewaitP = true;
            let boundFunc = this.waitForAppDisplayThenRunFunc.bind(this, func, isRewaitP);
            this.inTheFutureSetAt = Date.now();
            inTheFuture(sleepTime).then(boundFunc);
        }
    }

    // playLettter, deleteLetter, and insertLetter all require the attribute this.gameDisplay to be set to
    // the active GameDisplay (Practice or Daily).

    playLetter(position, letter) {
        const unused = "";
        this.gameDisplay.letterPicker.saveLetterPosition(position);
        let rc = this.gameDisplay.letterPicker.selectionMade(letter, unused);
        this.logDebug("playLetter(", position, ",", letter, ") returns: ", rc, "test");
        return rc;
    }

    deleteLetter(position) {
        const srcElement = new MockEventSrcElement(this.gameDisplay);
        const mockEvent = new MockEvent(srcElement);
        mockEvent.srcElement.setAttribute("deletionPosition", position.toString());
        let rc = this.gameDisplay.deletionClickCallback(mockEvent);
        this.logDebug("deleteLetter(", position, ") returns: ", rc, "test");
        return rc;
    }

    insertLetter(position, letter) {
        const srcElement = new MockEventSrcElement(this.gameDisplay);
        const mockEvent = new MockEvent(srcElement);
        mockEvent.srcElement.setAttribute("additionPosition", position.toString());
        let clickResult = this.gameDisplay.additionClickCallback(mockEvent);
        let playResult = this.playLetter(position+1, letter);
        this.logDebug("insertLetter(", position, ",", letter, ") returns: ", clickResult, " then ", playResult,  "test");
        return playResult;
    }
         
    // this plays the known daily game for day 2.  No status of whether or not it worked.  It is useful for 
    // tests that need multiple game instances to test stats.
    // 

    playTheCannedDailyGameOnce() {
        this.gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;

        // SHORT -> POOR
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR

        this.playLetter(4, "O"); // SHORT -> SHOOT
        this.deleteLetter(1);    // SHOOT -> HOOT
        this.playLetter(1, "B"); // HOOT -> BOOT
        this.playLetter(4, "R"); // BOOT -> BOOR
        this.playLetter(1, "P"); // BOOR -> POOR
    }

    // compares the current stats cookie and stats screen content with expected and calculated values.
    // Also, asserts that gamesPlayed >= gamesCompleted+gamesShown+gamesFailed

    verifyStats(expDailyStats) {

        const appDisplay = this.getNewAppWindow().theAppDisplay;
        const statsDisplay = appDisplay.statsDisplay;

        // get the saved stats cookie
        let dailyStats = Persistence.getDailyStatsOrElse(null);
        this.logDebug("verifyStats() dailyStats", dailyStats, "test");

        // open the stats window.  This should compute the shareString and start the countdown clock 
        let statsSrcElement = new MockEventSrcElement(statsDisplay);
        let statsMockEvent = new MockEvent(statsSrcElement);
        statsDisplay.openAuxiliaryCallback(statsMockEvent);

        // the statsContainer is a GUI element with at least 3 children: Played, Completion %, and Shown
        let statsContainer = statsDisplay.statsContainer;

        // the statsDistribution is a GUI element with one bar for each possible number of wrong moves: 0 .. Const.TOO_MANY_WRONG_MOVES
        let statsDistribution = statsDisplay.statsDistribution;

        this.logDebug("verifyStats() statsContainer", statsContainer, "test");
        this.logDebug("verifyStats() statsDistribution", statsDistribution, "test");

        let expContainerLen = 3;
        let actContainerLen = statsContainer.children.length;

        let expDistributionLen = Const.TOO_MANY_WRONG_MOVES + 1;
        let actDistributionLen = statsDistribution.children.length;

        // three calculated text values we expect to find on the stats screen:
        let expPlayedText = `${expDailyStats.gamesPlayed}\nPlayed`;
        let actPlayedText = statsContainer.children[0].innerText.trim();

        let completionPercent = 0;
        if (dailyStats.gamesPlayed > 0) {
            completionPercent = ((dailyStats.gamesCompleted / dailyStats.gamesPlayed) * 100).toFixed(1);
        }

        let expCompletionText = `${completionPercent}\nCompletion %`; 
        let actCompletionText = statsContainer.children[1].innerText.trim();

        let expShownText = `${expDailyStats.gamesShown}\nShown`;
        let actShownText = statsContainer.children[2].innerText.trim();

        let testRes = 
            this.verify(actContainerLen==expContainerLen, `expected statsContainer.children.length==${expContainerLen}, got ${actContainerLen} THIS IS A TESTING ANOMOLY - unexpected DOM contents`) &&
            this.verify(actDistributionLen==expDistributionLen, `expected statsDistribution.children.length==${expDistributionLen}, got ${actDistributionLen} THIS IS A TESTING ANOMOLY - unexpected DOM contents`) &&
            this.verify(dailyStats.gamesPlayed==expDailyStats.gamesPlayed, `expected dailyStats.gamesPlayed==${expDailyStats.gamesPlayed}, got ${dailyStats.gamesPlayed}`) &&
            this.verify(dailyStats.gamesCompleted==expDailyStats.gamesCompleted, `expected dailyStats.gamesCompleted==${expDailyStats.gamesCompleted}, got ${dailyStats.gamesCompleted}`) &&
            this.verify(dailyStats.gamesShown==expDailyStats.gamesShown, `expected dailyStats.gamesShown==${expDailyStats.gamesShown}, got ${dailyStats.gamesShown}`) &&
            this.verify(dailyStats.gamesFailed==expDailyStats.gamesFailed, `expected dailyStats.gamesFailed==${expDailyStats.gamesFailed}, got ${dailyStats.gamesFailed}`) &&
            this.verify(actPlayedText==expPlayedText, `expected statsContainer.children.0.innerText==${expPlayedText}, got ${actPlayedText}`) &&
            this.verify(actCompletionText==expCompletionText, `expected statsContainer.children.1.innerText=='${expCompletionText}', got '${actCompletionText}'`) &&
            this.verify(actShownText=Text=expShownText, `expected statsContainer.children.2.innerText=='${expShownText}', got '${actShownText}'`) &&
            this.verify(dailyStats.gamesPlayed >= dailyStats.gamesCompleted + dailyStats.gamesShown + dailyStats.gamesFailed, `assertion failed: played not >= completed+shown+failed`);

        for (let wrongMoves = 0; wrongMoves <= Const.TOO_MANY_WRONG_MOVES; wrongMoves++) {
            // check the stats blob
            testRes = testRes && 
                this.verify(dailyStats[wrongMoves]==expDailyStats[wrongMoves], `expected dailyStats.${wrongMoves}==${expDailyStats[wrongMoves]}, got ${dailyStats[wrongMoves]}`);

            // check the DOM contents
            let actDistributionText = statsDistribution.children[wrongMoves].innerText.trim();
            let expDistributionText = Const.NUMBERS[wrongMoves] + "\n" + expDailyStats[wrongMoves];
            testRes = testRes && 
                this.verify(actDistributionText==expDistributionText, `expected statsDistribution.children.${wrongMoves}.innerText=='${expDistributionText}', got '${actDistributionText}'`);
        }
                
        return testRes;
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
        const expectedMinDictSize = 15976;

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
        this.testDifficultyCalcs();
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

    testDifficultyCalcs() {
        this.testName = "SolverDifficultyCalcs";
        const startTestTime = Date.now();
        const solution = Solver.solve(this.fullDict, "BLUE", "BAGGY");
        const expectedNumberChoices = 2;
        /*
        BLUE, FLUE, FLOE, FLOG, FOG, FOGY, FOGGY, BOGGY, BAGGY difficulty: 20 easiest step, from FLUE has choices: 2
        3 BLUE  -> xLUE CLUE,FLUE,GLUE
        2 FLUE  -> FLxE   FLEE,FLOE
        3 FLOE  -> FLOx   FLOG,FLOP,FLOW
        2 FLOG  -> FOG -  FOG,LOG
        3 FOG   -> FOGY +  FLOG,FOGS,FOGY,FROG - FLOG
        2 FOGY  -> FOGY + FOGEY,FOGGY
        3 FOGGY -> xOGGY BOGGY,DOGGY,SOGGY
        2 BOGGY -> BxGGY  BAGGY,BUGGY  But, we don't count the last-step choices
        18 total choices
        */

        solution.calculateDifficulty(this.fullDict);
        this.verify(solution.success(), `error on 'BLUE' to 'BAGGY': ${solution.getError()}`) &&
            this.verify(solution.difficulty == 18, `expected difficulty 18, got ${solution.difficulty}`) &&
            this.verify(solution.nChoicesEasiestStep == expectedNumberChoices, `expected easiest step nChoices ${expectedNumberChoices}, got ${solution.nChoicesEasiestStep}`) &&
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
        this.verify((50*elapsedForwardTime < elapsedReverseTime), `expected fast path ${elapsedForwardTime} to be at least 50x shorter than reverse path ${elapsedReverseTime}`) &&
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
              minDifficulty = 20,
              targetWordLen = 6,
              expectedNumberOfPuzzles = 5,
              minChoicesPerStep = 2;

        const suitablePuzzles = Solver.findPuzzles(this.fullDict, startWord, targetWordLen, reqWordLen1, reqWordLen2,
                minSteps, maxSteps, minDifficulty, minChoicesPerStep)
            .map(puzzle => `${puzzle.getTarget()}:${puzzle.difficulty}`);
        suitablePuzzles.sort();
        // short-circuit the test if no puzzles found.
        if (!this.verify(suitablePuzzles.length > 0, "no suitable puzzles found")) {
            return;  
        }

        const [targetWord, difficulty] = suitablePuzzles[0].split(":");
        const solution = Solver.solve(this.fullDict, startWord, targetWord);
        solution.calculateDifficulty(this.fullDict);
        this.verify(suitablePuzzles.length == expectedNumberOfPuzzles, `expected ${expectedNumberOfPuzzles}, got ${suitablePuzzles.length}`) &&
            this.verify(solution.numSteps() >= minSteps, `solution too short ${solution.numSteps()} not ${minSteps}`) &&
            this.verify(solution.numSteps() <= maxSteps, `solution too long ${solution.numSteps()} not ${maxSteps}`) &&
            this.verify(solution.hasWordOfLength(reqWordLen1), `solution missing word of length ${reqWordLen1}`) &&
            this.verify(solution.hasWordOfLength(reqWordLen2), `solution missing word of length ${reqWordLen2}`) &&
            this.verify(solution.difficulty >= minDifficulty, `solution to easy: ${difficulty} is not at least ${minDifficulty}`) &&
            this.verify(solution.nChoicesEasiestStep >= minChoicesPerStep, `solution's easiest step should be >= ${minChoicesPerStep}, not ${solution.nChoicesEasiestStep}`) &&
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
        this.testGameRequiringWordReplay();
        this.testGameRequiringScrabbleWordReplay();
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

    testGameRequiringWordReplay() {
        this.testName = "GameRequiringWordReplay";
        const steps = [];
        const game = new Game("BLISS", "LEST", steps);
        // BLISS,BLIPS (D'OH) should now display as BLISS BLIPS BLISS BLESS LESS LEST (6) not
        // BLISS BLIPS LIPS LAPS LASS LAST LEST (7)

        const expectedDisplayLength = 6;
        const blissToBlipsResult = game.playLetter(4,"P"); 
        const displayInstructions = game.getDisplayInstructions(); // Solution should now be BLISS, BLIPS, BLISS, BLESS, LESS, LEST
        this.logDebug(this.testName, "displayInstructions: ", displayInstructions, "test");
        this.verify((blissToBlipsResult === Const.WRONG_MOVE), `playLetter(4,P) expected ${Const.WRONG_MOVE}, got ${blissToBlipsResult}`) &&
        this.verify((displayInstructions.length === expectedDisplayLength),
                `expected display instructions length=${expectedDisplayLength}, got ${displayInstructions.length}`) &&
        this.success();
    }

    testGameRequiringScrabbleWordReplay() {
        this.testName = "GameRequiringScrabbleWordReplay";
        const steps = [];
        const game = new Game("FREE", "SAMPLE", steps);
        // FREE, FEE, FIE, FILE, MILE, SMILE, SIMILE, SIMPLE, SAMPLE 9 instructions
        // playing FREE FEE FIE FILE SILE SIDLE (wrong) should give display instructions: 
        // FREE FEE FIE FILE SILE SIDLE SILE            SMILE SIMILE SIMPLE SAMPLE length 11 
        // not
        // FREE FEE FIE FILE SILE SIDLE SIDE SITE SMITE SMILE SIMILE SIMPLE SAMPLE  length 13

        const expectedDisplayLength = 11;
        let result  = game.playDelete(2); // -> FEE
        result = game.playLetter(2, "I"); // -> FIE
        result = game.playAdd(2);         // -> FIxE
        result = game.playLetter(3, "L"); // -> FILE
        result = game.playLetter(1, "S"); // -> SILE 
        result = game.playAdd(2);         // -> SIxLE
        result = game.playLetter(3, "D"); // -> SIDLE  wrong move
        // Solution should now be FREE FEE FIE FILE SILE SIDLE SILE SMILE SIMILE SIMPLE SAMPLE
        const displayInstructions = game.getDisplayInstructions();
        this.logDebug(this.testName, "displayInstructions: ", displayInstructions, "test");
        this.verify((result === Const.WRONG_MOVE), `playing add 'D' at 2 expected: ${Const.WRONG_MOVE}, got: ${result}`) &&
        this.verify((displayInstructions.length === expectedDisplayLength),
                `expected display instructions length==${expectedDisplayLength}, got: ${displayInstructions.length}`) &&
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
    ** App Tests
    ** App tests need to be run one after the other, pausing to wait for the app window to display, etc.  
    ** These tests use the utilities in the App Testing Framework section, above.
    ** 
    */

    runAppTests() {
        this.appTestStartTime = null;
        this.appTestList = [
            /*
            */
            this.openWindowTwiceTest,
            this.multiGameStatsTest,
            this.multiGameMixedResultsStatsTest,
            this.multiIncompleteGameStatsTest,
            this.dailyGameNormalFinishStatsTest,
            this.dailyGameUnfinishedRestartNextDayTest,
            this.dailyGameTooManyMistakesShareTest,
            this.dailyGameEndsOnDeleteShareTest,
            this.dailyGameRestartAfterDohTest,
            this.dailyGameRestartTest,
            this.dailyGameOneMistakeShareTest,
            this.dailyGameShowSolutionTest,
            this.practiceGameTest,
            this.practiceGameLimitTest,
            this.geniusMoveAndShareTest,
            this.cookieRestartTest,
        ];
        this.needToWaitForAsyncResults = true;
        this.runNextAppTest();
    }

    // start playing daily game for day 2, and then continue on day 3.  It should be a new, unplayed game.
    dailyGameUnfinishedRestartNextDayTest() {
        this.testName = "DailyGameUnfinishedRestartNextDay";
        this.gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;
        // SHORT -> POOR
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR
        // play two moves, then close and try to restore ...
        this.playLetter(4, "O"); // SHORT -> SHOOT
        this.deleteLetter(1);    // SHOOT -> HOOT

        // re-open the app window
        const clearCookies = false;
        this.reOpenTheTestAppWindow(clearCookies, Test.EpochThreeDaysAgo);
        this.waitForAppDisplayThenRunFunc(this.continueUnfinishedRestartNextDayTest);
    }
     
    // called after restart in the middle of the game on day 3.
    continueUnfinishedRestartNextDayTest() {
        this.gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;
        let [start, target, gameNumber] = [this.gameDisplay.startWord, this.gameDisplay.targetWord, this.gameDisplay.dailyGameNumber];
        let [expStart, expTarget] = DailyGameDisplay.GameWords[3];
        this.verify(start == expStart, "After restart, expected start word: ", expStart, ", got: ", start) &&
            this.verify(target == expTarget, "After restart, expected target word: ", expTarget, ", got: ", target) &&
            this.verify(gameNumber == 3, "Expected daily game number 3 after restarting next day, got", gameNumber) &&
            this.success();
        this.runNextAppTest();
    }

    dailyGameNormalFinishStatsTest() {
        this.testName = "DailyGameNormalFinishStats";

        // The newly opened URL should be showing the test daily game by default;
        this.gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;

        this.playTheCannedDailyGameOnce(); 

        // game is done.  Let's see what the saved stats and words played are:
        const appDisplay = this.getNewAppWindow().theAppDisplay;
        const statsDisplay = appDisplay.statsDisplay;

        // open the stats window.  This should compute the shareString, start the countdown clock 
        let statsSrcElement = new MockEventSrcElement(statsDisplay);
        let statsMockEvent = new MockEvent(statsSrcElement);
        statsDisplay.openAuxiliaryCallback(statsMockEvent);

        // create an expected DailyStats blob
        let expDailyStats = DailyGameDisplay.NewDailyStatsBlob();
        expDailyStats.gamesPlayed = 1;
        expDailyStats.gamesCompleted = 1;
        expDailyStats[0] = 1;  // the only completed game has 0 errors

        let testResults = this.verifyStats(expDailyStats);

        // now, get and check the share string:

        let actShareString = statsDisplay.shareCallback(statsMockEvent);
        let expShareString = `WordChain #${Const.STATIC_DAILY_GAME_NUMBER} ⭐\n\n🟪🟪🟪🟪🟪\n🟩🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟪🟪🟪🟪`;
        testResults &&
            this.verify(actShareString==expShareString, `expected share string=='${expShareString}', got '${actShareString}'`) &&
            this.success();

        this.runNextAppTest();
    }
        
    // openWindowTwiceTest just opens the wordchain.html window, closes it, and re-opens it.
    // This checks to see if the app initializes itself correctly.

    openWindowTwiceTest() {
        this.testName = "OpenWindowTwice";

        if (this.multiGameCountdown == null) {
            // this is the first call.  We will set a countdown of games to run
            this.multiGameCountdown = 2;
        } 

        this.multiGameCountdown -= 1;
        this.logDebug(this.testName, " countdown: ", this.multiGameCountdown, "test");
        this.resultsSoFar = this.verify(this.getNewAppWindow() != null, `new window is null with countdown=${this.multiGameCountdown}`);

        if (this.resultsSoFar) {
            if (this.multiGameCountdown <= 0) {
                this.success();
                this.runNextAppTest();
            } else {
                // re-open open the test window, and then repeat this function with the countdown reduced 
                const clearCookies = false;
                this.reOpenTheTestAppWindow(clearCookies, Test.EpochTwoDaysAgo);
                this.waitForAppDisplayThenRunFunc(this.openWindowTwiceTest);
            }
        }
    }
 
    // multiGameStatsTest plays the daily game 3 times (multiGameCountdown) and
    // the checks both the stats cookie, and the elements in the StatsContainer.

    multiGameStatsTest() {
        this.testName = "MultiGameStats";
        if (this.multiGameCountdown == null) {
            // this is the first call.  We will set a countdown of games to run
            this.multiGameCountdown = 3;
        } 

        this.logDebug("MultiGameStatsTest() countdown is: ", this.multiGameCountdown, "test");

        this.playTheCannedDailyGameOnce(); // this runs in-line.  When it finishes, the game is actually done (?) 

        this.multiGameCountdown -= 1;
        if (this.multiGameCountdown <= 0) {
            // create an expected DailyStats blob
            let expDailyStats = DailyGameDisplay.NewDailyStatsBlob();
            expDailyStats.gamesPlayed = 3;
            expDailyStats.gamesCompleted = 3;
            expDailyStats[0] = 3;  // all 3 games have 0 errors
            this.verifyStats(expDailyStats) && this.success();
            this.runNextAppTest();
        } else {
            // don't let the game pick up where it left off (a finished game). 
            Persistence.clearDailyGameNumber(); 
            // re-open open the test window, and then repeat this function with the countdown reduced 
            const clearCookies = false;
            this.reOpenTheTestAppWindow(clearCookies, Test.EpochTwoDaysAgo);
            this.waitForAppDisplayThenRunFunc(this.multiGameStatsTest);
        }
    }


    // a recursive test that makes 0, 1, or 2 errors depending on which iteration

    multiGameMixedResultsStatsTest() {
        this.testName = "MultiGameMixedResultsStats";
        if (this.multiGameCountdown == null) {
            this.multiGameCountdown = 2;
        }
        this.gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;

        // game: SHORT -> POOR
        this.playLetter(4, "O"); // SHORT -> SHOOT
        this.deleteLetter(1);    // SHOOT -> HOOT
        this.playLetter(1, "B"); // HOOT -> BOOT
        // optionally add one or two wrong moves on the last letter
        if (this.multiGameCountdown >=2) {
            this.playLetter(4, "K"); // BOOT -> BOOK  mistake
        }
        if (this.multiGameCountdown >=1) {
            this.playLetter(4, "B"); // BOO? -> BOOB mistake
        }
        this.playLetter(4, "R"); // BOO? -> BOOR
        this.playLetter(1, "P"); // BOO? -> POOR

        this.multiGameCountdown -= 1;
        // this count needs to include case '0', and stops at -1 errors.
        if (this.multiGameCountdown < 0) {
            // create the expected daily stats blob
            let expDailyStats = DailyGameDisplay.NewDailyStatsBlob();
            expDailyStats.gamesPlayed = 3;
            expDailyStats.gamesCompleted = 3;
            expDailyStats[0] = 1;
            expDailyStats[1] = 1;
            expDailyStats[2] = 1;
            this.verifyStats(expDailyStats) && this.success();
            this.runNextAppTest();
        } else {
            // don't let the game pick up where it left off (a finished game). 
            Persistence.clearDailyGameNumber(); 
            // re-open open the test window, and then repeat this function with the countdown reduced 
            const clearCookies = false;
            this.reOpenTheTestAppWindow(clearCookies, Test.EpochTwoDaysAgo);
            this.waitForAppDisplayThenRunFunc(this.multiGameMixedResultsStatsTest);
        }
    }
        
    // multiIncompleteGameStatsTest plays the daily game 2 times 
    // one failed, one incomplete and the solution shown
    // the checks both the stats cookie, and the elements in the StatsContainer.

    multiIncompleteGameStatsTest() {
        this.testName = "MultiIncompleteGameStats";
        if (this.multiGameCountdown == null) {
            // this is the first call.  We will set a countdown of games to run
            this.multiGameCountdown = 3;
        } 
        this.gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;
        this.logDebug("multiIncompleteGameStatsTest() countdown is: ", this.multiGameCountdown, "test");
        if (this.multiGameCountdown == 1) {
            // play a failed game and then verify
            this.playLetter(4, "O"); // SHORT -> SHOOT
            this.deleteLetter(1);    // SHOOT -> HOOT
            this.playLetter(1, "B"); // HOOT -> BOOT
            this.playLetter(1, "S"); // BOOT -> SOOT error
            this.playLetter(1, "T"); // SOOT -> TOOT error
            this.playLetter(1, "R"); // TOOT -> ROOT error
            this.playLetter(1, "L"); // ROOT -> LOOT error
            this.playLetter(1, "R"); // LOOT -> ROOT error

            // create and verify an expected DailyStats blob
            let expDailyStats = DailyGameDisplay.NewDailyStatsBlob();
            expDailyStats.gamesPlayed = 3;
            expDailyStats.gamesShown = 1;
            expDailyStats.gamesFailed = 1;
            expDailyStats.gamesCompleted = 1; 
            expDailyStats[0] = 1;  // complete game has 0 errors
            expDailyStats[Const.TOO_MANY_WRONG_MOVES] = 1;  // failed game has TOO_MANY_WRONG_MOVE errors
            this.verifyStats(expDailyStats) && this.success();
            this.runNextAppTest();
            return;
        } 

        // play a full game, then an incomplete game
        if (this.multiGameCountdown == 3) {
            this.playTheCannedDailyGameOnce();
        } else if (this.multiGameCountdown == 2) {
            // play an incomplete game and request the solution 
            // game: SHORT -> POOR
            this.playLetter(4, "O"); // SHORT -> SHOOT
            this.deleteLetter(1);    // SHOOT -> HOOT
            this.playLetter(1, "B"); // HOOT -> BOOT
                                     // give up - show the solution
            this.gameDisplay.showSolution();
        }
        // move on to the next game
        this.multiGameCountdown -= 1;
        // don't let the game pick up where it left off (a finished game). 
        Persistence.clearDailyGameNumber(); 
        const clearCookies = false;
        this.reOpenTheTestAppWindow(clearCookies, Test.EpochTwoDaysAgo);
        this.waitForAppDisplayThenRunFunc(this.multiIncompleteGameStatsTest);
    }

    dailyGameShowSolutionTest() {
        // we verify the following
        // DailyStats has 1 played, 0 completed, 1 shown, 0 failed
        // You can't play the daily game again if cookies are not cleared.

        this.testName = "DailyGameShowSolution";

         // The newly opened URL should be showing the test daily game by default;
        this.gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;
        let solutionShown = this.gameDisplay.getSolutionShown();

        // SHORT -> POOR
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR

        this.playLetter(4, "O"); // SHORT -> SHOOT
        this.gameDisplay.showSolution();
        solutionShown = this.gameDisplay.getSolutionShown();

        const clearCookies = false;
        this.reOpenTheTestAppWindow(clearCookies, Test.EpochTwoDaysAgo);
        this.waitForAppDisplayThenRunFunc(this.finishDailyGameShowSolutionTest);
    }

    finishDailyGameShowSolutionTest() {
        //IMPORTANT: here, window.name is '', not 'testingplace' and local storage is not null.
        this.gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;
        Const.GL_DEBUG && this.logDebug("SECOND WINDOW: window: ", window, "test"); 
        const solutionShown = this.gameDisplay.getSolutionShown();
        Const.GL_DEBUG && this.logDebug(this.testName, "SECOND WINDOW: solutionShown: ", solutionShown, "test");

        // create an expected DailyStats blob
        let expDailyStats = DailyGameDisplay.NewDailyStatsBlob();
        // stats are zero by default
        expDailyStats.gamesPlayed = 1;
        expDailyStats.gamesShown = 1;
        let testResults = this.verifyStats(expDailyStats);
        Const.GL_DEBUG && this.logDebug("finishDailyGameShowSolutionTest testResults: ", testResults, "test");

        if (testResults) {
            // the new game should be in a solved state
            let game = this.gameDisplay.game;
            const gameIsWinner = game.isWinner();
            const dailyGameSolutionShown = this.gameDisplay.getSolutionShown();

            const appDisplay = this.getNewAppWindow().theAppDisplay;
            const statsDisplay = appDisplay.statsDisplay;
            // open the stats window.  The share button should not be shown
            const statsSrcElement = new MockEventSrcElement(statsDisplay);
            const statsMockEvent = new MockEvent(statsSrcElement);
            statsDisplay.openAuxiliaryCallback(statsMockEvent);
            const actualShareButtonDisplayStyle = statsDisplay.shareButton.style.display;
            const expShareButtonDisplayStyle = "none";

            this.verify(gameIsWinner, "game not recovered in solved state after showing solution.") &&
                this.verify(dailyGameSolutionShown == true, `Expected daily game solution shown: true, got: ${dailyGameSolutionShown}`) &&
                this.verify(actualShareButtonDisplayStyle == expShareButtonDisplayStyle, "expected share button display style: ", expShareButtonDisplayStyle, ", got: ", actualShareButtonDisplayStyle) &&

                this.success();
        }
        this.runNextAppTest();
    }

    dailyGameOneMistakeShareTest() {
        this.testName = "DailyGameOneMistakeShare";

        // The newly opened URL should be showing the test daily game by default;
        this.gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;

        // SHORT -> POOR solution: SHORT SHOOT HOOT BOOT BOOR POOR

        this.playLetter(4, "O"); // SHORT -> SHOOT
        this.deleteLetter(1);    // SHOOT -> HOOT
        this.playLetter(1, "B"); // HOOT -> BOOT
        this.playLetter(4, "K"); // BOOT -> BOOK  D'OH wrong move
        this.playLetter(4, "R"); // BOOK -> BOOR
        this.playLetter(1, "P"); // BOOR -> POOR

        // game is done.  Let's see what the saved stats and words played are:
        const appDisplay = this.getNewAppWindow().theAppDisplay;
        const statsDisplay = appDisplay.statsDisplay;

        let statsSrcElement = new MockEventSrcElement(statsDisplay);
        let statsMockEvent = new MockEvent(statsSrcElement);
        statsDisplay.openAuxiliaryCallback(statsMockEvent);

        //  get the share string:
        let actShareString = statsDisplay.shareCallback(statsMockEvent);
        let expShareString = `WordChain #${Const.STATIC_DAILY_GAME_NUMBER} 1️⃣\n\n🟪🟪🟪🟪🟪\n🟩🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟥🟥🟥🟥\n🟩🟩🟩🟩\n🟪🟪🟪🟪`;

        this.verify(actShareString==expShareString, `expected share string=='${expShareString}', got '${actShareString}'`) &&
            this.success();

        this.runNextAppTest();
    }

    dailyGameTooManyMistakesShareTest() {
        this.testName = "DailyGameTooManyMistakesShare";

        // The newly opened URL should be showing the test daily game by default;
        this.gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;
        const game = this.gameDisplay.game;

        // SHORT -> POOR
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR

        this.playLetter(4, "O"); // SHORT -> SHOOT
        this.deleteLetter(1);    // SHOOT -> HOOT
        this.playLetter(1, "B"); // HOOT -> BOOT
        this.playLetter(4, "K"); // BOOT -> BOOK  D'OH wrong move 1
        this.playLetter(4, "B"); // BOOK -> BOOB  D'OH wrong move 2
        this.playLetter(4, "T"); // BOOB -> BOOT  D'OH wrong move 3
        this.playLetter(4, "K"); // BOOT -> BOOK  D'OH wrong move 4

        this.verify(!game.isOver(), "after 4 wrong moves, game should not be over!");

        this.playLetter(4, "T"); // BOOK -> BOOT  D'OH wrong move 5

        // game should be over if Const.TOO_MANY_WRONG_MOVES is 5
        this.verify(game.isOver(), "after 5 wrong moves, game is not over!");

        // game is done.  Let's see what the saved stats and words played are:
        const appDisplay = this.getNewAppWindow().theAppDisplay;
        const statsDisplay = appDisplay.statsDisplay;

        // open the stats window.  This should compute the shareString, start the countdown clock 
        let statsSrcElement = new MockEventSrcElement(statsDisplay);
        let statsMockEvent = new MockEvent(statsSrcElement);
        statsDisplay.openAuxiliaryCallback(statsMockEvent);

        //  get the share string.  Note that after the final mistake, no more words are shown (unplayed) leading to the target.
        let actShareString = statsDisplay.shareCallback(statsMockEvent);
        let expShareString = `WordChain #${Const.STATIC_DAILY_GAME_NUMBER} 😖\n\n🟪🟪🟪🟪🟪\n🟩🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟥🟥🟥🟥\n🟥🟥🟥🟥\n🟥🟥🟥🟥\n🟥🟥🟥🟥\n🟥🟥🟥🟥\n🟪🟪🟪🟪`;

        this.verify(actShareString==expShareString, `expected share string=='${expShareString}', got '${actShareString}'`) &&
            this.success();

        this.runNextAppTest();
    }

    dailyGameEndsOnDeleteShareTest() {
        this.testName = "DailyGameEndsOnDeleteShare";

        // We need to re-open the test window with a known daily game, not the default.
        const clearCookies = true;
        let queryVars = new Map(Test.EpochTwoDaysAgo);
        queryVars.set( Const.QUERY_STRING_START_WORD, "START" );
        queryVars.set( Const.QUERY_STRING_TARGET_WORD, "END" );
        this.reOpenTheTestAppWindow(clearCookies, queryVars);
        this.waitForAppDisplayThenRunFunc(this.finishDailyGameEndsOnDeleteShareTest);
    }

    finishDailyGameEndsOnDeleteShareTest() {

        // The newly re-opened URL should be showing the daily game START -> END
        const appDisplay = this.getNewAppWindow().theAppDisplay;
        this.gameDisplay = appDisplay.currentGameDisplay;
        const game = this.gameDisplay.game;

        // START -> END
        // solution: START STAT SEAT SENT SEND END

        this.deleteLetter(4);    // START -> STAT
        this.playLetter(2, "E"); // STAT -> SEAT
        this.playLetter(3, "N"); // SEAT -> SENT
        this.playLetter(4, "D"); // SENT -> SEND
        this.deleteLetter(1);    // SEND -> END

        this.logDebug("finishDailyGameEndsOnDeleteShareTest(): game:", game, "test");
        this.verify(game.isOver(), "game should be over!");

        // game is done.  Let's see what the saved stats and words played are:
        const statsDisplay = appDisplay.statsDisplay;

        // open the stats window.  This should compute the shareString, start the countdown clock 
        let statsSrcElement = new MockEventSrcElement(statsDisplay);
        let statsMockEvent = new MockEvent(statsSrcElement);
        statsDisplay.openAuxiliaryCallback(statsMockEvent);

        //  get the share string.  use-case: the last play is a Delete
        let actShareString = statsDisplay.shareCallback(statsMockEvent);
        let expShareString = `WordChain #${Const.STATIC_DAILY_GAME_NUMBER} ⭐\n\n🟪🟪🟪🟪🟪\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟪🟪🟪`;

        this.verify(actShareString==expShareString, `expected share string=='${expShareString}', got '${actShareString}'`) &&
            this.success();

        this.runNextAppTest();
    }

    dailyGameRestartTest() {
        // The newly opened URL should be showing the daily game by default;
        this.gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;

        // known game should be SHORT -> POOR, the game number will be 2.
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR

        // play two moves, then close and try to restore ...
        this.playLetter(4, "O"); // SHORT -> SHOOT
        this.deleteLetter(1);    // SHOOT -> HOOT

        // re-open the app window
        const clearCookies = false;
        this.reOpenTheTestAppWindow(clearCookies, Test.EpochTwoDaysAgo);
        this.waitForAppDisplayThenRunFunc(this.continueDailyGameRestartTest);
    }

    // called after first restart in the middle of the game.
    continueDailyGameRestartTest() {
        // we should be running the daily game SHORT -> POOR with SHOOT, HOOT already played.
        this.testName = "DailyGameRestart";
        this.gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;
        const game = this.gameDisplay.game;
        const di = game.getDisplayInstructions();
        this.multiStepResults = 
            this.verify((di.length == 6), `expected 6 display instructions after restore, got ${di.length}`) &&
            this.verify((di[0].toStr() === `(played,word:SHORT,moveRating:${Const.OK})`), `instruction[0] is ${di[0].toStr()}`) &&
            this.verify((di[1].toStr() === `(played,word:SHOOT,moveRating:${Const.OK})`), `instruction[1] is ${di[1].toStr()}`) &&
            this.verify((di[2].toStr() === "(change,word:HOOT,changePosition:1)"), `instruction[2] is ${di[2].toStr()}`) &&
            this.verify((di[3].toStr() === "(future,word:BOOT,changePosition:4)"), `instruction[3] is ${di[3].toStr()}`) &&
            this.verify((di[4].toStr() === "(future,word:BOOR,changePosition:1)"), `instruction[4] is ${di[4].toStr()}`) &&
            this.verify((di[5].toStr() === "(target,word:POOR)"), `instruction[5] is ${di[5].toStr()}`);

        if (this.multiStepResults) {
            // finish the game. ( ... BOOT BOOR POOR)
            const playedB = this.playLetter(1, "B"); // HOOT -> BOOT
            const playedR = this.playLetter(4, "R"); // BOOT -> BOOR
            const playedP = this.playLetter(1, "P"); // BOOR -> POOR

            this.multiStepResults = this.verify((playedB == Const.OK), `played B, got ${playedB}, not `, Const.OK) &&
                this.verify((playedR == Const.OK), `played R, got ${playedR}, not `, Const.OK) &&
                this.verify((playedP == Const.OK), `played P, got ${playedP}, not `, Const.OK);
        }

        // ... and close and re-open it after it is solved

        const clearCookies = false;
        this.reOpenTheTestAppWindow(clearCookies, Test.EpochTwoDaysAgo);
        this.waitForAppDisplayThenRunFunc(this.finishDailyGameRestartTest);
    }

    finishDailyGameRestartTest() {
        if (this.multiStepResults) {
            // game should be done; stats should be saved.
            this.gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;
            const game = this.gameDisplay.game;
            this.logDebug("restored daily game after finishing it; display instructions are: ",
                    game.getDisplayInstructions(), "test");
            this.verify (game.isWinner(), "Expected gameisWinner() true, got: ", game.isWinner()) &&
                this.success();
        }
        Cookie.clearNonDebugCookies();
        this.runNextAppTest();
    }

    dailyGameRestartAfterDohTest() {
        this.gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;

        // when opened with epoch two days ago, the daily game will always
        // be SHORT -> POOR
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR

        // play two moves, then close and try to restore ...
        this.playLetter(4, "O"); // SHORT -> SHOOT
        this.deleteLetter(1);    // SHOOT -> HOOT
        this.playLetter(1, "S"); // HOOT -> SOOT D'OH!!!

        // re-open the app window, with the same daily game number
        const clearCookies = false;
        this.reOpenTheTestAppWindow(clearCookies, Test.EpochTwoDaysAgo);
        this.waitForAppDisplayThenRunFunc(this.continueDailyGameRestartAfterDohTest);
    }

    // called after first restart in the middle of the game.
    continueDailyGameRestartAfterDohTest() {
        // we should be running the daily game SHORT -> POOR with SHOOT, HOOT, SOOT (D'OH) already played.
        this.testName = "DailyGameRestartAfterDoh";
        this.gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;
        const game = this.gameDisplay.game;
        let di = game.getDisplayInstructions();
        if ( this.verify((di.length == 7), `expected 7 display instructions after restore, got ${di.length}`) &&
                this.verify((di[0].toStr() === `(played,word:SHORT,moveRating:${Const.OK})`), `instruction[0] is ${di[0].toStr()}`) &&
                this.verify((di[1].toStr() === `(played,word:SHOOT,moveRating:${Const.OK})`), `instruction[1] is ${di[1].toStr()}`) &&
                this.verify((di[2].toStr() === `(played,word:HOOT,moveRating:${Const.OK})`), `instruction[2] is ${di[2].toStr()}`) &&
                this.verify((di[3].toStr() === `(change,word:SOOT,changePosition:1)`), `instruction[3] is ${di[3].toStr()}`) &&
                this.verify((di[4].toStr() === "(future,word:BOOT,changePosition:4)"), `instruction[4] is ${di[4].toStr()}`) &&
                this.verify((di[5].toStr() === "(future,word:BOOR,changePosition:1)"), `instruction[5] is ${di[5].toStr()}`) &&
                this.verify((di[6].toStr() === "(target,word:POOR)"), `instruction[5] is ${di[5].toStr()}`) ) {

            // finish the game. ( ... BOOT BOOR POOR)

            const playedB = this.playLetter(1, "B"); // HOOT -> BOOT
            const playedR = this.playLetter(4, "R"); // BOOT -> BOOR
            const playedP = this.playLetter(1, "P"); // BOOR -> POOR
            di = game.getDisplayInstructions();

            this.verify((playedB == Const.OK), `played B, got ${playedB}, not `, Const.OK) &&
                this.verify((playedR == Const.OK), `played R, got ${playedR}, not `, Const.OK) &&
                this.verify((playedP == Const.OK), `played P, got ${playedP}, not `, Const.OK) &&
                this.verify((di.length == 7), `expected 7 display instructions after finishing game, got ${di.length}`) &&
                this.verify((di[0].toStr() === `(played,word:SHORT,moveRating:${Const.OK})`), `di[0] is ${di[0].toStr()}`) &&
                this.verify((di[1].toStr() === `(played,word:SHOOT,moveRating:${Const.OK})`), `di[1] is ${di[1].toStr()}`) &&
                this.verify((di[2].toStr() === `(played,word:HOOT,moveRating:${Const.OK})`), `di[2] is ${di[2].toStr()}`) &&
                this.verify((di[3].toStr() === `(played,word:SOOT,moveRating:${Const.WRONG_MOVE})`), `di[3] is ${di[3].toStr()}`) &&
                this.verify((di[4].toStr() === `(played,word:BOOT,moveRating:${Const.OK})`), `di[4] is ${di[4].toStr()}`) &&
                this.verify((di[5].toStr() === `(played,word:BOOR,moveRating:${Const.OK})`), `di[5] is ${di[5].toStr()}`) &&
                this.verify((di[6].toStr() === `(played,word:POOR,moveRating:${Const.OK})`), `di[6] is ${di[6].toStr()}`) &&
                this.success();
        }
        Cookie.clearNonDebugCookies();
        this.runNextAppTest();
    }


    practiceGameTest() {
        this.testName = "PracticeGame";

        this.logDebug("theAppDisplay: ", this.getNewAppWindow().theAppDisplay, "test");
        Cookie.clearNonDebugCookies();

        this.logDebug("Switching to practice game", "test");
        this.getNewAppWindow().theAppDisplay.switchToPracticeGame("TEST", "PILOT");
        this.logDebug("Done switching to practice game", "test");

        this.gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;

        // solve the puzzle directly: TEST LEST LET LOT PLOT PILOT
        let resultL1 = this.playLetter(1, "L");          // TEST -> LEST
        let resultDelete3 = this.deleteLetter(3);        // LEST -> LET
        let resultI2Wrong = this.playLetter(2, "I");     // LET -> LIT - wrong move!
        let resultO2 = this.playLetter(2, "O");          // LIT -> LOT
        let resultInsertP0 = this.insertLetter(0, "P" ); // LOT -> PLOT
        let resultInsertI1 = this.insertLetter(1, "I");  // PLOT -> PxLOT

        this.verify((resultL1 === Const.OK), `playLetter(1, L) returns ${resultL1}, not ${Const.OK}`) &&
            this.verify((resultDelete3 === Const.OK), `playDelete(3) returns ${resultDelete3}, not ${Const.OK}`) &&
            this.verify((resultI2Wrong === Const.WRONG_MOVE), `playLetter(2, O) returns ${resultO2}, not ${Const.OK}`) &&
            this.verify((resultO2 === Const.OK), `playLetter(2, O) returns ${resultO2}, not ${Const.OK}`) &&
            this.verify((resultInsertP0 === Const.OK), `insert P@0 returns ${resultInsertP0}, not ${Const.OK}`) &&
            this.verify((resultInsertI1 === Const.OK), `insert I@1 returns ${resultInsertI1}, not ${Const.OK}`) &&
            this.success();
        this.runNextAppTest();
    }

    practiceGameLimitTest() {
        this.testName = "PracticeGameLimit";
        Cookie.clearNonDebugCookies();
        this.logDebug("Switching to practice game", "test");
        this.getNewAppWindow().theAppDisplay.switchToPracticeGame("TEST", "PILOT");
        this.logDebug("Done switching to practice game", "test");

        this.gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;
        // play and solve N practice games in a row.
        // showSolution calls showMove(userRequestedSolution=true), and this rebuilds the whole game GUI, including
        // the post-game-div to hold a 'new game' button if there are any more practice games allowed.
        this.logDebug(this.testName, ": showing solution", "test");
        this.gameDisplay.showSolution();

        const srcElement = new MockEventSrcElement(this.gameDisplay);
        const mockEvent = new MockEvent(srcElement);
        let soFarSoGood = true;
        const testPracticeGamesPerDay = 3;
        this.gameDisplay.setPracticeGamesPerDay(testPracticeGamesPerDay);
        soFarSoGood = this.verify(this.gameDisplay.practiceGamesPerDay == testPracticeGamesPerDay,
                `expected practice games per day to be ${testPracticeGamesPerDay}, got: ${this.gameDisplay.practiceGamesPerDay}`, "test");
        for (let gamesPlayed=1; gamesPlayed < testPracticeGamesPerDay; gamesPlayed++) {
            if (!soFarSoGood) {
                break; // stop testing on the first failure
            }
            this.logDebug(this.testName, ": gamesPlayed:", gamesPlayed, "test");
            // New Game button should be there.  The postGameDiv is reconstructed on every refresh of the display after a move
            // or solution. 
            const postGameDiv = this.gameDisplay.postGameDiv;
            const children = postGameDiv.children;

            if ( this.verify(children.length == 1, "expected 1 children, got: ", children.length) &&
                    this.verify( (children[0].textContent == "New Game"), "expected textContent=New Game, got: ", children[0].textContent) && 
                    this.verify(this.gameDisplay.anyGamesRemaining(), "After showing ", gamesPlayed, " games, anyGamesRemaining should still be true")
                    )
            {
                // pretend to click the new game button
                this.gameDisplay.newGameCallback(mockEvent);
                //do we need to wait a while? No, that callback handler runs synchronously.
                this.gameDisplay.showSolution();
            } else {
                soFarSoGood = false;
            }
        }
        // now there should be no New Game button
        if (soFarSoGood) {
            const postGameDiv = this.gameDisplay.postGameDiv;
            this.verify(!this.gameDisplay.anyGamesRemaining(), "After showing too many games, anyGamesRemaining should be false") &&
                this.verify(postGameDiv.children.length == 0, "After showing too many games, expected 0 children, got: ", postGameDiv.children.length) &&
                this.success();
        }
        this.runNextAppTest();
    }

    geniusMoveAndShareTest() {
        this.testName = "GeniusMoveDisplay";

        Cookie.clearNonDebugCookies();
        this.getNewAppWindow().theAppDisplay.switchToDailyGame();

        this.gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;

        // regular solution:                SHORT SHOOT HOOT BOOT BOOR POOR
        // solve the puzzle like a genius:  SHORT SHOOT HOOT HOOR POOR

        let resultO4 = this.playLetter(4, "O");       // SHORT -> SHOOT
        let resultDelete1 = this.deleteLetter(1);     // SHOOT -> HOOT
        let resultR4Genius = this.playLetter(4, "R"); // HOOT -> HOOR genius move
        let resultP1 = this.playLetter(1, "P");       // HOOR -> POOR  

        // let's look at the share ...
        let statsDisplay = this.getNewAppWindow().theAppDisplay.statsDisplay;
        this.logDebug("theAppDisplay", this.getNewAppWindow().theAppDisplay, "test");
        this.logDebug("gameDisplay", this.gameDisplay, "test");
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
        this.runNextAppTest();
    }

    cookieRestartTest() {
        this.testName = "CookieRestart";
        this.logDebug("new window should be open; saving cookies via new window", "test");
        var testObj = new TestClassForCookie();
        testObj.nums.push(3);
        testObj.nums.push(5);
        testObj.field = "hello";
        Cookie.saveJson(Cookie.TEST_OBJ, testObj);
        Cookie.save(Cookie.TEST_INT, 42);
        Cookie.save(Cookie.TEST_BOOL, true);

        // now close the window,
        const clearCookies = false;
        this.reOpenTheTestAppWindow(clearCookies, Test.EpochTwoDaysAgo);
        this.waitForAppDisplayThenRunFunc(this.finishCookieRestartTest);
    }

    finishCookieRestartTest() {
        this.logDebug("new window should be re-opened; restoring values via cookies in new window", "test");
        this.gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;
        var testIntRestored = Cookie.getInt(Cookie.TEST_INT);
        var testBoolRestored = Cookie.getBoolean(Cookie.TEST_BOOL);
        var testObjRestored = Cookie.getJsonOrElse(Cookie.TEST_OBJ, null);
        this.verify((testIntRestored == 42), `testIntRestored is ${testIntRestored}, not 42`) &&
            this.verify(testBoolRestored, `testBoolRestored is ${testBoolRestored}, not true`) &&
            this.verify((testObjRestored.nums.length == 2), `testObjRestored.length is ${testObjRestored.length}, not 2`) &&
            this.verify((testObjRestored.nums[0] == 3), `testObjRestored[0]is ${testObjRestored[0]}, not 3`) &&
            this.verify((testObjRestored.nums[1] == 5), `testObjRestored[1]is ${testObjRestored[1]}, not 5`) &&
            this.verify((testObjRestored.field == "hello"), `testObjRestored.field is '${testObjRestored.field}', not hello`) &&
            this.success();
        Cookie.clearNonDebugCookies();
        this.runNextAppTest();
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
        ElementUtilities.addElementTo("input", this.outerDiv, {id: "puzzleFinderReqWordLen1", type: "text", value: Const.PRACTICE_REQ_WORD_LEN_1.toString()});
        ElementUtilities.addElementTo("p", this.outerDiv);

        ElementUtilities.addElementTo("label", this.outerDiv, {}, "required word len 2: ");
        ElementUtilities.addElementTo("input", this.outerDiv, {id: "puzzleFinderReqWordLen2", type: "text", value: Const.PRACTICE_REQ_WORD_LEN_2.toString()});
        ElementUtilities.addElementTo("p", this.outerDiv);

        ElementUtilities.addElementTo("label", this.outerDiv, {}, "final word len (0 for any): ");
        ElementUtilities.addElementTo("input", this.outerDiv, {id: "puzzleFinderFinalWordLen", type: "text", value: Const.PRACTICE_TARGET_WORD_LEN.toString()});
        ElementUtilities.addElementTo("p", this.outerDiv);

        ElementUtilities.addElementTo("label", this.outerDiv, {}, "min words: ");
        ElementUtilities.addElementTo("input", this.outerDiv, {id: "puzzleFinderMinWords", type: "text", value: Const.PRACTICE_STEPS_MINIMUM.toString()});
        ElementUtilities.addElementTo("p", this.outerDiv);

        ElementUtilities.addElementTo("label", this.outerDiv, {}, "max words: ");
        ElementUtilities.addElementTo("input", this.outerDiv, {id: "puzzleFinderMaxWords", type: "text", value: Const.PRACTICE_STEPS_MAXIMUM.toString()});
        ElementUtilities.addElementTo("p", this.outerDiv);

        ElementUtilities.addElementTo("label", this.outerDiv, {}, "min difficulty: ");
        ElementUtilities.addElementTo("input", this.outerDiv, {id: "puzzleFinderMinDifficulty", type: "text", value: Const.PRACTICE_DIFFICULTY_MINIMUM.toString()});
        ElementUtilities.addElementTo("p", this.outerDiv);

        ElementUtilities.addElementTo("label", this.outerDiv, {}, "min choices per step (>=1): ");
        ElementUtilities.addElementTo("input", this.outerDiv, {id: "puzzleFinderMinChoicesPerStep", type: "text", value: Const.PRACTICE_MIN_CHOICES_PER_STEP.toString() });
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
              targetWordLen = parseInt(ElementUtilities.getElementValue("puzzleFinderFinalWordLen")),
              minChoicesPerStep = parseInt(ElementUtilities.getElementValue("puzzleFinderMinChoicesPerStep"));

        const goodTargetsWithDifficulty = Solver
            .findPuzzles(this.fullDict, startWord, targetWordLen, reqWordLen1, reqWordLen2, minSteps, maxSteps, minDifficulty, minChoicesPerStep)
            .map(puzzle => `${puzzle.getTarget()}:${puzzle.difficulty}`);
        goodTargetsWithDifficulty.sort();

        ElementUtilities.setElementHTML("puzzleFinderAnswer", goodTargetsWithDifficulty.join(","));
    }
}

Test.singleton().display();

export { Test };
