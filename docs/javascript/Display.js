// Singleton class Display.
class Display extends BaseLogger {
    constructor() {
        super();

        this.dict = new WordChainDict();
    }

    /*
    ** GLdisplayType === prototype
    */

    gameTest() {
        this.game = null;
        this.addElement("h2", {}, "WordChain");
        this.addElement("label", {}, "Start word: ");
        this.addElement("input", {id: "gameStartWord", type: "text"});
        this.addElement("p");
        this.addElement("label", {}, "Target word: ");
        this.addElement("input", {id: "gameTargetWord", type: "text"});
        this.addElement("p");
        this.addElement("button", {id: "startGame", onclick: "GLdisplay.startGameCallback()"}, "Start Game");
    }

    startGameCallback() {
        const startWord = this.checkWord("gameStartWord")
        if (! startWord) {
            alert("Starting word is empty or not a word.");
            return;
        }

        const targetWord = this.checkWord("gameTargetWord")
        if (! targetWord) {
            alert("Target word is empty or not a word.");
            return;
        }

        if (startWord === targetWord) {
            alert("Hollow congratulations for creating an already solved game.");
            return
        }

        const solution = Solver.fastSolve(this.dict, startWord, targetWord);

        if (!solution.success()) {
            alert("No solution! Please Pick new start and/or target words.")
            return;
        }


        this.game = new Game(this.dict, solution);
        const gameStepsHtml = this.stepsToHtml(this.game.showGame());

        // If we've already created the elements, just clear out the
        // word to enter and the solution in progress.
        if (this.elementExists("enterWord")) {
            this.setElementValue("enterWord", "");
            this.setElementHTML("solution", gameStepsHtml);
            return;
        }

        // Add elements for the actual game play.
        this.addElement("p");
        this.addElement("label", {}, "Enter next word: ");
        this.addElement("input", {id: "enterWord", type: "text"});
        this.addElement("button", {id: "play", onclick: "GLdisplay.playCallback()"}, "Play!");
        this.addElement("p");
        this.addElement("label", {}, "Solution in progress:");
        this.addElement("p");
        this.addElement("label", {id: "solution"}, gameStepsHtml);
    }

    playCallback() {
        const enteredWord = this.checkWord("enterWord");
        if (! enteredWord) {
            alert("Entered word is empty or not a word.")
            return;
        }

        const gameResult = this.game.playWord(enteredWord);

        if (gameResult !== Game.OK) {
            alert (gameResult);
        } else {
            let html = "";
            this.setElementHTML("solution", this.stepsToHtml(this.game.showGame()));
            if (this.game.isSolved()) {
                alert("Good job! You solved it!")
            }
        }
    }

    stepsToHtml(gameSteps) {
        let html = "";
        for (let i = 0; i < gameSteps.length; i++) {
            const gameStep = gameSteps[i];
            html += `[${i}] `;
            html += gameStep;
            html += "<br>";
        }

        return html;
    }

    /*
    ** GLdisplayType === realGame
    */

    /*
    ** Utilities
    */

    addElement(elementType, attributes=null, innerHTML=null, parent=null) {
        const element = document.createElement(elementType);
        for (let attribute in attributes) {
            element.setAttribute(attribute, attributes[attribute]);
        }

        if (innerHTML !== null) {
            element.innerHTML = innerHTML;
        }

        if (parent === null) {
            parent = document.body;
        }
        parent.appendChild(element);
    }

    checkWord(elementId) {
        let word = this.getElementValue(elementId);
        word = word.trim().toLowerCase();
        if (word.length === 0) {
            return null;
        }
        if (!this.dict.isWord(word)) {
            return null;
        }

        return word;
    }

    elementExists(elementId) {
        return document.getElementById(elementId) ? true : false;
    }

    getElement(elementId) {
        const element = document.getElementById(elementId);
        if (!element) {
            throw new Error(`Display.getElement(): no element with id ${elementId}`);
        }
        return element;
    }

    // Not currently used; may not need.
    getElementHTML(elementId) {
        const element = this.getElement(elementId);
        return element.innerHTML;
    }

    getElementValue(elementId) {
        const element = this.getElement(elementId);
        return element.value;
    }

    setElementHTML(elementId, elementHTML) {
        const element = this.getElement(elementId);
        element.innerHTML = elementHTML;
    }

    setElementValue(elementId, elementValue) {
        const element = this.getElement(elementId);
        element.value = elementValue;
    }
}

var GLdisplay = new Display();
if (GLdisplayType === "prototype") {
    GLdisplay.gameTest();
} // else if (GLdisplayType === "realGame") {
    // GLdisplay.realGame();
//}