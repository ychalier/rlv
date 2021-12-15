var MODEL = null;
var NODE_INDEX = {};
var NODE_ID_INDEX = {};
var CURRENT_NODE = null;

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


function loadModel(data) {
    MODEL = data;
    MODEL.tokens.forEach((token, index) => {
        NODE_INDEX[token] = index;
        NODE_ID_INDEX[index] = token;
    });
    if (CURRENT_NODE == null) {
        CURRENT_NODE = MODEL.tokens[0];
    }
    loadNode(CURRENT_NODE);
}


function loadNode(nodeLabel) {
    console.log("Loading node", nodeLabel);
    CURRENT_NODE = nodeLabel;
    document.getElementById("loader").classList.remove("hidden");
    let nodeArr = [];
    let edgeArr = [];
    let alreadyAddedNodes = {};
    let toCheck = [{
        label: nodeLabel,
        node: MODEL.chain[nodeLabel],
        parent: null
    }];
    while (toCheck.length > 0) {
        let head = toCheck.pop();
        let nodeId = NODE_INDEX[head.label];
        if (!(nodeId in alreadyAddedNodes)) {
            nodeArr.push({
                id: nodeId,
                label: head.label
            });
            alreadyAddedNodes[nodeId] = true;
        }
        if (head.parent != null) {
            edgeArr.push({
                from: head.parent,
                to: nodeId,
                value: head.node.score
            })
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


window.addEventListener("load", () => {

    document.getElementById("form-search").addEventListener("submit", (event) => {
        event.preventDefault();
        if (MODEL != null) {
            let token = document.querySelector("#form-search input").value.toLowerCase();
            if (token in MODEL.chain) {
                document.querySelector("#form-search input").value = "";
                loadNode(token);
            } else {
                toast("Ce mot n'est pas dans le modèle 🙁", 3000);
            }
        } else {
            toast("Commencez par sélectionner un modèle 😊", 3000);
        }
    });

    document.getElementById("form-load").addEventListener("submit", (event) => {
        event.preventDefault();
        let modelUrl = document.querySelector("#form-load select").value;
        fetchModel(modelUrl);
    });

    document.getElementById("form-create").addEventListener("submit", (event) => {
        event.preventDefault();
        let text = document.getElementById("input-create-text").value;
        let depth = parseInt(document.getElementById("input-create-depth").value);
        let k = parseInt(document.getElementById("input-create-k").value);
        let model = createModelFromText(text, depth, k);
        closeModal("modal-create");
        loadModel(model);
    });

});