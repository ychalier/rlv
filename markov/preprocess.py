import argparse
import json
import re


def update_chain(chain, seq):
    if len(seq) == 0:
        return
    head = seq[0]
    tail = seq[1:]
    chain.setdefault(head, {
        "children": {},
        "score": 0
    })
    chain[head]["score"] += 1
    update_chain(chain[head]["children"], tail)


def prune_chain_node(node, k):
    candidates = []
    for child in node["children"]:
        candidates.append((child, node["children"][child]["score"], node["children"][child]["children"]))
    node["children"] = {}
    for child, score, children in candidates[:k]:
        node["children"][child] = {
            "children": children,
            "score": score
        }
    for child in node["children"]:
        prune_chain_node(node["children"][child], k)


def normalize_chain_node(node):
    total = 0
    for child in node["children"]:
        total += node["children"][child]["score"]
    if total > 0:
        for child in node["children"]:
            node["children"][child]["score"] /= total
    for child in node["children"]:
        normalize_chain_node(node["children"][child])


def build_markov_chain(text, depth, k):
    # chain = dict()
    tokens = [
        t for t  in map(lambda s: s.strip(), re.split(r"(\W)", text.lower()))
        if t != ""
    ]
    print("Text contains", len(tokens), "tokens")
    print("Building chain...")
    chain = dict()
    for seq in zip(*[tokens[d:] for d in range(depth + 1)]):
        update_chain(chain, seq)
    if k is not None:
        print("Pruning...")
        for token in chain:
            prune_chain_node(chain[token], k)
    print("Normalizing...")
    for token in chain:
        normalize_chain_node(chain[token])


        

    return {
        "chain": chain,
        "tokens": list(set(tokens))
    }


    # for i in range(len(tokens) - depth):
    #     chain[tokens[i]] = explore_from_index(tokens, i, depth, k)

    # for token_raw in re.split(r"(\W)", text.lower()):
    #     token = token_raw.strip()
    #     if token == "":
    #         continue
    #     if token not in chain:
    #         chain[token] = {}
    #         n_tokens += 1
    #     if prev_token is not None:
    #         chain[prev_token].setdefault(token, 0)
    #         chain[prev_token][token] += 1
    #         n_links += 1
    #     prev_token = token
    # print("Markov chain contains", n_tokens, "tokens and", n_links, "links")
    # if k is not None:
    #     print("Pruning...")
    #     for token in chain:
    #         if len(chain[token].keys()) <= k:
    #             continue
    #         chain[token] = {
    #             label: value
    #             for label, value in sorted(chain[token].items(), key=lambda x: -x[1])[:k]
    #         }            
    # print("Normalizing weights...")
    # for token in chain:
    #     total = sum(chain[token].values())
    #     for key in chain[token]:
    #         chain[token][key] /= total
    # return {
    #     "chain": chain,
    #     "tokens": set(tokens),
    #     "depth": depth
    # }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=str, help="Input text file (utf8)")
    parser.add_argument("output", type=str, help="Output JSON file (utf8)")
    parser.add_argument("-k", "--top-k", type=int, default=0, help="Pruning amount (0 means no pruning)")
    parser.add_argument("-d", "--depth", type=int, default=1, help="Co-occurrences depth (more means more context)")
    args = parser.parse_args()
    with open(args.input, "r", encoding="utf8") as file:
        text = file.read()
    chain = build_markov_chain(text, k=None if args.top_k == 0 else args.top_k, depth=args.depth)
    with open(args.output, "w", encoding="utf8") as file:
        json.dump(chain, file)


if __name__ == "__main__":
    main()
