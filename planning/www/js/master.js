import { Config } from "./config.js";
import { DomInterface } from "./dom_interface.js";
import { solveProblem } from "./reason.js";

function on_window_load() {
    let config = new Config();
    config.load();
    config.save();
    let dom_interface = new DomInterface(config);
    dom_interface.create();
    dom_interface.write();
    document.getElementById("btn-import-file").addEventListener("click", () => {
        closeModal('modal-file-import-config');
        config.from_file(document.getElementById("input-file-import-config").files[0], () => {
            config.save();
            dom_interface.write();
        });
    });
    document.getElementById("btn-generate").addEventListener("click", () => {
        document.getElementById("modal-loading").classList.add("active");
        solveProblem(config, (schedule) => {
            dom_interface.display_schedule(schedule);
            document.getElementById("modal-loading").classList.remove("active");
        });
    });
}

window.addEventListener("load", on_window_load);