var MODEL = null;
var NODE_INDEX = {};
var NODE_ID_INDEX = {};
var CURRENT_NODE = null;
var CURRENT_PARENTS = {};
var RECORDING = false;

const OPTIONS = {
    layout: {
        improvedLayout: true,
    },
    edges: {
        arrows: {
            to: {
                enabled: true
            }
        },
        color: "hsl(231, 63%, 59%)"
    },
    nodes: {
        color: {
            border: "hsl(231, 64%, 51%)",
            background: "hsl(231, 63%, 49%)"
        },
        font: {
            color: "white"
        }
    },
    physics: {
        enabled: true
    }
};


function fetchModel(modelUrl) {
    console.log("Fetching model from", modelUrl);
    document.getElementById("loader").classList.remove("hidden");
    fetch(modelUrl).then(res => res.json()).then(loadModel);
}


function resetOutput() {
    document.getElementById("output").innerHTML = "&nbsp;";
}

function appendToOutput(token) {
    let newContent = document.getElementById("output").textContent.trim() + " " + token;
    setOutput(newContent)
}


function setOutput(sentence) {
    document.getElementById("output").innerHTML = sentence.trim().replace(/ ([',\.\-])/g, "$1").replace(/(['\-]) /g, "$1");
}


function loadModel(data) {
    MODEL = data;
    MODEL.tokens.forEach((token, index) => {
        NODE_INDEX[token] = index;
        NODE_ID_INDEX[index] = token;
    });
    if (CURRENT_NODE == null || !(CURRENT_NODE in MODEL.chain)) {
        CURRENT_NODE = MODEL.tokens[0];
    }
    resetOutput();
    loadNode(CURRENT_NODE);
    if (RECORDING) {
        appendToOutput(CURRENT_NODE);
    }
}


function loadNode(nodeLabel) {
    console.log("Loading node", nodeLabel);
    CURRENT_NODE = nodeLabel;
    document.getElementById("loader").classList.remove("hidden");
    let nodeArr = [];
    let edgeArr = [];
    let alreadyAddedNodes = {};
    let alreadyAddedEdges = {};
    CURRENT_PARENTS = {};
    let toCheck = [{
        label: nodeLabel,
        node: MODEL.chain[nodeLabel],
        parent: null
    }];
    while (toCheck.length > 0) {
        let head = toCheck.pop();
        let nodeId = NODE_INDEX[head.label];
        if (!(head.label in CURRENT_PARENTS)) {
            CURRENT_PARENTS[head.label] = NODE_ID_INDEX[head.parent];
        }
        if (!(nodeId in alreadyAddedNodes)) {
            nodeArr.push({
                id: nodeId,
                label: head.label
            });
            alreadyAddedNodes[nodeId] = true;
        }
        if (head.parent != null) {
            if (head.parent + "_" + nodeId in alreadyAddedEdges) {
                // pass
            } else {
                edgeArr.push({
                    from: head.parent,
                    to: nodeId,
                    value: head.node.score
                });
                alreadyAddedEdges[head.parent + "_" + nodeId] = true;
            }

        }
        if (head.node != undefined) {
            for (let child in head.node.children) {
                toCheck.push({
                    label: child,
                    parent: nodeId,
                    node: head.node.children[child]
                });
            }
        }
    }
    let nodes = new vis.DataSet(nodeArr);
    let edges = new vis.DataSet(edgeArr);
    let data = {
        nodes: nodes,
        edges: edges
    }
    let container = document.getElementById("network");
    let network = new vis.Network(container, data, OPTIONS);
    network.on("click", function(params) {
        if (params.nodes.length >= 1) {
            let target = NODE_ID_INDEX[params.nodes[0]];
            if (RECORDING) {
                let targetToCheck = target;
                let toAppendToOutput = [];
                let seen = {};
                while (CURRENT_PARENTS[targetToCheck] != null && !(targetToCheck in seen)) {
                    toAppendToOutput.push(targetToCheck);
                    seen[targetToCheck] = true;
                    targetToCheck = CURRENT_PARENTS[targetToCheck];
                }
                for (let i = toAppendToOutput.length - 1; i >= 0; i--) {
                    appendToOutput(toAppendToOutput[i]);
                }
            }
            setTimeout(() => { loadNode(target) }, 100);
        }
    });
    network.on("stabilizationIterationsDone", function(params) {
        document.getElementById("loader").classList.add("hidden");
    });
}


function toast(message, duration) {
    let snackbar = document.getElementById("snackbar");
    snackbar.textContent = message;
    snackbar.className = "show";
    setTimeout(function() {
        snackbar.classList.remove("show");
        snackbar.textContent = "";
    }, duration);
}



function tokenize(text) {
    let tokens = [];
    text.toLowerCase().replace(/’/gi, "'").split(/([.,'\/#!$%\^&\*;:{}=\-_`~()\s])/m).forEach(token => {
        if (token.trim() != "") {
            tokens.push(token.trim());
        }
    });
    return tokens;
}


function updateChain(chain, seq) {
    if (seq.length == 0) return;
    head = seq[0];
    tail = seq.slice(1);
    if (!(head in chain)) {
        chain[head] = {
            children: {},
            score: 0
        };
    }
    chain[head].score += 1;
    updateChain(chain[head].children, tail);
}


function pruneChainNode(node, k) {
    let candidates = [];
    for (let child in node.children) {
        candidates.push({
            label: child,
            score: node.children[child].score,
            children: node.children[child].children
        });
    }
    node.children = {};
    candidates.sort((a, b) => {
        return a.score - b.score;
    });
    for (let i = 0; i < Math.min(candidates.length, k); i++) {
        node.children[candidates[i].label] = {
            children: candidates[i].children,
            score: candidates[i].score
        }
    }
    for (let child in node.children) {
        pruneChainNode(node.children[child], k);
    }
}


function normalizeChainNode(node) {
    let total = 0;
    for (let child in node.children) {
        total += node.children[child].score;
    }
    if (total > 0) {
        for (let child in node.children) {
            node.children[child].score /= total;
        }
    }
    for (let child in node.children) {
        normalizeChainNode(node.children[child]);
    }
}


function createModelFromText(text, depth, k) {
    console.log("Creating model with depth", depth, "and k", k, "for a text of size", text.length);
    let tokens = tokenize(text);
    console.log("There are", tokens.length, "tokens");
    let chain = {};
    for (let i = 0; i < Math.max(1, tokens.length - depth - 1); i++) {
        let seq = tokens.slice(i, i + depth + 1);
        updateChain(chain, seq);
    }
    for (let token in chain) {
        pruneChainNode(chain[token], k);
    }
    for (let token in chain) {
        normalizeChainNode(chain[token]);
    }
    return {
        chain: chain,
        tokens: Array.from(new Set(tokens))
    }
}


function weighted_random(items, weights) {
    var i;

    for (i = 0; i < weights.length; i++)
        weights[i] += weights[i - 1] || 0;

    var random = Math.random() * weights[weights.length - 1];

    for (i = 0; i < weights.length; i++)
        if (weights[i] > random)
            break;

    return items[i];
}


function chooseChild(node) {
    let children = Object.keys(node.children);
    if (children.length == 0) return null;
    let weights = [];
    children.forEach(child => {
        weights.push(node.children[child].score);
    });
    let child = weighted_random(children, weights);
    return {
        label: child,
        score: node.children[child].score,
        children: node.children[child].children
    }
}


function generate() {
    if (CURRENT_NODE == null) return;
    let cur = {
        label: CURRENT_NODE,
        score: 1,
        children: MODEL.chain[CURRENT_NODE].children
    };
    let sentence = "";
    let over = false;
    while (!over) {
        while (!over) {
            let child = chooseChild(cur);
            if (child == null) {
                cur.children = MODEL.chain[cur.label].children;
                break;
            } else {
                sentence += " " + cur.label;
                if (cur.label == "." || cur.label == "?" || cur.label == "!") {
                    over = true;
                    break;
                }
                cur = child;
            }
        }
    }
    return sentence.trim();
}


window.addEventListener("load", () => {

    RECORDING = document.getElementById("input-record").checked;

    document.getElementById("form-search").addEventListener("submit", (event) => {
        event.preventDefault();
        if (MODEL != null) {
            let token = document.querySelector("#form-search input").value.toLowerCase();
            if (token in MODEL.chain) {
                document.querySelector("#form-search input").value = "";
                resetOutput();
                loadNode(token);
                if (RECORDING) {
                    appendToOutput(token);
                }
            } else {
                toast("Ce mot n'est pas dans le modèle 🙁", 3000);
            }
        } else {
            toast("Commencez par sélectionner un modèle 😊", 3000);
        }
    });

    document.getElementById("form-model-choose").addEventListener("submit", (event) => {
        event.preventDefault();
        let modelUrl = document.querySelector("#form-model-choose select").value;
        fetchModel(modelUrl);
        closeModal("modal-select-model");
    });

    document.getElementById("form-model-import").addEventListener("submit", (event) => {
        event.preventDefault();
        let file = document.querySelectorAll("#form-model-import input").files[0];
        if (file) {
            let fileReader = new FileReader();
            fileReader.onload = (event) => {
                let data = JSON.parse(event.target.result);
                closeModal("modal-select-model");
                loadModel(data);
            }
            fileReader.readAsText(file, "UTF-8");
        }
    });

    document.getElementById("form-model-generate").addEventListener("submit", (event) => {
        event.preventDefault();
        let text = document.getElementById("input-create-text").value;
        let depth = parseInt(document.getElementById("input-create-depth").value);
        let k = parseInt(document.getElementById("input-create-k").value);
        let model = createModelFromText(text, depth, k);
        closeModal("modal-select-model");
        loadModel(model);
    });

    document.getElementById("input-record").addEventListener("input", (event) => {
        if (event.target.checked) {
            RECORDING = true;
            resetOutput();
            if (CURRENT_NODE != null) {
                appendToOutput(CURRENT_NODE);
            }
        } else {
            RECORDING = false;
        }
    });

    document.getElementById("btn-generate").addEventListener("click", () => {
        if (MODEL != null) {
            let sentence = generate();
            setOutput(sentence);
        } else {
            toast("Commencez par sélectionner un modèle 😊", 3000);
        }
    });

    document.getElementById("btn-generate-10").addEventListener("click", () => {
        if (MODEL != null) {
            let text = "";
            for (let i = 0; i < 10; i++) {
                let sentence = generate();
                text += sentence + "<br><br>";
            }
            setOutput(text.trim());
        } else {
            toast("Commencez par sélectionner un modèle 😊", 3000);
        }
    })

});