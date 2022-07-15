import {get } from "../misc.js";
import { ModalSlotsPosts } from "./modal_slots_posts.js";

export class ModalConstraintsPostsClosings extends ModalSlotsPosts {

    constructor(dom_interface) {
        super(dom_interface, {
            show_selector: "#btn-menu-posts-closings",
            title: "Fermeture des postes",
            subtitle: "Cliquez sur une plage pour marquer le poste fermé (case grisée) ou ouvert (case vide).",
        });
    }

    reset() {
        this.iterateTable((day, slot, post, cell) => {
            cell.classList.remove("cell-disabled");
        });
    }

    read() {
        this.config.constraints.posts_closings = {};
        this.iterateTable((day, slot, post, cell) => {
            if (cell.classList.contains("cell-disabled")) {
                if (!(day in this.config.constraints.posts_closings)) {
                    this.config.constraints.posts_closings[day] = {};
                }
                if (!(slot in this.config.constraints.posts_closings[day])) {
                    this.config.constraints.posts_closings[day][slot] = [];
                }
                this.config.constraints.posts_closings[day][slot].push(post);
            }
        });
    }

    write() {
        this.createTable();
        this.iterateTable((day, slot, post, cell) => {
            cell.style.cursor = "pointer";
            cell.addEventListener("click", () => {
                if (cell.classList.contains("cell-disabled")) {
                    cell.classList.remove("cell-disabled");
                } else {
                    cell.classList.add("cell-disabled");
                }
            });
            if (get(get(this.config.constraints.posts_closings, day, {}), slot, []).includes(post)) {
                cell.classList.add("cell-disabled");
            }
        });
    }

}