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

        // the picker menu will be the center element of a three-column table, which holds 
        // left-arrow | picker letter tiles | right-arrow
        // Add the picker menu, which will end up looking like this:
        //
        //    <div class="picker-div" id="picker-div">
        //    <div class="picker-outer-div" id="picker-">
        //    <table class="picker-and-arrows-table>
        //      <tr class="picker-tr>
        //      <td class="picker-td" <button class=picker-arrow '<'> < </button></td>
        //      <td class="picker-td>
        //         <div class="picker-inner-div">
        //         <table class="picker-table">
        //             <tr class="picker-tr">
        //               <td class="picker-td"><button class=`picker-button ${Const.UNSELECTED_STYLE}`>A</button></td>
        //               ...
        //               <td class="picker-td"><button class=`picker-button Const.UNSELECTED_STYLE`>Z</button></td>
        //             </tr>
        //         </table>
        //         </div>
        //     </td>
        //     <td class="picker-td" <button class=picker-arrow '>'> > </button></td>
        //     </tr>
        //   </table>
        //   </div>
        //
        // The picker-outer-div class will have a fixed width that spans the game display.
        // The picker-inner-div class will be scrollable so that a user with a touch screen
        // device can easily scroll by dragging; a non-touch-screen user will need to
        // use a slider to move the letters.

        this.pickerOuterDiv = ElementUtilities.addElementTo("div", pickerDiv, {class: "picker-outer-div", id: pickerId});
        var pickerAndArrowsTable =  ElementUtilities.addElementTo("table", this.pickerOuterDiv, {class: "picker-and-arrows-table"});
        var ptRow = ElementUtilities.addElementTo("tr", pickerAndArrowsTable, {class: "picker-tr"});

        // add the left <
        var td1 = ElementUtilities.addElementTo("td", ptRow, {class: "picker-td", align: "right"});
        var lButton = ElementUtilities.addElementTo("button", td1, {class: `picker-arrow ${Const.UNSELECTED_STYLE}`, letter: '<'}, '<');

        // add the inner div that holds the sliding letter tiles table
        var td2 = ElementUtilities.addElementTo("td", ptRow, {class: "picker-td", align: "right"});
        this.pickerInnerDiv = ElementUtilities.addElementTo("div", td2, {class: "picker-inner-div"});

        // add the right >
        var td3 = ElementUtilities.addElementTo("td", ptRow, {class: "picker-td", align: "left"});
        var rButton = ElementUtilities.addElementTo("button", td3, {class: `picker-arrow ${Const.UNSELECTED_STYLE}`, letter: '>'}, '>');

        var letterTilesTable = ElementUtilities.addElementTo("table", this.pickerInnerDiv, {class: "picker-table"}),
            row = ElementUtilities.addElementTo("tr", letterTilesTable, {class: "picker-tr"}),
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
        ElementUtilities.hide(this.pickerOuterDiv); // was this.pickerInnerDiv
    }

    enable() {
        const CL = "Picker.ensable";
        COV(0, CL);
        ElementUtilities.show(this.pickerOuterDiv); // was this.pickerInnerDiv
    }

    // ActiveLetterCell saves the letter position in the picker so that when
    // a letter is selected we can give it back to the game.
    saveLetterPosition(position) {
        const CL = "Picker.saveLetterPosition";
        COV(0, CL);
        this.letterPosition = position;
    }

    // This method is called when the user clickes a letter button in the picker.
    // Its return value is needed ONLY for the testing infrastructure.
    selectionCallback(event) {
        const CL = "Picker.selectionCallback";
        COV(0, CL);

        let result = null;

        if (this.gameDisplay.needsConfirmation(event.srcElement)) {
            COV(1, CL);
            result = Const.NEEDS_CONFIRMATION;
        } else {
            // Tell the game that a letter has been picked.
            COV(2, CL);
            const buttonText = event.srcElement.innerText;
            result = this.gameDisplay.letterPicked(buttonText, this.letterPosition);
        }

        COV(3, CL);
        return result;
    }
}

export { Picker };
