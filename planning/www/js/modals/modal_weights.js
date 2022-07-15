import { Modal } from "./modal.js";

function createFormGroup(inputId, label, value, hint) {
    let formGroup = document.createElement("div");
    formGroup.className = "form-group";
    let formLabel = document.createElement("label");
    formLabel.className = "form-label";
    formLabel.innerHTML = label;
    formLabel.setAttribute("for", inputId);
    let formInput = document.createElement("input");
    formInput.className = "form-input";
    formInput.id = inputId
    formInput.step = 0.1;
    formInput.type = "number";
    formInput.value = value;
    let formInputHint = document.createElement("p");
    formInputHint.className = "form-input-hint";
    formInputHint.innerHTML = hint;
    formGroup.appendChild(formLabel);
    formGroup.appendChild(formInput);
    formGroup.appendChild(formInputHint);
    return formGroup;
}

export class ModalWeights extends Modal {

    constructor(dom_interface) {
        super(dom_interface, {
            show_selector: "#btn-menu-weights",
            title: "Poids",
            subtitle: `Les poids définissent les importances relatives des objectifs. À choisir entre deux objectifs incompatibles, le générateur priorisera celui de poids le plus élevé.
            <ul>
                <li>Un objectif avec un poids <strong>nul</strong> est complètement ignoré</li>
                <li>Un objectif avec un poids <strong>strictement positif</strong> sera respecté au maximum</li>
                <li>Un objectif avec un poids <strong>strictement négatif</strong> sera enfreint au maximum</li>
            </ul>`
        });
    }

    createModalBody(modalBody) {
        modalBody.appendChild(createFormGroup(
            "avoid_twice_in_row",
            "Éviter d'enchaîner deux créneaux",
            this.config.weights.avoid_twice_in_row,
            ""
        ));
        modalBody.appendChild(createFormGroup(
            "agents_weekly_time",
            "Respecter les quotas hebdomadaires de temps",
            this.config.weights.agents_weekly_time,
            ""
        ));
        modalBody.appendChild(createFormGroup(
            "agents_slots_assignations",
            "Respecter les préférences de créneaux",
            this.config.weights.agents_slots_assignations,
            ""
        ));
        modalBody.appendChild(createFormGroup(
            "template_schedule",
            "Respecter le planning type",
            this.config.weights.template_schedule,
            ""
        ));

    }

    reset() {
        this.el.querySelector("input#avoid_twice_in_row").value = 1;
        this.el.querySelector("input#agents_weekly_time").value = 1;
        this.el.querySelector("input#agents_slots_assignations").value = 1;
        this.el.querySelector("input#template_schedule").value = 1;
    }

    read() {
        this.config.weights.avoid_twice_in_row = parseFloat(this.el.querySelector("input#avoid_twice_in_row").value);
        this.config.weights.agents_weekly_time = parseFloat(this.el.querySelector("input#agents_weekly_time").value);
        this.config.weights.agents_slots_assignations = parseFloat(this.el.querySelector("input#agents_slots_assignations").value);
        this.config.weights.template_schedule = parseFloat(this.el.querySelector("input#template_schedule").value);
    }

    write() {
        this.el.querySelector("input#avoid_twice_in_row").value = this.config.weights.avoid_twice_in_row;
        this.el.querySelector("input#agents_weekly_time").value = this.config.weights.agents_weekly_time;
        this.el.querySelector("input#agents_slots_assignations").value = this.config.weights.agents_slots_assignations;
        this.el.querySelector("input#template_schedule").value = this.config.weights.template_schedule;
    }
}