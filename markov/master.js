var MODEL = {};
var NODE_INDEX = {};
var NODE_ID_INDEX = {};
var CURRENT_NODE = "harry";

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
    })
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
        for (let child in head.node.children) {
            toCheck.push({
                label: child,
                parent: nodeId,
                node: head.node.children[child]
            });
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


window.addEventListener("load", () => {

    document.getElementById("form-search").addEventListener("submit", (event) => {
        event.preventDefault();
        let token = document.querySelector("#form-search input").value.toLowerCase();
        if (token in MODEL.chain) {
            document.querySelector("#form-search input").value = "";
            loadNode(token);
        } else {
            // TODO: snackbar
        }
    });

    document.getElementById("form-load").addEventListener("submit", (event) => {
        event.preventDefault();
        let modelUrl = document.querySelector("#form-load select").value;
        fetchModel(modelUrl);
    });

});