import json
import argparse
import mido


# TODO: add a target slave count parameter; if the number of tracks is too
# low, add copies of tracks, starting by tracks with higher amount of notes;
# if it is too large, merge some tracks, starting by the most correlated ones.

# NOTE: this task could be done by the client JS master, directly selecting
# the target number of channels depending on how many slaves there are. But
# that would prevent dynamic addition of a client during the show.


def process_midi(path_input):
    midi_file = mido.MidiFile(path_input, clip=True)
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
    args = parser.parse_args()
    result = process_midi(args.input)
    with open(args.output, "w", encoding="utf8") as file:
        json.dump(result, file)
    if args.plot:
        plot(result)


if __name__ == "__main__":
    main()