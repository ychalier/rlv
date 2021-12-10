// const WEBSOCKET_URL = "wss://lightorchestra:" + retrievePassword() + "@atelier-mediatheque.rlv.eu/wst2";
// const WEBSOCKET_URL = "ws://localhost:8765";
const INTERVAL_SPEED = 50; // ms
const MIDI_CHANNELS_COLORS = [
    "#7e0b03",
    "#20bb4e",
    "#e6d306",
    "#9c6904",
    "#1e0a20",
    "#000f1c",
    "#d30035",
    "#0f9789",
    "#78a6dd",
    "#0577b9"
];
const MIDI_TIME_SCALE = 0.01; // s/px
const MIDI_NOTE_HEIGHT = 5; // px
const MIDI_DRAW_FPS = 60;

var SLAVES = [];
var SOCKET;
var CONTROLLER;
var MIDI;


/******************************************************************************
 * Misc utils 
 *****************************************************************************/


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


/******************************************************************************
 * Socket utils
 *****************************************************************************/


function setupMaster() {
    SOCKET = new WebSocket(WEBSOCKET_URL);
    SOCKET.onerror = socketOnError;
    SOCKET.onopen = socketOnOpen;
    SOCKET.onmessage = socketOnMessage;
    setTimeout(fetchSlaves, 200);
}

function socketOnError(event) {
    let snackbar = document.getElementById("snackbar");
    snackbar.textContent = "The server seems down 😨";
    snackbar.classList.add("show");
    snackbar.classList.add("bg-error");
    setTimeout(() => {
        snackbar.classList.remove("show");
        snackbar.classList.remove("bg-error");
    }, 3000);
}

function socketOnOpen(event) {
    SOCKET.send(JSON.stringify({
        cmd: "master",
        arg: "master"
    }));
}

function socketOnMessage(event) {
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


/******************************************************************************
 * Communication with slaves
 *****************************************************************************/


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

function fetchSlaves() {
    SLAVES = [];
    SOCKET.send(JSON.stringify({
        cmd: "list",
        arg: null
    }));
}


/******************************************************************************
 * Controller
 *****************************************************************************/


class Controller {
    constructor() {
        this.interval = null;
        this.timeStart = null;
        this.program = null;
        this.running = false;
    }

    start() {
        if (this.interval != null) {
            this.stopInterval();
        }
        let self = this;
        this.interval = setInterval(() => { self.update(); }, INTERVAL_SPEED);
        this.timeStart = new Date();
        this.running = true;
    }

    stop() {
        clearInterval(this.interval);
        this.interval = null;
        if (this.program != null) {
            this.program.close();
        }
        this.running = false;
    }

    startProgram(program) {
        if (this.running) this.stop();
        this.program = program;
        this.program.init();
        this.start();
    }

    update() {
        let elapsed = (new Date() - this.timeStart) / 1000;
        let exit = this.program.update(elapsed);
        if (exit) {
            this.stop();
        }
    }

}


/******************************************************************************
 * Programs
 *****************************************************************************/


class Program {

    constructor(name) {
        this.name = name;
    }

    init() {
        console.log("Initializing program:", this.name);
    }

    update(elapsed) {
        return true;
    }

    close() {
        console.log("Closing program:", this.name);
    }

}


class BroadcastProgram extends Program {

    constructor(color) {
        super("Broadcast");
        this.color = color;
    }

    init() {
        for (let i = 0; i < SLAVES.length; i++) {
            setSlaveColor(i, this.color);
        }
    }

}


class GradientProgram extends Program {

    constructor(setup) {
        super("Gradient");
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

    update(elapsed) {
        this.progress += this.setup.speed;
        while (this.progress > 100) {
            this.progress -= 100;
        }
        for (let i = 0; i < SLAVES.length; i++) {
            setSlaveColor(i, this.getSlaveColor(i));
        }
        return false;
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


class MusicScoreProgram extends Program {

    constructor(midi) {
        super("Music Score");
        this.midi = midi;
        this.midiChannelIndices = {};
    }

    init() {
        this.midiChannelIndices = {};
        this.midi.channels.forEach(channel => {
            this.midiChannelIndices[channel.id] = 0;
        });
        document.getElementById("audio-player").currentTime = 0;
        document.getElementById("audio-player").play();

        let start;
        let self = this;
        let fpsInterval = 1000 / MIDI_DRAW_FPS;
        let then = new Date();
        let progress;

        function step() {
            let now = new Date();
            let elapsed = now - then;
            progress = 0;
            if (elapsed > fpsInterval) {
                then = now;
                if (start == null) start = now;
                let progress = now - start;
                self.midi.draw(progress / 1000);
            }
            if (progress < self.midi.duration * 1000 && CONTROLLER.running) {
                requestAnimationFrame(step);
            }
        }
        requestAnimationFrame(step);


    }

    update(elapsed) {
        // Updating states
        this.midi.channels.forEach(channel => {
            let j = this.midiChannelIndices[channel.id];
            while (j < channel.states.length && channel.states[j].until < elapsed) {
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
            setSlaveColor(i, this.midi.getStateColor(state));
        }
        return elapsed >= this.midi.duration;
    }

    close() {
        document.getElementById("audio-player").pause();
    }

}


class Midi {

    constructor(jsonData) {
        this.channels = jsonData.channels;
        this.minNote = null;
        this.maxNote = null;
        this.duration = 0;
        this.channels.forEach(channel => {
            channel.states.forEach(state => {
                if (state.on && (this.minNote == null || this.minNote > state.note)) {
                    this.minNote = state.note;
                }
                if (state.on && (this.maxNote == null || this.maxNote < state.note)) {
                    this.maxNote = state.note;
                }
                this.duration = Math.max(this.duration, state.until);
            });
        });
        document.getElementById("panel-music-upload").classList.add("hidden");
        document.getElementById("midi-channels-count").textContent = this.channels.length;
        document.getElementById("midi-duration").textContent = this.duration.toFixed(1);
        document.getElementById("panel-music-play").classList.remove("hidden");
        this.draw(0);
    }

    draw(elapsed) {
        let canvas = document.getElementById("canvas-midi");
        let width = this.duration / MIDI_TIME_SCALE;
        let height = canvas.offsetHeight;
        canvas.width = width;
        canvas.style.width = width + "px";
        let ctx = canvas.getContext("2d");
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        this.channels.forEach((channel, i) => {
            ctx.fillStyle = MIDI_CHANNELS_COLORS[i % MIDI_CHANNELS_COLORS.length];
            let cursor = 0;
            for (let j = 0; j < channel.states.length; j++) {
                if (channel.states[j].on) {
                    ctx.fillRect(
                        cursor / MIDI_TIME_SCALE,
                        (channel.states[j].note - this.minNote) / (this.maxNote - this.minNote) * (height - MIDI_NOTE_HEIGHT),
                        (channel.states[j].until - cursor) / MIDI_TIME_SCALE,
                        MIDI_NOTE_HEIGHT
                    );
                }
                cursor = channel.states[j].until;
            }
        });
        canvas.parentNode.scrollLeft = Math.max(0, elapsed / MIDI_TIME_SCALE - 0.5 * canvas.parentNode.offsetWidth);
        ctx.fillStyle = "#000000";
        ctx.fillRect(elapsed / MIDI_TIME_SCALE, 0, 1, height);
    }

    getStateColor(state) {
        if (state == null || state == undefined) return "#000000";
        let hue = (state.note - this.minNote) / (this.maxNote - this.minNote) * 360;
        // let hue = Math.min(360, Math.max(0, (state.note * 2.8346)));
        return hslToHex(hue, 100, state.on ? 50 : 0);
    }

}


function inflateSlaveList() {
    let container = document.getElementById("connected-slaves");
    container.innerHTML = "";
    SLAVES.forEach((slaveId, index) => {
        let element = importTemplate("template-slave");
        element.querySelector(".tile").id = slaveId;
        element.querySelector(".tile").classList.add("slave");
        element.querySelector(".tile-title").textContent = slaveId;
        element.querySelector(".tile-title").addEventListener("click", (event) => {

        });
        element.querySelector(".tile-title").addEventListener("click", (event) => {
            document.getElementById("input-slave-id").value = slaveId;
            document.getElementById("input-slave-name").value = slaveId;
            showModal("modal-slave");
            document.getElementById("input-slave-name").focus();
        });
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



function startProgramBroadcast() {
    CONTROLLER.startProgram(new BroadcastProgram(document.getElementById("input-broadcast-color").value));
}


function startProgramGradient() {
    let keyframes = [];
    document.getElementById("input-gradient-keyframes").value.split(",").forEach(part => {
        let match = part.trim().match(/(#[a-f0-9]+) (\d+)%/);
        keyframes.push({
            value: parseInt(match[2]),
            color: match[1]
        });
    });
    let program = new GradientProgram({
        keyframes: keyframes,
        speed: parseFloat(document.getElementById("input-gradient-speed").value),
        spread: parseFloat(document.getElementById("input-gradient-spread").value),
    });
    CONTROLLER.startProgram(program);
}


function startProgramMusicScore() {
    CONTROLLER.startProgram(new MusicScoreProgram(MIDI));
}


function setupGradientButtons() {
    document.querySelectorAll(".btn-color").forEach(button => {
        let keyframes = button.getAttribute("keyframes");
        button.style.background = "linear-gradient(90deg, " + keyframes + ")";
        button.addEventListener("click", () => {
            document.getElementById("input-gradient-keyframes").value = keyframes;
        });
    });
}

function handleMusicScoreSubmission(event) {
    let midiFile = document.getElementById("input-upload-json").files[0];
    let audioFile = document.getElementById("input-upload-audio").files[0];
    if (midiFile && audioFile) {
        let midiFileReader = new FileReader();
        midiFileReader.onload = (event) => {
            MIDI = new Midi(JSON.parse(event.target.result));
        }
        midiFileReader.readAsText(midiFile, "UTF-8");
        let audioFileReader = new FileReader();
        audioFileReader.onload = function(event) {
            let audio = document.getElementById("audio-player");
            audio.innerHTML = "";
            let source = document.createElement("source");
            source.src = event.target.result;
            source.type = "audio/mpeg";
            audio.appendChild(source);
        };
        audioFileReader.readAsDataURL(audioFile);
    }
}


function onSlaveFormSubmit(event) {
    event.preventDefault();
    let slaveId = document.getElementById("input-slave-id").value;
    document.getElementById(slaveId).querySelector(".tile-title").textContent = document.getElementById("input-slave-name").value;
    closeModal("modal-slave");
}


window.addEventListener("load", () => {
    setupGradientButtons();
    CONTROLLER = new Controller();
    document.getElementById("button-broadcast").addEventListener("click", startProgramBroadcast);
    document.getElementById("button-gradient").addEventListener("click", startProgramGradient);
    document.getElementById("button-music-upload").addEventListener("click", handleMusicScoreSubmission);
    document.getElementById("button-music-play").addEventListener("click", startProgramMusicScore);
    document.getElementById("form-slave").addEventListener("submit", onSlaveFormSubmit);
});