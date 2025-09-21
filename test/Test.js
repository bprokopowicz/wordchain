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

        var truthValue,
            message;

        if (typeof actual === 'object') {
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

        if (!truthValue) {
            this.messages.push(message);
            this.failureCount += 1;
        } else {
            this.testAssertionCount += 1;
            this.totalAssertionCount += 1;
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

    playLetter(position, letter, optionalLetter=letter) {
        this.logDebug("playLetter(", position, letter, optionalLetter, ")", "test");
        this.gameDisplay.letterPicker.saveLetterPosition(position);
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
        const changesMind = position != optionalPosition;
        this.logDebug(`insertLetter(${position}, ${letter}, ${optionalPosition})`, "test");

        var mockOptionalInsertButton = null;
        if (changesMind) {
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
            if (changesMind) {
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

    playTransformation(transformation) {
        this.logDebug("Playing transformation", transformation, "test");
        if (transformation[0] === Const.ADD) {
            this.insertLetter(transformation[1], transformation[2]);
        } else if (transformation[0] === Const.DELETE) {
            this.deleteLetter(transformation[1]);
        } else {
            this.playLetter(transformation[1], transformation[2]);
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
            this.logDebug("finishTheCurrentGame() step from ", prevWord, "to", nextWord, "test");
            const transformation = Solver.getTransformationStep(prevWord, nextWord);
            if (transformation == null) {
                console.log("ERROR: no single-step from ", prevWord, "to", nextWord);
                return false;
            }
            this.playTransformation(transformation);
            prevWord = nextWord;
            this.logDebug("finishTheCurrentGame() after step, prevWord is now", prevWord, "test");
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
            this.verify(actContainerLen==expContainerLen, `expected statsContainer.children.length==${expContainerLen}, got ${actContainerLen} THIS IS A TESTING ANOMOLY - unexpected DOM contents`) &&
            this.verify(actDistributionLen==expDistributionLen, `expected statsDistribution.children.length==${expDistributionLen}, got ${actDistributionLen} THIS IS A TESTING ANOMOLY - unexpected DOM contents`) &&
            this.verify(savedStatsBlob.gamesStarted==expStatsBlob.gamesStarted, `expected savedStatsBlob.gamesStarted==${expStatsBlob.gamesStarted}, got ${savedStatsBlob.gamesStarted}`) &&
            this.verify(savedStatsBlob.gamesWon==expStatsBlob.gamesWon, `expected savedStatsBlob.gamesWon==${expStatsBlob.gamesWon}, got ${savedStatsBlob.gamesWon}`) &&
            this.verify(savedStatsBlob.gamesLost==expStatsBlob.gamesLost, `expected savedStatsBlob.gamesLost==${expStatsBlob.gamesLost}, got ${savedStatsBlob.gamesLost}`) &&
            this.verify(savedStatsBlob.streak==expStatsBlob.streak, `expected savedStatsBlob.streak==${expStatsBlob.streak}, got ${savedStatsBlob.streak}`) &&
            this.verify(actStartedText==expStartedText, `expected statsContainer.children[0] to have ${expStartedText}, got ${actStartedText}`) &&
            this.verify(actWonText==expWonText, `expected statsContainer.children[1] to have ${expWonText}, got ${actWonText}`) &&
            this.verify(actLostText==expLostText, `expected statsContainer.children[2] to have ${expLostText}, got ${actLostText}`) &&
            this.verify(actStreakText==expStreakText, `expected statsContainer.children[3] to have ${expStreakText}, got ${actStreakText}`) &&
            this.verify(savedStatsBlob.gamesStarted >= savedStatsBlob.gamesWon + savedStatsBlob.gamesLost, `assertion failed: #started not >= #won+#lost`);
        this.closeTheStatsDisplay();

        for (let wrongMoves = 0; wrongMoves <= Const.TOO_MANY_EXTRA_STEPS; wrongMoves++) {
            // check the extraSteps histogram 
            testRes = testRes &&
                this.verify(savedExtraStepsHistogram[wrongMoves]==expExtraStepsHistogram[wrongMoves],
                        `expected savedExtraStepsHistogram.${wrongMoves}==${expExtraStepsHistogram[wrongMoves]}, got ${savedExtraStepsHistogram[wrongMoves]}`);

            // check the DOM contents of the stats screen for the distribution of wrong-move counts.
            let actDistributionText = statsDistribution.children[wrongMoves].innerText.trim();

            // on Feb 15, 2025, the new-line character disappeared, at least in chrome
            // so we added a newline between the two components below ... and then it
            // was gone by May 23, 2025, so we removed it.
            let expDistributionText = Const.NUMBERS[wrongMoves] + /*"\n" +*/ expExtraStepsHistogram[wrongMoves];
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
        this.testDictReverseChoices();
        this.testScrabbleDict();
        this.testFindOptionsAtWordStep();
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
            this.hadNoErrors();
    }

    testDictReverseChoices() {
        this.testName = "DictReverseChoices";
        let reverseOptionsFromTarget = this.fullDict.findOptionsAtWordStep("lovely", "lovey");
        this.verify(reverseOptionsFromTarget.size === 1, "Expected 1 options from lovely to lovey, found", Array.from(reverseOptionsFromTarget).join(",")) &&
            this.hadNoErrors();
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
            this.hadNoErrors();
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
            this.hadNoErrors();
    }

    testDictReplacements() {
        this.testName = "DictReplacements";
        const smallDict = new WordChainDict(this.smallList);

        const badReplacements = smallDict.findReplacementWords("BAD");
        const cadReplacements = smallDict.findReplacementWords("CAD");

        this.verify(cadReplacements.has("BAD"), "'BAD' is not in 'CAD' replacements") &&
            this.verify(badReplacements.has("BID"), "'BID' is not in 'BAD' replacements") &&
            this.verify(badReplacements.has("BAT"), "'BAT' is not in 'BAD' replacements") &&
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
            this.verify(this.fullDict.isWord("PLACE"), "'PLACE' is missing in dict") &&
            this.verify(this.fullDict.isWord("PlAcE"), "'PlAcE' is missing in dict") &&
            this.verify(!this.fullDict.isWord("ZIZZAMATIZZATEEZYMAN"), "'ZIZZAMATIZZATEEZYMAN' should not be in dict") &&
            this.verify((addersSize == expectedAddersSize), `adders has ${addersSize} words; expected ${expectedAddersSize}`) &&
            this.verify((replacementsSize == expectedReplacementsSize), `adders has ${replacementsSize} words; expected ${expectedReplacementsSize}`) &&
            this.hadNoErrors();
    }

    testScrabbleDict() {
        this.testName = "ScrabbleDict";
        this.verify (this.scrabbleDict.isWord("aargh"), "aargh is missing in scrabble dict") &&
            this.verify (this.scrabbleDict.isWord("zzz"), "zzz is missing in scrabble dict") &&
            this.verify (!this.scrabbleDict.isWord("zzzbrother"), "zzzbrother should not be in scrabble dict") &&
            this.hadNoErrors();
    }

    testFindOptionsAtWordStep() {
        this.testName = "FindOptionsAtWordStep";
        var sameSizeOptions = this.fullDict.findOptionsAtWordStep("PLANE", "PLANT");
        var addOptions = this.fullDict.findOptionsAtWordStep("PLAN", "PLANT");
        var delOptions = this.fullDict.findOptionsAtWordStep("PLANT", "PLAN");
        this.verify(sameSizeOptions.size == 3, "expected 3 same size options for PLANE->PLANT, found", sameSizeOptions.size) &&
            this.verify(addOptions.size == 5, "expected 5 add letter options for PLAN->PLANT, found", addOptions.size) &&
            this.verify(delOptions.size == 3, "expected 3 delete letter options for PLANT->PLAN, found", delOptions.size) &&
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
        this.verify ((r0 == null), "expected to one-step from dog to dog, got", r0)   &&
            this.verify ((r1 != null) && (r1[0] === Const.ADD) && (r1[1] === 3) && (r1[2] === 'e'), "expected [add,3,e], got", r1) &&
            this.verify ((r2 != null) && (r2[0] === Const.ADD) && (r2[1] === 0) && (r2[2] === 'g'), "expected [add,0,g], got", r2) &&
            this.verify ((r3 != null) && (r3[0] === Const.CHANGE) && (r3[1] === 2) && (r3[2] === 'i'), "expected [change,2,i], got", r3) &&
            this.verify ((r4 != null) && (r4[0] === Const.DELETE) && (r4[1] === 3) && (r4[2] === null), "expected [delete,3,null], got", r4) &&
            this.verify ((r5 == null), "expected no one-step from dog to cat, got", r5) &&
            this.verify ((r6 == null), "expected no one-step from dog to dots, got", r6) &&
            this.verify ((r7 == null), "expected no one-step from house to hose, got", r7) &&
            this.verify ((r8 != null) && (r8[0] === Const.DELETE) && (r8[1] === 4) && (r8[2] === null), "expected [delete,4,null], got", r8) &&
            this.hadNoErrors();
    }

    testSolverIdentitySequence() {
        const startTestTime = Date.now();
        this.testName = "SolverIdentitySequence";
        const dict = new WordChainDict(["BAD", "BAT", "CAD", "CAT", "DOG"]);
        const solution = Solver.solve(dict, "BAT", "BAT");

        this.verify(solution.hadNoErrors(), `error in solving 'BAT' to 'BAT': ${solution.getError()}`) &&
            this.verify((solution.numSteps() === 0), "solution for 'BAT' to 'BAT' is not 0") &&
            this.verify((solution.getStart() === 'BAT'), "first word for 'BAT' to 'BAT' is not 'BAT'") &&
            this.verify((solution.getTarget() === 'BAT'), "last word for 'BAT' to 'BAT' is not 'BAT'") &&
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
            this.verify((solutionBadBade.numSteps() === 1), `expected 1 step for 'BAD' to 'BADE': ${solutionBadBade.getSolutionWords()}`) &&
            this.verify((solutionBadeBad.numSteps() === 1), `expected 1 step for 'BADE' to 'BAD': ${solutionBadeBad.getSolutionWords()}`) &&
            this.verify((solutionBatCat.numSteps() === 1), `expected 1 step for 'BAT' to 'CAT': ${solutionBatCat.getSolutionWords()}`) &&
            this.verify(!solutionNope.hadNoErrors(), "expected failure for 'BAT' to 'DOG'")&&
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
            this.verify((solutionBatScad.numSteps() === 3), `expected 3 step for 'BAT' to 'SCAD': ${solutionBatScad.getSolutionWords()}`) &&
            this.verify((solutionScadBat.numSteps() === 3), `expected 3 step for 'SCAD' to 'BAT': ${solutionScadBat.getSolutionWords()}`) &&
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
            this.verify((foundWords.toString() == expectedWords.toString()), `foundWords: ${foundWords} is not as expected: ${expectedWords}`) &&
            this.hadNoErrors();
    }

    testReverseLastStepChoics() {
        this.testName = "SolverReverseLastStepChoices";
        const solution = Solver.solve(this.fullDict, "FACE", "LOVELY");
        solution.calculateDifficulty(this.fullDict);
        this.verify(solution.nChoicesFromTarget === 1, "Expected 1 choice from target backwards, found:", solution.nChoicesFromTarget) &&
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
            this.verify(solution.difficulty == 18, `expected difficulty 18, got ${solution.difficulty}`) &&
            this.verify(solution.nChoicesEasiestStep == expectedNumberChoices, `expected easiest step nChoices ${expectedNumberChoices}, got ${solution.nChoicesEasiestStep}`) &&
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

        this.verify((solutionMatzoBall.getError()=== "No solution"), `expected quick 'No solution' on 'MATZO' TO 'BALL': ${solutionMatzoBall.getError()}`) &&
        this.verify((solutionBallMatzo.getError()=== "No solution"), `expected slow 'No solution' on 'BALL' TO 'MATZO': ${solutionBallMatzo.getError()}`) &&
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
              targetWordLen = 0,
              expectedNumberOfPuzzles = 8,
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
        this.verify(suitablePuzzles.length == expectedNumberOfPuzzles, `expected ${expectedNumberOfPuzzles}, got ${suitablePuzzles.length}`) &&
            this.verify(solution.numWords() >= minWords, `solution too short ${solution.numWords()} not ${minWords}`) &&
            this.verify(solution.numWords() <= maxWords, `solution too long ${solution.numWords()} not ${maxWords}`) &&
            this.verify(solution.hasWordOfLength(reqWordLen1), `solution missing word of length ${reqWordLen1}`) &&
            this.verify(solution.hasWordOfLength(reqWordLen2), `solution missing word of length ${reqWordLen2}`) &&
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
            if (! this.verify(gameState != null, `daily puzzle ${start}->${target} failed to initialize!`) ) {
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
        this.verify(dgs.statsBlob.gamesStarted == 9, "expected gamesStarted=9, got", dgs.statsBlob.gamesStarted) &&
            this.verify(dgs.statsBlob.gamesWon == 2, "expected gamesWon=2, got", dgs.statsBlob.gamesWon) &&
            this.verify(dgs.statsBlob.gamesLost == 3, "expected gamesLost=3, got", dgs.statsBlob.gamesLost) &&
            this.verify(dgs.statsBlob.streak == 4, "expected streak=4, got", dgs.statsBlob.streak) &&
            this.verify(dgs.extraStepsHistogram[0] == 1, "expected extraStepsHistogram[0]=1, got", dgs.extraStepsHistogram[0]) &&
            this.verify(dgs.extraStepsHistogram[1] == 2, "expected extraStepsHistogram[1]=2, got", dgs.extraStepsHistogram[1]) &&
            this.verify(dgs.extraStepsHistogram[2] == 3, "expected extraStepsHistogram[2]=3, got", dgs.extraStepsHistogram[2]) &&
            this.verify(dgs.extraStepsHistogram[3] == 4, "expected extraStepsHistogram[3]=4, got", dgs.extraStepsHistogram[3]) &&
            this.verify(dgs.extraStepsHistogram[4] == 5, "expected extraStepsHistogram[4]=5, got", dgs.extraStepsHistogram[4]) &&
            this.verify(dgs.extraStepsHistogram[5] == 6, "expected extraStepsHistogram[5]=6, got", dgs.extraStepsHistogram[5]) &&
            this.hadNoErrors();
    }

    testNewPracticeGameState() {
        this.testName = "NewPracticeGameState";
        let pgs = PracticeGameState.factory(this.fullDict);

        this.verify(pgs.start.length > 0, "missing start word") &&
            this.verify(pgs.target.length > 0, "missing target word") &&
            this.verify((pgs.initialSolution.length > 5) && (pgs.initialSolution.length < 10)) &&
            this.verify(pgs.getPlayedWord(0) === pgs.start, "first played word should be target:", pgs.target,
                    "found:", pgs.getPlayedWord(0)) &&
            this.verify((pgs.ratedMoves.length + pgs.unplayedWords.length === pgs.initialSolution.length),
                    "played:", pgs.getPlayedWordList(), "unplayed", pgs.getUnplayedWordsAsString(),
                    "solution:", pgs.initialSolution.join(",")) &&
            this.verify(pgs.gamesRemaining == Const.PRACTICE_GAMES_PER_DAY, "expected",
                    Const.PRACTICE_GAMES_PER_DAY, "found", pgs.gamesRemaining, "games remaining") &&
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
        this.verify(pgs1.start == "SHORT", "expected pgs1.start == SHORT, found", pgs1.start) &&
            this.verify(pgs1.target == "POOR", "expected pgs1.target == POOR, found", pgs1.target) &&
            this.verify(pgs2.start == "NEW", "expected pgs2.start == NEW, found", pgs2.start) &&
            this.verify(pgs2.target == "WORD", "expected pgs2.target == WORD, found", pgs2.target) &&
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
        this.verify(res == Const.GOOD_MOVE, "after addWord, expected", Const.GOOD_MOVE, "found", res) &&
            this.verify(pgs.ratedMoves.length == 2, "expected 2 played words, found", pgs.ratedMoves) &&
            this.verify(pgs.getUnplayedWordsAsString() == expUnplayedWords, "expected unplayed words", expUnplayedWords,
                    "found", pgs.getUnplayedWordsAsString()) &&
            this.verify(pgs.ratedMoves[1].rating == Const.GOOD_MOVE,
                    "expected", Const.GOOD_MOVE, "for ratedMoves[1].rating, got:", pgs.ratedMoves[1].rating) &&
            this.hadNoErrors();
    }


    testBrokenDailyGameState() {
        this.testName = "BrokenDailyGameState";
        Persistence.saveTestEpochDaysAgo(1000000); // so long ago, there is no daily game for today
        let dgs = DailyGameState.factory(this.fullDict);
        this.verify(dgs.dailyGameNumber == Const.BROKEN_DAILY_GAME_NUMBER, "expected game number", Const.BROKEN_DAILY_GAME_NUMBER, 
                "got", dgs.dailyGameNumber) &&
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
        this.verify(dgs.dailyGameNumber == Test.TEST_EPOCH_DAYS_AGO, "expected game number", Test.TEST_EPOCH_DAYS_AGO,
                "got", dgs.dailyGameNumber) &&
                this.verify(dgs.start == "SHORT", "expected start word SHORT, got", dgs.start) && 
                this.verify(dgs.target == "POOR", "expected target word POOR, got", dgs.target) && 
                this.verify(dgs.ratedMoves.length == 1, "expected one played word, found", dgs.ratedMoves) &&
                this.verify(dgs.getUnplayedWordsAsString() == expUnplayedWords, "expected unplayed words", expUnplayedWords,
                        "found", dgs.getUnplayedWordsAsString()) &&
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
        this.verify(res == Const.GOOD_MOVE, "after addWord, expected", Const.GOOD_MOVE, "found", res) &&
            this.verify(dgs.ratedMoves.length == 2, "expected 2 played words, found", dgs.ratedMoves) &&
            this.verify(dgs.getUnplayedWordsAsString() == expUnplayedWords, "expected unplayed words", expUnplayedWords,
                    "found", dgs.getUnplayedWordsAsString()) &&
            this.verify(dgs.ratedMoves[1].rating == Const.GOOD_MOVE,
                    "expected", Const.GOOD_MOVE, "for ratedMoves[1].rating, got:", dgs.ratedMoves[1].rating) &&
            this.hadNoErrors();
    }

    testDailyGameStateRecoverOneWordPlayed() {
        this.testName = "DailyGameStateRecoverOneWordUnplayed";

        // create a new game from scratch.
        let dgs = DailyGameState.factory(this.fullDict);

        // SHORT,SHOOT,HOOT,BOOT,BOOR,POOR
        const res = dgs.addWord('SHOOT'); 
        const expUnplayedWords = "HOOT,BOOT,BOOR,POOR";
        this.verify(res == Const.GOOD_MOVE, "after addWord, expected", Const.GOOD_MOVE, "found", res) &&
            this.verify(dgs.ratedMoves.length == 2, "expected 2 played words, found", dgs.ratedMoves) &&
            this.verify(dgs.unplayedWords.length == 4, "expected 4 unplayed words, found", dgs.unplayedWords) &&
            this.verify(dgs.getUnplayedWordsAsString() == expUnplayedWords, "expected unplayed words", expUnplayedWords,
                    "found", dgs.getUnplayedWordsAsString()) &&
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
        this.verify(dgs1.dailyGameNumber == Test.TEST_EPOCH_DAYS_AGO, "expected dgs1.dailyGameNumber=", Test.TEST_EPOCH_DAYS_AGO,
                "found", dgs1.dailyGameNumber) &&
            this.verify(dgs2.dailyGameNumber == Test.TEST_EPOCH_DAYS_AGO+1, "expected dgs2.dailyGameNumber=", Test.TEST_EPOCH_DAYS_AGO+1,
                    "found", dgs2.dailyGameNumber) &&
            this.verify(dgs2.statsBlob["streak"] == 6, "expected recovered streak to be 6, found", dgs2.statsBlob["streak"]) &&
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
        this.verify(dgs1.dailyGameNumber == Test.TEST_EPOCH_DAYS_AGO, "expected dgs1.dailyGameNumber=", Test.TEST_EPOCH_DAYS_AGO,
                "found", dgs1.dailyGameNumber) &&
            this.verify(dgs2.dailyGameNumber == Test.TEST_EPOCH_DAYS_AGO+2, "expected dgs2.dailyGameNumber=", Test.TEST_EPOCH_DAYS_AGO+2,
                    "found", dgs2.dailyGameNumber) &&
            this.verify(dgs2.statsBlob["streak"] == 0, "expected recovered streak to be 0, found", dgs2.statsBlob["streak"]) &&
            this.hadNoErrors();
    }

    testPracticeGamesPerDayVar() {
        this.testName = "PracticeGamesRemainingVar";
        const nGames = 4;
        Persistence.saveTestPracticeGamesPerDay(nGames);
        let pgs = PracticeGameState.factory(this.fullDict); // from scratch, with nGames per day override
        this.verify(pgs.gamesRemaining == nGames, "expected", nGames, "remaining, found", pgs.gamesRemaining) &&
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
        this.verify(dgs1.start == "PLANE", "expected start: PLANE, found:", dgs1.start) &&
            this.verify(dgs1.target == "PANED", "expected target: PANED, found:", dgs1.target) &&
            this.verify(dgs1.dailyGameNumber == Const.TEST_DAILY_GAME_NUMBER, "expected gameNumber:", Const.TEST_DAILY_GAME_NUMBER,
                    "found:", dgs1.dailyGameNumber) &&
            this.verify(dgs2.start == "JUNKY", "expected start: JUNKY, found:", dgs2.start) &&
            this.verify(dgs2.target == "JUNK", "expected target: JUNK, found:", dgs2.target) &&
            this.hadNoErrors();
    }

    testDailyGameStateUsingRepeatTestVars() {
        this.testName = "DailyGameStateUsingRepeatTestVars";

        // shortest solution is PLANE,PANE,PANED 
        Persistence.saveTestDailyGameWords("PLANE", "PANED");
        let dgs1 = DailyGameState.factory(this.fullDict); // will be from scratch
        let dgs2 = DailyGameState.factory(this.fullDict); // will be from recovered object

        // game state should use test words and test game number
        this.verify(dgs1.start == "PLANE", "expected start: PLANE, found:", dgs1.start) &&
            this.verify(dgs1.target == "PANED", "expected target: PANED, found:", dgs1.target) &&
            this.verify(dgs1.dailyGameNumber == Const.TEST_DAILY_GAME_NUMBER, "expected gameNumber:", Const.TEST_DAILY_GAME_NUMBER,
                    "found:", dgs1.dailyGameNumber) &&
            this.verify(dgs2.start == "PLANE", "expected start: PLANE, found:", dgs2.start) &&
            this.verify(dgs2.target == "PANED", "expected target: PANED, found:", dgs2.target) &&
            this.hadNoErrors();
    }

    testDailyGameStateWrongMove() {
        this.testName = "DailyGameStateWrongMove";
        // shortest solution is PLANE,PANE,PANED but wrong move is PLANE,PANE,PANES,PANED
        Persistence.saveTestDailyGameWords("PLANE", "PANED");
        let dgs = DailyGameState.factory(this.fullDict);
        dgs.addWord("PANE"); // GOOD_MOVE
        const res = dgs.addWord("PANES"); // WRONG
        this.verify(res == Const.WRONG_MOVE, "after addWord, expected", Const.WRONG_MOVE, "found", res) &&
            this.verify(dgs.start == "PLANE", "expected start: PLANE, found:", dgs.start) &&
            this.verify(dgs.target == "PANED", "expected target: PANED, found:", dgs.target) &&
            this.verify(dgs.dailyGameNumber == Const.TEST_DAILY_GAME_NUMBER, "expected gameNumber:", Const.TEST_DAILY_GAME_NUMBER,
                    "found:", dgs.dailyGameNumber) &&
            this.verify(dgs.ratedMoves[2].rating == Const.WRONG_MOVE,
                    "expected", Const.WRONG_MOVE, "for ratedMoves[2].rating, got:", dgs.ratedMoves[2].rating) &&
            this.hadNoErrors();

    }

    testDailyGameStateDodoMove() {
        this.testName = "DailyGameStateDodoMove";
        // shortest solution is PLANE,PANE,PANED but dodo move is PLANE,PLAN,PAN,PANE,PANED
        Persistence.saveTestDailyGameWords("PLANE", "PANED");
        let dgs = DailyGameState.factory(this.fullDict);
        const res = dgs.addWord("PLAN"); // DODO move
        this.verify(res == Const.DODO_MOVE, "after addWord, expected", Const.DODO_MOVE, "found", res) &&
            this.verify(dgs.start == "PLANE", "expected start: PLANE, found:", dgs.start) &&
            this.verify(dgs.target == "PANED", "expected target: PANED, found:", dgs.target) &&
            this.verify(dgs.dailyGameNumber == Const.TEST_DAILY_GAME_NUMBER, "expected gameNumber:", Const.TEST_DAILY_GAME_NUMBER,
                    "found:", dgs.dailyGameNumber) &&
            this.verify(dgs.ratedMoves[1].rating == Const.DODO_MOVE,
                    "expected", Const.DODO_MOVE, "for ratedMoves[1].rating, got:", dgs.ratedMoves[1].rating) &&
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
        this.verify(dgs.ratedMoves[1].rating == Const.GENIUS_MOVE, "expected ratedMoves[1].rating:", Const.GENIUS_MOVE, "got:",
                dgs.ratedMoves[1].rating) &&
        this.verify(dgs.ratedMoves[2].rating == Const.GOOD_MOVE, "expected ratedMoves[2].rating:", Const.GOOD_MOVE, "got:",
                dgs.ratedMoves[2].rating) &&
            this.hadNoErrors();
    }

    testDailyGameStateUsingScrabbleWord() {
        this.testName = "DailyGameStateScrabbleWord";
        const smallDict = new WordChainDict(["BAD", "BAT", "CAT", "MAR", "CAR"]);
        Persistence.saveTestDailyGameWords("BAD", "CAR");
        // shortest solution is BAD,BAT,CAT,CAR  alt using scrabble: BAD,MAD,MAR,CAR  MAD is the genius word
        let dgs = DailyGameState.factory(smallDict);
        dgs.addWord("MAD"); // BAD to MAD is a scrabble word here, but not a genius move (same length solution)
        this.verify (dgs.ratedMoves[1].rating === Const.SCRABBLE_MOVE, "BAD->MAD should return", Const.SCRABBLE_MOVE, "got",
                dgs.ratedMoves[1].rating) &&
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

        this.verify(metricEventCountAfter == metricEventCountBefore + 1, `expected eventCount to be ${metricEventCountBefore + 1}, got ${metricEventCountAfter}`) &&
            this.verify(actEventName == expEventName, `expected last metric event to be ${expEventName} but got ${actEventName}`) &&
            this.verify(actGameNumber == expGameNumber, `expected game number to be ${expGameNumber} but got ${actGameNumber}`) &&
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

        this.verify(metricEventCountAfter == metricEventCountBefore + 1, `expected eventCount to be ${metricEventCountBefore + 1}, got ${metricEventCountAfter}`) &&
            this.verify(actEventName == expEventName, `expected last metric event to be ${expEventName} but got ${actEventName}`) &&
            this.verify(actGameNumber == expGameNumber, `expected game number to be ${expGameNumber} but got ${actGameNumber}`) &&
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
        prep(); this.testGameShowEveryMove();
        prep(); this.testGameUnfinishedAfterMistakes();
        prep(); this.testGameUnfinishedOnWrongDelete();
        prep(); this.testGameUnfinishedOnWrongLetterChange();
        prep(); this.testPracticeGamesPerDayLimitReached();
        const endTestTime = Date.now();
        this.logDebug(`game tests elapsed time: ${endTestTime - startTestTime} ms`, "test");
    }

    testGameCorrectFirstWord() {
        this.testName = "GameCorrectFirstWord";

        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);
        let [start, target] = ["SCAD", "BAT"];
        Persistence.saveTestPracticeGameWords(start, target);

        const game = new PracticeGame(smallDict);

        const playResult = game.playDelete(1);
        this.verify((playResult === Const.GOOD_MOVE), "Word played not GOOD_MOVE") &&
            this.hadNoErrors();
    }

    testGameDeleteWrongLetter() {
        this.testName = "GameDeleteLetterNotAWord";

        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);
        let [start, target] = ["SCAD", "BAT"];
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(smallDict);

        const playResult = game.playDelete(3);
        this.verify((playResult === Const.NOT_A_WORD), "NOT_A_WORD after deleting wrong letter") &&
            this.hadNoErrors();
    }

    testGameDeleteBadPosition() {
        this.testName = "GameDeleteBadPosition";

        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);
        let [start, target] = ["SCAD", "BAT"];
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(smallDict);

        const playResult = game.playDelete(6);
        this.verify((playResult === Const.BAD_POSITION), "Delete attempted at bad position") &&
            this.hadNoErrors();
    }

    testGameDifferentWordFromInitialSolution() {
        this.testName = "GameDifferentWordFromInitialSolution";

        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAT", "DOG", "SCAD"]);
        const origSolution = Solver.solve(smallDict, "BAD", "CAT");
        let [start, target] = ["BAD", "CAT"]; // BAD BAT CAT
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(smallDict);
        const origWord1 = game.gameState.getUnplayedWord(0);

        if ( !(this.verify((origWord1 === "BAT"), "original solution should have BAT as first word") &&
        // "bade" is not in the original solution
            this.verify(! origSolution.getSolutionWords().includes('BADE'), "Original solution should not have 'BADE'"))) return;

        const playAddResult = game.playAdd(3);
        if (!this.verify((playAddResult === Const.GOOD_MOVE), "playAdd(3) not GOOD_MOVE")) return;

        const playLetterResult = game.playLetter(4, "E");  // BAD BADE (BATE BAT CAT) or (BAD BAT CAT)
        if (!this.verify((playLetterResult === Const.DODO_MOVE), `playLetter(4, E) returns ${playLetterResult}, not DODO_MOVE`)) return;
        this.logDebug("After playLetter(4,E), game.remainingSteps are:" + game.gameState.getUnplayedWordsAsString(), "test");
        const newPlayedWord = game.gameState.getPlayedWord(1);
        if (!this.verify((newPlayedWord === "BADE"), `Played word 1 should be BADE, not: ${newPlayedWord}`))  return;
        const newSolutionWord0 = game.gameState.getUnplayedWord(0);
        this.verify((newSolutionWord0 === "BAD"), `New solution should continue with BAD, not: ${newSolutionWord0}`) &&
            this.hadNoErrors();
    }

    testGameNotShortestSolutionBug() {
        this.testName = "GameNotShortestSolutionBug";
        const solution = Solver.solve(this.fullDict, "BROKEN", "BAKED");
        const foundWords = solution.getSolutionWords();
        const expectedWords = [ "BROKEN", "BROKE", "BRAKE", "BAKE", "BAKED" ];
        this.verify(solution.hadNoErrors(), `error on 'BROKEN' to 'BAKED': ${solution.getError()}`) &&
            this.verify((foundWords.toString() == expectedWords.toString()), `solution: ${foundWords} is not expected: ${expectedWords}`) &&
            this.hadNoErrors();
    }

    testGameDisplayInstructions() {
        this.testName = "GameDisplayInstructions";
        let [start, target] = ["SCAD", "BAT"]; // SCAD CAD BAD BAT
        Persistence.saveTestPracticeGameWords(start, target);
        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);
        const game = new PracticeGame(smallDict);

        const initialInstructions = game.getDisplayInstructions();

        this.logDebug("test", this.testName, "delete 1 SCAD->CAD", "test");
        const playDeleteResult = game.playDelete(1); // SCAD to CAD
        const afterDeleteInstructions = game.getDisplayInstructions();

        this.logDebug("test", this.testName, "change 1 CAD->BAD", "test");
        const playLetterBResult = game.playLetter(1, "B"); // CAD to BAD
        const afterPlayLetterBInstructions = game.getDisplayInstructions();

        this.logDebug("test", this.testName, "change 3 BAD->BAT done", "test");
        const playLetterTResult = game.playLetter(3, "T"); // BAD to BAT
        const afterPlayLetterTInstructions = game.getDisplayInstructions();

        const expectedInitialInstructions = [
                                // word      type                     change  rating               isStart  parLine
            new DisplayInstruction("SCAD",   Const.PLAYED_DELETE,     0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.FUTURE,            1,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("BAD",    Const.FUTURE,            3,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("BAT",    Const.TARGET,            0,      Const.NO_RATING,     false,   true),
        ];

        // after delete S
        const expectedPlayDeleteInstructions = [
            new DisplayInstruction("SCAD",   Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.PLAYED_CHANGE,     1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("?AD",    Const.WORD_AFTER_CHANGE, 3,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("BAT",    Const.TARGET,            0,      Const.NO_RATING,     false,   true),
        ];

        // after play B
        const expectedPlayLetterBInstructions = [
            new DisplayInstruction("SCAD",   Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("BAD",    Const.PLAYED_CHANGE,     3,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("BA?",    Const.WORD_AFTER_CHANGE, 0,      Const.NO_RATING,     false,   true),
        ];

        // after play T
        const expectedPlayLetterTInstructions = [
            new DisplayInstruction("SCAD",   Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("BAD",    Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("BAT",    Const.TARGET,            0,      Const.GOOD_MOVE,     false,   true),
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
        // the interface would never play.

        const expectedInitialInstructions = [
                                // word      type                     change  rating               isStart  parLine
            new DisplayInstruction("SCAD",   Const.PLAYED_DELETE,     0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.FUTURE,            1,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("BAD",    Const.FUTURE,            3,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("BAT",    Const.TARGET,            0,      Const.NO_RATING,     false,   true),
        ];

        // after delete "S"
        const expectedAfterDeleteInstructions = [
            new DisplayInstruction("SCAD",   Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.PLAYED_CHANGE,     1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("?AD",    Const.WORD_AFTER_CHANGE, 3,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("BAT",    Const.TARGET,            0,      Const.NO_RATING,     false,   true),
        ];

        // after play R
        const expectedCadToCarInstructions = [
            new DisplayInstruction("SCAD",   Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("CAR",    Const.PLAYED_CHANGE,     3,      Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("CA?",    Const.WORD_AFTER_CHANGE, 1,      Const.NO_RATING,     false,   true),
            new DisplayInstruction("BAT",    Const.TARGET,            0,      Const.NO_RATING,     false,   false),
        ];

        const initialInstructions = game.getDisplayInstructions();
        // In a real game, this wouldn't generate a new instruction list,
        // but rather a toast message.
        const playDeleteNotAWord = game.playDelete(4); // SCAD to SCA

        game.playDelete(1); // SCAD to CAD
        const afterDeleteInstructions = game.getDisplayInstructions();

        const cadToCarResult = game.playLetter(3,"R"); // CAD TO CAR
        const cadToCarInstructions = game.getDisplayInstructions(); // SCAD,CAD,CAR,CAT,BAT

        this.verifyInstructionList(initialInstructions, expectedInitialInstructions, "initial") &&
            this.verifyEqual(playDeleteNotAWord, Const.NOT_A_WORD, "playDelete(4)") &&
            this.verifyInstructionList(afterDeleteInstructions, expectedAfterDeleteInstructions, "after delete") &&
            this.verifyEqual(cadToCarResult, Const.WRONG_MOVE, "playLetter(3,R)") &&
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
            new DisplayInstruction("SCAD",   Const.PLAYED_DELETE,     0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.FUTURE,            1,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("BAD",    Const.FUTURE,            3,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("BAT",    Const.TARGET,            0,      Const.NO_RATING,     false,   true),
        ];

        // after delete "S"
        const expectedAfterDeleteInstructions = [
            new DisplayInstruction("SCAD",   Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.PLAYED_CHANGE,     1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("?AD",    Const.WORD_AFTER_CHANGE, 3,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("BAT",    Const.TARGET,            0,      Const.NO_RATING,     false,   true),
        ];

        // after playing CAD->CAT instead of CAD->BAD
        const expectedCadToCatInstructions = [
            new DisplayInstruction("SCAD",   Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("CAT",    Const.PLAYED_CHANGE,     1,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("?AT",    Const.WORD_AFTER_CHANGE, 0,      Const.NO_RATING,     false,   true),
        ];

        const initialInstructions = game.getDisplayInstructions();

        game.playDelete(1); // SCAD to CAD
        const afterDeleteInstructions = game.getDisplayInstructions();

        const cadToCatResult = game.playLetter(3,"T"); // CAD TO CAT instead of CAD to BAD
        const cadToCatInstructions = game.getDisplayInstructions(); // SCAD,CAD,CAT,BAT

        this.verifyInstructionList(initialInstructions, expectedInitialInstructions, "initial") &&
            this.verifyInstructionList(afterDeleteInstructions, expectedAfterDeleteInstructions, "after delete") &&
            this.verifyEqual(cadToCatResult, Const.GOOD_MOVE, "playLetter(3,T)") &&
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
            new DisplayInstruction("BAD",    Const.PLAYED_CHANGE,     3,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("BA?",    Const.WORD_AFTER_CHANGE, 1,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("CAT",    Const.FUTURE,            3,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("CAR",    Const.TARGET,            0,      Const.NO_RATING,     false,   true),
        ];
        const expectedAfterMInstructions = [
            new DisplayInstruction("BAD",    Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("MAD",    Const.PLAYED_CHANGE,     3,      Const.SCRABBLE_MOVE, false,   false),
            new DisplayInstruction("MA?",    Const.WORD_AFTER_CHANGE, 1,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("CAR",    Const.TARGET,            0,      Const.NO_RATING,     false,   true),
        ];


        const game = new PracticeGame(smallDict); 
        const initialInstructions = game.getDisplayInstructions();
        const badToMadResult = game.playLetter(1,"M");
        const afterMInstructions = game.getDisplayInstructions();

        this.verify (badToMadResult === Const.SCRABBLE_MOVE, "BAD->MAD should return", Const.SCRABBLE_MOVE, "got", badToMadResult) &&
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
            new DisplayInstruction("SCAD",   Const.PLAYED_DELETE,     0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.FUTURE,            1,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("BAD",    Const.FUTURE,            3,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("BAT",    Const.TARGET,            0,      Const.NO_RATING,     false,   true),
        ];
        const expectedAfterScagInstructions = [
            new DisplayInstruction("SCAD",    Const.PLAYED,           0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("SCAG",    Const.PLAYED_DELETE,    0,      Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("SAG",     Const.FUTURE,           3,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("SAT",     Const.FUTURE,           1,      Const.NO_RATING,     false,   true),
            new DisplayInstruction("BAT",     Const.TARGET,           0,      Const.NO_RATING,     false,   false),
        ];
        const expectedAfterSagInstructions = [
            new DisplayInstruction("SCAD",    Const.PLAYED,           0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("SCAG",    Const.PLAYED,           0,      Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("SAG",     Const.PLAYED_CHANGE,    3,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("SA?",     Const.WORD_AFTER_CHANGE,1,      Const.NO_RATING,     false,   true),
            new DisplayInstruction("BAT",     Const.TARGET,           0,      Const.NO_RATING,     false,   false),
        ];

        // starting
        const game = new PracticeGame(smallDict); // shortest solution is SCAD,CAD,BAD,BAT or SCAD,CAD,CAT,BAT
        const initialInstructions = game.getDisplayInstructions();

        // play SCAD to SCAG using scrabble word instead of SCAD to CAD
        const scadToScagResult = game.playLetter(4,"G"); // SCAD to SCAG uses scrabble word, which is also a mistake
        const afterScagInstructions = game.getDisplayInstructions(); // Solution should now be SCAD, SCAG, SAG, SAT, BAT

        // play SCAG to SAG which is correct now.
        const scagToSagResult = game.playDelete(2); // SCAG to SAG.
        const afterSagInstructions = game.getDisplayInstructions(); 

        this.verifyInstructionList(initialInstructions, expectedInitialInstructions, "initial") &&
            this.verifyEqual(scadToScagResult, Const.WRONG_MOVE, "playLetter(4,G)") &&
            this.verifyInstructionList(afterScagInstructions, expectedAfterScagInstructions, "afterScag") &&
            this.verifyEqual(scagToSagResult, Const.GOOD_MOVE, "playDelete(2)") &&
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
            new DisplayInstruction("SCAD",   Const.PLAYED_DELETE,     0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.FUTURE,            3,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("CAT",    Const.FUTURE,            1,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("SAT",    Const.FUTURE,            3,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("SAG",    Const.TARGET,            0,      Const.NO_RATING,     false,   true),
        ];

        const expectedAfterScagInstructions = [
            new DisplayInstruction("SCAD",   Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("SCAG",   Const.PLAYED_DELETE,     0,      Const.GENIUS_MOVE,   false,   false),
            new DisplayInstruction("SAG",    Const.TARGET,            0,      Const.NO_RATING,     false,   false),
        ];

        const expectedAfterSagInstructions = [
            new DisplayInstruction("SCAD",   Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("SCAG",   Const.PLAYED,            0,      Const.GENIUS_MOVE,   false,   false),
            new DisplayInstruction("SAG",    Const.TARGET,            0,      Const.GOOD_MOVE,     false,   false),
        ];

        const initialInstructions = game.getDisplayInstructions();
        const scadToScagResult = game.playLetter(4,"G"); // SCAD to SCAG uses scrabble word
        const afterScagInstructions = game.getDisplayInstructions();
        const scagToSagResult = game.playDelete(2); // SCAG to SAG.
        const afterSagInstructions = game.getDisplayInstructions();

        this.verifyInstructionList(initialInstructions, expectedInitialInstructions, "initial") &&
            this.verifyEqual(scadToScagResult, Const.GENIUS_MOVE, "after playing scag result") &&
            this.verifyInstructionList(afterScagInstructions, expectedAfterScagInstructions, "afterScag") &&
            this.verify(scagToSagResult, Const.GOOD_MOVE, "after playing sag result") &&
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
            new DisplayInstruction("PLANE",   Const.PLAYED_DELETE,     0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("PANE",    Const.FUTURE,            0,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("PANED",   Const.TARGET,            0,      Const.NO_RATING,     false,   true),
        ];

        const expectedPlaneToPlanInstructions = [
            new DisplayInstruction("PLANE",   Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("PLAN",    Const.PLAYED_DELETE,     0,      Const.DODO_MOVE,     false,   false),
            new DisplayInstruction("PAN",     Const.FUTURE,            0,      Const.NO_RATING,     false,   true),
            new DisplayInstruction("PANE",    Const.FUTURE,            0,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("PANED",   Const.TARGET,            0,      Const.NO_RATING,     false,   false),
        ];
 
        const expectedPlanToPanInstructions = [
            new DisplayInstruction("PLANE",   Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("PLAN",    Const.PLAYED,            0,      Const.DODO_MOVE,     false,   false),
            new DisplayInstruction("PAN",     Const.PLAYED_ADD,        0,      Const.GOOD_MOVE,     false,   true),
            new DisplayInstruction("PANE",    Const.FUTURE,            0,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("PANED",   Const.TARGET,            0,      Const.NO_RATING,     false,   false),
        ];

        const expectedPanToPanXInstructions = [
            new DisplayInstruction("PLANE",   Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("PLAN",    Const.PLAYED,            0,      Const.DODO_MOVE,     false,   false),
            new DisplayInstruction("PAN",     Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   true),
            new DisplayInstruction("PAN?",    Const.WORD_AFTER_ADD,    0,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("PANED",   Const.TARGET,            0,      Const.NO_RATING,     false,   false),
        ];

        const expectedPanXToPaneInstructions = [
            new DisplayInstruction("PLANE",   Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("PLAN",    Const.PLAYED,            0,      Const.DODO_MOVE,     false,   false),
            new DisplayInstruction("PAN",     Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   true),
            new DisplayInstruction("PANE",    Const.PLAYED_ADD,        0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("PANED",   Const.TARGET,            0,      Const.NO_RATING,     false,   false),
        ];

        const expectedPaneToPaneXInstructions = [
            new DisplayInstruction("PLANE",   Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("PLAN",    Const.PLAYED,            0,      Const.DODO_MOVE,     false,   false),
            new DisplayInstruction("PAN",     Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   true),
            new DisplayInstruction("PANE",    Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("PANE?",   Const.WORD_AFTER_ADD,    0,      Const.NO_RATING,     false,   false),
        ];

        const expectedPaneXToPanedInstructions = [
            new DisplayInstruction("PLANE",   Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("PLAN",    Const.PLAYED,            0,      Const.DODO_MOVE,     false,   false),
            new DisplayInstruction("PAN",     Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   true),
            new DisplayInstruction("PANE",    Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("PANED",   Const.TARGET,            0,      Const.GOOD_MOVE,     false,   false),
        ];

        const initialInstructions = game.getDisplayInstructions();

        const planeToPlanResult = game.playDelete(5); // PLANE to PLAN; the dodo move
        const planeToPlanInstructions = game.getDisplayInstructions();

        const planToPanResult = game.playDelete(2); // PLAN to PAN; correct
        const planToPanInstructions = game.getDisplayInstructions();

        const panToPanXAddResult = game.playAdd(3); // PAN to PAN?; correct (really should be unrated?)
        const panToPanXInstructions = game.getDisplayInstructions();

        const panXToPaneChangeResult = game.playLetter(4, "E"); // PAN? to PANE; correct
        const panXToPaneInstructions = game.getDisplayInstructions();

        const paneToPaneXAddResult = game.playAdd(4); // PANE to PANE?; correct
        const paneToPaneXInstructions = game.getDisplayInstructions();

        const paneXToPanedChangeResult = game.playLetter(5, "D"); // PANE? to PANED; correct
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
        const blissToBlipsResult = game.playLetter(4,"P");
        const displayInstructions = game.getDisplayInstructions(); // Solution should now be BLISS, BLIPS, BLISS, BLESS, LESS, LEST
        game.finishGame();
        const score = game.getNormalizedScore();
        const expScore = 2; // dodo move adds two steps
        this.logDebug(this.testName, "displayInstructions: ", displayInstructions, "test");
        this.verify((blissToBlipsResult === Const.DODO_MOVE), `playLetter(4,P) expected ${Const.DODO_MOVE}, got ${blissToBlipsResult}`) &&
        this.verify(score == expScore, "expected score:", expScore, "got", score) &&
        this.verify((displayInstructions.length === expectedDisplayLength),
                "expected display instructions length=", expectedDisplayLength, "got", displayInstructions.length) &&
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
        this.hadNoErrors();
    }

    testGameFinish() {
        this.testName = "GameFinish";

        const smallDict = new WordChainDict(["BAD", "BADE", "BAT", "BATE", "CAD", "CAT", "DOG", "SCAD"]);
        let [start, target] = ["SCAD", "BAT"];
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(smallDict); 

        const playResult = game.playDelete(1);
        game.finishGame();
        const displayInstructionsAfterFinish = game.getDisplayInstructions(); // Solution should now be SCAD, CAD, CAT, BAT
        const originalSolutionAsString = game.getOriginalSolutionWords();
        const playedSolutionAsString = game.getUserSolutionWords();
        const expOriginalSolutionAsString = "SCAD⇒CAD⇒BAD⇒BAT";
        const expPlayedSolutionAsString = "SCAD⇒CAD⇒BAD⇒BAT";
        this.verify((playResult === Const.GOOD_MOVE), "Word played not GOOD_MOVE") &&
            this.verify((displayInstructionsAfterFinish.length === 4), `after finishGame(), expected 4 display instructions, got ${displayInstructionsAfterFinish.length}`) &&
            this.verify((originalSolutionAsString == expOriginalSolutionAsString), `expected original string ${expOriginalSolutionAsString}, got ${originalSolutionAsString}`) &&
            this.verify((playedSolutionAsString == expPlayedSolutionAsString), `expected played string ${expPlayedSolutionAsString}, got ${playedSolutionAsString}`) &&
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
            new DisplayInstruction("SCAD",   Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.PLAYED,            0,      Const.SHOWN_MOVE,    false,   false),
            new DisplayInstruction("BAD",    Const.PLAYED,            0,      Const.SHOWN_MOVE,    false,   false),
            new DisplayInstruction("BAT",    Const.TARGET,            0,      Const.SHOWN_MOVE,    false,   true),
        ];

        const displayInstructions = game.getDisplayInstructions(); // Solution should now be SCAD, CAD, CAT, BAT
        this.verify((displayInstructions.length === 4), `after finishGame(), expected 4 display instructions, got ${displayInstructions.length}`) &&
            this.verifyInstructionList(displayInstructions, expectedFinalInstructions, "after show all moves" ) &&
            this.verify(game.isOver(), 'expected game to be over, but it is not') &&
            this.hadNoErrors();
    }

    testGameShowTargetMove() {
        this.testName = "GameShowTargetMove";

        let [start, target] = ["SCAD", "BAT"];
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(this.fullDict); 
        game.playDelete(1);     // SCAD -> CAD
        game.playLetter(1,"B"); // CAD -> BAD
        const showWordResult = game.showNextMove();

        const expectedFinalInstructions = [
                                // word      type                     change  rating               isStart  parLine
            new DisplayInstruction("SCAD",   Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("CAD",    Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("BAD",    Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("BAT",    Const.TARGET,            0,      Const.SHOWN_MOVE,    false,   true),
        ];

        const displayInstructions = game.getDisplayInstructions(); // Solution should now be SCAD, CAD, CAT, BAT
        this.verify((displayInstructions.length === 4), `after finishGame(), expected 4 display instructions, got ${displayInstructions.length}`) &&
            this.verify(game.isOver(), 'expected game to be over, but it is not') &&
            this.verifyInstructionList(displayInstructions, expectedFinalInstructions, "after show next move" ) &&
            this.hadNoErrors();
    }


    testGameFinishAlternatePath() {
        this.testName = "GameFinishAlternatePath";

        let [start, target] = ["LEAKY", "SPOON"];
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(this.fullDict); 
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
        const originalSolutionAsString = game.getOriginalSolutionWords();
        const playedSolutionAsString = game.getUserSolutionWords();
        const expOriginalSolutionAsString = "LEAKY⇒LEAK⇒LEAN⇒LOAN⇒<br>LOON⇒SOON⇒SPOON";
        const expPlayedSolutionAsString = "LEAKY⇒LEAK⇒LEAN⇒LOAN⇒<br>LOON⇒POON⇒SPOON";
        this.verify((originalSolutionAsString == expOriginalSolutionAsString), `expected original string ${expOriginalSolutionAsString}, got ${originalSolutionAsString}`) &&
            this.verify((playedSolutionAsString == expPlayedSolutionAsString), `expected played string ${expPlayedSolutionAsString}, got ${playedSolutionAsString}`) &&
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
        this.verify(game === null, "Expected last practice game to be null") &&
            this.hadNoErrors();
    }

    testGameUnfinishedOnWrongLetterChange() {
        this.testName = "GameUnfinishedOnWrongLetterChange";
        let [start, target] = ["SALTED", "FISH"];
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(this.fullDict); 
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

        const displayInstructions = game.getDisplayInstructions();
        const expectedFinalInstructions = [
                                // word      type                     change  rating               isStart  parLine
            new DisplayInstruction("SALTED", Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("SATED",  Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("FATED",  Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("FATE",   Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("FAT",    Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("FLAT",   Const.PLAYED,            0,      Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("FRAT",   Const.PLAYED,            0,      Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("FEAT",   Const.PLAYED,            0,      Const.WRONG_MOVE,    false,   true),
            new DisplayInstruction("FELT",   Const.PLAYED,            0,      Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("FEET",   Const.PLAYED_CHANGE,     3,      Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("FE?T",   Const.WORD_AFTER_CHANGE, 2,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("FIST",   Const.FUTURE,            4,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("FISH",   Const.TARGET,            0,      Const.NO_RATING,     false,   false),
        ];

        this.verify(r1 == Const.GOOD_MOVE, `expected r1=${Const.GOOD_MOVE}, got ${r1}`) &&
            this.verify(r2 == Const.GOOD_MOVE, `expected r2=${Const.GOOD_MOVE}, got ${r2}`) &&
            this.verify(r3 == Const.GOOD_MOVE, `expected r3=${Const.GOOD_MOVE}, got ${r3}`) &&
            this.verify(r4 == Const.GOOD_MOVE, `expected r4=${Const.GOOD_MOVE}, got ${r4}`) &&
            this.verify(r5 == Const.GOOD_MOVE, `expected r5=${Const.GOOD_MOVE}, got ${r5}`) &&
            this.verify(r6 == Const.WRONG_MOVE, `expected r6=${Const.WRONG_MOVE}, got ${r6}`) &&
            this.verify(r7 == Const.WRONG_MOVE, `expected r7=${Const.WRONG_MOVE}, got ${r7}`) &&
            this.verify(r8 == Const.WRONG_MOVE, `expected r8=${Const.WRONG_MOVE}, got ${r8}`) &&
            this.verify(r9 == Const.WRONG_MOVE, `expected r9=${Const.WRONG_MOVE}, got ${r9}`) &&
            this.verify(r10 == Const.WRONG_MOVE, `expected r10=${Const.WRONG_MOVE}, got ${r10}`) &&
            this.verifyInstructionList(displayInstructions, expectedFinalInstructions, "unfinished game final") &&
            this.verify(!game.isOver(), "unfinished game should be NOT over") &&
            this.verify(!game.isWinner(), "unfinished game should not be a winner") &&
            this.hadNoErrors();
    }

    testGameUnfinishedAfterMistakes() {
        this.testName = "testGameUnfinishedAfterMistakes";
        let [start, target] = ["FISH", "SALTED"];
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(this.fullDict); 
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

        const displayInstructions = game.getDisplayInstructions();
        const expectedFinalInstructions = [
                                // word      type                     change  rating               isStart  parLine
            new DisplayInstruction("FISH",   Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("FIST",   Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("FEST",   Const.PLAYED,            0,      Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("FAST",   Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("FAT",    Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("FRAT",   Const.PLAYED,            0,      Const.DODO_MOVE,     false,   false),
            new DisplayInstruction("FAT",    Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("FEAT",   Const.PLAYED,            0,      Const.DODO_MOVE,     false,   true),
            new DisplayInstruction("FAT",    Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("FLAT",   Const.PLAYED,            0,      Const.DODO_MOVE,     false,   false),
            new DisplayInstruction("FAT",    Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("FLAT",   Const.PLAYED_DELETE,     0,      Const.DODO_MOVE,     false,   false),
            new DisplayInstruction("FAT",    Const.FUTURE,            0,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("FATE",   Const.FUTURE,            0,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("FATED",  Const.FUTURE,            1,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("SATED",  Const.FUTURE,            0,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("SALTED", Const.TARGET,            0,      Const.NO_RATING,     false,   false),
        ];

        this.verify(r1 == Const.GOOD_MOVE, `expected r1=${Const.GOOD_MOVE}, got ${r1}`) &&
            this.verify(r2 == Const.WRONG_MOVE, `expected r2=${Const.WRONG_MOVE}, got ${r2}`) &&
            this.verify(r3 == Const.GOOD_MOVE, `expected r3=${Const.GOOD_MOVE}, got ${r3}`) &&
            this.verify(r4 == Const.GOOD_MOVE, `expected r4=${Const.GOOD_MOVE}, got ${r4}`) &&
            this.verify(r5 == Const.GOOD_MOVE, `expected r5=${Const.GOOD_MOVE}, got ${r5}`) &&
            this.verify(r6 == Const.DODO_MOVE, `expected r6=${Const.DODO_MOVE}, got ${r6}`) &&
            this.verify(r7 == Const.GOOD_MOVE, `expected r7=${Const.GOOD_MOVE}, got ${r7}`) &&
            this.verify(r8 == Const.GOOD_MOVE, `expected r8=${Const.GOOD_MOVE}, got ${r8}`) &&
            this.verify(r9 == Const.DODO_MOVE, `expected r9=${Const.DODO_MOVE}, got ${r9}`) &&
            this.verify(r10 == Const.GOOD_MOVE, `expected r10=${Const.GOOD_MOVE}, got ${r10}`) &&
            this.verify(r11 == Const.GOOD_MOVE, `expected r11=${Const.GOOD_MOVE}, got ${r11}`) &&
            this.verify(r12 == Const.DODO_MOVE, `expected r12=${Const.DODO_MOVE}, got ${r12}`) &&
            this.verify(r13 == Const.GOOD_MOVE, `expected r13=${Const.GOOD_MOVE}, got ${r13}`) &&
            this.verify(r14 == Const.GOOD_MOVE, `expected r14=${Const.GOOD_MOVE}, got ${r14}`) &&
            this.verify(r15 == Const.DODO_MOVE, `expected r15=${Const.DODO_MOVE}, got ${r15}`) &&
            this.verifyInstructionList(displayInstructions, expectedFinalInstructions, "unfinished game final") &&
            this.verify(!game.isOver(), "unfinished game should be NOT over") &&
            this.verify(!game.isWinner(), "unfinished game should not be a winner") &&
            this.hadNoErrors();
    }

    testGameUnfinishedOnWrongDelete() {
        this.testName = "GameUnfinishedOnWrongDelete";
        let [start, target] = ["SALTED", "FISH"];
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(this.fullDict); 
        game.playDelete(3);      // -> SATED
        game.playLetter(1, "D"); // -> DATED
        game.playDelete(5);      // -> DATE
        game.playLetter(1, "M"); // -> MATE
        game.playLetter(1, "R"); // -> RATE
        game.playLetter(1, "L"); // -> LATE
        game.playLetter(1, "F"); // -> FATE
        game.playDelete(1);      // -> ATE  too many wrong moves

        const displayInstructions = game.getDisplayInstructions();
        const expectedFinalInstructions = [
                                // word      type                     change  rating               isStart  parLine
            new DisplayInstruction("SALTED", Const.PLAYED,            0,      Const.NO_RATING,     true,    false),
            new DisplayInstruction("SATED",  Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("DATED",  Const.PLAYED,            0,      Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("DATE",   Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   false),
            new DisplayInstruction("MATE",   Const.PLAYED,            0,      Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("RATE",   Const.PLAYED,            0,      Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("LATE",   Const.PLAYED,            0,      Const.WRONG_MOVE,    false,   false),
            new DisplayInstruction("FATE",   Const.PLAYED,            0,      Const.GOOD_MOVE,     false,   true),
            new DisplayInstruction("ATE",    Const.PLAYED_ADD,        0,      Const.DODO_MOVE,     false,   false),
            new DisplayInstruction("FATE",   Const.FUTURE,            0,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("FAT",    Const.FUTURE,            0,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("FAST",   Const.FUTURE,            2,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("FIST",   Const.FUTURE,            4,      Const.NO_RATING,     false,   false),
            new DisplayInstruction("FISH",   Const.TARGET,            0,      Const.NO_RATING,     false,   false),
        ];

        this.verifyInstructionList(displayInstructions, expectedFinalInstructions, "unfinished game final") &&
        this.verify(!game.isOver(), "unfinished game should be NOT over") &&
        this.verify(!game.isWinner(), "unfinished game should not be a winner") &&
        this.hadNoErrors();
    }

    // TODO - this test is not being used
    testGameStuckOnWrongSpaceAdded() {
        this.testName = "GameStuckOnWrongSpaceAdded";
        let [start, target] = ["FISH", "SALTED"];
        Persistence.saveTestPracticeGameWords(start, target);
        const game = new PracticeGame(this.fullDict); 
        let r1 = game.playLetter(4, "T"); // -> FIST
        let r3 = game.playLetter(2, "A"); // -> FAST
        let r4 = game.playDelete(3);      // -> FAT
        let r14 = game.playAdd(0);         // -> _FAT At this point, no letter works to make a word.
        let r15 = game.playLetter(1, "A"); // -> AFAT is not a word.  FAT should now be the active word.
        let DIs = game.getDisplayInstructions();
        let DIsAsStrings = DIs.map((di) => di.toStr()).join(",<br>");
        let expectedDIsAsStrings = `(played,word:FISH,moveRating:ok),<br>(played,word:FIST,moveRating:ok),<br>(played,word:FAST,moveRating:ok),<br>(add,word:FAT),<br>(future,word:FATE,changePosition:0),<br>(future,word:FATED,changePosition:1),<br>(future,word:SATED,changePosition:0),<br>(target,word:SALTED)`;

            this.verify(r1 == Const.GOOD_MOVE, `expected r1=${Const.GOOD_MOVE}, got ${r1}`) &&
                this.verify(r3 == Const.GOOD_MOVE, `expected r3=${Const.GOOD_MOVE}, got ${r3}`) &&
                this.verify(r4 == Const.GOOD_MOVE, `expected r4=${Const.GOOD_MOVE}, got ${r4}`) &&
                this.verify(r14 == Const.GOOD_MOVE, `expected r14=${Const.GOOD_MOVE}, got ${r14}`) &&
                this.verify(r15 == Const.NOT_A_WORD, `expected r15=${Const.NOT_A_WORD}, got ${r15}`) &&
                this.verify(!game.isOver(), "game should not be over yet") &&
                this.verify(!game.isWinner(), "game should not be a winner after too many wrong moves") &&
                this.verify(DIsAsStrings == expectedDIsAsStrings, `expected DIs:<p>${expectedDIsAsStrings}<p>but got:<p>${DIsAsStrings}`) &&
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
            //this.multiIncompleteGameStatsTest,
            this.dailyGameNormalFinishStatsTest,
            this.dailyGameUnfinishedRestartNextDayTest,
            // this.dailyGameTooManyMistakesShareTest,
            this.dailyGameEndsOnDeleteShareTest,
            //this.dailyGameRestartAfterDohTest,
            //this.dailyGameRestartTest,
            this.dailyGameOneMistakeShareTest,
            //this.dailyGameShowWordStatsTest,
            this.dailyGameResultsDivOnWinTest,
            this.dailyGameResultsDivOnExactWinTest,
            //this.dailyGameResultsDivWithShownTest,
            //this.dailyGameResultsDivOnLossTest,
            //this.practiceGameTest,
            //this.practiceGameTestNoConfirm,
            //this.practiceGameLimitTest, // This test craps out
            this.geniusMoveAndShareTest,
            this.cookieRestartTest,
            this.changeMindOnSelectedLettersTest,
            this.displayModesTest,
            //this.displayBrokenDailyGameToastTest, // This test craps out
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
        // restore default confirmation mode
        Persistence.saveConfirmationMode(true);

        this.testName = "ChangeMindOnSelectedLetters";
        // SHORT -> POOR
        // solution: SHORT SHOOT HOOT BOOT BOOR POOR
        // but we play  SHORT SHOOT SHOT HOT POT POO POOR
        const changeLetterResult1 = this.playLetter(4, "O", "Z"); // SHORT -> SHOZT not confirmed -> SHOOT confirmed
        const deleteLetterResult1 = this.deleteLetter(3,5);       // SHOOT -> SHOO not confirmed -> SHOT confirmed
        const deleteLetterResult2 = this.deleteLetter(1);         // SHOT -> HOT  we are deleting even though not really a display option on this step.
        const changeLetterResult2 = this.playLetter(1, "P");      // HOT -> POT
        const changeLetterResult3 = this.playLetter(3, "O");      // POT -> POO
        const insertLetterResult1 = this.insertLetter(3, "R", 0);  // POO -> xPOO change mind -> POOx -> POOR
        this.verify(changeLetterResult1 == Const.GOOD_MOVE, "after changing mind from Z to O, expected: ", Const.GOOD_MOVE, " got: ", changeLetterResult1) &&
            this.verify(deleteLetterResult1 == Const.WRONG_MOVE, "after changing mind from HOOT to SHOT, expected: ", Const.WRONG_MOVE, " got: ", deleteLetterResult1) &&
            this.verify(deleteLetterResult2 == Const.GOOD_MOVE, "after SHOT to HOT, expected: ", Const.GOOD_MOVE, " got: ", deleteLetterResult2) &&
            this.verify(changeLetterResult2 == Const.GOOD_MOVE, "after HOT to POT, expected: ", Const.GOOD_MOVE, " got: ", changeLetterResult1) &&
            this.verify(changeLetterResult3 == Const.GOOD_MOVE, "after POT to POO, expected: ", Const.GOOD_MOVE, " got: ", changeLetterResult1) &&
            this.verify(insertLetterResult1 == Const.GOOD_MOVE, "after changing mind from POO ->  xPOO to POOx->POOR, expected: ", Const.GOOD_MOVE, " got: ", insertLetterResult1) &&
            this.hadNoErrors();
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
        let gameState = this.gameDisplay.getGameState(),
            dailyShareButton = this.gameDisplay.shareButton;

        let [start, target, gameNumber] = [gameState.start, gameState.target, gameState.dailyGameNumber];
        let [expStart, expTarget] = Const.DAILY_GAMES[3].map(word => word.toUpperCase());
        this.verify(start == expStart, "After restart, expected start word: ", expStart, ", got: ", start) &&
            this.verify(target == expTarget, "After restart, expected target word: ", expTarget, ", got: ", target) &&
            this.verify(gameNumber == expGameNumber, "Expected daily game number", expGameNumber, " after restarting next day, got", gameNumber) &&
            this.verify(dailyShareButton.hasAttribute('disabled') === true, "expected daily game share button to have 'disabled' attribute.") &&
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
        this.verify(toastClass == expToastClass, "expected toast class to be", expToastClass, "found", toastClass) && 
            this.verify(toastMsg == expToastMsg, "expected toast message to be", expToastMsg, "found", toastMsg) && 
            this.verify(toastAfterGame == Const.GAME_WON, `expected ${Const.GAME_WON} toast, got: ${toastAfterGame}`) &&
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
        this.verify(toastClass == expToastClass, "expected toast class to be", expToastClass, "found", toastClass) && 
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
            this.verify((actShareString.indexOf(expShareString) === 0), `expected share string to start with '${expShareString}', got '${actShareString}'`) &&
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
        this.testName = "displayModes";
        const appDisplay = this.getNewAppWindow().theAppDisplay;
        const settingsDisplay = appDisplay.settingsDisplay;

        let srcElement = new MockEventSrcElement();
        var mockEvent = new MockEvent(srcElement); 
        var soFarSoGood = this.verify(!Persistence.getColorblindMode(), "expected colorblind mode off 1") &&
            this.verify(!Persistence.getDarkTheme(), "expected dark mode mode off 1");

        srcElement.setAttribute("id", "colorblind");
        // colorblind on, dark off
        srcElement.checked = true;
        settingsDisplay.checkboxCallback(mockEvent);
        soFarSoGood &&= this.verify(Persistence.getColorblindMode(), "expected colorblind mode on 2");
        // colorblind off, dark off
        srcElement.checked = false;
        settingsDisplay.checkboxCallback(mockEvent);
        soFarSoGood &&= this.verify(!Persistence.getColorblindMode(), "expected colorblind mode off 2");

        srcElement.setAttribute("id", "dark");
        // dark mode on, colorblind off
        srcElement.checked = true;
        settingsDisplay.checkboxCallback(mockEvent);
        soFarSoGood &&= this.verify(Persistence.getDarkTheme(), "expected dark mode on 3");
        // dark mode off, colorblind off
        srcElement.checked = false;
        settingsDisplay.checkboxCallback(mockEvent);
        soFarSoGood &&= this.verify(!Persistence.getDarkTheme(), "expected dark mode off 3");

        // dark mode on, colorblind mode on
        srcElement.setAttribute("id", "dark");
        srcElement.checked = true;
        settingsDisplay.checkboxCallback(mockEvent);
        srcElement.setAttribute("id", "colorblind");
        srcElement.checked = true;
        settingsDisplay.checkboxCallback(mockEvent);

        soFarSoGood &&= this.verify(Persistence.getColorblindMode(), "expected colorblind mode on 4") &&
            this.verify(Persistence.getDarkTheme(), "expected dark mode mode on 4");

        // confirmation mode - just testing the appDisplay's callback
        srcElement.setAttribute("id", "confirmation");
        srcElement.checked = true;
        settingsDisplay.checkboxCallback(mockEvent);
        soFarSoGood &&= this.verify(Persistence.getConfirmationMode(), "expected confirmation mode on");
        srcElement.checked = false;
        settingsDisplay.checkboxCallback(mockEvent);
        soFarSoGood &&= this.verify(!Persistence.getConfirmationMode(), "expected confirmation mode off");

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
            this.verify(dailyShareButton.hasAttribute('disabled') === true, "expected daily game screen share button to have 'disabled' attribute.") &&
            this.verify(statsShareButton.hasAttribute('disabled') === true, "expected stats screen share button to have 'disabled' attribute.") &&
            this.verify(lastToast == Const.NO_DAILY, `expected ${Const.NO_DAILY} toast, got: ${lastToast}`) &&
            this.hadNoErrors();
    }

    // a test that makes 0, 1, or 2 errors depending on which iteration
    // See multiGameStatsTest for how we make the multiple games appear to be a winning streak by
    // manually adjusting the last won game number.

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

    multiIncompleteGameStatsTest() {
        this.testName = "MultiIncompleteGameStats";
        for (let gameCounter = 0; gameCounter <= 2; gameCounter++) {
            this.logDebug(this.testName, "gameCounter: ", gameCounter, "test");
            if (gameCounter == 0) {
                // play an incomplete game 
                // SHORT -> POOR
                this.playLetter(4, "O"); // SHORT -> SHOOT
                this.deleteLetter(1);    // SHOOT -> HOOT
                this.playLetter(1, "B"); // HOOT -> BOOT
            } else if (gameCounter == 1) {
                // play a full game
                this.playTheCannedDailyGameOnce();
            } else if (gameCounter == 2) {
                // play a longer incomplete game (formerly failed game)
                this.playLetter(4, "O"); // SHORT -> SHOOT
                this.deleteLetter(1);    // SHOOT -> HOOT
                this.playLetter(1, "B"); // HOOT -> BOOT
                this.playLetter(1, "S"); // BOOT -> SOOT error
                this.playLetter(1, "T"); // SOOT -> TOOT error
                this.playLetter(1, "R"); // TOOT -> ROOT error
                this.playLetter(1, "L"); // ROOT -> LOOT error
                this.playLetter(1, "R"); // LOOT -> ROOT error
                this.verify(!this.gameDisplay.game.isLoser(), "expected game not to be loser");
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
        let expStatsBlob = { gamesStarted : 3, gamesWon : 1, gamesLost : 0, streak : 0 };  
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

        this.playLetter(4, "O"); // SHORT -> SHOOT
        this.deleteLetter(1);    // SHOOT -> HOOT
        this.playLetter(1, "B"); // HOOT  -> BOOT
        this.gameDisplay.showWordCallback(mockEvent); // reveals BOOR
        this.playLetter(4, "K"); // BOOR -> BOOK WRONG
        this.playLetter(4, "R"); // BOOK -> BOOR
        this.playLetter(1, "P"); // solved; results should be displayed

        const resultsDiv = this.gameDisplay.resultsDiv
        const children = resultsDiv.children
        if (!this.verify (children.length == 3, "expected 3 children in results div, got: ", children.length))
            return
        const scoreDiv = children[0]
        const expScoreStr = "Score: 2 extra steps"
        const actScoreStr = scoreDiv.textContent

        const originalSolutionDiv = children[1]
        const originalSolutionLabel = originalSolutionDiv.children[0]
        const expSolutionStr = "WordChain's solution:SHORT⇒SHOOT⇒HOOT⇒BOOT⇒BOOR⇒POOR"
        const actSolutionStr = originalSolutionLabel.textContent
        this.verify(actScoreStr == expScoreStr, "expected score string:", expScoreStr, "got:", actScoreStr) &&
        this.verify(actSolutionStr == expSolutionStr, "expected score string:", expSolutionStr, "got:", actSolutionStr) &&
        this.hadNoErrors()
    }

    dailyGameResultsDivOnExactWinTest() {
        // we play the canned daily game once, perfectly.
        // verify that the score displayed is 0 -- no mistakes
        // verify that the message is You found WordChain's solution
        this.testName = "DailyGameResultsDivOnExactWinDiv";

        this.playTheCannedDailyGameOnce();

        const resultsDiv = this.gameDisplay.resultsDiv;
        const children = resultsDiv.children;
        if (!this.verify (children.length == 3, "expected 3 children in results div, got: ", children.length))
            return;
        const scoreDiv = children[0];
        const expScoreStr = "Score: 0 -- perfect!";
        const actScoreStr = scoreDiv.textContent;

        const originalSolutionDiv = children[1];
        const originalSolutionLabel = originalSolutionDiv.children[0];
        const expSolutionStr = "You found WordChain's solution!";
        const actSolutionStr = originalSolutionLabel.textContent;
        this.verify(actScoreStr == expScoreStr, "expected score string:", expScoreStr, "got:", actScoreStr) &&
            this.verify(actSolutionStr == expSolutionStr, "expected score string:", expSolutionStr, "got:", actSolutionStr) &&
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
        // we play:  SHORT SHOOT HOOT BOOT(shown) BOOK(wrong) BOOR POOR

        this.playLetter(4, "O"); // SHORT -> SHOOT
        this.deleteLetter(1);    // SHOOT -> HOOT
        this.playLetter(1, "B"); // HOOT  -> BOOT
        this.gameDisplay.showWordCallback(mockEvent); // reveals BOOR
        this.playLetter(1, "P"); // solved; results should be displayed

        const resultsDiv = this.gameDisplay.resultsDiv;
        const children = resultsDiv.children;
        if (!this.verify (children.length == 3, "expected 3 children in results div, got: ", children.length))
            return;
        const scoreDiv = children[0];
        const expScoreStr = "Score: 1 extra step";
        const actScoreStr = scoreDiv.textContent;

        const originalSolutionDiv = children[1];
        this.verify(originalSolutionDiv.children.length == 0, "expected no children in original solution div, found:", originalSolutionDiv.children.length) &&
            this.verify(actScoreStr == expScoreStr, "expected score string:", expScoreStr, "got:", actScoreStr) &&
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
        // we play:  SHORT SHOOT HOOT BOOT BOOK-wrong BOOB-wrong BOOT-wrong BOOK-wrong BOOT-wrong

        this.playLetter(4, "O"); // SHORT -> SHOOT
        this.deleteLetter(1);    // SHOOT -> HOOT
        this.playLetter(1, "B"); // HOOT -> BOOT
        this.playLetter(4, "K"); // BOOT -> BOOK  D'OH wrong move 1
        this.playLetter(4, "B"); // BOOK -> BOOB  D'OH wrong move 2
        this.playLetter(4, "T"); // BOOB -> BOOT  D'OH wrong move 3
        this.playLetter(4, "K"); // BOOT -> BOOK  D'OH wrong move 4
        this.playLetter(4, "T"); // BOOK -> BOOT  D'OH wrong move 5

        // game should be over if Const.TOO_MANY_EXTRA_STEPS is 5
        const game = this.gameDisplay.game;
        if (!this.verify(game.isOver(), "after 5 wrong moves, game is not over!"))
            return

        const resultsDiv = this.gameDisplay.resultsDiv
        const children = resultsDiv.children

        const scoreDiv = children[0]
        const expScoreStr = "Score: 5 -- too many extra steps!"
        const actScoreStr = scoreDiv.textContent

        const originalSolutionDiv = children[1]
        const originalSolutionLabel = originalSolutionDiv.children[0]
        const expSolutionStr = "WordChain's solution:SHORT⇒SHOOT⇒HOOT⇒BOOT⇒BOOR⇒POOR"
        const actSolutionStr = originalSolutionLabel.textContent

        // re-open the app window
        this.resetTheTestAppWindow();
        // we should be running the daily game SHORT -> POOR with SHOOT, HOOT already played.
        const restartedGame = this.gameDisplay.game;
        const restartedDi = restartedGame.getDisplayInstructions();
        this.verify(actScoreStr == expScoreStr, "expected score string:", expScoreStr, "got:", actScoreStr) &&
        this.verify(actSolutionStr == expSolutionStr, "expected score string:", expSolutionStr, "got:", actSolutionStr) && 
        this.verify(restartedDi[10].moveRating == Const.WRONG_MOVE, "expected move rating:", Const.WRONG_MOVE, "got:", restartedDi[10].moveRating) &&
            this.hadNoErrors()
    }


    dailyGameShowWordStatsTest() {
        // we verify the following
        // Play the daily game, with 2 wrong words and then 3 shown words to lose
        // Target word should be loss (display instruction PLAYED,WRONG_MOVE)
        // Remaining words after the 3rd shown move are also shown
        // Streak reset to 0
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

        this.playLetter(4, "O"); // SHORT -> SHOOT
        this.deleteLetter(5);      // SHOOT -> SHOO DODO
        this.insertLetter(4, "T"); // SHOO-> SHOOT GOOD_MOVE
        this.deleteLetter(5);      // SHOOT -> SHOO DODO
        this.insertLetter(4, "T"); // SHOO-> SHOOT GOOD_MOVE
        this.deleteLetter(5);      // SHOOT -> SHOO DODO
        this.gameDisplay.showWordCallback(mockEvent); // reveals SHOOK
        this.gameDisplay.showWordCallback(mockEvent); // reveals SPOOK, game should end

        let expStatsBlob = { gamesStarted : 1, gamesWon : 0, gamesLost : 1, streak : 0 };  
        // the only completed game has 5 wrong moves (3 errors, 2 shown moves)
        let expExtraStepsHistogram = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 };
        let statsTestResult = this.verifyStats(expStatsBlob, expExtraStepsHistogram); 
        this.logDebug("statsTestResult: ", statsTestResult, "test");

        if (statsTestResult) {
            let game = this.gameDisplay.game;
            const gameIsWinner = game.isWinner();
            const statsDisplay = this.openAndGetTheStatsDisplay();
            const statsSrcElement = new MockEventSrcElement();
            const statsMockEvent = new MockEvent(statsSrcElement);
            const actShareString = statsDisplay.shareCallback(statsMockEvent);
            this.closeTheStatsDisplay();
            const expShareString = `WordChain #${Test.TEST_EPOCH_DAYS_AGO + 1} 😖\nStreak: 0\nSHORT --> POOR\n🟪🟪🟪🟪🟪\n🟩🟩🟩🟩🟩\n🟥🟥🟥🟥\n🟩🟩🟩🟩🟩\n🟥🟥🟥🟥\n🟩🟩🟩🟩🟩\n🟥🟥🟥🟥\n⬜⬜⬜⬜\n⬜⬜⬜\n⬜⬜⬜\n⬜⬜⬜\n🟥🟥🟥🟥\n`;
            this.verify(!gameIsWinner, "game should not be a winner.") &&
            this.verify((actShareString.indexOf(expShareString) === 0), `expected share string to start with ='${expShareString}', got '${actShareString}'`) &&
            this.hadNoErrors();
        }
        this.closeTheStatsDisplay();
    }

    dailyGameOneMistakeShareTest() {
        this.testName = "DailyGameOneMistakeShare";

        // The newly opened URL should be showing the test daily game by default:
        // SHORT -> POOR solution: SHORT SHOOT HOOT BOOT BOOR POOR

        this.playLetter(4, "O"); // SHORT -> SHOOT
        this.deleteLetter(1);    // SHOOT -> HOOT
        this.playLetter(1, "B"); // HOOT -> BOOT
        const appDisplay = this.getNewAppWindow().theAppDisplay;
        appDisplay.clearLastToast();
        this.playLetter(4, "K"); // BOOT -> BOOK  D'OH wrong move
        const toastAfterWrongMove = appDisplay.getAndClearLastToast();
        this.playLetter(4, "R"); // BOOK -> BOOR
        this.playLetter(1, "P"); // BOOR -> POOR

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

        this.verify((actShareString.indexOf(expShareString) === 0), `expected share string to start with ='${expShareString}', got '${actShareString}'`) &&
            this.verify(dailyShareButton.hasAttribute('disabled') === false, "expected daily game screen share button NOT to have 'disabled' attribute.") &&
            this.verify(statsShareButton.hasAttribute('disabled') === false, "expected stats screen share button NOT to have 'disabled' attribute.") &&
            this.verify(toastAfterWrongMove == Const.WRONG_MOVE, `expected ${Const.WRONG_MOVE} toast, got: ${toastAfterWrongMove}`) &&
            this.hadNoErrors();

    }

    // this test verifies that after failing a game, the game is over, the share shows the mad face and wrong moves, and the streak is at zero.

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

        // game should be over if Const.TOO_MANY_EXTRA_STEPS is 5.
        if (!this.verify(game.isOver(), "after 5 wrong moves, game is not over!")) {
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
        let expShareString = `WordChain #${Test.TEST_EPOCH_DAYS_AGO + 1} 😖\nStreak: 0\nSHORT --> POOR\n🟪🟪🟪🟪🟪\n🟩🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟥🟥🟥🟥\n🟥🟥🟥🟥\n🟥🟥🟥🟥\n🟥🟥🟥🟥\n🟥🟥🟥🟥\n⬜⬜⬜⬜\n🟥🟥🟥🟥\n`;
        this.closeTheStatsDisplay();

        this.verify((actShareString.indexOf(expShareString) === 0), `expected share string to start with '${expShareString}', got '${actShareString}'`) &&
            this.verify(dailyShareButton.hasAttribute('disabled') === false, "expected daily game screen share button NOT to have 'disabled' attribute.") &&
            this.verify(statsShareButton.hasAttribute('disabled') === false, "expected stats screen share button NOT to have 'disabled' attribute.") &&
            this.verify(gameLostToast == Const.GAME_LOST, `expected ${Const.GAME_LOST} toast, got: ${gameLostToast}`) &&
            this.verify(shareToast == Const.SHARE_TO_PASTE, `expected ${Const.SHARE_TO_PASTE} toast, got: ${shareToast}`) &&
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

        this.deleteLetter(4);    // START -> STAT
        this.playLetter(2, "E"); // STAT -> SEAT
        this.playLetter(3, "N"); // SEAT -> SENT
        this.playLetter(4, "D"); // SENT -> SEND
        this.deleteLetter(1);    // SEND -> END

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
        this.verify((actShareString.indexOf(expShareString)===0), `expected share string to start with ${expShareString}', got '${actShareString}'`) &&
            this.hadNoErrors();
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
            this.verify((di[0].toStr() === `(played,word:SHORT,moveRating:${Const.GOOD_MOVE})`), `instruction[0] is ${di[0].toStr()}`) &&
            this.verify((di[1].toStr() === `(played,word:SHOOT,moveRating:${Const.GOOD_MOVE})`), `instruction[1] is ${di[1].toStr()}`) &&
            this.verify((di[2].toStr() === "(change,word:HOOT,changePosition:1)"), `instruction[2] is ${di[2].toStr()}`) &&
            this.verify((di[3].toStr() === "(change-next,word:BOOT,changePosition:4)"), `instruction[3] is ${di[3].toStr()}`) &&
            this.verify((di[4].toStr() === "(future,word:BOOR,changePosition:1)"), `instruction[4] is ${di[4].toStr()}`) &&
            this.verify((di[5].toStr() === "(target,word:POOR)"), `instruction[5] is ${di[5].toStr()}`);

        if (resultsSoFar) {
            // finish the game. ( ... BOOT BOOR POOR)
            const playedB = this.playLetter(1, "B"); // HOOT -> BOOT
            const playedR = this.playLetter(4, "R"); // BOOT -> BOOR
            const playedP = this.playLetter(1, "P"); // BOOR -> POOR

            resultsSoFar = this.verify((playedB == Const.GOOD_MOVE), `played B, got ${playedB}, not `, Const.GOOD_MOVE) &&
                this.verify((playedR == Const.GOOD_MOVE), `played R, got ${playedR}, not `, Const.GOOD_MOVE) &&
                this.verify((playedP == Const.GOOD_MOVE), `played P, got ${playedP}, not `, Const.GOOD_MOVE);
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
                this.hadNoErrors();
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
                this.verify((di[0].toStr() === `(played,word:SHORT,moveRating:${Const.GOOD_MOVE})`), `instruction[0] is ${di[0].toStr()}`) &&
                this.verify((di[1].toStr() === `(played,word:SHOOT,moveRating:${Const.GOOD_MOVE})`), `instruction[1] is ${di[1].toStr()}`) &&
                this.verify((di[2].toStr() === `(played,word:HOOT,moveRating:${Const.GOOD_MOVE})`), `instruction[2] is ${di[2].toStr()}`) &&
                this.verify((di[3].toStr() === "(change,word:SOOT,changePosition:1)"), `instruction[3] is ${di[3].toStr()}`) &&
                this.verify((di[4].toStr() === "(change-next,word:BOOT,changePosition:4)"), `instruction[4] is ${di[4].toStr()}`) &&
                this.verify((di[5].toStr() === "(future,word:BOOR,changePosition:1)"), `instruction[5] is ${di[5].toStr()}`) &&
                this.verify((di[6].toStr() === "(target,word:POOR)"), `instruction[5] is ${di[5].toStr()}`) ) {

            // finish the game. ( ... BOOT BOOR POOR)

            const playedB = this.playLetter(1, "B"); // HOOT -> BOOT
            const playedR = this.playLetter(4, "R"); // BOOT -> BOOR
            const playedP = this.playLetter(1, "P"); // BOOR -> POOR
            di = game.getDisplayInstructions();

            this.verify((playedB == Const.GOOD_MOVE), `played B, got ${playedB}, not `, Const.GOOD_MOVE) &&
                this.verify((playedR == Const.GOOD_MOVE), `played R, got ${playedR}, not `, Const.GOOD_MOVE) &&
                this.verify((playedP == Const.GOOD_MOVE), `played P, got ${playedP}, not `, Const.GOOD_MOVE) &&
                this.verify((di.length == 7), `expected 7 display instructions after finishing game, got ${di.length}`) &&
                this.verify((di[0].toStr() === `(played,word:SHORT,moveRating:${Const.GOOD_MOVE})`), `di[0] is ${di[0].toStr()}`) &&
                this.verify((di[1].toStr() === `(played,word:SHOOT,moveRating:${Const.GOOD_MOVE})`), `di[1] is ${di[1].toStr()}`) &&
                this.verify((di[2].toStr() === `(played,word:HOOT,moveRating:${Const.GOOD_MOVE})`), `di[2] is ${di[2].toStr()}`) &&
                this.verify((di[3].toStr() === `(played,word:SOOT,moveRating:${Const.WRONG_MOVE})`), `di[3] is ${di[3].toStr()}`) &&
                this.verify((di[4].toStr() === `(played,word:BOOT,moveRating:${Const.GOOD_MOVE})`), `di[4] is ${di[4].toStr()}`) &&
                this.verify((di[5].toStr() === `(played,word:BOOR,moveRating:${Const.GOOD_MOVE})`), `di[5] is ${di[5].toStr()}`) &&
                this.verify((di[6].toStr() === `(played,word:POOR,moveRating:${Const.GOOD_MOVE})`), `di[6] is ${di[6].toStr()}`) &&
                this.hadNoErrors();
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
        const appDisplay = this.getNewAppWindow().theAppDisplay;
        appDisplay.switchToPracticeGameCallback();
        Persistence.saveConfirmationMode(confirm);

        this.logDebug("Done switching to practice game", "test");

        // the active gameDisplay in this test needs to be refreshed after switching to the practice game
        this.setGameDisplay();

        // solve the puzzle directly: TEST LEST LET LOT PLOT PILOT
        let resultL1 = this.playLetter(1, "L");          // TEST -> LEST
        let resultDelete3 = this.deleteLetter(3);        // LEST -> LET
        let resultI2Wrong = this.playLetter(2, "I");     // LET -> LIT - wrong move!
        const wrongMoveToast = appDisplay.getAndClearLastToast();
        let resultO2 = this.playLetter(2, "O");          // LIT -> LOT
        let resultInsertP0 = this.insertLetter(0, "P" ); // LOT -> PLOT
        let resultInsertI1 = this.insertLetter(1, "I");  // PLOT -> PxLOT

        // restore default confirmation mode
        Persistence.saveConfirmationMode(false);

        this.verify((resultL1 === Const.GOOD_MOVE), `playLetter(1, L) returns ${resultL1}, not ${Const.GOOD_MOVE}`) &&
            this.verify((resultDelete3 === Const.GOOD_MOVE), `playDelete(3) returns ${resultDelete3}, not ${Const.GOOD_MOVE}`) &&
            this.verify((resultI2Wrong === Const.WRONG_MOVE), `playLetter(2, O) returns ${resultO2}, not ${Const.GOOD_MOVE}`) &&
            this.verify((resultO2 === Const.GOOD_MOVE), `playLetter(2, O) returns ${resultO2}, not ${Const.GOOD_MOVE}`) &&
            this.verify((resultInsertP0 == Const.GOOD_MOVE), `insert P@0 returns ${resultInsertP0}, not ${Const.GOOD_MOVE}`) &&
            this.verify((resultInsertI1 === Const.GOOD_MOVE), `insert I@1 returns ${resultInsertI1}, not ${Const.GOOD_MOVE}`) &&
            this.verify(wrongMoveToast == Const.WRONG_MOVE, `expected ${Const.WRONG_MOVE} toast, got: ${wrongMoveToast}`) &&
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
        var result = this.playLetter(4, "X"); // SHORT -> SHOXT
        const lastToast = appDisplay.getAndClearLastToast();

        this.verify(result == Const.NOT_A_WORD, "expected result", Const.NOT_A_WORD, "found", result) &&
            this.verify(lastToast == Const.NOT_A_WORD, `expected ${Const.NOT_A_WORD} toast, got: ${lastToast}`) &&
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
        var result = this.playLetter(4, "R"); // SHORT -> SHORT
        const lastToast = appDisplay.getAndClearLastToast();
        this.verify(result == Const.PICK_NEW_LETTER, "expected", Const.PICK_NEW_LETTER, "found", result) &&
            this.verify(lastToast == Const.PICK_NEW_LETTER, `expected ${Const.PICK_NEW_LETTER} toast, got: ${lastToast}`) &&
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

            // test finishing the current game by either winning or showSolution.
            if (gamesStarted % 2 == 0) {
                this.logDebug("ending game by showing remaining words", "test");
                this.showRemainingWords();
            } else {
                this.logDebug("ending game by finishing it", "test");
                this.finishTheCurrentGame();
            }

            this.logDebug("game should be finished", game.gameState, "test");
            // New Game button should be there, but not on the last game. The postGameDiv is reconstructed on every refresh of the display after a move
            // or solution.
            const postGameDiv = this.gameDisplay.postGameDiv,
                  children = postGameDiv.children;

            if (! this.verify(children.length == 2, "on game", gamesStarted, "expected 2 children, got:", children.length)) {
                break;
            }

            const child1IsDisabled = children[0].disabled,
                  child1Text = children[0].textContent,
                  child2IsDisabled = children[1].disabled,
                  child2Text = children[1].textContent;

            if (gamesStarted < Const.PRACTICE_GAMES_PER_DAY) {
                // Not last game
                if (
                        this.verify( (child1Text == "Show Word"), "on game", gamesStarted, "expected textContent=Show Word, got: ", child1Text) &&
                        this.verify( child1IsDisabled, "on game", gamesStarted, "Show Word button was enabled and expected it to be disabled") &&
                        this.verify( (child2Text == "New Game"), "on game", gamesStarted, "expected textContent=New Game, got: ", child2Text) &&
                        this.verify( !child2IsDisabled, "on game", gamesStarted, "New Game button was disabled and expected it to be enabled") &&
                        this.verify(this.gameDisplay.anyGamesRemaining(), "on game", gamesStarted, "anyGamesRemaining() should still be true")
                   ) {
                    // pretend to click the new game button.
                    this.gameDisplay.newGameCallback(mockEvent);
                } else {
                    soFarSoGood = false;
                }
            } else {
                // Last game
                soFarSoGood = this.verify(child2IsDisabled, "on last game", gamesStarted, "New Game button was enabled and expected it to be disabled") &&
                              this.verify(!this.gameDisplay.anyGamesRemaining(), "on last game", gamesStarted, "anyGamesRemaining() should be false")
            }
        }

        if (soFarSoGood) {
            // now, restart the app on the same day, to see if we get new practice games on restarting the same day.  
            this.resetTheTestAppWindow();
            this.getNewAppWindow().theAppDisplay.switchToPracticeGameCallback();
            this.setGameDisplay();
            let game = this.gameDisplay.game;
            soFarSoGood = this.verify(!this.gameDisplay.anyGamesRemaining(), "after same-day restart, there should be no games remaining", game.gameState.toStr());
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
            soFarSoGood = this.verify(this.gameDisplay.anyGamesRemaining(), "after overnight restart, there should be some games remaining", game.gameState.toStr());
        }

        soFarSoGood && this.hadNoErrors();
    }

    // verifies a game ending that includes a genius move.  Checks the share, including the streak.  Checks the genius toast
    geniusMoveAndShareTest() {
        this.testName = "GeniusMoveAndShare";

        // regular solution:                SHORT SHOOT HOOT BOOT BOOR POOR
        // solve the puzzle like a genius:  SHORT SHOOT HOOT HOOR POOR

        let resultO4 = this.playLetter(4, "O");       // SHORT -> SHOOT
        let resultDelete1 = this.deleteLetter(1);     // SHOOT -> HOOT
        let resultR4Genius = this.playLetter(4, "R"); // HOOT -> HOOR genius move
        const appDisplay = this.getNewAppWindow().theAppDisplay;
        const toastAfterGeniusMove = appDisplay.getAndClearLastToast();
        let resultP1 = this.playLetter(1, "P");       // HOOR -> POOR

        // let's look at the share ...
        let statsDisplay = this.openAndGetTheStatsDisplay();
        this.logDebug("statsDisplay", statsDisplay, "test");

        let statsSrcElement = new MockEventSrcElement();
        let statsMockEvent = new MockEvent(statsSrcElement);
        let actShareString = statsDisplay.shareCallback(statsMockEvent);
        let expShareString = `WordChain #${Test.TEST_EPOCH_DAYS_AGO + 1} ⭐\nStreak: 1\nSHORT --> POOR\n🟪🟪🟪🟪🟪\n🟩🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟨🟨🟨🟨\n🟩🟩🟩🟩\n`;
        this.closeTheStatsDisplay();

        this.verify((resultO4 === Const.GOOD_MOVE), `playLetter(4, O) returns ${resultO4}, not ${Const.GOOD_MOVE}`) &&
            this.verify((resultDelete1 === Const.GOOD_MOVE), `deleteLetter(1) returns ${resultDelete1}, not ${Const.GOOD_MOVE}`) &&
            this.verify((resultR4Genius === Const.GENIUS_MOVE), `playLetter(4, R) returns ${resultR4Genius}, not ${Const.GENIUS_MOVE}`) &&
            this.verify((resultP1 === Const.GOOD_MOVE), `playLetter(1, P) returns ${resultP1}, not ${Const.GOOD_MOVE}`) &&
            this.verify((actShareString.indexOf(expShareString) === 0), `sharestring: expected '${expShareString}', got '${actShareString}'`) &&
            this.verify(toastAfterGeniusMove == Const.GENIUS_MOVE, `expected ${Const.GENIUS_MOVE} toast, got: ${toastAfterGeniusMove}`) &&
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
        this.verify((testIntRestored == 42), `testIntRestored is ${testIntRestored}, not 42`) &&
            this.verify(testBoolRestored, `testBoolRestored is ${testBoolRestored}, not true`) &&
            this.verify((testObjRestored.nums.length == 2), `testObjRestored.length is ${testObjRestored.length}, not 2`) &&
            this.verify((testObjRestored.nums[0] == 3), `testObjRestored[0]is ${testObjRestored[0]}, not 3`) &&
            this.verify((testObjRestored.nums[1] == 5), `testObjRestored[1]is ${testObjRestored[1]}, not 5`) &&
            this.verify((testObjRestored.field == "hello"), `testObjRestored.field is '${testObjRestored.field}', not hello`) &&
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
