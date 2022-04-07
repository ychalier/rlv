const MONTH_SHORT = ["JAN", "FÉV", "MAR", "AVR", "MAI", "JUIN", "JUIL", "AOU", "SEP", "OCT", "NOV", "DÉC"];
const FILTERS = ["Créatelier", "Formation au numérique", "Fil d'étincelles", "Arduino", "Découpeuse", "Brodeuse", "Imprimante 3D", "Couture", "Fais-le toi-même", "Permanence numérique"]

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
    FILTERS.forEach(filter => {
        let filterEl = document.createElement("div");
        filterEl.classList.add("form-group");
        filterEl.classList.add("d-inline-block");
        let label = document.createElement("label");
        label.className = "form-checkbox d-inline";
        filterEl.appendChild(label);
        let input = document.createElement("input");
        input.type = "checkbox";
        label.appendChild(input);
        input.checked = true;
        let icon = document.createElement("i");
        icon.className = "form-icon";
        label.appendChild(icon);
        let span = document.createElement("span");
        span.textContent = filter;
        label.appendChild(span);
        input.addEventListener("change", () => { applyEventFilter(calendarEl, filter, input.checked); });
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
    tileTitle.classList.add("tile-title");
    tileTitle.classList.add("text-bold");
    tileTitle.innerHTML = event.summary;
    let tileSubtitle = document.createElement("details");
    tileContent.appendChild(tileSubtitle);
    tileSubtitle.classList.add("tile-subtitle");
    let summary = document.createElement("summary");
    summary.style.margin = "-.2em 0 .4em 0";
    tileSubtitle.appendChild(summary);
    summary.innerHTML = `${event.startDate.hour.toString().padStart(2, "0")}h${event.startDate.minute > 0 ? event.startDate.minute.toString().padStart(2, "0") : ""} – ${event.endDate.hour.toString().padStart(2, "0")}h${event.endDate.minute > 0 ? event.endDate.minute.toString().padStart(2, "0") : ""}${event.location ? "<br><small>" + event.location + "</small>": ""}`;
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

function setupCalendarEl(calendarEl) {
    let iCalendarSource = calendarEl.getAttribute("src");
    console.log("Fetching iCalendar data from", iCalendarSource);
    fetch(iCalendarSource).then(res => res.text()).then(iCalendarData => {
        const calendar = new IcalExpander({ ics: iCalendarData, maxIterations: 100 });
        let now = new Date();
        // now.setDate(now.getDate() - 1);
        now.setHours(0, 0, 0, 0);
        const selection = calendar.after(now);
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
        const allEvents = [].concat(mappedEvents, mappedOccurrences);
        allEvents.sort((a, b) => a.startDate > b.startDate);
        calendarEl.innerHTML = "";
        setupFilters(calendarEl);
        calendarEl.appendChild(document.createElement("br"));
        allEvents.forEach(event => {
            setupEvent(calendarEl, event);
        });
    });
}


window.addEventListener("load", () => {
    document.querySelectorAll(".icalendar").forEach(setupCalendarEl);
});