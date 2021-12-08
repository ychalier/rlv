import json
import argparse
import matplotlib.pyplot
from pydub import AudioSegment


def plot(result, sound, n_points=10000):
    fig, ax1 = matplotlib.pyplot.subplots()
    length = max(channel["states"][-1]["until"] for channel in result["channels"])
    time_step = length / n_points
    times = [i * time_step for i in range(n_points)]

    skip = 100

    frame_times = [
        i / sound.frame_rate
        for i in range(int(sound.frame_count()))
    ]
    ax1.plot(frame_times[::skip], sound.get_array_of_samples()[::2 * skip], label="Sound", c="k", alpha=0.5)

    ax2 = ax1.twinx()

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
        ax2.plot(heretimes, series, "o", label=channel["id"])

    
    
    ax2.set_xlabel("Time (s)")
    ax2.set_ylabel("Note (MIDI)")
    matplotlib.pyplot.legend()
    matplotlib.pyplot.show(block=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("json", type=str)
    parser.add_argument("mp3", type=str)
    parser.add_argument("-p", "--points", type=int, default=10000)
    args = parser.parse_args()
    with open(args.json, "r", encoding="utf8") as file:
        data = json.load(file)
    sound = AudioSegment.from_file(args.mp3, format="mp3")
    plot(data, sound, args.points)


if __name__ == "__main__":
    main()