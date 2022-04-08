const MONTH_SHORT = ["JAN", "FÉV", "MAR", "AVR", "MAI", "JUIN", "JUIL", "AOU", "SEP", "OCT", "NOV", "DÉC"];
const FILTERS = [
    { label: "Créatelier", defaultState: true, menuEntry: "createlier" },
    { label: "Formation au numérique", defaultState: false, menuEntry: "formation" },
    { label: "Fil d'étincelles", defaultState: true, menuEntry: "fil-detincelles" },
    { label: "Arduino", defaultState: true, menuEntry: "arduino" },
    { label: "Découpeuse", defaultState: true, menuEntry: "decoupeuse" },
    { label: "Brodeuse", defaultState: true, menuEntry: "brodeuse" },
    { label: "Imprimante 3D", defaultState: true, menuEntry: "3d" },
    { label: "Couture", defaultState: true, menuEntry: "couture" },
    { label: "Fais-le toi-même", defaultState: true, menuEntry: "diy" },
    { label: "Permanence numérique", defaultState: false, menuEntry: null },
];

function applyEventFilter(calendarEl, filter, status) {
    calendarEl.querySelectorAll(".tile").forEach(eventTile => {
        if (eventTile.querySelector(".tile-title").textContent.startsWith(filter)) {
            if (status) {
                eventTile.classList.remove("d-none");
            } else {
                eventTile.classList.add("d-none");
            }
        }
    });
}

function applyDefaultFilters() {
    document.querySelectorAll(".icalendar").forEach(calendarEl => {
        calendarEl.querySelectorAll("input").forEach(input => {
            applyEventFilter(calendarEl, input.getAttribute("filter"), input.checked);
        });
    });
}

function setupFilters(calendarEl) {
    let filterContainer = document.createElement("div");
    calendarEl.appendChild(filterContainer);
    filterContainer.innerHTML = `
        <b style="font-size: .7rem; height: 1.4rem; padding: .05rem .3rem .05rem 0; line-height: 1.2rem; display: inline-block;">Filtres</b>
        <small>
        <button class='btn btn-sm' id='btn-filter-all'>Tout cocher</button>
        <button class='btn btn-sm' id='btn-filter-none'>Tout décocher</button>
        </small><br>`;

    filterContainer.className = "p-2 s-rounded";
    filterContainer.style.border = "1px solid #ddd";
    filterContainer.style.background = "#fafafa";
    FILTERS.forEach((filter, i) => {
        let filterEl = document.createElement("div");
        filterEl.classList.add("form-group");
        filterEl.classList.add("d-inline-block");
        let label = document.createElement("label");
        label.className = "form-checkbox d-inline";
        filterEl.appendChild(label);
        let input = document.createElement("input");
        input.type = "checkbox";
        label.appendChild(input);
        input.checked = filter.defaultState;
        let icon = document.createElement("i");
        icon.className = "form-icon";
        label.appendChild(icon);
        let span = document.createElement("span");
        span.textContent = filter.label;
        label.appendChild(span);
        input.setAttribute("filter", filter.label);
        input.addEventListener("change", () => { applyEventFilter(calendarEl, filter.label, input.checked); });
        filterContainer.appendChild(filterEl);
    });

    filterContainer.querySelector("#btn-filter-all").addEventListener("click", () => {
        filterContainer.querySelectorAll("input").forEach(input => { input.checked = true; });
        calendarEl.querySelectorAll(".tile").forEach(eventTile => { eventTile.classList.remove("d-none") });
    });
    filterContainer.querySelector("#btn-filter-none").addEventListener("click", () => {
        filterContainer.querySelectorAll("input").forEach(input => { input.checked = false; });
        calendarEl.querySelectorAll(".tile").forEach(eventTile => { eventTile.classList.add("d-none") });
    });

}

function setupEvent(calendarEl, event) {
    let eventEl = document.createElement("div");
    calendarEl.appendChild(eventEl);
    let tile = document.createElement("div");
    eventEl.appendChild(tile);
    tile.classList.add("tile");
    tile.classList.add("mb-2");
    let tileIcon = document.createElement("div");
    tile.appendChild(tileIcon);
    tileIcon.className = "tile-icon text-bold text-center s-rounded bg-secondary p-2 tooltip";
    tileIcon.setAttribute("data-tooltip", event.startDate.toJSDate().toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    }));
    tileIcon.innerHTML = `<span>${event.startDate.day}</span><br><small class="text-bold">${MONTH_SHORT[event.startDate.month - 1]}</small>`
    let tileContent = document.createElement("div");
    tile.appendChild(tileContent);
    tileContent.classList.add("tile-content");
    let tileTitle = document.createElement("div");
    tileContent.appendChild(tileTitle);
    tileTitle.className = "tile-title text-bold";
    tileTitle.innerHTML = event.summary;
    let tileSubtitle = document.createElement("details");
    tileContent.appendChild(tileSubtitle);
    tileSubtitle.classList.add("tile-subtitle");
    let summary = document.createElement("summary");
    summary.style.margin = "-.2em 0 .4em 0";
    tileSubtitle.appendChild(summary);
    summary.innerHTML = `<span class="label">${event.startDate.hour.toString().padStart(2, "0")}h${event.startDate.minute > 0 ? event.startDate.minute.toString().padStart(2, "0") : ""} – ${event.endDate.hour.toString().padStart(2, "0")}h${event.endDate.minute > 0 ? event.endDate.minute.toString().padStart(2, "0") : ""}</span>${event.location ? " <small>" + event.location + "</small>": ""}`;
    if (event.description.trim().length > 0) {
        let description = document.createElement("p");
        tileSubtitle.appendChild(description);
        description.innerHTML = event.description.replaceAll("\n", "<br>");
    } else {
        let description = document.createElement("p");
        tileSubtitle.appendChild(description);
        description.innerHTML = "Aucune description fournie.";
    }
}


function setupFilterMenuEntries(allEvents) {
    FILTERS.filter(f => { return f.menuEntry != null }).forEach(filter => {
        document.querySelectorAll(`.calendar-filter[calendarFilter="${filter.menuEntry}"]`).forEach(node => {
            let popover = document.createElement("div");
            popover.className = "popover popover-right";
            popover.style.color = "#50596c";
            let popoverContainer = document.createElement("div");
            popoverContainer.className = "popover-container";
            node.parentNode.appendChild(popover);
            popover.appendChild(node);
            popover.appendChild(popoverContainer);

            let filteredEvents = filterEvents(allEvents, filter.label);

            let card = document.createElement("div");
            card.className = "card";
            let cardHeader = document.createElement("div");
            cardHeader.className = "card-header";
            let cardTitle = document.createElement("div");
            cardTitle.className = "card-title text-bold";
            cardTitle.textContent = filter.label;
            let cardSubtitle = document.createElement("div");
            cardSubtitle.className = "card-subtitle text-gray";
            if (filteredEvents.length == 0) {
                cardSubtitle.textContent = "Aucun événement prévu prochainement";
            } else if (filteredEvents.length == 1) {
                cardSubtitle.textContent = "1 événement prévu";
            } else {
                cardSubtitle.textContent = `${filteredEvents.length} événements prévus`;
            }
            let cardBody = document.createElement("div");
            cardBody.className = "card-body";
            cardBody.style.overflowY = "auto";
            cardBody.style.maxHeight = "400px";
            filteredEvents.forEach(event => {
                let tile = document.createElement("div");
                tile.className = "mb-2"
                tile.innerHTML = `
                    <span class="label label-primary">${event.startDate.day} ${MONTH_SHORT[event.startDate.month - 1]}</span>
                    <span class="label">${event.startDate.hour.toString().padStart(2, "0")}h${event.startDate.minute > 0 ? event.startDate.minute.toString().padStart(2, "0") : ""} – ${event.endDate.hour.toString().padStart(2, "0")}h${event.endDate.minute > 0 ? event.endDate.minute.toString().padStart(2, "0") : ""}</span>
                    <br>
                    ${event.summary}
                `;
                cardBody.appendChild(tile);
            });
            card.appendChild(cardHeader);
            cardHeader.appendChild(cardTitle);
            cardHeader.appendChild(cardSubtitle);
            card.appendChild(cardBody);
            popoverContainer.appendChild(card);

        });
    });
}


function filterEvents(allEvents, filterLabel) {
    return allEvents.filter(event => {
        return event.summary.startsWith(filterLabel);
    })
}


function setupCalendarEl(calendarEl) {
    let iCalendarSource = calendarEl.getAttribute("src");
    console.log("Fetching iCalendar data from", iCalendarSource);
    fetch(iCalendarSource).then(res => res.text()).then(iCalendarData => {
        const calendar = new IcalExpander({ ics: iCalendarData, maxIterations: 100 });
        const selection = calendar.all();
        const mappedEvents = selection.events.map(e => ({
            startDate: e.startDate,
            endDate: e.endDate,
            summary: e.summary,
            description: e.description,
            location: e.location
        }));
        const mappedOccurrences = selection.occurrences.map(o => ({
            startDate: o.startDate,
            endDate: o.endDate,
            summary: o.item.summary,
            description: o.item.description,
            location: o.item.location
        }));
        let allEvents = [].concat(mappedEvents, mappedOccurrences);
        let now = new Date();
        now.setHours(0, 0, 0, 0);
        allEvents = allEvents.filter(event => {
            return event.startDate.toJSDate() >= now;
        }).sort((eventA, eventB) => {
            if (eventA.startDate.toJSDate() < eventB.startDate.toJSDate()) {
                return -1;
            } else if (eventA.startDate.toJSDate() == eventB.startDate.toJSDate()) {
                return 0;
            } else {
                return 1;
            }
        });
        calendarEl.innerHTML = "";
        setupFilters(calendarEl);
        calendarEl.appendChild(document.createElement("br"));
        allEvents.forEach(event => {
            setupEvent(calendarEl, event);
        });
        applyDefaultFilters();
        setupFilterMenuEntries(allEvents);
    });
}


window.addEventListener("load", () => {
    document.querySelectorAll(".icalendar").forEach(setupCalendarEl);
});