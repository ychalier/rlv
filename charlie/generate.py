import os
import re
import time
import random
import argparse
import itertools
import subprocess
import math
import tqdm

EMOJIS_FILL = """
😀😁😂🤣😃😅😆
😉😊😋😎😍😘🥰😗
😙😚☺🙂🤗🤩🤔🤨
😑😶🙄😏😣😥😮
🤐😯😪😫🥱😴😌😛
😜😝🤤😒😓😕🙃
🤑😲☹🙁😖😞😟😤
😢😭😦😧😩🤯😬
😰😱🥵🥶😳🤪😵🥴
😡🤬😷🤒🤕🤢🤮
🤧😇🥳🥺🤠🤡🤥🤫
🤭🧐🤓😈👿👹👺💀
👻👽👾🤖💩😺😸😹
😻😼😽🙀😾🐱
🙉🙊🐵🐶🐺🐱🦁🐯
🦒🦊🦝🐮🐷🐗🐭🐹
🐰🐻🐨🐼🐸🦓🐴🦄
🐔🐲🐒🦍🦧🦮🐕🐩
🐕🐈🐅🐆🐎🦌🦏🦛
🐂🐄🐖🐏🐑🐐🐪
🐫🦙🦘🦥🦨🦡🐘🐁
🐀🦔🐇🦎🐊🐢🐍🐉
🦕🦖🦦🦈🐬🐋🐟
🐠🐡🦐🦑🐙🦞🦀🐚
🦆🐓🦃🦅🦢🦜🦩🦚
🦉🐦🐧🐥🐣🦇🦋
🐌🐛🦟🦗🐜🐝🐞🦂
🕷
""".strip()

EMOJIS_TARGET = """😐😔😠😨😄😿🐃🐳🐤🙈"""


def generate_test_grid(n_rows, n_cols, emojis_fill):
    emojis = list(re.sub("[ \n]", "", emojis_fill).strip())
    generator = itertools.cycle(emojis)
    return [
        [
            next(generator)
            for _ in range(n_cols)
        ] for _ in range(n_rows)
    ], {}


def generate_grid(n_rows, n_cols, emojis_fill, emojis_target):
    emojis = list(re.sub("[ \n]", "", emojis_fill).strip())
    targets = list(re.sub("[ \n]", "", emojis_target).strip())
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
            "column": index_to_letters(j + 1)
        }
        grid[i][j] = target
    return grid, solution


def index_to_letters(k):
    if k == 0:
        return ""
    cur = "A"
    while k > 1:
        zrow = len(cur)
        while zrow >= 1 and cur[zrow - 1] == "Z":
            zrow -= 1
        if zrow == len(cur):
            cur = cur[:-1] + chr(ord(cur[-1]) + 1)
        elif zrow == 0:
            cur = "A" * (len(cur) + 1)
        else:
            if zrow == 1:
                cur = chr(ord(cur[zrow - 1]) + 1) + "A" * (len(cur) - zrow)
            else:
                cur = cur[:zrow - 1] + chr(ord(cur[zrow - 1]) + 1) + "A" * (len(cur) - zrow)
        k -= 1
    return cur


def generate_svg(grid, cell_size=15):
    n_rows = len(grid)
    n_cols = len(grid[0])
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
        svg_el = f"""<text x="{x}" y="{y}" {style} font-size="5pt">{index_to_letters(j + 1)}</text>\n"""
        svg_content += svg_el
    for i in range(n_rows):
        for j in range(n_cols):
            symbol = grid[i][j]
            x = (j + 1.5) * cell_size
            y = (i + 1.5) * cell_size
            svg_el = f"""<text x="{x}" y="{y}" {style} font-size="8pt">{symbol}</text>\n"""
            svg_content += svg_el
    return svg_content


def generate_pdf(svg, output_path, inkscape):
    with open(output_path + ".svg", "w", encoding="utf8") as file:
        file.write(svg)
    subprocess.Popen(
        [
            inkscape,
            output_path + ".svg",
            "--actions=select-all;object-to-path",
            "--export-type=pdf",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    ).wait()
    os.remove(output_path + ".svg")


def generate_pages(
        block_count,
        miner_per_page,
        miners,
        target_box_width,
        n_rows,
        n_cols,
        cell_size,
        emojis_fill,
        emojis_target,
        template_file,
        output_dir,
        inkscape):
    with open(template_file, "r", encoding="utf8") as file:
        template = file.read()
    os.makedirs(output_dir, exist_ok=True)
    page_index = 0
    timestamp = int(time.time() * 1000)
    page_count = block_count * math.ceil(len(miners) / miner_per_page)
    pbar = tqdm.tqdm(total=page_count, unit="page")
    solutions = {}
    for block_number in range(1, block_count + 1):
        for i in range(0, len(miners), miner_per_page):
            challenge_index = 0
            format_keys = {
                "block_number": block_number,
                "box_scale": target_box_width / ((n_cols + 1) * cell_size)
            }
            for j in range(miner_per_page):
                if i + j >= len(miners):
                    format_keys[f"miner_{challenge_index}"] = "–"
                    format_keys[f"svg_{challenge_index}"] = ""
                    break
                format_keys[f"miner_{challenge_index}"] = miners[i + j]
                grid, solution = generate_grid(n_rows, n_cols, emojis_fill, emojis_target)
                solutions[(block_number, miners[i + j])] = solution
                format_keys[f"svg_{challenge_index}"] = generate_svg(grid, cell_size)
                challenge_index += 1
            svg = template.format(**format_keys)
            generate_pdf(svg, os.path.join(output_dir, f"{timestamp}_{page_index:03}"), inkscape)
            pbar.update(1)
            page_index += 1
    pbar.close()
    with open(os.path.join(output_dir, f"{timestamp}.txt"), "w", encoding="utf8") as file:
        for block_number, miner in solutions:
            for target in solutions[block_number, miner]:
                pos = solutions[block_number, miner][target]
                file.write(f"""{block_number}\t{miner}\t{target}\t{pos['column']}{pos['row']}\n""")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("-r", "--n-rows", type=int, default=50)
    parser.add_argument("-c", "--n-cols", type=int, default=26)
    parser.add_argument("-s", "--cell-size", type=int, default=15)
    parser.add_argument("-b", "--block-count", type=int, default=2)
    parser.add_argument("-mpp", "--miner-per-page", type=int, default=2)
    parser.add_argument("-m", "--miners", type=str, default="αβγδ")
    parser.add_argument("-tbw", "--target-box-width", type=float, default=90)
    parser.add_argument("-tf", "--template-file", type=str, default="template.svg")
    parser.add_argument("-o", "--output-dir", type=str, default=".")
    parser.add_argument("-t", "--use-test-grid", action="store_true")
    parser.add_argument("-ef", "--emojis-fill", type=str, default=EMOJIS_FILL)
    parser.add_argument("-et", "--emojis-target", type=str, default=EMOJIS_TARGET)
    parser.add_argument("--inkscape", type=str, default=r"C:\Program Files\Inkscape\bin\inkscape.com")
    args = parser.parse_args()
    generate_pages(
        args.block_count,
        args.miner_per_page,
        args.miners,
        args.target_box_width,
        args.n_rows,
        args.n_cols,
        args.cell_size,
        args.emojis_fill,
        args.emojis_target,
        args.template_file,
        args.output_dir,
        args.inkscape
    )
    

if __name__ == "__main__":
    main()