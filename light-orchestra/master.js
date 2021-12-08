const WEBSOCKET_URL = "wss://lightorchestra:" + retrievePassword() + "@atelier-mediatheque.rlv.eu/wst2";
var SLAVES = [];
var SOCKET;
var MIDI;
var DOM_AUDIO;
var DOM_SOURCE;


class Controller {
    constructor(intervalSpeed) {
        this.interval = null;
        this.intervalSpeed = intervalSpeed;
        this.timeStart = null;
        this.gradient = null;
        this.midi = null;
        this.midiChannelIndices = null;
    }

    startInterval() {
        if (this.interval != null) {
            clearInterval(this.interval);
            this.interval = null;
        }
        let self = this;
        this.interval = setInterval(() => { self.update(); }, this.intervalSpeed);
        this.timeStart = new Date();
    }

    stopInterval() {
        clearInterval(this.interval);
        this.interval = null;
    }

    startBroadcast(color) {
        this.gradient = null;
        this.stopInterval();
        for (let i = 0; i < SLAVES.length; i++) {
            setSlaveColor(i, color);
        }
    }

    startGradient(gradient) {
        this.gradient = gradient;
        this.startInterval();
    }

    startMidi(midi) {
        this.midi = midi;
        this.midiChannelIndices = {};
        this.midi.channels.forEach(channel => {
            this.midiChannelIndices[channel.id] = 0;
        })
        this.startInterval();
    }

    update() {
        if (this.gradient != null) {
            this.gradient.update();
            for (let i = 0; i < SLAVES.length; i++) {
                setSlaveColor(i, this.gradient.getSlaveColor(i));
            }
        } else if (this.midi != null) {
            // Updating states
            let t = ((new Date()) - this.timeStart) / 1000;
            this.midi.channels.forEach(channel => {
                let j = this.midiChannelIndices[channel.id];
                while (j < channel.states.length && channel.states[j].until < t) {
                    j++;
                }
                this.midiChannelIndices[channel.id] = j;
            });
            // Converting states to colors
            for (let i = 0; i < SLAVES.length; i++) {
                // TODO: if slaves are attributed to a specific channel,
                // change the line below.
                // If there is more slaves than MIDI channels, loop back over channels.
                let channelIndex = i % this.midi.channels.length;
                let channelId = this.midi.channels[channelIndex].id;
                let stateIndex = this.midiChannelIndices[channelId];
                let state = this.midi.channels[channelIndex].states[stateIndex];
                setSlaveColor(i, midiStateToColor(channelId, state));
            }
        }
    }

}


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


class Gradient {

    constructor(setup) {
        this.setup = {
            keyframes: [{
                value: 0,
                color: "#000000"
            }, {
                value: 100,
                color: "#ffffff"
            }],
            speed: 1,
            spread: 0
        };
        if (setup != null) {
            this.setup = setup;
        }
        this.progress = 0;
    }

    update() {
        this.progress += this.setup.speed;
        while (this.progress > 100) {
            this.progress -= 100;
        }
    }

    getColor(progress) {
        for (let i = 0; i < this.setup.keyframes.length - 1; i++) {
            if (this.setup.keyframes[i].value <= progress && progress <= this.setup.keyframes[i + 1].value) {
                return blendColors(
                    this.setup.keyframes[i].color,
                    this.setup.keyframes[i + 1].color,
                    (progress - this.setup.keyframes[i].value) / (this.setup.keyframes[i + 1].value - this.setup.keyframes[i].value)
                );
            }
        }
        return "#ffffff";
    }

    getSlaveColor(slaveIndex) {
        let slaveProgress = this.progress + this.setup.spread * slaveIndex;
        while (slaveProgress > 100) {
            slaveProgress -= 100;
        }
        return this.getColor(slaveProgress);
    }

    toCss() {
        let str = "linear-gradient(90deg";
        this.setup.keyframes.forEach(keyframe => {
            str += ", " + keyframe.color + " " + keyframe.value + "%"
        });
        return str + ")";
    }

}

var GRADIENT = new Gradient({
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
});

function setSlaveColor(slaveIndex, color) {
    document.getElementById(SLAVES[slaveIndex]).querySelector(".tile-icon").style.background = color;
    SOCKET.send(JSON.stringify({
        cmd: "tell",
        arg: {
            slave: SLAVES[slaveIndex],
            message: {
                cmd: "color",
                arg: color.substr(1)
            }
        }
    }));
}

function setupMaster() {
    SOCKET = new WebSocket(WEBSOCKET_URL);

    SOCKET.onerror = function(error) {
        let snackbar = document.getElementById("snackbar");
        snackbar.textContent = "The server seems down 😨";
        snackbar.classList.add("show");
        snackbar.classList.add("bg-error");
        setTimeout(() => {
            snackbar.classList.remove("show");
            snackbar.classList.remove("bg-error");
        }, 3000);
    }

    SOCKET.onopen = function(event) {
        SOCKET.send(JSON.stringify({
            cmd: "master",
            arg: "master"
        }));

        let controller = new Controller(50);
        document.getElementById("button-broadcast").addEventListener("click", () => {
            controller.startBroadcast(document.getElementById("input-broadcast-color").value);
        });
        document.getElementById("button-gradient").addEventListener("click", () => {
            let keyframes = [];
            document.getElementById("input-gradient-keyframes").value.split(",").forEach(part => {
                let match = part.trim().match(/(#[a-f0-9]+) (\d+)%/);
                keyframes.push({
                    value: parseInt(match[2]),
                    color: match[1]
                });
            });
            let gradient = new Gradient({
                keyframes: keyframes,
                speed: parseFloat(document.getElementById("input-gradient-speed").value),
                spread: parseFloat(document.getElementById("input-gradient-spread").value),
            });
            controller.startGradient(gradient);
        });
        document.getElementById("btn-midi-play").addEventListener("click", () => {
            DOM_AUDIO.play();
            controller.startMidi(MIDI);
        });

    };
    SOCKET.onmessage = function(event) {
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

    setTimeout(fetchSlaves, 200);


}

function inflateSlaveList() {
    let container = document.getElementById("connected-slaves");
    container.innerHTML = "";
    SLAVES.forEach((slaveId, index) => {
        let element = importTemplate("template-slave");
        element.querySelector(".tile").id = slaveId;
        element.querySelector(".tile-title").textContent = slaveId;
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
    SOCKET = new WebSocket(WEBSOCKET_URL);
    SOCKET.onopen = function(event) {
        SOCKET.send(JSON.stringify({
            cmd: "slave",
            arg: null
        }));
    };
    SOCKET.onmessage = function(event) {
        let message = JSON.parse(event.data);
        if (message.cmd == "color") {
            document.querySelector(".slave-container").style.background = "#" + message.arg;
        }
    }
}


function fetchSlaves() {
    SLAVES = [];
    SOCKET.send(JSON.stringify({
        cmd: "list",
        arg: null
    }));
}


function drawMidiFile(offset) {
    let canvas = document.getElementById("canvas-midi");

    let minNote = null;
    let maxNote = null;
    let duration = 0;
    MIDI.channels.forEach(channel => {
        channel.states.forEach(state => {
            if (state.on && (minNote == null || minNote > state.note)) {
                minNote = state.note;
            }
            if (state.on && (maxNote == null || maxNote < state.note)) {
                maxNote = state.note;
            }
            duration = Math.max(duration, state.until);
        });
    });

    // let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;


    const timeScale = 0.01;

    let width = duration / timeScale;

    canvas.width = width;
    canvas.style.width = width + "px";

    let ctx = canvas.getContext("2d");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    const noteHeight = 5;

    let colors = [
        "#FF0000",
        "#00FF00",
        "#0000FF",
        "#00FFFF",
        "#FF00FF",
        "#FFFF00",
    ];


    MIDI.channels.forEach((channel, i) => {
        ctx.fillStyle = colors[i % colors.length];
        let cursor = 0;
        for (let j = 0; j < channel.states.length; j++) {
            if (channel.states[j].on) {
                ctx.fillRect(
                    (cursor - offset) / timeScale,
                    (channel.states[j].note - minNote) / (maxNote - minNote) * (height - noteHeight),
                    (channel.states[j].until - cursor) / timeScale,
                    noteHeight
                );

                /*
                for (let k = j + 1; k < channel.states.length; k++) {
                    if (!channel.states[k].on && channel.states[k].note == channel.states[i].note) {
                        // channel.states[k] is start
                        // channel.states[k] is end
                        ctx.fillRect(channel.states[i].)
                    }
                }
                */
            }
            cursor = channel.states[j].until;
        }
    });
}


function loadMidi(data) {
    document.getElementById("card-midi-upload").classList.add("hidden");
    document.getElementById("midi-channels-count").textContent = data.channels.length;
    document.getElementById("midi-duration").textContent = Math.max(...data.channels.map(channel => channel.states[channel.states.length - 1].until)).toFixed(1);
    document.getElementById("card-midi-play").classList.remove("hidden");
    MIDI = data;
    drawMidiFile(0);
}


function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}


function midiStateToColor(channelId, state) {
    if (state == null || state == undefined) return "#000000";
    let hue = Math.min(360, Math.max(0, (state.note * 2.8346)));
    return hslToHex(hue, 100, state.on ? 50 : 0);
}


function storageAvailable(type) {
    var storage;
    try {
        storage = window[type];
        var x = "__storage_test__";
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    } catch (e) {
        return e instanceof DOMException && (
                e.code === 22 ||
                e.code === 1014 ||
                e.name === "QuotaExceededError" ||
                e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
            (storage && storage.length !== 0);
    }
}


function retrievePassword() {
    let password = null;
    if (storageAvailable("localStorage")) {
        password = localStorage.getItem("websocket_basic_auth_password");
    }
    if (password == null) {
        password = prompt("Password?");
        localStorage.setItem("websocket_basic_auth_password", password);
    }
    return password;
}


window.addEventListener("load", () => {
    document.querySelectorAll(".btn-color").forEach(button => {
        let keyframes = button.getAttribute("keyframes");
        button.style.background = "linear-gradient(90deg, " + keyframes + ")";
        button.addEventListener("click", () => {
            document.getElementById("input-gradient-keyframes").value = keyframes;
        });
    });
    document.getElementById("btn-upload-json").addEventListener("click", () => {
        let midiFile = document.getElementById("input-upload-json").files[0];
        let audioFile = document.getElementById("input-upload-audio").files[0];
        if (midiFile && audioFile) {
            let midiFileReader = new FileReader();
            midiFileReader.onload = function(event) {
                let data = JSON.parse(event.target.result);
                loadMidi(data);
            }
            midiFileReader.readAsText(midiFile, "UTF-8");
            let audioFileReader = new FileReader();
            audioFileReader.onload = function(event) {
                // console.log(event.target.result);
                DOM_AUDIO = document.createElement("audio");
                DOM_SOURCE = document.createElement("source");
                DOM_SOURCE.src = event.target.result;;
                DOM_AUDIO.type = "audio/mpeg";
                DOM_AUDIO.appendChild(DOM_SOURCE);
            };
            audioFileReader.readAsDataURL(audioFile);
        }
    });
});