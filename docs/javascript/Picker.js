import { BaseLogger } from './BaseLogger.js';
import { ElementUtilities } from './ElementUtilities.js';
import { COV } from './Coverage.js';
import * as Const from './Const.js';

class Picker extends BaseLogger {

    /* ----- Construction ----- */

    // Arguments:
    // gameDisplay: DailyGameDisplay or PracticeGameDisplay object
    // pickerDiv: <div> element to which the picker elements will be added
    // pickerId: 'id' attribute value for the outermost <div> that this
    //    class adds to pickerDiv. This useful mainly to identify in the
    //    devtools which picker is which: daily or practice.
    constructor(gameDisplay, pickerDiv, pickerId) {
        const CL = "Picker.constructor";
        COV(0, CL);
        super();

        // Save gameDisplay so that we can call letterPicked() when the
        // user selects a letter.
        this.gameDisplay = gameDisplay;

        // Save each letter-button by letter, for access to buttons during testing.
        this.buttonsForLetters = new Map();

        // Add the picker menu, which will end up looking like this:
        //
        //    <div class="picker-outer-div" id="pickerId">
        //    <div class="picker-inner-div">
        //    <table class="picker-table">
        //        <tr class="picker-tr">
        //            <td class="picker-td"><button class=`picker-button ${Const.UNSELECTED_STYLE}`>A</button></td>
        //            ...
        //            <td class="picker-td"><button class=`picker-button Const.UNSELECTED_STYLE`>Z</button></td>
        //        </tr>
        //    </table>
        //    </div>
        //    </div>
        //
        // The picker-outer-div class will have a fixed width that spans the game display.
        // The picker-inner-div class will be scrollable so that a user with a touch screen
        // device can easily scroll by dragging; a non-touch-screen user will need to
        // use a slider to move the letters.
        this.pickerOuterDiv = ElementUtilities.addElementTo("div", pickerDiv, {class: "picker-outer-div", id: pickerId});
        this.pickerInnerDiv = ElementUtilities.addElementTo("div", this.pickerOuterDiv, {class: "picker-inner-div"});

        var table = ElementUtilities.addElementTo("table", this.pickerInnerDiv, {class: "picker-table"}),
            row = ElementUtilities.addElementTo("tr", table, {class: "picker-tr"}),
            codeLetterA = "A".charCodeAt(0),
            codeLetterZ = "Z".charCodeAt(0),
            letter, td, button;

        for (let letterCode = codeLetterA; letterCode <= codeLetterZ; letterCode++) {
            letter = String.fromCharCode(letterCode);
            td = ElementUtilities.addElementTo("td", row, {class: "picker-td", align: "center"})
            button = ElementUtilities.addElementTo("button", td, {class: `picker-button ${Const.UNSELECTED_STYLE}`, letter: letter}, letter)
            this.buttonsForLetters.set(letter, button);
            if (letter == 'M') {
                COV(1, CL);
                this.middleButton = button;
            }
            ElementUtilities.setButtonCallback(button, this, this.selectionCallback);
        }

        // Force caller to enable the picker explictly.
        COV(2, CL);
        this.disable();
    }

    // For testing: we want the button for a particular letter, so we
    // can simulate pressing it from test code.
    getButtonForLetter(letter) {
        const CL = "Picker.getButtonForLetter";
        COV(0, CL);
        return this.buttonsForLetters.get(letter);
    }

    disable() {
        // Hide pickerInnerDiv -- the outer div will not be hidden, so space
        // for the picker will be present, but it will be blank. In this way,
        // when we enable the picker, we simply "unhide" and the game display
        // elements don't move, which would be jarring to a user.`
        const CL = "Picker.disable";
        COV(0, CL);
        ElementUtilities.hide(this.pickerInnerDiv);
    }

    enable() {
        const CL = "Picker.ensable";
        COV(0, CL);
        ElementUtilities.show(this.pickerInnerDiv);
    }

    // This method is called when the user clickes a letter button in the picker.
    // Its return value is needed ONLY for the testing infrastructure.
    selectionCallback(event) {
        const CL = "Picker.selectionCallback";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("Picker.selectionCallback() event:", event, "picker");

        let result = null;

        if (this.gameDisplay.needsConfirmation(event.srcElement)) {
            COV(1, CL);
            result = Const.NEEDS_CONFIRMATION;
        } else {
            // Tell the game that a letter has been picked.
            COV(2, CL);
            const buttonText = event.srcElement.innerText;
            result = this.gameDisplay.letterPicked(buttonText);
        }

        COV(3, CL);
        return result;
    }
}

export { Picker };
