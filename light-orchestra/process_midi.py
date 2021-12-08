import json
import argparse
from os import stat
import mido


# TODO: add a target slave count parameter; if the number of tracks is too
# low, add copies of tracks, starting by tracks with higher amount of notes;
# if it is too large, merge some tracks, starting by the most correlated ones.

# NOTE: this task could be done by the client JS master, directly selecting
# the target number of channels depending on how many slaves there are. But
# that would prevent dynamic addition of a client during the show.


def split_concurrent_notes(states):
    """Input is a list of states occuring on the same channel.
    """
    xstates = [{**state} for state in states]
    currently_on = list()
    for state in xstates:
        if state["on"]:
            state["channel"] = len(currently_on)
            currently_on.append(state)
        else:
            j = None
            for i, cur_state in enumerate(currently_on):
                if state["note"] == cur_state["note"]:
                    state["channel"] = cur_state["channel"]
                    j = i
                    break
            if j is not None:
                currently_on.pop(j)
    return xstates


def extract_notes(midi_file, split_notes=False):
    messages = []
    cursor = 0
    for message in midi_file:
        cursor += message.time
        if message.type in ["note_on", "note_off"]:
            messages.append({
                "on": message.type == "note_on" and message.velocity > 0,
                "note": message.note,
                "velocity": message.velocity,
                "t": cursor,
                "channel": message.channel
            })
    if split_notes:
        messages = split_concurrent_notes(messages)
    channels = {
        channel: []
        for channel in set([message["channel"] for message in messages])
    }
    states = {
        channel: {
            "on": False,
            "note": 0,
            "velocity": 0,
            "until": 0
        }
        for channel in set([message["channel"] for message in messages])
    }
    for message in messages:
        channel = message["channel"]
        if len(channels[channel]) == 0:
            channels[channel].append({
                "on": message["on"],
                "note": message["note"],
                "velocity": message["velocity"],
                "until": 0
            })
        else:
            states[channel]["until"] = message["t"]
            channels[channel].append({**states[channel]})
            states[channel]["on"] = message["on"]
            states[channel]["note"] = message["note"]
            states[channel]["velocity"] = message["velocity"]
    return {
        "channels": [
            {
                "id": channel,
                "states": channels[channel],
            }
            for channel in channels
        ]
    }


def process_midi(path_input, split_notes=False, scale=1.0):
    midi_file = mido.MidiFile(path_input, clip=True)
    notes = extract_notes(midi_file, split_notes)
    return {
        "channels": [
            {
                "id": channel["id"],
                "states": [
                    {
                        "on": state["on"],
                        "note": state["note"],
                        "velocity": state["velocity"],
                        "until": scale * state["until"]
                    }
                    for state in channel["states"]
                ]
            }
            for channel in notes["channels"]
        ]
    }


def plot(result, n_points=10000):
    import matplotlib.pyplot
    matplotlib.pyplot.figure()
    length = max(channel["states"][-1]["until"] for channel in result["channels"])
    time_step = length / n_points
    times = [i * time_step for i in range(n_points)]
    for channel in result["channels"]:
        j = 0
        series = []
        heretimes = []
        for time in times:
            while j < len(channel["states"]) and channel["states"][j]["until"] < time:
                j += 1
            if j < len(channel["states"]):
                series.append((0 if channel["states"][j]["note"] is None else channel["states"][j]["note"]) * int(channel["states"][j]["on"]))
                heretimes.append(time)
        matplotlib.pyplot.plot(heretimes, series, "o", label=channel["id"])
    matplotlib.pyplot.legend()
    matplotlib.pyplot.show(block=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=str, help="path to the input MIDI file")
    parser.add_argument("output", type=str, help="path to the output JSON file")
    parser.add_argument("-p", "--plot", action="store_true", help="Plot parsed results")
    parser.add_argument("-s", "--split", action="store_true", help="Split channels for polyphony")
    parser.add_argument("-c", "--scale", type=float, default=1, help="Scale MIDI timings")
    args = parser.parse_args()
    result = process_midi(args.input, args.split, args.scale)
    with open(args.output, "w", encoding="utf8") as file:
        json.dump(result, file)
    if args.plot:
        plot(result)


if __name__ == "__main__":
    main()
