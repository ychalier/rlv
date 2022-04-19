import os
import re
import json
import time
import random
import argparse
import subprocess
import tqdm


def generate_grid(n_rows, n_cols, emojis_file, targets_file):
    with open(emojis_file, "r", encoding="utf8") as file:
        emojis = list(re.sub("\n", "", file.read()).strip())
    with open(targets_file, "r", encoding="utf8") as file:
        targets = list(re.sub("\n", "", file.read()).strip())
    grid = [
        [
            random.choice(emojis)
            for _ in range(n_cols)
        ] for _ in range(n_rows)
    ]
    solution = dict()
    positions = [(i, j) for i in range(n_rows) for j in range(n_cols)]
    random.shuffle(positions)
    for k, target in enumerate(targets):
        i, j = positions[k]
        solution[target] = {
            "row": i + 1,
            "column": j + 1
        }
        grid[i][j] = target
    return grid, solution


def generate_svg(grid, template_file, cell_size=15):
    with open(template_file, "r", encoding="utf8") as file:
        template = file.read()
    n_rows = len(grid)
    n_cols = len(grid[0])
    width = (n_cols + 1) * cell_size
    height = (n_rows + 1) * cell_size
    svg_content = ""
    style = """dominant-baseline="middle" text-anchor="middle" """
    for i in range(n_rows):
        x = .5 * cell_size
        y = (i + 1.5) * cell_size
        svg_el = f"""<text x="{x}" y="{y}" {style} font-size="5pt">{i + 1}</text>\n"""
        svg_content += svg_el
    for j in range(n_cols):
        x = (j + 1.5) * cell_size
        y = .5 * cell_size
        svg_el = f"""<text x="{x}" y="{y}" {style} font-size="5pt">{j + 1}</text>\n"""
        svg_content += svg_el
    for i in range(n_rows):
        for j in range(n_cols):
            symbol = grid[i][j]
            x = (j + 1.5) * cell_size
            y = (i + 1.5) * cell_size
            svg_el = f"""<text x="{x}" y="{y}" {style}>{symbol}</text>\n"""
            svg_content += svg_el
    return template.format(
        width=width,
        height=height,
        content=svg_content)



def generate_files(svg, solution, output_dir, inkscape, ffmpeg):
    timestamp = int(time.time() * 1000)
    with open(os.path.join(output_dir, f"{timestamp}.json"), "w", encoding="utf8") as file:
        json.dump(solution, file, indent=4)
    with open(os.path.join(output_dir, f"{timestamp}.svg"), "w", encoding="utf8") as file:
        file.write(svg)
    pbar = tqdm.tqdm(total=2, desc="Generating")
    subprocess.Popen(
        [
            inkscape,
            os.path.join(output_dir, f"{timestamp}.svg"),
            "--export-type=png",
            "--export-dpi=300",
            "--export-background=white"
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    ).wait()
    pbar.update(1)
    subprocess.Popen(
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            os.path.join(output_dir, f"{timestamp}.png"),
            os.path.join(output_dir, f"{timestamp}.jpg")
        ]
    ).wait()
    pbar.update(1)
    pbar.close()
    os.remove(os.path.join(output_dir, f"{timestamp}.svg"))
    os.remove(os.path.join(output_dir, f"{timestamp}.png"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("-r", "--n-rows", type=int, default=29)
    parser.add_argument("-c", "--n-cols", type=int, default=42)
    parser.add_argument("-s", "--cell-size", type=int, default=15)
    parser.add_argument("-o", "--output-dir", type=str, default=".")
    parser.add_argument("--inkscape", type=str, default=r"C:\Program Files\Inkscape\bin\inkscape.com")
    parser.add_argument("--ffmpeg", type=str, default="ffmpeg")
    parser.add_argument("--emojis-file", type=str, default="emojis.txt")
    parser.add_argument("--targets-file", type=str, default="targets.txt")
    parser.add_argument("--template-file", type=str, default="template.svg")
    args = parser.parse_args()
    grid, solution = generate_grid(args.n_rows, args.n_cols, args.emojis_file, args.targets_file)
    svg = generate_svg(grid, args.template_file, args.cell_size)
    generate_files(svg, solution, args.output_dir, args.inkscape, args.ffmpeg)


if __name__ == "__main__":
    main()