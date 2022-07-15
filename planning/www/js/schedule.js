export class Schedule {
    constructor(config) {
        this.config = config;
        this.data = {};
        this.config.get_slots_days().forEach(day => {
            this.data[day] = {};
            this.config.get_slots_times(day).forEach(slot => {
                this.data[day][slot] = {};
                this.config.settings.posts.forEach(post => {
                    if (!this.config.is_post_closed(day, slot, post)) {
                        this.data[day][slot][post] = null;
                    }
                });
            });
        });
    }

    load_lp_solution(model, solution) {
        this.config.get_slots_days().forEach(day => {
            this.config.get_slots_times(day).forEach(slot => {
                this.config.settings.posts.forEach(post => {
                    if (!this.config.is_post_closed(day, slot, post)) {
                        this.config.settings.agents.forEach(agent => {
                            if (solution.result.vars[model.vars[`span_${day}_${slot}_${post}_${agent}`]] == 1) {
                                this.data[day][slot][post] = agent;
                            }
                        });
                    }
                });
            });
        });
    }
}