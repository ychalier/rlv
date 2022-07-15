import { ModalTable } from "./modal_table.js";

export class ModalObjectivesAgentsWeeklyTime extends ModalTable {

    constructor(dom_interface) {
        super(dom_interface, {
            show_selector: "#btn-menu-agents-weekly-time",
            title: "Quotas hebdomadaires de temps",
            subtitle: "Le générateur s'efforce à respecter les quotas de tous les agents. S'il doit dépasser, il s'assure de répartir équitablement les dépassements (plutôt 1 h en plus à 3 personnes que 3 h en plus à 1 personne).",
        });
    }

    createModalHeader(modalHeader) {
        super.createModalHeader(modalHeader);
        let div = document.createElement("div");
        div.innerHTML = `
            <b><span class="details-total"></span> h</b> à pourvoir
            • Somme des objectifs : <b><span class="details-sum-objectives"></span> h</b> (<span class="details-sum-objectives-overflow"></span>)
        `;
        modalHeader.appendChild(div);
    }

    updateHeaderDetails() {
        let totalDuration = this.config.get_schedule_duration();
        this.el.querySelector(".modal-header .details-total").textContent = totalDuration;
        let totalObjectives = 0;
        this.el.querySelectorAll("input").forEach(input => {
            totalObjectives += parseFloat(input.value);
        });
        this.el.querySelector(".details-sum-objectives").textContent = totalObjectives;
        if (totalDuration > totalObjectives) {
            this.el.querySelector(".modal-header .details-sum-objectives-overflow").textContent = `${totalDuration - totalObjectives} h manquantes`;
        } else if (totalDuration < totalObjectives) {
            this.el.querySelector(".modal-header .details-sum-objectives-overflow").textContent = `${totalObjectives - totalDuration} h bonus`;
        } else {
            this.el.querySelector(".modal-header .details-sum-objectives-overflow").textContent = "à l'équilibre";
        }
    }

    createTable() {
        this.updateHeaderDetails();
        let self = this;
        let table = this.el.querySelector("table");
        table.innerHTML = "";
        let table_head = document.createElement("thead");
        table_head.innerHTML = `<tr><th>Agent</th><th>Limite imposée (h)</th><th>Temps de présence (h)</th><th>Objectif (h)</th></tr>`;
        table.appendChild(table_head);
        let table_body = document.createElement("tbody");
        table.appendChild(table_body);
        let averageDuration = Math.ceil(this.config.get_average_duration());
        this.config.settings.agents.forEach(agent => {
            let tr = document.createElement("tr");
            table_body.appendChild(tr);
            let td_agent = document.createElement("td");
            tr.appendChild(td_agent);
            td_agent.textContent = agent;
            let agent_durations = this.config.get_agent_durations(agent);
            let td_limit = document.createElement("td");
            if (agent_durations.limit == null) {
                td_limit.textContent = "–";
            } else {
                td_limit.textContent = agent_durations.limit;
            }
            tr.appendChild(td_limit);
            let td_presence = document.createElement("td");
            td_presence.textContent = agent_durations.available;
            tr.appendChild(td_presence);
            let td_input = document.createElement("td");
            tr.appendChild(td_input);
            let input = document.createElement("input");
            input.className = "form-input";
            input.type = "number";
            input.step = 0.1;
            input.min = 0;
            input.max = Math.ceil(this.config.get_total_duration());
            input.value = Math.min(averageDuration, Math.ceil(this.config.get_total_duration()));
            input.addEventListener("input", () => {
                self.updateHeaderDetails();
            })
            td_input.appendChild(input);
        });
    }

    iterateTable(callback) {
        this.el.querySelectorAll("tbody tr").forEach(row => {
            let agent = row.querySelector("td:first-child").textContent;
            let input = row.querySelector("input");
            callback(agent, input);
        });
    }

    reset() {
        this.iterateTable((agent, input) => {
            input.value = Math.ceil(this.config.get_average_duration());
        });
        this.updateHeaderDetails();
    }

    read() {
        this.config.objectives.agents_weekly_time = {};
        this.iterateTable((agent, input) => {
            this.config.objectives.agents_weekly_time[agent] = parseFloat(input.value);
        });
    }

    write() {
        this.createTable();
        this.iterateTable((agent, input) => {
            if (agent in this.config.objectives.agents_weekly_time) {
                input.value = this.config.objectives.agents_weekly_time[agent];
            }
        });
    }

}