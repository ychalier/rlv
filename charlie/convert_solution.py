import argparse
import csv


TARGETS = "😐😔😠😨😄😿🐃🐳🐤🙈"


def convert_solution(input_path, ouptut_path):
    data = {}
    with open(input_path, "r", encoding="utf8") as file:
        for line in file.readlines():
            block, miner, emoji, position = line.strip().split("\t")
            data.setdefault((block, miner), {})
            data[block, miner][emoji] = position
    entries = []
    for block, miner in data:
        entries.append({
            "block": block,
            "miner": miner,
            **{
                target: data[(block, miner)][target]
                for target in TARGETS
            }
        })
    with open(ouptut_path, "w", encoding="utf8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=["block", "miner", *TARGETS])
        writer.writeheader()
        writer.writerows(entries)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input_path", type=str)
    parser.add_argument("output_path", type=str)
    args = parser.parse_args()
    convert_solution(args.input_path, args.output_path)


if __name__ == "__main__":
    main()