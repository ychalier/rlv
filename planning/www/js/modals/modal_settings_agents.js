import { ModalTextarea } from "./modal_textarea.js";

export class ModalSettingsAgents extends ModalTextarea {
    constructor(dom_interface) {
        super(dom_interface, {
            show_selector: "#btn-menu-agents",
            title: "Agents",
            subtitle: "Entrer la liste des agents",
            hint: "Renseigner un agent par ligne. Chaque agent doit porter un nom unique."
        });
    }

    read() {
        this.config.settings.agents = [];
        this.el.querySelector("textarea").value.split("\n").forEach(entry => {
            let value = entry.trim();
            if (value != "" && !(this.config.settings.agents.includes(value))) {
                this.config.settings.agents.push(value);
            }
        });
    }

    write() {
        let textarea = this.el.querySelector("textarea");
        textarea.value = "";
        this.config.settings.agents.forEach(agent => {
            textarea.value += agent + "\n";
        });
    }
}