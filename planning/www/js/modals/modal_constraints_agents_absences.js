import {get } from "../misc.js";
import { ModalSlotsAgents } from "./modal_slots_agents.js";

export class ModalConstraintsAgentsAbscences extends ModalSlotsAgents {

    constructor(dom_interface) {
        super(dom_interface, {
            show_selector: "#btn-menu-agents-absences",
            title: "Absences des agents",
            subtitle: "Cliquez sur une plage pour marquer l'agent absent (case grisée) ou présent (case vide).",
        });
    }

    reset() {
        this.iterateTable((day, slot, agent, cell) => {
            cell.classList.remove("cell-disabled");
        });
    }

    read() {
        this.config.constraints.agents_absences = {};
        this.iterateTable((day, slot, agent, cell) => {
            if (cell.classList.contains("cell-disabled")) {
                if (!(day in this.config.constraints.agents_absences)) {
                    this.config.constraints.agents_absences[day] = {};
                }
                if (!(slot in this.config.constraints.agents_absences[day])) {
                    this.config.constraints.agents_absences[day][slot] = [];
                }
                this.config.constraints.agents_absences[day][slot].push(agent);
            }
        });
    }

    write() {
        this.createTable();
        this.iterateTable((day, slot, agent, cell) => {
            cell.style.cursor = "pointer";
            cell.addEventListener("click", () => {
                if (cell.classList.contains("cell-disabled")) {
                    cell.classList.remove("cell-disabled");
                } else {
                    cell.classList.add("cell-disabled");
                }
            });
            if (get(get(this.config.constraints.agents_absences, day, {}), slot, []).includes(agent)) {
                cell.classList.add("cell-disabled");
            }
        });
    }

}