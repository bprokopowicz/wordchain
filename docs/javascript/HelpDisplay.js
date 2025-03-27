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

        <h3>
        Every day there will be a new daily WordChain game --
        share your daily game results from the Stats screen.
        You can play up to ${Const.PRACTICE_GAMES_PER_DAY} practice games per day.
        </h3>

        <p>
        Here is an example of how to play, step by step.
        </p>

        <img src="/docs/images/Help01.jpg" width="350px"/>
        </p>
        The yellow highlighted word is the "active word".
        The thick border around the "P" says to change that letter.
        Slide the letter tiles at the top until the letter you want appears;
        in this case, we will change it to an "H". Then tap the letter.
        WordChain will spell the word out in the the next row.
        </p>

        <img src="/docs/images/Help02.jpg" width="350px"/>
        <p>
        The green indicates you made the right guess.
        Now it's time to change the "E" in the thick circle;
        we'll tap on "D" to make HARD.
        </p>

        <img src="/docs/images/Help03.jpg" width="350px"/>
        <p>
        Now we need to delete a letter. Tap on the "-" under the "R"
        to make HAD.
        </p>

        <img src="/docs/images/Help04.jpg" width="350px"/>
        <p>
        Our next step is to add a letter. Tap the "+" 
        to add the letter between "H" and "A".
        </p>

        <img src="/docs/images/Help05.jpg" width="350px"/>
        <p>
        Now we need to fill the letter, which has a "?".
        As before, slide the tiles at the top (not shown here)
        until the "E" appears and tap it.
        </p>

        <img src="/docs/images/Help06.jpg" width="350px"/>
        <p>
        Here, we need to add another letter.
        We'll tap the first "+".
        </p>

        <img src="/docs/images/Help07.jpg" width="350px"/>
        <p>
        Again we see a letter with a "?"; we tap on the "A" tile to fill it.
        </p>

        <img src="/docs/images/Help08.jpg" width="350px"/>
        <p>
        And with that, the game is over. 
        </p>

        <img src="/docs/images/Help09.jpg" width="350px"/>
        <p>
        Let's take another look at the start of the game.
        Note the thick circle in the 2nd row of circles;
        that tells you that once we change PARE to HARE,
        we will be changing the "E". 
        WordChain always shows empty letter cells for the
        shortest solution path from the current point in the game.
        The thicker outlines on letters in that solution path indicate what
        letters will change; this information provides a hint
        as to how best to solve the game.
        The number of circles in each row also provide guidance
        on how to reach the target word.
        </p>

        <p>
        What if we had changed the "E" to "M" to make HARM?
        </p>

        <img src="/docs/images/Help10.jpg" width="350px"/>
        <p>
        Oops -- that wasn't the right choice: it made the solution
        longer than WordChain's solution.
        If your played word increases the number of steps from the start to the target word,
        the background of its letters will be red, indicating a penalty.
        </p>

        <img src="/docs/images/Help11.jpg" width="350px"/>
        <p>
        We removed the "R" to make HAM, but now we're stuck!
        Tap "Show Next Move" to get unstuck.
        </p>

        <img src="/docs/images/Help12.jpg" width="350px"/>
        <p>
        The gray letters indicate you got some help; this is also a penalty.
        If you have ${Const.TOO_MANY_WRONG_MOVES} penalty moves you lose the game.
        </p>

        <img src="/docs/images/Help13.jpg" width="350px"/>
        <p>
        If you reach the target word you win the game.
        Your score is the number of penalty moves you made,
        from 0 to ${Const.TOO_MANY_WRONG_MOVES}.
        In this case, HARM and HAD caused us to have a score of 2.
        </p>

        <p>
        By default, when you tap a letter or "+" or "-", your move is entered.
        You can turn on "confirmation mode" in the settings, in which case
        these buttons become gray on your first click/tap
        and you must click/tap again to confirm your selection.
        </p>
        <img src="/docs/images/Help14.jpg" width="350px"/>
        <p>
        </p>
        <img src="/docs/images/Help15.jpg" width="350px"/>
        <p>
        </p>
        <img src="/docs/images/Help16.jpg" width="350px"/>

        <p>
        <b>There is lots more information in the <a href="${Const.FAQ_URL}" target="_blank">FAQ</a></b>.
        </p>
        `;

        // Add the help text to the container div that is set in the superclass constructor.
        ElementUtilities.addElementTo("div", this.contentContainer, {class: 'help-content-div'}, helpHTML);
    }
}

export { HelpDisplay };
