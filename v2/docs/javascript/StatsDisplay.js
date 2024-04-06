import { AuxiliaryDisplay } from './AuxiliaryDisplay.js';
import { ElementUtilities } from './ElementUtilities.js';
import { Cookie } from './Cookie.js';
import * as Const from './Const.js';

class StatsDisplay extends AuxiliaryDisplay {

    constructor(buttonContainer, buttonSvgPath, parentContainer, saveRestoreContainers, appDisplay) {
        super(buttonContainer, buttonSvgPath, parentContainer, saveRestoreContainers);

        // AppDisplay object so callbacks can call its methods to respond
        // to settings changes.
        this.appDisplay = appDisplay;

        ElementUtilities.addClass(this.contentContainer, 'stats-content-div');

        ElementUtilities.addElementTo("h1", this.contentContainer, {align: "center"}, "SETTINGS");

    }

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

    /*
    ** ----- Callbacks -----
    */

    // Callback for Settings checkbox changes.
    checkboxCallback(event) {
        // When the checkbox was created we saved the AppDisplay object passed
        // to the constructor; use it to access AppDisplay methods to change the
        // corresponding settings.
        const callbackAccessor = event.srcElement.callbackAccessor;

        // The id attribute in the event's srcElement property tells us which setting whas changed.
        const checkboxId = event.srcElement.getAttribute("id");
                
        // The checked attribute in the event's srcElement property tells us whether the
        // checkbox was checked or unchecked. Set the boolean corresponding to the
        // checkbox's id according to that.
        if (checkboxId === "dark") {
            callbackAccessor.darkTheme = event.srcElement.checked ? true : false;
            Cookie.save("DarkTheme", callbackAccessor.darkTheme);
            callbackAccessor.setColors();
        
        } else if (checkboxId === "colorblind") {
            callbackAccessor.colorblindMode = event.srcElement.checked ? true : false;
            Cookie.save("ColorblindMode", callbackAccessor.colorblindMode);
            callbackAccessor.setColors();
        }
    }

    /*
    // Callback for Settings radio button changes.
    radioCallback(event) {
        // When the radio was created we saved the AppDisplay object passed
        // to the constructor; use it to access AppDisplay methods to change the
        // corresponding settings.
        const callbackAccessor = event.srcElement.callbackAccessor;

        const selection = event.srcElement.value;
        if (selection == "Hard") {
            callbackAccessor.hardMode = true;
            callbackAccessor.typeSavingMode = false;
        } else if (selection === "Type-Saving") {
            callbackAccessor.typeSavingMode = true;
            callbackAccessor.hardMode = false;
        } else {
            callbackAccessor.typeSavingMode = false;
            callbackAccessor.hardMode = false;
        }

        // Save both cookies.
        Cookie.save("HardMode", callbackAccessor.hardMode);
        Cookie.save("TypeSavingMode", callbackAccessor.typeSavingMode);

        // Hard and Type-Saving modes are implemented in the game tile display,
        // so tell it what our modes are now.
        // ========= Will need to figure out what the v2 equivalent of this is.
        callbackAccessor.gameTileDisplay.setHardMode(callbackAccessor.hardMode);
        callbackAccessor.gameTileDisplay.setTypeSavingMode(callbackAccessor.typeSavingMode);
    }
    */

}

export { StatsDisplay };
