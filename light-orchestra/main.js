const WEBSOCKET_URL = "ws://atelier-mediatheque.rlv.eu/wst";
var SLAVES = [];

var socket;

function setupMaster() {
    socket = new WebSocket(WEBSOCKET_URL);
    socket.onopen = function(event) {
        socket.send(JSON.stringify({
            cmd: "master",
            arg: "master"
        }));
    };
    socket.onmessage = function(event) {
        let message = JSON.parse(event.data);
        console.log("Received message:", message);
        if (message.cmd == "event") {
            if (message.arg.type == "slave_connected") {
                SLAVES.push(message.arg.content);
                inflateSlaveList();
            } else if (message.arg.type == "slave_disconnected") {
                SLAVES = SLAVES.filter(slaveId => slaveId != message.arg.content);
                inflateSlaveList();
            }
        }
    }

}

function inflateSlaveList() {
    let container = document.getElementById("connected-slaves");
    container.innerHTML = "";
    SLAVES.forEach((slaveId, index) => {
        let element = importTemplate("template-slave");
        element.querySelector(".card-title").textContent = slaveId;
        if (index == 0) element.querySelector(".btn-up").classList.add("disabled");
        if (index == SLAVES.length - 1) element.querySelector(".btn-down").classList.add("disabled");
        element.querySelector(".btn-up").addEventListener("click", () => {
            let aux = SLAVES[index];
            SLAVES[index] = SLAVES[index - 1];
            SLAVES[index - 1] = aux;
            inflateSlaveList();
        });
        element.querySelector(".btn-down").addEventListener("click", () => {
            let aux = SLAVES[index];
            SLAVES[index] = SLAVES[index + 1];
            SLAVES[index + 1] = aux;
            inflateSlaveList();
        });
        container.appendChild(element);
    });
}

function setupSlave() {
    socket = new WebSocket(WEBSOCKET_URL);
    socket.onopen = function(event) {
        socket.send(JSON.stringify({
            cmd: "slave",
            arg: null
        }));
    };
    socket.onmessage = function(event) {
        let message = JSON.parse(event.data);
        console.log("Received message:", message);
        if (message.cmd == "color") {
            document.querySelector(".slave-container").style.background = "#" + message.arg;
        }
    }
}

function testBroadcast() {
    socket.send(JSON.stringify({
        cmd: "broadcast",
        arg: {
            cmd: "color",
            arg: document.getElementById("broadcast-color").value.substr(1)
        }
    }));
}

function testTell(slaveId) {
    socket.send(JSON.stringify({
        cmd: "tell",
        arg: {
            slave: slaveId,
            message: {
                cmd: "color",
                arg: "4f5a9d"
            }
        }
    }));
}


function testList() {
    SLAVES = [];
    socket.send(JSON.stringify({
        cmd: "list",
        arg: null
    }));
}