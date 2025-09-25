import { BaseLogger } from '../docs/javascript/BaseLogger.js';
import { WordChainDict, globalWordList, scrabbleWordList } from '../docs/javascript/WordChainDict.js';
import { DisplayInstruction } from '../docs/javascript/DisplayInstruction.js';
import { Solver, Solution } from '../docs/javascript/Solver.js';
import { GameState, DailyGameState, PracticeGameState } from '../docs/javascript/GameState.js';
import { Game, DailyGame, PracticeGame } from '../docs/javascript/Game.js';
import { Cookie } from '../docs/javascript/Cookie.js';
import { Metrics } from '../docs/javascript/Metrics.js';
import { Persistence } from '../docs/javascript/Persistence.js';
import { DailyGameDisplay, PracticeGameDisplay } from '../docs/javascript/GameDisplay.js'
import * as Const from '../docs/javascript/Const.js';
import { showCoverage, clearCoverage, getCounters, setCoverageOff, setCoverageOn, isCoverageOn } from '../docs/javascript/Coverage.js';

import { ElementUtilities } from '../docs/javascript/ElementUtilities.js';

// use: inTheFuture(2000).then( (foo=this) => {foo.doSomething(arg1, arg2)})
// the method will called as this.doSomething(arg1, arg2);

// notes about JS delays
// setTimeout(func, t) calls func() at t milliseconds in the future.
// new Promise (executor-func) is a constructor call.
// executor-func has two args, resolveFunc(x) and rejectFunc(x).  It is called
// during construction, and sets up the Promise.  resolveFunc (and rejectFunc)
// are callback-like functions that the Promise is aware of, and if either
// one is called (from anywhere), the Promise becomes resolved (or rejected) and
// the follow-on .then(func) expressions that are later attached to the Promise
// will execute.  They take one parameter, which is the value that any '.then(func)'
// will receive.
// In our case, the resolveFunc is called by the timer mechanism after a pause.  This
// causes the Promise to be resolved, and any .then()s chained to it will execute.
// In our case, we don't pass a value to resolvFunc and the .then() chained to the
// Promise doesn't get a parameter.  When the Promise constructor calls the
// executor, which sets up the timeout to call the resolveFunc, it first generates the
// two functions resolveFunc and rejectFunc, and they know about this Promise, so
// when they are called by our code, they update the Promise and possibly run the
// .then or .catch or .finally attached to the Promise.  resolveFunc and rejectFunc
// are like handles given to our code, that we will call to move the Promise along.
//

function inTheFuture(ms) {
  return new Promise(function(resolveFunc, rejectFunc) {setTimeout(resolveFunc, ms)});
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

        // track code coverage during testing.  It is turned off and back on within certain tests.

        // save the calling <script> tag element for access to its parameters:
        var scripts = document.getElementsByTagName('script');
        var index = scripts.length - 1;
        this.scriptObj = scripts[index];
        const bundledArg = this.scriptObj.dataset.bundled;
        this.isBundled = (bundledArg === "true");
        this.testName = "NOT SET";
        this.tinyList  = ["APPLE", "PEAR", "BANANA"];
        this.smallList = ["BAD", "BADE", "BALD", "BAT", "BATE", "BID", "CAD", "CAT", "DOG", "SCAD"]
        this.fullDict = new WordChainDict(globalWordList);
        this.scrabbleDict = new WordChainDict(scrabbleWordList);
        this.messages = [];
        this.logDebug("The Test singleton: ", this, "test");
        Metrics.testing = true; //  this adjusts the Google Analytics event names so that they don't look real.
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
        this.displayCookies();
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

    addAppTestSelector() {
        const appTests = this.getAppTests(),
              appTestNames = appTests.map((item) => { return item.name; });

        this.appTestNameToFunction = new Map();
        for (let appTestFunc of appTests) {
            this.appTestNameToFunction.set(appTestFunc.name, appTestFunc);
        }

        ElementUtilities.addElementTo("p", this.outerDiv);
        ElementUtilities.addElementTo("label", this.outerDiv, {for: "testSelector", class: "testButton"}, "Select Test");
        let appTestSelect = ElementUtilities.addElementTo("select", this.outerDiv, {name: "appTests", id: "testSelector"});
        this.appTestSelect = appTestSelect;

        appTestNames.forEach(function(item) {
            ElementUtilities.addElementTo("option", appTestSelect, {value: item}, item);
        })
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

        // add all the buttons for running tests, showing results, etc.

        var runAll           = ElementUtilities.addElementTo("button", this.outerDiv, {id: "runAll",          class: "testButton" }, "Run All Tests"),
            runDict          = ElementUtilities.addElementTo("button", this.outerDiv, {id: "runDict",         class: "testButton" }, "Run Dict Tests"),
            runSolver        = ElementUtilities.addElementTo("button", this.outerDiv, {id: "runSolver",       class: "testButton" }, "Run Solver Tests"),
            runGameState     = ElementUtilities.addElementTo("button", this.outerDiv, {id: "runGameState",    class: "testButton" }, "Run Game State Tests"),
            runGame          = ElementUtilities.addElementTo("button", this.outerDiv, {id: "runGame",         class: "testButton" }, "Run Game Tests"),
            runApp           = ElementUtilities.addElementTo("button", this.outerDiv, {id: "runApp",          class: "testButton" }, "Run App Tests"),
            _unused          = ElementUtilities.addElementTo("br", this.outerDiv),
            showCoverage     = ElementUtilities.addElementTo("button", this.outerDiv, {id: "showCoverage",   class: "testButton" }, "Show Coverage"),
            clearCoverage    = ElementUtilities.addElementTo("button", this.outerDiv, {id: "clearCoverage",  class: "testButton" }, "Clear Coverage"),
            coverageOn       = ElementUtilities.addElementTo("button", this.outerDiv, {id: "coverageOn",     class: "testButton" }, "Coverage On"),
            coverageOff      = ElementUtilities.addElementTo("button", this.outerDiv, {id: "coverageOff",    class: "testButton" }, "Coverage Off"),

            selector         = this.addAppTestSelector(),
            runSelectedTest  = ElementUtilities.addElementTo("button", this.outerDiv, {id: "runSelectedTest", class: "testButton" }, "Run Selected App Test");
            ElementUtilities.addElementTo("p", this.outerDiv);


        for (let button of [runAll, runDict, runSolver, runGameState, runGame, runApp, runSelectedTest,
                showCoverage, clearCoverage, coverageOn, coverageOff]) {
            ElementUtilities.setButtonCallback(button, this, this.runTestsCallback);
        }

        ElementUtilities.addElementTo("label", this.outerDiv, {id: "testResults"}, "");
    }

    runTestsCallback(event) {

        const buttonId = event.srcElement.getAttribute("id");

        if (buttonId == "coverageOn") {
            // TODO - can this technique be used to set GL_DEBUG on and off? Maybe don't put it into the namespace 'Const'
            // but have it be global and exported?  Then, from tests, we can turn in on or off with a button instead of reload.
            setCoverageOn(); // sets the "local" instance of the global COVERAGE_ON flag
            if (this.gameDisplay) {
                this.logDebug("also setting app coverage on", "test");
                this.gameDisplay.callSetCoverageOn(); // sets the "remote" instance of the global COVERAGE_ON flag
            }
            return;
        }
        if (buttonId == "coverageOff") {
            setCoverageOff();
            if (this.gameDisplay) {
                this.logDebug("also setting app coverage off", "test");
                this.gameDisplay.callSetCoverageOff();
            }
            return;
        }
        if (buttonId == "showCoverage") {
            // There are global coverage counters and app-specific counters.
            // First, get the global counters.
            let nonAppCounters = getCounters(),
                appCounters = new Map();

            // If any app tests have been run, this.gameDisplay will be
            // non-null; get counters from GameDisplay.
            if (this.gameDisplay) {
                this.logDebug("also getting app counters", "test");
                appCounters = this.gameDisplay.callGetAppCounters();
            }

            showCoverage(appCounters, nonAppCounters);
            return;
        }
        if (buttonId == "clearCoverage") {
            clearCoverage();
            if (this.gameDisplay) {
                this.logDebug("also clearing app counters", "test");
                this.gameDisplay.callClearAppCoverage();
            }
            return;
        }

        this.clearResults();

        if (buttonId == "runAll" || buttonId == "runDict") {
            this.runDictTests();
        }
        if (buttonId == "runAll" || buttonId == "runSolver") {
            this.runSolverTests();
        }
        if (buttonId == "runAll" || buttonId == "runGameState") {
            this.runGameStateTests();
        }
        if (buttonId == "runAll" || buttonId == "runGame") {
            this.runGameTests();
        }
        if (buttonId == "runAll" || buttonId == "runApp") {
            // runAppTests() will run all the functions in this.appTestList.
            this.appTestList = this.getAppTests();
            this.runAppTests(); // this will take care of calling showResults() when it is finished asynchronously
        }
        if (buttonId == "runSelectedTest") {
            this.appTestList = [this.appTestNameToFunction.get(this.appTestSelect.value)];
            this.runAppTests();
        }
        // The App tests (runAll, runApp, runSelectedTest) will show the results themselves when those tests finish.
        // Otherwise, we show them now.  This will apply to any synchronous tests (dict, solver, game, gameState)

        if ( buttonId == "runDict" || buttonId == "runSolver" || buttonId == "runGame" || buttonId == "runGameState") {
            this.showResults();
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

        let color = this.failureCount > 0 ? "red" : "green";
        let results = [
            "",
            `Successful test scenarios: ${this.successCount}`,
            `<font color="${color}">Failed tests scenarios: ${this.failureCount}</font color="${color}">`,
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

    hadNoErrors() {
        this.messages.push(`<font color="green">${this.testName} (${this.testAssertionCount})</font color="green">`);
        this.testAssertionCount = 0;
        this.successCount += 1;
    }

    verify() {
        const args = [...arguments],
              truthValue = args.shift(),
              message = args.join(" ");

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
     * verifyInstructionList(actualInstructions, expectedInstructions, description)
     * Iterate over two same-length lists of display instructions, and compare them with verifyEqual.
     * description should describe what game-step the instruction list represents.
     */

    verifyInstructionList(actualInstructions, expectedInstructions, description) {
        var actualInstructionsAsStr = JSON.stringify(actualInstructions, null, "<br>");

        actualInstructionsAsStr = actualInstructionsAsStr.replaceAll(/<br>\s*<br>/g, "<br>");
        actualInstructionsAsStr = actualInstructionsAsStr.replaceAll(/},\s*<br>\s*{/g, "}, {");

        const lengthsMatch = this.verifyEqual(actualInstructions.length, expectedInstructions.length,
            description + `, num instructions (actual: <code>${actualInstructionsAsStr}</code>)`);

        if (! lengthsMatch) {
            return false;
        }

        for (let i = 0; i < actualInstructions.length; i++) {
            if (! this.verifyEqual(actualInstructions[i], expectedInstructions[i], `${description} instruction[${i}]`)) {
                return false;
            }
        }
        return true;
    }

    /*
     * verifyEqual (actual, expected, description)
     * returns true if actual and expected match
     * (object match if actual is an object, else === match)
     * adds mismatches and description if there is a mismatch
     */

    verifyEqual(actual, expected, description) {

        var message=null;
        var truthValue = null;

        if ((actual !== null) && (expected === null)) {
            message = `<font color="red">${this.testName}: Failed: ${description} -- actual: something; expected: null'</font>`;
            truthValue = false;
        } else if ((actual === null) && (expected !== null)) {
            message = `<font color="red">${this.testName}: Failed: ${description} -- actual: null; expected: something'</font>`;
            truthValue = false;
        } else if (typeof actual === 'object') {
            const differences = this.getObjectDifferencesAsObject(actual, expected);

            truthValue = Object.keys(differences).length === 0;
            if (! truthValue) {
                message = `<font color="red">${this.testName}: Failed: ${description} -- differences: ${JSON.stringify(differences)}</font>`;
            }
        } else {
            truthValue = actual == expected;
            if (!truthValue) {
                message = `<font color="red">${this.testName}: Failed: ${description} -- actual: '${actual}'; expected: '${expected}'</font>`;
            }
        }

        if (truthValue) {
            this.testAssertionCount += 1;
            this.totalAssertionCount += 1;
        } else {
            this.messages.push(message);
            this.failureCount += 1;
        }

        return truthValue;
    }

    // Shallow object comparison. Returns an object whose properties
    // are the properties from the two input objects (actual, expected).
    // The value at each key (if there are differences) is an object
    // with properties 'actual' and 'expected'.
    // For keys in one input object but not the other the value not
    // present will appear in the return value as undefined.
    getObjectDifferencesAsObject(actual, expected) {
        const differences = {};

        // Check for properties present in actual but not in expected, or with different values
        for (const key in actual) {
            if (Object.prototype.hasOwnProperty.call(actual, key)) {
                if (!Object.prototype.hasOwnProperty.call(expected, key)) {
                    differences[key] = {
                        actual: actual[key],
                        expected: undefined // Property missing in expected
                    };
                } else if (actual[key] !== expected[key]) {
                    differences[key] = {
                        actual: actual[key],
                        expected: expected[key]
                    };
                }
            }
        }

        // Check for properties present in expected but not in actual
        for (const key in expected) {
            if (Object.prototype.hasOwnProperty.call(expected, key)) {
                if (!Object.prototype.hasOwnProperty.call(actual, key)) {
                    differences[key] = {
                        actual: undefined, // Property missing in actual
                        expected: expected[key]
                    };
                }
            }
        }

        return differences;
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
        // Setting the width/height is what makes a separate window open,
        // instead of a new browser tab. HOWEVER, in iOS/Chrome, the appearance
        // is a new tab. In iOS/Safari this doesn't work -- we get failures to
        // download some source files and we don't know why!

        if (! this.getNewAppWindow()) {
            // This url is the URL of the wordchain app that the tests will open.  If we are running unbundled,
            // we will open the unbundled version of the app.
            // If we are bundled, we open the development (bundled) version of the app.
            // TODO: there is no mode for Test.js to use the 'live' version of the app, via index.html

            const url = this.isBundled ?
                '/indexDevelopment.html' :
                '/indexUnbundled.html';
            const windowFeatures = "width=300,height=400";
            const windowName = "AppDisplayTest";
            this.newWindow = window.open(url, windowName, windowFeatures);

            // NOTE: newWindow may come back null or inoperative if pop-ups are blocked!
            // This will result in this error in the console:
            //     Cannot set properties of null (setting 'console')
            this.newWindow.console = console;
            this.logDebug("opened the one and only pop-up window: ", this.newWindow, ", at url: ", url, "test");
        }
    }

    // this sets this.gameDisplay to the App window's current game display object.
    setGameDisplay() {
        this.gameDisplay = this.getNewAppWindow().theAppDisplay.currentGameDisplay;
        // sync up the gameDisplay's code-coverage setting to ours
        if (isCoverageOn()) {
            this.gameDisplay.callSetCoverageOn();
        } else {
            this.gameDisplay.callSetCoverageOff();
        }

    }

    resetTheTestAppWindow() {
        // This is a cheat to create a "new singleton" so that we get a fresh AppDisplay.
        this.logDebug("resetTheTestAppWindow(): calling resetSingletonObject.  newAppWindow:", this.getNewAppWindow(), "test");
        this.getNewAppWindow().theAppDisplay.resetSingletonObject();
        this.setGameDisplay();
    }

    openAndGetTheStatsDisplay() {
        const appDisplay = this.getNewAppWindow().theAppDisplay;
        const statsDisplay = appDisplay.statsDisplay;
        const mockEvent = new MockEvent(null);  // not used in called function
        this.logDebug("openAndGetTheStatsDisplay(): appDisplay:", appDisplay, "statsDisplay:", statsDisplay, "test");
        statsDisplay.openAuxiliaryCallback(mockEvent);
        return statsDisplay;
    }

    closeTheStatsDisplay() {
        const appDisplay = this.getNewAppWindow().theAppDisplay;
        const statsDisplay = appDisplay.statsDisplay;
        const mockEvent = new MockEvent(null);  // not used in called function
        statsDisplay.closeAuxiliaryCallback(mockEvent);
    }

    runAppTest(testFunc) {
        // clear cookies and reset the window with a known daily puzzle and a hard-coded practice puzzle.
        // TODO - need to test a practice puzzle without test words
        Persistence.clearAllNonDebug();
        Persistence.saveTestEpochDaysAgo(Test.TEST_EPOCH_DAYS_AGO); // daily game is SHOOT ... POOR by default
        Persistence.saveTestPracticeGameWords("TEST", "PILOT");     // practice game is TEST ... PILOT by default
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
    //   Const.GOOD_MOVE if the letter is changed
    //   Const.UNEXPECTED_ERROR if app is in ConfirmationMode but picker doesn't return NEEDS_CONFIRMATION on first click
    //   some other error if the picker.selectionCallback fails

    // forcePlayWord doesn't use the display to play the next word.  It plays the word directly into the game,
    // and then refreshes the display explicitly.

    forcePlayWord(word) {
        const game = this.gameDisplay.game;
        const result = game.addWordIfExists(word);
        this.gameDisplay.processGamePlayResult(result);
        return result;
    }

    playLetter(letter, optionalLetter=letter) {
        this.logDebug("playLetter(", letter, optionalLetter, ")", "test");
        var optionalLetterButton = null;
        if (optionalLetter != letter) {
            // we are testing a 'user changed their mind' case, where first optionalLetter is clicked,
            // then letter, then letter is confirmed.
            if (!Persistence.getConfirmationMode()) {
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
        if (Persistence.getConfirmationMode()) {
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
            if (!Persistence.getConfirmationMode()) {
                this.logDebug("deleteLetter() was given an optional position but the game is not in ConfirmationMode.  This is a bad test.", "test");
                return Const.UNEXPECTED_ERROR;
            }
            mockOptionalDeleteButton = new MockEventSrcElement();
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
        const mockDeleteButton = new MockEventSrcElement();
        ElementUtilities.addClass(mockDeleteButton, Const.UNSELECTED_STYLE);
        mockDeleteButton.setAttribute("deletionPosition", position.toString());

        const mockEvent = new MockEvent(mockDeleteButton);

        if (Persistence.getConfirmationMode()) {
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
        const userChangesMind = position != optionalPosition;
        this.logDebug(`insertLetter(${position}, ${letter}, ${optionalPosition})`, "test");

        var mockOptionalInsertButton = null;
        if (userChangesMind) {
            if (!Persistence.getConfirmationMode()) {
                this.logDebug("insertLetter() was given an optional position but the game is not in ConfirmationMode.  This is a bad test.", "test");
                return Const.UNEXPECTED_ERROR;
            }
            mockOptionalInsertButton = new MockEventSrcElement();
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

        const mockInsertButton = new MockEventSrcElement();
        mockInsertButton.setAttribute("additionPosition", position.toString());
        ElementUtilities.addClass(mockInsertButton, Const.UNSELECTED_STYLE);
        const mockEvent = new MockEvent(mockInsertButton);

        if (Persistence.getConfirmationMode()) {
            const firstClickRes = this.gameDisplay.additionClickCallback(mockEvent);
            if (firstClickRes != Const.NEEDS_CONFIRMATION) {
                this.logDebug("got ", firstClickRes, " instead of ", Const.NEEDS_CONFIRMATION, "test");
                return Const.UNEXPECTED_ERROR;
            }
            if (!ElementUtilities.hasClass(mockInsertButton, Const.UNCONFIRMED_STYLE)) {
                this.logDebug("mock insert-button class after first press should have ", Const.UNCONFIRMED_STYLE, "test");
                return Const.UNEXPECTED_ERROR;
            }
            if (userChangesMind) {
                if (!ElementUtilities.hasClass(mockOptionalInsertButton, Const.UNSELECTED_STYLE)) {
                    this.logDebug("mock optional insert-button class after re-press should have ", Const.UNSELECTED_STYLE, "test");
                    return Const.UNEXPECTED_ERROR;
                }
            }
        }

        const clickResult = this.gameDisplay.additionClickCallback(mockEvent);
        if (clickResult != Const.GOOD_MOVE) {
            this.logDebug("got ", clickResult, " instead of ", Const.GOOD_MOVE, "test");
            return clickResult;
        }
        if (!ElementUtilities.hasClass(mockInsertButton, Const.UNSELECTED_STYLE)) {
            this.logDebug("mock insert-button class after last press should have ", Const.UNSELECTED_STYLE, "test");
            return Const.UNEXPECTED_ERROR;
        }
        // At this point, if we are not in confirmation mode, we have clicked once to add the new position.
        // If we are in confirmation mode, we have already clicked twice successfully
        // So we can now play the letter.

        let playResult = this.playLetter(letter);
        this.logDebug("insertLetter(", position, ",", letter, ") returns: ", clickResult, " then ", playResult,  "test");
        return playResult;
    }

    // This plays the known daily game for day 2.  No status of whether or not it worked.  It is useful for
    // tests that need multiple game instances to test stats.
    //

    playTheCannedDailyGameOnce() {

        // SHORT -> POOR
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR

        this.playLetter("O"); // SHORT -> SHOOT now delete
        this.deleteLetter(0);    // SHOOT -> HOOT now change 0
        this.playLetter("B"); // HOOT -> BOOT now change 3
        this.playLetter("R"); // BOOT -> BOOR now change 0
        this.playLetter("P"); // BOOR -> POOR
    }

    // A utility to play a move from one word to another, as found by the Solver.
    // The solver gives you transformations
    playTransformation(transformation) {
        this.logDebug("Playing transformation", transformation, "test");
        const [action, position, letter] = transformation;
        if (action === Const.ADD) {
            this.insertLetter(position, letter );
        } else if (action === Const.DELETE) {
            this.deleteLetter(position);
        } else {
            this.playLetter(letter);
        }
    }

    finishTheCurrentGame() {
        const game = this.gameDisplay.game;
        let prevWord = game.gameState.lastPlayedWord();
        // get a copy of the unplayed words, as the unplayed words get modified during the loop
        const nextWords = [...game.getUnplayedWords()];
        this.logDebug("finishTheCurrentGame() from ", prevWord, "through", nextWords, "test");
        // play from the last played word to the first remaining word.
        for (let nextWord of nextWords) {
            //this.logDebug("finishTheCurrentGame() step from ", prevWord, "to", nextWord, "test");
            const transformation = Solver.getTransformationStep(prevWord, nextWord);
            if (transformation == null) {
                console.log("ERROR: no single-step from ", prevWord, "to", nextWord);
                return false;
            }
            this.playTransformation(transformation);
            prevWord = nextWord;
            //this.logDebug("finishTheCurrentGame() after step, prevWord is now", prevWord, "test");
        }
        return true;
    }

    showRemainingWords() {
        const game = this.gameDisplay.game,
              mockEvent = null,
              numMoves = game.getUnplayedWords().length;

        for (let i = 0; i < numMoves; i++) {
            this.gameDisplay.showWordCallback(mockEvent);
        }
    }

    // compares the persisted stats AND stats screen content with expected and calculated values.

    static statsContainer = null;

    verifyStats(expStatsBlob, expExtraStepsHistogram) {

        // get the saved stats cookie
        let savedDailyState = Persistence.getDailyGameState2();
        if (savedDailyState == null) {
            this.logDebug("no saved DailyGameState", "test");
            return false;
        }
        let savedStatsBlob = savedDailyState.statsBlob;
        let savedExtraStepsHistogram = savedDailyState.extraStepsHistogram;

        let testRes = true;

        this.logDebug("verifyStats() savedStatsBlob", savedStatsBlob, "extraStepsHistogram", savedExtraStepsHistogram, "test");

        // open the stats window.  This should compute the shareString and start the countdown clock
        const statsDisplay = this.openAndGetTheStatsDisplay();

        // the statsContainer is a GUI element with at least 3 children: Played, Won and Lost
        let statsContainer = statsDisplay.statsContainer;

        // the statsDistribution is a GUI element with one bar for each possible number of wrong moves: 0 .. Const.TOO_MANY_EXTRA_STEPS
        let statsDistribution = statsDisplay.statsDistribution;

        this.logDebug("verifyStats() statsContainer:", statsContainer, "test");
        this.logDebug("verifyStats() global statsContainer:", this.statsContainer, "test");
        this.logDebug("verifyStats() statsDistribution:", statsDistribution, "test");

        let expContainerLen = 4;
        let actContainerLen = statsContainer.children.length;

        let expDistributionLen = Const.TOO_MANY_EXTRA_STEPS + 1;
        let actDistributionLen = statsDistribution.children.length;

        // four calculated text values we expect to find on the stats screen.  They are labels and values for Played, Won, Lost, and Streak
        let expStartedText = `${expStatsBlob.gamesStarted}Started`;
        let actStartedText = statsContainer.children[0].children[0].innerText.trim() + statsContainer.children[0].children[1].innerText.trim();

        let expWonText = `${expStatsBlob.gamesWon}Won`;
        let actWonText = statsContainer.children[1].children[0].innerText.trim() + statsContainer.children[1].children[1].innerText.trim();

        let expLostText = `${expStatsBlob.gamesLost}Lost`;
        let actLostText = statsContainer.children[2].children[0].innerText.trim() + statsContainer.children[2].children[1].innerText.trim();

        let expStreakText = `${expStatsBlob.streak}Streak`;
        let actStreakText = statsContainer.children[3].children[0].innerText.trim() + statsContainer.children[3].children[1].innerText.trim();

        testRes =
            this.verifyEqual(actContainerLen, expContainerLen, "statsContainer.children.length THIS IS A TESTING ANOMOLY - unexpected DOM contents") &&
            this.verifyEqual(actDistributionLen, expDistributionLen, "statsDistribution.children.length THIS IS A TESTING ANOMOLY - unexpected DOM contents") &&
            this.verifyEqual(savedStatsBlob.gamesStarted, expStatsBlob.gamesStarted, "savedStatsBlob.gamesStarted") &&
            this.verifyEqual(savedStatsBlob.gamesWon, expStatsBlob.gamesWon, "savedStatsBlob.gamesWon") &&
            this.verifyEqual(savedStatsBlob.gamesLost, expStatsBlob.gamesLost, "savedStatsBlob.gamesLost") &&
            this.verifyEqual(savedStatsBlob.streak, expStatsBlob.streak, "savedStatsBlob.streak") &&
            this.verifyEqual(actStartedText, expStartedText, "statsContainer.children[0]") &&
            this.verifyEqual(actWonText, expWonText, "statsContainer.children[1]") &&
            this.verifyEqual(actLostText, expLostText, "statsContainer.children[2]") &&
            this.verifyEqual(actStreakText, expStreakText, "statsContainer.children[3]") &&
            this.verify(savedStatsBlob.gamesStarted >= savedStatsBlob.gamesWon + savedStatsBlob.gamesLost, `assertion failed: #started not >= #won+#lost`);
        this.closeTheStatsDisplay();

        for (let wrongMoves = 0; wrongMoves <= Const.TOO_MANY_EXTRA_STEPS; wrongMoves++) {
            // check the extraSteps histogram
            testRes = testRes &&
                this.verifyEqual(savedExtraStepsHistogram[wrongMoves], expExtraStepsHistogram[wrongMoves], `savedExtraStepsHistogram.${wrongMoves}`);

            // check the DOM contents of the stats screen for the distribution of wrong-move counts.
            let actDistributionText = statsDistribution.children[wrongMoves].innerText.trim();

            // on Feb 15, 2025, the new-line character disappeared, at least in chrome
            // so we added a newline between the two components below ... and then it
            // was gone by May 23, 2025, so we removed it.
            let expDistributionText = Const.NUMBERS[wrongMoves] + /*"\n" +*/ expExtraStepsHistogram[wrongMoves];
            testRes = testRes &&
                this.verifyEqual(actDistributionText, expDistributionText, `statsDistribution.children.${wrongMoves}.innerText`);
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
        this.testDictReverseChoices();
        this.testScrabbleDict();
        this.testFindOptionsAtWordStep();
        this.testAddWord();
        this.testRemoveWord();
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
        this.verifyEqual(tinyDict.getSize(), 3, "size") &&
            this.verifyEqual(tinyDict.isWord("APPLE"), true, "isWord(APPLE)") &&
            this.verifyEqual(tinyDict.isWord("apPlE"), true, "isWord(apPlE)") &&
            this.verifyEqual(tinyDict.isWord("PEACH"), false, "isWord(PEACH)") &&
            this.hadNoErrors();
    }

    testDictReverseChoices() {
        this.testName = "DictReverseChoices";
        let reverseOptionsFromTarget = this.fullDict.findOptionsAtWordStep("lovely", "lovey");
        this.verifyEqual(reverseOptionsFromTarget.size, 1, "num options from lovely to lovey") &&
            this.hadNoErrors();
    }

    testDictAdders() {
        this.testName = "DictAdders";
        const smallDict = new WordChainDict(this.smallList);

        const cadAdders = smallDict.findAdderWords("CAD");
        const badAdders = smallDict.findAdderWords("BAD");
        const batAdders = smallDict.findAdderWords("BAT");

        this.verifyEqual(cadAdders.has("SCAD"), true, "'SCAD' is in 'CAD' adders") &&
            this.verifyEqual(badAdders.has("BALD"), true, "'BALD' is in 'BAD' adders") &&
            this.verifyEqual(batAdders.has("BATE"), true, "'BATE' is in 'BAT' adders") &&
            this.hadNoErrors();
    }

    testDictRemovers() {
        this.testName = "DictRemovers";
        const smallDict = new WordChainDict(this.smallList);

        const ccadRemovers = smallDict.findRemoverWords("CCAD");
        const baldRemovers = smallDict.findRemoverWords("BALD");
        const bateRemovers = smallDict.findRemoverWords("BATE");

        this.verifyEqual(ccadRemovers.has("CAD"), true, "'CAD' is in 'CCAD' removers") &&
            this.verifyEqual(baldRemovers.has("BAD"), true, "'BAD' is in 'BALD' removers") &&
            this.verifyEqual(bateRemovers.has("BAT"), true, "'BAT' is in 'BATE' removers") &&
            this.hadNoErrors();
    }

    testDictReplacements() {
        this.testName = "DictReplacements";
        const smallDict = new WordChainDict(this.smallList);

        const badReplacements = smallDict.findReplacementWords("BAD");
        const cadReplacements = smallDict.findReplacementWords("CAD");

        this.verifyEqual(cadReplacements.has("BAD"), true, "'BAD' is in 'CAD' replacements") &&
            this.verifyEqual(badReplacements.has("BID"), true, "'BID' is in 'BAD' replacements") &&
            this.verifyEqual(badReplacements.has("BAT"), true, "'BAT' is in 'BAD' replacements") &&
            this.hadNoErrors();
    }

    testDictFull() {
        this.testName = "DictFull";

        const dictSize = this.fullDict.getSize();
        const expectedMinDictSize = 15415;

        const catAdders = this.fullDict.findAdderWords("CAT");
        const addersSize = catAdders.size;
        const expectedAddersSize = 6; /*scat, chat, coat, cart, cast, cats*/

        const badeReplacements = this.fullDict.findAdderWords("BADE");
        const replacementsSize = badeReplacements.size;
        const expectedReplacementsSize = 2;

        this.verify((dictSize >= expectedMinDictSize), `full dictionary has ${dictSize} words; expected at least ${expectedMinDictSize}`) &&
            this.verifyEqual(this.fullDict.isWord("PLACE"), true, "'PLACE' is missing in dict") &&
            this.verifyEqual(this.fullDict.isWord("PlAcE"), true, "'PlAcE' is missing in dict") &&
            this.verifyEqual(this.fullDict.isWord("ZIZZAMATIZZATEEZYMAN"), false, "'ZIZZAMATIZZATEEZYMAN' should not be in dict") &&
            this.verifyEqual(addersSize, expectedAddersSize, "adders size") &&
            this.verifyEqual(replacementsSize, expectedReplacementsSize, "replacements size") &&
            this.hadNoErrors();
    }

    testScrabbleDict() {
        this.testName = "ScrabbleDict";
        this.verifyEqual (this.scrabbleDict.isWord("aargh"), true, "aargh is in scrabble dict") &&
            this.verifyEqual (this.scrabbleDict.isWord("zzz"), true, "zzz is in scrabble dict") &&
            this.verifyEqual (this.scrabbleDict.isWord("zzzbrother"), false, "zzzbrother is in scrabble dict") &&
            this.hadNoErrors();
    }

    testFindOptionsAtWordStep() {
        this.testName = "FindOptionsAtWordStep";
        var sameSizeOptions = this.fullDict.findOptionsAtWordStep("PLANE", "PLANT");
        var addOptions = this.fullDict.findOptionsAtWordStep("PLAN", "PLANT");
        var delOptions = this.fullDict.findOptionsAtWordStep("PLANT", "PLAN");
        this.verifyEqual(sameSizeOptions.size, 3, "number options for PLANE->PLANT") &&
            this.verifyEqual(addOptions.size, 5, "number options for PLAN->PLANT") &&
            this.verifyEqual(delOptions.size, 3, "number delete letter options for PLANT->PLAN") &&
            this.hadNoErrors();
    }

    testAddWord() {
        this.testName = "AddWord";
        const tempDict = this.fullDict.copy();
        const nBeforeAdd = tempDict.getSize();
        tempDict.addWord("junk");      // already in dictionary
        const nAfterAddDuplicate = tempDict.getSize();
        tempDict.addWord("junkyjunk"); // not already in dictionary
        const nAfterAddNew = tempDict.getSize();
        this.verifyEqual(nBeforeAdd, nAfterAddDuplicate,"size after trying to add duplicate word") &&
            this.verifyEqual(nBeforeAdd, nAfterAddNew-1, "size after trying to add new word") &&
            this.hadNoErrors();
    }

    testRemoveWord() {
        const tempDict = this.fullDict.copy();
        this.testName = "RemoveWord";
        const nBeforeRemove = tempDict.getSize();
        tempDict.removeWord("junk");      // real word
        const nAfterRemove  = tempDict.getSize();
        tempDict.removeWord("junkyjunk"); // not already in dictionary
        const nAfterRemoveUnknown = tempDict.getSize();
        this.verifyEqual(nBeforeRemove, nAfterRemove+1,"size after trying to remove word") &&
            this.verifyEqual(nAfterRemove, nAfterRemoveUnknown, "size after trying to remove unknown word") &&
            this.hadNoErrors();
    }

    /*
    ** Solver tests
    */

    runSolverTests() {
        const startTestTime = Date.now();
        this.testOneStepTransformations();
        this.testSolverIdentitySequence();
        this.testSolverOneStep();
        this.testSolverMultiStep();
        this.testSolverLongChain();
        this.testGameNotShortestSolutionBug();
        this.testSolverBothDirections();
        this.testSolverSearchNoSolution();
        this.testDifficultyCalcs();
        this.testReverseLastStepChoics();
        this.testPuzzleFinder();
        const endTestTime = Date.now();
        this.logDebug(`solver tests elapsed time: ${endTestTime - startTestTime} ms`, "test");
    }

    testOneStepTransformations() {
        this.testName = "SolverOneStepTransformations";
        const r0 = Solver.getTransformationStep("dog", "dog");
        const r1 = Solver.getTransformationStep("dog", "doge");
        const r2 = Solver.getTransformationStep("dog", "gdog");
        const r3 = Solver.getTransformationStep("dog", "dig");
        const r4 = Solver.getTransformationStep("doXg", "dog");
        const r5 = Solver.getTransformationStep("dog", "cat");
        const r6 = Solver.getTransformationStep("dog", "dots");
        const r7 = Solver.getTransformationStep("house", "host");
        const r8 = Solver.getTransformationStep("dogs", "dog"); // delete last letter
        this.verifyEqual (r0, null, false, "r0")   &&
            this.verifyEqual (r1, [Const.ADD, 3, 'e'], "r1") &&
            this.verifyEqual (r2, [Const.ADD, 0, 'g'], "r2") &&
            this.verifyEqual (r3, [Const.CHANGE, 1, 'i'], "r3") &&
            this.verifyEqual (r4, [Const.DELETE, 2, null], "r4") &&
            this.verifyEqual (r5, null, "r5") &&
            this.verifyEqual (r6, null, "r6") &&
            this.verifyEqual (r7, null, "r7") &&
            this.verifyEqual (r8, [Const.DELETE, 3, null], "r8") &&
            this.hadNoErrors();
    }

    testSolverIdentitySequence() {
        const startTestTime = Date.now();
        this.testName = "SolverIdentitySequence";
        const dict = new WordChainDict(["BAD", "BAT", "CAD", "CAT", "DOG"]);
        const solution = Solver.solve(dict, "BAT", "BAT");

        this.verifyEqual(solution.hadNoErrors(), true, `solving 'BAT' to 'BAT': ${solution.getError()}`) &&
            this.verifyEqual(solution.numSteps(), 0, "num steps for 'BAT' to 'BAT'") &&
            this.verifyEqual(solution.getStart(), 'BAT', "first word for 'BAT' to 'BAT'") &&
            this.verifyEqual(solution.getTarget(), 'BAT', "last word for 'BAT' to 'BAT'") &&
            this.hadNoErrors();
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

        this.verify(solutionBadBade.hadNoErrors(), `error on adder 'BAD' to 'BADE': ${solutionBadBade.getError()}`) &&
            this.verify(solutionBadeBad.hadNoErrors(), `error on remover 'BADE' to 'BAD': ${solutionBadeBad.getError()}`) &&
            this.verify(solutionBatCat.hadNoErrors(), `error on replacer 'BAT' to 'CAT': ${solutionBatCat.getError()}`) &&
            this.verifyEqual(solutionBadBade.numSteps(), 1, "steps for 'BAD' to 'BADE'") &&
            this.verifyEqual(solutionBadeBad.numSteps(), 1, "steps for 'BADE' to 'BAD'") &&
            this.verifyEqual(solutionBatCat.numSteps(), 1, "steps for 'BAT' to 'CAT'") &&
            this.verify(!solutionNope.hadNoErrors(), "expected failure for 'BAT' to 'DOG'") &&
            this.hadNoErrors();

    }

    testSolverMultiStep() {
        const startTestTime = Date.now();
        this.testName = "SolverTwoStep"
        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);

        const solutionBatScad = Solver.solve(smallDict, "BAT", "SCAD");
        const solutionScadBat = Solver.solve(smallDict, "SCAD", "BAT");

        const endTestTime = Date.now();
        this.logDebug(`${this.testName} elapsed time: ${endTestTime - startTestTime} ms`, "test");

        this.verify(solutionBatScad.hadNoErrors(), `error on 'BAT' to 'SCAD': ${solutionBatScad.getError()}`) &&
            this.verify(solutionScadBat.hadNoErrors(), `error on 'SCAD' to 'BAT': ${solutionScadBat.getError()}`) &&
            this.verifyEqual(solutionBatScad.numSteps(), 3, "num steps from 'BAT' to 'SCAD'") &&
            this.verifyEqual(solutionScadBat.numSteps(), 3, "num steps for 'SCAD' to 'BAT'") &&
            this.hadNoErrors();
    }

    testSolverLongChain() {
        this.testName = "SolverLongChain";
        const startTestTime = Date.now();

        const solutionTacoBimbo = Solver.solve(this.fullDict, "TACO", "BIMBO");
        const foundWords = solutionTacoBimbo.getSolutionWords();
        const expectedWords = [ "TACO", "TAO", "TAB", "LAB", "LAMB", "LIMB", "LIMBO", "BIMBO" ];

        const endTestTime = Date.now();
        this.logDebug(`${this.testName} elapsed time: ${endTestTime - startTestTime} ms`, "test");

        this.verify(solutionTacoBimbo.hadNoErrors(), `error on 'TACO' to 'BIMBO': ${solutionTacoBimbo.getError()}`) &&
            this.verifyEqual(foundWords, expectedWords, "solution") &&
            this.hadNoErrors();
    }

    testReverseLastStepChoics() {
        this.testName = "SolverReverseLastStepChoices";
        const solution = Solver.solve(this.fullDict, "FACE", "LOVELY");
        solution.calculateDifficulty(this.fullDict);
        this.verifyEqual(solution.nChoicesFromTarget,  1, "num choices from target backwards") &&
            this.hadNoErrors();
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
        this.verify(solution.hadNoErrors(), `error on 'BLUE' to 'BAGGY': ${solution.getError()}`) &&
            this.verifyEqual(solution.difficulty, 18, "difficulty") &&
            this.verifyEqual(solution.nChoicesEasiestStep, expectedNumberChoices, "num choices on easiest step") &&
            this.hadNoErrors();
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

        this.verifyEqual(solutionMatzoBall.getError(), "No solution", "'MATZO' TO 'BALL'") &&
        this.verifyEqual(solutionBallMatzo.getError(), "No solution", "'BALL' TO 'MATZO'") &&
        this.verify((50*elapsedForwardTime < elapsedReverseTime), `expected fast path ${elapsedForwardTime} to be at least 50x shorter than reverse path ${elapsedReverseTime}`) &&
        this.hadNoErrors();
    }

    testSolverSearchNoSolution() {
        const startTestTime = Date.now();
        this.testName = "SolverSearchNoSolution";
        const triedSearchNoSolution = Solver.solve(this.fullDict, "FROG", "ECHO");
        const endTestTime = Date.now();
        this.logDebug(`${this.testName} elapsed time: ${endTestTime - startTestTime} ms`, "test");

        this.verify(!triedSearchNoSolution.isSolved(), `expected 'No solution' on 'FROG' to 'ECHO'`) &&
            this.hadNoErrors();
    }

    testPuzzleFinder() {
        const startTestTime = Date.now();
        this.testName = "PuzzleFinder";

        const startWord = "BLUE",
              reqWordLen1 = 3,
              reqWordLen2 = 5,
              minWords = 7,
              maxWords = 9,
              minDifficulty = 15,
              targetWordLen = 5,
              expectedNumberOfPuzzles = 7,
              minChoicesPerStep = 2;

        const suitablePuzzles = Solver.findPuzzles(this.fullDict, startWord, targetWordLen, reqWordLen1, reqWordLen2,
                minWords, maxWords, minDifficulty, minChoicesPerStep)
            .map(puzzle => `${puzzle.getTarget()}:${puzzle.difficulty}`);
        suitablePuzzles.sort();
        // short-circuit the test if no puzzles found.
        if (!this.verify(suitablePuzzles.length > 0, "no suitable puzzles found")) {
            return;
        }

        const [targetWord, difficulty] = suitablePuzzles[0].split(":");
        const solution = Solver.solve(this.fullDict, startWord, targetWord);
        solution.calculateDifficulty(this.fullDict);
        this.verifyEqual(suitablePuzzles.length, expectedNumberOfPuzzles, "numberOfPuzzles") &&
            this.verify(solution.numWords() >= minWords, `solution too short ${solution.numWords()} not ${minWords}`) &&
            this.verify(solution.numWords() <= maxWords, `solution too long ${solution.numWords()} not ${maxWords}`) &&
            this.verifyEqual(solution.target.length, targetWordLen, "target word length") &&
            this.verifyEqual(solution.hasWordOfLength(reqWordLen1), true, `solution has word of length ${reqWordLen1}`) &&
            this.verifyEqual(solution.hasWordOfLength(reqWordLen2), true, `solution word of length ${reqWordLen2}`) &&
            this.verify(solution.difficulty >= minDifficulty, `solution to easy: ${difficulty} is not at least ${minDifficulty}`) &&
            this.verify(solution.nChoicesEasiestStep >= minChoicesPerStep, `solution's easiest step should be >= ${minChoicesPerStep}, not ${solution.nChoicesEasiestStep}`) &&
            this.hadNoErrors();
    }

    /*
    ** Game State tests
    */

    runGameStateTests() {

        function prep() {
            Persistence.clearAllNonDebug();
            Persistence.saveTestEpochDaysAgo(Test.TEST_EPOCH_DAYS_AGO);
        }

        const startTestTime = Date.now();
        prep(); this.testNewPracticeGameState();
        prep(); this.testRecoverUnplayedPracticeGameState();
        prep(); this.testRecoverPracticeGameWithDifferentTestWords();
        prep(); this.testPracticeGameStateOneWordPlayed();
        prep(); this.testPracticeGamesPerDayVar();
        prep(); this.testNewDailyGameState();
        prep(); this.testBrokenDailyGameState();
        prep(); this.testStatsBlobMigrationGameState();
        prep(); this.testRecoverUnplayedDailyGameState();
        prep(); this.testDailyGameStateOneWordPlayed();
        prep(); this.testDailyGameStateRecoverOneWordPlayed();
        prep(); this.testDailyGameStateNextDay();
        prep(); this.testDailyGameStateSkippedDay();
        prep(); this.testDailyGameStateUsingNewTestVars();
        prep(); this.testDailyGameStateUsingRepeatTestVars();
        prep(); this.testDailyGameStateWrongMove();
        prep(); this.testDailyGameStateDodoMove();
        prep(); this.testDailyGameStateGeniusMove();
        prep(); this.testDailyGameStateUsingScrabbleWord();
        prep(); this.testDailyGameStateStartedMetric();
        prep(); this.testDailyGameStateFinishedMetric();
        // initialize every Daily game defined -- takes a long time!
        // prep(); this.testGameStateSolveAllDailyGames();
        const endTestTime = Date.now();
        this.logDebug(`game tests elapsed time: ${endTestTime - startTestTime} ms`, "test");
    }

    // utilities for comparing game states
    compareDailyGameStates(s1, s2) {
        return (s1.dailyGameNumber === s2.dailyGameNumber) && this.compareGameStates(s1, s2);
    }

    comparePracticeGameStates(s1, s2) {
        return (s1.gamesRemaining === s2.gamesRemaining) && this.compareGameStates(s1, s2);
    }

    /*
        This test takes a long time and isn't part of normal testing.  It is commented out in
        runGameStateTests().  It tests the viability of each game word pair by setting the
        test practice game words and then creating a new PracticeGameState.  In creating the
        new PracticeGameState, the factory will determine if the puzzle can be solved and return
        null if it can't.
     */
    testGameStateSolveAllDailyGames() {
        this.logDebug("in testGameStateSolveAllDailyGames()", "test");
        this.testName = "GameStateSolveAllDailyGames";
        for (let wordPair of Const.DAILY_GAMES) {
            let [start, target] = wordPair;
            Persistence.saveTestPracticeGameWords(start, target);
            let gameState = PracticeGameState.factory(this.fullDict);
            this.logDebug("gamestate:", gameState, "test");
            if (this.verifyEqual(gameState, null, `daily puzzle ${start}->${target} failed to initialize`) ) {
                return; // short-circuit the test if any puzzle fails.
                this.logDebug(this.testName, " short-circuit because <", start, target, "> failed.", "test");
            }
        }
        this.hadNoErrors();
    }

    compareGameStates(s1, s2) {
        let res =
            (s1.start === s2.start) &&
            (s1.target === s2.target) &&
            (s1.ratedMoves.length === s2.ratedMoves.length) &&
            (s1.unplayedWords.length === s2.unplayedWords.length) &&
            (s1.getPlayedWordsAsString() === s2.getPlayedWordsAsString()) &&
            (s1.getUnplayedWordsAsString() === s2.getUnplayedWordsAsString()) ;
        if (!res) {
            this.logDebug("game states don't match:", s1, s2, "test");
        }
        return res;
    }

    testStatsBlobMigrationGameState() {
        this.testName = "StatsBlobMigrationGameState";
        const oldBlobStr = '{"0":1,"1":2,"2":3,"3":4,"4":5,"5":6,"gamesStarted":9,"gamesWon":2,"gamesLost":3,"streak":4}'
        Cookie.save(Cookie.DEP_DAILY_STATS, oldBlobStr);
        let dgs = DailyGameState.factory(this.fullDict); // should be from scratch, but old stats inserted.
        this.verifyEqual(dgs.statsBlob.gamesStarted, 9, "expected gamesStarted=9, got", dgs.statsBlob.gamesStarted) &&
            this.verifyEqual(dgs.statsBlob.gamesWon, 2, "expected gamesWon=2, got", dgs.statsBlob.gamesWon) &&
            this.verifyEqual(dgs.statsBlob.gamesLost, 3, "expected gamesLost=3, got", dgs.statsBlob.gamesLost) &&
            this.verifyEqual(dgs.statsBlob.streak, 4, "expected streak=4, got", dgs.statsBlob.streak) &&
            this.verifyEqual(dgs.extraStepsHistogram[0], 1, "extraStepsHistogram[0]") &&
            this.verifyEqual(dgs.extraStepsHistogram[1], 2, "extraStepsHistogram[1]") &&
            this.verifyEqual(dgs.extraStepsHistogram[2], 3, "extraStepsHistogram[2]") &&
            this.verifyEqual(dgs.extraStepsHistogram[3], 4, "extraStepsHistogram[3]") &&
            this.verifyEqual(dgs.extraStepsHistogram[4], 5, "extraStepsHistogram[4]") &&
            this.verifyEqual(dgs.extraStepsHistogram[5], 6, "extraStepsHistogram[5]") &&
            this.hadNoErrors();
    }

    testNewPracticeGameState() {
        this.testName = "NewPracticeGameState";
        let pgs = PracticeGameState.factory(this.fullDict);

        this.verify(pgs.start.length > 0, "missing start word") &&
            this.verify(pgs.target.length > 0, "missing target word") &&
            this.verify((pgs.initialSolution.length > 5) && (pgs.initialSolution.length < 10)) &&
            this.verifyEqual(pgs.getPlayedWord(0), pgs.start, "first played word") &&
            this.verifyEqual(pgs.ratedMoves.length + pgs.unplayedWords.length, pgs.initialSolution.length,
                    `played: ${pgs.getPlayedWordList()} unplayed: ${pgs.getUnplayedWordsAsString()} solution: ${pgs.initialSolution.join(",")}`) &&
            this.verifyEqual(pgs.gamesRemaining, Const.PRACTICE_GAMES_PER_DAY, "games remaining") &&
            this.hadNoErrors();
    }

    testRecoverUnplayedPracticeGameState() {
        this.testName = "RecoverUnplayedPracticeGameState";
        this.logDebug("---- running -----", this.testName, "test");
        let pgs1 = PracticeGameState.factory(this.fullDict); // from scratch
        this.logDebug("     first PGS:", pgs1, "test");
        // this second PracticeGameState should be recovered, not built from scratch
        let pgs2 = PracticeGameState.factory(this.fullDict);
        this.logDebug("     second PGS:", pgs2, "test");

        this.verify(this.comparePracticeGameStates(pgs1, pgs2), "states don't match") &&
            this.hadNoErrors();
    }

    testRecoverPracticeGameWithDifferentTestWords() {
        this.testName = "RecoverPracticeGameWithDifferentTestWords";
        Persistence.saveTestPracticeGameWords("SHORT", "POOR");
        let pgs1 = PracticeGameState.factory(this.fullDict);
        Persistence.saveTestPracticeGameWords("NEW", "WORD");
        let pgs2 = PracticeGameState.factory(this.fullDict); // should recover with new practice words
        this.verifyEqual(pgs1.start, "SHORT", "pgs1.start") &&
            this.verifyEqual(pgs1.target, "POOR", "pgs1.target") &&
            this.verifyEqual(pgs2.start, "NEW", "pgs2.start") &&
            this.verifyEqual(pgs2.target, "WORD", "pgs2.target") &&
            this.hadNoErrors();
    }

    testPracticeGameStateOneWordPlayed() {
        this.testName = "PracticeGameStateOneWordPlayed";
        Persistence.saveTestPracticeGameWords("SHORT", "POOR");

        // create a new game from scratch.
        let pgs = PracticeGameState.factory(this.fullDict);

        // SHORT,SHOOT,HOOT,BOOT,BOOR,POOR
        const res = pgs.addWord('SHOOT');
        const expUnplayedWords = "HOOT,BOOT,BOOR,POOR";
        this.verifyEqual(res, Const.GOOD_MOVE, "after addWord") &&
            this.verifyEqual(pgs.ratedMoves.length, 2, "played words") &&
            this.verifyEqual(pgs.getUnplayedWordsAsString(), expUnplayedWords, "unplayed words") &&
            this.verifyEqual(pgs.ratedMoves[1].rating, Const.GOOD_MOVE, "ratedMoves[1].rating") &&
            this.hadNoErrors();
    }


    testBrokenDailyGameState() {
        this.testName = "BrokenDailyGameState";
        Persistence.saveTestEpochDaysAgo(1000000); // so long ago, there is no daily game for today
        let dgs = DailyGameState.factory(this.fullDict);
        this.verifyEqual(dgs.dailyGameNumber, Const.BROKEN_DAILY_GAME_NUMBER, "game number") &&
            this.hadNoErrors();
    }

    testNewDailyGameState() {
        this.testName = "NewDailyGameState";
        let dgs = DailyGameState.factory(this.fullDict);
        // SHOOT,SHORT,SHOOT,HOOT,BOOT,BOOR, POOR
        // SHOOT is already played.
        // POOR is NOT INCLUDED in the unplayed list

        // new game is not recovered and should be unplayed
        const expUnplayedWords = "SHOOT,HOOT,BOOT,BOOR,POOR";
        this.verifyEqual(dgs.dailyGameNumber, Test.TEST_EPOCH_DAYS_AGO, "game number") &&
                this.verifyEqual(dgs.start, "SHORT", "start") &&
                this.verifyEqual(dgs.target, "POOR", "target") &&
                this.verifyEqual(dgs.ratedMoves.length, 1, "num played words") &&
                this.verifyEqual(dgs.getUnplayedWordsAsString(), expUnplayedWords, "unplayed words") &&
                this.hadNoErrors();
    }

    testRecoverUnplayedDailyGameState() {
        this.testName = "RecoverUnplayedDailyGameState";
        let dgs1 = DailyGameState.factory(this.fullDict);
        // this second DailyGameState should be recovered, not built from scratch
        let dgs2 = DailyGameState.factory(this.fullDict);
        this.verify(this.compareDailyGameStates(dgs1, dgs2), "states don't match") &&
            this.hadNoErrors();
    }

    testDailyGameStateOneWordPlayed() {
        this.testName = "DailyGameStateOneWordPlayed";

        // create a new game from scratch.
        let dgs = DailyGameState.factory(this.fullDict);

        // SHORT,SHOOT,HOOT,BOOT,BOOR,POOR
        const res = dgs.addWord('SHOOT');
        const expUnplayedWords = "HOOT,BOOT,BOOR,POOR";
        this.verifyEqual(res, Const.GOOD_MOVE, "after addWord") &&
            this.verifyEqual(dgs.ratedMoves.length, 2, "num played words") &&
            this.verifyEqual(dgs.getUnplayedWordsAsString(), expUnplayedWords, "unplayed words") &&
            this.verifyEqual(dgs.ratedMoves[1].rating, Const.GOOD_MOVE, "ratedMoves[1].rating") &&
            this.hadNoErrors();
    }

    testDailyGameStateRecoverOneWordPlayed() {
        this.testName = "DailyGameStateRecoverOneWordUnplayed";

        // create a new game from scratch.
        let dgs = DailyGameState.factory(this.fullDict);

        // SHORT,SHOOT,HOOT,BOOT,BOOR,POOR
        const res = dgs.addWord('SHOOT');
        const expUnplayedWords = "HOOT,BOOT,BOOR,POOR";
        this.verifyEqual(res, Const.GOOD_MOVE, "after addWord") &&
            this.verifyEqual(dgs.ratedMoves.length, 2, "num played words") &&
            this.verifyEqual(dgs.unplayedWords.length, 4, "num unplayed words") &&
            this.verifyEqual(dgs.getUnplayedWordsAsString(), expUnplayedWords, "unplayed words") &&
            this.hadNoErrors();
    }

    testDailyGameStateNextDay() {
        this.testName = "DailyGameStateNextDay";
        this.logDebug("running", this.testName, "test");
        // create a new game from scratch.
        Persistence.saveTestEpochDaysAgo(Test.TEST_EPOCH_DAYS_AGO);
        let dgs1 = DailyGameState.factory(this.fullDict);
        dgs1.setStat("streak", 5); // pretend we have 5 already won.
        dgs1.finishGame();         // this will make 6
        // move ahead one day
        Persistence.saveTestEpochDaysAgo(Test.TEST_EPOCH_DAYS_AGO + 1);
        // this should recover dgs1, see that it is for an older game, and create a new game.
        // The streak should be continuing.
        let dgs2 = DailyGameState.factory(this.fullDict);
        this.logDebug("second DGS, on next day", dgs2, "test");
        this.verifyEqual(dgs1.dailyGameNumber, Test.TEST_EPOCH_DAYS_AGO, "dgs1.dailyGameNumber") &&
            this.verifyEqual(dgs2.dailyGameNumber, Test.TEST_EPOCH_DAYS_AGO+1, "dgs2.dailyGameNumber") &&
            this.verifyEqual(dgs2.statsBlob["streak"],  6, "recovered streak") &&
            this.hadNoErrors();
    }

    testDailyGameStateSkippedDay() {
        this.testName = "DailyGameStateSkippedDay";
        // create a new game from scratch.
        Persistence.saveTestEpochDaysAgo(Test.TEST_EPOCH_DAYS_AGO);
        let dgs1 = DailyGameState.factory(this.fullDict);
        dgs1.setStat("streak", 10); // pretend we have 10 in a row.
        dgs1.finishGame();          // this will make 11

        // Move ahead two days ahead.  This tests if we recognize that the streak is over
        // because we didn't play yesterday.
        Persistence.saveTestEpochDaysAgo(Test.TEST_EPOCH_DAYS_AGO + 2);

        // this should recover the older game, see that it is old, and create a new game. The streak should be over.
        let dgs2 = DailyGameState.factory(this.fullDict);
        this.verifyEqual(dgs1.dailyGameNumber, Test.TEST_EPOCH_DAYS_AGO, "dgs1.dailyGameNumber") &&
            this.verifyEqual(dgs2.dailyGameNumber, Test.TEST_EPOCH_DAYS_AGO+2, "dgs2.dailyGameNumber") &&
            this.verifyEqual(dgs2.statsBlob["streak"], 0, "recovered streak") &&
            this.hadNoErrors();
    }

    testPracticeGamesPerDayVar() {
        this.testName = "PracticeGamesRemainingVar";
        const nGames = 4;
        Persistence.saveTestPracticeGamesPerDay(nGames);
        let pgs = PracticeGameState.factory(this.fullDict); // from scratch, with nGames per day override
        this.verifyEqual(pgs.gamesRemaining, nGames, "games remaining") &&
            this.hadNoErrors();
    }

    testDailyGameStateUsingNewTestVars() {
        this.testName = "DailyGameStateUsingNewTestVars";

        // shortest solution is PLANE,PANE,PANED
        Persistence.saveTestDailyGameWords("PLANE", "PANED");
        let dgs1 = DailyGameState.factory(this.fullDict); // from scratch

        // Now, if we recover the DailyGameState with TEST_DAILY_GAME_NUMBER, the new test vars should override
        Persistence.saveTestDailyGameWords("JUNKY", "JUNK");
        let dgs2 = DailyGameState.factory(this.fullDict); // from recovered object, but test vars have changed

        // game state should use test words and test game number
        this.verifyEqual(dgs1.start, "PLANE", "dgs.start") &&
            this.verifyEqual(dgs1.target, "PANED", "dgs.target") &&
            this.verifyEqual(dgs1.dailyGameNumber, Const.TEST_DAILY_GAME_NUMBER, "gameNumber") &&
            this.verifyEqual(dgs2.start, "JUNKY", "dgs2.start") &&
            this.verifyEqual(dgs2.target,"JUNK", "dgs2.target") &&
            this.hadNoErrors();
    }

    testDailyGameStateUsingRepeatTestVars() {
        this.testName = "DailyGameStateUsingRepeatTestVars";

        // shortest solution is PLANE,PANE,PANED
        Persistence.saveTestDailyGameWords("PLANE", "PANED");
        let dgs1 = DailyGameState.factory(this.fullDict); // will be from scratch
        let dgs2 = DailyGameState.factory(this.fullDict); // will be from recovered object

        // game state should use test words and test game number
        this.verifyEqual(dgs1.start, "PLANE", "dgs1.start") &&
            this.verifyEqual(dgs1.target, "PANED", "dgs1.target") &&
            this.verifyEqual(dgs1.dailyGameNumber, Const.TEST_DAILY_GAME_NUMBER, "dgs1.gameNumber") &&
            this.verifyEqual(dgs2.start, "PLANE", "dgs2start") &&
            this.verifyEqual(dgs2.target, "PANED", "dgs2.target") &&
            this.verifyEqual(dgs2.dailyGameNumber, Const.TEST_DAILY_GAME_NUMBER, "dgs2.gameNumber") &&
            this.hadNoErrors();
    }

    testDailyGameStateWrongMove() {
        this.testName = "DailyGameStateWrongMove";
        // shortest solution is PLANE,PANE,PANED but wrong move is PLANE,PANE,PANES,PANED
        Persistence.saveTestDailyGameWords("PLANE", "PANED");
        let dgs = DailyGameState.factory(this.fullDict);
        dgs.addWord("PANE"); // GOOD_MOVE
        const res = dgs.addWord("PANES"); // WRONG
        this.verifyEqual(res, Const.WRONG_MOVE, "after addWord") &&
            this.verifyEqual(dgs.start, "PLANE", "start") &&
            this.verifyEqual(dgs.target, "PANED", "target") &&
            this.verifyEqual(dgs.dailyGameNumber, Const.TEST_DAILY_GAME_NUMBER, "gameNumber") &&
            this.verifyEqual(dgs.ratedMoves[2].rating, Const.WRONG_MOVE, "ratedMoves[2].rating") &&
            this.hadNoErrors();

    }

    testDailyGameStateDodoMove() {
        this.testName = "DailyGameStateDodoMove";
        // shortest solution is PLANE,PANE,PANED but dodo move is PLANE,PLAN,PAN,PANE,PANED
        Persistence.saveTestDailyGameWords("PLANE", "PANED");
        let dgs = DailyGameState.factory(this.fullDict);
        const res = dgs.addWord("PLAN"); // DODO move
        this.verifyEqual(res, Const.DODO_MOVE, "after addWord") &&
            this.verifyEqual(dgs.start, "PLANE", "start") &&
            this.verifyEqual(dgs.target, "PANED", "target") &&
            this.verifyEqual(dgs.dailyGameNumber, Const.TEST_DAILY_GAME_NUMBER, "gameNumber") &&
            this.verifyEqual(dgs.ratedMoves[1].rating, Const.DODO_MOVE, "ratedMoves[1].rating") &&
            this.hadNoErrors();

    }

    testDailyGameStateGeniusMove() {
        this.testName = "DailyGameStateGeniusMove";
        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "CAR", "DOG", "SCAD", "SAG", "SAT"]);

        // shortest solution is SCAD,CAD,CAT,SAT,SAG but genius solution is SCAD,SCAG,SAG
        Persistence.saveTestDailyGameWords("SCAD", "SAG");
        let dgs = DailyGameState.factory(smallDict);
        this.logDebug("new daily game state:", dgs.toStr(), "test");

        dgs.addWord("SCAG"); // SCAD to SCAG uses scrabble word
        this.logDebug("new daily game state after SCAG:", dgs.toStr(), "test");
        dgs.addWord("SAG"); // SCAG to SAG.
        this.logDebug("new daily game state after SAG:", dgs.toStr(), "test");
        this.verifyEqual(dgs.ratedMoves[1].rating, Const.GENIUS_MOVE, "ratedMoves[1].rating") &&
        this.verifyEqual(dgs.ratedMoves[2].rating, Const.GOOD_MOVE, "ratedMoves[2].rating") &&
            this.hadNoErrors();
    }

    testDailyGameStateUsingScrabbleWord() {
        this.testName = "DailyGameStateScrabbleWord";
        const smallDict = new WordChainDict(["BAD", "BAT", "CAT", "MAR", "CAR"]);
        Persistence.saveTestDailyGameWords("BAD", "CAR");
        // shortest solution is BAD,BAT,CAT,CAR  alt using scrabble: BAD,MAD,MAR,CAR  MAD is the genius word
        let dgs = DailyGameState.factory(smallDict);
        dgs.addWord("MAD"); // BAD to MAD is a scrabble word here, but not a genius move (same length solution)
        this.verifyEqual (dgs.ratedMoves[1].rating, Const.SCRABBLE_MOVE, "BAD->MAD returns") &&
            this.hadNoErrors();
    }

    testDailyGameStateStartedMetric() {
        this.testName = "DailyGameStateStartedMetric";
        const metricEventCountBefore = window.dataLayer.length;
        const dgsUnused = DailyGameState.factory(this.fullDict);
        const metricEventCountAfter = window.dataLayer.length;
        const i = metricEventCountAfter - 1;
        const expEventName = Metrics.testingPrefix + Metrics.GAME_STARTED;
        const actEventName = window.dataLayer[i]["event"];
        const expGameNumber = Test.TEST_EPOCH_DAYS_AGO;
        const actGameNumber = window.dataLayer[i][Metrics.GAME_NUMBER];
        this.logDebug("dataLayer is", window.dataLayer, "test");

        this.verifyEqual(metricEventCountAfter, metricEventCountBefore + 1, "metric eventCount after") &&
            this.verifyEqual(actEventName, expEventName, "event name") &&
            this.verifyEqual(actGameNumber, expGameNumber, "game number") &&
            this.hadNoErrors();
    }

    testDailyGameStateFinishedMetric() {
        this.testName = "DailyGameFinishedMetric";
        const dgs = DailyGameState.factory(this.fullDict);
        const metricEventCountBefore = window.dataLayer.length;
        dgs.finishGame();
        const metricEventCountAfter = window.dataLayer.length;
        const i = metricEventCountAfter - 1;
        const expEventName = Metrics.testingPrefix + Metrics.GAME_FINISHED;
        const actEventName = window.dataLayer[i]["event"];
        const expGameNumber = Test.TEST_EPOCH_DAYS_AGO;
        const actGameNumber = window.dataLayer[i][Metrics.GAME_NUMBER];
        this.logDebug("dataLayer is", window.dataLayer, "test");

        this.verifyEqual(metricEventCountAfter, metricEventCountBefore + 1, "metric eventCount after") &&
            this.verifyEqual(actEventName, expEventName, "last metric event name") &&
            this.verifyEqual(actGameNumber, expGameNumber, "game number") &&
            this.hadNoErrors();
    }



    /*
    ** Game tests
    */

    runGameTests() {
        const startTestTime = Date.now();
        function prep() {
            Persistence.clearAllNonDebug();
            Persistence.saveTestEpochDaysAgo(Test.TEST_EPOCH_DAYS_AGO); //Daily game be game #2
            window.dataLayer = window.dataLayer
        }

        prep(); this.testGameCorrectFirstWord();
        prep(); this.testGameDeleteWrongLetter();
        prep(); this.testGameDeleteBadPosition();
        prep(); this.testGameDifferentWordFromInitialSolution();
        prep(); this.testGameDisplayInstructions();
        prep(); this.testGameDisplayInstructionsMistakes();
        prep(); this.testGameDisplayInstructionsDifferentPath();
        prep(); this.testGameUsingScrabbleWordOK();
        prep(); this.testGameUsingScrabbleWordMistake();
        prep(); this.testGameUsingGeniusMove();
        prep(); this.testGameUsingDodoMove();
        prep(); this.testGameRequiringWordReplay();
        prep(); this.testGameRequiringScrabbleWordReplay();
        prep(); this.testGameFinish();
        prep(); this.testGameFinishAlternatePath();
        prep(); this.testGameShowTargetMove();
        prep(); this.testGameTooManyShowMoves();
        prep(); this.testGameShowEveryMove();
        prep(); this.testGameLosesAfterMistakes();
        prep(); this.testGameLosesOnWrongDelete();
        prep(); this.testGameLosesOnWrongLetterChange();
        prep(); this.testPracticeGamesPerDayLimitReached();
        prep(); this.testNewRandomPracticeGame();
        const endTestTime = Date.now();
        this.logDebug(`game tests elapsed time: ${endTestTime - startTestTime} ms`, "test");
    }

    testGameCorrectFirstWord() {
        this.testName = "GameCorrectFirstWord";

        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);
        let [start, target] = ["SCAD", "BAT"];
        Persistence.saveTestPracticeGameWords(start, target);

        const game = new PracticeGame(smallDict);

        const playResult = game.playDelete(0); // SCAD->CAD
        this.verifyEqual(playResult, Const.GOOD_MOVE, "SCAD to CAD") &&
            this.hadNoErrors();
    }

    testGameDeleteWrongLetter() {
        this.testName = "GameDeleteLetterNotAWord";

        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);
        let [start, target] = ["SCAD", "BAT"];
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(smallDict);

        const playResult = game.playDelete(3);
        this.verifyEqual(playResult, Const.NOT_A_WORD, "delete wrong letter") &&
            this.hadNoErrors();
    }

    testGameDeleteBadPosition() {
        this.testName = "GameDeleteBadPosition";

        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);
        let [start, target] = ["SCAD", "BAT"];
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(smallDict);

        const playResult = game.playDelete(6);
        this.verifyEqual(playResult, Const.BAD_POSITION, "Delete attempted at bad position") &&
            this.hadNoErrors();
    }

    testGameDifferentWordFromInitialSolution() {
        this.testName = "GameDifferentWordFromInitialSolution";

        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAT", "DOG", "SCAD"]);
        let [start, target] = ["BAD", "CAT"];
        const origSolution = Solver.solve(smallDict, start, target); // BAD BAT CAT
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(smallDict);
        const origWord1 = game.gameState.getUnplayedWord(0);

        if ( !(this.verifyEqual(origWord1, "BAT", "original solution first word") &&
        // "bade" is not in the original solution
            this.verifyEqual(origSolution.getSolutionWords().includes('BADE'), false, "Original solution has 'BADE'"))) return;

        const playAddResult = game.playAdd(3);
        if (!this.verifyEqual(playAddResult, Const.GOOD_MOVE, "playAdd(3)")) return;

        const playLetterResult = game.playLetter(3, "E");  // BAD BADE (BATE BAT CAT) or (BAD BAT CAT)
        if (!this.verifyEqual(playLetterResult, Const.DODO_MOVE, "playLetter(3, E)")) return;
        this.logDebug("After playLetter(3,E), game.remainingSteps are:" + game.gameState.getUnplayedWordsAsString(), "test");
        const newPlayedWord = game.gameState.getPlayedWord(1);
        if (!this.verifyEqual(newPlayedWord, "BADE", "Played word 1"))  return;
        const newSolutionWord0 = game.gameState.getUnplayedWord(0);
        this.verifyEqual(newSolutionWord0, "BAD", "New solution continues") &&
            this.hadNoErrors();
    }

    testGameNotShortestSolutionBug() {
        this.testName = "GameNotShortestSolutionBug";
        const solution = Solver.solve(this.fullDict, "BROKEN", "BAKED");
        const foundWords = solution.getSolutionWords();
        const expectedWords = [ "BROKEN", "BROKE", "BRAKE", "BAKE", "BAKED" ];
        this.verify(solution.hadNoErrors(), `error on 'BROKEN' to 'BAKED': ${solution.getError()}`) &&
            this.verifyEqual(foundWords, expectedWords, "solution") &&
            this.hadNoErrors();
    }

    testGameDisplayInstructions() {
        this.testName = "GameDisplayInstructions";
        let [start, target] = ["SCAD", "BAT"]; // SCAD CAD BAD BAT
        Persistence.saveTestPracticeGameWords(start, target);
        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);
        const game = new PracticeGame(smallDict);

        const initialInstructions = game.getDisplayInstructions();

        this.logDebug("test", this.testName, "delete 0 SCAD->CAD", "test");
        const playDeleteResult = game.playDelete(0); // SCAD to CAD
        const afterDeleteInstructions = game.getDisplayInstructions();

        this.logDebug("test", this.testName, "change 0 CAD->BAD", "test");
        const playLetterBResult = game.playLetter(0, "B"); // CAD to BAD
        const afterPlayLetterBInstructions = game.getDisplayInstructions();

        this.logDebug("test", this.testName, "change 2 BAD->BAT done", "test");
        const playLetterTResult = game.playLetter(2, "T"); // BAD to BAT
        const afterPlayLetterTInstructions = game.getDisplayInstructions();

        const expectedInitialInstructions = [
                                // word      type                     change  rating               isStart  parLine
            new DisplayInstruction("SCAD",   Const.PLAYED_DELETE,     -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.FUTURE,            0,       Const.NO_RATING,     false,   false),
            new DisplayInstruction("BAD",    Const.FUTURE,            2,       Const.NO_RATING,     false,   false),
            new DisplayInstruction("BAT",    Const.TARGET,            -1,      Const.NO_RATING,     false,   true),
        ];

        // after delete S
        const expectedPlayDeleteInstructions = [
            new DisplayInstruction("SCAD",   Const.PLAYED,            -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.PLAYED_CHANGE,     0,       Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("?AD",    Const.WORD_AFTER_CHANGE, 2,       Const.NO_RATING,     false,   false),
            new DisplayInstruction("BAT",    Const.TARGET,            -1,      Const.NO_RATING,     false,   true),
        ];

        // after play B
        const expectedPlayLetterBInstructions = [
            new DisplayInstruction("SCAD",   Const.PLAYED,            -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.PLAYED,            -1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("BAD",    Const.PLAYED_CHANGE,      2,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("BA?",    Const.WORD_AFTER_CHANGE, -1,      Const.NO_RATING,     false,   true),
        ];

        // after play T
        const expectedPlayLetterTInstructions = [
            new DisplayInstruction("SCAD",   Const.PLAYED,            -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.PLAYED,            -1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("BAD",    Const.PLAYED,            -1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("BAT",    Const.TARGET,            -1,      Const.GOOD_MOVE,     false,   true),
        ];

        this.verifyInstructionList(initialInstructions, expectedInitialInstructions, "initial") &&
            this.verifyEqual(playDeleteResult, Const.GOOD_MOVE, "playDelete") &&
            this.verifyInstructionList(afterDeleteInstructions, expectedPlayDeleteInstructions, "after delete") &&
            this.verifyEqual(playLetterBResult, Const.GOOD_MOVE, "playLetterBResult") &&
            this.verifyInstructionList(afterPlayLetterBInstructions, expectedPlayLetterBInstructions, "after play letter B") &&
            this.verifyEqual(playLetterBResult, Const.GOOD_MOVE, "playLetterBResult") &&
            this.verifyInstructionList(afterPlayLetterTInstructions, expectedPlayLetterTInstructions, "after play letter T") &&
            this.verifyEqual(playLetterTResult, Const.GOOD_MOVE, "playLetterTResult") &&
            this.hadNoErrors();
    }

    testGameDisplayInstructionsMistakes() {
        this.testName = "GameDisplayInstructionsMistakes";
        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "CAR", "DOG", "SCAD"]);
        let [start, target] = ["SCAD", "BAT"];
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(smallDict);

        // shortest solution is SCAD,CAD,BAD,BAT or SCAD,CAD,CAT,BAT but via BAD is earlier
        // but we make a mistake along the way, playing CAD-->CAR instead of CAD-->BAD, which
        // the interface would not allow us to play.

        const expectedInitialInstructions = [
                                // word      type                     change  rating               isStart  parLine
            new DisplayInstruction("SCAD",   Const.PLAYED_DELETE,     -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.FUTURE,            0,       Const.NO_RATING,     false,   false),
            new DisplayInstruction("BAD",    Const.FUTURE,            2,       Const.NO_RATING,     false,   false),
            new DisplayInstruction("BAT",    Const.TARGET,            -1,      Const.NO_RATING,     false,   true),
        ];

        // after delete "S"
        const expectedAfterDeleteInstructions = [
            new DisplayInstruction("SCAD",   Const.PLAYED,            -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.PLAYED_CHANGE,     0,       Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("?AD",    Const.WORD_AFTER_CHANGE, 2,       Const.NO_RATING,     false,   false),
            new DisplayInstruction("BAT",    Const.TARGET,            -1,      Const.NO_RATING,     false,   true),
        ];

        // after play R
        const expectedCadToCarInstructions = [
            new DisplayInstruction("SCAD",   Const.PLAYED,            -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.PLAYED,            -1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("CAR",    Const.PLAYED_CHANGE,     2,       Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("CA?",    Const.WORD_AFTER_CHANGE, 0,       Const.NO_RATING,     false,   true),
            new DisplayInstruction("BAT",    Const.TARGET,            -1,      Const.NO_RATING,     false,   false),
        ];

        const initialInstructions = game.getDisplayInstructions();
        // In a real game, this wouldn't generate a new instruction list,
        // but rather a toast message.
        const playDeleteNotAWord = game.playDelete(3); // SCAD to SCA

        game.playDelete(0); // SCAD to CAD
        const afterDeleteInstructions = game.getDisplayInstructions();

        const cadToCarResult = game.playLetter(2,"R"); // CAD TO CAR
        const cadToCarInstructions = game.getDisplayInstructions(); // SCAD,CAD,CAR,CAT,BAT

        this.verifyInstructionList(initialInstructions, expectedInitialInstructions, "initial") &&
            this.verifyEqual(playDeleteNotAWord, Const.NOT_A_WORD, "playDelete(3)") &&
            this.verifyInstructionList(afterDeleteInstructions, expectedAfterDeleteInstructions, "after delete") &&
            this.verifyEqual(cadToCarResult, Const.WRONG_MOVE, "playLetter(2,R)") &&
            this.verifyInstructionList(cadToCarInstructions, expectedCadToCarInstructions, "after playing R") &&
            this.hadNoErrors();
    }

    testGameDisplayInstructionsDifferentPath() {
        this.testName = "GameDisplayInstructionsDifferentPath";
        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "CAR", "DOG", "SCAD"]);
        let [start, target] = ["SCAD", "BAT"];
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(smallDict); // shortest solution is SCAD,CAD,BAD,BAT but SCAD,CAD,CAT,BAT also works

        const expectedInitialInstructions = [
                                // word      type                     change  rating               isStart  parLine
            new DisplayInstruction("SCAD",   Const.PLAYED_DELETE,     -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.FUTURE,            0,       Const.NO_RATING,     false,   false),
            new DisplayInstruction("BAD",    Const.FUTURE,            2,       Const.NO_RATING,     false,   false),
            new DisplayInstruction("BAT",    Const.TARGET,            -1,      Const.NO_RATING,     false,   true),
        ];

        // after delete "S"
        const expectedAfterDeleteInstructions = [
            new DisplayInstruction("SCAD",   Const.PLAYED,            -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.PLAYED_CHANGE,     0,       Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("?AD",    Const.WORD_AFTER_CHANGE, 2,       Const.NO_RATING,     false,   false),
            new DisplayInstruction("BAT",    Const.TARGET,            -1,      Const.NO_RATING,     false,   true),
        ];

        // after playing CAD->CAT instead of CAD->BAD
        const expectedCadToCatInstructions = [
            new DisplayInstruction("SCAD",   Const.PLAYED,            -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.PLAYED,            -1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("CAT",    Const.PLAYED_CHANGE,     0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("?AT",    Const.WORD_AFTER_CHANGE, -1,      Const.NO_RATING,     false,   true),
        ];

        const initialInstructions = game.getDisplayInstructions();

        game.playDelete(0); // SCAD to CAD
        const afterDeleteInstructions = game.getDisplayInstructions();

        const cadToCatResult = game.playLetter(2,"T"); // CAD TO CAT instead of CAD to BAD
        const cadToCatInstructions = game.getDisplayInstructions(); // SCAD,CAD,CAT,BAT

        this.verifyInstructionList(initialInstructions, expectedInitialInstructions, "initial") &&
            this.verifyInstructionList(afterDeleteInstructions, expectedAfterDeleteInstructions, "after delete") &&
            this.verifyEqual(cadToCatResult, Const.GOOD_MOVE, "playLetter(2,T)") &&
            this.verifyInstructionList(cadToCatInstructions, expectedCadToCatInstructions, "after playing T") &&
            this.hadNoErrors();
    }

    testGameUsingScrabbleWordOK() {
        this.testName = "GameUsingScrabbleWordOK";
        const smallDict = new WordChainDict(["BAD", "BAT", "CAT", "MAR", "CAR"]);
        // shortest solution is BAD,BAT,CAT,CAR  alt using scrabble: BAD,MAD,MAR,CAR  MAD is the scrabble word
        let [start, target] = ["BAD", "CAR"];
        Persistence.saveTestPracticeGameWords(start, target);

        const expectedInitialInstructions = [
                                // word      type                     change  rating               isStart  parLine
            new DisplayInstruction("BAD",    Const.PLAYED_CHANGE,     2,       Const.NO_RATING,     true,    false),
            new DisplayInstruction("BA?",    Const.WORD_AFTER_CHANGE, 0,       Const.NO_RATING,     false,   false),
            new DisplayInstruction("CAT",    Const.FUTURE,            2,       Const.NO_RATING,     false,   false),
            new DisplayInstruction("CAR",    Const.TARGET,            -1,      Const.NO_RATING,     false,   true),
        ];
        const expectedAfterMInstructions = [
            new DisplayInstruction("BAD",    Const.PLAYED,            -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("MAD",    Const.PLAYED_CHANGE,     2,       Const.SCRABBLE_MOVE, false,   false),
            new DisplayInstruction("MA?",    Const.WORD_AFTER_CHANGE, 0,       Const.NO_RATING,     false,   false),
            new DisplayInstruction("CAR",    Const.TARGET,            -1,      Const.NO_RATING,     false,   true),
        ];


        const game = new PracticeGame(smallDict);
        const initialInstructions = game.getDisplayInstructions();
        const badToMadResult = game.playLetter(0,"M");
        const afterMInstructions = game.getDisplayInstructions();

        this.verifyEqual (badToMadResult, Const.SCRABBLE_MOVE, "BAD->MAD returns") &&
            this.verifyInstructionList(initialInstructions, expectedInitialInstructions, "initial") &&
            this.verifyInstructionList(afterMInstructions, expectedAfterMInstructions, "after playing MAD") &&
            this.hadNoErrors();
    }

    testGameUsingScrabbleWordMistake() {
        this.testName = "GameUsingScrabbleWordMistake";
        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "CAR", "DOG", "SCAD", "SAG", "SAT"]);
        let [start, target] = ["SCAD", "BAT"]; // SCAD,CAD,BAD,BAT but we play SCAD,SCAG, (SAG, SAT, BAT)
        Persistence.saveTestPracticeGameWords(start, target);

        const expectedInitialInstructions = [
                                // word      type                     change  rating               isStart  parLine
            new DisplayInstruction("SCAD",   Const.PLAYED_DELETE,     -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.FUTURE,            0,       Const.NO_RATING,     false,   false),
            new DisplayInstruction("BAD",    Const.FUTURE,            2,       Const.NO_RATING,     false,   false),
            new DisplayInstruction("BAT",    Const.TARGET,            -1,      Const.NO_RATING,     false,   true),
        ];
        const expectedAfterScagInstructions = [
            new DisplayInstruction("SCAD",    Const.PLAYED,           -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("SCAG",    Const.PLAYED_DELETE,    -1,      Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("SAG",     Const.FUTURE,           2,       Const.NO_RATING,     false,   false),
            new DisplayInstruction("SAT",     Const.FUTURE,           0,       Const.NO_RATING,     false,   true),
            new DisplayInstruction("BAT",     Const.TARGET,           -1,      Const.NO_RATING,     false,   false),
        ];
        const expectedAfterSagInstructions = [
            new DisplayInstruction("SCAD",    Const.PLAYED,           -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("SCAG",    Const.PLAYED,           -1,      Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("SAG",     Const.PLAYED_CHANGE,    2,       Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("SA?",     Const.WORD_AFTER_CHANGE,0,       Const.NO_RATING,     false,   true),
            new DisplayInstruction("BAT",     Const.TARGET,           -1,      Const.NO_RATING,     false,   false),
        ];

        // starting
        const game = new PracticeGame(smallDict); // shortest solution is SCAD,CAD,BAD,BAT or SCAD,CAD,CAT,BAT
        const initialInstructions = game.getDisplayInstructions();

        // play SCAD to SCAG using scrabble word instead of SCAD to CAD
        const scadToScagResult = game.playLetter(3,"G"); // SCAD to SCAG uses scrabble word, which is also a mistake
        const afterScagInstructions = game.getDisplayInstructions(); // Solution should now be SCAD, SCAG, SAG, SAT, BAT

        // play SCAG to SAG which is correct now.
        const scagToSagResult = game.playDelete(1); // SCAG to SAG.
        const afterSagInstructions = game.getDisplayInstructions();

        this.verifyInstructionList(initialInstructions, expectedInitialInstructions, "initial") &&
            this.verifyEqual(scadToScagResult, Const.WRONG_MOVE, "playLetter(3,G)") &&
            this.verifyInstructionList(afterScagInstructions, expectedAfterScagInstructions, "afterScag") &&
            this.verifyEqual(scagToSagResult, Const.GOOD_MOVE, "playDelete(1)") &&
            this.verifyInstructionList(afterSagInstructions, expectedAfterSagInstructions, "afterSag") &&
            this.hadNoErrors();
    }

    testGameUsingGeniusMove() {
        this.testName = "GameUsingGeniusMove";
        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "CAR", "DOG", "SCAD", "SAG", "SAT"]);

        // shortest solution is SCAD,CAD,CAT,SAT,SAG, but genius solution is SCAD,SCAG,SAG
        let [start, target] = ["SCAD", "SAG"];
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(smallDict);

        const expectedInitialInstructions = [
                                // word      type                     change  rating               isStart  parLine
            new DisplayInstruction("SCAD",   Const.PLAYED_DELETE,     -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.FUTURE,            2,       Const.NO_RATING,     false,   false),
            new DisplayInstruction("CAT",    Const.FUTURE,            0,       Const.NO_RATING,     false,   false),
            new DisplayInstruction("SAT",    Const.FUTURE,            2,       Const.NO_RATING,     false,   false),
            new DisplayInstruction("SAG",    Const.TARGET,            -1,      Const.NO_RATING,     false,   true),
        ];

        const expectedAfterScagInstructions = [
            new DisplayInstruction("SCAD",   Const.PLAYED,            -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("SCAG",   Const.PLAYED_DELETE,     -1,      Const.GENIUS_MOVE,   false,   false),
            new DisplayInstruction("SAG",    Const.TARGET,            -1,      Const.NO_RATING,     false,   false),
        ];

        const expectedAfterSagInstructions = [
            new DisplayInstruction("SCAD",   Const.PLAYED,            -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("SCAG",   Const.PLAYED,            -1,      Const.GENIUS_MOVE,   false,   false),
            new DisplayInstruction("SAG",    Const.TARGET,            -1,      Const.GOOD_MOVE,     false,   false),
        ];

        const initialInstructions = game.getDisplayInstructions();
        const scadToScagResult = game.playLetter(3,"G"); // SCAD to SCAG uses scrabble word
        const afterScagInstructions = game.getDisplayInstructions();
        const scagToSagResult = game.playDelete(1); // SCAG to SAG.
        const afterSagInstructions = game.getDisplayInstructions();

        this.verifyInstructionList(initialInstructions, expectedInitialInstructions, "initial") &&
            this.verifyEqual(scadToScagResult, Const.GENIUS_MOVE, "after playing scag result") &&
            this.verifyInstructionList(afterScagInstructions, expectedAfterScagInstructions, "afterScag") &&
            this.verifyEqual(scagToSagResult, Const.GOOD_MOVE, "after playing sag result") &&
            this.verifyInstructionList(afterSagInstructions, expectedAfterSagInstructions, "afterScag") &&
            this.hadNoErrors();
    }

    testGameUsingDodoMove() {
        this.testName = "GameUsingDodoMove";
        let [start, target] = ["PLANE", "PANED"];
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(this.fullDict);
        // shortest solution is PLANE,PANE,PANED, but dodo move is PLANE,PLAN,PAN,PANE,PANED

        const expectedInitialInstructions = [
                                // word       type                     change  rating               isStart  parLine
            new DisplayInstruction("PLANE",   Const.PLAYED_DELETE,     -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("PANE",    Const.FUTURE,            -1,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("PANED",   Const.TARGET,            -1,      Const.NO_RATING,     false,   true),
        ];

        const expectedPlaneToPlanInstructions = [
            new DisplayInstruction("PLANE",   Const.PLAYED,            -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("PLAN",    Const.PLAYED_DELETE,     -1,      Const.DODO_MOVE,     false,   false),
            new DisplayInstruction("PAN",     Const.FUTURE,            -1,      Const.NO_RATING,     false,   true),
            new DisplayInstruction("PANE",    Const.FUTURE,            -1,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("PANED",   Const.TARGET,            -1,      Const.NO_RATING,     false,   false),
        ];

        const expectedPlanToPanInstructions = [
            new DisplayInstruction("PLANE",   Const.PLAYED,            -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("PLAN",    Const.PLAYED,            -1,      Const.DODO_MOVE,     false,   false),
            new DisplayInstruction("PAN",     Const.PLAYED_ADD,        -1,      Const.GOOD_MOVE,     false,   true),
            new DisplayInstruction("PANE",    Const.FUTURE,            -1,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("PANED",   Const.TARGET,            -1,      Const.NO_RATING,     false,   false),
        ];

        const expectedPanToPanXInstructions = [
            new DisplayInstruction("PLANE",   Const.PLAYED,            -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("PLAN",    Const.PLAYED,            -1,      Const.DODO_MOVE,     false,   false),
            new DisplayInstruction("PAN",     Const.PLAYED,            -1,      Const.GOOD_MOVE,     false,   true),
            new DisplayInstruction("PAN?",    Const.WORD_AFTER_ADD,    -1,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("PANED",   Const.TARGET,            -1,      Const.NO_RATING,     false,   false),
        ];

        const expectedPanXToPaneInstructions = [
            new DisplayInstruction("PLANE",   Const.PLAYED,            -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("PLAN",    Const.PLAYED,            -1,      Const.DODO_MOVE,     false,   false),
            new DisplayInstruction("PAN",     Const.PLAYED,            -1,      Const.GOOD_MOVE,     false,   true),
            new DisplayInstruction("PANE",    Const.PLAYED_ADD,        -1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("PANED",   Const.TARGET,            -1,      Const.NO_RATING,     false,   false),
        ];

        const expectedPaneToPaneXInstructions = [
            new DisplayInstruction("PLANE",   Const.PLAYED,            -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("PLAN",    Const.PLAYED,            -1,      Const.DODO_MOVE,     false,   false),
            new DisplayInstruction("PAN",     Const.PLAYED,            -1,      Const.GOOD_MOVE,     false,   true),
            new DisplayInstruction("PANE",    Const.PLAYED,            -1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("PANE?",   Const.WORD_AFTER_ADD,    -1,      Const.NO_RATING,     false,   false),
        ];

        const expectedPaneXToPanedInstructions = [
            new DisplayInstruction("PLANE",   Const.PLAYED,            -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("PLAN",    Const.PLAYED,            -1,      Const.DODO_MOVE,     false,   false),
            new DisplayInstruction("PAN",     Const.PLAYED,            -1,      Const.GOOD_MOVE,     false,   true),
            new DisplayInstruction("PANE",    Const.PLAYED,            -1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("PANED",   Const.TARGET,            -1,      Const.GOOD_MOVE,     false,   false),
        ];

        const initialInstructions = game.getDisplayInstructions();

        const planeToPlanResult = game.playDelete(4); // PLANE to PLAN; the dodo move
        const planeToPlanInstructions = game.getDisplayInstructions();

        const planToPanResult = game.playDelete(1); // PLAN to PAN; correct
        const planToPanInstructions = game.getDisplayInstructions();

        const panToPanXAddResult = game.playAdd(3); // PAN to PAN?; correct (really should be unrated?)
        const panToPanXInstructions = game.getDisplayInstructions();

        const panXToPaneChangeResult = game.playLetter(3, "E"); // PAN? to PANE; correct
        const panXToPaneInstructions = game.getDisplayInstructions();

        const paneToPaneXAddResult = game.playAdd(4); // PANE to PANE?; correct
        const paneToPaneXInstructions = game.getDisplayInstructions();

        const paneXToPanedChangeResult = game.playLetter(4, "D"); // PANE? to PANED; correct
        const paneXToPanedInstructions = game.getDisplayInstructions();

        this.verifyInstructionList(initialInstructions, expectedInitialInstructions, "initial") &&
            this.verifyEqual(planeToPlanResult, Const.DODO_MOVE, "Plane to Plan result") &&
            this.verifyInstructionList(planeToPlanInstructions, expectedPlaneToPlanInstructions, "plane to plan") &&
            this.verifyEqual(planToPanResult, Const.GOOD_MOVE, "Plan to Pan result") &&
            this.verifyInstructionList(planToPanInstructions, expectedPlanToPanInstructions, "plan to pan") &&
            this.verifyEqual(panToPanXAddResult, Const.GOOD_MOVE, "Pan to PanX result") &&
            this.verifyInstructionList(panToPanXInstructions, expectedPanToPanXInstructions, "pan to panX") &&
            this.verifyEqual(panXToPaneChangeResult, Const.GOOD_MOVE, "PanX to Pane result") &&
            this.verifyInstructionList(panXToPaneInstructions, expectedPanXToPaneInstructions, "panX to pane") &&
            this.verifyEqual(paneToPaneXAddResult, Const.GOOD_MOVE, "Pane to PaneX result") &&
            this.verifyInstructionList(paneToPaneXInstructions, expectedPaneToPaneXInstructions, "pane to paneX") &&
            this.verifyEqual(paneXToPanedChangeResult, Const.GOOD_MOVE, "PaneX to Paned result") &&
            this.verifyInstructionList(paneXToPanedInstructions, expectedPaneXToPanedInstructions, "paneX to paned") &&
            this.hadNoErrors();
    }

    testGameRequiringWordReplay() {
        this.testName = "GameRequiringWordReplay";
        let [start, target] = ["BLISS", "LEST"];
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(this.fullDict);
        // BLISS,BLIPS (D'OH) should now display as BLISS BLIPS BLISS BLESS LESS LEST (6) not
        // BLISS BLIPS LIPS LAPS LASS LAST LEST (7)

        const expectedDisplayLength = 6;
        const blissToBlipsResult = game.playLetter(3,"P");
        const displayInstructions = game.getDisplayInstructions(); // Solution should now be BLISS, BLIPS, BLISS, BLESS, LESS, LEST
        game.finishGame();
        const score = game.getNormalizedScore();
        const expScore = 2; // dodo move adds two steps
        this.logDebug(this.testName, "displayInstructions: ", displayInstructions, "test");
        this.verifyEqual(blissToBlipsResult, Const.DODO_MOVE, "playLetter(3,P)") &&
        this.verifyEqual(score, expScore, "score") &&
        this.verifyEqual(displayInstructions.length, expectedDisplayLength, "expected display instructions length") &&
        this.hadNoErrors();
    }

    testGameRequiringScrabbleWordReplay() {
        this.testName = "GameRequiringScrabbleWordReplay";
        let [start, target] = ["FREE", "SAMPLE"];
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(this.fullDict);
        // FREE, FEE, FIE, FILE, MILE, SMILE, SIMILE, SIMPLE, SAMPLE 9 instructions
        // playing FREE FEE FIE FILE SILE(scrabble-only) SIDLE (wrong) should give display instructions:
        // FREE FEE FIE FILE SILE SIDLE SILE            SMILE SIMILE SIMPLE SAMPLE length 11
        // not
        // FREE FEE FIE FILE SILE SIDLE SIDE SITE SMITE SMILE SIMILE SIMPLE SAMPLE  length 13

        const expectedDisplayLength = 11;
        let result  = game.playDelete(1); // -> FEE
        result = game.playLetter(1, "I"); // -> FIE
        result = game.playAdd(2);         // -> FIxE
        result = game.playLetter(2, "L"); // -> FILE
        result = game.playLetter(0, "S"); // -> SILE
        result = game.playAdd(2);         // -> SIxLE
        result = game.playLetter(2, "D"); // -> SIDLE  wrong move
        // Solution should now be FREE FEE FIE FILE SILE SIDLE SILE SMILE SIMILE SIMPLE SAMPLE
        const displayInstructions = game.getDisplayInstructions();
        this.logDebug(this.testName, "displayInstructions: ", displayInstructions, "test");
        this.verifyEqual(result, Const.DODO_MOVE, "playing add 'D' at 2") &&
        this.verifyEqual(displayInstructions.length, expectedDisplayLength, "display instructions length") &&
        this.hadNoErrors();
    }

    testGameFinish() {
        this.testName = "GameFinish";

        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);
        let [start, target] = ["SCAD", "BAT"];
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(smallDict);

        const playResult = game.playDelete(0); // SCAD->CAD
        game.finishGame();
        const displayInstructionsAfterFinish = game.getDisplayInstructions(); // Solution should now be SCAD, CAD, CAT, BAT
        const originalSolutionAsString = game.getOriginalSolutionWords();
        const playedSolutionAsString = game.getUserSolutionWords();
        const expOriginalSolutionAsString = "SCAD⇒CAD⇒BAD⇒BAT";
        const expPlayedSolutionAsString = "SCAD⇒CAD⇒BAD⇒BAT";
        this.verifyEqual(playResult, Const.GOOD_MOVE, "playResult") &&
            this.verifyEqual(displayInstructionsAfterFinish.length, 4, "after finishGame(), display instructions length") &&
            this.verifyEqual(originalSolutionAsString, expOriginalSolutionAsString, "solution as string") &&
            this.verifyEqual(playedSolutionAsString, expPlayedSolutionAsString, "played solution as string") &&
            this.verify(game.isOver()) &&
            this.hadNoErrors();
    }

    testGameShowEveryMove() {
        this.testName = "GameShowEveryMove";

        let [start, target] = ["SCAD", "BAT"];
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(this.fullDict);

        game.gameState.showUnplayedMoves();

        const expectedFinalInstructions = [
                                // word      type                     change  rating               isStart  parLine
            new DisplayInstruction("SCAD",   Const.PLAYED,            -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.PLAYED,            -1,      Const.SHOWN_MOVE,    false,   false),
            new DisplayInstruction("BAD",    Const.PLAYED,            -1,      Const.SHOWN_MOVE,    false,   false),
            new DisplayInstruction("BAT",    Const.TARGET,            -1,      Const.SHOWN_MOVE,    false,   true),
        ];

        const displayInstructions = game.getDisplayInstructions(); // Solution should now be SCAD, CAD, CAT, BAT
        this.verifyInstructionList(displayInstructions, expectedFinalInstructions, "after show all moves" ) &&
            this.verify(game.isOver(), 'expected game to be over, but it is not') &&
            this.hadNoErrors();
    }

    testGameShowTargetMove() {
        this.testName = "GameShowTargetMove";

        let [start, target] = ["SCAD", "BAT"];
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(this.fullDict);
        game.playDelete(0);      // SCAD -> CAD
        game.playLetter(0, "B"); // CAD  -> BAD
        const showWordResult = game.showNextMove();

        const expectedFinalInstructions = [
                                // word      type                     change  rating               isStart  parLine
            new DisplayInstruction("SCAD",   Const.PLAYED,            -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.PLAYED,            -1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("BAD",    Const.PLAYED,            -1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("BAT",    Const.TARGET,            -1,      Const.SHOWN_MOVE,    false,   true),
        ];

        const displayInstructions = game.getDisplayInstructions(); // Solution should now be SCAD, CAD, CAT, BAT
        this.verifyEqual(game.isOver(), true, 'gameIsOver') &&
            this.verifyInstructionList(displayInstructions, expectedFinalInstructions, "after show next move" ) &&
            this.verifyEqual(showWordResult, Const.SHOWN_MOVE, "showWordResult") &&
            this.hadNoErrors();
    }

    testGameTooManyShowMoves() {
        this.testName = "GameTooManyShowMoves";

        let [start, target] = ["SCAD", "BAT"];
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(this.fullDict);
        game.playDelete(0);     // SCAD -> CAD
        const showWordResult1 = game.showNextMove();
        const showWordResult2 = game.showNextMove();
        this.verifyEqual(game.isOver(), false, 'gameIsOver') &&
            this.verifyEqual(showWordResult1, Const.SHOWN_MOVE, "showWordResult1") &&
            this.verifyEqual(showWordResult2, Const.UNEXPECTED_ERROR, "showWordResult2") &&
            this.hadNoErrors();
    }

    testGameFinishAlternatePath() {
        this.testName = "GameFinishAlternatePath";

        let [start, target] = ["LEAKY", "SPOON"];
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(this.fullDict);
        var result;
        result = game.playDelete(4);     // LEAKY->LEAK
        result = game.playLetter(3,"N"); // LEAK->LEAN
        result = game.playLetter(1,"O"); // LEAN->LOAN
        result = game.playLetter(2,"O"); // LOAN->LOON
        // next 3 give .. POON->SPOON
        result = game.playLetter(0,"P"); // LOON->POON
        result = game.playAdd(0);        // POON->?POON
        result = game.playLetter(0,"S"); // ?POON->SPOON
        // next 3 give .. SOON->SPOON
        const originalSolutionAsString = game.getOriginalSolutionWords();
        const playedSolutionAsString = game.getUserSolutionWords();
        const expOriginalSolutionAsString = "LEAKY⇒LEAK⇒LEAN⇒LOAN⇒<br>LOON⇒SOON⇒SPOON";
        const expPlayedSolutionAsString = "LEAKY⇒LEAK⇒LEAN⇒LOAN⇒<br>LOON⇒POON⇒SPOON";
        this.verifyEqual(originalSolutionAsString, expOriginalSolutionAsString, "OriginalSolutionAsString") &&
            this.verifyEqual(playedSolutionAsString, expPlayedSolutionAsString, "PlayedSolutionAsString") &&
            this.verify(game.isOver()) &&
            this.hadNoErrors();
    }

    testPracticeGamesPerDayLimitReached() {
        this.testName = "PracticeGamesPerDayLimitReached";
        var game = new PracticeGame(this.fullDict);
        for (var i = 0; i < Const.PRACTICE_GAMES_PER_DAY; i++) {
            game.finishGame();
            game = game.nextGame();
        }
        this.verifyEqual(game, null, "last practice game") &&
            this.hadNoErrors();
    }

    testNewRandomPracticeGame() {
        this.testName = "NewRandomPracticeGame";
        Persistence.clearTestPracticeGameWords();
        var game = new PracticeGame(this.fullDict);
        this.verify(game.gameState.start.length >= 3, "start too short") &&
            this.verify(game.gameState.target.length >= 3, "target too short") &&
            this.verify(!game.isOver(), "practice game is over") &&
            this.hadNoErrors();
    }

    testGameLosesOnWrongLetterChange() {
        this.testName = "GameLosesOnWrongLetterChange";
        let [start, target] = ["SALTED", "FISH"];
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(this.fullDict);
        let r1 = game.playDelete(2);      // -> SATED
        let r2 = game.playLetter(0, "F"); // -> FATED
        let r3 = game.playDelete(4);      // -> FATE
        let r4 = game.playDelete(3);      // -> FAT
        let r5 = game.playAdd(1);         // -> F_AT
        let r6 = game.playLetter(1, "L"); // -> FLAT wrong
        let r7 = game.playLetter(1, "R"); // -> FRAT wrong
        let r8 = game.playLetter(1, "E"); // -> FEAT wrong
        let r9 = game.playLetter(2, "L"); // -> FELT wrong
        const beforeLossDisplayInstructions = game.getDisplayInstructions();
        let r10 = game.playLetter(2, "E"); // -> FEET wrong

        const finalDisplayInstructions = game.getDisplayInstructions();

        const expectedBeforeLossInstructions = [
                                // word      type                     change  rating               isStart  parLine
            new DisplayInstruction("SALTED", Const.PLAYED,            -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("SATED",  Const.PLAYED,            -1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("FATED",  Const.PLAYED,            -1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("FATE",   Const.PLAYED,            -1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("FAT",    Const.PLAYED,            -1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("FLAT",   Const.PLAYED,            -1,      Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("FRAT",   Const.PLAYED,            -1,      Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("FEAT",   Const.PLAYED,            -1,      Const.WRONG_MOVE,    false,   true),
            new DisplayInstruction("FELT",   Const.PLAYED_CHANGE,     2,       Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("FE?T",   Const.WORD_AFTER_CHANGE, 1,       Const.NO_RATING,     false,   false),
            new DisplayInstruction("FIST",   Const.FUTURE,            3,       Const.NO_RATING,     false,   false),
            new DisplayInstruction("FISH",   Const.TARGET,            -1,      Const.NO_RATING,     false,   false),
        ];


        const expectedFinalInstructions = [
                                // word      type                     change  rating               isStart  parLine
            new DisplayInstruction("SALTED", Const.PLAYED,            -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("SATED",  Const.PLAYED,            -1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("FATED",  Const.PLAYED,            -1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("FATE",   Const.PLAYED,            -1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("FAT",    Const.PLAYED,            -1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("FLAT",   Const.PLAYED,            -1,      Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("FRAT",   Const.PLAYED,            -1,      Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("FEAT",   Const.PLAYED,            -1,      Const.WRONG_MOVE,    false,   true),
            new DisplayInstruction("FELT",   Const.PLAYED,            -1,      Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("FEET",   Const.PLAYED,            -1,      Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("FEST",   Const.PLAYED,            -1,      Const.SHOWN_MOVE,    false,   false),
            new DisplayInstruction("FIST",   Const.PLAYED,            -1,      Const.SHOWN_MOVE,    false,   false),
            new DisplayInstruction("FISH",   Const.TARGET,            -1,      Const.SHOWN_MOVE,    false,   false),
        ];

        this.verifyEqual(r1, Const.GOOD_MOVE, "r1") &&
            this.verifyEqual(r2, Const.GOOD_MOVE, "r2") &&
            this.verifyEqual(r3, Const.GOOD_MOVE, "r3") &&
            this.verifyEqual(r4, Const.GOOD_MOVE, "r4") &&
            this.verifyEqual(r5, Const.GOOD_MOVE, "r5") &&
            this.verifyEqual(r6, Const.WRONG_MOVE, "r6") &&
            this.verifyEqual(r7, Const.WRONG_MOVE, "r7") &&
            this.verifyEqual(r8, Const.WRONG_MOVE, "r8") &&
            this.verifyEqual(r9, Const.WRONG_MOVE, "r9") &&
            this.verifyEqual(r10, Const.WRONG_MOVE, "r10") &&
            this.verifyInstructionList(beforeLossDisplayInstructions, expectedBeforeLossInstructions, "before last extra step") &&
            this.verifyInstructionList(finalDisplayInstructions, expectedFinalInstructions, "losing game final") &&
            this.verify(game.isOver(), "losing game should be over") &&
            this.verify(!game.isWinner(), "losing game should not be a winner") &&
            this.hadNoErrors();
    }

    testGameLosesAfterMistakes() {
        this.testName = "GameLosesAfterMistakes";
        let [start, target] = ["FISH", "SALTED"];
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(this.fullDict);
        let r1 = game.playLetter(3, "T"); // -> FIST
        let r2 = game.playLetter(1, "E"); // -> FEST wrong
        let r3 = game.playLetter(1, "A"); // -> FAST
        let r4 = game.playDelete(2);      // -> FAT
        let r5 = game.playAdd(1);         // -> F_AT
        let r6 = game.playLetter(1, "R"); // -> FRAT dodo - requires undoing back to FAT
        let r7 = game.playDelete(1);      // -> FAT
        let r8 = game.playAdd(1);         // -> F_AT
        let r9 = game.playLetter(1, "E"); // -> FEAT dodo -- score is now 5+

        const displayInstructions = game.getDisplayInstructions();
        const expectedFinalInstructions = [
                                // word      type                     change  rating               isStart  parLine
            new DisplayInstruction("FISH",   Const.PLAYED,            -1,     Const.NO_RATING,     true,    false),
            new DisplayInstruction("FIST",   Const.PLAYED,            -1,     Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("FEST",   Const.PLAYED,            -1,     Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("FAST",   Const.PLAYED,            -1,     Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("FAT",    Const.PLAYED,            -1,     Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("FRAT",   Const.PLAYED,            -1,     Const.DODO_MOVE,     false,   false),
            new DisplayInstruction("FAT",    Const.PLAYED,            -1,     Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("FEAT",   Const.PLAYED,            -1,     Const.DODO_MOVE,     false,   true),
            new DisplayInstruction("EAT",    Const.PLAYED,            -1,     Const.SHOWN_MOVE,    false,   false),
            new DisplayInstruction("SAT",    Const.PLAYED,            -1,     Const.SHOWN_MOVE,    false,   false),
            new DisplayInstruction("SATE",   Const.PLAYED,            -1,     Const.SHOWN_MOVE,    false,   false),
            new DisplayInstruction("SATED",  Const.PLAYED,            -1,     Const.SHOWN_MOVE,    false,   false),
            new DisplayInstruction("SALTED", Const.TARGET,            -1,     Const.SHOWN_MOVE,    false,   false),
        ];

        this.verifyEqual(r1, Const.GOOD_MOVE, "r1") &&
            this.verifyEqual(r2, Const.WRONG_MOVE, "r2") &&
            this.verifyEqual(r3, Const.GOOD_MOVE,  "r3") &&
            this.verifyEqual(r4, Const.GOOD_MOVE,  "r4") &&
            this.verifyEqual(r5, Const.GOOD_MOVE,  "r5") &&
            this.verifyEqual(r6, Const.DODO_MOVE,  "r6") &&
            this.verifyEqual(r7, Const.GOOD_MOVE,  "r7") &&
            this.verifyEqual(r8, Const.GOOD_MOVE,  "r8") &&
            this.verifyEqual(r9, Const.DODO_MOVE,  "r9") &&
            this.verifyInstructionList(displayInstructions, expectedFinalInstructions, "lost game final") &&
            this.verify(game.isOver(), "losing game should be over") &&
            this.verify(!game.isWinner(), "losing game should not be a winner") &&
            this.hadNoErrors();
    }

    testGameLosesOnWrongDelete() {
        this.testName = "GameLosesOnWrongDelete";
        let [start, target] = ["SALTED", "FISH"];
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(this.fullDict);
        game.playDelete(2);      // -> SATED
        game.playLetter(0, "D"); // -> DATED
        game.playDelete(4);      // -> DATE
        game.playLetter(0, "M"); // -> MATE
        game.playLetter(0, "R"); // -> RATE
        game.playLetter(0, "L"); // -> LATE
        game.playLetter(0, "F"); // -> FATE
        game.playDelete(0);      // -> ATE  too many wrong moves

        const displayInstructions = game.getDisplayInstructions();
        const expectedFinalInstructions = [
                                // word      type                     change  rating               isStart  parLine
            new DisplayInstruction("SALTED", Const.PLAYED,            -1,     Const.NO_RATING,     true,    false),
            new DisplayInstruction("SATED",  Const.PLAYED,            -1,     Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("DATED",  Const.PLAYED,            -1,     Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("DATE",   Const.PLAYED,            -1,     Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("MATE",   Const.PLAYED,            -1,     Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("RATE",   Const.PLAYED,            -1,     Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("LATE",   Const.PLAYED,            -1,     Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("FATE",   Const.PLAYED,            -1,     Const.GOOD_MOVE,     false,   true),
            new DisplayInstruction("ATE",    Const.PLAYED,            -1,     Const.DODO_MOVE,     false,   false),
            new DisplayInstruction("FATE",   Const.PLAYED,            -1,     Const.SHOWN_MOVE,    false,   false),
            new DisplayInstruction("FAT",    Const.PLAYED,            -1,     Const.SHOWN_MOVE,    false,   false),
            new DisplayInstruction("FAST",   Const.PLAYED,            -1,     Const.SHOWN_MOVE,    false,   false),
            new DisplayInstruction("FIST",   Const.PLAYED,            -1,     Const.SHOWN_MOVE,    false,   false),
            new DisplayInstruction("FISH",   Const.TARGET,            -1,     Const.SHOWN_MOVE,    false,   false),
        ];

        this.verifyInstructionList(displayInstructions, expectedFinalInstructions, "unfinished game final") &&
            this.verify(game.isOver(), "losing game should be over") &&
            this.verify(!game.isWinner(), "losing game should not be a winner") &&
            this.hadNoErrors();
    }

    // TODO - this test is not being used
    testGameStuckOnWrongSpaceAdded() {
        this.testName = "GameStuckOnWrongSpaceAdded";
        let [start, target] = ["FISH", "SALTED"];
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(this.fullDict);
        let r1 = game.playLetter(3, "T"); // -> FIST
        let r3 = game.playLetter(1, "A"); // -> FAST
        let r4 = game.playDelete(2);      // -> FAT
        let r14 = game.playAdd(0);         // -> _FAT At this point, no letter works to make a word.
        let r15 = game.playLetter(0, "A"); // -> AFAT is not a word.  FAT should now be the active word.
        let DIs = game.getDisplayInstructions();
        let DIsAsStrings = DIs.map((di) => di.toStr()).join(",<br>");
        let expectedDIsAsStrings = `(played,word:FISH,moveRating:ok),<br>(played,word:FIST,moveRating:ok),<br>(played,word:FAST,moveRating:ok),<br>(add,word:FAT),<br>(future,word:FATE,changePosition:0),<br>(future,word:FATED,changePosition:1),<br>(future,word:SATED,changePosition:0),<br>(target,word:SALTED)`;

            this.verifyEqual(r1, Const.GOOD_MOVE, "r1") &&
                this.verifyEqual(r3, Const.GOOD_MOVE, "r3") &&
                this.verifyEqual(r4, Const.GOOD_MOVE, "r4") &&
                this.verifyEqual(r14, Const.GOOD_MOVE, "r14") &&
                this.verifyEqual(r15, Const.NOT_A_WORD, "r15") &&
                this.verify(!game.isOver(), "game should not be over yet") &&
                this.verify(!game.isWinner(), "game should not be a winner after too many wrong moves") &&
                this.verifyEqual(DIsAsStrings, expectedDIsAsStrings, "display instructions as strings") &&
                this.hadNoErrors();
    }
    /*
    ** App Tests
    ** App tests need to be run one after the other, pausing to wait for the app window to display, etc.
    ** These tests use the utilities in the App Testing Framework section, above.
    **
    */

    getAppTests() {
        return [
            this.multiGameStatsTest,
            this.multiGameMixedResultsStatsTest,
            this.multiIncompleteGameStatsTest,
            this.dailyGameNormalFinishStatsTest,
            this.dailyGameUnfinishedRestartNextDayTest,
            this.dailyGameTooManyMistakesShareTest,
            this.dailyGameEndsOnDeleteShareTest,
            this.dailyGameRestartTest,
            this.dailyGameRestartAfterWrongMoveTest,
            this.dailyGameOneMistakeShareTest,
            this.dailyGameShowWordStatsTest,
            this.dailyGameShowWordToWinTest,
            this.dailyGameResultsDivOnWinTest,
            this.dailyGameResultsDivOnExactWinTest,
            this.dailyGameResultsDivWithShownTest,
            this.dailyGameResultsDivOnLossTest,
            this.updateDailyGameDataTest,
            this.practiceGameTestNoConfirm,
            this.practiceGameTest,
            this.practiceGameLimitTest,
            this.geniusMoveAndShareTest,
            this.cookieRestartTest,
            this.changeMindOnSelectedLettersTest,
            this.displayModesTest,
            this.displayBrokenDailyGameToastTest,
            this.sameLetterPickedToastTest,
            this.notAWordToastTest,
            this.toastTestDailyWin,
            this.toastTestRecoverDailyWin,
        ];
    }

    runAppTests() {

        // To speed up the app initialization, we pre-define the practice games so that we don't have to search for one.
        // The practice game is TEST ... PILOT by default.
        Persistence.saveTestPracticeGameWords("TEST", "PILOT");
        let newWindow = this.getNewAppWindow();
        if (!(newWindow && newWindow.localStorage && newWindow.theAppDisplayIsReady)) {
            this.openTheTestAppWindow();
            this.logDebug("app test window isn't ready yet; will try again.", "test");
            inTheFuture(1000).then( (foo=this) => {foo.runAppTests()} )
            return;
        }
        this.logDebug("window for App tests is ready.", "test");

        this.setGameDisplay();
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
            this.logDebug(">>>>>>>>>>>> running appTest=", testFuncName, "test");
            const testStart = Date.now();
            this.runAppTest(appTestFunc);
            const testDone = Date.now();
            this.logDebug(">>>>>>>>>>>>", testFuncName, " took ", testDone - testStart, " ms", "test");
            inTheFuture(100).then( (foo=this) => {foo.runTheNextTest()})
        } else {
            this.logDebug("no more tests to run - showing results", "test");
            this.closeTheTestAppWindow();
            this.showResults();
        }
    }

    // confirmation is a function of the GameDisplay so to test it we need to be playing a game
    changeMindOnSelectedLettersTest() {
        // restore default confirmation mode
        Persistence.saveConfirmationMode(true);

        this.testName = "ChangeMindOnSelectedLetters";
        // SHORT -> POOR
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR
        // but we play  SHORT SHOOT SHOT HOT POT POO POOR
        const changeLetterResult1 = this.playLetter("O", "Z"); // SHORT -> SHOZT not confirmed -> SHOOT confirmed
        const deleteLetterResult1 = this.deleteLetter(2,4);    // SHOOT -> SHOO not confirmed -> SHOT confirmed
        const deleteLetterResult2 = this.deleteLetter(0);      // SHOT -> HOT  we are deleting even though not really a display option on this step.
        const changeLetterResult2 = this.playLetter("P")       // HOT -> POT
        const changeLetterResult3 = this.playLetter("O");      // POT -> POO
        const insertLetterResult1 = this.insertLetter(3, "R", 0);  // POO -> xPOO change mind -> POOx -> POOR
        this.verifyEqual(changeLetterResult1, Const.GOOD_MOVE, "after changing mind from Z to O") &&
            this.verifyEqual(deleteLetterResult1, Const.WRONG_MOVE, "after changing mind from HOOT to SHOT") &&
            this.verifyEqual(deleteLetterResult2, Const.GOOD_MOVE, "after SHOT to HOT") &&
            this.verifyEqual(changeLetterResult2, Const.GOOD_MOVE, "after HOT to POT") &&
            this.verifyEqual(changeLetterResult3, Const.GOOD_MOVE, "after POT to POO") &&
            this.verifyEqual(insertLetterResult1, Const.GOOD_MOVE, "after changing mind from POO -> xPOO to POOx->POOR") &&
            this.hadNoErrors();
    }

    // start playing daily game for day 2, and then continue on day 3.  It should be a new, unplayed game.
    dailyGameUnfinishedRestartNextDayTest() {
        this.testName = "DailyGameUnfinishedRestartNextDay";
        // SHORT -> POOR
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR
        // play two moves, then close and try to restore ...
        this.playLetter(3, "O"); // SHORT -> SHOOT
        this.deleteLetter(0);    // SHOOT -> HOOT

        // re-open the app window, as if it were one day later
        const expGameNumber = Test.TEST_EPOCH_DAYS_AGO + 1;
        Persistence.saveTestEpochDaysAgo(expGameNumber);
        this.resetTheTestAppWindow();
        let gameState = this.gameDisplay.getGameState(),
            dailyShareButton = this.gameDisplay.shareButton;

        let [start, target, gameNumber] = [gameState.start, gameState.target, gameState.dailyGameNumber];
        let [expStart, expTarget] = Const.DAILY_GAMES[3].map(word => word.toUpperCase());
        this.verifyEqual(start, expStart, "After restart, start word") &&
            this.verifyEqual(target, expTarget, "After restart, target word") &&
            this.verifyEqual(gameNumber, expGameNumber, "After restart, daily game number") &&
            this.verifyEqual(dailyShareButton.hasAttribute('disabled'),  true, "Daily game share button has 'disabled' attribute") &&
            this.hadNoErrors();
    }

    toastTestDailyWin() {
        this.testName = "ToastTestDailyWin";
        // The newly opened URL should be showing the test daily game by default;
        const appDisplay = this.getNewAppWindow().theAppDisplay;

        this.playTheCannedDailyGameOnce();
        const toastAfterGame = appDisplay.getAndClearLastToast();
        const toastClass = appDisplay.toastDiv.getAttribute("class");
        const toastMsg = appDisplay.toastDiv.innerHTML;
        const expToastClass = "pop-up show";
        const expToastMsg = Const.GAME_WON;
        this.verifyEqual(toastClass, expToastClass, "toast class") &&
            this.verifyEqual(toastMsg, expToastMsg, "toast message") &&
            this.verifyEqual(toastAfterGame, Const.GAME_WON, "toast after game") &&
            this.hadNoErrors();
    }

    toastTestRecoverDailyWin() {
        this.testName = "ToastTestRecoverDailyWin";
        // The newly opened URL should be showing the test daily game by default;
        this.playTheCannedDailyGameOnce();
        // The game is finished and persisted.  Now re-open the app.  The daily game is won; we should NOT
        // see a toast for that.
        this.resetTheTestAppWindow();
        const appDisplay = this.getNewAppWindow().theAppDisplay;
        const toastClass = appDisplay.toastDiv.getAttribute("class");
        const toastMsg = appDisplay.toastDiv.innerHTML;
        const expToastClass = "pop-up hide";
        this.verifyEqual(toastClass, expToastClass, "toast class") &&
            this.hadNoErrors();
   }

    dailyGameNormalFinishStatsTest() {
        this.testName = "DailyGameNormalFinishStats";

        // The newly opened URL should be showing the test daily game by default;
        this.playTheCannedDailyGameOnce();

        // game is done.  Let's see what the saved stats and words played are:
        const statsDisplay = this.openAndGetTheStatsDisplay();

        // create and verify an expected DailyStats blob
        let expStatsBlob = { gamesStarted : 1, gamesWon : 1, gamesLost : 0, streak : 1 };
        let expExtraStepsHistogram = { 0: 1, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let testResults = this.verifyStats(expStatsBlob, expExtraStepsHistogram);

        // now, get and check the share string:

        let statsSrcElement = new MockEventSrcElement();
        let statsMockEvent = new MockEvent(statsSrcElement);
        let actShareString = statsDisplay.shareCallback(statsMockEvent);
        let expShareString = `WordChain #${Test.TEST_EPOCH_DAYS_AGO + 1} ⭐\nStreak: 1\nSHORT --> POOR\n🟪🟪🟪🟪🟪\n🟩🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n`;
        this.closeTheStatsDisplay();
        testResults &&
            this.verifyEqual(actShareString.indexOf(expShareString), 0, "share string begins with") &&
            this.verify((actShareString.indexOf(Const.SHARE_URL) > 0), `expected to see url root ${Const.SHARE_URL} in share string, got '${actShareString}'`) &&
            this.hadNoErrors();
    }

    // multiGameStatsTest plays the daily game 3 times and
    // then checks both the stats cookie, and the elements in the StatsContainer.
    // In order to test the streak, it is necessary to play a different game number each time.  For this test,
    // we simulate by setting the LastWonGameNumber in storage to one less than the current daily game number before re-playing
    // Each replay is of the same calculated game number, so we set the LastWonGameNumber to be one less than this, so it looks
    // like a continuing win streak;

    multiGameStatsTest() {
        this.testName = "MultiGameStats";
        // play the already opened game:
        let game = this.gameDisplay.game;
        this.logDebug(this.testName, "using daily game:", game, "test");
        this.playTheCannedDailyGameOnce(); // this runs in-line.  When it finishes, the game is actually done

        for (let gameCounter = 0; gameCounter <= 1; gameCounter++) {
            // Re-open open the test window, and repeat
            // Don't let the game pick up where it left off, which is a finished game.
            // Don't clear all the cookies because we are accumulating stats data with them across games here.
            let gameState = game.gameState;
            gameState.dailyGameNumber -= 1; // make it look like we finished yesterday's game.  Stats will be recovered, but the game will be updated
            Persistence.saveDailyGameState2(gameState);
            this.logDebug("Saving daily game state with game number rolled back:", gameState, "test");

            this.resetTheTestAppWindow();
            game = this.gameDisplay.game;
            this.playTheCannedDailyGameOnce(); // this runs in-line.  When it finishes, the game is actually done
        }

        // create an expected DailyStats blob
        let expStatsBlob = { gamesStarted : 3, gamesWon : 3, gamesLost : 0, streak : 3 };
        let expExtraStepsHistogram = { 0: 3, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        this.verifyStats(expStatsBlob, expExtraStepsHistogram) && this.hadNoErrors();
    }

    displayModesTest () {
        this.testName = "DisplayModes";
        const appDisplay = this.getNewAppWindow().theAppDisplay;
        const settingsDisplay = appDisplay.settingsDisplay;

        let srcElement = new MockEventSrcElement();
        var mockEvent = new MockEvent(srcElement);
        var soFarSoGood = this.verifyEqual(Persistence.getColorblindMode(), false, "colorblind mode (1)") &&
            this.verifyEqual(Persistence.getDarkTheme(), false, "dark theme (1)");

        srcElement.setAttribute("id", "colorblind");
        // colorblind on, dark off
        srcElement.checked = true;
        settingsDisplay.checkboxCallback(mockEvent);
        soFarSoGood &&= this.verifyEqual(Persistence.getColorblindMode(), true, "colorblind mode (2)");
        // colorblind off, dark off
        srcElement.checked = false;
        settingsDisplay.checkboxCallback(mockEvent);
        soFarSoGood &&= this.verifyEqual(Persistence.getColorblindMode(), false, "colorblind mode (3)");

        srcElement.setAttribute("id", "dark");
        // dark mode on, colorblind off
        srcElement.checked = true;
        settingsDisplay.checkboxCallback(mockEvent);
        soFarSoGood &&= this.verifyEqual(Persistence.getDarkTheme(), true, "dark theme (2)");
        // dark mode off, colorblind off
        srcElement.checked = false;
        settingsDisplay.checkboxCallback(mockEvent);
        soFarSoGood &&= this.verifyEqual(Persistence.getDarkTheme(), false, "dark theme (3)");

        // dark mode on, colorblind mode on
        srcElement.setAttribute("id", "dark");
        srcElement.checked = true;
        settingsDisplay.checkboxCallback(mockEvent);
        srcElement.setAttribute("id", "colorblind");
        srcElement.checked = true;
        settingsDisplay.checkboxCallback(mockEvent);

        soFarSoGood &&= this.verifyEqual(Persistence.getColorblindMode(), true, "colorblind mode (4)") &&
            this.verifyEqual(Persistence.getDarkTheme(), true, "dark mode (4)");

        // confirmation mode - just testing the appDisplay's callback
        srcElement.setAttribute("id", "confirmation");
        srcElement.checked = true;
        settingsDisplay.checkboxCallback(mockEvent);
        soFarSoGood &&= this.verifyEqual(Persistence.getConfirmationMode(), true, "confirmation mode (1)");
        srcElement.checked = false;
        settingsDisplay.checkboxCallback(mockEvent);
        soFarSoGood &&= this.verifyEqual(Persistence.getConfirmationMode(), false, "confirmation mode (2)");

        soFarSoGood && this.hadNoErrors();
    }

    displayBrokenDailyGameToastTest() {
        this.testName = "DisplayBrokenDailyGameToast";
        Persistence.saveTestEpochDaysAgo(1000000); // so long ago, there is no daily game for today

        // re-open the app window
        this.resetTheTestAppWindow();

        const appDisplay = this.getNewAppWindow().theAppDisplay;
        const lastToast = appDisplay.getAndClearLastToast();
        // we should be running the broken daily game.
        const game = this.gameDisplay.game;
        // We can finish the broken game; this will exercise code to NOT display the share button because game is broken
        this.finishTheCurrentGame();

        // let's look at the share ...
        let statsDisplay = this.openAndGetTheStatsDisplay(),
            dailyShareButton = this.gameDisplay.shareButton,
            statsShareButton = statsDisplay.shareButton;

        this.verify(game.dailyGameIsBroken(), "Expected broken daily game") &&
            this.verify(game.isWinner(), "Expected game to be winner") &&
            this.verifyEqual(dailyShareButton.hasAttribute('disabled'), true, "daily game screen share button has 'disabled' attribute.") &&
            this.verifyEqual(statsShareButton.hasAttribute('disabled'), true, "stats screen share button has 'disabled' attribute.") &&
            this.verifyEqual(lastToast, Const.NO_DAILY, "last toast") &&
            this.hadNoErrors();
    }

    // a test that makes 0, 1, or 2 errors depending on which iteration
    // See multiGameStatsTest for how we make the multiple games appear to be a winning streak by
    // manually adjusting the last won game number.

    multiGameMixedResultsStatsTest() {
        this.testName = "MultiGameMixedResultsStats";

        for (let gameCounter = 0; gameCounter <= 2; gameCounter++) {
            // game: SHORT -> POOR
            // solution: SHORT SHOOT HOOT BOOT BOOR POOR
            this.playLetter("O");    // SHORT -> SHOOT
            this.deleteLetter(0);    // SHOOT -> HOOT now change 0
            this.playLetter("B");    // HOOT -> BOOT now change 3
                                     // optionally add one or two wrong moves on the last letter
            if (gameCounter >= 1) {
                this.playLetter("K"); // BOO? -> BOOK mistake
            }
            if (gameCounter >= 2) {
                this.playLetter("B"); // BOO? -> BOOB another mistake
            }
            this.playLetter("R");     // BOO? -> BOOR now change 0
            this.playLetter("P");     // BOO? -> POOR
            // now, play the same game again, if we have another round to go.
            if (gameCounter != 2) {
                let game = this.gameDisplay.game;
                let gameState = game.gameState;
                gameState.dailyGameNumber -= 1; // make it look like we last played yesterday's game.
                Persistence.saveDailyGameState2(gameState);
                this.logDebug("Saving daily game state with game number rolled back:", gameState, "test");
                this.resetTheTestAppWindow();
            }
        }

        // create the expected daily stats blob
        let expStatsBlob = { gamesStarted : 3, gamesWon : 3, gamesLost : 0, streak : 3 };
        let expExtraStepsHistogram = { 0: 1, 1: 1, 2: 1, 3: 0, 4: 0, 5: 0 };
        this.verifyStats(expStatsBlob, expExtraStepsHistogram) && this.hadNoErrors();
    }

    // multiIncompleteGameStatsTest plays the daily game 3 times:
    // one incomplete, one successful, and one failed - now also incomplete.
    // Checks both the saved stats, and the elements in the StatsContainer.
    // The streak should be 3

    multiIncompleteGameStatsTest() {
        this.testName = "MultiIncompleteGameStats";
        for (let gameCounter = 0; gameCounter <= 2; gameCounter++) {
            this.logDebug(this.testName, "gameCounter: ", gameCounter, "test");
            if (gameCounter == 0) {
                // play an incomplete game
                // SHORT -> POOR
                // solution: SHORT SHOOT HOOT BOOT BOOR POOR
                this.playLetter("O"); // SHORT -> SHOOT now delete
                this.deleteLetter(0);    // SHOOT -> HOOT now change 0
                this.playLetter("B"); // HOOT -> BOOT
            } else if (gameCounter == 1) {
                // play a full game
                this.playTheCannedDailyGameOnce();
            } else if (gameCounter == 2) {
                // play a failed game)
                this.playLetter("O"); // SHORT -> SHOOT now delete
                this.deleteLetter(0); // SHOOT -> HOOT now change 0
                this.playLetter("B"); // HOOT -> BOOT now change 3
                this.playLetter("K"); // BOOT -> BOOK error now change 3
                this.playLetter("T"); // BOOK -> BOOT error now change 3
                this.playLetter("K"); // BOOT -> BOOK error now change 3
                this.playLetter("T"); // BOOK -> BOOT error now change 3
                this.playLetter("K"); // BOOT -> BOOK error
                this.verify(this.gameDisplay.game.isLoser(), "expected game to be loser after too many mistakes");
            }

            if (gameCounter != 2) {
                // adjust the saved GameState so that it indicates that we just played "yesterday's" game.  On restart,
                // we will play today's game and adjust
                let game = this.gameDisplay.game;
                let gameState = game.gameState;
                gameState.dailyGameNumber -= 1; // make it look like we last played yesterday's game.
                Persistence.saveDailyGameState2(gameState);
                this.resetTheTestAppWindow();
            }
        }

        // create and verify an expected DailyStats blob
        let expStatsBlob = { gamesStarted : 3, gamesWon : 1, gamesLost : 1, streak : 3 };
        let expExtraStepsHistogram = { 0: 1, 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 };
        this.verifyStats(expStatsBlob, expExtraStepsHistogram) && this.hadNoErrors();
    }

    dailyGameResultsDivOnWinTest() {
        this.testName = "DailyGameResultsDivOnWin";
        // play and finish the daily game with 1 wrong, 1 shown, move
        // verify the score is 2, and that word chains original solution is shown

        const mockEvent = null; // not used by callback

        // The newly opened URL should be showing the test daily game by default:
        // SHORT -> POOR
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR
        // we play:  SHORT SHOOT HOOT BOOT(shown) BOOK(wrong) BOOR POOR

        this.playLetter("O"); // SHORT -> SHOOT
        this.deleteLetter(0); // SHOOT -> HOOT now change 0
        this.playLetter("B"); // HOOT  -> BOOT now change 3
        this.gameDisplay.showWordCallback(mockEvent); // reveals BOOR, now change 0
        this.playLetter("M"); // BOOR -> MOOR WRONG now change 0
        this.playLetter("B"); // MOOR -> BOOR WRONG now change 0
        this.playLetter("P"); // solved; results should be displayed

        const resultsDiv = this.gameDisplay.resultsDiv;
        const children = resultsDiv.children;
        if (!this.verifyEqual (children.length, 3, "children in results div"))
            return;
        const scoreDiv = children[0];
        const expScoreStr = "Score: 2 extra steps";
        const actScoreStr = scoreDiv.textContent;

        const originalSolutionDiv = children[1];
        const originalSolutionLabel = originalSolutionDiv.children[0];
        const expSolutionStr = "WordChain's solution:SHORT⇒SHOOT⇒HOOT⇒BOOT⇒BOOR⇒POOR";
        const actSolutionStr = originalSolutionLabel.textContent;
        this.verifyEqual(actScoreStr, expScoreStr, "score string") &&
            this.verifyEqual(actSolutionStr, expSolutionStr, "solution string") &&
            this.hadNoErrors();
    }

    dailyGameShowWordToWinTest() {
        this.testName = "DailyGameShowWordToWin";

        const mockEvent = null; // not used by callback

        // The newly opened URL should be showing the test daily game by default:
        // SHORT -> POOR
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR
        // we play:  SHORT SHOOT HOOT BOOT BOOR POOR(shown)

        this.playLetter("O"); // SHORT -> SHOOT
        this.deleteLetter(0); // SHOOT -> HOOT now change 0
        this.playLetter("B"); // HOOT  -> BOOT now change 3
        this.playLetter("R"); // BOOT  -> BOOR now change 0
        const showToWinResult = this.gameDisplay.showWordCallback(mockEvent); // reveals POOR, game over
        const showAfterWinResult = this.gameDisplay.showWordCallback(mockEvent); // should fail after game is over

        this.verifyEqual(showToWinResult, Const.SHOWN_MOVE, "showToWinResult") &&
            this.verifyEqual(showAfterWinResult, Const.UNEXPECTED_ERROR, "showAfterWinResult") &&
            this.hadNoErrors();
    }

    dailyGameResultsDivOnExactWinTest() {
        // we play the canned daily game once, perfectly.
        // verify that the score displayed is 0 -- no mistakes
        // verify that the message is You found WordChain's solution
        this.testName = "DailyGameResultsDivOnExactWinDiv";

        this.playTheCannedDailyGameOnce();

        const resultsDiv = this.gameDisplay.resultsDiv;
        const children = resultsDiv.children;
        if (!this.verifyEqual (children.length, 3, "num children in results div"))
            return;
        const scoreDiv = children[0];
        const expScoreStr = "Score: 0 -- perfect!";
        const actScoreStr = scoreDiv.textContent;

        const originalSolutionDiv = children[1];
        const originalSolutionLabel = originalSolutionDiv.children[0];
        const expSolutionStr = "You found WordChain's solution!";
        const actSolutionStr = originalSolutionLabel.textContent;
        this.verifyEqual(actScoreStr, expScoreStr, "score string") &&
            this.verifyEqual(actSolutionStr, expSolutionStr, "solution string") &&
            this.hadNoErrors();
    }

    dailyGameResultsDivWithShownTest() {
        this.testName = "DailyGameResultsDivWithShown";
        // play and finish the daily game with 1 shown, move
        // verify the score is 1, and that word chains original solution is not shown, because it is the same as the displayed game

        const mockEvent = null; // not used by callback

        // The newly opened URL should be showing the test daily game by default:
        // SHORT -> POOR
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR
        // we play:  SHORT SHOOT HOOT BOOT BOOR(shown) POOR

        this.playLetter("O"); // SHORT -> SHOOT
        this.deleteLetter(0); // SHOOT -> HOOT
        this.playLetter("B"); // HOOT  -> BOOT
        this.gameDisplay.showWordCallback(mockEvent); // reveals BOOR
        this.playLetter("P"); // solved; results should be displayed
        const showAfterDoneResult = this.gameDisplay.showWordCallback(mockEvent);

        const resultsDiv = this.gameDisplay.resultsDiv;
        const children = resultsDiv.children;
        if (!this.verifyEqual (children.length, 3, "number children in results div"))
            return;

        const scoreDiv = children[0];
        const expScoreStr = "Score: 0 -- perfect!";
        const actScoreStr = scoreDiv.textContent;

        const originalSolutionDiv = children[1];
        const originalSolutionLabel = originalSolutionDiv.children[0]
        const expSolutionStr = "You found WordChain's solution!";
        const actSolutionStr = originalSolutionLabel.textContent

        this.verifyEqual(originalSolutionDiv.children.length, 1, "number children in original solution div") &&
            this.verifyEqual(actScoreStr, expScoreStr, "score string") &&
            this.verifyEqual(actSolutionStr, expSolutionStr, "solution string") &&
            this.verifyEqual(showAfterDoneResult, Const.UNEXPECTED_ERROR, "showWordCallback returns") &&
            this.hadNoErrors();
    }

    dailyGameResultsDivOnLossTest() {
        this.testName = "DailyGameResultsDivOnLoss";
        // play and finish the daily game with 5 errors, non shown
        // verify the score is 1, and that word chains original solution is shown
        // AND, verify that after restarting, the display instructions show the
        // game as lost

        const mockEvent = null; // not used by callback

        // The newly opened URL should be showing the test daily game by default:
        // SHORT -> POOR
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR
        // we play:  SHORT SHOOT HOOT BOOT BOOK-wrong BOOB-wrong BOOT-wrong BOOK-wrong BOOT-wrong (BOOR POOR shown)

        this.playLetter("O"); // SHORT -> SHOOT
        this.deleteLetter(0); // SHOOT -> HOOT
        this.playLetter("B"); // HOOT -> BOOT now change 3
        this.playLetter("K"); // BOOT -> BOOK  D'OH wrong move 1
        this.playLetter("B"); // BOOK -> BOOB  D'OH wrong move 2
        this.playLetter("T"); // BOOB -> BOOT  D'OH wrong move 3
        this.playLetter("K"); // BOOT -> BOOK  D'OH wrong move 4
        this.playLetter("T"); // BOOK -> BOOT  D'OH wrong move 5

        // game should be over if Const.TOO_MANY_EXTRA_STEPS is 5
        const game = this.gameDisplay.game;
        if (!this.verify(game.isOver(), "after 5 wrong moves, game is not over!"))
            return;

        const resultsDiv = this.gameDisplay.resultsDiv;
        const children = resultsDiv.children;

        const scoreDiv = children[0];

        const expScoreStr = "Score: 5 -- too many extra steps!";
        const actScoreStr = scoreDiv.textContent;

        const originalSolutionDiv = children[1]
        const originalSolutionLabel = originalSolutionDiv.children[0]
        const expSolutionStr = "WordChain's solution:SHORT⇒SHOOT⇒HOOT⇒BOOT⇒BOOR⇒POOR"
        const actSolutionStr = originalSolutionLabel.textContent

        // re-open the app window
        this.resetTheTestAppWindow();
        const restartedGame = this.gameDisplay.game;
        const restartedDi = restartedGame.getDisplayInstructions();
        this.verifyEqual(actScoreStr, expScoreStr, "score string") &&
        this.verifyEqual(actSolutionStr, expSolutionStr, "solution string") &&
        this.verifyEqual(restartedDi[8].moveRating, Const.WRONG_MOVE, "move rating 8") &&
        this.verifyEqual(restartedDi[10].moveRating, Const.SHOWN_MOVE, "move rating 10") &&
        this.verify(!restartedGame.isWinner(), "restarted game should not be winner.") &&
            this.hadNoErrors();
    }

    unfinishedDailyGameStatsTest() {
        // the stats after an unfinished daily game should show
        // - streak is up one for trying
        // - won and lost counts unchanged
        // - mistake histogram unchanged
        // First, save some pre-existing stats with a streak and histogram.
        // Then, play but don't finish the daily game
        // TODO
    }

    updateDailyGameDataTest() {
        // calls the timer call-back in AppDisplay to update the daily game.
        this.testName = "UpdateDailyGameData";
        const appDisplay = this.getNewAppWindow().theAppDisplay;
        const result1 = appDisplay.checkForNewDailyGame();
        // Now, change the existing game number to something else, so that the game IS old
        const game = this.gameDisplay.game;
        game.gameState.dailyGameNumber = 1; // this game is always old.
        const result2 = appDisplay.checkForNewDailyGame();

        this.verifyEqual(result1, false, 'result1') &&
        this.verifyEqual(result2, true, 'result2') &&
            this.hadNoErrors();
    }

    dailyGameShowWordStatsTest() {
        // We verify the following:
        // Play the daily game, with 4 extra words.
        // Then 1 shown word
        // Then make another wrong move to end the game
        // Target word should be loss (display instruction PLAYED,WRONG_MOVE)
        // Remaining words after the 3rd shown move are also shown
        // Streak reset to 1
        // Share is correct
        // Show Word button is disabled
        // DailyStats has 1 played, 1 lost

        this.testName = "DailyGameShowWordStats";
        const mockEvent = null; // not used by callback

        // The newly opened URL should be showing the test daily game by default:
        // SHORT -> POOR
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR
        // we play:  SHORT SHOOT SHOO(dodo) SHOOT(ok) SHOO(dodo) SHOOT(ok) SHOO (dodo) SHOOK(show) SPOOK(show)
        // at that point, the game ends and the solution is shown ... SPOOR(shown) POOR(target, wrong)

        const r1 = this.playLetter("O");      // SHORT -> SHOOT now delete
        const r2 = this.deleteLetter(4);      // SHOOT -> SHOO DODO
        const r3 = this.insertLetter(4, "T"); // SHOO-> SHOOT GOOD_MOVE
        const r4 = this.deleteLetter(4);      // SHOOT -> SHOO DODO
        const r5 = this.insertLetter(4, "T"); // SHOO-> SHOOT GOOD_MOVE
        const r6 = this.deleteLetter(4);      // SHOOT -> SHOO DODO, game over

        if ( !(
                this.verifyEqual(r1, Const.GOOD_MOVE, "r1") &&
                this.verifyEqual(r2, Const.DODO_MOVE, "r2") &&
                this.verifyEqual(r3, Const.GOOD_MOVE, "r3") &&
                this.verifyEqual(r4, Const.DODO_MOVE, "r4") &&
                this.verifyEqual(r5, Const.GOOD_MOVE, "r5") &&
                this.verifyEqual(r6, Const.DODO_MOVE, "r6")
              )
           ) {
            return;
        }

        const expStatsBlob = { gamesStarted : 1, gamesWon : 0, gamesLost : 1, streak : 1 };
        // the only completed game has 5 wrong moves (6 errors)
        const expExtraStepsHistogram = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 };
        const statsTestResult = this.verifyStats(expStatsBlob, expExtraStepsHistogram);
        this.logDebug("statsTestResult: ", statsTestResult, "test");

        if (statsTestResult) {
            const game = this.gameDisplay.game;
            const gameIsWinner = game.isWinner();
            const statsDisplay = this.openAndGetTheStatsDisplay();
            const statsSrcElement = new MockEventSrcElement();
            const statsMockEvent = new MockEvent(statsSrcElement);
            const actShareString = statsDisplay.shareCallback(statsMockEvent);
            this.closeTheStatsDisplay();
            const expShareString = `WordChain #${Test.TEST_EPOCH_DAYS_AGO + 1} 😖\nStreak: 1\nSHORT --> POOR\n🟪🟪🟪🟪🟪\n🟩🟩🟩🟩🟩\n🟥🟥🟥🟥\n🟩🟩🟩🟩🟩\n🟥🟥🟥🟥\n🟩🟩🟩🟩🟩\n🟥🟥🟥🟥\n⬜⬜⬜⬜\n⬜⬜⬜\n⬜⬜⬜\n⬜⬜⬜\n🟥🟥🟥🟥\n`;
            this.verify(!gameIsWinner, "game should not be a winner.") &&
            this.verifyEqual(actShareString.indexOf(expShareString), 0, "share string starts with") &&
            this.hadNoErrors();
        }
        this.closeTheStatsDisplay();
    }

    dailyGameOneMistakeShareTest() {
        this.testName = "DailyGameOneMistakeShare";

        // The newly opened URL should be showing the test daily game by default:
        // SHORT -> POOR solution: SHORT SHOOT HOOT BOOT BOOR POOR

        this.playLetter("O");    // SHORT -> SHOOT now delete
        this.deleteLetter(0);    // SHOOT -> HOOT now change 0
        this.playLetter("B");    // HOOT -> BOOT now change 3
        const appDisplay = this.getNewAppWindow().theAppDisplay;
        appDisplay.clearLastToast();
        this.playLetter("K");    // BOOT -> BOOK  D'OH wrong move now change 3
        const toastAfterWrongMove = appDisplay.getAndClearLastToast();
        this.playLetter("R");    // BOOK -> BOOR
        this.playLetter("P");    // BOOR -> POOR

        // game is done.  Let's see what the saved stats and words played are:
        const dailyShareButton = this.gameDisplay.shareButton,
              statsDisplay = this.openAndGetTheStatsDisplay(),
              statsShareButton = statsDisplay.shareButton;

        //  write the share string and verify it:
        // TODO: this only verifies the shareString contents, not whether the share is copied to clipboard or the devices
        // 'share' mechanism.  the clipboard.writeText() call is async, and the catch() clause doesn't
        // execute on error in the callpath of stats.Display.shareCallback().  The error is handled async; the call
        // to shareCallback() always returns the calculated shareString, NOT whether it was written to the clipboard.

        const statsSrcElement = new MockEventSrcElement();
        const statsMockEvent = new MockEvent(statsSrcElement);
        const actShareString = statsDisplay.shareCallback(statsMockEvent);
        const expShareString = `WordChain #${Test.TEST_EPOCH_DAYS_AGO + 1} 1️⃣\nStreak: 1\nSHORT --> POOR\n🟪🟪🟪🟪🟪\n🟩🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟥🟥🟥🟥\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n`
        this.closeTheStatsDisplay();

        this.verifyEqual(actShareString.indexOf(expShareString), 0, "share string starts with") &&
            this.verifyEqual(dailyShareButton.hasAttribute('disabled'), false, "daily game screen share button 'disabled' attribute.") &&
            this.verifyEqual(statsShareButton.hasAttribute('disabled'), false, "stats screen share button 'disabled' attribute.") &&
            this.verifyEqual(toastAfterWrongMove, Const.WRONG_MOVE, "toast") &&
            this.hadNoErrors();

    }

    // this test verifies that after failing a game, the game is over, the share shows the mad face and wrong moves, and the streak is at zero.

    dailyGameTooManyMistakesShareTest() {
        this.testName = "DailyGameTooManyMistakesShare";

        // The newly opened URL should be showing the test daily game by default:
        const game = this.gameDisplay.game;

        // SHORT -> POOR
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR

        this.playLetter("O"); // SHORT -> SHOOT
        this.deleteLetter(0); // SHOOT -> HOOT
        this.playLetter("B"); // HOOT -> BOOT
        this.playLetter("K"); // BOOT -> BOOK  D'OH wrong move 1
        this.playLetter("B"); // BOOK -> BOOB  D'OH wrong move 2
        this.playLetter("T"); // BOOB -> BOOT  D'OH wrong move 3
        this.playLetter("K"); // BOOT -> BOOK  D'OH wrong move 4

        this.verify(!game.isOver(), "after 4 wrong moves, game should not be over");

        this.playLetter("T"); // BOOK -> BOOT  D'OH wrong move 5

        // game should be over if Const.TOO_MANY_EXTRA_STEPS is 5.
        if (!this.verify(game.isOver(), "after 5 wrong moves, game should be over")) {
            return;
        }

        const appDisplay = this.getNewAppWindow().theAppDisplay;
        const gameLostToast = appDisplay.getAndClearLastToast();

        // game is done.  Let's see what the saved stats and words played are:
        // open the stats window.  This should compute the shareString, start the countdown clock
        const dailyShareButton = this.gameDisplay.shareButton,
              statsDisplay = this.openAndGetTheStatsDisplay(),
              statsShareButton = statsDisplay.shareButton;

        //  get the share string.  Note that after the final mistake, no more words are shown (unplayed) leading to the target.

        let statsSrcElement = new MockEventSrcElement();
        let statsMockEvent = new MockEvent(statsSrcElement);
        statsDisplay.openAuxiliaryCallback(statsMockEvent);
        let actShareString = statsDisplay.shareCallback(statsMockEvent);
        const shareToast = appDisplay.getAndClearLastToast();
        let expShareString = `WordChain #${Test.TEST_EPOCH_DAYS_AGO + 1} 😖\nStreak: 1\nSHORT --> POOR\n🟪🟪🟪🟪🟪\n🟩🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟥🟥🟥🟥\n🟥🟥🟥🟥\n🟥🟥🟥🟥\n🟥🟥🟥🟥\n🟥🟥🟥🟥\n⬜⬜⬜⬜\n🟥🟥🟥🟥\n`;
        this.closeTheStatsDisplay();

        this.verifyEqual(actShareString.indexOf(expShareString), 0, "share string starts with") &&
            this.verifyEqual(dailyShareButton.hasAttribute('disabled'), false, "daily game screen share button 'disabled' attribute.") &&
            this.verifyEqual(statsShareButton.hasAttribute('disabled'), false, "stats screen share button 'disabled' attribute.") &&
            this.verifyEqual(gameLostToast, Const.GAME_LOST, "game lost toast") &&
            this.verifyEqual(shareToast, Const.SHARE_TO_PASTE, "share toast") &&
            this.hadNoErrors();
    }

    // this test verifies that the share is good on a game that ends with a last-step delete.  It is the first game played, and verifies that the streak is 1.

    dailyGameEndsOnDeleteShareTest() {
        this.testName = "DailyGameEndsOnDeleteShare";

        // We need to re-open the test window with a contrived daily game, not the default.
        Persistence.saveTestDailyGameWords("START", "END");
        this.resetTheTestAppWindow();

        // The newly re-opened URL should be showing the daily game START -> END
        const game = this.gameDisplay.game;

        // START -> END
        // solution: START STAT SEAT SENT SEND END

        this.deleteLetter(3);    // START -> STAT now change 1
        this.playLetter("E");    // STAT -> SEAT now change 2
        this.playLetter("N");    // SEAT -> SENT now change 3
        this.playLetter("D");    // SENT -> SEND now delete
        this.deleteLetter(0);    // SEND -> END

        this.logDebug("finishDailyGameEndsOnDeleteShareTest(): game:", game, "test");
        if (!this.verify(game.isOver(), "game should be over!")) {
            return;
        }

        // game is done.  Let's see what the saved stats and words played are:
        // open the stats window.  This should compute the shareString, start the countdown clock
        const statsDisplay = this.openAndGetTheStatsDisplay();

        let statsSrcElement = new MockEventSrcElement();
        let statsMockEvent = new MockEvent(statsSrcElement);

        //  get the share string.  use-case: the last play is a Delete
        let actShareString = statsDisplay.shareCallback(statsMockEvent);
        let expShareString = `WordChain #${Const.TEST_DAILY_GAME_NUMBER + 1} ⭐\nStreak: 1\nSTART --> END\n🟪🟪🟪🟪🟪\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟩🟩🟩\n`;

        this.closeTheStatsDisplay();
        this.verifyEqual(actShareString.indexOf(expShareString), 0, "share string starts with") &&
            this.hadNoErrors();
    }

    dailyGameRestartTest() {
        // The newly opened URL should be showing the daily game by default;
        this.testName = "DailyGameRestart";

        // known game should be SHORT -> POOR, the game number will be 2.
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR

        // play two moves, then close and try to restore ...
        this.playLetter("O"); // SHORT -> SHOOT
        this.deleteLetter(0); // SHOOT -> HOOT

        // save the first game (in progress)
        const game1 = this.gameDisplay.game;

        // re-open the app window
        this.resetTheTestAppWindow();

        // we should be running the daily game SHORT -> POOR with SHOOT, HOOT already played.
        const game2 = this.gameDisplay.game;
        const afterRestartInstructions = game2.getDisplayInstructions();

        // we should be running the daily game SHORT -> POOR with SHOOT, HOOT, SOOT (D'OH) already played.
        const expectedAfterRestartInstructions = [
                                // word       type                     change   rating               isStart  parLine
            new DisplayInstruction("SHORT",   Const.PLAYED,            -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("SHOOT",   Const.PLAYED,            -1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("HOOT",    Const.PLAYED_CHANGE,     0,       Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("?OOT",    Const.WORD_AFTER_CHANGE, 3,       Const.NO_RATING,     false,   false),
            new DisplayInstruction("BOOR",    Const.FUTURE,            0,       Const.NO_RATING,     false,   false),
            new DisplayInstruction("POOR",    Const.TARGET,            -1,      Const.NO_RATING,     false,   true),
            ];

        const expectedFinalInstructions = [
                                // word       type                   change  rating               isStart  parLine
            new DisplayInstruction("SHORT",   Const.PLAYED,          -1,     Const.NO_RATING,     true,    false),
            new DisplayInstruction("SHOOT",   Const.PLAYED,          -1,     Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("HOOT",    Const.PLAYED,          -1,     Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("BOOT",    Const.PLAYED,          -1,     Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("BOOR",    Const.PLAYED,          -1,     Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("POOR",    Const.TARGET,          -1,     Const.GOOD_MOVE,     false,   true),
            ];

        const playedB = this.playLetter("B"); // HOOT -> BOOT
        const playedR = this.playLetter("R"); // BOOT -> BOOR
        const playedP = this.playLetter("P"); // BOOR -> POOR
        const finalInstructions = game2.getDisplayInstructions();

        // ... and close and re-open it after it is solved

        Persistence.saveTestEpochDaysAgo(Test.TEST_EPOCH_DAYS_AGO);
        this.resetTheTestAppWindow();
        const game3 = this.gameDisplay.game;

        this.logDebug("restored daily game after finishing it; display instructions are: ",
                game3.getDisplayInstructions(), "test");

        this.verifyEqual(playedB, Const.GOOD_MOVE, "played B") &&
            this.verifyEqual(playedR, Const.GOOD_MOVE, "played R") &&
            this.verifyEqual(playedP, Const.GOOD_MOVE, "played P") &&
            this.verifyInstructionList(afterRestartInstructions, expectedAfterRestartInstructions, "after restart") &&
            this.verifyInstructionList(finalInstructions, expectedFinalInstructions, "after finished") &&
            this.verify (!game1.isWinner(), "unfinished game should not be winner") &&
            this.verify (game2.isWinner(), "finished game should be winner") &&
            this.verify (game3.isWinner(), "restored game should be winner") &&
            this.hadNoErrors();
    }

    dailyGameRestartAfterWrongMoveTest() {
        this.testName = "DailyGameRestartAfterWrongMove";

        // when opened with epoch two days ago, the daily game will always
        // be SHORT -> POOR
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR

        // play two moves, then close and try to restore ...
        this.playLetter("O"); // SHORT -> SHOOT
        this.deleteLetter(0); // SHOOT -> HOOT
        this.playLetter("S"); // HOOT -> SOOT wrong move

        // re-open the app window, with the same daily game number
        this.resetTheTestAppWindow();

        // the game is a different object after the reset; get it here after resetting.
        var game = this.gameDisplay.game;

        // we should be running the daily game SHORT -> POOR with SHOOT, HOOT, SOOT (D'OH) already played.
        const expectedAfterRestartInstructions = [
                                // word       type                     change  rating               isStart  parLine
            new DisplayInstruction("SHORT",   Const.PLAYED,            -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("SHOOT",   Const.PLAYED,            -1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("HOOT",    Const.PLAYED,            -1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("SOOT",    Const.PLAYED_CHANGE,     0,      Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("?OOT",    Const.WORD_AFTER_CHANGE, 3,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("BOOR",    Const.FUTURE,            0,      Const.NO_RATING,     false,   true),
            new DisplayInstruction("POOR",    Const.TARGET,            -1,      Const.NO_RATING,     false,   false),
            ];

        const expectedFinalInstructions = [
                                // word       type                   change  rating               isStart  parLine
            new DisplayInstruction("SHORT",   Const.PLAYED,          -1,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("SHOOT",   Const.PLAYED,          -1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("HOOT",    Const.PLAYED,          -1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("SOOT",    Const.PLAYED,          -1,      Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("BOOT",    Const.PLAYED,          -1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("BOOR",    Const.PLAYED,          -1,      Const.GOOD_MOVE,     false,   true),
            new DisplayInstruction("POOR",    Const.TARGET,          -1,      Const.GOOD_MOVE,     false,   false),
            ];


        const afterRestartInstructions = game.getDisplayInstructions();

        // finish the game. ( ... BOOT BOOR POOR)
        const playedB = this.playLetter("B"); // SOOT -> BOOT
        const playedR = this.playLetter("R"); // BOOT -> BOOR
        const playedP = this.playLetter("P"); // BOOR -> POOR
        const finalInstructions = game.getDisplayInstructions();
        var game = this.gameDisplay.game;

        this.verifyEqual(playedB, Const.GOOD_MOVE, "played B") &&
            this.verifyEqual(playedR, Const.GOOD_MOVE, "played R") &&
            this.verifyEqual(playedP, Const.GOOD_MOVE, "played P") &&
            this.verify(game.isWinner(), "game should be winner") &&
            this.verifyInstructionList(afterRestartInstructions, expectedAfterRestartInstructions, "after restart") &&
            this.verifyInstructionList(finalInstructions, expectedFinalInstructions, "after winning") &&
            this.hadNoErrors();
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

        const appDisplay = this.getNewAppWindow().theAppDisplay;
        this.logDebug("theAppDisplay: ", appDisplay, "test");
        this.logDebug("Switching to practice game", "test");
        appDisplay.switchToPracticeGameCallback();
        this.logDebug("Switching back to daily game", "test");
        appDisplay.switchToDailyGameCallback();
        this.logDebug("Switching to practice game", "test");
        appDisplay.switchToPracticeGameCallback();
        Persistence.saveConfirmationMode(confirm);

        this.logDebug("Done switching to practice game", "test");

        // the active gameDisplay in this test needs to be refreshed after switching to the practice game
        this.setGameDisplay();

        // solve the puzzle directly: TEST LEST LET LOT PLOT PILOT
        const resultL0 = this.playLetter("L");             // TEST -> LEST now delete
        const resultDelete2 = this.deleteLetter(2);        // LEST -> LET now change 1
        const resultI1Wrong = this.playLetter("I");        // LET -> LIT  wrong move! now change 1
        const wrongMoveToast = appDisplay.getAndClearLastToast();
        const resultO1 = this.playLetter("O");             // LIT -> LOT now add
        const resultInsertP0 = this.insertLetter(0, "P" ); // LOT -> PLOT now add
        const resultInsertI1 = this.insertLetter(1, "I");  // PLOT -> PILOT

        // restore default confirmation mode
        Persistence.saveConfirmationMode(false);

        this.verifyEqual(resultL0, Const.GOOD_MOVE, "playLetter(L) returns") &&
            this.verifyEqual(resultDelete2, Const.GOOD_MOVE, "playDelete(2) returns") &&
            this.verifyEqual(resultI1Wrong, Const.WRONG_MOVE, "playLetter(I) returns") &&
            this.verifyEqual(resultO1, Const.GOOD_MOVE, "playLetter(O) returns") &&
            this.verifyEqual(resultInsertP0, Const.GOOD_MOVE, "insert P@0 returns") &&
            this.verifyEqual(resultInsertI1, Const.GOOD_MOVE, "insert I@1 returns") &&
            this.verifyEqual(wrongMoveToast, Const.WRONG_MOVE, "toast") &&
            this.hadNoErrors();
    }

    notAWordToastTest() {
        this.testName = "notAWordToast";
        // The newly opened URL should be showing the test daily game by default:
        const game = this.gameDisplay.game;

        // SHORT -> POOR
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR

        const appDisplay = this.getNewAppWindow().theAppDisplay;
        appDisplay.clearLastToast();
        var result = this.playLetter("X"); // SHORT -> SHOXT
        const lastToast = appDisplay.getAndClearLastToast();

        this.verifyEqual(result, Const.NOT_A_WORD, "result") &&
            this.verifyEqual(lastToast, Const.NOT_A_WORD, "toast") &&
            this.hadNoErrors();
    }


    sameLetterPickedToastTest() {
        this.testName = "SameLetterPickedToast";
        // The newly opened URL should be showing the test daily game by default:
        const game = this.gameDisplay.game;

        // SHORT -> POOR
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR
        const appDisplay = this.getNewAppWindow().theAppDisplay;
        appDisplay.clearLastToast();
        var result = this.playLetter("R"); // SHORT -> SHORT
        const lastToast = appDisplay.getAndClearLastToast();
        this.verifyEqual(result, Const.PICK_NEW_LETTER, "result") &&
            this.verifyEqual(lastToast, Const.PICK_NEW_LETTER, "toast") &&
            this.hadNoErrors();
    }

    practiceGameLimitTest() {
        this.testName = "PracticeGameLimit";
        this.logDebug("Switching to practice game", "test");
        this.getNewAppWindow().theAppDisplay.switchToPracticeGameCallback();
        this.logDebug("Done switching to practice game", "test");

        // the active gameDisplay in this test needs to be refreshed after switching to the practice game
        this.setGameDisplay();

        // play and solve N practice games in a row.
        // showSolution() calls showMove(userRequestedSolution=true), and this rebuilds the whole game GUI, including
        // the post-game-div to hold a 'new game' button if there are any more practice games allowed.

        const mockEvent = null; // the event is not actually touched by the callback

        let game = this.gameDisplay.game;

        let soFarSoGood = true;

        // We come into the loop with the first game already started;
        // it is started when the app starts.
        for (let gamesStarted=1; gamesStarted <= Const.PRACTICE_GAMES_PER_DAY; gamesStarted++) {

            if (!soFarSoGood) {
                break; // stop testing on the first failure
            }

            // test finishing the current game by playing it out, or making errors.
            if (gamesStarted % 2 == 0) {
                // TEST LEST LET LOT PLOT PILOT
                this.logDebug("ending game by making errors", "test");
                this.playLetter("N"); // TEST -> NEST
                this.playLetter("T"); // NEST -> TEST
                this.playLetter("N"); // TEST -> NEST
                this.playLetter("T"); // NEST -> TEST
                this.playLetter("N"); // TEST -> NEST
            } else {
                this.logDebug("ending game by finishing it", "test");
                this.finishTheCurrentGame();
            }

            this.logDebug("game should be finished", game.gameState, "test");
            // New Game button should be there, but not on the last game. The postGameDiv is reconstructed on every refresh of the display after a move
            // or solution.
            const postGameDiv = this.gameDisplay.postGameDiv,
                  children = postGameDiv.children;

            if (! this.verifyEqual(children.length, 2, `on game ${gamesStarted}, num children`)) {
                break;
            }

            const child1IsDisabled = children[0].disabled,
                  child1Text = children[0].textContent,
                  child2IsDisabled = children[1].disabled,
                  child2Text = children[1].textContent;

            // IMPORTANT TODO: game.gamesRemaining() isn't counting down??? is it a new GameState in each iteration?
            // it is stuck at 2.
            // in GameState.updateStateAfterGame(), GameState.gamesRemaining is decrememented (from 3 to 2, but not after that?)
            // In PracticeGame.nextGame(), the new PracticeGameState inherits the old (decremented) game state.

            this.logDebug("game.gamesRemaining()=", game.gamesRemaining(), "test");
            if (gamesStarted < Const.PRACTICE_GAMES_PER_DAY) {
            //if (game.gamesRemaining() > 0) {
                // Not last game
                if (
                        // after a game is finished, both showWord and newGame buttons are off
                        this.verifyEqual( child1Text, "Show Word", `a) child1text ${gamesStarted}`) &&
                        this.verifyEqual( child1IsDisabled, true, `a) Show Word button disabled ${gamesStarted}`) &&
                        this.verifyEqual( child2Text, "New Game", `a) child2text ${gamesStarted}`) &&
                        this.verifyEqual( child2IsDisabled, false, `a) New Game button disabled ${gamesStarted}`) &&
                        this.verifyEqual(this.gameDisplay.anyGamesRemaining(), true, `anyGamesRemaining() ${gamesStarted}`)
                   ) {
                    // pretend to click the new game button, and check that showWord button is enabled, newGame button is disabled.
                    this.gameDisplay.newGameCallback(mockEvent);
                    const postGameDiv = this.gameDisplay.postGameDiv,
                          children = postGameDiv.children;
                    const child1IsDisabled = children[0].disabled,
                          child1Text = children[0].textContent,
                          child2IsDisabled = children[1].disabled,
                          child2Text = children[1].textContent;
                    this.verifyEqual( child1Text, "Show Word", `b) child1text ${gamesStarted}`) &&
                        this.verifyEqual( child1IsDisabled, false, `b) Show Word button disabled ${gamesStarted}`) &&
                        this.verifyEqual( child2Text, "New Game", `b) child2text ${gamesStarted}`) &&
                        this.verifyEqual( child2IsDisabled, true, `b) New Game button disabled ${gamesStarted}`) &&
                        this.verifyEqual(this.gameDisplay.anyGamesRemaining(), true, `anyGamesRemaining() ${gamesStarted}`)

                } else {
                    soFarSoGood = false;
                }
            } else {
                // Last game
                soFarSoGood = this.verifyEqual(child2IsDisabled, true, `New Game button disabled ${gamesStarted}`) &&
                              this.verifyEqual(this.gameDisplay.anyGamesRemaining(), false, "anyGamesRemaining() ${gamesStarted}")
            }
        }

        if (soFarSoGood) {
            // now, restart the app on the same day, to see if we get new practice games on restarting the same day.
            this.resetTheTestAppWindow();
            this.getNewAppWindow().theAppDisplay.switchToPracticeGameCallback();
            this.setGameDisplay();
            let game = this.gameDisplay.game;
            soFarSoGood = this.verifyEqual(this.gameDisplay.anyGamesRemaining(), false, "after same-day restart, anyGamesRemaining()");
        }

        if (soFarSoGood) {
            // now, restart the app as if it were the next day.  This should reset the games available.
            // But, how does practice game recovery get notified by DailyGame recovery?
            // Answer: the new window
            Persistence.saveTestEpochDaysAgo(Test.TEST_EPOCH_DAYS_AGO + 1);
            this.resetTheTestAppWindow();
            this.getNewAppWindow().theAppDisplay.switchToPracticeGameCallback();
            this.setGameDisplay();
            let game = this.gameDisplay.game;
            soFarSoGood = this.verifyEqual(this.gameDisplay.anyGamesRemaining(), true, "after overnight restart, anyGamesRemaining()");
        }

        soFarSoGood && this.hadNoErrors();
    }

    // verifies a game ending that includes a genius move.  Checks the share, including the streak.  Checks the genius toast
    geniusMoveAndShareTest() {
        this.testName = "GeniusMoveAndShare";

        // regular solution:                SHORT SHOOT HOOT BOOT BOOR POOR
        // solve the puzzle like a genius:  SHORT SHOOT HOOT HOOR POOR

        let resultO3 = this.playLetter("O");             // SHORT -> SHOOT
        let resultDelete0 = this.deleteLetter(0);        // SHOOT -> HOOT now change 0
        let resultR3Genius = this.forcePlayWord("HOOR"); // HOOT -> HOOR genius move
        const appDisplay = this.getNewAppWindow().theAppDisplay;
        const toastAfterGeniusMove = appDisplay.getAndClearLastToast();
        let resultP0 = this.playLetter("P");             // HOOR -> POOR

        // let's look at the share ...
        let statsDisplay = this.openAndGetTheStatsDisplay();
        this.logDebug("statsDisplay", statsDisplay, "test");

        let statsSrcElement = new MockEventSrcElement();
        let statsMockEvent = new MockEvent(statsSrcElement);
        let actShareString = statsDisplay.shareCallback(statsMockEvent);
        let expShareString = `WordChain #${Test.TEST_EPOCH_DAYS_AGO + 1} ⭐\nStreak: 1\nSHORT --> POOR\n🟪🟪🟪🟪🟪\n🟩🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟨🟨🟨🟨\n🟩🟩🟩🟩\n`;
        this.closeTheStatsDisplay();

        this.verifyEqual(resultO3, Const.GOOD_MOVE, "playLetter(3, O)") &&
            this.verifyEqual(resultDelete0, Const.GOOD_MOVE, "deleteLetter(0)") &&
            this.verifyEqual(resultR3Genius, Const.GENIUS_MOVE, "forcePlayWord(HOOR)") &&
            this.verifyEqual(resultP0, Const.GOOD_MOVE, "playLetter(0, P)") &&
            this.verifyEqual(actShareString.indexOf(expShareString), 0, "sharestring") &&
            this.verifyEqual(toastAfterGeniusMove, Const.GENIUS_MOVE, "genius move") &&
            this.hadNoErrors();
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
        this.verifyEqual(testIntRestored, 42, "testIntRestored") &&
            this.verifyEqual(testBoolRestored, true, "testBoolRestored") &&
            this.verifyEqual(testObjRestored.nums.length, 2, "testObjRestored.length") &&
            this.verifyEqual(testObjRestored.nums[0], 3, "testObjRestored[0]") &&
            this.verifyEqual(testObjRestored.nums[1], 5, "testObjRestored[1]") &&
            this.verifyEqual(testObjRestored.field, "hello", "testObjRestored.field") &&
            this.hadNoErrors();
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

        var table = ElementUtilities.addElementTo("table", this.outerDiv),
            tr, td;

        tr = ElementUtilities.addElementTo("tr", table);
        td = ElementUtilities.addElementTo("td", tr, {style: "text-align: right;"});
        ElementUtilities.addElementTo("label", td, {}, "Start word: ");
        td = ElementUtilities.addElementTo("td", tr);
        ElementUtilities.addElementTo("input", td, {id: "solverStartWord", type: "text"});

        tr = ElementUtilities.addElementTo("tr", table);
        td = ElementUtilities.addElementTo("td", tr, {style: "text-align: right;"});
        ElementUtilities.addElementTo("label", td, {}, "Target word: ");
        td = ElementUtilities.addElementTo("td", tr);
        ElementUtilities.addElementTo("input", td, {id: "solverTargetWord", type: "text"});

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

    displayCookies() {
        this.addTitle("Local Storage - you must focus outside the box for change to take effect");

        var table = ElementUtilities.addElementTo("table", this.outerDiv),
            tr, td;

        const allCookies = Cookie.ALL_TEST_VARS.concat(Cookie.ALL_GAME_VARS);
        for (let varName of allCookies) {
            var value = Cookie.get(varName);
            if (value === null) {
                value = "null";
            }

            tr = ElementUtilities.addElementTo("tr", table);
            td = ElementUtilities.addElementTo("td", tr, {style: "text-align: right;"});
            ElementUtilities.addElementTo("label", td, {}, `${varName}: `);

            const maxCharsPerRow = 100;
            const nChars = value.length;
            const nRows = Math.trunc(nChars / maxCharsPerRow) + 1;
            const nCols = maxCharsPerRow;

            var inputBox = ElementUtilities.addElementTo("textarea", td,
                    {id: varName, rows: nRows, cols: nCols});
            inputBox.defaultValue = value;
            inputBox.addEventListener("change", this.textareaChangeCallback);
            // inputBox.addEventListener("input", this.textareaInputCallback);
        }
    }

/* not used now ==========
    textareaInputCallback(event) {
        // called when user changes a textarea's value by any keystroke
        console.log("textareaInputCallback()", event);
    }
    =========== */

    textareaChangeCallback(event) {
        // called when user leaving the focus and the value has changed.
        console.log("textareaChangeCallback()", event);
        const element = event.target;
        const varName = element.id;
        const newValue = element.value;
        element.defaultValue = newValue;
        if (newValue === "null") {
            Cookie.remove(varName);
        } else {
            Cookie.save(varName, newValue);
        }
    }


    // ===== Puzzle Finder =====

    displayPuzzleFinderTester() {
        this.addTitle("Puzzle Finder");

        var table = ElementUtilities.addElementTo("table", this.outerDiv),
            tr, td;

        const inputList = [
            {label: "start word",                  id: "puzleFinderStartWord",           value: ""},
            {label: "required word len 1",         id: "puzleFinderReqWordLen1",         value: Const.PRACTICE_REQ_WORD_LEN_1},
            {label: "required word len 2",         id: "puzleFinderReqWordLen2",         value: Const.PRACTICE_REQ_WORD_LEN_2},
            {label: "final word len (0 for any)",  id: "puzleFinderFinalWordLen",        value: Const.PRACTICE_TARGET_WORD_LEN},
            {label: "min words",                   id: "puzleFinderMinWords",            value: Const.PRACTICE_STEPS_MINIMUM},
            {label: "max words",                   id: "puzleFinderMaxWords",            value: Const.PRACTICE_STEPS_MAXIMUM},
            {label: "min difficulty",              id: "puzleFinderMinDifficulty",       value: Const.PRACTICE_DIFFICULTY_MINIMUM},
            {label: "min choices per step (>=1)",  id: "puzzleFinderMinChoicesPerStep",  value: Const.PRACTICE_MIN_CHOICES_PER_STEP},
        ];

        for (let input of inputList) {
            tr = ElementUtilities.addElementTo("tr", table);
            td = ElementUtilities.addElementTo("td", tr, {style: "text-align: right;"});
            ElementUtilities.addElementTo("label", td, {}, `${input.label}:`);

            td = ElementUtilities.addElementTo("td", tr);
            ElementUtilities.addElementTo("input", td, {id: input.id, type: "text", value: input.value.toString()});
        }

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
