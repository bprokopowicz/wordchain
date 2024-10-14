import { AuxiliaryDisplay } from './AuxiliaryDisplay.js';
import { Persistence } from './Persistence.js';
import { ElementUtilities } from './ElementUtilities.js';
import * as Const from './Const.js';

class SettingsDisplay extends AuxiliaryDisplay {

    constructor(buttonContainer, buttonSvgPath, parentContainer, saveRestoreContainers, appDisplay) {
        super(buttonContainer, buttonSvgPath, parentContainer, saveRestoreContainers);

        // AppDisplay object so callbacks can call its methods to respond
        // to settings changes.
        this.appDisplay = appDisplay;

        ElementUtilities.addClass(this.contentContainer, 'settings-content-container');

        ElementUtilities.addElementTo("h1", this.contentContainer, {align: "center"}, "SETTINGS");

        // All the settings will be added to the content container created in
        // the base class constructor.
        this.addCheckboxSetting("Dark Theme",      "dark",       appDisplay.isDarkTheme());
        this.addCheckboxSetting("Colorblind Mode", "colorblind", appDisplay.isColorblindMode());

        /*
        const radioInfo = [{
                value:   "Normal",
                desc:    "<b>Normal:</b> Letter-change steps are indicated with a thick outline",
                checked: !(this.hardMode || this.typeSavingMode),
            }, {
                value:   "Type-Saving",
                desc:    "<b>Type-Saving:</b> Saves typing by filling in known letters",
                checked: this.typeSavingMode,
            }, {
                value:   "Hard",
                desc:    "<b>Hard:</b> No automatically filled letters or thick outline",
                checked: this.hardMode,
            }
        ]
        const gamePlayModeDescription = "Which way do you want to play?"
        this.addRadioSetting("Game Play Mode", radioInfo, "game-play-mode", gamePlayModeDescription, this.radioCallback);
        */

        const feedbackDescription = "Dictionary suggestions? Gripes? Things you love? Feature ideas?";
        const faqDescription = "Everything you want to know and then some!";
        this.addLinkSetting("Feedback",   "Email", Const.EMAIL_HREF, feedbackDescription);
        this.addLinkSetting("Questions?", "FAQ",   Const.FAQ_HREF, faqDescription);
    }

    // Add a setting to content container.
    addSetting(title, settingClass, description="") {
        // Create a div for one setting.
        const settingDiv = ElementUtilities.addElementTo("div", this.contentContainer, {class: settingClass});

        // Create a div for just the text to be displayed.
        const textDiv = ElementUtilities.addElementTo("div", settingDiv, {class: "setting-text"});
        ElementUtilities.addElementTo("div", textDiv, {class: "setting-title"}, title);
        ElementUtilities.addElementTo("div", textDiv, {class: "setting-description"}, description);

        // Create and return a div to hold the interactive part.
        return ElementUtilities.addElementTo("div", settingDiv, {});
    }

    getAppDisplay() {
        return this.appDisplay;
    }

    // Add a setting whose input is a checkbox.
    addCheckboxSetting(title, id, value) {
        // setting-simple class styles the contents of the setting (title/description,
        // checkbox input) horizontally.
        const interactiveDiv = this.addSetting(title, "setting-simple");

        const checkbox = ElementUtilities.addElementTo("input", interactiveDiv,
            {type: "checkbox", id: id, class: "setting-checkbox"});

        checkbox.addEventListener("change", this.checkboxCallback.bind(this));
        checkbox.checked = value;
    }

    // Add a setting whose "input" is clicking a link.
    addLinkSetting(title, linkText, linkHref, description) {
        // setting-simple class styles the contents of the setting (title/description, link)
        // horizontally.
        const interactiveDiv = this.addSetting(title, "setting-simple", description);
        ElementUtilities.addElementTo("a", interactiveDiv, {href: linkHref, target: "_blank"}, linkText);
    } 

    /*
    // Add a setting whose input is a (mutually exclusive) set of radio buttons.
    addRadioSetting(title, radioInfoList, radioName, description, callbackFunction) {
        // setting-complex class styles the contents of the setting (title/description, radio inputs
        // and their labels) vertically, i.e. title/description on one line, then each input on
        // a subsequent line.
        const interactiveDiv = this.addSetting(title, "setting-complex", description);

        // To get nice formatting, especially on smaller devices where the description will wrap,
        // create a table.
        const table = ElementUtilities.addElementTo("table", interactiveDiv, {class: "radio-container"});

        // radioInfoList is a list of objects containing properties: id, description, and checked.
        for (let radioInfo of radioInfoList) {
            // One row for each option.
            const tableRow = ElementUtilities.addElementTo("tr", table, {});

            // Column 1: the radio input. Set its checked attribute according to the info,
            // and add an event listener to handle changes to it. We'll use the same listener
            // for all the radio inputs.
            const tdCol1 = ElementUtilities.addElementTo("td", tableRow, {});
            const radio = ElementUtilities.addElementTo("input", tdCol1,
                {value: radioInfo.value, name: radioName, class: "setting-radio", type: "radio"});
            radio.checked = radioInfo.checked;

            radio.addEventListener("change", callbackFunction.bind(this));

            // Column 2: the description of the radio item.
            const tdCol2 = ElementUtilities.addElementTo("td", tableRow, {});
            ElementUtilities.addElementTo("label", tdCol2, {class: "radio-label"}, radioInfo.desc);
        }
    }
    */

    /*
    ** ----- Callbacks -----
    */

    // Callback for Settings checkbox changes.
    checkboxCallback(event) {

        // The id attribute in the event's srcElement property tells us which setting whas changed.
        const checkboxId = event.srcElement.getAttribute("id");

        // The checked attribute in the event's srcElement property tells us whether the
        // checkbox was checked or unchecked. Set the boolean corresponding to the
        // checkbox's id according to that.
        if (checkboxId === "dark") {
            this.appDisplay.darkTheme = event.srcElement.checked ? true : false;
            Persistence.saveDarkTheme(this.appDisplay.darkTheme);
            this.appDisplay.setColors();

        } else if (checkboxId === "colorblind") {
            this.appDisplay.colorblindMode = event.srcElement.checked ? true : false;
            Persistence.saveColorblindMode(this.appDisplay.colorblindMode);
            this.appDisplay.setColors();
        }
    }

    /*
    deprecated - no modes as of Oct 2024.
    // Callback for Settings radio button changes.
    radioCallback(event) {

        const selection = event.srcElement.value;
        if (selection == "Hard") {
            this.appDisplay.hardMode = true;
            this.appDisplay.typeSavingMode = false;
        } else if (selection === "Type-Saving") {
            this.appDisplay.typeSavingMode = true;
            this.appDisplay.hardMode = false;
        } else {
            this.appDisplay.typeSavingMode = false;
            this.appDisplay.hardMode = false;
        }

        // Save both cookies.
        Cookie.save(Cookie.HARD_MODE, this.appDisplay.hardMode);
        Cookie.save(Cookie.TYPE_SAVING_MODE, this.appDisplay.typeSavingMode);

        // Hard and Type-Saving modes are implemented in the game tile display,
        // so tell it what our modes are now.
        // ========= Will need to figure out what the v2 equivalent of this is.
        this.appDisplay.gameTileDisplay.setHardMode(this.appDisplay.hardMode);
        this.appDisplay.gameTileDisplay.setTypeSavingMode(this.appDisplay.typeSavingMode);
    }
    */

}

export { SettingsDisplay };
