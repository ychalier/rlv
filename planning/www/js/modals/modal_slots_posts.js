import { ModalSlots } from "./modal_slots.js";

export class ModalSlotsPosts extends ModalSlots {

    getColumns() {
        return this.config.settings.posts;
    }

}