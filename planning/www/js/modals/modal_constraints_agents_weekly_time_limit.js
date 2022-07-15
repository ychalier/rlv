import { ModalTable } from "./modal_table.js";

export class ModalConstraintsWeeklyTimeLimits extends ModalTable {

    constructor(dom_interface) {
        super(dom_interface, {
            show_selector: "#btn-menu-agents-weekly-time-limit",
            title: "Limites hebdomadaires de temps",
            subtitle: "Un agent ne pourra pas être sur le planning plus de temps que la valeur renseignée. Attention, des limites trop basses bloqueront la génération du planning.",
        });
    }

    createTable() {
        let table = this.el.querySelector("table");
        table.innerHTML = "";
        let table_head = document.createElement("thead");
        table_head.innerHTML = `<tr><th>Agent</th><th>Limite (h)</th></tr>`;
        table.appendChild(table_head);
        let table_body = document.createElement("tbody");
        table.appendChild(table_body);
        let maximumDuration = Math.ceil(this.config.get_total_duration());
        this.config.settings.agents.forEach(agent => {
            let tr = document.createElement("tr");
            table_body.appendChild(tr);
            let td_agent = document.createElement("td");
            tr.appendChild(td_agent);
            td_agent.textContent = agent;
            let td_input = document.createElement("td");
            td_input.className = "d-flex";
            tr.appendChild(td_input);
            let input_value = document.createElement("input");
            input_value.className = "form-input";
            input_value.type = "number";
            input_value.step = 0.5;
            input_value.min = 0;
            input_value.max = maximumDuration;
            input_value.value = maximumDuration;
            let label_toggle = document.createElement("label");
            label_toggle.className = "form-switch";
            let input_toggle = document.createElement("input");
            input_toggle.type = "checkbox";
            let icon_toggle = document.createElement("i");
            icon_toggle.className = "form-icon";
            let span_toggle = document.createElement("span");
            span_toggle.textContent = "Illimité";
            label_toggle.appendChild(input_toggle);
            label_toggle.appendChild(icon_toggle);
            label_toggle.appendChild(span_toggle);
            td_input.appendChild(label_toggle);
            td_input.appendChild(input_value);
            input_toggle.addEventListener("input", () => {
                input_value.disabled = input_toggle.checked;
                if (input_toggle.checked) {
                    span_toggle.classList.remove("strike");
                } else {
                    span_toggle.classList.add("strike");
                }
            });
        });
    }

    iterateTable(callback) {
        this.el.querySelectorAll("tbody tr").forEach(row => {
            let agent = row.querySelector("td:first-child").textContent;
            let input_toggle = row.querySelector("input[type='checkbox']");
            let span_toggle = row.querySelector("input[type='checkbox'] ~ i ~ span");
            let input_value = row.querySelector("input[type='number']");
            callback(agent, input_toggle, span_toggle, input_value);
        });
    }

    reset() {
        this.iterateTable((agent, input_toggle, span_toggle, input_value) => {
            input_value.value = Math.ceil(this.config.get_total_duration());
            input_value.disabled = true;
            input_toggle.checked = true;
            span_toggle.classList.remove("strike");
        });
    }

    read() {
        this.config.constraints.agents_weekly_time_limit = {};
        this.iterateTable((agent, input_toggle, span_toggle, input_value) => {
            if (!input_toggle.checked) {
                this.config.constraints.agents_weekly_time_limit[agent] = parseFloat(input_value.value);
            }
        });
    }

    write() {
        this.createTable();
        this.iterateTable((agent, input_toggle, span_toggle, input_value) => {
            if (agent in this.config.constraints.agents_weekly_time_limit) {
                input_value.value = this.config.constraints.agents_weekly_time_limit[agent];
                input_value.disabled = false;
                input_toggle.checked = false;
                span_toggle.classList.add("strike");
            } else {
                input_value.value = Math.ceil(this.config.get_total_duration());
                input_value.disabled = true;
                input_toggle.checked = true;
                span_toggle.classList.remove("strike");
            }
        });
    }


}