import { Modal } from "./modal.js";

export class ModalTable extends Modal {

    createModalBody(modalBody) {
        let table = document.createElement("table");
        table.className = "table table-hover table-condensed modal-table";
        modalBody.appendChild(table);
    }

    create() {
        super.create();
        this.write();
    }

    createTable() {
        throw "Not implemented";
    }

    iterateTable(callback) {
        throw "Not implemented";
    }

}