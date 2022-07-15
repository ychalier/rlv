import { ModalSettingsAgents } from "./modals/modal_settings_agents.js";
import { ModalSettingsPosts } from "./modals/modal_settings_posts.js";
import { ModalSettingsSlots } from "./modals/modal_settings_slots.js";
import { ModalConstraintsWeeklyTimeLimits } from "./modals/modal_constraints_agents_weekly_time_limit.js";
import { ModalConstraintsAgentsAbscences } from "./modals/modal_constraints_agents_absences.js";
import { ModalConstraintsPostsClosings } from "./modals/modal_constraints_posts_closings.js";
import { ModalConstraintsAgentsPostsExclusions } from "./modals/modal_constraints_agents_posts_exclusions.js";
import { ModalObjectivesTemplateSchedule } from "./modals/modal_objectives_template_schedule.js";
import { ModalObjectivesAgentsSlotsAssignations } from "./modals/modal_objectives_agents_slots_assignations.js";
import { ModalObjectivesAgentsWeeklyTime } from "./modals/modal_objectives_agents_weekly_time.js";
import { ModalWeights } from "./modals/modal_weights.js";
import { TableSchedule } from "./table_schedule.js";

export class DomInterface {

    constructor(config) {
        this.config = config;
        this.modals = {
            posts: new ModalSettingsPosts(this),
            slots: new ModalSettingsSlots(this),
            agents: new ModalSettingsAgents(this),
            constraints_agents_weekly_time_limit: new ModalConstraintsWeeklyTimeLimits(this),
            constraints_agents_absences: new ModalConstraintsAgentsAbscences(this),
            constraints_posts_closings: new ModalConstraintsPostsClosings(this),
            constraints_agents_posts_exclusions: new ModalConstraintsAgentsPostsExclusions(this),
            objectives_template_schedule: new ModalObjectivesTemplateSchedule(this),
            objectives_agents_slots_assignations: new ModalObjectivesAgentsSlotsAssignations(this),
            objectives_agents_weekly_time: new ModalObjectivesAgentsWeeklyTime(this),
            weights: new ModalWeights(this),
        };
        this.table_schedule = new TableSchedule(this);
    }

    create() {
        for (let m in this.modals) {
            this.modals[m].create();
        }
        this.table_schedule.create();
    }

    read() {
        for (let m in this.modals) {
            this.modals[m].read();
        }
        this.config.save();
    }

    write() {
        for (let m in this.modals) {
            this.modals[m].write();
        }
        this.table_schedule.write();
    }

    display_schedule(schedule) {
        this.table_schedule.write(schedule);
    }

}