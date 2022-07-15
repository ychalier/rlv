import { ModalTable } from "./modal_table.js";

export class ModalSlots extends ModalTable {

    getColumns() {
        throw "Not implemented";
    }

    createTable() {
        let table = this.el.querySelector("table");
        table.classList.add("table-slots");
        table.classList.add("table-sticky-first-row");
        table.classList.add("table-sticky-double-column");
        table.innerHTML = "";
        let table_head = document.createElement("thead");
        table.appendChild(table_head);
        let table_head_row = document.createElement("tr");
        table_head_row.innerHTML = `<th colspan="2">Créneau</th>`;
        table_head.appendChild(table_head_row);
        this.getColumns().forEach(column => {
            let th = document.createElement("th");
            th.textContent = column;
            table_head_row.appendChild(th);
        });
        let table_body = document.createElement("tbody");
        table.appendChild(table_body);
        this.config.get_slots_days().forEach(day => {
            this.config.get_slots_times(day).forEach((slot, i) => {
                if (i == 0) {
                    let tr_day = document.createElement("tr");
                    table_body.appendChild(tr_day);
                    tr_day.classList.add("header-row");
                    let td_day = document.createElement("td");
                    td_day.textContent = day;
                    td_day.setAttribute("rowspan", this.config.settings.slots[day].length + 1);
                    tr_day.appendChild(td_day);
                }
                let tr = document.createElement("tr");
                table_body.appendChild(tr);
                let td_slot = document.createElement("td");
                td_slot.textContent = slot;
                tr.appendChild(td_slot);
                this.getColumns().forEach(column => {
                    let td = document.createElement("td");
                    td.setAttribute("day", day);
                    td.setAttribute("slot", slot);
                    td.setAttribute("col", column);
                    tr.appendChild(td);
                });
            });
        });

    }

    iterateTable(callback) {
        this.getColumns().forEach(column => {
            this.config.get_slots_days().forEach(day => {
                this.config.get_slots_times(day).forEach(slot => {
                    let cell = this.el.querySelector(`tbody td[col="${column}"][day="${day}"][slot="${slot}"]`);
                    callback(day, slot, column, cell);
                });
            });
        });
    }

}