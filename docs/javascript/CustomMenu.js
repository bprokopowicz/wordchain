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

export { CustomMenu };
