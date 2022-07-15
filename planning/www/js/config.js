import { get_slot_duration, storageAvailable } from "./misc.js";

export class Config {

    constructor() {
        this.reset();
    }

    reset() {
        this.settings = {
            posts: [],
            slots: {},
            agents: []
        };
        this.objectives = {
            agents_weekly_time: {},
            agents_slots_assignations: {},
            template_schedule: {}
        };
        this.weights = {
            avoid_twice_in_row: 1,
            agents_weekly_time: 1,
            agents_slots_assignations: 1,
            template_schedule: 1
        };
        this.constraints = {
            posts_closings: {},
            agents_absences: {},
            agents_posts_exclusions: {},
            agents_weekly_time_limit: {}
        };
    }

    is_agent_absent(day, slot, agent) {
        if (!(day in this.constraints.agents_absences)) {
            return false;
        }
        if (!(slot in this.constraints.agents_absences[day])) {
            return false;
        }
        return this.constraints.agents_absences[day][slot].includes(agent);
    }

    is_post_closed(day, slot, post) {
        if (!(day in this.constraints.posts_closings)) {
            return false;
        }
        if (!(slot in this.constraints.posts_closings[day])) {
            return false;
        }
        return this.constraints.posts_closings[day][slot].includes(post);
    }

    is_agent_excluded_from_post(agent, post) {
        if (!(agent in this.constraints.agents_posts_exclusions)) {
            return false;
        }
        return this.constraints.agents_posts_exclusions[agent].includes(post);
    }

    get_slots_days() {
        let arr = [];
        for (let day in this.settings.slots) {
            arr.push(day);
        }
        return arr;
    }

    get_slots_times(day) {
        return this.settings.slots[day];
    }

    get_total_duration() {
        let duration = 0;
        this.get_slots_days().forEach(day => {
            this.get_slots_times(day).forEach(slot => {
                duration += get_slot_duration(slot);
            });
        });
        return duration;
    }

    get_average_duration() {
        return this.get_total_duration() * this.settings.posts.length / Math.max(1, this.settings.agents.length);
    }

    get_schedule_duration() {
        let duration = 0;
        this.get_slots_days().forEach(day => {
            this.get_slots_times(day).forEach(slot => {
                this.settings.posts.forEach(post => {
                    if (!this.is_post_closed(day, slot, post)) {
                        duration += get_slot_duration(slot);
                    }
                });
            });
        });
        return duration;
    }

    get_agent_durations(agent) {
        let result = {
            available: 0,
            limit: null
        }
        if (agent in this.constraints.agents_weekly_time_limit) {
            result.limit = this.constraints.agents_weekly_time_limit[agent];
        }
        this.get_slots_days().forEach(day => {
            this.get_slots_times(day).forEach(slot => {
                if (!this.is_agent_absent(day, slot, agent)) {
                    result.available += get_slot_duration(slot);
                }
            });
        });
        return result;
    }

    to_obj() {
        let obj = {};
        ["settings", "objectives", "weights", "constraints"].forEach(key => {
            obj[key] = this[key];
        });
        return obj;
    }

    from_obj(obj) {
        this.reset();
        ["settings", "objectives", "weights", "constraints"].forEach(key => {
            this[key] = obj[key];
        });
    }

    from_dummy() {
        this.reset();
        this.settings.posts = ["Accueil", "Adulte", "Jeunesse"];
        this.settings.slots = {
            Lundi: ["14h - 15h", "15h - 16h", "16h - 17h"],
            Mardi: ["14h - 15h", "15h - 16h", "16h - 17h"],
            Mercredi: ["14h - 15h", "15h - 16h", "16h - 17h"],
            Jeudi: ["14h - 15h", "15h - 16h", "16h - 17h"],
            Vendredi: ["14h - 15h", "15h - 16h", "16h - 17h"],
        };
        this.settings.agents = ["Jade", "Léo", "Louise", "Gabriel", "Emma", "Raphaël"];
    }

    save() {
        if (storageAvailable("localStorage")) {
            localStorage.setItem("config", JSON.stringify(this.to_obj()));
        }
        document.getElementById("file-export-config").href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.to_obj()));
    }

    load() {
        if (storageAvailable("localStorage") && localStorage.getItem("config") != null) {
            let obj = JSON.parse(localStorage.getItem("config"));
            this.from_obj(obj);
        } else {
            this.from_dummy();
        }
    }

    from_file(file, callback) {
        let self = this;
        if (file) {
            let reader = new FileReader();
            reader.onload = function(event) {
                self.from_obj(JSON.parse(event.target.result));
                callback();
            }
            reader.readAsText(file, "UTF-8");
        }
    }

}