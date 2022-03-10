import { BaseLogger } from './BaseLogger.js';
import { WordChainDict } from './WordChainDict.js';
import { Solver } from './Solver.js';
import { Game } from './Game.js';

// Forwarding functions; see big comment below explaining how
// these came about.

function startGameCallback() {
    Display.singleton().startGameCallback();
}

function playCallback() {
    Display.singleton().playCallback();
}

// Singleton class Display.

class Display extends BaseLogger {
    static singletonObject = null;

    constructor() {
        super();

        this.dict = new WordChainDict();
    }

    static singleton() {
        if (Display.singletonObject === null) {
            Display.singletonObject = new Display();
        }
        return Display.singletonObject;
    }

    /*
    ** GLdisplayType === prototype
    */

    prototypeGame() {
        this.game = null;
        this.addElement("h2", {}, "WordChain");
        this.addElement("label", {}, "Start word: ");
        this.addElement("input", {id: "gameStartWord", type: "text"});
        this.addElement("p");
        this.addElement("label", {}, "Target word: ");
        this.addElement("input", {id: "gameTargetWord", type: "text"});
        this.addElement("p");
        this.addElement("button", {id: "startGame"}, "Start Game");

        // When this.startGameCallback is passed as the listener, Chrome appears
        // to call it (but refers to it as HTMLButtonElement.stargGameCallback)
        // and "this" within the method is of type HTMLButtonElement, so the call
        // within to "this.checkWord()" resolves to HTMLButtonElement.checkword,
        // which is is not a function. This kind of makes sense (except for why it
        // was able to call the Display.startGameCallback() method at all!).
        //
        // At that point I introduced the singleton idea. I thought that passing
        // Display.singleton().startGameCallback as the listener would work,
        // but this also resulted in "HTMLButtonElement.checkWord() is not a
        // function." Sigh. I really don't understand why that is not working.
        // But we carry on; introducing the "forwarding function" did the trick.
        this.getElement("startGame").addEventListener("click", startGameCallback);
    }

    startGameCallback() {
        const startWord = this.checkWord("gameStartWord")
        if (! startWord) {
            alert("Invalid starting word.");
            return;
        }

        const targetWord = this.checkWord("gameTargetWord")
        if (! targetWord) {
            alert("Invalid target word.");
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
        this.addElement("button", {id: "play"}, "Play!");
        this.addElement("p");
        this.addElement("label", {}, "Solution in progress:");
        this.addElement("p");
        this.addElement("label", {id: "solution"}, gameStepsHtml);

        this.getElement("play").addEventListener("click", playCallback);
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

export { Display };

if (GLdisplayType === "prototype") {
    Display.singleton().prototypeGame();
} else if (GLdisplayType === "real") {
    Display.singleton().realGame();
}
