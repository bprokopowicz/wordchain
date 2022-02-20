class WordChainDict {
    constructor() {
        this.loadDict();  
    }

    async fetchText(filePath) {
        let response = await fetch(filePath);
        console.log("response: ",response.status, response.statusText); // 200 OK
        let data = await response.text();
        return data;
    }

    async loadDict() {
        let wordFileText = await this.fetchText("http://localhost:8000/dict/WordFreq38807");
        let wordList = wordFileText.split("\n");
        wordList.pop();
        this.wordSet = new Set(wordList);
        console.log(this.wordSet.size);
    }

    isWord() {
        let theWordElement = document.getElementById("theWord");
        let theWord = theWordElement.value;
        let result = this.wordSet.has(theWord);

        let theAnswerElement = document.getElementById("answer");
        theAnswerElement.innerHTML = (
            result
                ? `Yes, '${theWord}' is a word!` 
                : `Sorry, '${theWord}' is not a word.`
                );
    }
};

var dictionary = new WordChainDict();

