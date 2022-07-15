import { get_slot_duration, hashColor } from "./misc.js";

export class TableSchedule {
    constructor(dom_interface) {
        this.config = dom_interface.config;
        this.dom_interface = dom_interface;
        this.tableSchedule = document.querySelector("#table-schedule");
        this.tableAgents = document.querySelector("#table-agents");
    }

    onMouseEnter(td) {
        let agent = td.textContent;
        if (agent != "") {
            this.tableSchedule.querySelectorAll("td").forEach(sibling => {
                if (sibling.textContent == agent) {
                    sibling.classList.add("cell-active");
                }
            });
            this.tableAgents.querySelectorAll("td").forEach(sibling => {
                if (sibling.textContent == agent) {
                    sibling.classList.add("cell-active");
                }
            });
        }
    }

    onMouseLeave(td) {
        this.tableSchedule.querySelectorAll("td.cell-active").forEach(sibling => {
            sibling.classList.remove("cell-active");
        });
        this.tableAgents.querySelectorAll("td.cell-active").forEach(sibling => {
            sibling.classList.remove("cell-active");
        });
    }

    createTableSchedule() {
        let self = this;

        this.tableSchedule.innerHTML = "";

        // Creating table head
        let table_head = document.createElement("thead");
        this.tableSchedule.appendChild(table_head);
        let table_head_row = document.createElement("tr");
        table_head_row.innerHTML = "<th colspan='2'>Créneau</th>";
        table_head.appendChild(table_head_row);
        this.config.settings.posts.forEach(post => {
            let th = document.createElement("th");
            th.textContent = post;
            table_head_row.appendChild(th);
        });

        // Creating table body
        let table_body = document.createElement("tbody");
        this.tableSchedule.appendChild(table_body);
        this.config.get_slots_days().forEach(day => {
            this.config.get_slots_times(day).forEach((slot, i) => {
                if (i == 0) {
                    let tr_header = document.createElement("tr");
                    tr_header.classList.add("header-row");
                    let td_day = document.createElement("td");
                    td_day.textContent = day;
                    td_day.setAttribute("rowspan", this.config.settings.slots[day].length + 1);
                    tr_header.appendChild(td_day);
                    table_body.appendChild(tr_header);
                }
                let tr = document.createElement("tr");
                table_body.appendChild(tr);
                let td_slot = document.createElement("td");
                td_slot.textContent = slot;
                tr.appendChild(td_slot);
                this.config.settings.posts.forEach(post => {
                    let td = document.createElement("td");
                    td.setAttribute("post", post);
                    td.setAttribute("day", day);
                    td.setAttribute("slot", slot);
                    if (this.config.is_post_closed(day, slot, post)) {
                        td.classList.add("cell-disabled");
                    }
                    td.addEventListener("mouseenter", () => {
                        self.onMouseEnter(td);
                    });
                    td.addEventListener("mouseleave", () => {
                        self.onMouseLeave(td);
                    });
                    tr.appendChild(td);
                });
            });
        });
    }

    createTableAgents() {
        let self = this;
        this.tableAgents.innerHTML = "";

        // Creating table head
        let table_head = document.createElement("thead");
        this.tableAgents.appendChild(table_head);
        let table_head_row = document.createElement("tr");
        table_head_row.innerHTML = "<th>Agent</th><th>Plages</th><th>Heures</th>";
        table_head.appendChild(table_head_row);

        // Creating table body
        let table_body = document.createElement("tbody");
        this.tableAgents.appendChild(table_body);
        this.config.settings.agents.forEach(agent => {
            let tr = document.createElement("tr");
            tr.setAttribute("agent", agent);
            tr.innerHTML = `<td>${agent}</td><td>0</td><td>0</td>`;
            tr.querySelector("td:first-child").addEventListener("mouseenter", (event) => {
                self.onMouseEnter(event.target);
            });
            tr.querySelector("td:first-child").addEventListener("mouseleave", (event) => {
                self.onMouseLeave(event.target);
            });
            table_body.appendChild(tr);
        });
    }

    create() {
        this.createTableSchedule();
        this.createTableAgents();
    }

    iterateTableSchedule(callback) {
        this.config.settings.posts.forEach(post => {
            this.config.get_slots_days().forEach(day => {
                this.config.get_slots_times(day).forEach(slot => {
                    let cell = this.tableSchedule.querySelector(`tbody td[post="${post}"][day="${day}"][slot="${slot}"]`);
                    callback(day, slot, post, cell);
                });
            });
        });
    }

    iterateTableAgent(callback) {
        this.config.settings.agents.forEach(agent => {
            let row = this.tableAgents.querySelector(`tbody tr[agent="${agent}"]`);
            let td_agent = row.querySelector("td:nth-child(1)");
            let td_slots = row.querySelector("td:nth-child(2)");
            let td_hours = row.querySelector("td:nth-child(3)");
            callback(agent, td_agent, td_slots, td_hours);
        });
    }

    write(schedule) {
        this.create();
        if (schedule != null && schedule != undefined) {
            let sumSlots = {};
            let sumHours = {};
            this.config.settings.agents.forEach(agent => {
                sumSlots[agent] = 0;
                sumHours[agent] = 0;
            });
            this.iterateTableSchedule((day, slot, post, cell) => {
                let agent = schedule.data[day][slot][post];
                cell.textContent = agent;
                cell.style.background = hashColor(agent) + "30";
                sumSlots[agent] += 1;
                sumHours[agent] += get_slot_duration(slot);
            });
            this.iterateTableAgent((agent, td_agent, td_slots, td_hours) => {
                td_agent.style.background = hashColor(agent) + "30";
                td_slots.textContent = sumSlots[agent];
                td_hours.textContent = sumHours[agent];
            });
        }
    }

}