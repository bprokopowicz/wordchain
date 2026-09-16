import { BaseLogger } from './BaseLogger.js';
import { ElementUtilities } from './ElementUtilities.js';
import * as Const from './Const.js';

class Keyboard extends BaseLogger {

/*
** Forwarding functions
**
** When "this.startGameCallback" is passed, for example, as the listener on calls
** within the AppDisplay class to addEventListener(), Chrome appears to call it (but refers
** to it as HTMLButtonElement.startGameCallback, which doesn't exist!) and "this"
** within the method is of type HTMLButtonElement, so the call within to "this.checkWord()"
** resolves to HTMLButtonElement.checkword, which is is not a function. This kind of makes
** sense (except for why it  was able to call the AppDisplay.startGameCallback()
** method at all!).
**
** At that point I introduced the singleton idea. I thought that passing
** AppDisplay.singleton().startGameCallback as the listener would work, but this
** also resulted in "HTMLButtonElement.checkWord() is not a function." Sigh. I really don't
** understand why that is not working. But we carry on; introducing the "forwarding function"
** did the trick.
*/

/*
    I think these are from the physical keyboard, not clicking on the buttons...
    hardKeyboardCallback(event) {
        if (event.key == "Backspace") {
            AppDisplay.singleton().keyboardCallback(Const.BACKSPACE);
        }
        else if (event.key == "Enter") {
            AppDisplay.singleton().keyboardCallback(Const.ENTER);
        } else {
            AppDisplay.singleton().keyboardCallback(event.key.toString().toLowerCase());
        }
    }

    */
    softKeyboardCallback(event) {
        console.log("event.srcElement data-key attribute:", event.srcElement.getAttribute('data-key'))

    }

    // Keyboard constructs itself in a new div, contained in an existing (parent) div.
    // The keyboard's div is available as some-keyboard.keyboardDiv

    constructor(parentDiv) {
        super();

        // Buttons in the keyboard div; used for adding event listeners to them.
        this.keyboardButtons = [];
        // caller should add keyboard to DOM, set up listener
        this.createKeyboardDiv(parentDiv);
        //window.addEventListener("keydown", hardKeyboardCallback);
    }


    /* ----- Keyboard ----- */

    // This method is used to add the ENTER and BACKSPACE buttons.
    addActionButton(rowElement, letter) {
        let svgPath;
        if (letter === Const.ENTER) {
            svgPath = Const.ENTER_PATH;
        } else {
            svgPath = Const.BACKSPACE_PATH;
        }

        const button = ElementUtilities.addElementTo("button", rowElement, {'data-key': letter, class: "keyboard-key keyboard-wide-key"});
        const svg    = ElementUtilities.addElementTo("svg", button, {viewBox: "0 0 24 24", style: "width: 24; height: 24;"});
        const path   = ElementUtilities.addElementTo("path", svg, {d: svgPath});

        this.keyboardButtons.push(button);
    }

    // This method is used to add the letter buttons.
    addLetterButton(rowElement, letter) {
        const button = ElementUtilities.addElementTo("button", rowElement, {'data-key': letter, class: "keyboard-key"}, letter);
        this.keyboardButtons.push(button);
    }

    // This method adds a spacer so the middle row is indented.
    addSpacer(rowElement) {
        ElementUtilities.addElementTo("div", rowElement, {class: "keyboard-key keyboard-spacer"});
        // This isn't a button, so we don't add it to this.keyboardButtons.
    }

    createKeyboardDiv(parentDiv) {
        // We always want the keyboard to appear on a "line" by itself, not
        // next to the tile grid.
        //
        // A div with class "break" forces whatever comes after this div
        // to be on a "new line" when the containing div is display: flex.
        // See: https://tobiasahlin.com/blog/flexbox-break-to-new-row/
        ElementUtilities.addElementTo("div", parentDiv, {class: "break"});

        // This div is the one we style as none or flex to hide/show the div.
        this.keyboardDiv = ElementUtilities.addElementTo("div", parentDiv, {id: "keyboard-div"}, null);
        this.keyboardDiv.style.display = "flex";

        // keyboard-div always ends up with extra space at the top. The only way I was able
        // to get rid of it is to create keyboard-inner-div, which has no extra space, and
        // then in the JavaScript code set the height of keyboard-div to match that of
        // keyboard-inner-div.
        this.keyboardInnerDiv = ElementUtilities.addElementTo("div", this.keyboardDiv, {id: "keyboard-inner-div"}, null);

        // Create the keyboard rows; the tiles will be added to each row in turn.
        const row1 = ElementUtilities.addElementTo("div", this.keyboardInnerDiv, {class: "keyboard-row"});
        const row2 = ElementUtilities.addElementTo("div", this.keyboardInnerDiv, {class: "keyboard-row"});
        const row3 = ElementUtilities.addElementTo("div", this.keyboardInnerDiv, {class: "keyboard-row"});

        // Add keys for row 1
        this.addLetterButton(row1, "q");
        this.addLetterButton(row1, "w");
        this.addLetterButton(row1, "e");
        this.addLetterButton(row1, "r");
        this.addLetterButton(row1, "t");
        this.addLetterButton(row1, "y");
        this.addLetterButton(row1, "u");
        this.addLetterButton(row1, "i");
        this.addLetterButton(row1, "o");
        this.addLetterButton(row1, "p");

        // Add keys for row 2, starting and ending with a spacer so the keys are a little indented.
        this.addSpacer(row2);
        this.addLetterButton(row2, "a");
        this.addLetterButton(row2, "s");
        this.addLetterButton(row2, "d");
        this.addLetterButton(row2, "f");
        this.addLetterButton(row2, "g");
        this.addLetterButton(row2, "h");
        this.addLetterButton(row2, "j");
        this.addLetterButton(row2, "k");
        this.addLetterButton(row2, "l");
        this.addSpacer(row2);

        // Add keys for row 3, which has the BACKSPACE/ENTER "action buttons" on the left and right.
        this.addActionButton(row3, Const.BACKSPACE);
        this.addLetterButton(row3, "z");
        this.addLetterButton(row3, "x");
        this.addLetterButton(row3, "c");
        this.addLetterButton(row3, "v");
        this.addLetterButton(row3, "b");
        this.addLetterButton(row3, "n");
        this.addLetterButton(row3, "m");
        this.addActionButton(row3, Const.ENTER);

        // Add the same click callback to each button.
        for (let button of this.keyboardButtons) {
            button.addEventListener("click", this.softKeyboardCallback);
        }
    }

    /*
    ** ========================================
    ** BUTTON, AND KEYBOARD CALLBACKS
    ** ========================================
    */

    // Global keyboard callback; calls specific game/practice callback
    // based on whether the user is playing the game or setting up words
    // for a practice game.
    keyboardCallback(keyValue) {
        this.gameKeyboardCallback(keyValue);
    }

}

export { Keyboard };
