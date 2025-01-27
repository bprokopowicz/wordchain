import { BaseLogger } from './BaseLogger.js';
import { ElementUtilities } from './ElementUtilities.js';
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
        super();

        // Save gameDisplay so that we can call letterPicked() when the
        // user selects a letter.
        this.gameDisplay = gameDisplay;

        // Add the picker menu, which will end up looking like this:
        //
        //    <div class="picker-outer-div" id="pickerId">
        //    <div class="picker-inner-div">
        //    <table class="picker-table">
        //        <tr class="picker-tr">
        //            <td class="picker-td"><button class="picker-button">A</button></td>
        //            ...
        //            <td class="picker-td"><button class="picker-button">Z</button></td>
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
            button = ElementUtilities.addElementTo("button", td, {class: "picker-button", letter: letter}, letter)
            if (letter == 'M') {
                this.middleButton = button;
            }
            ElementUtilities.setButtonCallback(button, this, this.selectionCallback);
        }

        // Force caller to enable the picker explictly.
        this.disable();
    }

    disable() {
        // Hide pickerInnerDiv -- the outer div will not be hidden, so space
        // for the picker will be present, but it will be blank. In this way,
        // when we enable the picker, we simply "unhide" and the game display
        // elements don't move, which would be jarring to a user.`
        ElementUtilities.hide(this.pickerInnerDiv);
    }

    enable() {
        ElementUtilities.show(this.pickerInnerDiv);
    }

    // ActiveLetterCell saves the letter position in the picker so that when
    // a letter is selected we can give it back to the game.
    saveLetterPosition(position) {
        this.letterPosition = position;
    }

    // This method is called when the user clickes a letter button in the picker.
    selectionCallback(event) {
        const buttonText = event.srcElement.innerText;
        return this.gameDisplay.letterPicked(buttonText, this.letterPosition);
    }
}

export { Picker };
