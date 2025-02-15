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
// The attributes we use in this way are the additionPosition and deletionPosition,
// and class, which is button-unselected or button-unconfirmed
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

    // We set the epoch to two days ago by default for all app tests.  This means the
    // game number will be two.

    static TEST_EPOCH_DAYS_AGO = 2;
    constructor() {
        super();

        // save the calling <script> tag element for access to its parameters:
        var scripts = document.getElementsByTagName('script');
        var index = scripts.length - 1;
        this.scriptObj = scripts[index];
        console.log("scriptObj: ", this.scriptObj, "scriptObj.dataset: ", this.scriptObj.dataset);
        const bundledArg = this.scriptObj.dataset.bundled;
        this.isBundled = (bundledArg === "true");
        this.testName = "NOT SET";
        this.tinyList  = ["APPLE", "PEAR", "BANANA"];
        this.smallList = ["BAD", "BADE", "BALD", "BAT", "BATE", "BID", "CAD", "CAT", "DOG", "SCAD"]
        this.fullDict = new WordChainDict(globalWordList);
        this.scrabbleDict = new WordChainDict(scrabbleWordList);
        this.messages = [];
        //this.openTheTestAppWindow();
        console.log("The Test singleton: ", this);
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
            debugWarning = "<br>Warning: Const.GL_DEBUG is on for logging; this will be SLOW.";
        }
        let bundledStatus = "<br>This is testing against the " + (this.isBundled? "" : "non-") + "bundled wordchain source";

        this.addTitle("WordChain Test Suite<br>Allow 20+ seconds to complete. Browser popups must be allowed." + debugWarning + bundledStatus);


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
        this.clearResults();
        const buttonId = event.srcElement.getAttribute("id");

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
            this.runAppTests(); // this will take care of calling showResults() when it is finished asynchronously
        } else {
            this.showResults(); // this will apply to any synchronous tests (dict, solver, game)
        }
    }

    clearResults() {
        this.successCount = 0;
        this.failureCount = 0;
        this.testAssertionCount = 0;
        this.totalAssertionCount = 0;
        this.messages = [];
        this.testingStartTime = Date.now();
    }


    showResults() {
        let elapsedTime = (Date.now() - this.testingStartTime);

        let results = [
            "",
            `Successful test scenarios: ${this.successCount}`,
            `Failed tests scenarios: ${this.failureCount}`,
            `Total assertions verified: ${this.totalAssertionCount}`,
            `Elapsed time : ${elapsedTime} milliseconds.`,
            "",
        ];

        let resultString = results.concat(this.messages).join("<br>");

        ElementUtilities.setElementHTML("testResults", resultString);

        // We have found that if we don't clear all the local storage,
        // the Test* cookies (probably the epoch) mess things up and
        // result in an error from Solver.getNthWord() of all things!
        Persistence.clearAllNonDebug();
        console.log(`Testing took: ${elapsedTime} ms.`);
    }

    success(testName) {
        this.messages.push(`<font color="green">${this.testName} (${this.testAssertionCount})</font color="green">`);
        this.testAssertionCount = 0;
        this.successCount += 1;
    }

    verify(truthValue, message) {
        if (! truthValue) {
            this.messages.push(`<font color="red">${this.testName}: Failed: ${message}</font color="red">`);
            this.failureCount += 1;
        } else {
            this.testAssertionCount += 1;
            this.totalAssertionCount += 1;
        }
        return truthValue;
    }

    /*
    ** App Testing Framework
    */

    getNewAppWindow() {
        return this.newWindow;
    }

    closeTheTestAppWindow() {
        if (this.newWindow) {
            this.newWindow.close();
            this.newWindow = null;
        }
    }

    openTheTestAppWindow() {
        // Setting the width/height is what makes a separate window open
        // instead of a new browser tab. HOWEVER, in iOS/Chrome, the appearance
        // is a new tab. In iOS/Safari this doesn't work -- we get failures to
        // download some source files and we don't know why!
        if (! this.getNewAppWindow()) {
            const url = this.isBundled ?
                '/wordchain/docs/html/WordChainBundled.html' :
                '/wordchain/docs/html/WordChain.html';
            const windowFeatures = "width=300,height=400";
            const windowName = "AppDisplayTest";
            this.newWindow = window.open(url, windowName, windowFeatures);
            this.getNewAppWindow().console = console;
            this.logDebug("opened the one and only pop-up window: ", this.newWindow, ", at url: ", url, "test");
        }
    }

    resetTheTestAppWindow() {
        // This is a cheat to create a "new singleton" so that we get a fresh AppDisplay.
        this.logDebug("calling resetSingletonObject.  newAppWindow:", this.getNewAppWindow(), "test");
        this.getNewAppWindow().theAppDisplay.resetSingletonObject();
        this.gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;
    }

    runAppTest(testFunc) {
        // clear cookies and reset the window with a known daily puzzle and a hard-coded practice puzzle.
        Persistence.clearAllNonDebug();
        Persistence.saveTestEpochDaysAgo(Test.TEST_EPOCH_DAYS_AGO);
        Persistence.saveTestPracticeGameWords("TEST", "PILOT");
        this.resetTheTestAppWindow();
        this.runFunc(testFunc);
    }

    // utility to run a member function on this, given the raw function object (without this).
    runFunc(func) {
        const boundFunc = func.bind(this);
        boundFunc();
    }

    // playLettter, deleteLetter, and insertLetter all require the attribute this.gameDisplay to be set to
    // the active GameDisplay (Practice or Daily).
    // If the app is in ConfirmationMode, we will click twice here to confirm.
    // If the optionalLetter is different from letter, it indicates that the user
    // first selects the optionLetter, then letter, then confirms letter.
    //
    // returns
    //   Const.OK if the letter is changed
    //   Const.UNEXPECTED_ERROR if app is in ConfirmationMode but picker doesn't return NEEDS_CONFIRMATION on first click
    //   some other error if the picker.selectionCallback fails


    playLetter(position, letter, optionalLetter=letter) {
        this.logDebug(`playLetter(${position}, ${letter}, ${optionalLetter})`, "test");
        this.gameDisplay.letterPicker.saveLetterPosition(position);
        var optionalLetterButton = null;
        if (optionalLetter != letter) {
            // we are testing a 'user changed their mind' case, where first optionalLetter is clicked,
            // then letter, then letter is confirmed.
            if (!this.gameDisplay.isConfirmationMode()) {
                this.logDebug("playLetter() was given an optional letter but the game is not in ConfirmationMode.  This is a bad test.", "test");
                return Const.UNEXPECTED_ERROR;
            }
            optionalLetterButton = this.gameDisplay.letterPicker.getButtonForLetter(optionalLetter);
            const mockEvent = new MockEvent(optionalLetterButton);
            const optionalClickRes = this.gameDisplay.letterPicker.selectionCallback(mockEvent);
            if (optionalClickRes != Const.NEEDS_CONFIRMATION) {
                this.logDebug("optional click got ", optionalClickRes, " instead of ", Const.NEEDS_CONFIRMATION, "test");
                return Const.UNEXPECTED_ERROR;
            }
            if (!ElementUtilities.hasClass(optionalLetterButton, Const.UNCONFIRMED_STYLE)) {
                this.logDebug("optional letter-button 'class' after first selecting should have ", Const.UNCONFIRMED_STYLE, "test");
                return Const.UNEXPECTED_ERROR;
            }
        }

        // at this point, if we have an optional letter, it was selected above and needs confirmation.  Instead,
        // we select and confirm the intended letter button.

        const realButton = this.gameDisplay.letterPicker.getButtonForLetter(letter);
        const mockEvent = new MockEvent(realButton);
        if (this.gameDisplay.isConfirmationMode()) {
            const firstClickRes = this.gameDisplay.letterPicker.selectionCallback(mockEvent);
            if (firstClickRes != Const.NEEDS_CONFIRMATION) {
                this.logDebug("got ", firstClickRes, " instead of ", Const.NEEDS_CONFIRMATION, "test");
                return Const.UNEXPECTED_ERROR;
            }
            // validate that realButton is unconfirmed
            if (!ElementUtilities.hasClass(realButton, Const.UNCONFIRMED_STYLE)) {
                this.logDebug("realButton class after first selecting should have ", Const.UNCONFIRMED_STYLE, "test");
                return Const.UNEXPECTED_ERROR;
            }

            if (optionalLetterButton != null) {
                if (!ElementUtilities.hasClass(optionalLetterButton, Const.UNSELECTED_STYLE)) {
                    this.logDebug("optional-button class after first selecting should have ", Const.UNSELECTED_STYLE, "test");
                    return Const.UNEXPECTED_ERROR;
                }
            }
        }

        const rc = this.gameDisplay.letterPicker.selectionCallback(mockEvent);
        if (!ElementUtilities.hasClass(realButton, Const.UNSELECTED_STYLE)) {
            this.logDebug("realButton class after first selecting should have ", Const.UNSELECTED_STYLE, "test");
            return Const.UNEXPECTED_ERROR;
        }
        this.logDebug("final click returns: ", rc, "test");
        return rc;
    }

    deleteLetter(position, optionalPosition=position) {
        this.logDebug(`deleteLetter(${position}, ${optionalPosition})`, "test");

        const changesMind = (position != optionalPosition);
        var mockOptionalDeleteButton = null;
        if (changesMind) {
            //pre-click the optional position deletion button
            if (!this.gameDisplay.isConfirmationMode()) {
                this.logDebug("deleteLetter() was given an optional position but the game is not in ConfirmationMode.  This is a bad test.", "test");
                return Const.UNEXPECTED_ERROR;
            }
            mockOptionalDeleteButton = new MockEventSrcElement(this.gameDisplay);
            ElementUtilities.addClass(mockOptionalDeleteButton, Const.UNSELECTED_STYLE);
            mockOptionalDeleteButton.setAttribute("deletionPosition", optionalPosition.toString());
            const mockEvent = new MockEvent(mockOptionalDeleteButton);
            const optionalClickRes  = this.gameDisplay.deletionClickCallback(mockEvent);
            if (optionalClickRes != Const.NEEDS_CONFIRMATION) {
                this.logDebug("got ", optionalClickRes, " instead of ", Const.NEEDS_CONFIRMATION, "test");
                return Const.UNEXPECTED_ERROR;
            }
            if (!ElementUtilities.hasClass(mockOptionalDeleteButton, Const.UNCONFIRMED_STYLE)) {
                this.logDebug("mock optional delete-button  class after selecting should have ", Const.UNCONFIRMED_STYLE, "test");
                return Const.UNEXPECTED_ERROR;
            }
        }
        // the srcElement here is a 'deletion' button.
        const mockDeleteButton = new MockEventSrcElement(this.gameDisplay);
        ElementUtilities.addClass(mockDeleteButton, Const.UNSELECTED_STYLE);
        mockDeleteButton.setAttribute("deletionPosition", position.toString());

        const mockEvent = new MockEvent(mockDeleteButton);

        if (this.gameDisplay.isConfirmationMode()) {
            const firstClickRes  = this.gameDisplay.deletionClickCallback(mockEvent);
            if (firstClickRes != Const.NEEDS_CONFIRMATION) {
                this.logDebug("got ", firstClickRes, " instead of ", Const.NEEDS_CONFIRMATION, "test");
                return Const.UNEXPECTED_ERROR;
            }
            if (changesMind) {
                // check that the optional delete button has been reset to unselected
                if (!ElementUtilities.hasClass(mockOptionalDeleteButton, Const.UNSELECTED_STYLE)) {
                    this.logDebug("mock optional delete-button class after changing mind should have ", Const.UNSELECTED_STYLE, "test");
                    return Const.UNEXPECTED_ERROR;
                }
            }
            if (!ElementUtilities.hasClass(mockDeleteButton, Const.UNCONFIRMED_STYLE)) {
                this.logDebug("mock delete-button class after first press should have ", Const.UNCONFIRMED_STYLE, "test");
                return Const.UNEXPECTED_ERROR;
            }
        }

        const rc = this.gameDisplay.deletionClickCallback(mockEvent);
        if (!ElementUtilities.hasClass(mockDeleteButton, Const.UNSELECTED_STYLE)) {
            this.logDebug("mock delete-button class after final press should have ", Const.UNSELECTED_STYLE, "test");
            return Const.UNEXPECTED_ERROR;
        }
        this.logDebug("final click returns: ", rc, "test");
        return rc;
    }

    insertLetter(position, letter, optionalPosition=position) {
        const changesMind = position != optionalPosition;
        this.logDebug(`insertLetter(${position}, ${letter}, ${optionalPosition})`, "test");

        var mockOptionalInsertButton = null;
        if (changesMind) {
            if (!this.gameDisplay.isConfirmationMode()) {
                this.logDebug("insertLetter() was given an optional position but the game is not in ConfirmationMode.  This is a bad test.", "test");
                return Const.UNEXPECTED_ERROR;
            }
            mockOptionalInsertButton = new MockEventSrcElement(this.gameDisplay);
            mockOptionalInsertButton.setAttribute("additionPosition", optionalPosition.toString());
            ElementUtilities.addClass(mockOptionalInsertButton, Const.UNSELECTED_STYLE);
            const mockEvent = new MockEvent(mockOptionalInsertButton);
            const optionalClickRes = this.gameDisplay.additionClickCallback(mockEvent);
            if (optionalClickRes != Const.NEEDS_CONFIRMATION) {
                this.logDebug("got ", optionalClickRes, " instead of ", Const.NEEDS_CONFIRMATION, "test");
                return Const.UNEXPECTED_ERROR;
            }
            if (!ElementUtilities.hasClass(mockOptionalInsertButton, Const.UNCONFIRMED_STYLE)) {
                this.logDebug("mock optional insert-button class after first press should have ", Const.UNCONFIRMED_STYLE, "test");
                return Const.UNEXPECTED_ERROR;
            }
        }

        const mockInsertButton = new MockEventSrcElement(this.gameDisplay);
        mockInsertButton.setAttribute("additionPosition", position.toString());
        ElementUtilities.addClass(mockInsertButton, Const.UNSELECTED_STYLE);
        const mockEvent = new MockEvent(mockInsertButton);

        if (this.gameDisplay.isConfirmationMode()) {
            const firstClickRes = this.gameDisplay.additionClickCallback(mockEvent);
            if (firstClickRes != Const.NEEDS_CONFIRMATION) {
                this.logDebug("got ", firstClickRes, " instead of ", Const.NEEDS_CONFIRMATION, "test");
                return Const.UNEXPECTED_ERROR;
            }
            if (!ElementUtilities.hasClass(mockInsertButton, Const.UNCONFIRMED_STYLE)) {
                this.logDebug("mock insert-button class after first press should have ", Const.UNCONFIRMED_STYLE, "test");
                return Const.UNEXPECTED_ERROR;
            }
            if (changesMind) {
                if (!ElementUtilities.hasClass(mockOptionalInsertButton, Const.UNSELECTED_STYLE)) {
                    this.logDebug("mock optional insert-button class after re-press should have ", Const.UNSELECTED_STYLE, "test");
                    return Const.UNEXPECTED_ERROR;
                }
            }
        }

        const clickResult = this.gameDisplay.additionClickCallback(mockEvent);
        if (clickResult != Const.OK) {
            this.logDebug("got ", clickResult, " instead of ", Const.OK, "test");
            return clickResult;
        }
        if (!ElementUtilities.hasClass(mockInsertButton, Const.UNSELECTED_STYLE)) {
            this.logDebug("mock insert-button class after last press should have ", Const.UNSELECTED_STYLE, "test");
            return Const.UNEXPECTED_ERROR;
        }
        // At this point, if we are not in confirmation mode, we have clicked once to add the new position.
        // If we are in confirmation mode, we have already clicked twice successfully
        // So we can now play the letter.

        let playResult = this.playLetter(position+1, letter);
        this.logDebug("insertLetter(", position, ",", letter, ") returns: ", clickResult, " then ", playResult,  "test");
        return playResult;
    }

    // This plays the known daily game for day 2.  No status of whether or not it worked.  It is useful for
    // tests that need multiple game instances to test stats.
    //

    playTheCannedDailyGameOnce() {

        // SHORT -> POOR
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR

        this.playLetter(4, "O"); // SHORT -> SHOOT
        this.deleteLetter(1);    // SHOOT -> HOOT
        this.playLetter(1, "B"); // HOOT -> BOOT
        this.playLetter(4, "R"); // BOOT -> BOOR
        this.playLetter(1, "P"); // BOOR -> POOR
    }

    // compares the current stats cookie and stats screen content with expected and calculated values.
    // Also, asserts that gamesStarted >= gamesWon+gamesLost

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

        // the statsContainer is a GUI element with at least 3 children: Played, Won and Lost
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
        let expPlayedText = `${expDailyStats.gamesStarted}\nStarted`;
        let actPlayedText = statsContainer.children[0].innerText.trim();

        let completionPercent = 0;
        if (dailyStats.gamesStarted > 0) {
        }

        let expWonText = `${dailyStats.gamesWon}\nWon`;
        let actWonText = statsContainer.children[1].innerText.trim();

        let expLostText = `${expDailyStats.gamesLost}\nLost`;
        let actLostText = statsContainer.children[2].innerText.trim();

        let testRes =
            this.verify(actContainerLen==expContainerLen, `expected statsContainer.children.length==${expContainerLen}, got ${actContainerLen} THIS IS A TESTING ANOMOLY - unexpected DOM contents`) &&
            this.verify(actDistributionLen==expDistributionLen, `expected statsDistribution.children.length==${expDistributionLen}, got ${actDistributionLen} THIS IS A TESTING ANOMOLY - unexpected DOM contents`) &&
            this.verify(dailyStats.gamesStarted==expDailyStats.gamesStarted, `expected dailyStats.gamesStarted==${expDailyStats.gamesStarted}, got ${dailyStats.gamesStarted}`) &&
            this.verify(dailyStats.gamesWon==expDailyStats.gamesWon, `expected dailyStats.gamesWon==${expDailyStats.gamesWon}, got ${dailyStats.gamesWon}`) &&
            this.verify(dailyStats.gamesShown==expDailyStats.gamesShown, `expected dailyStats.gamesShown==${expDailyStats.gamesShown}, got ${dailyStats.gamesShown}`) &&
            this.verify(dailyStats.gamesLost==expDailyStats.gamesLost, `expected dailyStats.gamesLost==${expDailyStats.gamesLost}, got ${dailyStats.gamesLost}`) &&
            this.verify(actPlayedText==expPlayedText, `expected statsContainer.children.0.innerText==${expPlayedText}, got ${actPlayedText}`) &&
            this.verify(dailyStats.gamesStarted >= dailyStats.gamesWon + dailyStats.gamesLost, `assertion failed: #started not >= #won+#lost`);

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
            this.verify(!tinyDict.isWord("PEACH"), "PEACH is a word") &&
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
        const expectedMinDictSize = 15849;

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
        this.testGameUsingDodoMove();
        this.testGameRequiringWordReplay();
        this.testGameRequiringScrabbleWordReplay();
        this.testGameFinish();
        this.testGameFinishAlternatePath();
        this.testGameLossOnWrongLetterAdded();
        this.testGameLossOnWrongDelete();
        this.testGameLossOnWrongLetterChange();
        this.testGameSolveAllDailyGames();
        const endTestTime = Date.now();
        this.logDebug(`game tests elapsed time: ${endTestTime - startTestTime} ms`, "test");
    }

    testGameSolveAllDailyGames() {
        this.testName = "GameSolveAllDailyGames";
        for (let wordPair of DailyGameDisplay.GameWords) {
            let [start, target] = wordPair;
            const steps = [];
            const game = new Game(start, target, steps);
            const solution = game.remainingSteps;
            if (!this.verify(solution.isSolved(), `daily puzzle ${start}->${target} has no solution!`)) {
                return; // short-circuit the test if any puzzle fails.
            }
        }
        this.success();
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
        const game = new Game("BAD", "CAT", steps, smallDict);  // BAD BAT CAT
        const origWord1 = game.remainingSteps.getNthWord(0);

        if ( !(this.verify((origWord1 === "BAT"), "original solution should have BAT as first word") &&
        // "bade" is not in the original solution
            this.verify(! origSolution.getSolutionWords().includes('BADE'), "Original solution should not have 'BADE'"))) return;

        const playAddResult = game.playAdd(3);
        if (!this.verify((playAddResult === Const.OK), "playAdd(3) not OK")) return;

        const playLetterResult = game.playLetter(4, "E");  // BAD BADE (BATE BAT CAT) or (BAD BAT CAT)
        if (!this.verify((playLetterResult === Const.DODO_MOVE), `playLetter(4, E) returns ${playLetterResult}, not DODO_MOVE`)) return;
        this.logDebug("After playLetter(4,E), game.remainingSteps are:" + game.remainingSteps.toStr(), "test");
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

    testGameUsingDodoMove() {
        this.testName = "GameUsingDodoMove";
        const steps = [];
        const game = new Game("PLANE", "PANED", steps); // shortest solution is PLANE,PANE,PANED
                                                        // but dodo move is PLANE,PLAN,PAN,PANE,PANED

        const planeToPlanResult = game.playDelete(5); // PLANE to PLAN; the dodo move
        if (!this.verify((planeToPlanResult === Const.DODO_MOVE), `playDelete(5) expected DODO_MOVE, got ${planeToPlanResult}`)) return;

        const planToPanResult = game.playDelete(2); // PLAN to PAN; correct
        if (!this.verify((planToPanResult === Const.OK), "playDelete(2) not OK")) return;

        const panToPaneAddResult = game.playAdd(3); // PAN to PANx; correct
        if (!this.verify((panToPaneAddResult === Const.OK), "playAdd(3) not OK")) return;

        const panToPaneChangeResult = game.playLetter(4, "E"); // PAN to PANE; correct
        if (!this.verify((panToPaneChangeResult === Const.OK), `playLetter(4, E) returns ${panToPaneChangeResult}, not WRONG_MOVE`)) return;

        const paneToPanedAddResult = game.playAdd(4); // PANE to PANEx; correct
        if (!this.verify((paneToPanedAddResult === Const.OK), "playAdd(4) not OK")) return;

        const paneToPanedChangeResult = game.playLetter(5, "D"); // PANE to PANED; correct
        if (!this.verify((paneToPanedChangeResult === Const.OK), `playLetter(5, E) returns ${paneToPanedChangeResult}, not WRONG_MOVE`)) return;

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
        this.verify((blissToBlipsResult === Const.DODO_MOVE), `playLetter(4,P) expected ${Const.DODO_MOVE}, got ${blissToBlipsResult}`) &&
        this.verify((displayInstructions.length === expectedDisplayLength),
                `expected display instructions length=${expectedDisplayLength}, got ${displayInstructions.length}`) &&
        this.success();
    }

    testGameRequiringScrabbleWordReplay() {
        this.testName = "GameRequiringScrabbleWordReplay";
        const steps = [];
        const game = new Game("FREE", "SAMPLE", steps);
        // FREE, FEE, FIE, FILE, MILE, SMILE, SIMILE, SIMPLE, SAMPLE 9 instructions
        // playing FREE FEE FIE FILE SILE(scrabble-only) SIDLE (wrong) should give display instructions:
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
        this.verify((result === Const.DODO_MOVE), `playing add 'D' at 2 expected: ${Const.DODO_MOVE}, got: ${result}`) &&
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
        const originalSolutionAsString = game.getOriginalSolutionWords();
        const playedSolutionAsString = game.getUserSolutionWords();
        const expOriginalSolutionAsString = "SCAD⇒CAD⇒BAD⇒BAT";
        const expPlayedSolutionAsString = "SCAD⇒CAD⇒BAD⇒BAT";
        this.verify((playResult === Const.OK), "Word played not OK") &&
            this.verify((displayInstructionsAfterFinish.length === 4), `after finishGame(), expected 4 display instructions, got ${displayInstructionsAfterFinish.length}`) &&
            this.verify((originalSolutionAsString == expOriginalSolutionAsString), `expected original string ${expOriginalSolutionAsString}, got ${originalSolutionAsString}`) &&
            this.verify((playedSolutionAsString == expPlayedSolutionAsString), `expected played string ${expPlayedSolutionAsString}, got ${playedSolutionAsString}`) &&
            this.verify(game.isOver()) &&
            this.success();
    }

    testGameFinishAlternatePath() {
        this.testName = "GameFinishAlternatePath";

        const steps = [];
        const game = new Game("LEAKY", "SPOON", steps, this.fullDict);
        var result;
        result = game.playDelete(5);
        result = game.playLetter(4,"N");
        result = game.playLetter(2,"O");
        result = game.playLetter(3,"O");
        // next 3 give .. POON->SPOON
        result = game.playLetter(1,"P");
        result = game.playAdd(0);
        result = game.playLetter(1,"S");
        // next 3 give .. SOON->SPOON
        /*
        result = game.playLetter(1,"S");
        result = game.playAdd(1);
        result = game.playLetter(2,"P");
        */
        const originalSolutionAsString = game.getOriginalSolutionWords();
        const playedSolutionAsString = game.getUserSolutionWords();
        const expOriginalSolutionAsString = "LEAKY⇒LEAK⇒LEAN⇒LOAN⇒LOON⇒SOON⇒SPOON";
        const expPlayedSolutionAsString = "LEAKY⇒LEAK⇒LEAN⇒LOAN⇒LOON⇒POON⇒SPOON";
        this.verify((originalSolutionAsString == expOriginalSolutionAsString), `expected original string ${expOriginalSolutionAsString}, got ${originalSolutionAsString}`) &&
            this.verify((playedSolutionAsString == expPlayedSolutionAsString), `expected played string ${expPlayedSolutionAsString}, got ${playedSolutionAsString}`) &&
            this.verify(game.isOver()) &&
            this.success();
    }

    testGameLossOnWrongLetterChange() {
        this.testName = "GameLossOnWrongLetterChange";
        const game = new Game("SALTED", "FISH");
        let r1 = game.playDelete(3);      // -> SATED
        let r2 = game.playLetter(1, "F"); // -> FATED
        let r3 = game.playDelete(5);      // -> FATE
        let r4 = game.playDelete(4);      // -> FAT
        let r5 = game.playAdd(1);         // -> F_AT
        let r6 = game.playLetter(2, "L"); // -> FLAT wrong
        let r7 = game.playLetter(2, "R"); // -> FRAT wrong
        let r8 = game.playLetter(2, "E"); // -> FEAT wrong
        let r9 = game.playLetter(3, "L"); // -> FELT wrong
        let r10 = game.playLetter(3, "E"); // -> FEET wrong
        let DIs = game.getDisplayInstructions();
        let DIsAsStrings = DIs.map((di) => di.toStr()).join(",<br>");
        let expectedDIsAsStrings =
            `(played,word:SALTED,moveRating:ok),<br>(played,word:SATED,moveRating:ok),<br>(played,word:FATED,moveRating:ok),<br>(played,word:FATE,moveRating:ok),<br>(played,word:FAT,moveRating:ok),<br>(played,word:FLAT,moveRating:${Const.WRONG_MOVE}),<br>(played,word:FRAT,moveRating:${Const.WRONG_MOVE}),<br>(played,word:FEAT,moveRating:${Const.WRONG_MOVE}),<br>(played,word:FELT,moveRating:${Const.WRONG_MOVE}),<br>(played,word:FEET,moveRating:${Const.WRONG_MOVE}),<br>(future,word:FEST,changePosition:2),<br>(future,word:FIST,changePosition:4),<br>(played,word:FISH,moveRating:${Const.WRONG_MOVE})`;
            this.verify(r1 == Const.OK, `expected r1=${Const.OK}, got ${r1}`) &&
                this.verify(r2 == Const.OK, `expected r2=${Const.OK}, got ${r2}`) &&
                this.verify(r3 == Const.OK, `expected r3=${Const.OK}, got ${r3}`) &&
                this.verify(r4 == Const.OK, `expected r4=${Const.OK}, got ${r4}`) &&
                this.verify(r5 == Const.OK, `expected r5=${Const.OK}, got ${r5}`) &&
                this.verify(r6 == Const.WRONG_MOVE, `expected r6=${Const.WRONG_MOVE}, got ${r6}`) &&
                this.verify(r7 == Const.WRONG_MOVE, `expected r7=${Const.WRONG_MOVE}, got ${r7}`) &&
                this.verify(r8 == Const.WRONG_MOVE, `expected r8=${Const.WRONG_MOVE}, got ${r8}`) &&
                this.verify(r9 == Const.WRONG_MOVE, `expected r9=${Const.WRONG_MOVE}, got ${r9}`) &&
                this.verify(r10 == Const.WRONG_MOVE, `expected r10=${Const.WRONG_MOVE}, got ${r10}`) &&
                this.verify(game.isOver(), "game should be over after too many wrong moves") &&
                this.verify(!game.isWinner(), "game should not be a winner after too many wrong moves") &&
                this.verify(DIsAsStrings == expectedDIsAsStrings, `expected DIs:<p>${expectedDIsAsStrings}<p>but got:<p>${DIsAsStrings}`) &&
                this.success();
    }

    testGameLossOnWrongLetterAdded() {
        this.testName = "GameLossOnWrongLetterAdded";
        const game = new Game("FISH", "SALTED");
        let r1 = game.playLetter(4, "T"); // -> FIST
        let r2 = game.playLetter(2, "E"); // -> FEST wrong
        let r3 = game.playLetter(2, "A"); // -> FAST
        let r4 = game.playDelete(3);      // -> FAT
        let r5 = game.playAdd(1);         // -> F_AT
        let r6 = game.playLetter(2, "R"); // -> FRAT dodo - requires undoing back to FAT
        let r7 = game.playDelete(2);      // -> FAT
        let r8 = game.playAdd(1);         // -> F_AT
        let r9 = game.playLetter(2, "E"); // -> FEAT dodo
        let r10 = game.playDelete(2);      // -> FAT
        let r11 = game.playAdd(1);         // -> F_AT
        let r12 = game.playLetter(2, "L"); // -> FLAT dodo
        let r13 = game.playDelete(2);      // -> FAT
        let r14 = game.playAdd(1);         // -> F_AT
        let r15 = game.playLetter(2, "L"); // -> FLAT dodo
        let DIs = game.getDisplayInstructions();
        let DIsAsStrings = DIs.map((di) => di.toStr()).join(",<br>");
        let expectedDIsAsStrings =
            `(played,word:FISH,moveRating:ok),<br>(played,word:FIST,moveRating:ok),<br>(played,word:FEST,moveRating:${Const.WRONG_MOVE}),<br>(played,word:FAST,moveRating:ok),<br>(played,word:FAT,moveRating:ok),<br>(played,word:FRAT,moveRating:${Const.DODO_MOVE}),<br>(played,word:FAT,moveRating:ok),<br>(played,word:FEAT,moveRating:${Const.DODO_MOVE}),<br>(played,word:FAT,moveRating:ok),<br>(played,word:FLAT,moveRating:${Const.DODO_MOVE}),<br>(played,word:FAT,moveRating:ok),<br>(played,word:FLAT,moveRating:${Const.DODO_MOVE}),<br>(future,word:FAT,changePosition:0),<br>(future,word:FATE,changePosition:0),<br>(future,word:FATED,changePosition:1),<br>(future,word:SATED,changePosition:0),<br>(played,word:SALTED,moveRating:${Const.WRONG_MOVE})`;

            this.verify(r1 == Const.OK, `expected r1=${Const.OK}, got ${r1}`) &&
                this.verify(r2 == Const.WRONG_MOVE, `expected r2=${Const.WRONG_MOVE}, got ${r2}`) &&
                this.verify(r3 == Const.OK, `expected r3=${Const.OK}, got ${r3}`) &&
                this.verify(r4 == Const.OK, `expected r4=${Const.OK}, got ${r4}`) &&
                this.verify(r5 == Const.OK, `expected r5=${Const.OK}, got ${r5}`) &&
                this.verify(r6 == Const.DODO_MOVE, `expected r6=${Const.DODO_MOVE}, got ${r6}`) &&
                this.verify(r7 == Const.OK, `expected r7=${Const.OK}, got ${r7}`) &&
                this.verify(r8 == Const.OK, `expected r8=${Const.OK}, got ${r8}`) &&
                this.verify(r9 == Const.DODO_MOVE, `expected r9=${Const.DODO_MOVE}, got ${r9}`) &&
                this.verify(r10 == Const.OK, `expected r10=${Const.OK}, got ${r10}`) &&
                this.verify(r11 == Const.OK, `expected r11=${Const.OK}, got ${r11}`) &&
                this.verify(r12 == Const.DODO_MOVE, `expected r12=${Const.DODO_MOVE}, got ${r12}`) &&
                this.verify(r13 == Const.OK, `expected r13=${Const.OK}, got ${r13}`) &&
                this.verify(r14 == Const.OK, `expected r14=${Const.OK}, got ${r14}`) &&
                this.verify(r15 == Const.DODO_MOVE, `expected r15=${Const.DODO_MOVE}, got ${r15}`) &&
                this.verify(game.isOver(), "game should be over after too many wrong moves") &&
                this.verify(!game.isWinner(), "game should not be a winner after too many wrong moves") &&
                this.verify(DIsAsStrings == expectedDIsAsStrings, `expected DIs:<p>${expectedDIsAsStrings}<p>but got:<p>${DIsAsStrings}`) &&
                this.success();
    }


    testGameLossOnWrongDelete() {
        this.testName = "GameLossOnWrongDelete";
        const game = new Game("SALTED", "FISH");
        game.playDelete(3);      // -> SATED
        game.playLetter(1, "D"); // -> DATED
        game.playDelete(5);      // -> DATE
        game.playLetter(1, "M"); // -> MATE
        game.playLetter(1, "R"); // -> RATE
        game.playLetter(1, "L"); // -> LATE
        game.playLetter(1, "F"); // -> FATE
        game.playDelete(1);      // -> ATE  too many wrong moves

        let DIs = game.getDisplayInstructions();
        let DIsAsStrings = DIs.map((di) => di.toStr()).join(",<br>");
        let expectedDIsAsStrings =
            `(played,word:SALTED,moveRating:ok),<br>(played,word:SATED,moveRating:ok),<br>(played,word:DATED,moveRating:${Const.WRONG_MOVE}),<br>(played,word:DATE,moveRating:ok),<br>(played,word:MATE,moveRating:${Const.WRONG_MOVE}),<br>(played,word:RATE,moveRating:${Const.WRONG_MOVE}),<br>(played,word:LATE,moveRating:${Const.WRONG_MOVE}),<br>(played,word:FATE,moveRating:ok),<br>(played,word:ATE,moveRating:${Const.DODO_MOVE}),<br>(future,word:FATE,changePosition:0),<br>(future,word:FAT,changePosition:0),<br>(future,word:FAST,changePosition:2),<br>(future,word:FIST,changePosition:4),<br>(played,word:FISH,moveRating:${Const.WRONG_MOVE})`
            this.verify(game.isOver(), "game should be over after too many wrong moves") &&
            this.verify(!game.isWinner(), "game should not be a winner after too many wrong moves") &&
            this.verify(DIsAsStrings == expectedDIsAsStrings, `expected DIs:<p>${expectedDIsAsStrings}<p>but got:<p>${DIsAsStrings}`) &&
            this.success();
    }

    /*
    ** App Tests
    ** App tests need to be run one after the other, pausing to wait for the app window to display, etc.
    ** These tests use the utilities in the App Testing Framework section, above.
    **
    */

    runAppTests() {

        let newWindow = this.getNewAppWindow();
        if (!(newWindow && newWindow.localStorage && newWindow.theAppDisplayIsReady)) {
            this.openTheTestAppWindow();
            this.logDebug("app test window isn't ready yet; will try again.", "test");
            inTheFuture(1000).then( (foo=this) => {foo.runAppTests()} )
            return;
        }
        this.logDebug("window for App tests is ready.", "test");
        this.appTestList = [
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
                this.practiceGameTestNoConfirm,
                this.practiceGameLimitTest,
                this.geniusMoveAndShareTest,
                this.cookieRestartTest,
                this.changeMindOnSelectedLettersTest,
        ];

        this.runTheNextTest();
    }

    // runTheNextTest() iterates through all the test functions in this.appTestList,
    // running one test each time it is called, then scheduling the next test shortly
    // ahead in the future.  This gives the javascript event loop a chance to execute
    // other tasks in between each test, such as showing the screen changes.

    runTheNextTest() {
        const appTestFunc = this.appTestList.shift();
        if (appTestFunc) {
            const testFuncName = appTestFunc.toString().split(' ')[0];
            this.logDebug("!! running appTest=", testFuncName, "test");
            const testStart = Date.now();
            this.runAppTest(appTestFunc);
            const testDone = Date.now();
            this.logDebug(testFuncName, " took ", testDone - testStart, " ms", "test");
            inTheFuture(100).then( (foo=this) => {foo.runTheNextTest()})
        } else {
            this.logDebug("no more tests to run - showing results", "test");
            this.closeTheTestAppWindow();
            this.showResults();
        }
    }

    // confirmation is a function of the GameDisplay so to test it we need to be playing a game
    changeMindOnSelectedLettersTest() {
        this.testName = "changeMindOnSelectedLetters";
        // SHORT -> POOR
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR
        // but we play  SHORT SHOOT SHOT HOT POT POO POOR
        const changeLetterResult1 = this.playLetter(4, "O", "Z"); // SHORT -> SHOZT not confirmed -> SHOOT confirmed
        const deleteLetterResult1 = this.deleteLetter(3,5);       // SHOOT -> SHOO not confirmed -> SHOT confirmed
        const deleteLetterResult2 = this.deleteLetter(1);         // SHOT -> HOT  we are deleting even though not really a display option on this step.
        const changeLetterResult2 = this.playLetter(1, "P");      // HOT -> POT
        const changeLetterResult3 = this.playLetter(3, "O");      // POT -> POO
        const insertLetterResult1 = this.insertLetter(3, "R", 0);  // POO -> xPOO change mind -> POOx -> POOR
        this.verify(changeLetterResult1 == Const.OK, "after changing mind from Z to O, expected: ", Const.OK, " got: ", changeLetterResult1) &&
            this.verify(deleteLetterResult1 == Const.WRONG_MOVE, "after changing mind from HOOT to SHOT, expected: ", Const.WRONG_MOVE, " got: ", deleteLetterResult1) &&
            this.verify(deleteLetterResult2 == Const.OK, "after SHOT to HOT, expected: ", Const.OK, " got: ", deleteLetterResult2) &&
            this.verify(changeLetterResult2 == Const.OK, "after HOT to POT, expected: ", Const.OK, " got: ", changeLetterResult1) &&
            this.verify(changeLetterResult3 == Const.OK, "after POT to POO, expected: ", Const.OK, " got: ", changeLetterResult1) &&
            this.verify(insertLetterResult1 == Const.OK, "after changing mind from POO ->  xPOO to POOx->POOR, expected: ", Const.OK, " got: ", insertLetterResult1) &&
            this.success();
    }

    // start playing daily game for day 2, and then continue on day 3.  It should be a new, unplayed game.
    dailyGameUnfinishedRestartNextDayTest() {
        this.testName = "DailyGameUnfinishedRestartNextDay";
        // SHORT -> POOR
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR
        // play two moves, then close and try to restore ...
        this.playLetter(4, "O"); // SHORT -> SHOOT
        this.deleteLetter(1);    // SHOOT -> HOOT

        // re-open the app window, as if it were one day later
        const expGameNumber = Test.TEST_EPOCH_DAYS_AGO + 1;
        Persistence.saveTestEpochDaysAgo(expGameNumber);
        this.resetTheTestAppWindow();

        let [start, target, gameNumber] = [this.gameDisplay.startWord, this.gameDisplay.targetWord, this.gameDisplay.dailyGameNumber];
        let [expStart, expTarget] = DailyGameDisplay.GameWords[3];
        this.verify(start == expStart, "After restart, expected start word: ", expStart, ", got: ", start) &&
            this.verify(target == expTarget, "After restart, expected target word: ", expTarget, ", got: ", target) &&
            this.verify(gameNumber == expGameNumber, "Expected daily game number", expGameNumber, " after restarting next day, got", gameNumber) &&
            this.success();
    }

    dailyGameNormalFinishStatsTest() {
        this.testName = "DailyGameNormalFinishStats";

        // The newly opened URL should be showing the test daily game by default;
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
        expDailyStats.gamesStarted = 1;
        expDailyStats.gamesWon = 1;
        expDailyStats[0] = 1;  // the only completed game has 0 errors

        let testResults = this.verifyStats(expDailyStats);

        // now, get and check the share string:

        let actShareString = statsDisplay.shareCallback(statsMockEvent);
        let expShareString = `WordChain #${Test.TEST_EPOCH_DAYS_AGO} ⭐\n\n🟪🟪🟪🟪🟪\n🟩🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟪🟪🟪🟪`;
        testResults &&
            this.verify((actShareString.indexOf(expShareString) === 0), `expected share string=='${expShareString}', got '${actShareString}'`) &&
            this.verify((actShareString.indexOf(Const.URL_ROOT) > 0), `expected to see url root ${Const.URL_ROOT} in share string, got '${actShareString}'`) &&
            this.success();
    }

    // multiGameStatsTest plays the daily game 3 times and
    // then checks both the stats cookie, and the elements in the StatsContainer.

    multiGameStatsTest() {
        this.testName = "MultiGameStats";
        // play the already opened game:
        this.playTheCannedDailyGameOnce(); // this runs in-line.  When it finishes, the game is actually done

        for (let gameCounter = 0; gameCounter <= 1; gameCounter++) {
            // Re-open open the test window, and repeat
            // Don't let the game pick up where it left off, which is a finished game.
            // Don't clear all the cookies because we are accumulating stats data with them across games here.
            Persistence.clearDailyGameNumber();
            this.resetTheTestAppWindow();
            this.playTheCannedDailyGameOnce(); // this runs in-line.  When it finishes, the game is actually done
        }

        // create an expected DailyStats blob
        let expDailyStats = DailyGameDisplay.NewDailyStatsBlob();
        expDailyStats.gamesStarted = 3;
        expDailyStats.gamesWon = 3;
        expDailyStats[0] = 3;  // all 3 games have 0 errors
        this.verifyStats(expDailyStats) && this.success();
    }


    // a test that makes 0, 1, or 2 errors depending on which iteration

    multiGameMixedResultsStatsTest() {
        this.testName = "MultiGameMixedResultsStats";

        for (let gameCounter = 0; gameCounter <= 2; gameCounter++) {
            // game: SHORT -> POOR
            this.playLetter(4, "O"); // SHORT -> SHOOT
            this.deleteLetter(1);    // SHOOT -> HOOT
            this.playLetter(1, "B"); // HOOT -> BOOT
                                     // optionally add one or two wrong moves on the last letter
            if (gameCounter >= 1) {
                this.playLetter(4, "K"); // BOOT -> BOOK mistake
            }
            if (gameCounter >= 2) {
                this.playLetter(4, "B"); // BOO? -> BOOB another mistake
            }
            this.playLetter(4, "R"); // BOO? -> BOOR
            this.playLetter(1, "P"); // BOO? -> POOR
            // now, play the same game again, if we have another round to go.
            if (gameCounter != 2) {
                Persistence.clearDailyGameNumber();
                this.resetTheTestAppWindow();
            }
        }

        // create the expected daily stats blob
        let expDailyStats = DailyGameDisplay.NewDailyStatsBlob();
        expDailyStats.gamesStarted = 3;
        expDailyStats.gamesWon = 3;
        expDailyStats[0] = 1;
        expDailyStats[1] = 1;
        expDailyStats[2] = 1;
        this.verifyStats(expDailyStats) && this.success();
    }

    // multiIncompleteGameStatsTest plays the daily game 3 times:
    // one failed, one successful, one incomplete and the solution shown.
    // Checks both the stats cookie, and the elements in the StatsContainer.

    multiIncompleteGameStatsTest() {
        this.testName = "MultiIncompleteGameStats";
        for (let gameCounter = 0; gameCounter <= 2; gameCounter++) {
            this.logDebug("multiIncompleteGameStatsTest() gameCounter: ", gameCounter, "test");
            if (gameCounter == 2) {
                // play a failed game
                this.playLetter(4, "O"); // SHORT -> SHOOT
                this.deleteLetter(1);    // SHOOT -> HOOT
                this.playLetter(1, "B"); // HOOT -> BOOT
                this.playLetter(1, "S"); // BOOT -> SOOT error
                this.playLetter(1, "T"); // SOOT -> TOOT error
                this.playLetter(1, "R"); // TOOT -> ROOT error
                this.playLetter(1, "L"); // ROOT -> LOOT error
                this.playLetter(1, "R"); // LOOT -> ROOT error
            } else if (gameCounter == 1) {
                // play a full game
                this.playTheCannedDailyGameOnce();
            } else if (gameCounter == 0) {
                // play an incomplete game and request the solution
                // game: SHORT -> POOR
                this.playLetter(4, "O"); // SHORT -> SHOOT
                this.deleteLetter(1);    // SHOOT -> HOOT
                this.playLetter(1, "B"); // HOOT -> BOOT
                                         // give up - show the solution
                this.gameDisplay.showSolution();
            }
            if (gameCounter != 2) {
                Persistence.clearDailyGameNumber();
                this.resetTheTestAppWindow();
            }
        }

        // create and verify an expected DailyStats blob
        let expDailyStats = DailyGameDisplay.NewDailyStatsBlob();
        expDailyStats.gamesStarted = 3;
        expDailyStats.gamesLost = 1;
        expDailyStats.gamesWon = 1;
        expDailyStats[0] = 1;  // complete game has 0 errors
        expDailyStats[Const.TOO_MANY_WRONG_MOVES] = 1;  // failed game has TOO_MANY_WRONG_MOVE errors
        this.verifyStats(expDailyStats) && this.success();
    }

    dailyGameShowSolutionTest() {
        // we verify the following
        // DailyStats has 1 played, 0 completed, 1 shown, 0 failed
        // You can't play the daily game again if cookies are not cleared.

        this.testName = "DailyGameShowSolution";

         // The newly opened URL should be showing the test daily game by default:

        // SHORT -> POOR
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR

        this.playLetter(4, "O"); // SHORT -> SHOOT
        this.gameDisplay.showSolution();
        this.resetTheTestAppWindow();

        // create an expected DailyStats blob
        let expDailyStats = DailyGameDisplay.NewDailyStatsBlob();
        // stats are zero by default
        expDailyStats.gamesStarted = 1;
        let testResults = this.verifyStats(expDailyStats);
        this.logDebug("finishDailyGameShowSolutionTest testResults: ", testResults, "test");

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
    }

    dailyGameOneMistakeShareTest() {
        this.testName = "DailyGameOneMistakeShare";

        // The newly opened URL should be showing the test daily game by default:
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

        //  write the share string and verify it:
        // TODO: this only verifies the shareString contents, not whether the share is copied to clipboard or the devices
        // 'share' mechanism.  the clipboard.writeText() call is async, and the catch() clause doesn't
        // execute on error in the callpath of stats.Display.shareCallback().  The error is handled async; the call
        // to shareCallback() always returns the calculated shareString, NOT whether it was written to the clipboard.
        let actShareString = statsDisplay.shareCallback(statsMockEvent);
        let expShareString = `WordChain #${Test.TEST_EPOCH_DAYS_AGO} 1️⃣\n\n🟪🟪🟪🟪🟪\n🟩🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟥🟥🟥🟥\n🟩🟩🟩🟩\n🟪🟪🟪🟪`;

        this.verify((actShareString.indexOf(expShareString) === 0), `expected share string=='${expShareString}', got '${actShareString}'`) &&
            this.success();

    }

    dailyGameTooManyMistakesShareTest() {
        this.testName = "DailyGameTooManyMistakesShare";

        // The newly opened URL should be showing the test daily game by default:
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
        let expShareString = `WordChain #${Test.TEST_EPOCH_DAYS_AGO} 😖\n\n🟪🟪🟪🟪🟪\n🟩🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟥🟥🟥🟥\n🟥🟥🟥🟥\n🟥🟥🟥🟥\n🟥🟥🟥🟥\n🟥🟥🟥🟥\n🟪🟪🟪🟪`;

        this.verify((actShareString.indexOf(expShareString) === 0), `expected share string=='${expShareString}', got '${actShareString}'`) &&
            this.success();
    }

    dailyGameEndsOnDeleteShareTest() {
        this.testName = "DailyGameEndsOnDeleteShare";

        // We need to re-open the test window with a contrived daily game, not the default.
        Persistence.saveTestDailyGameWords("START", "END");
        this.resetTheTestAppWindow();

        // The newly re-opened URL should be showing the daily game START -> END
        const game = this.gameDisplay.game;
        const appDisplay = this.getNewAppWindow().theAppDisplay;

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
        let expShareString = `WordChain #${Const.TEST_DAILY_GAME_NUMBER} ⭐\n\n🟪🟪🟪🟪🟪\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟪🟪🟪`;

        this.verify((actShareString.indexOf(expShareString)===0), `expected share string=='${expShareString}', got '${actShareString}'`) &&
            this.success();
    }

    dailyGameRestartTest() {
        // The newly opened URL should be showing the daily game by default;
        this.testName = "DailyGameRestart";

        // known game should be SHORT -> POOR, the game number will be 2.
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR

        // play two moves, then close and try to restore ...
        this.playLetter(4, "O"); // SHORT -> SHOOT
        this.deleteLetter(1);    // SHOOT -> HOOT

        // re-open the app window
        this.resetTheTestAppWindow();
        // we should be running the daily game SHORT -> POOR with SHOOT, HOOT already played.
        const game = this.gameDisplay.game;
        const di = game.getDisplayInstructions();

        let resultsSoFar =
            this.verify((di.length == 6), `expected 6 display instructions after restore, got ${di.length}`) &&
            this.verify((di[0].toStr() === `(played,word:SHORT,moveRating:${Const.OK})`), `instruction[0] is ${di[0].toStr()}`) &&
            this.verify((di[1].toStr() === `(played,word:SHOOT,moveRating:${Const.OK})`), `instruction[1] is ${di[1].toStr()}`) &&
            this.verify((di[2].toStr() === "(change,word:HOOT,changePosition:1)"), `instruction[2] is ${di[2].toStr()}`) &&
            this.verify((di[3].toStr() === "(future,word:BOOT,changePosition:4)"), `instruction[3] is ${di[3].toStr()}`) &&
            this.verify((di[4].toStr() === "(future,word:BOOR,changePosition:1)"), `instruction[4] is ${di[4].toStr()}`) &&
            this.verify((di[5].toStr() === "(target,word:POOR)"), `instruction[5] is ${di[5].toStr()}`);

        if (resultsSoFar) {
            // finish the game. ( ... BOOT BOOR POOR)
            const playedB = this.playLetter(1, "B"); // HOOT -> BOOT
            const playedR = this.playLetter(4, "R"); // BOOT -> BOOR
            const playedP = this.playLetter(1, "P"); // BOOR -> POOR

            resultsSoFar = this.verify((playedB == Const.OK), `played B, got ${playedB}, not `, Const.OK) &&
                this.verify((playedR == Const.OK), `played R, got ${playedR}, not `, Const.OK) &&
                this.verify((playedP == Const.OK), `played P, got ${playedP}, not `, Const.OK);
        }

        // ... and close and re-open it after it is solved

        Persistence.saveTestEpochDaysAgo(Test.TEST_EPOCH_DAYS_AGO);
        this.resetTheTestAppWindow();
        if (resultsSoFar) {
            // game should be done; stats should be saved.
            const game = this.gameDisplay.game;
            this.logDebug("restored daily game after finishing it; display instructions are: ",
                    game.getDisplayInstructions(), "test");
            this.verify (game.isWinner(), "Expected gameisWinner() true, got: ", game.isWinner()) &&
                this.success();
        }
    }

    dailyGameRestartAfterDohTest() {
        this.testName = "DailyGameRestartAfterDoh";

        // when opened with epoch two days ago, the daily game will always
        // be SHORT -> POOR
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR

        // play two moves, then close and try to restore ...
        this.playLetter(4, "O"); // SHORT -> SHOOT
        this.deleteLetter(1);    // SHOOT -> HOOT
        this.playLetter(1, "S"); // HOOT -> SOOT D'OH!!!

        // re-open the app window, with the same daily game number
        this.resetTheTestAppWindow();

        // we should be running the daily game SHORT -> POOR with SHOOT, HOOT, SOOT (D'OH) already played.
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
    }

    practiceGameTestNoConfirm() {
        const confirm = false;
        this.practiceGameTest(confirm);
    }

    practiceGameTest(confirm=true) {
        this.testName = "PracticeGame";
        if (!confirm) {
        this.testName = "PracticeGameNoConfirm";
        }

        this.logDebug("theAppDisplay: ", this.getNewAppWindow().theAppDisplay, "test");
        this.logDebug("Switching to practice game", "test");
        this.getNewAppWindow().theAppDisplay.switchToPracticeGame();
        this.getNewAppWindow().theAppDisplay.confirmationMode = confirm;

        this.logDebug("Done switching to practice game", "test");

        // the active gameDisplay in this test needs to be refreshed after switching to the practice game
        this.gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;

        // solve the puzzle directly: TEST LEST LET LOT PLOT PILOT
        let resultL1 = this.playLetter(1, "L");          // TEST -> LEST
        let resultDelete3 = this.deleteLetter(3);        // LEST -> LET
        let resultI2Wrong = this.playLetter(2, "I");     // LET -> LIT - wrong move!
        let resultO2 = this.playLetter(2, "O");          // LIT -> LOT
        let resultInsertP0 = this.insertLetter(0, "P" ); // LOT -> PLOT
        let resultInsertI1 = this.insertLetter(1, "I");  // PLOT -> PxLOT

        // restore default confirmation mode
        this.getNewAppWindow().theAppDisplay.confirmationMode = true;

        this.verify((resultL1 === Const.OK), `playLetter(1, L) returns ${resultL1}, not ${Const.OK}`) &&
            this.verify((resultDelete3 === Const.OK), `playDelete(3) returns ${resultDelete3}, not ${Const.OK}`) &&
            this.verify((resultI2Wrong === Const.WRONG_MOVE), `playLetter(2, O) returns ${resultO2}, not ${Const.OK}`) &&
            this.verify((resultO2 === Const.OK), `playLetter(2, O) returns ${resultO2}, not ${Const.OK}`) &&
            this.verify((resultInsertP0 === Const.OK), `insert P@0 returns ${resultInsertP0}, not ${Const.OK}`) &&
            this.verify((resultInsertI1 === Const.OK), `insert I@1 returns ${resultInsertI1}, not ${Const.OK}`) &&
            this.success();
    }

    practiceGameLimitTest() {
        this.testName = "PracticeGameLimit";
        this.logDebug("Switching to practice game", "test");
        Persistence.saveTestPracticeGameWords("TEST", "PILOT");
        this.getNewAppWindow().theAppDisplay.switchToPracticeGame();
        this.logDebug("Done switching to practice game", "test");

        // the active gameDisplay in this test needs to be refreshed after switching to the practice game
        this.gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;

        // play and solve N practice games in a row.
        // showSolution calls showMove(userRequestedSolution=true), and this rebuilds the whole game GUI, including
        // the post-game-div to hold a 'new game' button if there are any more practice games allowed.
        this.logDebug(this.testName, ": showing solution", "test");
        this.gameDisplay.showSolution();

        const mockEvent = null; // the event is not actually touched by the callback
        let soFarSoGood = true;
        const testPracticeGamesPerDay = 3;
        this.gameDisplay.setPracticeGamesPerDay(testPracticeGamesPerDay);
        soFarSoGood = this.verify(this.gameDisplay.practiceGamesPerDay == testPracticeGamesPerDay,
                `expected practice games per day to be ${testPracticeGamesPerDay}, got: ${this.gameDisplay.practiceGamesPerDay}`, "test");
        for (let gamesStarted=1; gamesStarted < testPracticeGamesPerDay; gamesStarted++) {
            if (!soFarSoGood) {
                break; // stop testing on the first failure
            }
            this.logDebug(this.testName, ": gamesStarted:", gamesStarted, "test");
            // New Game button should be there.  The postGameDiv is reconstructed on every refresh of the display after a move
            // or solution.
            const postGameDiv = this.gameDisplay.postGameDiv;
            const children = postGameDiv.children;

            if ( this.verify(children.length == 1, "expected 1 children, got: ", children.length) &&
                    this.verify( (children[0].textContent == "New Game"), "expected textContent=New Game, got: ", children[0].textContent) &&
                    this.verify(this.gameDisplay.anyGamesRemaining(), "After showing ", gamesStarted, " games, anyGamesRemaining should still be true")
               ) {
                // pretend to click the new game button.
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
    }

    geniusMoveAndShareTest() {
        this.testName = "GeniusMoveAndShare";

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
        let actShareString = statsDisplay.shareCallback(statsMockEvent);
        let expShareString = `WordChain #${Test.TEST_EPOCH_DAYS_AGO} ⭐\n\n🟪🟪🟪🟪🟪\n🟩🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟨🟨🟨🟨\n🟪🟪🟪🟪`;

        this.verify((resultO4 === Const.OK), `playLetter(4, O) returns ${resultO4}, not ${Const.OK}`) &&
            this.verify((resultDelete1 === Const.OK), `playDelete(1) returns ${resultDelete1}, not ${Const.OK}`) &&
            this.verify((resultR4Genius === Const.GENIUS_MOVE), `playLetter(4, R) returns ${resultR4Genius}, not ${Const.GENIUS_MOVE}`) &&
            this.verify((resultP1 === Const.OK), `playLetter(1, P) returns ${resultP1}, not ${Const.OK}`) &&
            this.verify((actShareString.indexOf(expShareString) === 0), `sharestring: expected '${expShareString}', got '${actShareString}'`) &&
            this.success();
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

        // now re-set the window,
        Persistence.saveTestEpochDaysAgo(Test.TEST_EPOCH_DAYS_AGO);
        this.resetTheTestAppWindow();
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
