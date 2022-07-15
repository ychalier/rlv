class Modal {
    constructor(dom_interface, options) {
        this.config = dom_interface.config;
        this.dom_interface = dom_interface;
        this.el = null;
        this.options = options;
    }

    show() {
        this.el.classList.add("active");
    }

    close() {
        this.el.classList.remove("active");
    }

    reset() {
        throw "Not implemented";
    }

    read() {
        throw "Not implemented";
    }

    write() {
        throw "Not implemented";
    }

    createModalHeader(modalHeader) {
        let closeButton = document.createElement("a");
        closeButton.className = "btn btn-clear float-right modal-close";
        closeButton.setAttribute("aria-label", "Close");
        modalHeader.appendChild(closeButton);

        let modalTitle = document.createElement("div");
        modalTitle.className = "modal-title h5";
        modalTitle.innerHTML = this.options.title;
        modalHeader.appendChild(modalTitle);

        let modalSubtitle = document.createElement("div");
        modalSubtitle.className = "modal-subtitle text-gray";
        modalSubtitle.innerHTML = this.options.subtitle;
        modalHeader.appendChild(modalSubtitle);
    }

    createModalBody(modalBody) {
        // Pass
    }

    createModalFooter(modalFooter) {
        let btnSave = document.createElement("button");
        btnSave.className = "btn mr-1 btn-primary modal-save";
        btnSave.textContent = "Enregistrer";
        modalFooter.appendChild(btnSave);

        let btnReset = document.createElement("button");
        btnReset.className = "btn mr-1 modal-reset";
        btnReset.textContent = "Réinitialiser";
        modalFooter.appendChild(btnReset);

        let btnClose = document.createElement("button");
        btnClose.className = "btn modal-close";
        btnClose.textContent = "Annuler";
        modalFooter.appendChild(btnClose);
    }

    create() {
        let self = this;

        this.el = document.createElement("div");
        document.body.appendChild(this.el);
        this.el.className = "modal modal-xl";

        let modalOverlay = document.createElement("a");
        modalOverlay.className = "modal-overlay modal-close";
        modalOverlay.setAttribute("aria-label", "Close");
        this.el.appendChild(modalOverlay);

        let modalContainer = document.createElement("div");
        modalContainer.className = "modal-container";
        this.el.appendChild(modalContainer);

        let modalHeader = document.createElement("div");
        modalHeader.className = "modal-header";
        modalContainer.appendChild(modalHeader);
        this.createModalHeader(modalHeader);

        let modalBody = document.createElement("div");
        modalBody.className = "modal-body";
        modalContainer.appendChild(modalBody);
        this.createModalBody(modalBody);

        let modalFooter = document.createElement("div");
        modalFooter.className = "modal-footer";
        modalContainer.appendChild(modalFooter);
        this.createModalFooter(modalFooter);

        this.el.querySelectorAll(".modal-close").forEach(el => {
            el.addEventListener("click", () => { self.close(); });
        });
        this.el.querySelectorAll(".modal-save").forEach(el => {
            el.addEventListener("click", () => {
                self.read();
                self.dom_interface.write();
                self.dom_interface.read();
                self.close();
            });
        });
        this.el.querySelectorAll(".modal-reset").forEach(el => {
            el.addEventListener("click", () => {
                self.reset();
            });
        });
        document.querySelectorAll(this.options.show_selector).forEach(el => {
            el.addEventListener("click", () => { self.show(); });
        });
    }
}

export { Modal };