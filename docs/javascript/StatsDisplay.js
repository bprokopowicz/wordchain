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
** 0 .. <Const.TOO_MANY_PENALTIES>
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
        Const.GL_DEBUG && this.logDebug("StatsDisplay.additionalCloseActions(): clearing timer id: ", this.clockIntervalTimer, "daily");
        this.stopCountdownClock();
    }

    // This is called when the user opensStats screen, via the base class
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
        const shareString = this.getShareString();
        if (shareString) {
            COV(1, CL);
            // We are currently copying to clipboard rather than the commented
            // out "direct share first" code below because Facebook annoyingly
            // won't properly share text along with a URL. When a URL is included
            // in the text OR when it is included with a separate 'url' property
            // in the object passed to navigator.share(), Facebook ONLY shows
            // a clickable URL (sans our icon!) -- no share graphic!
            // This approach requires users to paste their share to the app of
            // their choice -- and both the graphic and a clickable URL will appear.
            let copiedToClipboard = false;
            if (typeof navigator.clipboard === "object") {
                COV(2, CL);
                navigator.clipboard.writeText(`${shareString}`);
                copiedToClipboard = true;
                this.appDisplay.showToast(Const.SHARE_TO_PASTE);
            } else {
                // TODO this is not in the tests currently.  IF we add it, we need to update the COV points from here out in this function.
                // COV(3, CL);
                this.appDisplay.showToast(Const.SHARE_INSECURE);
            }

            /*
            *************************************************************************************************
            * NOTE: If we uncomment this code to do a direct share, we will need to use
            * Const.SHARE_URL_FOR_FB in the share string. We may want to write the share
            * graphic with the real URL to the clipboard clipboard after this if-else if-else.

            * Const.GL_DEBUG && this.logDebug("shareCallback() navigator: ", navigator, "daily");
            * // Are we in a *secure* environment that has a "share" button, like a smart phone?
            * let shareData = { text: shareString, };
            * if ((typeof navigator.canShare === "function") && navigator.canShare(shareData)) {
            *   // Yes -- use the button to share the shareString.
            *   navigator.share(shareData)
            *   .catch((error) => {
            *       if (error.toString().indexOf("cancellation") < 0) {
            *           console.error("Failed to share: ", error);
            *           this.appDisplay.showToast(Const.SHARE_FAILED);
            *       }
            *   });
            * // Are we in a *secure* environment that has access to clipboard (probably on a laptop/desktop)?
            *} else if (typeof navigator.clipboard === "object") {
            *   navigator.clipboard.writeText(shareString);
            *   this.appDisplay.showToast(Const.SHARE_COPIED);
            * // Insecure.
            *} else {
            *   this.appDisplay.showToast(Const.SHARE_INSECURE);
            *}
            *************************************************************************************************
            */
        }
        COV(3, CL);
        return shareString; // used in testing only
    }

    /* ----- Utilities ----- */

    // Return a share graphic if the game is over, and null if not.
    // Note that the share graphic is not HTML, but rather just a string, containing
    // some Unicode characters to construct the graphic.
    getShareString() {
        const CL = "StatsDisplay.getShareString";
        COV(0, CL);
        const gameState = this.appDisplay.getDailyGameState();
        Const.GL_DEBUG && this.logDebug("getShareString() gameState=", gameState, "daily");

        if (! gameState.isOver()) {
            console.error("getShareString() called when game is not over!");
            return null;
        }

        let shareString = `WordChain #${gameState.getDailyGameNumber() + 1} `,
            gameWon;

        // Determine what emoji to use to show the user's "score".
        if (gameState.numPenalties() >= Const.TOO_MANY_PENALTIES) {
            COV(1, CL);
            // Too many wrong moves.
            shareString += Const.CONFOUNDED;
            gameWon = false;
        } else {
            COV(2, CL);
            // Show the emoji in NUMBERS corresponding to how many wrong moves.
            // A bit of a misnomer, but the value for 0 is a star.
            shareString += Const.NUMBERS[gameState.numPenalties()];
            gameWon = true;
        }

        COV(3, CL);

        // Add a line for the streak.
        shareString += `\nStreak: ${gameState.getStat('streak')}\n`;

        // Now, construct the graphic showing the lengths of the user's
        // played words, colored red or green to indicate whether that word
        // did or did not increase the solution length.
        // The target word (last) is shown in a separate, fixed color regardless
        // of success or failure so we slice it off here.

        let moveSummary = this.appDisplay.getDailyMoveSummary();
        let wordsBetweenStartAndTarget = moveSummary.slice(1,-1);
        let [startRatingUnused, startLength] = moveSummary[0];
        let [targetRatingUnused, targetLength] = moveSummary.slice(-1)[0];

        // start with the start word shown in purple
        let emoji = Const.PURPLE_SQUARE;
        shareString += emoji.repeat(startLength) + "\n";

        // Show all the words played.
        let colorblindMode = this.appDisplay.isColorblindMode();
        for (let [moveRating, wordLength] of wordsBetweenStartAndTarget) {

            // We don't include unplayed words in the share string. This happens when there are too many wrong moves.
            // The moveSummary includes the correct unplayed words leading from the last wrong word to the
            //  target, but we don't want to show them.
            // TODO - this use-case is obsolete.  When there are too many wrong moves, the future words get summarized
            // as SHOWN_MOVE, not FUTURE. 

            if ((moveRating == Const.FUTURE) || (moveRating == Const.CHANGE_NEXT)) {
                break;
            }

            // Determine which color square to display for this word.
            if (moveRating === Const.OK || moveRating === Const.SCRABBLE_WORD) {
                // Word didn't increase the count; pick color indicating "good".
                COV(4, CL);
                emoji = colorblindMode ? Const.BLUE_SQUARE : Const.GREEN_SQUARE;
            } else if (moveRating === Const.WRONG_MOVE) {
                // Word increased the count; pick color indicating "bad".
                COV(5, CL);
                emoji = colorblindMode ? Const.ORANGE_SQUARE : Const.RED_SQUARE;
            } else if (moveRating === Const.GENIUS_MOVE) {
                COV(6, CL);
                emoji = colorblindMode ? Const.GOLD_SQUARE : Const.GOLD_SQUARE;
            } else if (moveRating === Const.DODO_MOVE) {
                // These used to be brown squares, but they were off-putting.
                COV(7, CL);
                emoji = colorblindMode ? Const.ORANGE_SQUARE : Const.RED_SQUARE;
            } else if (moveRating === Const.SHOWN_MOVE) {
                COV(8, CL);
                emoji = colorblindMode ? Const.GRAY_SQUARE : Const.GRAY_SQUARE;
            }

            // Now repeat that emoji for the length of the word and add a newline,
            // creating a row that looks like the row of tiles in the game.
            COV(9, CL);
            shareString += emoji.repeat(wordLength) + "\n";
        }

        // Now, add the target
        if (gameWon) {
            COV(10, CL);
            emoji = colorblindMode ? Const.BLUE_SQUARE : Const.GREEN_SQUARE;
        } else {
            COV(11, CL);
            emoji = colorblindMode ? Const.ORANGE_SQUARE : Const.RED_SQUARE;
        }

        COV(12, CL);
        shareString += emoji.repeat(targetLength) + "\n";

        // Add the URL to the game and send the trimmed result.
        // Note that in shareCallback() we are ONLY copying to the
        // clipboard; if we ever go back to doing a "direct share"
        // we will want to append Const.SHARE_URL_FOR_FB, a "faux" URL.
        shareString += Const.SHARE_URL;
        return shareString.trim();
    }

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

        function msToDuration(ms) {
            return new Date(ms).toISOString().substr(11, 8);
        }

        // Set the initial clock display.
        let msUntilNextGame = this.appDisplay.getMsUntilNextGame();
        this.countdownClock.textContent = msToDuration(msUntilNextGame);

        // Set a timer to change the clock and display every second.
        this.clockIntervalTimer = setInterval(() => {
            msUntilNextGame = this.appDisplay.getMsUntilNextGame();
            this.countdownClock.textContent = msToDuration(msUntilNextGame);
        }, 1000);
        Const.GL_DEBUG && this.logDebug("StatsDisplay.startCountdownClock() timer id: ", this.clockIntervalTimer, "daily");
    }

    stopCountdownClock() {
        const CL = "StatsDisplay.stopCountdownClock";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("StatsDisplay.stopCountdownClock() timer id: ", this.clockIntervalTimer, "daily");
        clearInterval(this.clockIntervalTimer);
    }

    // Hide or show the share callback based on whether the daily game solution
    // has been shown. If the solution was shown or the daily game isn't over,
    // the player is not allowed to share.
    updateShareButton() {
        const CL = "StatsDisplay.updateShareButton";
        COV(0, CL);
        if (! this.appDisplay.isDailyGameOver() || this.appDisplay.isDailyGameBroken()) {
            COV(1, CL);
            this.shareButton.style.display = "none";
        } else {
            COV(2, CL);
            this.shareButton.style.display = "block";
        }
        Const.GL_DEBUG && this.logDebug("share button style.display set to: ", this.shareButton.style.display, "daily");
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
            oneStat = ElementUtilities.addElementTo("div", parentDiv, {class: "one-stat"});
            ElementUtilities.addElementTo("div", oneStat, {class: "one-stat-value"}, value);
            ElementUtilities.addElementTo("div", oneStat, {class: "one-stat-label"}, label);
        }

        addStat(gameState.getStat('gamesStarted'), "Started", this.statsContainer);
        addStat(gameState.getStat('gamesWon'), "Won", this.statsContainer);
        addStat(gameState.getStat('gamesLost'), "Lost", this.statsContainer);
        addStat(gameState.getStat('streak'), "Streak", this.statsContainer);

        // Save the streak in case the user shares.
        this.dailyStreak = gameState.getStat('streak');

        // Next we'll display a bar graph showing how many games there were at each "wrong moves value",
        // i.e. 0 .. <Const.TOO_MANY_PENALTIES> *and* "games that ended because of too many
        // wrong moves". First, determine the maximum value among all the "wrong moves values"
        // to use to in calculating the length of the bars.
        let maxWrongWordsValue = 0;
        let penaltyHistogram = gameState.penaltyHistogram;
        for (let numPenalties = 0; numPenalties <= Const.TOO_MANY_PENALTIES; numPenalties++) {
            if (penaltyHistogram[numPenalties] > maxWrongWordsValue) {
                maxWrongWordsValue = penaltyHistogram[numPenalties];
            }
        }

        // Local function to add a bar.
        function addBar(barValue, barLabel, parentDiv) {

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
        for (let numPenalties = 0; numPenalties <= Const.TOO_MANY_PENALTIES; numPenalties++) {
            const barValue = penaltyHistogram[numPenalties];
            addBar(barValue, Const.NUMBERS[numPenalties], this.statsDistribution);
        }
    }
}

export { StatsDisplay };
