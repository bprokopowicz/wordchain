import { AuxiliaryDisplay } from './AuxiliaryDisplay.js';
import { ElementUtilities } from './ElementUtilities.js';
import * as Const from './Const.js';


class HelpDisplay extends AuxiliaryDisplay {

    constructor(buttonContainer, buttonSvgPath, parentContainer, saveRestoreContainers) {
        super(buttonContainer, buttonSvgPath, parentContainer, saveRestoreContainers);

        const helpHTML = `
        <h1 align=center>HOW TO PLAY</h1>
        <h2>
        Change words one step at a time to get from the starting word
        to the target word in as few steps as possible.
        </h2>
        <p>
        A step consists of adding, deleting, or changing one letter.
        Your next move is indicated with a yellow background:
        pluses to add, minuses to delete, and the letter picker menu button to change.
        </p>
        <p>
        WordChain shows letter cells for the shortest solution,
        which can help you decide what to do next.
        When a letter should be changed, the outline around the letter to change is thicker
        (and dashed when it is the current move).
        </p>
        <p>
        If your word played increases the number of steps from the start to the target word,
        the background of its letters will be red, indicating a penalty;
        otherwise the background will be green (or orange/blue in Colorblind Mode).
        If you play ${Const.TOO_MANY_WRONG_MOVES} such "wrong moves" you lose the game.
        If you reach the target word you win the game.  Your score is the number of wrong
        moves you made, from 0 to ${Const.TOO_MANY_WRONG_MOVES}.
        </p>
        <h3>
        Every day there will be a new daily WordChain game.
        You can play up to ${Const.PRACTICE_GAMES_PER_DAY} practice games per day.
        </h3>
        <p>
        There is more information in the <a href="${Const.FAQ_HREF}" target="_blank">FAQ</a>.
        </p>
        `;

        // Add to the container div that was created above.
        ElementUtilities.addElementTo("div", this.contentContainer, {class: 'help-content-div'}, helpHTML);
    }
}

export { HelpDisplay };
