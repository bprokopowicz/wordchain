import { ElementUtilities } from './ElementUtilities.js';
import * as Const from './Const.js';

class AuxiliaryDisplay {

    constructor(buttonContainer, buttonSvgPath, parentContainer, saveRestoreContainers) {
        this.saveRestoreContainers = saveRestoreContainers;

        // This is the button that will be clicked to display the auxiliary screen.
        this.displayButton = this.createSvgButton(buttonContainer, "aux-button", this.openAuxiliaryCallback, buttonSvgPath);
        this.displayButton.callbackAccessor = this;

        // This div is the one we style as none or flex to hide/show the div (always none at first).
        // It will be centered in its parent div because of how root-div is styled.
        this.auxiliaryContainer = ElementUtilities.addElementTo("div", parentContainer, {class: "auxiliary-div"});
        this.auxiliaryContainer.style.display = "none";

        // This div will be centered within its parent div (because of how auxiliary-div is styled).
        this.contentContainer = ElementUtilities.addElementTo("div", this.auxiliaryContainer, {class: "auxiliary-container-div"});

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

        /*
        // Save 'this' in the button element so that we can access it in the callback
        // (via event.srcElement.callbackAccessor).
        button.callbackAccessor = this;
        ElementUtilities.setButtonCallback(button, buttonCallback);
        */
    
        // Now, the create the svg element.
        // TODO: Should make the width controllable.
        const svg = ElementUtilities.addElementTo("svg", button,
            {viewBox: "0 0 24 24", style: "width: 24; height: 24;", stroke: "None",});
        
        svg.callbackAccessor = this;
        ElementUtilities.setButtonCallback(svg, buttonCallback);

        // Finally, add the path, whose "d" attribute is passed to us
        // using the big, ugly class constants.
        const path = ElementUtilities.addElementTo("path", svg, {d: svgPath});

        path.callbackAccessor = this;
        ElementUtilities.setButtonCallback(path, buttonCallback);

        return button;
    }   

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
                // used to restore the container.
                container.setAttribute("data-save-style", containerStyle);

                // And hide it.
                container.setAttribute("style", "display: none;");
            }
        }
    }

    // Restore containers hidden with hideShownContainers().
    restoreHiddenContainers() {
        for (let div of this.activeContainers) {
            // Get the attribute that we saved so we know what style to put on the div.
            const containerStyle = div.getAttribute("data-save-style");

            /*
            ========== Still need to deal with this? How? This is not the right place!
            ========== Maybe an additional function passed to ctor to call? closeScreenAction()
            // If restoring game-div, update the colors affected  by settings
            // and update the game display to make those changes take effect.
            if (div.getAttribute("id") == "game-div") {
                this.setColors();
                this.updateGameDisplay();
            }
            */

            // Now set the attribute, which will show the div.
            div.setAttribute("style", containerStyle);
        }
    }

    /*
    ** ----- Callbacks -----
    */

    // Callback for closing an Auxiliary screen.
    closeAuxiliaryCallback(event) {
        // When the button was created with createSvgButton() we saved 'this'
        // as callbackAccessor on the button; use it to access other instance data.
        const callbackAccessor = event.srcElement.callbackAccessor;

        // Hide the auxiliary screen.
        callbackAccessor.auxiliaryContainer.style.display = "none";
        
        // Now restore the containers that we saved when the auxiliary screen was opened.
        callbackAccessor.restoreHiddenContainers();
    }           
                
    // Callback for opening an Auxiliary screen.
    openAuxiliaryCallback(event) {
        console.log("openAuxiliaryCallback():", event);
        // When the button was created with createSvgButton() we saved 'this'
        // as callbackAccessor on the button; use it to access other instance data.
        const callbackAccessor = event.srcElement.callbackAccessor;
        
        // Hide the containers that are currently showing and save information
        // so we can restore them.
        callbackAccessor.hideShownContainers();
        
        /*
        ========== Still need to deal with this? How? This is not the right place!
        ========== Maybe an additional function passed to ctor to call? openScreenAction()
        if (sourceElementId === "stats-div") {
            this.updateStatsContent();
            this.startCountdownClock();
        }
        */

        callbackAccessor.auxiliaryContainer.style.display = "flex";
    }
}

export { AuxiliaryDisplay };
