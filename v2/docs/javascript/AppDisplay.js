import { BaseLogger } from './BaseLogger.js';
import { WordChainDict } from './WordChainDict.js';
import { GameDisplay } from './GameDisplay.js';
import { HelpDisplay } from './HelpDisplay.js';
import { ElementUtilities } from './ElementUtilities.js';
import * as Const from './Const.js';


/*
** TODO:
** Implementation
**
** Before Sharing with Initial Friends
** - Review help message
** - 30 days of daily games
** - Execute test plan on iPhone/iPad (Safari) and desk/laptop (Chrome)
**
** Deployment
** - How to create/minify/obscure one big js file
** - Buy domain wordchain.com?
** - Where to host?
** - How to manage daily game words long-term?
** - Testing on various browsers/devices
** - Cookies: make secure?
** - Logo/favicon.ict
*/

// Synchronously wait for the word list to download.
const globalWordList = await fetch(Const.DICT_URL)
  .then(resp => resp.text())
  .then(text => text.split("\n"));

/*
** ==========================
** SINGLETON CLASS AppDisplay
** ==========================
*/

class AppDisplay extends BaseLogger {
    /*
    ** ===============
    ** CLASS VARIABLES
    ** ===============
    */

    static singletonObject = null;
    static currentGameDisplay = null;

    /*
    ** ============
    ** CONSTRUCTION
    ** ============
    */

    constructor() {
        super();

        this.dict = new WordChainDict(globalWordList);

        /*
        // Flags from stats screen
        this.darkTheme      = Cookie.getBoolean("DarkTheme");
        this.colorblindMode = Cookie.getBoolean("ColorblindMode");
        this.hardMode       = Cookie.getBoolean("HardMode");
        this.typeSavingMode = Cookie.getBoolean("TypeSavingMode");

        // This keeps track of whether the user clicked the Show Solution button
        // for the daily game.
        this.dailySolutionShown = Cookie.getBoolean("DailySolutionShown");

        // Now set the colors based on darkTheme and colorblindMode.
        this.setColors();

        // This keeps track of the most recently played daily game number.
        this.dailyGameNumber = Cookie.getInt("DailyGameNumber");

        // The starting word, played words, and target words of each game.
        this.dailyGameWords    = Cookie.getJsonOrElse("DailyGame", []);

        // Construct initial stats to be used if we don't have a cookie for daily stats.
        let initialStats = {
            gamesPlayed:         0,
            gamesPlayedHardMode: 0,
            gamesCompleted:      0,
            gamesShown:          0,
            tooManyExtraSteps:   0,
        }
        for (let extraSteps = 0; extraSteps <= Const.TOO_MANY_EXTRA_STEPS; extraSteps++) {
            initialStats[extraSteps] = 0;
        }

        // If we have a cookie for daily stats parse it; otherwise set it to initial values. 
        this.dailyStats = Cookie.getJsonOrElse("DailyStats", initialStats);

        // Create a backup daily game, in case we cannot get one.
        const solution = Solver.fastSolve(this.dict, "daily", "broken");
        this.backupDailyGame = new Game("BackupDailyGame", this.dict, solution, this.typeSavingMode);
        */

        // The mother of all divs.
        this.rootDiv = null;

        // Holds all the auxiliary screens (Help, Settings, Stats) and MUST be the
        // first child of rootDiv so that when shown the screens will be at the 
        // top of the viewport.
        this.auxiliaryDiv = null;

        // Divs that appear during game play; header/lower are children of root-div.
        this.headerDiv        = null;
        this.lowerDiv         = null; // Contains the following divs
        this.gameDiv          = null;
        this.pickerDiv        = null;

        // Objects that hold AuxiliaryDisplay derived class objects for the Help, Settings, Stats screens.
        this.helpDisplay = null;

        this.settingsDiv = null;
        this.statsDiv    = null;

        // Div for toast pop-ups; child of root-div.
        this.toastDiv    = null;

        // Now, create all the screens. This will create all the divs listed above.
        this.createScreens();

    }

    // Create the one and only object of this class if it hasn't yet been created.
    // Return the new or existing object.
    static singleton() {
        if (AppDisplay.singletonObject === null) {
            AppDisplay.singletonObject = new AppDisplay();
        }
        return AppDisplay.singletonObject;
    }

    /*
    ** ================================
    ** METHODS TO CONSTRUCT THE DISPLAY
    ** ================================
    */

    // This is the entry point for creating the screens and displaying the game.
    createScreens() {
        this.rootDiv = ElementUtilities.addElementTo("div", document.body, {id: "root-div"});

        this.auxiliaryDiv = ElementUtilities.addElementTo("div", this.rootDiv, {id: "auxiliary-div"});
        this.createHeaderDiv();
        this.createToastDiv();

        // The lower-div contains the divs for game setup and game play.
        // TODO: If we ultimately support a separate practice game we will need to 
        // have multple gameDiv, pickerDiv, pickerInnerDiv.
        this.lowerDiv = ElementUtilities.addElementTo("div", this.rootDiv, {id: "lower-div"});

        this.createGameDiv(this.lowerDiv);
        this.createPickerDiv(this.lowerDiv);

        this.createAuxiliaryScreens();

        // This will create the GameDisplay and its game and get it going.
        // Pass pickerInnerDiv because that's where we want GameDisplay to
        // add the picker.
        AppDisplay.currentGameDisplay = new GameDisplay(this.gameDiv, this.pickerInnerDiv, this.dict);
    }

    /* ----- Header ----- */

    createAuxiliaryScreens() {
        // This is the set of divs that need to be hidden when an auxiliary screen is
        // shown, and shown when an auxiliary screen is closed.
        this.primaryDivs = [
            this.headerDiv,
            this.gameDiv,
            this.pickerDiv,
        ];

        console.log("primaryDivs:", this.primaryDivs);

        // Now create objects for each of the auxiliary screens.
        // Probably don't need to save these, but we will anyway!
        this.helpDisplay     = new HelpDisplay(this.auxiliaryButtonDiv, Const.HELP_PATH, this.auxiliaryDiv, this.primaryDivs);
        //this.statsDisplay    = new StatsDisplay(this.auxiliaryButtonDiv, Const.STATS_PATH, this.auxiliaryDiv, this.primaryDivs);
        //this.settingsDisplay = new SettingsDisplay(this.auxiliaryButtonDiv, Const.STATS_PATH, this.auxiliaryDiv, this.primaryDivs);
    }

    createHeaderDiv() {
        // This div is the one we style as none or flex to hide/show the div.
        this.headerDiv = ElementUtilities.addElementTo("div", this.rootDiv, {id: "header-div"});
        this.headerDiv.style.display = "flex";

        // left-button-div is a placeholder for now. It allows styling that puts title-div
        // and right-button-div where we want them.
        const leftButtonDiv = ElementUtilities.addElementTo("div", this.headerDiv, {id: "left-button-div"});

        // TODO: Add a logo icon.
        const titleDiv = ElementUtilities.addElementTo("div", this.headerDiv, {id: "title-div"});

        ElementUtilities.addElementTo("label", titleDiv, {class: "title"}, "WordChain");

        // auxiliary-button-div holds the buttons for getting to the auxiliary screens.
        this.auxiliaryButtonDiv = ElementUtilities.addElementTo("div", this.headerDiv, {id: "auxiliary-button-div"});
    }

    /* ----- Game ----- */

    createGameDiv(lowerDiv) {
        // This div is the one we style as none or flex to hide/show the div.
        this.gameDiv = ElementUtilities.addElementTo("div", lowerDiv, {id: "game-div"}, null);
        this.gameDiv.style.display = "flex";
    }

    createPickerDiv(lowerDiv) {
        // We always want the picker to appear on a "line" by itself, not
        // next to the cell grid.
        //
        // A div with class "break" forces whatever comes after this div
        // to be on a "new line" when the containing div is display: flex.
        // See: https://tobiasahlin.com/blog/flexbox-break-to-new-row/
        ElementUtilities.addElementTo("div", lowerDiv, {class: "break"});

        // This div is the one we style as none or flex to hide/show the div.
        this.pickerDiv = ElementUtilities.addElementTo("div", lowerDiv, {id: "picker-div"}, null),

        // picker-div always ends up with extra space at the top. The only way I was able
        // to get rid of it is to create picker-inner-div, which has no extra space, and
        // then in the JavaScript code set the height of picker-div to match that of
        // picker-inner-div.
        this.pickerInnerDiv = ElementUtilities.addElementTo("div", this.pickerDiv, {id: "picker-inner-div"}, null);

        // Show the picker initially by default.
        this.pickerDiv.style.display = "flex";
    }

    /* ----- Settings ----- */

    // Add a setting to settings-div's content div.
    addSetting(title, settingClass, description="") {
        // Create a div for one setting.
        const settingDiv = ElementUtilities.addElementTo("div", this.settingsContentDiv, {class: settingClass});

        // Create a div for just the text to be displayed.
        const textDiv = ElementUtilities.addElementTo("div", settingDiv, {class: "setting-text"});
        ElementUtilities.addElementTo("div", textDiv, {class: "setting-title"}, title);
        ElementUtilities.addElementTo("div", textDiv, {class: "setting-description"}, description);

        // Create and return a div to hold the interactive part.
        return ElementUtilities.addElementTo("div", settingDiv, {});
    }

    // Add a setting whose input is a checkbox.
    addCheckboxSetting(title, id, value) {
        // setting-simple class styles the contents of the setting (title/description,
        // checkbox input) horizontally.
        const interactiveDiv = this.addSetting(title, "setting-simple");

        const checkbox = ElementUtilities.addElementTo("input", interactiveDiv,
            {type: "checkbox", id: id, class: "setting-checkbox"});
        checkbox.addEventListener("change", checkboxCallback);
        checkbox.checked = value;
    }

    // Add a setting whose "input" is clicking a link.
    addLinkSetting(title, linkText, linkHref, description) {
        // setting-simple class styles the contents of the setting (title/description, link)
        // horizontally.
        const interactiveDiv = this.addSetting(title, "setting-simple", description);
        ElementUtilities.addElementTo("a", interactiveDiv, {href: linkHref, target: "_blank"}, linkText);
    }

    // Add a setting whose input is a (mutually exclusive) set of radio buttons.
    addRadioSetting(title, radioInfoList, radioName, description, callbackFunction) {
        // setting-complex class styles the contents of the setting (title/description, radio inputs
        // and their labels) vertically, i.e. title/description on one line, then each input on
        // a subsequent line.
        const interactiveDiv = this.addSetting(title, "setting-complex", description);

        // To get nice formatting, especially on smaller devices where the description will wrap,
        // create a table.
        const table = ElementUtilities.addElementTo("table", interactiveDiv, {class: "radio-container"});

        // radioInfoList is a list of objects containing properties: id, description, and checked.
        for (let radioInfo of radioInfoList) {
            // One row for each option.
            const tableRow = ElementUtilities.addElementTo("tr", table, {});

            // Column 1: the radio input. Set its checked attribute according to the info,
            // and add an event listener to handle changes to it. We'll use the same listener
            // for all the radio inputs.
            const tdCol1 = ElementUtilities.addElementTo("td", tableRow, {});
            const radio = ElementUtilities.addElementTo("input", tdCol1,
                {value: radioInfo.value, name: radioName, class: "setting-radio", type: "radio"});
            radio.checked = radioInfo.checked;
            radio.addEventListener("change", callbackFunction);

            // Column 2: the description of the radio item.
            const tdCol2 = ElementUtilities.addElementTo("td", tableRow, {});
            ElementUtilities.addElementTo("label", tdCol2, {class: "radio-label"}, radioInfo.desc);
        }
    }

    createSettingsDiv() {

        let settingsContainerDiv;
        [this.settingsDiv, settingsContainerDiv] = this.createAuxiliaryDiv("settings-div");

        // Add a div for the content, which will be centered (because of the styling of aux-container-div).
        // within settingsContainerDiv as a block (because of settings-content-div styling).
        this.settingsContentDiv = ElementUtilities.addElementTo("div", settingsContainerDiv, {id: "settings-content-div",});
        ElementUtilities.addElementTo("h1", this.settingsContentDiv, {align: "center"}, "SETTINGS");

        // All the settings will be added to settings-content-div.
        this.addCheckboxSetting("Dark Theme",      "dark",       this.darkTheme);
        this.addCheckboxSetting("Colorblind Mode", "colorblind", this.colorblindMode);

        const radioInfo = [{
                value:   "Normal",
                desc:    "<b>Normal:</b> Letter-change steps are indicated with a thick outline",
                checked: !(this.hardMode || this.typeSavingMode),
            }, {
                value:   "Type-Saving",
                desc:    "<b>Type-Saving:</b> Saves typing by filling in known letters",
                checked: this.typeSavingMode,
            }, {
                value:   "Hard",
                desc:    "<b>Hard:</b> No automatically filled letters or thick outline",
                checked: this.hardMode,
            }
        ]
        const gamePlayModeDescription = "Which way do you want to play?"
        this.addRadioSetting("Game Play Mode", radioInfo, "game-play-mode", gamePlayModeDescription, radioCallback);

        const feedbackDescription = "Dictionary suggestions? Gripes? Things you love? Feature ideas?";
        const faqDescription = "Everything you want to know and then some!";
        this.addLinkSetting("Feedback",   "Email", Const.EMAIL_HREF, feedbackDescription);
        this.addLinkSetting("Questions?", "FAQ",   Const.FAQ_HREF, faqDescription);
    }

    /* ----- Stats ----- */

    createStatsDiv() {
        let statsContainerDiv;
        [this.statsDiv, statsContainerDiv] = this.createAuxiliaryDiv("stats-div");

        // Add a div for the content, which will be centered (because of the styling of aux-container-div).
        // within settingsContainerDiv as a block (because of stats-content-div styling).
        const contentDiv = ElementUtilities.addElementTo("div", statsContainerDiv, {id: "stats-content-div",});

        ElementUtilities.addElementTo("h1", contentDiv, {}, "DAILY GAME STATISTICS");
        this.statsContainer = ElementUtilities.addElementTo("div", contentDiv, {id: "stats-container-div"});

        ElementUtilities.addElementTo("hr", contentDiv, {});

        ElementUtilities.addElementTo("h1", contentDiv, {}, "EXTRA STEPS COUNTS");
        this.statsDistribution = ElementUtilities.addElementTo("div", contentDiv, {id: "distribution-div"});

        ElementUtilities.addElementTo("hr", contentDiv, {});

        ElementUtilities.addElementTo("h1", contentDiv, {}, "NEXT DAILY GAME IN");
        const countdown = ElementUtilities.addElementTo("div", contentDiv, {id: "countdown-div"});
        this.countdownClock = ElementUtilities.addElementTo("div", countdown, {id: "countdown-clock"});
    }

    /* ----- Toast Notifications ----- */

    createToastDiv() {
        this.toastDiv = ElementUtilities.addElementTo("div", this.rootDiv, {id: "toast-div", class: "pop-up hide"});
    }

    /*
    ** ========================================
    ** BUTTON, CHECKBOX, AND KEYBOARD CALLBACKS
    ** ========================================
    */

    // Callback for Settings checkbox changes.
    checkboxCallback(event) {
        // The id attribute in the event's srcElement property tells us which setting whas changed.
        const checkboxId = event.srcElement.getAttribute("id");

        // The checked attribute in the event's srcElement property tells us whether the
        // checkbox was checked or unchecked. Set the boolean corresponding to the
        // checkbox's id according to that.
        if (checkboxId === "dark") {
            this.darkTheme = event.srcElement.checked ? true : false;
            Cookie.save("DarkTheme", this.darkTheme);
            this.setColors();

        } else if (checkboxId === "colorblind") {
            this.colorblindMode = event.srcElement.checked ? true : false;
            Cookie.save("ColorblindMode", this.colorblindMode);
            this.setColors();

        }
    }

    // Callback for Settings radio button changes.
    radioCallback(event) {
        const selection = event.srcElement.value;
        if (selection == "Hard") {
            this.hardMode = true;
            this.typeSavingMode = false;
        } else if (selection === "Type-Saving") {
            this.typeSavingMode = true;
            this.hardMode = false;
        } else {
            this.typeSavingMode = false;
            this.hardMode = false;
        }

        // Save both cookies.
        Cookie.save("HardMode", this.hardMode);
        Cookie.save("TypeSavingMode", this.typeSavingMode);

        // Hard and Type-Saving modes are implemented in the game tile display,
        // so tell it what our modes are now.
        this.gameTileDisplay.setHardMode(this.hardMode);
        this.gameTileDisplay.setTypeSavingMode(this.typeSavingMode);
    }

    // Callback for the Share button on the Stats screen.
    shareCallback() {
        if (navigator.share) {
            navigator.share({
                text: this.shareString,
            })
            .catch((error) => {
                this.showToast("Failed to share")
                console.log("Failed to share: ", error);
            });
        } else {
            this.showToast("Copied to clipboard")
            navigator.clipboard.writeText(this.shareString);
        }
    }

    // Callback for the Show Solution button.
    showSolutionCallback() {
        // Note when the daily game has ended; only the daily game contributes
        // to stats, so we won't need to keep track of whether (future) practice or
        // back-up daily games have been ended.
        if (this.game.getName() === "DailyGame") {
            this.dailySolutionShown = true;
            Cookie.save("DailySolutionShown", this.dailySolutionShown);
            this.incrementStat("gamesShown");
        }

        // This call to endGame will play the (remaining) words of the
        // revealed solution, just like a real game; this sets thing up
        // for the call to updateGameDisplay().
        this.gameTileDisplay.endGame();
        this.updateGameDisplay();
    }

    /*
    ** ===============
    ** UTILITY METHODS
    ** ===============
    */

    // Return the given CSS property value.
    static getCssProperty(property) {
        return getComputedStyle(document.documentElement).getPropertyValue(`--${property}`);
    }

    // Increment the given stat, update the stats cookie, and update the stats display content.
    incrementStat(whichStat) {
        this.dailyStats[whichStat] += 1;
        Cookie.saveJson("DailyStats", this.dailyStats);
        this.updateStatsContent();
    }

    // Save a share graphic and (optionally) update statistics for thie specified game.
    // Note that the share graphic is not HTML, but rather just a string, containing
    // some Unicode characters to construct the graphic. The user will not be able
    // to share unless the game is complete, so here we'll use the known solution.
    saveGameInfo(game, updateStats) {
        // Get the game's solution, and number of words.
        // the known solution includes the start word, but not the target word;
        // the number of steps is the length of the list.
        const userSolution = game.getKnownSolution();
        const userSolutionSteps = userSolution.numSteps();
        const userWords = userSolution.getWords();

        // The words from the solution include the start and target words;
        userWords.shift();
        userWords.pop();

        // The count history is a list of how many steps were required to  solve the
        // game at the very beginning ("the best solution") and then for each step
        // thereafter. Pop off the first number in the history and save that as the
        // minimum solution length.
        const countHistory = game.getCountHistory();
        const minimumSolutionSteps = countHistory.shift();

        if (updateStats) {
            this.incrementStat("gamesCompleted");
        }

        let shareString = `WordChain #${this.dailyGameNumber} `;

        // Determine what emoji to use to show the user's "score".
        const extraSteps = userSolutionSteps - minimumSolutionSteps;
        if (extraSteps >= Const.TOO_MANY_EXTRA_STEPS) {
            // Too many extra steps.
            shareString += Const.CONFOUNDED;
            if (updateStats) {
                this.incrementStat("tooManyExtraSteps");
            }
        } else {
            // Show the emoji in NUMBERS corresponding to how many extra steps.
            // A bit of a misnomer, but the value for 0 is a star.
            shareString += Const.NUMBERS[extraSteps];
            if (updateStats) {
                this.incrementStat(extraSteps);
            }
        }

        // Add special indicator if user played in hard mode, and a couple of newlines.
        const hardModeIndicator = this.hardMode ? Const.FIRE : "";
        shareString += ` ${hardModeIndicator}\n\n`;

        // Now, construct the graphic showing the lengths of the user's
        // played words, colored red or green to indicate whether that word
        // did or did not increase the solution length.
        let previousCount = minimumSolutionSteps;
        for (let word of userWords) {
            // Shift off the next count, which corresponds to the word that the user played.
            let nextCount = countHistory.shift();

            // Determine which color square to display for this word.
            let emoji;
            if (nextCount <= previousCount) {
                // Word didn't increase the count; pick color indicating "good".
                emoji = this.colorblindMode ? Const.BLUE_SQUARE : Const.GREEN_SQUARE;
            } else {
                // Word increased the count; pick color indicating "bad".
                emoji = this.colorblindMode ? Const.ORANGE_SQUARE : Const.RED_SQUARE;
            }

            // Now repeat that emoji for the length of the word and add a newline,
            // creating a row that looks like the row of tiles in the game.
            shareString += emoji.repeat(word.length) + "\n";

            // Set up for the next iteration.
            previousCount = nextCount;
        }

        this.shareString = shareString;
    }

    // Set the given CSS property to the specified value.
    static setCssProperty(property, value) {
        document.documentElement.style.setProperty(`--${property}`, value);
    }

    // Set color properties according to the Dark Theme and Colorblind Mode settings.
    setColors() {
        // Change the document class name to switch the colors in general.
        if (this.darkTheme) {
            document.documentElement.className = "dark-mode";
        } else {
            document.documentElement.className = "light-mode";
        }

        // The properties with "dark" and "light" in the name are globallydefined in the
        // CSS file, and the "properties affected by Colorblind Mode" are set in that file
        // using those global properties.
        if (this.colorblindMode) {
            // Colorblind Mode is checked: set good/bad colorblind variables based on whether
            // Dark Mode is set, and set the properties affected by Colorblind Mode
            // based on those variables.
            let colorblindGood, colorblindBad;
            if (this.darkTheme) {
                colorblindGood = AppDisplay.getCssProperty("colorblind-good-dark");
                colorblindBad  = AppDisplay.getCssProperty("colorblind-bad-dark");
            } else {
                colorblindGood = AppDisplay.getCssProperty("colorblind-good-light");
                colorblindBad  = AppDisplay.getCssProperty("colorblind-bad-light");
            }
            AppDisplay.setCssProperty("played-word-same-bg",   colorblindGood);
            AppDisplay.setCssProperty("played-word-longer-bg", colorblindBad);
            AppDisplay.setCssProperty("invalid-word-letter-fg", colorblindBad);

        } else {
            // Colorblind Mode is not checked: restore the affected properties based on whether
            // Dark Mode is set.
            if (this.darkTheme) {
                AppDisplay.setCssProperty("played-word-same-bg",    AppDisplay.getCssProperty("played-word-same-bg-dark"));
                AppDisplay.setCssProperty("played-word-longer-bg",  AppDisplay.getCssProperty("played-word-longer-bg-dark"));
                AppDisplay.setCssProperty("invalid-word-letter-fg", AppDisplay.getCssProperty("invalid-word-letter-fg-dark"));
            } else {
                AppDisplay.setCssProperty("played-word-same-bg",    AppDisplay.getCssProperty("played-word-same-bg-light"));
                AppDisplay.setCssProperty("played-word-longer-bg",  AppDisplay.getCssProperty("played-word-longer-bg-light"));
                AppDisplay.setCssProperty("invalid-word-letter-fg", AppDisplay.getCssProperty("invalid-word-letter-fg-light"));
            }
        }
    }

    // Show a "toast" pop-up (typically an error message).
    showToast(message) {
        this.toastDiv.innerHTML = message
        ElementUtilities.editClass(/hide/, "show", this.toastDiv);
        setTimeout(() => {
            ElementUtilities.editClass(/show/, "hide", this.toastDiv);
        }, 3000);
    }

    // This is called when the user opens the Stats screen to display a
    // countdown clock until the next daily game is available.
    startCountdownClock() {
        function msToDuration(ms) {
            return new Date(ms).toISOString().substr(11, 8);
        }

        // Set the initial clock display.
        let msUntilNextGame = DailyGameGenerator.getMsUntilNextGame();
        this.countdownClock.textContent = msToDuration(msUntilNextGame);

        // Set a timer to change the clock and display every second.
        this.clockIntervalTimer = setInterval(() => {
            msUntilNextGame -= 1000;
            this.countdownClock.textContent = msToDuration(msUntilNextGame);
        }, 1000);
    }

    // This is called when the user Xes out of Stats screen.
    stopCountdownClock() {
        clearInterval(this.clockIntervalTimer);
    }

    // Update the statistics and distribution graph.
    updateStatsContent() {
        // Clear out the containers that we're about to add to.
        ElementUtilities.deleteChildren(this.statsContainer);
        ElementUtilities.deleteChildren(this.statsDistribution);

        let oneStat;

        // Local function to add a stat.
        function addStat(value, label, parentDiv) {
            oneStat = ElementUtilities.addElementTo("div", parentDiv, {class: "one-stat"});
            ElementUtilities.addElementTo("div", oneStat, {class: "one-stat-value"}, value);
            ElementUtilities.addElementTo("div", oneStat, {class: "one-stat-label"}, label);
        }

        // Calculate percentage stats.
        const completionPercent = ((this.dailyStats.gamesCompleted / this.dailyStats.gamesPlayed) * 100).toFixed(1);
        const hardModePercent   = ((this.dailyStats.gamesPlayedHardMode / this.dailyStats.gamesPlayed) * 100).toFixed(1);

        // Add the stats.
        addStat(this.dailyStats.gamesPlayed, "Played", this.statsContainer);
        addStat(completionPercent, "Completion %", this.statsContainer);
        addStat(hardModePercent, "Hard Mode %", this.statsContainer);
        addStat(this.dailyStats.gamesShown, "Shown", this.statsContainer);

        // Determine the maximum value among all the "extra step values".
        let maxValue = 0;
        for (let extraSteps = 0; extraSteps < Const.TOO_MANY_EXTRA_STEPS; extraSteps++) {
            if (this.dailyStats[extraSteps] > maxValue) {
                maxValue = this.dailyStats[extraSteps];
            }
        }
        if (this.dailyStats.tooManyExtraSteps > maxValue) {
            maxValue = this.dailyStats.tooManyExtraSteps;
        }

        // Local function to add a bar.
        function addBar(barValue, barLabel, parentDiv) {

            // Calculate the width of the bar as a percentage of the maximum value determined above.
            // If width calculates to 0, set it to 5 so there's a bar to contain the value.
            let width = Math.round((barValue / maxValue) * 100);
            if (width === 0) {
                width = 10;
            }

            // Add a div for this bar.
            const oneBar = ElementUtilities.addElementTo("div", parentDiv, {class: "one-bar"});

            // Add a div for the "label" -- the emoji for the this bar -- and the bar itself.
            ElementUtilities.addElementTo("div", oneBar, {class: "one-bar-label"}, barLabel);
            const bar = ElementUtilities.addElementTo("div", oneBar, {class: "one-bar-bar", style: `width: ${width}%;`});

            // Add a div to the bar for its value.
            ElementUtilities.addElementTo("div", bar, {class: "one-bar-value"}, barValue);
        }

        // Add a bar for each of the "regular" values; the emojis for these are in AppDisplay.NUMBERS.
        for (let extraSteps = 0; extraSteps < Const.TOO_MANY_EXTRA_STEPS; extraSteps++) {
            const barValue = this.dailyStats[extraSteps];
            addBar(barValue, AppDisplay.NUMBERS[extraSteps], this.statsDistribution);
        }

        // Add a bar for too many extra steps.
        addBar(this.dailyStats.tooManyExtraSteps, Const.CONFOUNDED, this.statsDistribution);
    }
}

export { AppDisplay };

// Create the singleton, and it all happens from there.
AppDisplay.singleton();
