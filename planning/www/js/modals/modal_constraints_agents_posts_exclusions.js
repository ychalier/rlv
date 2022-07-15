import { ModalTable } from "./modal_table.js";

export class ModalConstraintsAgentsPostsExclusions extends ModalTable {

    constructor(dom_interface) {
        super(dom_interface, {
            show_selector: "#btn-menu-agents-posts-exclusions",
            title: "Désaffectation des postes",
            subtitle: "Cliquez sur une case pour empêcher un agent d'être assigné au poste.",
        });
    }

    createTable() {
        let table = this.el.querySelector("table");
        table.innerHTML = "";
        table.classList.add("table-sticky-first-row");
        table.classList.add("table-sticky-first-column");
        let table_head = document.createElement("thead");
        let table_head_row = document.createElement("tr");
        table_head_row.innerHTML = `<th>Agent</th>`;
        this.config.settings.posts.forEach(post => {
            let th = document.createElement("th");
            th.textContent = post;
            table_head_row.appendChild(th);
        })
        table_head.appendChild(table_head_row);
        table.appendChild(table_head);
        let table_body = document.createElement("tbody");
        table.appendChild(table_body);
        this.config.settings.agents.forEach(agent => {
            let tr = document.createElement("tr");
            table_body.appendChild(tr);
            let td_agent = document.createElement("td");
            tr.appendChild(td_agent);
            td_agent.textContent = agent;
            this.config.settings.posts.forEach(post => {
                let td_post = document.createElement("td");
                td_post.setAttribute("agent", agent);
                td_post.setAttribute("post", post);
                td_post.style.cursor = "pointer";
                td_post.addEventListener("click", () => {
                    if (td_post.classList.contains("cell-disabled")) {
                        td_post.classList.remove("cell-disabled");
                    } else {
                        td_post.classList.add("cell-disabled");
                    }
                });
                tr.appendChild(td_post);
            });
        });
    }

    iterateTable(callback) {
        this.config.settings.agents.forEach(agent => {
            this.config.settings.posts.forEach(post => {
                let cell = this.el.querySelector(`td[agent="${agent}"][post="${post}"]`);
                callback(agent, post, cell);
            });
        });
    }

    reset() {
        this.iterateTable((agent, post, cell) => {
            cell.classList.remove("cell-disabled");
        });
    }

    read() {
        this.config.constraints.agents_posts_exclusions = {};
        this.iterateTable((agent, post, cell) => {
            if (cell.classList.contains("cell-disabled")) {
                if (!(agent in this.config.constraints.agents_posts_exclusions)) {
                    this.config.constraints.agents_posts_exclusions[agent] = [];
                }
                this.config.constraints.agents_posts_exclusions[agent].push(post);
            }
        });
    }

    write() {
        this.createTable();
        this.iterateTable((agent, post, cell) => {
            if (agent in this.config.constraints.agents_posts_exclusions && this.config.constraints.agents_posts_exclusions[agent].includes(post)) {
                cell.classList.add("cell-disabled");
            }
        });
    }

}