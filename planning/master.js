const DEFAULT_CONFIG = {
    posts: ["Accueil", "Automates", "Découvrir", "Imaginer -12", "Imaginer +12"],
    slots: {
        "Mercredi": ["10h - 11h30", "11h30 - 13h", "14h - 15h30", "15h30 - 17h", "17h - 18h30"],
        "Jeudi": ["14h - 15h30", "15h30 - 17h", "17h - 18h30"],
        "Vendredi": ["14h - 15h30", "15h30 - 17h", "17h - 18h30"],
        "Samedi": ["10h - 11h30", "11h30 - 13h"],
    },
    agents: ["Jean", "Marie", "Pierre", "Jeanne", "Michel", "Françoise", "André", "Monique", "Philippe", "Catherine"],
    objectives: {
        avoidTwiceInARow: 1,
        standardizeWeeklyTotal: 1,
        refTimes: {
            "Jean": 10.25,
            "Marie": 10.25,
            "Pierre": 10.25,
            "Jeanne": 10.25,
            "Michel": 10.25,
            "Françoise": 10.25,
            "André": 10.25,
            "Monique": 10.25,
            "Philippe": 10.25,
            "Catherine": 10.25
        }
    },
    constraints: {
        posts: {},
        agentsAbsence: {},
        postsAttributions: {},
    }
}
var CURRENT_CONFIG = null;


function hashCode(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}


function intToRGB(i) {
    var c = (i & 0x00FFFFFF).toString(16).toUpperCase();
    return "00000".substring(0, 6 - c.length) + c;
}


function inflateModals() {
    document.getElementById("input-params-posts").value = CURRENT_CONFIG.posts.join("\n");
    let slotString = "";
    for (let day in CURRENT_CONFIG.slots) {
        slotString += day + "\n- ";
        slotString += CURRENT_CONFIG.slots[day].join("\n- ");
        slotString += "\n\n";
    }
    document.getElementById("input-params-slots").value = slotString.trim();
    document.getElementById("input-params-agents").value = CURRENT_CONFIG.agents.join("\n");
    document.getElementById("input-params-objectives-avoidTwiceInARow").value = CURRENT_CONFIG.objectives.avoidTwiceInARow;
    document.getElementById("input-params-objectives-standardizeWeeklyTotal").value = CURRENT_CONFIG.objectives.standardizeWeeklyTotal;

    inflateTableSchedule("table-params-constraints-posts", (td, day, slot, post) => {
        td.classList.add("schedule-cell");
        let isDisabled = false;
        if (post in CURRENT_CONFIG.constraints.posts) {
            for (let i = 0; i < CURRENT_CONFIG.constraints.posts[post].length; i++) {
                if (CURRENT_CONFIG.constraints.posts[post][i][0] == day && CURRENT_CONFIG.constraints.posts[post][i][1] == slot) {
                    isDisabled = true;
                    break;
                }
            }
        }
        if (isDisabled) {
            td.classList.add("cell-disabled");
        }
        td.addEventListener("click", (event) => {
            if (td.classList.contains("cell-disabled")) {
                td.classList.remove("cell-disabled");
            } else {
                td.classList.add("cell-disabled");
            }
        });
    });

    inflateTableScheduleAgents("table-params-constraints-agents-absence", (td, day, slot, agent) => {
        td.classList.add("schedule-cell");
        let isDisabled = false;
        if (agent in CURRENT_CONFIG.constraints.agentsAbsence) {
            for (let i = 0; i < CURRENT_CONFIG.constraints.agentsAbsence[agent].length; i++) {
                if (CURRENT_CONFIG.constraints.agentsAbsence[agent][i][0] == day && CURRENT_CONFIG.constraints.agentsAbsence[agent][i][1] == slot) {
                    isDisabled = true;
                    break;
                }
            }
        }
        if (isDisabled) {
            td.classList.add("cell-disabled");
        }
        td.addEventListener("click", (event) => {
            if (td.classList.contains("cell-disabled")) {
                td.classList.remove("cell-disabled");
            } else {
                td.classList.add("cell-disabled");
            }
        });
    });

    inflateTablePostsAttributions("table-params-constraints-posts-attributions", (td, post, agent) => {
        td.classList.add("schedule-cell");
        let isDisabled = false;
        if (post in CURRENT_CONFIG.constraints.postsAttributions) {
            for (let i = 0; i < CURRENT_CONFIG.constraints.postsAttributions[post].length; i++) {
                if (CURRENT_CONFIG.constraints.postsAttributions[post][i] == agent) {
                    isDisabled = true;
                    break;
                }
            }
        }
        if (isDisabled) {
            td.classList.add("cell-disabled");
        }
        td.addEventListener("click", (event) => {
            if (td.classList.contains("cell-disabled")) {
                td.classList.remove("cell-disabled");
            } else {
                td.classList.add("cell-disabled");
            }
        });
    });

    inflateTableReftimes();

}

const slotDurationPattern = /^(\d+)h(\d+)? \- (\d+)h(\d+)?$/;

function getSlotDuration(slot) {
    let match = slot.match(slotDurationPattern);
    return parseInt(match[3]) +
        (match[4] ? parseInt(match[4]) / 60 : 0) -
        parseInt(match[1]) -
        (match[2] ? parseInt(match[2]) / 60 : 0)
}


function inflateTableReftimes() {
    let table = document.getElementById("table-params-objectives-reftimes");
    let avgTime = 0;
    for (let day in CURRENT_CONFIG.slots) {
        CURRENT_CONFIG.slots[day].forEach(slot => {
            avgTime += getSlotDuration(slot) * CURRENT_CONFIG.posts.length;
        });
    }
    for (let post in CURRENT_CONFIG.constraints.posts) {
        CURRENT_CONFIG.constraints.posts[post].forEach(arr => {
            avgTime -= getSlotDuration(arr[1]);
        });
    }
    document.getElementById("span-params-objectives-reftimes-total").textContent = avgTime;
    avgTime /= CURRENT_CONFIG.agents.length;
    avgTime = avgTime.toFixed(2);
    document.getElementById("span-params-objectives-reftimes-average").textContent = avgTime;

    table.innerHTML = "";
    CURRENT_CONFIG.agents.forEach(agent => {
        let tr = document.createElement("tr");
        let tdName = document.createElement("td");
        tdName.textContent = agent;
        tr.appendChild(tdName);
        let tdTime = document.createElement("td");
        let input = document.createElement("input");

        input.addEventListener("input", (event) => {
            let total = 0;
            document.querySelectorAll("#table-params-objectives-reftimes input").forEach(inpt => {
                total += parseFloat(inpt.value);
            });
            document.getElementById("span-params-objectives-reftimes-current").textContent = total;
        });

        input.className = "form-input";
        input.step = "0.01";
        input.type = "number";
        input.name = agent;
        input.value = parseFloat(agent in CURRENT_CONFIG.objectives.refTimes ? CURRENT_CONFIG.objectives.refTimes[agent] : avgTime);
        tdTime.appendChild(input);
        tr.appendChild(tdTime);
        table.appendChild(tr);
    });

    let total = 0;
    document.querySelectorAll("#table-params-objectives-reftimes input").forEach(inpt => {
        total += parseFloat(inpt.value);
    });
    document.getElementById("span-params-objectives-reftimes-current").textContent = total;
}


function inflateTablePostsAttributions(tableId, cellCallback) {
    let table = document.getElementById(tableId);
    table.innerHTML = "";
    let tHead = document.createElement("thead");
    let tHeadTr = document.createElement("tr");
    tHeadTr.innerHTML = "<th></th>";
    CURRENT_CONFIG.posts.forEach(post => {
        let th = document.createElement("th");
        th.textContent = post;
        tHeadTr.appendChild(th);
    });
    tHead.appendChild(tHeadTr);
    table.appendChild(tHead);
    let tBody = document.createElement("tbody");
    CURRENT_CONFIG.agents.forEach(agent => {
        let tr = document.createElement("tr");
        let tdAgent = document.createElement("td");
        tdAgent.textContent = agent;
        tr.appendChild(tdAgent);
        CURRENT_CONFIG.posts.forEach(post => {
            let tdPost = document.createElement("td");
            if (cellCallback) {
                cellCallback(tdPost, post, agent);
            }
            tr.appendChild(tdPost);
        });
        tBody.appendChild(tr);
    });
    table.appendChild(tBody);
}


function iterateTablePostsAttributions(tableId, cellCallback) {
    let table = document.getElementById(tableId);
    table.querySelectorAll("tbody tr").forEach(tr => {
        let tds = Array.prototype.slice.call(tr.querySelectorAll("td"));
        let agent = tds[0].textContent;
        tds.shift();
        for (let i = 0; i < tds.length; i++) {
            cellCallback(tds[i], CURRENT_CONFIG.posts[i], agent);
        }
    });
}


function inflateTableScheduleAgents(tableId, cellCallback) {
    let table = document.getElementById(tableId);
    table.innerHTML = "";
    let tHead = document.createElement("thead");
    let tHeadTr = document.createElement("tr");
    tHeadTr.innerHTML = "<th></th><th></th>";
    CURRENT_CONFIG.agents.forEach(agent => {
        let th = document.createElement("th");
        th.textContent = agent;
        tHeadTr.appendChild(th);
    });
    tHead.appendChild(tHeadTr);
    table.appendChild(tHead);
    let tBody = document.createElement("tbody");
    for (let day in CURRENT_CONFIG.slots) {
        for (let i = 0; i < CURRENT_CONFIG.slots[day].length; i++) {
            let tr = document.createElement("tr");
            if (i == 0) {
                tr.classList.add("schedule-table-dayrow");
                let tdDay = document.createElement("td");
                tdDay.textContent = day;
                tdDay.setAttribute("rowspan", CURRENT_CONFIG.slots[day].length);
                tr.appendChild(tdDay);
            }
            let tdSlot = document.createElement("td");
            tdSlot.textContent = CURRENT_CONFIG.slots[day][i];
            tr.appendChild(tdSlot);
            CURRENT_CONFIG.agents.forEach(agent => {
                let tdAgent = document.createElement("td");
                if (cellCallback) {
                    cellCallback(tdAgent, day, CURRENT_CONFIG.slots[day][i], agent);
                }
                tr.appendChild(tdAgent);
            });
            tBody.appendChild(tr);
        }
    }
    table.appendChild(tBody);
}


function iterateTableScheduleAgents(tableId, cellCallback) {
    let table = document.getElementById(tableId);
    let currentDay = null;
    table.querySelectorAll("tbody tr").forEach(tr => {
        let tds = Array.prototype.slice.call(tr.querySelectorAll("td"));
        if (tds.length == CURRENT_CONFIG.agents.length + 2) {
            currentDay = tds[0].textContent;
            tds.shift();
        }
        let slot = tds[0].textContent;
        tds.shift();
        for (let i = 0; i < tds.length; i++) {
            cellCallback(tds[i], currentDay, slot, CURRENT_CONFIG.agents[i]);
        }
    });
}


function iterateTableSchedule(tableId, cellCallback) {
    let table = document.getElementById(tableId);
    let currentDay = null;
    table.querySelectorAll("tbody tr").forEach(tr => {
        let tds = Array.prototype.slice.call(tr.querySelectorAll("td"));
        if (tds.length == CURRENT_CONFIG.posts.length + 2) {
            currentDay = tds[0].textContent;
            tds.shift();
        }
        let slot = tds[0].textContent;
        tds.shift();
        for (let i = 0; i < tds.length; i++) {
            cellCallback(tds[i], currentDay, slot, CURRENT_CONFIG.posts[i]);
        }
    });
}


function inflateTableSchedule(tableId, cellCallback) {
    let table = document.getElementById(tableId);
    table.innerHTML = "";
    let tHead = document.createElement("thead");
    let tHeadTr = document.createElement("tr");
    tHeadTr.innerHTML = "<th></th><th></th>";
    CURRENT_CONFIG.posts.forEach(post => {
        let th = document.createElement("th");
        th.textContent = post;
        tHeadTr.appendChild(th);
    });
    tHead.appendChild(tHeadTr);
    table.appendChild(tHead);
    let tBody = document.createElement("tbody");
    for (let day in CURRENT_CONFIG.slots) {
        for (let i = 0; i < CURRENT_CONFIG.slots[day].length; i++) {
            let tr = document.createElement("tr");
            if (i == 0) {
                tr.classList.add("schedule-table-dayrow");
                let tdDay = document.createElement("td");
                tdDay.textContent = day;
                tdDay.setAttribute("rowspan", CURRENT_CONFIG.slots[day].length);
                tr.appendChild(tdDay);
            }
            let tdSlot = document.createElement("td");
            tdSlot.textContent = CURRENT_CONFIG.slots[day][i];
            tr.appendChild(tdSlot);
            CURRENT_CONFIG.posts.forEach(post => {
                let tdPost = document.createElement("td");
                if (cellCallback) {
                    cellCallback(tdPost, day, CURRENT_CONFIG.slots[day][i], post);
                }
                tr.appendChild(tdPost);
            });
            tBody.appendChild(tr);
        }
    }
    table.appendChild(tBody);
}


function inflateTableAgents() {
    let table = document.querySelector("#table-agents tbody");
    table.innerHTML = "";
    CURRENT_CONFIG.agents.forEach(agent => {
        let tr = document.createElement("tr");
        let td = document.createElement("td");
        td.textContent = agent;
        td.classList.add("agent-cell");
        tr.appendChild(td);
        tr.appendChild(document.createElement("td"));
        tr.appendChild(document.createElement("td"));
        table.appendChild(tr);
    });
}


function setAgentCellEventListeners() {
    document.querySelectorAll(".agent-cell").forEach(td => {
        td.addEventListener("mouseenter", () => {
            if (td.textContent != "") {
                document.querySelectorAll(".agent-cell").forEach(td2 => {
                    if (td.textContent == td2.textContent) {
                        td2.classList.add("agent-cell-active");
                    }
                });
            }
        });
        td.addEventListener("mouseleave", () => {
            document.querySelectorAll(".agent-cell").forEach(td2 => {
                if (td.textContent == td2.textContent) {
                    td2.classList.remove("agent-cell-active");
                }
            });
        });
    });
}


function loadConfig(config) {
    console.log("Loading new config:", config);
    CURRENT_CONFIG = config;
    if (storageAvailable("localStorage")) {
        localStorage.setItem("config", JSON.stringify(CURRENT_CONFIG));
    }
    inflateTableSchedule("table-schedule", (td) => td.classList.add("agent-cell"));
    inflateTableAgents();
    setAgentCellEventListeners();
    inflateModals();
    document.getElementById("file-export-config").href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(CURRENT_CONFIG));
}


function loadSolution(solution) {
    console.log("Loading solution:", solution);
    let slotCounts = {};
    let slotHours = {};
    iterateTableSchedule("table-schedule", (td, day, slot, post) => {
        let agent = solution[day][slot][post];
        if (agent) {
            td.textContent = agent
            td.style.backgroundColor = "#" + intToRGB(hashCode(agent)) + "30";
            if (!(agent in slotCounts)) {
                slotCounts[agent] = 0;
                slotHours[agent] = 0;
            }
            slotCounts[agent]++;
            slotHours[agent] += getSlotDuration(slot);
        }
    });
    document.querySelectorAll("#table-agents tbody tr").forEach(tr => {
        let tds = Array.prototype.slice.call(tr.querySelectorAll("td"));
        if (tds[0].textContent in slotCounts) {
            tds[1].textContent = slotCounts[tds[0].textContent];
            tds[2].textContent = slotHours[tds[0].textContent];
        } else {
            tds[1].textContent = "0";
            tds[2].textContent = "0";
        }

    });
    document.getElementById("input-file-export-solution-solution").value = JSON.stringify(solution);
}


function generate() {
    console.log("Sending generation request");
    document.getElementById("modal-loading").classList.add("active");
    fetch("/generate", {
        method: "POST",
        body: JSON.stringify(CURRENT_CONFIG)
    }).then(() => {
        let interval = null;
        interval = setInterval(() => {
            fetch("/answer").then(response => {
                response.json().then(data => {
                    if (data.done) {
                        if (data.solution.feasible) {
                            loadSolution(data.solution.schedule);
                        } else {
                            alert("Les contraintes sont trop fortes : aucune solution n'a été trouvée. Essayez d'assouplir quelques contraintes et recommencez.");
                        }
                        clearInterval(interval);
                        document.getElementById("modal-loading").classList.remove("active");
                    }
                });
            })
        }, 1000);
    });
}


function loadConfigFromFile() {
    let file = document.getElementById("input-file-import-config").files[0];
    if (file) {
        let reader = new FileReader();
        reader.onload = function(event) {
            loadConfig(JSON.parse(event.target.result));
        }
        reader.readAsText(file, "UTF-8");
    } else {
        alert("Erreur : aucun fichier sélectionné.");
    }
}


function loadConfigFromModals() {
    let config = {
        posts: [],
        slots: {},
        agents: [],
        objectives: {
            avoidTwiceInARow: null,
            standardizeWeeklyTotal: null,
            refTimes: {}
        },
        constraints: {
            posts: {},
            agentsAbsence: {},
            postsAttributions: {}
        }
    }
    let error = null;

    // POSTS
    document.getElementById("input-params-posts").value.split("\n").forEach(entry => {
        if (entry.trim() != "") {
            config.posts.push(entry.trim());
        }
    });
    if (config.posts.length == 0) error = "Veuillez renseigner au moins un poste.";

    // SLOTS
    let slotCount = 0;
    let currentDay = null;
    document.getElementById("input-params-slots").value.split("\n").forEach((entry) => {
        if (entry.trim() != "") {
            if (entry.trim().startsWith("-") && currentDay != null) {
                config.slots[currentDay].push(entry.trim().slice(1).trim());
                slotCount++;
            } else {
                currentDay = entry.trim();
                config.slots[currentDay] = [];
            }
        }
    });
    if (slotCount == 0) error = "Veuillez renseigner au moins un créneau.";

    // AGENTS
    document.getElementById("input-params-agents").value.split("\n").forEach(entry => {
        if (entry.trim() != "") {
            config.agents.push(entry.trim());
        }
    });
    if (config.agents.length == 0) error = "Veuillez renseigner au moins un agent.";

    // OBJECTIVES
    config.objectives.avoidTwiceInARow = parseInt(document.getElementById("input-params-objectives-avoidTwiceInARow").value);
    config.objectives.standardizeWeeklyTotal = parseInt(document.getElementById("input-params-objectives-standardizeWeeklyTotal").value);

    // REFTIMES
    document.querySelectorAll("#table-params-objectives-reftimes input").forEach(input => {
        let agent = input.name;
        config.objectives.refTimes[agent] = input.value;
    });

    // CONSTRAINTS POSTS
    iterateTableSchedule("table-params-constraints-posts", (td, day, slot, post) => {
        if (td.classList.contains("cell-disabled")) {
            if (!(post in config.constraints.posts)) {
                config.constraints.posts[post] = [];
            }
            config.constraints.posts[post].push([day, slot]);
        }
    });

    // AGENTS ABSCENCE
    iterateTableScheduleAgents("table-params-constraints-agents-absence", (td, day, slot, agent) => {
        if (td.classList.contains("cell-disabled")) {
            if (!(agent in config.constraints.agentsAbsence)) {
                config.constraints.agentsAbsence[agent] = [];
            }
            config.constraints.agentsAbsence[agent].push([day, slot]);
        }
    });

    // POSTS ATTRIBUTIONS
    iterateTablePostsAttributions("table-params-constraints-posts-attributions", (td, post, agent) => {
        if (td.classList.contains("cell-disabled")) {
            if (!(post in config.constraints.agentsAbsence)) {
                config.constraints.postsAttributions[post] = [];
            }
            config.constraints.postsAttributions[post].push(agent);
        }
    })

    // console.log(config);

    if (error != null) {
        alert(error);
        inflateModals();
    } else {
        loadConfig(config);
    }
}


function storageAvailable(type) {
    var storage;
    try {
        storage = window[type];
        var x = "__storage_test__";
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    } catch (e) {
        return e instanceof DOMException && (
                e.code === 22 ||
                e.code === 1014 ||
                e.name === "QuotaExceededError" ||
                e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
            (storage && storage.length !== 0);
    }
}


window.addEventListener("load", () => {
    CURRENT_CONFIG = null;
    if (storageAvailable("localStorage")) {
        let item = localStorage.getItem("config");
        if (item != null) {
            loadConfig(JSON.parse(item));
        }
    }
    if (CURRENT_CONFIG == null) {
        loadConfig(DEFAULT_CONFIG);
    }
});