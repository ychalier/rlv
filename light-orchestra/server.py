import asyncio
import websockets
import json


PORT = 8765
CLIENTS = dict()
ADMIN = None
ADMIN_PASSWORD = "admin"


async def respond(websocket, status, message):
    await websocket.send(json.dumps({"status": status, "message": message}))


async def handle_command(websocket, cmd, arg):
    global CLIENTS, ADMIN, ADMIN_PASSWORD
    print(f"Handling command '{cmd}' from {websocket.id}")
    if cmd == "hello":
        CLIENTS[websocket.id] = websocket
        await respond(websocket, "success", "")
        if ADMIN is not None:
            await respond(ADMIN, "event", {
                "event": "client_connected",
                "client": str(websocket.id)
            })
    elif cmd == "admin":
        if arg == ADMIN_PASSWORD:
            ADMIN = websocket
            await respond(websocket, "success", {"clients": list(map(str, CLIENTS.keys()))})
        else:
            await respond(websocket, "error", "wrong password")
    elif cmd == "broadcast":
        if ADMIN is not None and websocket.id == ADMIN.id:
            for client in CLIENTS.values():
                await client.send(json.dumps(arg))
            await respond(websocket, "success", "")
        else:
            await respond(websocket, "error", "unauthorized")
    else:
        await respond(websocket, "error", "unknown command")


async def ws_handler(websocket, path):
    global CLIENTS, ADMIN
    print(f"New client (id: {websocket.id} address: {websocket.remote_address}")
    async for message in websocket:
        try:
            data = json.loads(message)
            await handle_command(websocket, data.get("cmd"), data.get("arg"))
        except json.decoder.JSONDecodeError:
            await respond(websocket, "error", "invalid json")
    print(f"Client {websocket.id} disconnected")
    if websocket.id in CLIENTS:
        del CLIENTS[websocket.id]
        if ADMIN is not None:
            await respond(ADMIN, "event", {
                    "event": "client_disconnected",
                    "client": str(websocket.id)
                })
    if websocket.id == ADMIN:
        ADMIN = None


async def main():
    print(f"Starting server at ws://localhost:{PORT}")
    async with websockets.serve(ws_handler, "localhost", PORT):
        await asyncio.Future()  # run forever

asyncio.run(main())

