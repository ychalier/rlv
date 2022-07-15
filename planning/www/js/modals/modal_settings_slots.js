import { ModalTextarea } from "./modal_textarea.js";

class ModalSettingsSlots extends ModalTextarea {
    constructor(dom_interface) {
        super(dom_interface, {
            show_selector: "#btn-menu-slots",
            title: "Créneaux",
            subtitle: "Entrer la liste des créneaux à pourvoir",
            hint: "Renseigner un jour ou un créneau par ligne. Les créneaux sont indentés d'un tiret, doivent suivre la forme <code>11h30 - 13h</code>."
        });
    }

    read() {
        this.config.settings.slots = {};
        let slotCount = 0;
        let currentDay = null;
        this.el.querySelector("textarea").value.split("\n").forEach((entry) => {
            if (entry.trim() != "") {
                if (entry.trim().startsWith("-") && currentDay != null) {
                    this.config.settings.slots[currentDay].push(entry.trim().slice(1).trim());
                    slotCount++;
                } else {
                    currentDay = entry.trim();
                    this.config.settings.slots[currentDay] = [];
                }
            }
        });
    }

    write() {
        let textarea = this.el.querySelector("textarea");
        textarea.value = "";
        let first = true;
        this.config.get_slots_days().forEach(day => {
            if (!first) {
                textarea.value += "\n";
            }
            first = false;
            textarea.value += day + "\n";
            this.config.get_slots_times(day).forEach(slot => {
                textarea.value += "- " + slot + "\n";
            });
        });
    }
}

export { ModalSettingsSlots };