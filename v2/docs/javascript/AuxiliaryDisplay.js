import { ElementUtilities } from './ElementUtilities.js';
import * as Const from './Const.js';

class AuxiliaryDisplay {

    /* ----- Construction ----- */

    constructor(buttonContainer, buttonSvgPath, parentContainer, saveRestoreContainers) {
        this.saveRestoreContainers = saveRestoreContainers;

        // This is the button that will be clicked to display the auxiliary screen.
        this.displayButton = this.createSvgButton(buttonContainer, "aux-button", this.openAuxiliaryCallback, buttonSvgPath);
        this.displayButton.callbackAccessor = this;

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
        this.closeButton = this.createSvgButton(closeButtonContainer, "close-button", this.closeAuxiliaryCallback, Const.CLOSE_PATH);
        this.closeButton.callbackAccessor = this;

        // Add a break so that the content appears below the close button.
        ElementUtilities.addElementTo("div", this.contentContainer, {class: "break"});
    }

    // This is a common method for creating a button that has an SVG image
    // (as opposed to just text).
    createSvgButton(buttonContainer, buttonClass, buttonCallback, svgPath, relatedDiv="") {
        // Create the button itself.
        const button = ElementUtilities.addElementTo("button", buttonContainer, {class: buttonClass});

        // Now, the create the svg element.
        // TODO: Should make the width controllable.
        const svg = ElementUtilities.addElementTo("svg", button,
            {viewBox: "0 0 24 24", style: "width: 24; height: 24;", stroke: "None",});

        // Finally, add the path, whose "d" attribute is passed to us
        // using the big, ugly class constants.
        const path = ElementUtilities.addElementTo("path", svg, {d: svgPath});

        // Save 'this' in the button, svg, and path elements so that we can access this
        // object in the callbacks (via event.srcElement.callbackAccessor). The event may
        // occur on any of these elements, so we need to add the callback to all of them.
        // This causes some unfortunate complexities in the callbacks ...
        for (let element of [button, svg, path]) {
            element.callbackAccessor = this;
            ElementUtilities.setButtonCallback(element, buttonCallback);
        }

        return button;
    }

    /* ----- Callbacks ----- */

    // Callback for closing an Auxiliary screen.
    closeAuxiliaryCallback(event) {
        // When the button was created with createSvgButton() we saved 'this'
        // as callbackAccessor on the button; use it to access other instance data.
        const me = event.srcElement.callbackAccessor;
        //console.log("closeAuxiliaryCallback(): me.isOpen:", me.isOpen, ", event:", event);

        // By necessity, we have attached this callback to multiple elements that
        // comprise the close button. Any combination of them may generate an event,
        // but we only want to respond to it on the first one. If the display is NOT
        // open it means this is not the first call for the user's click, so we just
        // return now.
        if (! me.isOpen) {
            return;
        }

        // If the derived class defined a function to do additional things on closure,
        // call the function.
        if (me.additionalCloseActions) {
            me.additionalCloseActions();
        }

        // Now set the flag to prevent another call from doing anything.
        me.isOpen = false;

        // Hide the auxiliary screen.
        me.auxiliaryContainer.style.display = "none";

        // Now restore the containers that we saved when the auxiliary screen was opened.
        me.restoreHiddenContainers();
    }

    // Callback for opening an Auxiliary screen.
    openAuxiliaryCallback(event) {
        // When the button was created with createSvgButton() we saved 'this'
        // as callbackAccessor on the button; use it to access other instance data.
        const me = event.srcElement.callbackAccessor;
        //console.log("openAuxiliaryCallback(): me.isOpen:", me.isOpen, ", event:", event);

        // By necessity, we have attached this callback to multiple elements that
        // comprise the button that opens this display. Any combination of them may
        // generate an event, but we only want to respond to it on the first one.
        // If the display is ALREADY open it means this is not the first call for
        // the user's click, so we just return now.
        if (me.isOpen) {
            return;
        }

        // If the derived class defined a function to do additional things on open,
        // call the function.
        if (me.additionalOpenActions) {
            me.additionalOpenActions();
        }

        // Now set the flag to prevent another call from doing anything.
        me.isOpen = true;

        // Hide the containers that are currently showing and save information
        // so we can restore them, and restore this one.
        me.hideShownContainers();
        ElementUtilities.show(me.auxiliaryContainer);
    }

    /* ----- Utilities ----- */

    // Hide shown containers` while showing an auxiliary screen.
    // Keep track of what containers were showing so they can be restored.
    hideShownContainers() {
        // To be saved for restoreHiddenContainers() to use.
        this.activeContainers = [];

        // Go through all the containers that were given to us in the constructor.
        for (let container of this.saveRestoreContainers) {
            // Get the current style on the container.
            const containerStyle = container.getAttribute("style");

            // If the "style" attribute does NOT have "none" in it,
            // then it is showing; save it.
            if (! containerStyle.includes("none")) {
                this.activeContainers.push(container);

                // Set the attribute "data-save-style" on the container, which will be
                // used to restore the container. Then hide the container.
                container.setAttribute("data-save-style", containerStyle);
                ElementUtilities.hide(container);
            }
        }
    }

    // Restore containers hidden with hideShownContainers().
    restoreHiddenContainers() {
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
