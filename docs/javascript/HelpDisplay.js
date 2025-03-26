import { AuxiliaryDisplay } from './AuxiliaryDisplay.js';
import { ElementUtilities } from './ElementUtilities.js';
import * as Const from './Const.js';


class HelpDisplay extends AuxiliaryDisplay {

    constructor(buttonContainer, buttonSvgPath, parentContainer, saveRestoreContainers) {
        super(buttonContainer, buttonSvgPath, parentContainer, saveRestoreContainers);

        const helpHTML = `
        <h1 style="display: flex; justify-content: space-between; align-items: center;">
            <button class="app-button non-header-button">
                <a href="${Const.FAQ_URL}" target="_blank">FAQ</a>
            </button>
            <label>
            HOW TO PLAY
            </label>
            <button class="app-button non-header-button">
                <a href="${Const.FAQ_URL}" target="_blank">FAQ</a>
            </button>
        </h1>
        <h2>
        Change words one step at a time (add/delete/change a letter)
        to get from the starting word to the target word in as few steps as possible.
        </h2>
        <p>
        When you are to add or delete a letter, plus or minus buttons appear.
        When you are to change a letter, a scrollable list of letter buttons
        appears at the top of the game and the letter to be changed has
        a thicker outline in the current word.
        The plus/minus/letter buttons are yellow.
        By default, when you click/tap them, your move is entered.
        You can turn on "confirmation mode" in the settings, in which case
        these buttons become gray on your first click/tap
        and you must click/tap again to confirm your selection.
        </p>
        <p>
        WordChain shows empty letter cells for the rest of the shortest solution
        path from the current point in the game,
        with thicker outlines on letters in that solution path that will change;
        this information provides a hint as to how best to solve the game.
        </p>
        <p>
        If your played word increases the number of steps from the start to the target word,
        the background of its letters will be red, indicating a penalty;
        otherwise the background will be green (or orange/blue in Colorblind Mode).
        If you play ${Const.TOO_MANY_WRONG_MOVES} such "wrong moves" you lose the game.
        If you reach the target word you win the game.  Your score is the number of wrong
        moves you made, from 0 to ${Const.TOO_MANY_WRONG_MOVES}.
        </p>
        <h3>
        Every day there will be a new daily WordChain game --
        share your daily game results from the Stats screen.
        You can play up to ${Const.PRACTICE_GAMES_PER_DAY} practice games per day.
        </h3>
        <p>
        There is lots more information in the <a href="${Const.FAQ_URL}" target="_blank">FAQ</a>.
        </p>
        `;

        // Add the help text to the container div that is set in the superclass constructor.
        ElementUtilities.addElementTo("div", this.contentContainer, {class: 'help-content-div'}, helpHTML);
    }
}

export { HelpDisplay };
