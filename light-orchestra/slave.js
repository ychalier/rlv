const WEBSOCKET_URL = "wss://lightorchestra:" + retrievePassword() + "@atelier-mediatheque.rlv.eu/wst2";
// const WEBSOCKET_URL = "ws://localhost:8765";
var SOCKET;

function setupSlave() {
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