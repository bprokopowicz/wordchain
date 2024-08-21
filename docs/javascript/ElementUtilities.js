// This class is all static methods that relate to finding,
// checking, setting aspects of HTML elements.
class ElementUtilities {

    static addClass(element, classNameOrList) {

        let elementClass = element.getAttribute('class'),
            className,
            classes;

        if (typeof classNameOrList === 'string') {
            classes = [classNameOrList];
        } else {
            classes = classNameOrList;
        }

        for (className of classes)
        {
            if (elementClass === null) {
                elementClass = className;
            } else {
                elementClass += ` ${className}`;
            }
        }

        element.setAttribute('class', elementClass);
    }

    static addElement(elementType, attributes=null, innerHTML=null) {
        return ElementUtilities.addElementTo(elementType, document.body, attributes, innerHTML);
    }

    static addElementTo(elementType, parent, attributes=null, innerHTML=null) {
        let element;

        // If it's an object, assume the element we're adding has already been created and just append it.
        if (typeof elementType === "string") {
            element = ElementUtilities.createElement(elementType, attributes, innerHTML)
        } else {
            element = elementType;
        }

        parent.appendChild(element);

        return element;
    }

    static createElement(elementType, attributes=null, innerHTML=null) {
        const svgElements = ["svg", "path"];

        let element;
        if (svgElements.includes(elementType)) {
            element = document.createElementNS("http://www.w3.org/2000/svg", elementType);
        } else {
            element = document.createElement(elementType);
        }

        for (let attribute in attributes) {
            element.setAttribute(attribute, attributes[attribute]);
        }

        if (innerHTML !== null) {
            element.innerHTML = innerHTML;
        }

        return element;
    }

    static deleteChildren(element) {
        if (element) {
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
        }
    }

    // Used only in Test.js
    static getElement(elementId, mustExist=true) {
        const element = document.getElementById(elementId);
        if (mustExist && !element) {
            throw new Error(`ElementUtilities.getElement(): no element with id ${elementId}`);
        }   
        return element;
    }   

    // Used only in Test.js.
    static getElementValue(elementId) {
        const element = ElementUtilities.getElement(elementId);
        return element.value;
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

    // Not currently used.
    static isHidden(element) {
        return element.style.visibility === "hidden";
    }

    static hide(element) {
        element.setAttribute("style", "display: none;");
    }

    static setButtonCallback(buttonElement, callback) {
        // When button is clicked (in Chrome on MacOS) we get a PointerEvent. When you hit RETURN
        // after clicking a button **while the mouse is still in the button** the button retains
        // focus, and a subsequent RETURN results in BOTH a PointerEvent and a KeyboardEvent.
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
            const isSafari = navigator.vendor.toLowerCase().includes("apple");
            var clickEvent;
            if (isSafari) {
                if (navigator.appVersion.toLowerCase().includes("mac os")) {
                    // Safari on MacOS sends MouseEvent, not PointerEvent -- and doesn't define TouchEvent!
                    // so "theEvent instanceof TouchEvent" results in a syntax error "can't find variable
                    // TouchEvent". Sigh!
                    clickEvent = MouseEvent;
                } else {
                    // However, Safari on iOS sends TouchEvent when a button is tapped.
                    clickEvent = TouchEvent;
                }
            }
            // Chrome (on MacOS, at least) sends PointerEvent when a button is clicked;
            // PointerEvent is derived from MouseEvent, so we don't want to check clickEvent
            // if the browser is Safari ... sigh!.
            if ((isSafari && theEvent instanceof clickEvent) ||
                ((theEvent instanceof PointerEvent) &&
                 (theEvent.pointerType.length !== 0))) {
                callback(theEvent);
            }
        }

        // Now, assign our localCallback to all the events of interest.
        buttonElement.addEventListener("touchstart", localCallback);
        buttonElement.addEventListener("click", localCallback);
        buttonElement.addEventListener("keyup", localCallback);
        buttonElement.addEventListener("keydown", localCallback);
    }

    // Used only in Test.js.
    static setElementHTML(elementId, elementHTML) {
        const element = ElementUtilities.getElement(elementId);
        element.innerHTML = elementHTML;
    }

    static setElementText(element, elementText) {
        element.innerHTML = elementText;
    }

    static show(element, display="flex") {
        element.setAttribute("style", `display: ${display};`);
    }

}

export { ElementUtilities };
