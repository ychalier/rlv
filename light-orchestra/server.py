import asyncio
import websockets
import json


PORT = 8765
SLAVES = dict()
MASTER = None
MASTER_PASSWORD = "master"


async def respond_status(websocket, status):
    await websocket.send(json.dumps({"cmd": "status", "arg": status}, default=str))


async def respond_event(websocket, event, content):
    await websocket.send(json.dumps({"cmd": "event", "arg": {"type": event, "content": content}}, default=str))


async def handle_command(websocket, cmd, arg):
    global SLAVES, MASTER, MASTER_PASSWORD
    print(f"{websocket.id}\tCMD\t{cmd}")
    if cmd == "slave":
        SLAVES[websocket.id] = websocket
        await respond_status(websocket, "success")
        if MASTER is not None:
            await respond_event(MASTER, "slave_connected", websocket.id)
    elif cmd == "master":
        if arg == MASTER_PASSWORD:
            MASTER = websocket
            await respond_status(websocket, "success")
        else:
            await respond_status(websocket, "error: wrong password")
    elif cmd == "broadcast":
        if MASTER is not None and websocket.id == MASTER.id:
            for slave in SLAVES.values():
                await slave.send(json.dumps(arg))
            await respond_status(websocket, "success")
        else:
            await respond_status(websocket, "error: unauthorized")
    else:
        await respond_status(websocket, "error: unknown command")


async def ws_handler(websocket, path):
    global MASTER, SLAVES
    print(f"{websocket.id}\tCONNECTED")
    async for message in websocket:
        try:
            data = json.loads(message)
            await handle_command(websocket, data.get("cmd"), data.get("arg"))
        except json.decoder.JSONDecodeError:
            await respond_status(websocket, "error: invalid json")
    print(f"{websocket.id}\tDISCONNECTED")
    if websocket.id in SLAVES:
        del SLAVES[websocket.id]
        if MASTER is not None:
            await respond_event(MASTER, "slave_disconnected", websocket.id)
    if websocket.id == MASTER:
        MASTER = None


async def main():
    print(f"Starting server at ws://localhost:{PORT}")
    async with websockets.serve(ws_handler, "localhost", PORT):
        await asyncio.Future()  # run forever


asyncio.run(main())
