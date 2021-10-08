const WEBSOCKET_URL = "wss://lightorchestra:" + prompt("Password?") + "@atelier-mediatheque.rlv.eu/wst2";
var SOCKET;

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