import { COV } from './Coverage.js';
// This class is all static methods that relate to finding,
// checking, setting aspects of HTML elements.
class ElementUtilities {

    static addBreak(element) {
        // A div with class "break" forces whatever comes after this div
        // to be on a "new line" when the containing div is display: flex.
        // See: https://tobiasahlin.com/blog/flexbox-break-to-new-row/
        ElementUtilities.addElementTo("div", element, {class: "break"});
    }

    static addClass(element, classNameOrList) {
        const CL = "ElementUtilities.addClass";
        COV(0, CL);

        let elementClass = element.getAttribute('class'),
            className,
            classesToAdd;

        if (typeof classNameOrList === 'string') {
            COV(1, CL);
            classesToAdd = [classNameOrList];
        } else {
            COV(2, CL);
            classesToAdd = classNameOrList;
        }

        for (className of classesToAdd)
        {
            if (elementClass === null) {
                COV(3, CL);
                elementClass = className;
            } else {
                COV(4, CL);
                elementClass += ` ${className}`;
            }
        }

        COV(5, CL);
        element.setAttribute('class', elementClass);
    }

    // This utility only takes a single class name, not a list like other methods here.
    static hasClass(element, className) {
        const CL = "ElementUtilities.hasClass";
        COV(0, CL);
        const classes = element.getAttribute('class');
        if (classes == null) {
            COV(1, CL);
            return false;
        }
        COV(2, CL);
        return (classes.indexOf(className) >= 0);
    }

    static addElement(elementType, attributes=null, innerHTML=null) {
        const CL = "ElementUtilities.addElement";
        COV(0, CL);
        return ElementUtilities.addElementTo(elementType, document.body, attributes, innerHTML);
    }

    static addElementTo(elementType, parent, attributes=null, innerHTML=null) {
        const CL = "ElementUtilities.addElementTo";
        COV(0, CL);
        let element;

        // If it's an object, assume the element we're adding has already been created and just append it.
        if (typeof elementType === "string") {
            COV(1, CL);
            element = ElementUtilities.createElement(elementType, attributes, innerHTML)
        } else {
            COV(2, CL);
            element = elementType;
        }

        COV(3, CL);
        parent.appendChild(element);

        return element;
    }

    static createElement(elementType, attributes=null, innerHTML=null) {
        const CL = "ElementUtilities.createElement";
        COV(0, CL);
        const svgElements = ["svg", "path"];

        let element;
        if (svgElements.includes(elementType)) {
            COV(1, CL);
            element = document.createElementNS("http://www.w3.org/2000/svg", elementType);
        } else {
            COV(2, CL);
            element = document.createElement(elementType);
        }

        for (let attribute in attributes) {
            element.setAttribute(attribute, attributes[attribute]);
        }

        if (innerHTML !== null) {
            COV(3, CL);
            element.innerHTML = innerHTML;
        }

        COV(4, CL);
        return element;
    }

    static deleteChildren(element) {
        const CL = "ElementUtilities.deleteChildren";
        COV(0, CL);
        if (element) {
            COV(1, CL);
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
        }
    }

    static disableButton(button) {
        const CL = "ElementUtilities.disableButton";
        COV(0, CL);
        button.disabled = true;
    }

    static enableButton(button) {
        const CL = "ElementUtilities.enableButton";
        COV(0, CL);
        button.disabled = false;
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
        const CL = "ElementUtilities.editClass";
        COV(0, CL);

        if (! (elements instanceof Array)) {
            COV(1, CL);
            elements = [elements];
        }

        for (let element of elements) {
            let elementClass = element.getAttribute('class');
            elementClass = elementClass.replace(fromPattern, toString);
            element.setAttribute('class', elementClass);
        }
        COV(2, CL);
    }

    // Not currently used.
    static isHidden(element) {
        return element.style.visibility === "hidden";
    }

    static hide(element) {
        element.setAttribute("style", "display: none;");
    }

    static removeClass(element, classNameOrList) {
        const CL = "ElementUtilities.removeClass";
        COV(0, CL);

        let elementClasses = element.getAttribute('class').split(' '),
            newElementClass = null,
            className,
            classesToRemove;

        if (typeof classNameOrList === 'string') {
            COV(1, CL);
            classesToRemove = [classNameOrList];
        } else {
            COV(2, CL);
            classesToRemove = classNameOrList;
        }

        for (className of elementClasses)
        {
            // If we don't find this class in the classes to remove,
            // added it to the new element class.
            if (classesToRemove.indexOf(className) < 0)
            {
                if (newElementClass === null) {
                    COV(3, CL);
                    newElementClass = className;
                } else {
                    COV(4, CL);
                    newElementClass += ` ${className}`;
                }
            }
        }

        COV(5, CL);
        element.setAttribute('class', newElementClass);
    }

    static setButtonCallback(buttonElement, callbackObj, callbackFunc) {
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
        // The "real callback" passed to us is a naked function (no this).  So
        // we supply the object to call the function on by binding it.

        const CL = "ElementUtilities.setButtonCallback";
        COV(0, CL);
        var boundCallbackFunc = callbackFunc.bind(callbackObj);

        function localCallback(theEvent) {
            COV(1, CL);
            const isSafari = navigator.vendor.toLowerCase().includes("apple");
            var clickEvent;
            if (isSafari) {
                COV(1, CL);
                if (navigator.appVersion.toLowerCase().includes("mac os")) {
                    // Safari on MacOS sends MouseEvent, not PointerEvent -- and doesn't define TouchEvent!
                    // so "theEvent instanceof TouchEvent" results in a syntax error "can't find variable
                    // TouchEvent". Sigh!
                    clickEvent = MouseEvent;
                } else {
                    COV(2, CL); 
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
                COV(3, CL); 
                boundCallbackFunc(theEvent);
            }
        }

        // Now, assign our localCallback to all the events of interest.
        // the {passive: true} argument shuts up thousands of violation warnings in Chrome:
        // "Added non-passive event listener to a scroll-blocking 'touchstart' event...."

        buttonElement.addEventListener("touchstart", localCallback, {passive: true});
        buttonElement.addEventListener("click", localCallback, {passive: true});
        buttonElement.addEventListener("keyup", localCallback, {passive: true});
        buttonElement.addEventListener("keydown", localCallback, {passive: true});
        COV(4, CL); 
    }

    // Used only in Test.js.
    static setElementHTML(elementId, elementHTML) {
        const element = ElementUtilities.getElement(elementId);
        element.innerHTML = elementHTML;
    }

    static setElementText(element, elementText) {
        const CL = "ElementUtilities.setElementText";
        COV(0, CL);
        element.innerHTML = elementText;
    }

    static show(element, display="flex") {
        const CL = "ElementUtilities.show";
        COV(0, CL);
        element.setAttribute("style", `display: ${display};`);
    }

}

export { ElementUtilities };
