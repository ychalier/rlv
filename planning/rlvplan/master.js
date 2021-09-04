const DEFAULT_CONFIG = {
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
        postsAttributions: {},
        limits: {}
    }
}
var CURRENT_CONFIG = null;


function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}


function intToRGB(i) {
    let c = (i & 0x00FFFFFF).toString(16).toUpperCase();
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
    document.getElementById("input-objectives-avoidTwiceInARow").value = CURRENT_CONFIG.objectives.avoidTwiceInARow;
    document.getElementById("input-objectives-standardizeWeeklyTotal").value = CURRENT_CONFIG.objectives.standardizeWeeklyTotal;

    inflateTableSchedule("table-constraints-posts", (td, day, slot, post) => {
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

    inflateTableConstraintsAbsences();
    inflateTableConstraintsAttributions();
    inflateTableObjectivesQuotas();
    inflateTableConstraintsLimits();

}


const slotDurationPattern = /^(\d+)h(\d+)? \- (\d+)h(\d+)?$/;


function getSlotDuration(slot) {
    let match = slot.match(slotDurationPattern);
    return parseInt(match[3]) +
        (match[4] ? parseInt(match[4]) / 60 : 0) -
        parseInt(match[1]) -
        (match[2] ? parseInt(match[2]) / 60 : 0);
}


function getTotalTime() {
    let totalTime = 0;
    for (let day in CURRENT_CONFIG.slots) {
        CURRENT_CONFIG.slots[day].forEach(slot => {
            totalTime += getSlotDuration(slot) * CURRENT_CONFIG.posts.length;
        });
    }
    for (let post in CURRENT_CONFIG.constraints.posts) {
        CURRENT_CONFIG.constraints.posts[post].forEach(arr => {
            totalTime -= getSlotDuration(arr[1]);
        });
    }
    return totalTime;
}


function getAverageTime() {
    return getTotalTime() / CURRENT_CONFIG.agents.length;
}


function resetTableObjectivesQuotas() {
    let avgTime = getAverageTime();
    document.querySelectorAll("#table-objectives-quotas input").forEach(input => {
        input.value = avgTime;
    });
}


function updateObjectivesQuotasSum() {
    let total = 0;
    document.querySelectorAll("#table-objectives-quotas input").forEach(inpt => {
        total += parseFloat(inpt.value);
    });
    document.getElementById("span-objectives-quotas-current").textContent = total.toFixed(2);
    let diff = (total - getTotalTime());
    document.getElementById("span-objectives-quotas-diff").textContent = (diff >= 0 ? "+" : "") + diff.toFixed(2);
}


function inflateTableObjectivesQuotas() {
    let avgTime = getAverageTime();
    document.getElementById("span-objectives-quotas-total").textContent = getTotalTime().toFixed(2);
    document.getElementById("span-objectives-quotas-avg").textContent = avgTime.toFixed(2);
    let tbody = document.querySelector("#table-objectives-quotas tbody");
    tbody.innerHTML = "";
    CURRENT_CONFIG.agents.forEach(agent => {
        let tr = importTemplate("template-quotas-tr");
        tr.querySelector(".quota-agent").textContent = agent;
        let input = tr.querySelector("input");
        input.addEventListener("input", updateObjectivesQuotasSum);
        input.max = getAgentMaxTime(agent);
        input.name = agent;
        input.value = parseFloat(agent in CURRENT_CONFIG.objectives.refTimes ? CURRENT_CONFIG.objectives.refTimes[agent] : avgTime).toFixed(2);
        tr.querySelector(".quota-max").textContent = getAgentMaxTime(agent);
        tbody.appendChild(tr);
    });
    updateObjectivesQuotasSum();
}


function inflateTableConstraintsLimits() {
    let maxTime = 0;
    for (let day in CURRENT_CONFIG.slots) {
        CURRENT_CONFIG.slots[day].forEach(slot => {
            maxTime += getSlotDuration(slot);
        });
    }
    let tbody = document.querySelector("#table-constraints-limits tbody");
    tbody.innerHTML = "";
    CURRENT_CONFIG.agents.forEach(agent => {
        let tr = importTemplate("template-limits-tr");
        tr.querySelector(".limit-agent").textContent = agent;
        let input = tr.querySelector("input");
        input.name = agent;
        input.value = parseFloat(agent in CURRENT_CONFIG.constraints.limits ? CURRENT_CONFIG.constraints.limits[agent] : maxTime);
        tbody.appendChild(tr);
    });
}


function inflateTableConstraintsAttributions() {
    let table = document.getElementById("table-constraints-attributions");
    table.innerHTML = "";
    let thead = document.createElement("thead");
    let tHeadTr = document.createElement("tr");
    tHeadTr.innerHTML = "<th></th>";
    CURRENT_CONFIG.posts.forEach(post => {
        let th = document.createElement("th");
        th.textContent = post;
        tHeadTr.appendChild(th);
    });
    thead.appendChild(tHeadTr);
    table.appendChild(thead);
    let tbody = document.createElement("tbody");
    CURRENT_CONFIG.agents.forEach(agent => {
        let tr = document.createElement("tr");
        let tdAgent = document.createElement("td");
        tdAgent.textContent = agent;
        tr.appendChild(tdAgent);
        CURRENT_CONFIG.posts.forEach(post => {
            let tdPost = document.createElement("td");
            tdPost.classList.add("schedule-cell");
            if (!isAgentAttributedTo(post, agent)) {
                tdPost.classList.add("cell-disabled");
            }
            tdPost.addEventListener("click", (event) => {
                if (tdPost.classList.contains("cell-disabled")) {
                    tdPost.classList.remove("cell-disabled");
                } else {
                    tdPost.classList.add("cell-disabled");
                }
            });
            tr.appendChild(tdPost);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
}


function iterateTableConstraintsAttributions(cellCallback) {
    let table = document.getElementById("table-constraints-attributions");
    table.querySelectorAll("tbody tr").forEach(tr => {
        let tds = Array.prototype.slice.call(tr.querySelectorAll("td"));
        let agent = tds[0].textContent;
        tds.shift();
        for (let i = 0; i < tds.length; i++) {
            cellCallback(tds[i], CURRENT_CONFIG.posts[i], agent);
        }
    });
}


function inflateTableConstraintsAbsences() {
    let table = document.getElementById("table-constraints-absences");
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
                tdDay.classList.add("td-day");
                tdDay.setAttribute("rowspan", CURRENT_CONFIG.slots[day].length);
                tr.appendChild(tdDay);
            }
            let tdSlot = document.createElement("td");
            tdSlot.classList.add("td-slot");
            tdSlot.textContent = CURRENT_CONFIG.slots[day][i];
            tr.appendChild(tdSlot);
            CURRENT_CONFIG.agents.forEach(agent => {
                let tdAgent = document.createElement("td");
                tdAgent.classList.add("schedule-cell");
                if (!isAgentPresent(day, CURRENT_CONFIG.slots[day][i], agent)) {
                    tdAgent.classList.add("cell-disabled");
                }
                tdAgent.addEventListener("click", (event) => {
                    if (tdAgent.classList.contains("cell-disabled")) {
                        tdAgent.classList.remove("cell-disabled");
                    } else {
                        tdAgent.classList.add("cell-disabled");
                    }
                });
                tr.appendChild(tdAgent);
            });
            tBody.appendChild(tr);
        }
    }
    table.appendChild(tBody);
}


function iterateTableConstraintsAbsences(cellCallback) {
    let table = document.getElementById("table-constraints-absences");
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


function isPostOpened(day, slot, post) {
    if (!(post in CURRENT_CONFIG.constraints.posts)) {
        return true;
    }
    for (let i = 0; i < CURRENT_CONFIG.constraints.posts[post].length; i++) {
        if (CURRENT_CONFIG.constraints.posts[post][i][0] == day && CURRENT_CONFIG.constraints.posts[post][i][1] == slot) {
            return false;
        }
    }
    return true;
}


function isAgentPresent(day, slot, agent) {
    if (!(agent in CURRENT_CONFIG.constraints.agentsAbsence)) {
        return true;
    }
    for (let i = 0; i < CURRENT_CONFIG.constraints.agentsAbsence[agent].length; i++) {
        if (CURRENT_CONFIG.constraints.agentsAbsence[agent][i][0] == day && CURRENT_CONFIG.constraints.agentsAbsence[agent][i][1] == slot) {
            return false;
        }
    }
    return true;
}


function isAgentAttributedTo(post, agent) {
    if (!(post in CURRENT_CONFIG.constraints.postsAttributions)) {
        return true;
    }
    for (let i = 0; i < CURRENT_CONFIG.constraints.postsAttributions[post].length; i++) {
        if (CURRENT_CONFIG.constraints.postsAttributions[post][i] == agent) {
            return false;
        }
    }
    return true;
}


function getAgentMaxTime(agent) {
    let maxAgentTime = 0;
    for (let day in CURRENT_CONFIG.slots) {
        CURRENT_CONFIG.slots[day].forEach(slot => {
            let available = false;
            CURRENT_CONFIG.posts.forEach(post => {
                if (isPostOpened(day, slot, post) && isAgentPresent(day, slot, agent) && isAgentAttributedTo(post, agent)) {
                    available = true;
                }
            });
            if (available) {
                maxAgentTime += getSlotDuration(slot);
            }
        });
    }
    return maxAgentTime;
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
    inflateTableSchedule("table-schedule", (td, day, slot, post) => {
        td.classList.add("agent-cell")
        if (!isPostOpened(day, slot, post)) {
            td.classList.add("post-closed");
        }
    });
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
    }).catch(error => {
        alert("Une erreur est survenue : " + error + "\nLe serveur est peut-être éteint.");
        document.getElementById("modal-loading").classList.remove("active");
    }).then(() => {
        let interval = null;
        interval = setInterval(() => {
            fetch("/answer").then(response => {
                response.json().then(data => {
                    if ("error" in data) {
                        alert("Le serveur a rencontré une erreur lors de la génération :\n" + data.error);
                        clearInterval(interval);
                        document.getElementById("modal-loading").classList.remove("active");
                    } else if (data.done) {
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


function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}


function loadConfigFromModals() {
    let config = clone(DEFAULT_CONFIG);
    let error = null;

    // PARAMS POSTS
    document.getElementById("input-params-posts").value.split("\n").forEach(entry => {
        if (entry.trim() != "") {
            config.posts.push(entry.trim());
        }
    });
    // if (config.posts.length == 0) error = "Veuillez renseigner au moins un poste.";

    // PARAMS SLOTS
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
    // if (slotCount == 0) error = "Veuillez renseigner au moins un créneau.";

    // PARAMS AGENTS
    document.getElementById("input-params-agents").value.split("\n").forEach(entry => {
        if (entry.trim() != "") {
            config.agents.push(entry.trim());
        }
    });
    // if (config.agents.length == 0) error = "Veuillez renseigner au moins un agent.";

    // PARAMS OBJECTIVES
    config.objectives.avoidTwiceInARow = parseInt(document.getElementById("input-objectives-avoidTwiceInARow").value);
    config.objectives.standardizeWeeklyTotal = parseInt(document.getElementById("input-objectives-standardizeWeeklyTotal").value);

    // OBJECTIVES QUOTAS
    document.querySelectorAll("#table-objectives-quotas input").forEach(input => {
        let agent = input.name;
        config.objectives.refTimes[agent] = input.value;
    });

    // CONSTRAINTS LIMITS
    document.querySelectorAll("#table-constraints-limits input").forEach(input => {
        let agent = input.name;
        config.constraints.limits[agent] = parseFloat(input.value);
    });

    // CONSTRAINTS POSTS
    iterateTableSchedule("table-constraints-posts", (td, day, slot, post) => {
        if (td.classList.contains("cell-disabled")) {
            if (!(post in config.constraints.posts)) {
                config.constraints.posts[post] = [];
            }
            config.constraints.posts[post].push([day, slot]);
        }
    });

    // CONSTRAINTS ABSCENCES
    iterateTableConstraintsAbsences((td, day, slot, agent) => {
        if (td.classList.contains("cell-disabled")) {
            if (!(agent in config.constraints.agentsAbsence)) {
                config.constraints.agentsAbsence[agent] = [];
            }
            config.constraints.agentsAbsence[agent].push([day, slot]);
        }
    });

    // CONSTRAINTS ATTRIBUTIONS
    iterateTableConstraintsAttributions((td, post, agent) => {
        if (td.classList.contains("cell-disabled")) {
            if (!(post in config.constraints.postsAttributions)) {
                config.constraints.postsAttributions[post] = [];
            }
            config.constraints.postsAttributions[post].push(agent);
        }
    })

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
        loadConfig(clone(DEFAULT_CONFIG));
    }
});