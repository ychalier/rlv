const LEXICON_PATH = "data/ouestfrance.json";


var CLUES = {};
var DOM_DIAGRAM = null;


function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}


function inflateDiagram(diagram) {
    let container = document.getElementById("diagram");
    DOM_DIAGRAM = [];
    container.innerHTML = "";
    diagram.grid.forEach((row, i) => {
        let rowEl = document.createElement("div");
        rowEl.className = "row";
        DOM_DIAGRAM.push([]);
        row.forEach(cell => {
            let cellEl = document.createElement("div");
            cellEl.className = "cell";
            if (cell == UNIT_BLOCKED) {
                cellEl.classList.add("blocked");
            } else {
                let input = document.createElement("input");
                cellEl.appendChild(input);
            }
            DOM_DIAGRAM[i].push(cellEl);
            rowEl.appendChild(cellEl);
        });
        container.appendChild(rowEl);
    });
}


function setClues() {
    let accross = [];
    let down = [];
    let start_squares = {};
    DIAGRAM.slots.forEach(slot => {
        if (slot.filled) {
            let entry = {
                ss: slot.start_square + 1,
                clue: choose(CLUES[slot.word])
            }
            if (!(slot.start_square in start_squares)) {
                start_squares[slot.start_square] = [slot.row, slot.col];
            }
            if (slot.accross) {
                accross.push(entry);
            } else {
                down.push(entry);
            }
        }
    });
    let container = document.getElementById("clues");
    container.innerHTML = "";
    container.innerHTML += "<b>Horizontal</b>";
    let accrossList = document.createElement("ol");
    accross.forEach(entry => {
        let el = document.createElement("li");
        el.value = entry.ss;
        el.textContent = capitalizeFirstLetter(entry.clue);
        accrossList.appendChild(el);
    });
    container.appendChild(accrossList);
    container.innerHTML += "<b>Vertical</b>";
    let downList = document.createElement("ol");
    down.forEach(entry => {
        let el = document.createElement("li");
        el.value = entry.ss;
        el.textContent = capitalizeFirstLetter(entry.clue);
        downList.appendChild(el);
    });
    container.appendChild(downList);
    for (let ss in start_squares) {
        let i = start_squares[ss][0];
        let j = start_squares[ss][1];
        let label = document.createElement("span");
        label.className = "start-square";
        label.textContent = (parseInt(ss) + 1).toString();
        DOM_DIAGRAM[i][j].appendChild(label);
    }
}


function showFilledDiagram(diagram) {
    for (let i = 0; i < diagram.rows; i++) {
        for (let j = 0; j < diagram.cols; j++) {
            if (diagram.letters[i][j] != null) {
                DOM_DIAGRAM[i][j].querySelector("input").value = diagram.letters[i][j];
            } else if (diagram.grid[i][j] == UNIT_FREE) {
                DOM_DIAGRAM[i][j].querySelector("input").value = "";
            }
        }
    }
}


function generateDiagram() {
    let params = new URLSearchParams(window.location.search);
    let width = params.has("w") ? parseInt(params.get("w")) : 13;
    let height = params.has("h") ? parseInt(params.get("h")) : 9;
    let block_probability = params.has("p") ? parseFloat(params.get("p")) : 0.3;
    DIAGRAM = new Diagram(height, width, block_probability);
    inflateDiagram(DIAGRAM);
}


function fillSlots() {
    let params = new URLSearchParams(window.location.search);
    let timeout = params.has("t") ? parseInt(params.get("t")) * 1000 : 5000;
    generate(DIAGRAM, LEXICON, timeout);
    setClues();
}


window.addEventListener("load", () => {
    generateDiagram();
    fetch(LEXICON_PATH).then(res => res.json()).then(data => {
        let words = [];
        CLUES = {};
        data.lexicon.forEach(entry => {
            words.push(entry.word);
            CLUES[entry.word] = entry.clues;
        });
        console.log("Dataset contains", words.length, "words");
        LEXICON = new Lexicon(words);
        fillSlots();
    });
});