import { ModalSlotsAgents } from "./modal_slots_agents.js";


function updateCellStyle(cell) {
    let input = cell.querySelector("input");
    let value = parseFloat(input.value);
    if (value == 0) {
        cell.classList.remove("bg-success");
        cell.classList.remove("bg-error");
        input.classList.remove("is-success");
        input.classList.remove("is-error");
    } else if (input.value > 0) {
        cell.classList.add("bg-success");
        cell.classList.remove("bg-error");
        input.classList.add("is-success");
        input.classList.remove("is-error");
    } else if (input.value < 0) {
        cell.classList.remove("bg-success");
        cell.classList.add("bg-error");
        input.classList.remove("is-success");
        input.classList.add("is-error");
    }
}


export class ModalObjectivesAgentsSlotsAssignations extends ModalSlotsAgents {

    constructor(dom_interface) {
        super(dom_interface, {
            show_selector: "#btn-menu-agents-slots-assignations",
            title: "Préférences des créneaux",
            subtitle: "Pour chaque créneau, pour chaque agent, entrer une valeur entre -1 (à éviter) et 1 (à préférer). Une valeur nulle indique la neutralité.",
        });
    }

    reset() {
        this.iterateTable((day, slot, agent, cell) => {
            cell.querySelector("input").value = 0;
            updateCellStyle(cell);
        });
    }

    read() {
        this.config.objectives.agents_slots_assignations = {};
        this.iterateTable((day, slot, agent, cell) => {
            let value = cell.querySelector("input").value;
            if (value != 0) {
                if (!(day in this.config.objectives.agents_slots_assignations)) {
                    this.config.objectives.agents_slots_assignations[day] = {};
                }
                if (!(slot in this.config.objectives.agents_slots_assignations[day])) {
                    this.config.objectives.agents_slots_assignations[day][slot] = {};
                }
                this.config.objectives.agents_slots_assignations[day][slot][agent] = parseFloat(value);
            }
        });
    }

    write() {
        this.createTable();
        this.iterateTable((day, slot, agent, cell) => {
            let input = document.createElement("input");
            input.type = "number";
            input.max = 1;
            input.min = -1;
            input.value = 0;
            input.step = 0.1;
            if (day in this.config.objectives.agents_slots_assignations && slot in this.config.objectives.agents_slots_assignations[day] && agent in this.config.objectives.agents_slots_assignations[day][slot]) {
                input.value = this.config.objectives.agents_slots_assignations[day][slot][agent];
            }
            input.className = "form-input";
            input.style.minWidth = "50px";
            cell.appendChild(input);
            input.addEventListener("input", () => {
                updateCellStyle(cell);
            });
            updateCellStyle(cell);
        });
    }

}