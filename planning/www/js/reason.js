import {get, get_slot_duration } from "./misc.js";
import GLPK from "./glpk.js";
import { Schedule } from "./schedule.js";

var glpk;

class Model {
    constructor(config) {
        this.config = config;
        this.vars = {};
        this.varcount = 0;
        this.problem = {
            name: "LP",
            objective: {
                direction: glpk.GLP_MIN,
                name: "obj",
                vars: []
            },
            generals: [],
            binaries: [],
            subjectTo: [],
        }
    }

    create() {
        this._create_variables();
        this._add_constraints_fill();
        //this._add_constraints_agents_weekly_time_limit();
        this._add_objectives_avoid_twice_in_row();
        //this._add_objectives_agents_weekly_time();
    }

    iterate_slots_posts(callback) {
        this.config.get_slots_days().forEach(day => {
            this.config.get_slots_times(day).forEach(slot => {
                this.config.settings.posts.forEach(post => {
                    if (!this.config.is_post_closed(day, slot, post)) {
                        callback(day, slot, post);
                    }
                });
            });
        });
    }

    iterate_slots_agents(callback) {
        this.config.get_slots_days().forEach(day => {
            this.config.get_slots_times(day).forEach(slot => {
                this.config.settings.agents.forEach(agent => {
                    if (!this.config.is_agent_absent(day, slot, agent)) {
                        callback(day, slot, agent);
                    }
                });
            });
        });
    }

    iterate_slots_posts_agents(callback) {
        this.iterate_slots_posts((day, slot, post) => {
            this.config.settings.agents.forEach(agent => {
                if (!this.config.is_agent_absent(day, slot, agent) && !this.config.is_agent_excluded_from_post(agent, post)) {
                    callback(day, slot, post, agent);
                }
            });
        });
    }

    _add_var(varname) {
        this.vars[varname] = this.varcount.toString();
        this.varcount++;
        return this.vars[varname];
    }

    _create_variables() {
        this.iterate_slots_posts_agents((day, slot, post, agent) => {
            let varname = `span_${day}_${slot}_${post}_${agent}`;
            let varidx = this._add_var(varname);
            this.problem.binaries.push(varidx);
        });
    }

    _add_constraints_fill() {
        this.iterate_slots_posts((day, slot, post) => {
            let expr = [];
            this.config.settings.agents.forEach(agent => {
                let varname = `span_${day}_${slot}_${post}_${agent}`;
                if (varname in this.vars) {
                    expr.push({
                        name: this.vars[varname],
                        coef: 1
                    });
                }
            });
            this.problem.subjectTo.push({
                name: `fill_post_${day}_${slot}_${post}`,
                vars: expr,
                bnds: {
                    type: glpk.GLP_FX,
                    ub: 1,
                    lb: 1
                }
            });
        });
        this.iterate_slots_agents((day, slot, agent) => {
            let expr = [];
            this.config.settings.posts.forEach(post => {
                let varname = `span_${day}_${slot}_${post}_${agent}`;
                if (varname in this.vars) {
                    expr.push({
                        name: this.vars[varname],
                        coef: 1
                    });
                }
            });
            this.problem.subjectTo.push({
                name: `fill_agent_${day}_${slot}_${agent}`,
                vars: expr,
                bnds: {
                    type: glpk.GLP_UP,
                    ub: 1
                }
            });
        })
    }

    _add_constraints_agents_weekly_time_limit() {
        this.config.settings.agents.forEach(agent => {
            if (agent in this.config.constraints.agents_weekly_time_limit) {
                let expr = [];
                this.iterate_slots_posts((day, slot, post) => {
                    let varname = `span_${day}_${slot}_${post}_${agent}`;
                    if (varname in this.vars) {
                        expr.push({
                            name: this.vars[varname],
                            coef: get_slot_duration(slot)
                        });
                    }
                });
                if (expr.length > 0) {
                    this.problem.subjectTo.push({
                        name: `limit_${agent}`,
                        vars: expr,
                        bnds: {
                            type: glpk.GLP_UP,
                            ub: this.config.constraints.agents_weekly_time_limit[agent]
                        }
                    });
                }
            }
        });
    }

    _add_objectives_avoid_twice_in_row() {
        if (this.config.weights.avoid_twice_in_row == 0) return;
        this.config.get_slots_days().forEach(day => {
            let slots = this.config.get_slots_times(day);
            this.config.settings.agents.forEach(agent => {
                for (let i = 1; i < slots.length; i++) {
                    let slot_prev = slots[i - 1];
                    let slot_next = slots[i];
                    let varname = `twice_${day}_${slot_prev}_${agent}`;
                    let varidx = this._add_var(varname);
                    this.problem.binaries.push(varidx);
                    let e1 = [];
                    let e2 = [];
                    this.config.settings.posts.forEach(post => {
                        varname = `span_${day}_${slot_prev}_${post}_${agent}`;
                        if (varname in this.vars) {
                            e1.push({
                                name: this.vars[varname],
                                coef: 1
                            });
                        }
                        varname = `span_${day}_${slot_next}_${post}_${agent}`;
                        if (varname in this.vars) {
                            e2.push({
                                name: this.vars[varname],
                                coef: 1
                            });
                        }
                    });
                    this.problem.subjectTo.push({
                        name: `twice_in_row_${day}_${slot_prev}_${agent}_1`,
                        vars: e1.concat(e2).concat([{
                            name: varidx,
                            coef: -1
                        }]),
                        bnds: {
                            type: glpk.GLP_UP,
                            ub: 1
                        }
                    });
                    this.problem.subjectTo.push({
                        name: `twice_in_row_${day}_${slot_prev}_${agent}_2`,
                        vars: e1.concat([{
                            name: varidx,
                            coef: -1
                        }]),
                        bnds: {
                            type: glpk.GLP_LO,
                            lb: 0
                        }
                    });
                    this.problem.subjectTo.push({
                        name: `twice_in_row_${day}_${slot_prev}_${agent}_3`,
                        vars: e2.concat([{
                            name: varidx,
                            coef: -1
                        }]),
                        bnds: {
                            type: glpk.GLP_LO,
                            lb: 0
                        }
                    });
                    this.problem.objective.vars.push({
                        name: varidx,
                        coef: this.config.weights.avoid_twice_in_row
                    });
                }
            });
        });
    }

    _add_objectives_agents_weekly_time() {
        if (this.config.weights.agents_weekly_time == 0) return;
        this.config.settings.agents.forEach(agent => {
            let quota = get(this.config.objectives.agents_weekly_time, agent, 0);
            let expr = [];
            this.iterate_slots_posts((day, slot, post) => {
                let varname = `span_${day}_${slot}_${post}_${agent}`;
                if (varname in this.vars) {
                    expr.push({
                        name: this.vars[varname],
                        coef: get_slot_duration(slot)
                    });
                }
            });
            for (let overflow = 1; overflow <= 5; overflow++) {
                let varname = `overflow_${overflow}_${agent}`;
                let varidx = this._add_var(varname);
                // this.problem.subjectTo.push({
                //     name: `bounds_${varname}`,
                //     vars: [{
                //         name: varidx,
                //         coef: 1
                //     }],
                //     bnds: {
                //         type: glpk.GLP_DB,
                //         lb: 0,
                //         ub: 1,
                //         //ub: this.config.get_schedule_duration()
                //     }
                // });
                this.problem.subjectTo.push({
                    name: varidx,
                    vars: expr.concat([{
                        name: varidx,
                        coef: -1
                    }]),
                    bnds: {
                        type: glpk.GLP_UP,
                        ub: overflow + quota,
                    }
                });
                this.problem.objective.vars.push({
                    name: varidx,
                    coef: Math.pow(overflow, 2) * this.config.weights.agents_weekly_time
                });
            }
        });
    }

}

export async function solveProblem(config, callback) {
    glpk = await GLPK();
    const model = new Model(config);
    model.create();
    console.log(model);
    const solution = await glpk.solve(model.problem, glpk.GLP_MSG_ON);
    if (callback) {
        let schedule = new Schedule(config);
        schedule.load_lp_solution(model, solution);
        callback(schedule);
    }
}