import pulp
import enum
import json
import os


import rlvplan


@enum.unique
class VariableType(enum.Enum):

    SPAN = 0
    OBJ_TWICE = 1
    OBJ_TOTAL = 2
    OBJ_TWICE_SAME = 3


with open(os.path.join(__file__, os.pardir, "config.json"), "r", encoding="utf8") as file:
    DEFAULT_CONFIG = json.load(file)


def compute_slots_durations(config):
    durations = dict()
    for day in config["slots"]:
        for slot in config["slots"][day]:
            durations[(day, slot)] = rlvplan.utils.get_slot_duration(slot)
    return durations


class Reasoner:

    def __init__(self, config):
        self.config = config
        self.variables = dict()
        self.varidx = 0
        self.model = pulp.LpProblem("Planning", sense=pulp.LpMinimize)
    
    def build(self):
        self._preprocess_config()
        self._create_variables()
        self._add_constraints_fill()
        self._add_constraints_absences()
        self._add_constraints_attributions()
        self._add_constraints_limits()
        self._add_objective_twiceinrow()
        self._add_objective_twiceinrow_samepost()
        # self._add_objective_quotas_abs()
        self._add_objective_quotas_quad()
    
    def solve(self, debug=True):
        solver = pulp.PULP_CBC_CMD(timeLimit=20, logPath="solver.log")
        result = self.model.solve(solver)
        solution = {
            "feasible": result == 1,
            "schedule": {
                day: {
                    slot: {
                        post: None
                        for post in self.config["posts"]
                    }
                    for slot in self.config["slots"][day]
                }
                for day in self.config["slots"]
            }
        }
        for key, var in self.variables.items():
            if key[0] != VariableType.SPAN:
                continue
            day, slot, post, agent = key[1:]
            if var.value() == 1:
                solution["schedule"][day][slot][post] = agent
        if debug:
            with open("debug.tsv", "w", encoding="utf8") as file:
                file.write("vartype\tkey\tvaridx\tvalue\n")
                for key, variable in self.variables.items():
                    file.write("%s\t%s\t%s\t%s\n" % (
                        key[0].name,
                        key[1:],
                        variable,
                        variable.value()
                    ))
        return solution
    
    def _preprocess_config(self):
        # Pre-processing the config
        for post, constraints in self.config["constraints"]["posts"].items():
            for i in range(len(constraints)):
                constraints[i] = tuple(constraints[i])
        self.config["durations"] = compute_slots_durations(self.config)

    def _create_variables(self):
        for day in self.config["slots"]:
            for slot in self.config["slots"][day]:
                for post in self.config["posts"]:
                    if (day, slot) in self.config["constraints"]["posts"].get(post, []):
                        continue
                    for agent in self.config["agents"]:
                        key = (VariableType.SPAN, day, slot, post, agent)
                        self.varidx += 1
                        self.variables[key] = pulp.LpVariable(str(self.varidx), lowBound=0, upBound=1, cat=pulp.const.LpBinary)

    def _add_constraints_fill(self):
        # All spans must contain exactly one agent.
        # An agent can not be in two different places at the same time.
        for day in self.config["slots"]:
            for slot in self.config["slots"][day]:
                for post in self.config["posts"]:
                    if (day, slot) in self.config["constraints"]["posts"].get(post, []):
                        continue
                    e = sum([
                        self.variables[(VariableType.SPAN, day, slot, post, agent)]
                        for agent in self.config["agents"]
                        if (VariableType.SPAN, day, slot, post, agent) in self.variables
                    ])
                    self.model.addConstraint(pulp.LpConstraint(e, rhs=1))
                for agent in self.config["agents"]:
                    e = sum([
                        self.variables[(VariableType.SPAN, day, slot, post, agent)]
                        for post in self.config["posts"]
                        if (VariableType.SPAN, day, slot, post, agent) in self.variables
                    ])
                    self.model.addConstraint(pulp.LpConstraint(e, sense=pulp.const.LpConstraintLE, rhs=1))
    
    def _add_constraints_absences(self):
        for agent in self.config["constraints"]["agentsAbsence"]:
            for day, slot in self.config["constraints"]["agentsAbsence"][agent]:
                for post in self.config["posts"]:
                    key = (VariableType.SPAN, day, slot, post, agent)
                    if key not in self.variables:
                        continue
                    self.model.addConstraint(pulp.LpConstraint(
                        e=self.variables[key],
                        sense=pulp.const.LpConstraintEQ,
                        rhs=0
                    ))
    
    def _add_constraints_attributions(self):
        for post in self.config["constraints"]["postsAttributions"]:
            for agent in self.config["constraints"]["postsAttributions"][post]:
                for day in self.config["slots"]:
                    for slot in self.config["slots"][day]:
                        key = (VariableType.SPAN, day, slot, post, agent)
                        if key not in self.variables:
                            continue
                        self.model.addConstraint(pulp.LpConstraint(
                            e=self.variables[key],
                            sense=pulp.const.LpConstraintEQ,
                            rhs=0
                        ))
    
    def _add_constraints_limits(self):
        for agent in self.config["constraints"]["limits"]:
            self.model.addConstraint(pulp.LpConstraint(
                e=sum([
                    self.config["durations"][(day, slot)] * self.variables[(VariableType.SPAN, day, slot, post, agent)]
                    for day in self.config["slots"]
                    for slot in self.config["slots"][day]
                    for post in self.config["posts"]
                    if (VariableType.SPAN, day, slot, post, agent) in self.variables
                ]),
                sense=pulp.const.LpConstraintLE,
                rhs=float(self.config["constraints"]["limits"][agent])
            ))
    
    def _add_objective_twiceinrow(self):
        # If possible, try not to do two spans in a row.
        if self.config["objectives"].get("avoidTwiceInARow", 0) <= 0:
            return
        for day in self.config["slots"]:
            for agent in self.config["agents"]:
                for slot_prev, slot_next in zip(self.config["slots"][day][:-1], self.config["slots"][day][1:]):
                    key = (VariableType.OBJ_TWICE, day, agent, slot_prev, slot_next)
                    self.varidx += 1
                    y = pulp.LpVariable(
                        str(self.varidx), lowBound=0, upBound=1, cat=pulp.const.LpBinary)
                    self.variables[key] = y
                    e1 = sum([
                        self.variables[(VariableType.SPAN, day,
                                slot_prev, post, agent)]
                        for post in self.config["posts"]
                        if (VariableType.SPAN, day, slot_prev, post, agent) in self.variables
                    ])
                    e2 = sum([
                        self.variables[(VariableType.SPAN, day,
                                slot_next, post, agent)]
                        for post in self.config["posts"]
                        if (VariableType.SPAN, day, slot_next, post, agent) in self.variables
                    ])
                    self.model.addConstraint(pulp.LpConstraint(
                        e=e1 + e2 - 1 - y,
                        sense=pulp.const.LpConstraintLE,
                        rhs=0
                    ))
                    self.model.addConstraint(pulp.LpConstraint(
                        e=y - e1,
                        sense=pulp.const.LpConstraintLE,
                        rhs=0
                    ))
                    self.model.addConstraint(pulp.LpConstraint(
                        e=y - e2,
                        sense=pulp.const.LpConstraintLE,
                        rhs=0
                    ))
                    self.model.objective += self.config["objectives"]["avoidTwiceInARow"] * y
    
    def _add_objective_twiceinrow_samepost(self):
        # If possible, try not to do two spans in a row.
        if self.config["objectives"].get("avoidTwiceInARow", 0) <= 0:
            return
        for day in self.config["slots"]:
            for agent in self.config["agents"]:
                for slot_prev, slot_next in zip(self.config["slots"][day][:-1], self.config["slots"][day][1:]):
                    for post in self.config["posts"]:
                        if (VariableType.SPAN, day, slot_prev, post, agent) not in self.variables:
                            continue
                        if (VariableType.SPAN, day, slot_next, post, agent) not in self.variables:
                            continue
                        key = (VariableType.OBJ_TWICE_SAME, day, agent, slot_prev, slot_next)
                        self.varidx += 1
                        y = pulp.LpVariable(str(self.varidx), lowBound=0, upBound=1, cat=pulp.const.LpBinary)
                        self.variables[key] = y
                        e1 = self.variables[(VariableType.SPAN, day, slot_prev, post, agent)]
                        e2 = self.variables[(VariableType.SPAN, day, slot_next, post, agent)]
                        self.model.addConstraint(pulp.LpConstraint(
                            e=e1 + e2 - 1 - y,
                            sense=pulp.const.LpConstraintLE,
                            rhs=0
                        ))
                        self.model.addConstraint(pulp.LpConstraint(
                            e=y - e1,
                            sense=pulp.const.LpConstraintLE,
                            rhs=0
                        ))
                        self.model.addConstraint(pulp.LpConstraint(
                            e=y - e2,
                            sense=pulp.const.LpConstraintLE,
                            rhs=0
                        ))
                        self.model.objective += .1 * self.config["objectives"]["avoidTwiceInARow"] * y

    def _add_objective_quotas_abs(self):
        if self.config["objectives"].get("standardizeWeeklyTotal", 0) <= 0:
            return
        weekly_total = 0
        for day in self.config["slots"]:
            for slot in self.config["slots"][day]:
                weekly_total += self.config["durations"][(day, slot)] * len(self.config["posts"])
        for post in self.config["constraints"]["posts"]:
            for day, slot in self.config["constraints"]["posts"][post]:
                weekly_total -= self.config["durations"][(day, slot)]
        weekly_average = weekly_total / len(self.config["agents"])
        for agent in self.config["agents"]:
            target = float(self.config["objectives"]["refTimes"].get(agent, weekly_average))
            e = sum([
                self.config["durations"][(day, slot)] * self.variables[(VariableType.SPAN, day, slot, post, agent)]
                for day in self.config["slots"]
                for slot in self.config["slots"][day]
                for post in self.config["posts"]
                if (VariableType.SPAN, day, slot, post, agent) in self.variables
            ])
            self.varidx += 1
            y = pulp.LpVariable(str(self.varidx), lowBound=0, upBound=weekly_total, cat=pulp.const.LpContinuous)
            self.variables[(VariableType.OBJ_TOTAL, agent)] = y
            self.model.addConstraint(pulp.LpConstraint(
                e=y - (e - target),
                sense=pulp.const.LpConstraintGE,
                rhs=0
            ))
            self.model.addConstraint(pulp.LpConstraint(
                e=y + (e - target),
                sense=pulp.const.LpConstraintGE,
                rhs=0
            ))
            self.model.objective += self.config["objectives"]["standardizeWeeklyTotal"] * y
    
    def _add_objective_quotas_quad(self):
        if self.config["objectives"].get("standardizeWeeklyTotal", 0) <= 0:
            return
        weekly_total = 0
        for day in self.config["slots"]:
            for slot in self.config["slots"][day]:
                weekly_total += self.config["durations"][(day, slot)] * len(self.config["posts"])
        for post in self.config["constraints"]["posts"]:
            for day, slot in self.config["constraints"]["posts"][post]:
                weekly_total -= self.config["durations"][(day, slot)]
        weekly_average = weekly_total / len(self.config["agents"])
        for agent in self.config["agents"]:
            target = float(self.config["objectives"]["refTimes"].get(agent, weekly_average))
            e = sum([
                self.config["durations"][(day, slot)] * self.variables[(VariableType.SPAN, day, slot, post, agent)]
                for day in self.config["slots"]
                for slot in self.config["slots"][day]
                for post in self.config["posts"]
                if (VariableType.SPAN, day, slot, post, agent) in self.variables
            ])
            for h in range(1, 11):
                self.varidx += 1
                y = pulp.LpVariable(str(self.varidx), lowBound=0, upBound=weekly_total, cat=pulp.const.LpContinuous)
                self.variables[(VariableType.OBJ_TOTAL, agent, h)] = y
                self.model.addConstraint(pulp.LpConstraint(
                    e=y - e,
                    sense=pulp.const.LpConstraintGE,
                    rhs=1-target-h
                ))
                self.model.objective += self.config["objectives"]["standardizeWeeklyTotal"] * y * (h ** 2)


def generate(config):
    reasoner = Reasoner(config)
    reasoner.build()
    solution = reasoner.solve()
    return solution


if __name__ == "__main__":
    solution = generate(DEFAULT_CONFIG)
    print(json.dumps(solution, indent=4))
