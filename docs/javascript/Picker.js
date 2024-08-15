import { BaseLogger } from './BaseLogger.js';
import { ElementUtilities } from './ElementUtilities.js';
import { CustomMenu } from './CustomMenu.js';
import * as Const from './Const.js';

class Picker extends BaseLogger {

    /* ----- Class Variables ----- */

    MENU_BUTTON = "\u{025BC}";   // Downward pointing triangle
    UNSELECTED  = " ";

    /* ----- Construction ----- */

    constructor(gameDisplay, pickerDiv, pickerId) {
        super();

        // Save the picker ID in case we want to log it.
        this.pickerId = pickerId;

        // Save gameDisplay so that we can call letterPicked() when the
        // user selects a letter.
        this.gameDisplay = gameDisplay;

        var pickerContainer = ElementUtilities.addElementTo("div", pickerDiv, {class: "picker-container"});

        this.pickerLabel = ElementUtilities.addElementTo(
            "label", pickerContainer, {class: "picker-label"}, "Pick a letter: ")

        // Add the picker menu, which will end up looking like this:
        //
        //    <custom-menu id="pickerId">
        //        <custom-menu-button class="picker-button">
        //            <custom-menu-button-selection class="picker-button-selection"></custom-menu-button-selection>
        //            <custom-menu-button-arrow class="picker-button-arrow">MENU_BUTTON</custom-menu-button-arrow>
        //        </custom-menu-button>
        //        <custom-menu-options>
        //            <label class="picker-option"><input type="radio" name="pickerId-radio" value="A" class="hidden">A</label>
        //            ...
        //            <label class="picker-option"><input type="radio" name="pickerId-radio" value="Z" class="hidden">Z</label>
        //        </custom-menu-options>
        //    </custom-menu>
        this.pickerMenu = ElementUtilities.addElementTo("custom-menu", pickerContainer, {id: pickerId});

        // Save this picker in the pickerMenu so that when a letter
        // is selected we are notified -- and then we can notify the game display.
        this.pickerMenu.objectToNotify = this;

        // Now add the button and its selection and arrow elements.
        this.pickerMenuButton = ElementUtilities.addElementTo("custom-menu-button", this.pickerMenu, {class: "picker-button"});
        this.pickerMenuButtonSelection = ElementUtilities.addElementTo("custom-menu-button-selection", this.pickerMenuButton,
            {value: this.UNSELECTED, class: "picker-button-selection"}, this.UNSELECTED)
        this.pickerMenuButtonArrow = ElementUtilities.addElementTo("custom-menu-button-arrow", this.pickerMenuButton,
            {value: this.UNSELECTED, class: "picker-button-arrow"}, this.MENU_BUTTON)

        // Now add the options and their labels/inputs.
        this.pickerMenuOptions = ElementUtilities.addElementTo("custom-menu-options", this.pickerMenu);

        var pickerOptionId = `${pickerId}-radio`,
            codeLetterA = "A".charCodeAt(0),
            codeLetterZ = "Z".charCodeAt(0),
            letter, label, input;

        for (let letterCode = codeLetterA; letterCode <= codeLetterZ; letterCode++) {
            letter = String.fromCharCode(letterCode);
            label = ElementUtilities.addElementTo("label", this.pickerMenuOptions, {class: "picker-option"}, letter)

            // Add input with class hidden -- this will make it so that the
            // radio button itself doesn't appear in the menu options;
            // just the label will appear.
            input = ElementUtilities.addElementTo("input", label,
                {type: "radio", name: pickerOptionId, value: letter, class: "hidden"})
        }

        // Force caller to enable the picker explictly.
        this.pickerMenu.disable();
    }

    clear() {
        this.pickerMenu.clearSelection();
    }

    disable() {
        this.pickerLabel.setAttribute("class", "picker-label picker-label-disabled");
        this.pickerMenu.setAttribute("class", "picker-button picker-button-disabled");
        this.pickerMenuButton.setAttribute("class", "picker-button picker-button-disabled");
        this.pickerMenuButtonSelection.setAttribute("class", "picker-button picker-button-disabled");
        this.pickerMenuButtonArrow.setAttribute("class", "picker-button picker-button-disabled");
        this.pickerMenu.disable();
    }

    enable() {
        this.pickerLabel.setAttribute("class", "picker-label picker-label-enabled");
        this.pickerMenu.setAttribute("class", "picker-button picker-button-enabled");
        this.pickerMenuButton.setAttribute("class", "picker-button picker-button-enabled");
        this.pickerMenuButtonSelection.setAttribute("class", "picker-button picker-button-enabled");
        this.pickerMenuButtonArrow.setAttribute("class", "picker-button picker-button-enabled");
        this.pickerMenu.enable();
    }

    // GameDisplay saves the letter position in the picker so that when
    // a letter is selected we can give it back to the game.
    saveLetterPosition(position) {
        this.letterPosition = position;
    }

    // This method is called from CustomMenu when the user has selected
    // a letter from the picker. In our case text and value are the same,
    // so we only use text.
    selectionMade(text, __value) {
        return this.gameDisplay.letterPicked(text, this.letterPosition)
    }
}

export { Picker };
