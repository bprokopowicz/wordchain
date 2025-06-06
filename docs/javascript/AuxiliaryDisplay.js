import { BaseLogger } from './BaseLogger.js';
import { ElementUtilities } from './ElementUtilities.js';
import { COV } from './Coverage.js';
import * as Const from './Const.js';

class AuxiliaryDisplay extends BaseLogger {

    /* ----- Construction ----- */

    // buttonInfo is an object that will either have a 'text' or 'svg' property.
    constructor(buttonContainer, buttonInfo, parentContainer, saveRestoreContainers) {
        const CL = "AuxiliaryDisplay.constructor";
        COV(0, CL);
        super();

        this.saveRestoreContainers = saveRestoreContainers;

        // This is the button that will be clicked to display the auxiliary screen.
        this.createButton(buttonContainer, null, this, this.openAuxiliaryCallback, buttonInfo);

        // This div is the one we style as none or flex to hide/show the div (always none at first).
        // It will be centered in its parent div because of how it is styled.
        this.auxiliaryContainer = ElementUtilities.addElementTo("div", parentContainer, {class: "auxiliary-container-div"});
        this.auxiliaryContainer.style.display = "none";
        this.isOpen = false;

        // This div will be centered within its parent div (because of how auxiliary-container-div is styled).
        this.contentContainer = ElementUtilities.addElementTo("div", this.auxiliaryContainer, {class: "auxiliary-content-div"});

        // This div will be centered in its parent div because of how auxiliary-container-div is
        // styled, but its content (the button) will be right-justified in this div because of the
        // styling of close-button-div.
        const closeButtonContainer = ElementUtilities.addElementTo("div", this.contentContainer, {class: "close-button-div",});
        this.closeButton = this.createButton(closeButtonContainer, "aux-button close-button", this, this.closeAuxiliaryCallback, {svg: Const.CLOSE_PATH});

        // Add a break so that the content appears below the close button.
        ElementUtilities.addBreak(this.contentContainer);
    }

    // This is a common method for creating a button that is clicked to open
    // or close an auxiliary screen.
    createButton(buttonContainer, buttonClass, callbackObj, buttonCallbackFunc, buttonInfo) {
        const CL = "AuxiliaryDisplay.createButton";
        COV(0, CL);
        var button;

        // The buttonInfo object will either have a 'text' or 'svg' property.
        if (buttonInfo.text) {
            COV(1, CL);
            buttonClass = buttonClass ? buttonClass : 'aux-button aux-button-text';
            button = ElementUtilities.addElementTo("button", buttonContainer, {class: buttonClass}, buttonInfo.text);
            ElementUtilities.setButtonCallback(button, callbackObj, buttonCallbackFunc);
        } else {
            COV(2, CL);
            buttonClass = buttonClass ? buttonClass : 'aux-button aux-button-svg';
            button = ElementUtilities.addElementTo("button", buttonContainer, {class: buttonClass});

            // Now, the create the svg element.
            const svg = ElementUtilities.addElementTo("svg", button);

            // Finally, add the path, whose "d" attribute is passed to us
            // using the big, ugly class constants.
            const path = ElementUtilities.addElementTo("path", svg, {d: buttonInfo.svg});

            // Set callbacks for button, svg, and path
            for (let element of [button, svg, path]) {
                ElementUtilities.setButtonCallback(element, callbackObj, buttonCallbackFunc);
            }
        }

        COV(3, CL);
        return button;
    }

    /* ----- Callbacks ----- */

    // Callback for closing an Auxiliary screen.
    closeAuxiliaryCallback(unusedEvent) {
        const CL = "AuxiliaryDisplay.closeAuxiliaryCallback";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("closeAuxiliaryCallback(): this.isOpen:", this.isOpen, ", event:", unusedEvent, "callback");

        // By necessity, we have attached this callback to multiple elements that
        // comprise the close button. Any combination of them may generate an event,
        // but we only want to respond to it on the first one. If the display is NOT
        // open it means this is not the first call for the user's click, so we just
        // return now.
        if (! this.isOpen) {
            COV(1, CL);
            return;
        }

        // If the derived class defined a function to do additional things on closure,
        // call the function.
        if (this.additionalCloseActions) {
            COV(2, CL);
            this.additionalCloseActions();
        }

        COV(3, CL);

        // Now set the flag to prevent another call from doing anything.
        this.isOpen = false;

        // Hide the auxiliary screen.
        this.auxiliaryContainer.style.display = "none";

        // Now restore the containers that we saved when the auxiliary screen was opened.
        this.restoreHiddenContainers();
    }

    // Callback for opening an Auxiliary screen.
    openAuxiliaryCallback(unusedEvent) {
        const CL = "AuxiliaryDisplay.openAuxiliaryCallback";
        COV(0, CL);
        Const.GL_DEBUG && this.logDebug("openAuxiliaryCallback(): this.isOpen:", this.isOpen, ", event:", unusedEvent, "callback");

        // By necessity, we have attached this callback to multiple elements that
        // comprise the button that opens this display. Any combination of them may
        // generate an event, but we only want to respond to it on the first one.
        // If the display is ALREADY open it means this is not the first call for
        // the user's click, so we just return now.
        if (this.isOpen) {
            COV(1, CL);
            return;
        }

        // If the derived class defined a function to do additional things on open,
        // call the function.
        if (this.additionalOpenActions) {
            COV(2, CL);
            this.additionalOpenActions();
        }

        COV(3, CL);

        // Now set the flag to prevent another call from doing anything.
        this.isOpen = true;

        // Hide the containers that are currently showing and save information
        // so we can restore them, and restore this one.
        this.hideShownContainers();
        ElementUtilities.show(this.auxiliaryContainer);
    }

    /* ----- Utilities ----- */

    // Hide shown containers` while showing an auxiliary screen.
    // Keep track of what containers were showing so they can be restored.
    hideShownContainers() {
        const CL = "AuxiliaryDisplay.hideShownContainers";
        COV(0, CL);
        // To be saved for restoreHiddenContainers() to use.
        this.activeContainers = [];

        // Go through all the containers that were given to us in the constructor.
        for (let container of this.saveRestoreContainers) {
            // Get the current style on the container.
            const containerStyle = container.getAttribute("style");

            // If the "style" attribute does NOT have "none" in it,
            // then it is showing; save it.
            if (! containerStyle.includes("none")) {
                COV(1, CL);
                this.activeContainers.push(container);

                // Set the attribute "data-save-style" on the container, which will be
                // used to restore the container. Then hide the container.
                container.setAttribute("data-save-style", containerStyle);
                ElementUtilities.hide(container);
            }
        }
        COV(2, CL);
    }

    // Restore containers hidden with hideShownContainers().
    restoreHiddenContainers() {
        const CL = "AuxiliaryDisplay.restoreHiddenContainers";
        COV(0, CL);
        for (let div of this.activeContainers) {
            // Get the attribute that we saved so we know what style to put on the div.
            const containerStyle = div.getAttribute("data-save-style");

            // Now set the style attribute to what we'd saved, which will show the div.
            // And remove the data-save-style attribute because we don't need it anymore
            // and it screws things up when accessing the screen multiple times in a row.
            div.setAttribute("style", containerStyle);
            div.removeAttribute("data-save-style");
        }
    }
}

export { AuxiliaryDisplay };
