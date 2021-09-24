const WEBSOCKET_URL = "ws://atelier-mediatheque.rlv.eu/wst";

var socket;

function setupMaster() {
    socket = new WebSocket("ws://atelier-mediatheque.rlv.eu/wst");
    socket.onopen = function(event) {
        socket.send(JSON.stringify({
            cmd: "admin",
            arg: "admin"
        }));
    };
    socket.onmessage = function(event) {
        console.log("Received message:", JSON.parse(event.data));
    }

}

function setupSlave() {
    socket = new WebSocket("ws://atelier-mediatheque.rlv.eu/wst");
    socket.onopen = function(event) {
        socket.send(JSON.stringify({
            cmd: "hello",
            arg: null
        }));
    };
    socket.onmessage = function(event) {
        console.log("Received message:", JSON.parse(event.data));
    }
}

function testBroadcast() {
    socket.send(JSON.stringify({
        cmd: "broadcast",
        arg: {
            cmd: "color",
            arg: "0f4q5e"
        }
    }));
}