import { ModalTextarea } from "./modal_textarea.js";

class ModalSettingsPosts extends ModalTextarea {
    constructor(dom_interface) {
        super(dom_interface, {
            show_selector: "#btn-menu-posts",
            title: "Postes",
            subtitle: "Entrer la liste des postes à pourvoir",
            hint: "Renseigner un poste par ligne. Chaque poste doit porter un nom unique."
        });
    }

    read() {
        this.config.settings.posts = [];
        this.el.querySelector("textarea").value.split("\n").forEach(entry => {
            let value = entry.trim();
            if (value != "" && !(this.config.settings.posts.includes(value))) {
                this.config.settings.posts.push(value);
            }
        });
    }

    write() {
        let textarea = this.el.querySelector("textarea");
        textarea.value = "";
        this.config.settings.posts.forEach(post => {
            textarea.value += post + "\n";
        });
    }
}

export { ModalSettingsPosts };