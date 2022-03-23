// This class is all static methods that relate to finding,
// checking, setting aspects of HTML elements.
class ElementUtilities {
    static addElement(elementType, attributes=null, innerHTML=null) {
        ElementUtilities.addElementTo(elementType, document.body, attributes, innerHTML);
    }

    static addElementTo(elementType, parent, attributes=null, innerHTML=null) {
        const element = document.createElement(elementType);
        for (let attribute in attributes) {
            element.setAttribute(attribute, attributes[attribute]);
        }

        if (innerHTML !== null) {
            element.innerHTML = innerHTML;
        }

        parent.appendChild(element);

        return element;
    }

    static deleteChildren(element) {
        if (element) {
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
        }
    }

    static editClass(fromPattern, toString, elements) {

        if (! (elements instanceof Array)) {
            elements = [elements];
        }

        for (let element of elements) {
            let elementClass = element.getAttribute('class');
            elementClass = elementClass.replace(fromPattern, toString);
            element.setAttribute('class', elementClass);
        }
    }

    static getElement(elementId, mustExist=true) {
        const element = document.getElementById(elementId);
        if (mustExist && !element) {
            throw new Error(`ElementUtilities.getElement(): no element with id ${elementId}`);
        }
        return element;
    }

    // Currently used only in Test.js.
    static getElementValue(elementId) {
        const element = ElementUtilities.getElement(elementId);
        return element.value;
    }

    static isHidden(element) {
        return element.style.display === "none";
    }

    static isLetter(letter) {
        // JavaScript doesn't have this builtin!
        return letter.length === 1 && letter.match(/[a-z]/i);
    }   

    static setButtonCallback(buttonElement, callback) {
        // When button is clicked we get a PointerEvent. When you hit RETURN after clicking
        // a button **while the mouse is still in the button** the button retains focus,
        // and a subsequent RETURN results in BOTH a PointerEvent and a KeyboardEvent.
        // When you click a button "normally" (mouse or touch) you just get a PointerEvent.
        // We want to react to the PointerEvents that are from a mouse/touch click, but not
        // those that are from pressing RETURN (because in the case of the practice div,
        // for example, because a RETURN while specifying the start/target words should
        // result in a keyboard entry that is handled by the window's event listener,
        // not the button's. It turns out that a PointerEvent has a field pointerType
        // that has one of the values: mouse, pen, or touch; if it came from anywhere
        // else it is the empty string. Hurray! We can use this to distinguish which pointer
        // event is which!

        // Define a function that we will assign to click and key events on the
        // button element. If we got PointerEvent with a non-empty pointerType
        // we'll call the "real callback" and otherwise we simply ignore the event.
        function localCallback(theEvent) {
            if ((theEvent instanceof PointerEvent) &&
                (theEvent.pointerType.length !== 0)) {
                callback();
            }
        }

        // Now, assign our localCallback to all the events of interest.
        buttonElement.addEventListener("click", localCallback);
        buttonElement.addEventListener("keyup", localCallback);
        buttonElement.addEventListener("keydown", localCallback);
    }

    // Currently used only in Test.js.
    static setElementHTML(elementId, elementHTML) {
        const element = ElementUtilities.getElement(elementId);
        element.innerHTML = elementHTML;
    }

    // Currently not used.
    static setElementValue(elementId, elementValue) {
        const element = ElementUtilities.getElement(elementId);
        element.value = elementValue;
    }
}

export { ElementUtilities };
