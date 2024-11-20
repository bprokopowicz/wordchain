import { AuxiliaryDisplay } from './AuxiliaryDisplay.js';
import { Persistence } from './Persistence.js';
//import { DailyGameDisplay } from './DailyGameDisplay.js';
import { ElementUtilities } from './ElementUtilities.js';
import * as Const from './Const.js';

/*
** The updateStatsContent() method in this class reads a DailyStats cookie,
** an object with the following properties:
**
** gamesPlayed
**    Integer: number of games started.
** gamesCompleted
**    Integer: number of games completed.
** gamesShown
**    Integer: number of games for which the 'Solution' button was clicked.
** gamesFailed
**    Integer: number of games that ended because of too many wrong moves.
** 0 .. <Const.TOO_MANY_WRONG_MOVES>
**    Integer: Number of games that had 0, 1, ... wrong moves.
*/

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

        ElementUtilities.addElementTo("h1", contentDiv, {align: "center"}, "WRONG MOVES COUNTS");
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

        // use 'this' as the callback object to the callback function for the shareButton element so that we can access ourself
        ElementUtilities.setButtonCallback(this.shareButton, this, this.shareCallback);
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
        this.updateShareButton();
    }

    // Callback for the Share button.
    shareCallback(event) {
        const shareString = this.getShareString();
        if (shareString)
        {
            Const.GL_DEBUG && this.logDebug("shareCallback() navigator: ", navigator, "daily");
            // Are we in a *secure* environment that has a "share" button, like a smart phone?
            let shareData = { text: shareString, };
            if (navigator.canShare(shareData)) {
                // Yes -- use the button to share the shareString.
                navigator.share(shareData)
                .catch((error) => {
                    this.appDisplay.showToast(Const.SHARE_FAILED);
                    // console.error("Failed to share: ", error);
                });
            // Are we in a *secure* environment that has access to clipboard (probably on a laptop/desktop)?
            } else if (navigator.clipboard) {
                navigator.clipboard.writeText(shareString);
                this.appDisplay.showToast(Const.SHARE_COPIED);
            // Insecure.
            } else {
                this.appDisplay.showToast(Const.SHARE_INSECURE);
            }
        }
        return shareString; // used in testing only
    }

    /* ----- Utilities ----- */

    // Return a share graphic if the game is over, and null if not.
    // Note that the share graphic is not HTML, but rather just a string, containing
    // some Unicode characters to construct the graphic.
    getShareString() {

        // getDailyGameInfo() returns an object with 4 properties, the last 3 of which are populated only if
        // over is true):
        //
        //  over:            true if the game is over (user has found target word or too many steps)
        //  numWrongMoves:   how many more steps it took to solve than the minimum
        //  moveSummary:     array of arrays containing for each move:
        //      constant indicating whether the move was correct (OK)/incorrect (WRONG_MOVE)/genius/unplayed(FUTURE)
        //      length of the move's word
        //  dailyGameNumber: the current game number
        const gameInfo = this.appDisplay.getDailyGameInfo();
        Const.GL_DEBUG && this.logDebug("getShareString() gameInfo=", gameInfo, "daily");

        if (! gameInfo.over) {
            console.error("getShareString() called when game is not over!");
            return null;
        }

        let shareString = `WordChain #${gameInfo.dailyGameNumber} `;

        // Determine what emoji to use to show the user's "score".
        if (gameInfo.numWrongMoves >= Const.TOO_MANY_WRONG_MOVES) {
            // Too many wrong moves.
            shareString += Const.CONFOUNDED;
        } else {
            // Show the emoji in NUMBERS corresponding to how many wrong moves.
            // A bit of a misnomer, but the value for 0 is a star.
            shareString += Const.NUMBERS[gameInfo.numWrongMoves];
        }
        shareString += "\n\n";

        // Now, construct the graphic showing the lengths of the user's
        // played words, colored red or green to indicate whether that word
        // did or did not increase the solution length.
        // The target word (last) is shown in a separate, fixed color regardless
        // of success or failure so we slice it off here.

        let wordsBetweenStartAndTarget = gameInfo.moveSummary.slice(1,-1);
        let [startRatingUnused, startLength] = gameInfo.moveSummary[0];
        let [targetRatingUnused, targetLength] = gameInfo.moveSummary.slice(-1)[0];

        // start with the start word shown in purple
        let emoji = Const.PURPLE_SQUARE;
        shareString += emoji.repeat(startLength) + "\n";

        // Show all the words played.
        let colorblindMode = this.appDisplay.isColorblindMode();
        for (let [moveRating, wordLength] of wordsBetweenStartAndTarget) {

            // We don't include unplayed words in the share string.  This happens when there are too many wrong moves.
            // The moveSummary includes the correct unplayed words leading from the last wrong word to the target, but we
            // don't want to show them.
            if (moveRating == Const.FUTURE) {
                break;
            }

            // Determine which color square to display for this word.
            if (moveRating === Const.OK) {
                // Word didn't increase the count; pick color indicating "good".
                emoji = colorblindMode ? Const.BLUE_SQUARE : Const.GREEN_SQUARE;
            } else if (moveRating === Const.WRONG_MOVE) {
                // Word increased the count; pick color indicating "bad".
                emoji = colorblindMode ? Const.ORANGE_SQUARE : Const.RED_SQUARE;
            } else if (moveRating === Const.GENIUS_MOVE) {
                emoji = colorblindMode ? Const.GOLD_STAR : Const.GOLD_STAR;
            }

            // Now repeat that emoji for the length of the word and add a newline,
            // creating a row that looks like the row of tiles in the game.
            shareString += emoji.repeat(wordLength) + "\n";
        }
        // now, add the target
        emoji = Const.PURPLE_SQUARE;
        shareString += emoji.repeat(targetLength);

        return shareString.trim();
    }

    // This is called when the user opens the Stats screen; it displays a
    // countdown clock until the next daily game is available.
    startCountdownClock() {
        function msToDuration(ms) {
            return new Date(ms).toISOString().substr(11, 8);
        }

        // Set the initial clock display.
        let msUntilNextGame = this.appDisplay.dailyGameDisplay.getMsUntilNextGame();
        this.countdownClock.textContent = msToDuration(msUntilNextGame);

        // Set a timer to change the clock and display every second.
        this.clockIntervalTimer = setInterval(() => {
            msUntilNextGame -= 1000;
            this.countdownClock.textContent = msToDuration(msUntilNextGame);
        }, 1000);
    }

    // Hide or show the share callback based on whether the daily game solution
    // has been shown. If the solution was shown or the daily game isn't over,
    // the player is not allowed to share.
    updateShareButton() {
        if (Persistence.getDailySolutionShown() || ! this.appDisplay.dailyGameOver()) {
            this.shareButton.style.display = "none";
        } else {
            this.shareButton.style.display = "block";
        }
        Const.GL_DEBUG && this.logDebug("share button style.display set to: ", this.shareButton.style.display, "daily");
    }

    // Update the statistics and distribution graph.
    updateStatsContent() {
        // Get the daily stats from the cookies. We should always have stats because we
        // create them on constructing the daily game, so log if we don't.
        let dailyStats = Persistence.getDailyStatsOrElse(null);

        if (dailyStats === null)
        {
            console.error("StatsDisplay.updateStatsContent(): no daily stats!");
            this.appDisplay.showToast(Const.NO_STATS);
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

        // Next we'll display a bar graph showing how many games there were at each "wrong moves value",
        // i.e. 0 .. <Const.TOO_MANY_WRONG_MOVES> *and* "games that ended because of too many
        // wrong moves". First, determine the maximum value among all the "wrong moves values"
        // to use to in calculating the length of the bars.
        let maxWrongWordsValue = 0;
        for (let wrongMoves = 0; wrongMoves <= Const.TOO_MANY_WRONG_MOVES; wrongMoves++) {
            if (dailyStats[wrongMoves] > maxWrongWordsValue) {
                maxWrongWordsValue = dailyStats[wrongMoves];
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
        for (let wrongMoves = 0; wrongMoves <= Const.TOO_MANY_WRONG_MOVES; wrongMoves++) {
            const barValue = dailyStats[wrongMoves];
            addBar(barValue, Const.NUMBERS[wrongMoves], this.statsDistribution);
        }
    }
}

export { StatsDisplay };
