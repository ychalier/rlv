import asyncio
import websockets
import json


PORT = 8765
SLAVES = dict()
MASTER = None
MASTER_PASSWORD = "master"


def master_command(fun):
    global MASTER

    async def wrapper(websocket, *args):
        if MASTER is not None and MASTER.id == websocket.id:
            await fun(websocket, *args)
        else:
            await respond_status(websocket, "error: unauthorized")
    return wrapper


async def respond_status(websocket, status):
    await websocket.send(json.dumps({"cmd": "status", "arg": status}, default=str))


async def respond_event(websocket, event, content):
    await websocket.send(json.dumps({"cmd": "event", "arg": {"type": event, "content": content}}, default=str))


async def cmd_slave(websocket):
    global SLAVES, MASTER
    SLAVES[str(websocket.id)] = websocket
    await respond_status(websocket, "success")
    if MASTER is not None:
        await respond_event(MASTER, "slave_connected", websocket.id)


async def cmd_master(websocket, arg):
    global MASTER, MASTER_PASSWORD
    if arg == MASTER_PASSWORD:
        MASTER = websocket
        await respond_status(websocket, "success")
    else:
        await respond_status(websocket, "error: unauthorized")


@master_command
async def cmd_broadcast(websocket, arg):
    global SLAVES
    for slave in SLAVES.values():
        await slave.send(json.dumps(arg))
    await respond_status(websocket, "success")


@master_command
async def cmd_tell(websocket, arg):
    global SLAVES
    if arg.get("slave") in SLAVES:
        await SLAVES[arg.get("slave")].send(json.dumps(arg.get("message")))
        await respond_status(websocket, "success")
    else:
        await respond_status(websocket, "error: unknown slave")


@master_command
async def cmd_list(websocket):
    global SLAVES
    for slave_id in SLAVES.keys():
        await respond_event(websocket, "slave_connected", slave_id)


async def cmd_who(websocket):
    await respond_event(websocket, "who", websocket.id)


async def handle_command(websocket, cmd, arg):
    print(f"{websocket.id}\tCMD\t{cmd}")
    if cmd == "slave":
        await cmd_slave(websocket)
    elif cmd == "master":
        await cmd_master(websocket, arg)
    elif cmd == "broadcast":
        await cmd_broadcast(websocket, arg)
    elif cmd == "tell":
        await cmd_tell(websocket, arg)
    elif cmd == "list":
        await cmd_list(websocket)
    elif cmd == "who":
        await cmd_who(websocket)
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
    if str(websocket.id) in SLAVES:
        del SLAVES[str(websocket.id)]
        if MASTER is not None:
            await respond_event(MASTER, "slave_disconnected", websocket.id)
    if websocket.id == MASTER:
        MASTER = None


async def main():
    print(f"Starting server at ws://localhost:{PORT}")
    async with websockets.serve(ws_handler, "localhost", PORT):
        await asyncio.Future()  # run forever


asyncio.run(main())
