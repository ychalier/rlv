import pulp
import enum
import json
import re


@enum.unique
class VariableType(enum.Enum):

    SPAN = 0
    OBJ_TWICE = 1
    OBJ_TOTAL = 2


with open("config.json", "r", encoding="utf8") as file:
    DEFAULT_CONFIG = json.load(file)


def cast_nint(string):
    if string is None:
        return 0
    return int(string)


def compute_slots_durations(config):
    durations = dict()
    pattern = re.compile(r"^(\d+)h(\d+)? \- (\d+)h(\d+)?$")
    for day in config["slots"]:
        for slot in config["slots"][day]:
            match = pattern.match(slot)
            assert match is not None, "Error extracting slot duration for (%s, %s)" % (day, slot)
            durations[(day, slot)] = cast_nint(match.group(3)) + cast_nint(match.group(4)) / 60 - (cast_nint(match.group(1)) + cast_nint(match.group(2)) / 60)
    return durations


def generate(config, debug=True):

    # Pre-processing the config
    for post, constraints in config["constraints"]["posts"].items():
        for i in range(len(constraints)):
            constraints[i] = tuple(constraints[i])
    durations = compute_slots_durations(config)
    # print(durations)
    
    model = pulp.LpProblem("Planning", sense=pulp.LpMinimize)

    # Creating variables
    variables = dict()
    varidx = 0
    for day in config["slots"]:
        for slot in config["slots"][day]:
            for post in config["posts"]:
                if (day, slot) in config["constraints"]["posts"].get(post, []):
                    continue
                for agent in config["agents"]:
                    key = (VariableType.SPAN, day, slot, post, agent)
                    varidx += 1
                    variables[key] = pulp.LpVariable(str(varidx), lowBound=0, upBound=1, cat=pulp.const.LpBinary)

    # All spans must contain exactly one agent.
    # An agent can not be in two different places at the same time.
    for day in config["slots"]:
        for slot in config["slots"][day]:
            for post in config["posts"]:
                if (day, slot) in config["constraints"]["posts"].get(post, []):
                    continue
                e = sum([
                    variables[(VariableType.SPAN, day, slot, post, agent)]
                    for agent in config["agents"]
                    if (VariableType.SPAN, day, slot, post, agent) in variables
                ])
                model.addConstraint(pulp.LpConstraint(e, rhs=1))
            for agent in config["agents"]:
                e = sum([
                    variables[(VariableType.SPAN, day, slot, post, agent)]
                    for post in config["posts"]
                    if (VariableType.SPAN, day, slot, post, agent) in variables
                ])
                model.addConstraint(pulp.LpConstraint(
                    e, sense=pulp.const.LpConstraintLE, rhs=1))

    # Agent absences
    for agent in config["constraints"]["agentsAbsence"]:
        for day, slot in config["constraints"]["agentsAbsence"][agent]:
            for post in config["posts"]:
                key = (VariableType.SPAN, day, slot, post, agent)
                if key not in variables:
                    continue
                model.addConstraint(pulp.LpConstraint(
                    e=variables[key],
                    sense=pulp.const.LpConstraintEQ,
                    rhs=0
                ))

    # Posts attributions
    for post in config["constraints"]["postsAttributions"]:
        for agent in config["constraints"]["postsAttributions"][post]:
            for day in config["slots"]:
                for slot in config["slots"][day]:
                    key = (VariableType.SPAN, day, slot, post, agent)
                    if key not in variables:
                        continue
                    model.addConstraint(pulp.LpConstraint(
                        e=variables[key],
                        sense=pulp.const.LpConstraintEQ,
                        rhs=0
                    ))

    # If possible, try not to do two spans in a row.
    if config["objectives"].get("avoidTwiceInARow", 0) > 0:
        for day in config["slots"]:
            for agent in config["agents"]:
                for slot_prev, slot_next in zip(config["slots"][day][:-1], config["slots"][day][1:]):
                    key = (VariableType.OBJ_TWICE, day, agent, slot_prev, slot_next)
                    varidx += 1
                    y = pulp.LpVariable(
                        str(varidx), lowBound=0, upBound=1, cat=pulp.const.LpBinary)
                    variables[key] = y
                    e1 = sum([
                        variables[(VariableType.SPAN, day,
                                   slot_prev, post, agent)]
                        for post in config["posts"]
                        if (VariableType.SPAN, day, slot_prev, post, agent) in variables
                    ])
                    e2 = sum([
                        variables[(VariableType.SPAN, day,
                                   slot_next, post, agent)]
                        for post in config["posts"]
                        if (VariableType.SPAN, day, slot_next, post, agent) in variables
                    ])
                    model.addConstraint(pulp.LpConstraint(
                        e=e1 + e2 - 1 - y,
                        sense=pulp.const.LpConstraintLE,
                        rhs=0
                    ))
                    model.addConstraint(pulp.LpConstraint(
                        e=y - e1,
                        sense=pulp.const.LpConstraintLE,
                        rhs=0
                    ))
                    model.addConstraint(pulp.LpConstraint(
                        e=y - e2,
                        sense=pulp.const.LpConstraintLE,
                        rhs=0
                    ))
                    model.objective += config["objectives"]["avoidTwiceInARow"] * y

    # Try to make average weekly time equal accross people
    if config["objectives"].get("standardizeWeeklyTotal", 0) > 0:

        weekly_total = 0
        for day in config["slots"]:
            for slot in config["slots"][day]:
                weekly_total += durations[(day, slot)] * len(config["posts"])
        for post in config["constraints"]["posts"]:
            for day, slot in config["constraints"]["posts"][post]:
                weekly_total -= durations[(day, slot)]
        weekly_average = weekly_total / len(config["agents"])

        # weekly_average = (sum(map(len, config["slots"].values())) * len(config["posts"]) - sum(
        #     map(len, config["constraints"]["posts"].values()))) / len(config["agents"])
        # weekly_max = weekly_average * len(config["agents"])
        for agent in config["agents"]:
            target = float(config["objectives"]["refTimes"].get(agent, weekly_average))
            e = sum([
                durations[(day, slot)] * variables[(VariableType.SPAN, day, slot, post, agent)]
                for day in config["slots"]
                for slot in config["slots"][day]
                for post in config["posts"]
                if (VariableType.SPAN, day, slot, post, agent) in variables
            ])
            varidx += 1
            y = pulp.LpVariable(str(varidx), lowBound=0, upBound=weekly_total, cat=pulp.const.LpContinuous)
            variables[(VariableType.OBJ_TOTAL, agent)] = y
            model.addConstraint(pulp.LpConstraint(
                e=y - (e - target),
                sense=pulp.const.LpConstraintGE,
                rhs=0
            ))
            model.addConstraint(pulp.LpConstraint(
                e=y + (e - target),
                sense=pulp.const.LpConstraintGE,
                rhs=0
            ))
            model.objective += config["objectives"]["standardizeWeeklyTotal"] * y

    for agent in config["constraints"]["limits"]:
        model.addConstraint(pulp.LpConstraint(
            e=sum([
                durations[(day, slot)] * variables[(VariableType.SPAN, day, slot, post, agent)]
                for day in config["slots"]
                for slot in config["slots"][day]
                for post in config["posts"]
                if (VariableType.SPAN, day, slot, post, agent) in variables
            ]),
            sense=pulp.const.LpConstraintLE,
            rhs=float(config["constraints"]["limits"][agent])
        ))

    solver = pulp.PULP_CBC_CMD(timeLimit=20, logPath="solver.log")
    result = model.solve(solver)

    solution = {
        "feasible": result == 1,
        "schedule": {
            day: {
                slot: {
                    post: None
                    for post in config["posts"]
                }
                for slot in config["slots"][day]
            }
            for day in config["slots"]
        }
    }
    for key, var in variables.items():
        if key[0] != VariableType.SPAN:
            continue
        day, slot, post, agent = key[1:]
        if var.value() == 1:
            solution["schedule"][day][slot][post] = agent

    if debug:
        with open("debug.tsv", "w", encoding="utf8") as file:
            file.write("vartype\tkey\tvaridx\tvalue\n")
            for key, variable in variables.items():
                file.write("%s\t%s\t%s\t%s\n" % (
                    key[0].name,
                    key[1:],
                    variable,
                    variable.value()
                ))

    return solution


if __name__ == "__main__":
    solution = generate(DEFAULT_CONFIG)
    print(json.dumps(solution, indent=4))
