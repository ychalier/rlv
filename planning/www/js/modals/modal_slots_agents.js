import { ModalSlots } from "./modal_slots.js";

export class ModalSlotsAgents extends ModalSlots {

    getColumns() {
        return this.config.settings.agents;
    }

}