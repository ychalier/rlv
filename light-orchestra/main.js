const WEBSOCKET_URL = "ws://atelier-mediatheque.rlv.eu/wst";
var SLAVES = [];

var socket;


function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}



var GRADIENT = {

    setup: {
        keyframes: [{
            value: 0,
            color: "#f2627c"
        }, {
            value: 50,
            color: "#277bcc"
        }, {
            value: 100,
            color: "#f2627c"
        }],
        speed: .5,
        spread: 2,
    },
    progress: 0

}

const INTERVAL_SPEED = 50;
var gradientInterval = null;


function blendColors(colA, colB, alpha) {
    let rgbA = hexToRgb(colA);
    let rgbB = hexToRgb(colB);
    let blend = rgbToHex(
        Math.floor((1 - alpha) * rgbA.r + alpha * rgbB.r),
        Math.floor((1 - alpha) * rgbA.g + alpha * rgbB.g),
        Math.floor((1 - alpha) * rgbA.b + alpha * rgbB.b)
    );
    return blend;
}


function setupMaster() {
    socket = new WebSocket(WEBSOCKET_URL);
    socket.onopen = function(event) {
        socket.send(JSON.stringify({
            cmd: "master",
            arg: "master"
        }));

        gradientInterval = setInterval(() => {
            // console.log("Hello from interval");
            GRADIENT.progress += GRADIENT.setup.speed;
            if (GRADIENT.progress > 100) GRADIENT.progress -= 100;
            for (let i = 0; i < SLAVES.length; i++) {
                let progress = GRADIENT.progress + GRADIENT.setup.spread * i;
                if (progress > 100) progress -= 100;
                for (let j = 0; j < GRADIENT.setup.keyframes.length - 1; j++) {
                    if (GRADIENT.setup.keyframes[j].value <= progress && progress <= GRADIENT.setup.keyframes[j + 1].value) {
                        let color = blendColors(
                            GRADIENT.setup.keyframes[j].color,
                            GRADIENT.setup.keyframes[j + 1].color,
                            (progress - GRADIENT.setup.keyframes[j].value) / (GRADIENT.setup.keyframes[j + 1].value - GRADIENT.setup.keyframes[j].value)
                        );
                        socket.send(JSON.stringify({
                            cmd: "tell",
                            arg: {
                                slave: SLAVES[i],
                                message: {
                                    cmd: "color",
                                    arg: color.substr(1)
                                }
                            }
                        }));
                        break;
                    }
                }

            }
        }, INTERVAL_SPEED);

    };
    socket.onmessage = function(event) {
        let message = JSON.parse(event.data);
        // console.log("Received message:", message);
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
        // console.log("Received message:", message);
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