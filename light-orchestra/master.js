var exampleSocket = new WebSocket("ws://localhost:8765");
exampleSocket.onopen = function(event) {
    exampleSocket.send("Hello, World!");
};
exampleSocket.onmessage = function(event) {
    console.log("Received message:", event.data);
}