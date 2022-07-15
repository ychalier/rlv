import { ModalSlotsPosts } from "./modal_slots_posts.js";

export class ModalObjectivesTemplateSchedule extends ModalSlotsPosts {

    constructor(dom_interface) {
        super(dom_interface, {
            show_selector: "#btn-menu-template-schedule",
            title: "Planning type",
            subtitle: "Le générateur s'efforcera d'attribuer en priorité les créneaux définis ci-dessous",
        });
    }

    reset() {
        this.iterateTable((day, slot, post, cell) => {
            let select = cell.querySelector("select");
            select.querySelectorAll("option").forEach((option, i) => {
                if (i == 0) {
                    option.setAttribute("selected", true);
                } else {
                    option.removeAttribute("selected");
                }
            });
        });
    }

    read() {
        this.config.objectives.template_schedule = {};
        this.iterateTable((day, slot, post, cell) => {
            let select = cell.querySelector("select");
            let value = select.options[select.selectedIndex].value;
            if (value != "") {
                if (!(day in this.config.objectives.template_schedule)) {
                    this.config.objectives.template_schedule[day] = {};
                }
                if (!(slot in this.config.objectives.template_schedule[day])) {
                    this.config.objectives.template_schedule[day][slot] = {};
                }
                this.config.objectives.template_schedule[day][slot][post] = value;
            }
        });
    }

    write() {
        this.createTable();
        this.iterateTable((day, slot, post, cell) => {
            let select = document.createElement("select");
            select.classList.add("form-select");
            let target_agent = null;
            if (day in this.config.objectives.template_schedule && slot in this.config.objectives.template_schedule[day] && post in this.config.objectives.template_schedule[day][slot]) {
                target_agent = this.config.objectives.template_schedule[day][slot][post];
            }
            let default_option = document.createElement("option");
            default_option.value = "";
            default_option.textContent = "—";
            if (target_agent == null) {
                default_option.setAttribute("selected", true);
            }
            select.appendChild(default_option);
            this.config.settings.agents.forEach(agent => {
                let option = document.createElement("option");
                option.value = agent;
                option.textContent = agent;
                if (agent == target_agent) {
                    option.setAttribute("selected", true);
                }
                select.appendChild(option);
            });
            cell.appendChild(select);
        });
    }

}