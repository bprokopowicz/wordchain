import { AuxiliaryDisplay } from './AuxiliaryDisplay.js'; import { ElementUtilities } from './ElementUtilities.js'; import { DailyGameDisplay } from './DailyGameDisplay.js';
import { Cookie } from './Cookie.js';
import * as Const from './Const.js';

class StatsDisplay extends AuxiliaryDisplay {

    /* ----- Construction ----- */

    constructor(buttonContainer, buttonSvgPath, parentContainer, saveRestoreContainers, appDisplay) {
        super(buttonContainer, buttonSvgPath, parentContainer, saveRestoreContainers);

        // Save AppDisplay object so callbacks can call its methods as needed.
        this.appDisplay = appDisplay;

        ElementUtilities.addClass(this.contentContainer, 'stats-content-container');


        // Add a div for the content, which will be centered (because of the styling of aux-container-div).
        // within settingsContainerDiv as a block (because of stats-content-div styling).
        const contentDiv = ElementUtilities.addElementTo("div", this.contentContainer, {class: "stats-content-div",});

        // ----- Stats Content -----

        ElementUtilities.addElementTo("h1", contentDiv, {align: "center"}, "DAILY GAME STATISTICS");
        this.statsContainer = ElementUtilities.addElementTo("div", contentDiv, {class: "stats-container-div"});

        ElementUtilities.addElementTo("hr", contentDiv);

        ElementUtilities.addElementTo("h1", contentDiv, {align: "center"}, "EXTRA STEPS COUNTS");
        this.statsDistribution = ElementUtilities.addElementTo("div", contentDiv, {class: "distribution-div"});

        ElementUtilities.addElementTo("hr", contentDiv);

        // ----- Countdown Clock-----

        ElementUtilities.addElementTo("h1", contentDiv, {align: "center"}, "NEXT DAILY GAME IN");
        const countdown = ElementUtilities.addElementTo("div", contentDiv, {class: "countdown-div"});
        this.countdownClock = ElementUtilities.addElementTo("div", countdown, {class: "countdown-clock"});

        ElementUtilities.addElementTo("hr", contentDiv);

        // ----- Share Button -----

        const buttonDiv = ElementUtilities.addElementTo("div", contentDiv, {class: "stats-button-div"});

        this.shareButton = ElementUtilities.addElementTo(
            "button", buttonDiv,
            {class: "wordchain-button game-button"},
            "Share");

        // Save 'this' in the shareButton element so that we can access
        // it (via event.srcElement.callbackAccessor) in the callback.
        this.shareButton.callbackAccessor = this;
        ElementUtilities.setButtonCallback(this.shareButton, this.shareCallback);
    }   

    /*
    ** ----- Callbacks -----
    */

    // This is called when the user Xes out of Stats screen, via the base class
    // closeAuxiliaryCallback().
    additionalCloseActions() {
        clearInterval(this.clockIntervalTimer);
    }

    // This is called when the user opensStats screen, via the base class
    // openAuxiliaryCallback().
    additionalOpenActions() {
        this.updateStatsContent();
        this.startCountdownClock();
    }

    // Callback for the Share button.
    shareCallback(event) {
        // When the button was created we saved 'this' as callbackAccessor in the button
        // element; use it to access other instance data.
        const callbackAccessor = event.srcElement.callbackAccessor,
              shareString = callbackAccessor.getShareString();

        if (shareString)
        {
            // Are we in an environment that has a "share" button, like a smart phone?
            if (navigator.share) {
                // Yes -- use the button to share the shareString.
                navigator.share({
                    text: shareString,
                })  
                .catch((error) => {
                    callbackAccessor.appDisplay.showToast("Failed to share")
                    console.error("Failed to share: ", error);
                }); 
            } else {
                // No -- just save the shareString to the clipboard (probably on a laptop/desktop).
                navigator.clipboard.writeText(shareString);
                callbackAccessor.appDisplay.showToast("Copied to clipboard")
            }   
        }
    }   

    /* ----- Utilities ----- */

    // Return a share graphic if the game is over, and null if not.
    // Note that the share graphic is not HTML, but rather just a string, containing
    // some Unicode characters to construct the graphic.
    getShareString(game) {
        // This returns an object with 4 properties, the last 3 of which are populated only if
        // over is true): 
        //
        //  over:            true if the game is over (user has found target word or too many steps)
        //  extraSteps:      how many more steps it took to solve than the minimum
        //  gameSummary:     array of wordInfo, where wordInfo has two properties: wordLength, wasCorrect
        //  dailyGameNumber: the current game number
        const gameInfo = this.appDisplay.getDailyGameInfo();

        if (! gameInfo.over) {
            this.appDisplay.showToast("Daily game still in progress");
            return null;
        }

        let shareString = `WordChain #${gameInfo.dailyGameNumber} `;

        // Determine what emoji to use to show the user's "score".
        if (gameInfo.extraSteps >= Const.TOO_MANY_EXTRA_STEPS) {
            // Too many extra steps.
            shareString += Const.CONFOUNDED;
        } else {
            // Show the emoji in NUMBERS corresponding to how many extra steps.
            // A bit of a misnomer, but the value for 0 is a star.
            shareString += Const.NUMBERS[gameInfo.extraSteps];
        }
        shareString += "\n\n";

        // Now, construct the graphic showing the lengths of the user's
        // played words, colored red or green to indicate whether that word
        // did or did not increase the solution length.
        for (let wordInfo of gameInfo.gameSummary) {

            let colorblindMode = this.appDisplay.isColorblindMode(),
                emoji;

            // Determine which color square to display for this word.
            if (wordInfo.wasCorrect) {
                // Word didn't increase the count; pick color indicating "good".
                emoji = colorblindMode ? Const.BLUE_SQUARE : Const.GREEN_SQUARE;
            } else {
                // Word increased the count; pick color indicating "bad".
                emoji = colorblindMode ? Const.ORANGE_SQUARE : Const.RED_SQUARE;
            }

            // Now repeat that emoji for the length of the word and add a newline,
            // creating a row that looks like the row of tiles in the game.
            shareString += emoji.repeat(wordInfo.wordLength) + "\n";
        }

        return shareString;
    }

    // This is called when the user opens the Stats screen; it displays a
    // countdown clock until the next daily game is available.
    startCountdownClock() {
        function msToDuration(ms) {
            return new Date(ms).toISOString().substr(11, 8);
        }

        // Set the initial clock display.
        let msUntilNextGame = DailyGameDisplay.getMsUntilNextGame();
        this.countdownClock.textContent = msToDuration(msUntilNextGame);

        // Set a timer to change the clock and display every second.
        this.clockIntervalTimer = setInterval(() => {
            msUntilNextGame -= 1000;
            this.countdownClock.textContent = msToDuration(msUntilNextGame);
        }, 1000);
    }

    // Update the statistics and distribution graph.
    updateStatsContent() {
        // Get the daily stats from the cookies. We should always have stats because we
        // create them on constructing the daily game, so log if we don't.
        let dailyStats = Cookie.getJsonOrElse("DailyStats", null);

        if (dailyStats === null)
        {
            console.error("StatsDisplay.updateStatsContent(): no daily stats!");
            this.appDisplay.showToast("Stats unavailable");
        }

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

        let completionPercent;
        if (dailyStats.gamesPlayed === 0) {
            completionPercent = 0;
        } else {
            completionPercent = ((dailyStats.gamesCompleted / dailyStats.gamesPlayed) * 100).toFixed(1);
        }

        addStat(dailyStats.gamesPlayed, "Played", this.statsContainer);
        addStat(completionPercent, "Completion %", this.statsContainer);
        addStat(dailyStats.gamesShown, "Shown", this.statsContainer);

        // Determine the maximum value among all the "extra step values".
        let maxValue = 0;
        for (let extraSteps = 0; extraSteps < Const.TOO_MANY_EXTRA_STEPS; extraSteps++) {
            if (dailyStats[extraSteps] > maxValue) {
                maxValue = dailyStats[extraSteps];
            }
        }

        // Did the game just finish surpass the previous max?
        if (dailyStats.tooManyExtraSteps > maxValue) {
            maxValue = dailyStats.tooManyExtraSteps;
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

        // Add a bar for each of the "regular" values; the emojis for these are in Const.NUMBERS.
        for (let extraSteps = 0; extraSteps < Const.TOO_MANY_EXTRA_STEPS; extraSteps++) {
            const barValue = dailyStats[extraSteps];
            addBar(barValue, Const.NUMBERS[extraSteps], this.statsDistribution);
        }

        // Add a bar for too many extra steps.
        addBar(dailyStats.tooManyExtraSteps, Const.CONFOUNDED, this.statsDistribution);
    }
}

export { StatsDisplay };
