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

    static getElementValue(elementId) {
        const element = ElementUtilities.getElement(elementId);
        return element.value;
    }

    // Currently used only in Test.js.
    static setElementHTML(elementId, elementHTML) {
        const element = ElementUtilities.getElement(elementId);
        element.innerHTML = elementHTML;
    }

    static setElementValue(elementId, elementValue) {
        const element = ElementUtilities.getElement(elementId);
        element.value = elementValue;
    }
}

export { ElementUtilities };
