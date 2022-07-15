import { Modal } from "./modal.js";

export class ModalTextarea extends Modal {

    createModalBody(modalBody) {
        let formGroup = document.createElement("div");
        formGroup.className = "form-group";
        modalBody.appendChild(formGroup);

        let textarea = document.createElement("textarea");
        textarea.className = "form-input modal-textarea";
        textarea.rows = 10;
        formGroup.appendChild(textarea);

        let hintParagraph = document.createElement("p");
        hintParagraph.className = "form-input-hint";
        hintParagraph.innerHTML = this.options.hint;
        formGroup.appendChild(hintParagraph);
    }

    reset() {
        this.el.querySelector("textarea").value = "";
        this.el.querySelector("textarea").focus();
    }
}