import pulp
import json
import argparse
import os


def reason(coms, bibs, dists, n, alpha=1):
    model = pulp.LpProblem("CouvertureTerritoire", sense=pulp.LpMinimize)
    variables = dict()
    for i, com in enumerate(coms["features"]):
        for j, bib in enumerate(bibs["features"]):
            key = f"x_{i}_{j}"
            variables[key] = pulp.LpVariable(key, lowBound=0, upBound=1, cat=pulp.const.LpBinary)
        model.addConstraint(pulp.LpConstraint(
            e=sum([variables[f"x_{i}_{j}"] for j, _ in enumerate(bibs["features"])]),
            sense=pulp.const.LpConstraintEQ,
            rhs=1
        ))
    for j, bib in enumerate(bibs["features"]):
        key = f"y_{j}"
        variables[key] = pulp.LpVariable(key, lowBound=0, upBound=1, cat=pulp.const.LpBinary)
        for i, com in enumerate(coms["features"]):
            model.addConstraint(pulp.LpConstraint(
                e=variables[f"y_{j}"] - variables[f"x_{i}_{j}"],
                sense=pulp.const.LpConstraintGE,
                rhs=0
            ))
    model.addConstraint(pulp.LpConstraint(
        e=sum([variables[f"y_{j}"] for j, bib in enumerate(bibs["features"])]),
        sense=pulp.const.LpConstraintLE,
        rhs=n
    ))
    model += sum([
        com["properties"]["population"] * dists[i][j] * variables[f"x_{i}_{j}"]
        for i, com in enumerate(coms["features"])
        for j, bib in enumerate(bibs["features"])
    ]) + sum([
        alpha * variables[f"y_{j}"]
        for j, bib in enumerate(bibs["features"])
    ])
    solver = pulp.PULP_CBC_CMD()
    result = model.solve(solver)
    assert result == 1
    for j, bib in enumerate(bibs["features"]):
        bib["properties"]["selected"] = variables[f"y_{j}"].value() == 1
    return bibs


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("path_coms", type=str)
    parser.add_argument("path_bibs", type=str)
    parser.add_argument("path_dists", type=str)
    parser.add_argument("path_results", type=str)
    args = parser.parse_args()
    with open(args.path_coms, "r", encoding="utf8") as file:
        coms = json.load(file)
    with open(args.path_bibs, "r", encoding="utf8") as file:
        bibs = json.load(file)
    with open(args.path_dists, "r", encoding="utf8") as file:
        dists = json.load(file)
    for n in range(1, len(bibs["features"]) + 1):
        results = reason(coms, bibs, dists, n)
        with open(os.path.join(args.path_results, f"{n}.geojson"), "w", encoding="utf8") as file:
            json.dump(results, file)


if __name__ == "__main__":
    main()