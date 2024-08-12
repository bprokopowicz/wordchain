import { BaseLogger } from './BaseLogger.js';
import { ElementUtilities } from './ElementUtilities.js';
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
        this.gameDisplay.letterPicked(text, this.letterPosition)
    }
}

class CustomMenu extends HTMLElement {
    constructor() {
        super();
        this.containingObject = null;
        this.enable();
    }

    connectedCallback() {
        this.addEventListener('click', event => {

            // Was the menu button clicked?
            //if (event.target.tagName.toLowerCase() == 'custom-menu-button') {
            const menuButton = event.target.closest('custom-menu-button');
            if (menuButton) {
                // Show the options if we're enabled.
                if (this.enabled) {
                    /* Make the options visible now that we've clicked the button. */
                    this.__showOptions();
                }
                return;
            }

            // When a menu selection is made we get two events: one for the
            // label and one for the input element. We don't want to act on
            // both, so we'll return for the one on the input element.
            if (event.srcElement.tagName.toLowerCase() == 'input') {
                return;
            }

            // Was one of the letters clicked? Only the options have a label element.
            const label = event.target.closest('label');
            if (label) {

                // Clear the selection, in case there was one from before.
                this.clearSelection();

                // Add class "selected" to the clicked label; this enables us find the
                // newly selected option.
                label.classList.add('selected');

                // Transfer text to the menu button so the user can see what was selected.
                this.querySelector('custom-menu-button-selection').textContent
                    = this.querySelector('label.selected').textContent;

                // Find the containing custom-menu, and if it has 'objectToNotify' in it
                // we use that to notify that a selection was made.
                const customMenu = event.target.closest('custom-menu');
                if (customMenu) {
                    if (customMenu.objectToNotify) {
                        customMenu.objectToNotify.selectionMade(this.__getSelectionText(), this.__getSelectionValue());
                    }
                }
                else {
                    console.error("CustomMenu.connectedCallback(): cannot find containing custom-menu element");
                }

                // Now that we've selected one, hide the options.
                this.__hideOptions();
            }
        });
    }

    clearSelection() {
        const menuButtonSelection = this.querySelector('custom-menu-button-selection');
        if (menuButtonSelection) {
            menuButtonSelection.textContent = "";
        }

        // Remove class "selected" from the previously selected label
        // (if we had a previously selected label).
        const selectedLabel = this.querySelector('label.selected');
        if (selectedLabel) {
            selectedLabel.classList.remove('selected');
        }
    }

    disable() {
        this.enabled = false;
        this.clearSelection();
        this.__hideOptions();
    }

    enable() {
        this.enabled = true;
        this.clearSelection();
    }

    /* ----- Private Methods ----- */

    // In our case, the text and value are always the same so we don't
    // REALLY need separate methods, but this could be a useful general
    // class later on, so we'll keep them separate.

    __getSelectionText() {
        const menuButton = this.querySelector('custom-menu-button');
        if (menuButton) {
            const selection = menuButton.querySelector('custom-menu-button-selection');
            if (selection) {
                return selection.textContent;
            } else {
                console.error("CustomMenu.__getSelectionText(): Did not find selection");
                return null;
            }
        } else {
            console.error("CustomMenu.__getSelectionText(): Did not find menuButton");
            return null;
        }
    }

    __getSelectionValue() {
        return null;
        const selectedLabel = this.querySelector('label.selected');

        if (selectedLabel) {
            const selectedInput = selectedLabel.querySelector('input');
            if (selectedInput) {
                return selectedInput.value;
            } else {
                console.error("CustomMenu.__getSelectionValue(): Did not find selectedInput");
                return null;
            }
        } else {
            console.error("CustomMenu.__getSelectionValue(): Did not find selectedLabel");
            return null;
        }
    }

    __hideOptions() {
        this.querySelector('custom-menu-options')
            .classList.add('hidden');
    }

    __showOptions() {
        this.querySelector('custom-menu-options')
            .classList.toggle('hidden');
    }
}

customElements.define("custom-menu", CustomMenu);




export { Picker };
