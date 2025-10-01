import { AuxiliaryDisplay } from './AuxiliaryDisplay.js';
import { ElementUtilities } from './ElementUtilities.js';
import { COV } from './Coverage.js';
import * as Const from './Const.js';


class HelpDisplay extends AuxiliaryDisplay {

    constructor(buttonContainer, buttonInfo, parentContainer, saveRestoreContainers) {
        const CL = "HelpDisplay.constructor";
        COV(0, CL);
        super(buttonContainer, buttonInfo, parentContainer, saveRestoreContainers);

        const helpHTML = `
        <h1 style="display: flex; justify-content: space-between; align-items: center;">
            <button class="app-button non-header-button">
                <a href="${Const.HELP_VIDEO_URL}" target="_blank">VIDEO</a>
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
        If you have ${Const.TOO_MANY_EXTRA_STEPS} more steps than the
        solution WordChain found the game will end and the remaining moves words will be shown.
        </h2>

        <h3>
        Every day there will be a new daily WordChain game.
        You can play up to ${Const.PRACTICE_GAMES_PER_DAY} practice games per day.
        </h3>

        <p>
        Here is an example of how to play, step by step.
        </p>
        <p>
        The yellow highlighted word is the "active word".
        The thick border around the 'P' says to change that letter,
        and you see the '?' in the word below.
        Now you must choose a letter to replace the '?'.
        Notice that the 'E' circle has a thick outline --
        that means that on the next move you'll be changing the 'E'.
        </p>

        <img src="/docs/images/Help01.v1.jpg" width="350px"/>
        <p>
        Slide the letter tiles at the top until the letter you want appears;
        in this case, we will change it to an "H". Then tap the letter.
        WordChain will spell out the word in the next row.
        </p>

        <img src="/docs/images/Help02.v1.jpg" width="350px"/>
        <p>
        The green indicates you made the best move -- you didn't add any extra steps.
        Now it's time to change the 'E' in the thick circle;
        we'll tap on 'D' to chain from HARE to HARD.
        You might notice that there is no thick circle
        in the word with the '?' this time.
        That's because we won't be changing a letter on the next move!
        </p>

        <img src="/docs/images/Help03.v1.jpg" width="350px"/>
        <p>
        Now we need to delete a letter.
        Tap on the '-' under the 'R' to chain from HARD to HAD.
        Notice that the letter picker has been hidden;
        that's because you won't use it for this move.
        </p>

        <img src="/docs/images/Help04.v1.jpg" width="350px"/>
        <p>
        Our next step is to add a letter.
        We'll chain from HAD to HEAD.
        Tap the '+' to add the letter between 'H' and 'A'.
        Again, the letter picker is hidden.
        </p>

        <img src="/docs/images/Help05.v1.jpg" width="350px"/>
        <p>
        The letter picker is visible again (but not shown here)
        because now we need to choose the letter to replace the "?".
        As before, slide the tiles at the top
        until the 'E' appears, then tap it and this is the next move.
        </p>

        <img src="/docs/images/Help06.v1.jpg" width="350px"/>
        <p>
        Here, we need to add another letter.
        We'll tap the first '+'.
        </p>

        <img src="/docs/images/Help07.v1.jpg" width="350px"/>
        <p>
        Again we see a letter with a '?'; we tap on the 'A' tile to
        chain from HEAD to AHEAD.
        </p>

        <img src="/docs/images/Help08.v1.jpg" width="350px"/>
        <p>
        And with that, the game is over and the "Share" button is enabled.
        If you click the "Share" button, your game play information will be
        copied to the clipboard so you can share it by pasting it in
        a text message, on Facebook, etc. We encourage that!
        </p>
        <p>
        Let's take another look at the start of the game.
        Note the thick circle in the 2nd row of circles;
        that tells you that once we change PARE to HARE,
        we will be changing the 'E'.
        </p>

        <img src="/docs/images/Help09.v1.jpg" width="350px"/>
        <p>
        WordChain always shows empty letter cells for the
        shortest solution path from the current point in the game.
        The thicker outlines on letters in that solution path indicate what
        letters will change on that path;
        this information provides a hint as to how best to solve the game.
        The number of circles in each row also provide guidance
        on how to reach the target word.
        Note that each time you make a move,
        WordChain recalculates the best solution path to the target word,
        so the number and thickness of the blank circles
        may not be the same as before your move.
        </p>

        <p>
        What if we had changed the 'E' to 'M' to make HARM?
        </p>

        <img src="/docs/images/Help10.v1.jpg" width="350px"/>
        <p>
        That choice made the solution longer than WordChain's solution.
        If your played word increases the number of steps from the start to the target word,
        the background of its letters will be brown.
        You may have wondered what that line is in the display grid:
        it indicates while you are playing what your current score is.
        After our one extra word, we see there is one word below the line -- our current score is 1.
        </p>

        <img src="/docs/images/Help11.v1.jpg" width="350px"/>
        <p>
        We removed the 'R' to make HAM, but now we're stuck!
        Tap "Show Word" to get unstuck.
        </p>

        <img src="/docs/images/Help12.v1.jpg" width="350px"/>
        <p>
        The gray letters indicate you got some help.
        Now we finish off the game as we did before.
        </p>

        <img src="/docs/images/Help13.v1.jpg" width="350px"/>
        <p>
        If you reach the target word the game is over.
        Your score is the number extra steps you had,
        i.e. how much longer your solution was than WordChain's;
        it will range from 0 to ${Const.TOO_MANY_EXTRA_STEPS}.
        In this case, HARM was an extra word and our score is 1;
        note that there is one word after the line.
        The first time this game was played,
        there were no mistakes and so the score was 0.
        If you're familiar with golf, you might think of a score of 0 as "par".
        </p>

        <p>
        Some players find it helpful to work backwards from the target word,
        but you have to keep track of the words in your head, so your mileage may vary!
        </p>

        <p>
        By default, when you tap a letter or '+' or '-', your move is entered.
        You can turn on "confirmation mode" in the settings, in which case
        these buttons become gray on your first tap
        and you must tap again to confirm your selection.
        </p>
        <img src="/docs/images/Help14.v1.jpg" width="350px"/>
        <p>
        </p>
        <img src="/docs/images/Help15.v1.jpg" width="350px"/>
        <p>
        </p>
        <img src="/docs/images/Help16.v1.jpg" width="350px"/>

        <p>
        <b>There is lots more information in the <a href="${Const.FAQ_URL}" target="_blank">FAQ</a></b>.
        </p>
        `;

        // Add the help text to the container div that is set in the superclass constructor.
        ElementUtilities.addElementTo("div", this.contentContainer, {class: 'help-content-div'}, helpHTML);
    }
}

export { HelpDisplay };
