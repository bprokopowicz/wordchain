import { AuxiliaryDisplay } from './AuxiliaryDisplay.js';
import { ElementUtilities } from './ElementUtilities.js';
import { COV } from './Coverage.js';
import * as Const from './Const.js';

/*
** The updateStatsContent() method in this class reads a DailyStats cookie,
** an object with the following properties:
**
** gamesStarted
**    Integer: number of games started.
** gamesWon
**    Integer: number of games solved by the user.
** gamesLost
**    Integer: number of games that ended because of too many wrong moves.
** streak
**    Integer: number of consecutive daily games won.
** 0 .. <Const.TOO_MANY_EXTRA_STEPS>
**    Integer: Number of games that had 0, 1, ... wrong moves.
*/

class StatsDisplay extends AuxiliaryDisplay {

    /* ----- Construction ----- */

    constructor(buttonContainer, buttonInfo, parentContainer, saveRestoreContainers, appDisplay) {
        const CL = "StatsDisplay.constructor";
        COV(0, CL);
        super(buttonContainer, buttonInfo, parentContainer, saveRestoreContainers);

        // Save AppDisplay object so callbacks can call its methods as needed.
        this.appDisplay = appDisplay;

        ElementUtilities.addClass(this.contentContainer, 'stats-content-container');


        // Add a div for the content, which will be centered (because of the styling of aux-container-div).
        // within settingsContainerDiv as a block (because of stats-content-div styling).
        const contentDiv = ElementUtilities.addElementTo("div", this.contentContainer, {class: "stats-content-div",});

        // ----- Stats Content -----

        ElementUtilities.addElementTo("h1", contentDiv, {align: "center"}, "DAILY GAME STATISTICS");
        ElementUtilities.addElementTo("hr", contentDiv);

        this.statsContainer = ElementUtilities.addElementTo("div", contentDiv, {class: "stats-container-div"});

        ElementUtilities.addElementTo("hr", contentDiv);

        ElementUtilities.addElementTo("h1", contentDiv, {align: "center"}, "WRONG MOVES COUNTS");
        this.statsDistribution = ElementUtilities.addElementTo("div", contentDiv, {class: "distribution-div"});

        ElementUtilities.addElementTo("hr", contentDiv);

        // ----- Share Button -----

        const buttonDiv = ElementUtilities.addElementTo("div", contentDiv, {class: "stats-button-div"});

        this.shareButton = ElementUtilities.addElementTo(
            "button", buttonDiv,
            {class: "app-button non-header-button"},
            "Share");

        // use 'this' as the callback object to the callback function for the shareButton element so that we can access ourself
        ElementUtilities.setButtonCallback(this.shareButton, this, this.shareCallback);

        ElementUtilities.addElementTo("hr", contentDiv);

        // ----- Countdown Clock-----

        ElementUtilities.addElementTo("h1", contentDiv, {align: "center"}, "DAILY GAME CHANGES IN");
        const countdown = ElementUtilities.addElementTo("div", contentDiv, {class: "countdown-div"});
        this.countdownClock = ElementUtilities.addElementTo("div", countdown, {class: "countdown-clock"});

        ElementUtilities.addElementTo("hr", contentDiv);
    }

    /*
    ** ----- Callbacks -----
    */

    // This is called when the user Xes out of Stats screen, via the base class
    // closeAuxiliaryCallback().
    additionalCloseActions() {
        const CL = "StatsDisplay.additionalCloseActions";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("StatsDisplay.additionalCloseActions(): clearing timer id: ", this.clockIntervalTimer, "stats");
        this.stopCountdownClock();
    }

    // This is called when the user opens the Stats screen, via the base class
    // openAuxiliaryCallback().
    additionalOpenActions() {
        const CL = "StatsDisplay.additionalOpenActions";
        COV(0, CL);
        this.updateStatsContent();
        this.startCountdownClock();
        this.updateShareButton();
    }

    // Callback for the Share button.
    shareCallback(event) {
        const CL = "StatsDisplay.shareCallback";
        COV(0, CL);
        return this.appDisplay.getShare(); // return value used in testing only
    }

    /* ----- Utilities ----- */

    refresh() {
        const CL = "StatsDisplay.refresh";
        COV(0, CL);
        this.updateStatsContent();
    }

    // This is called when the user opens the Stats screen; it displays a
    // countdown clock until the next daily game is available.
    startCountdownClock() {
        const CL = "StatsDisplay.startCountdownClock";
        COV(0, CL);

        // A timer call-back counter. This is used to determine which callback instance is happening, so that
        // we can do different things on different callbacks.
        this.countdownCallCounter = 0;

        function msToDuration(ms) {
            return new Date(ms).toISOString().substr(11, 8);
        }

        // Set a 1000 ms timer to change the clock and display every second.
        this.clockIntervalTimer = setInterval(() => {
            let msUntilNextGame = this.appDisplay.getMsUntilNextGame();
            this.countdownClock.textContent = msToDuration(msUntilNextGame);
        }, 1000);
        Const.GL_DEBUG && this.logDebug("StatsDisplay.startCountdownClock() timer id: ", this.clockIntervalTimer, "stats");
    }

    stopCountdownClock() {
        const CL = "StatsDisplay.stopCountdownClock";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("StatsDisplay.stopCountdownClock() timer id: ", this.clockIntervalTimer, "stats");
        clearInterval(this.clockIntervalTimer);
    }

    // Enable or disable the share callback based on whether the daily game is over. If the
    // daily game isn't over (or it's the broken game), the player is not allowed to share.
    updateShareButton() {
        const CL = "StatsDisplay.updateShareButton";
        COV(0, CL);
        if (! this.appDisplay.isDailyGameOver() || this.appDisplay.isDailyGameBroken()) {
            COV(1, CL);
            ElementUtilities.disableButton(this.shareButton);
        } else {
            COV(2, CL);
            ElementUtilities.enableButton(this.shareButton);
        }
        COV(3, CL);
    }

    // Update the statistics and distribution graph.
    updateStatsContent() {
        const CL = "StatsDisplay.updateStatsContent";
        COV(0, CL);
        // Get the daily stats from the cookies. We should always have stats because we
        // create them on constructing the daily game, so log if we don't.
        const gameState = this.appDisplay.getDailyGameState();

        if (gameState === null)
        {
            console.error("StatsDisplay.updateStatsContent(): no daily stats!");
            this.appDisplay.showToast(Const.NO_STATS);
            return;
        }

        // Clear out the containers that we're about to add to.
        ElementUtilities.deleteChildren(this.statsContainer);
        ElementUtilities.deleteChildren(this.statsDistribution);

        let oneStat;

        // Local function to add a stat.
        function addStat(value, label, parentDiv) {
            COV(1, CL);
            oneStat = ElementUtilities.addElementTo("div", parentDiv, {class: "one-stat"});
            ElementUtilities.addElementTo("div", oneStat, {class: "one-stat-value"}, value);
            ElementUtilities.addElementTo("div", oneStat, {class: "one-stat-label"}, label);
        }

        // We used to show games won and lost as separate values. We kept those
        // in the stats, but to avoid negativity, we now show games completed,
        // which is the sum of the two stats.
        const gamesCompleted = gameState.getStat('gamesWon') + gameState.getStat('gamesLost');
        addStat(gameState.getStat('gamesStarted'), "Started", this.statsContainer);
        addStat(gamesCompleted, "Completed", this.statsContainer);
        addStat(gameState.getStat('streak'), "Streak", this.statsContainer);

        // Next we'll display a bar graph showing how many games there were at each "wrong moves value",
        // i.e. 0 .. <Const.TOO_MANY_EXTRA_STEPS> *and* "games that ended because of too many
        // wrong moves". First, determine the maximum value among all the "wrong moves values"
        // to use to in calculating the length of the bars.
        let maxWrongWordsValue = 0;
        let extraStepsHistogram = gameState.penaltyHistogram;
        for (let numExtraSteps = 0; numExtraSteps <= Const.TOO_MANY_EXTRA_STEPS; numExtraSteps++) {
            if (extraStepsHistogram[numExtraSteps] > maxWrongWordsValue) {
                COV(2, CL);
                maxWrongWordsValue = extraStepsHistogram[numExtraSteps];
            }
        }

        // Local function to add a bar.
        function addBar(barValue, barLabel, parentDiv) {
            COV(3, CL);

            // Calculate the width of the bar as a percentage of the maximum value determined above.
            // Set width to a minimum of 10% so there's a bar to contain the value.
            let width = (maxWrongWordsValue === 0) ? 0 : Math.round((barValue / maxWrongWordsValue) * 100);
            width = Math.max(width, 10);

            // Add a div for this bar.
            const oneBar = ElementUtilities.addElementTo("div", parentDiv, {class: "one-bar"});

            // Add a div for the "label" -- the emoji for the this bar -- and the bar itself.
            ElementUtilities.addElementTo("div", oneBar, {class: "one-bar-label"}, barLabel);
            const bar = ElementUtilities.addElementTo("div", oneBar, {class: "one-bar-bar", style: `width: ${width}%;`});

            // Add a div to the bar for its value.
            ElementUtilities.addElementTo("div", bar, {class: "one-bar-value"}, barValue);
        }

        // Add a bar for each of the possible values; the emojis for these are in Const.NUMBERS.
        for (let numExtraSteps = 0; numExtraSteps <= Const.TOO_MANY_EXTRA_STEPS; numExtraSteps++) {
            const barValue = extraStepsHistogram[numExtraSteps];
            addBar(barValue, Const.NUMBERS[numExtraSteps], this.statsDistribution);
        }
        COV(4, CL);
    }
}

export { StatsDisplay };
