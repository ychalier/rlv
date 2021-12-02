const DATASET_URL = "scrap/merger.json";
var DATASET = [];
var MASONRY = null;


function addBools(...x) {
    if (x.length == 0) {
        return 0;
    } else {
        let y = x.pop();
        return addBools(...x) + (y ? 1 : 0);
    }
}


function search() {
    let query = normalize(document.getElementById("input-search").value);
    // let tokens = query.split(" ");
    let data = [];
    DATASET.forEach(entry => {
        let thereIsAMatchingTag = false;
        entry.normalized.tags.forEach(tag => {
            thereIsAMatchingTag = thereIsAMatchingTag || (tag == query);
        });
        let thereIsAMatchingCategory = false;
        entry.normalized.categories.forEach(category => {
            thereIsAMatchingCategory = thereIsAMatchingCategory || category.includes(query);
        });
        let thereIsAMatchingTitle = entry.normalized.title.includes(query);
        let thereIsAMatchingDescription = entry.normalized.description.includes(query);

        entry.score = addBools(
            thereIsAMatchingTitle,
            thereIsAMatchingDescription,
            thereIsAMatchingTag,
            thereIsAMatchingCategory
        )

        if (entry.score > 0) {
            data.push(entry);
        }
    });
    data.sort((a, b) => {
        return b.score - a.score;
    })
    inflateList(data);
}


window.addEventListener("load", () => {
    fetch(DATASET_URL).then(res => res.json()).then(data => {
        DATASET = [];
        var links_memory = [];
        var pdf_memory = [];
        data.entries.forEach(entry => {
            let allow = true;
            if (entry.link != null && links_memory.includes(entry.link)) {
                allow = false;
            }
            if (entry.pdf != null && pdf_memory.includes(entry.pdf)) {
                allow = false;
            }
            if (allow) {
                if (entry.link != null) links_memory.push(entry.link);
                if (entry.pdf != null) pdf_memory.push(entry.pdf);
                entry.normalized = {
                    title: normalize(entry.title),
                    description: entry.description == null ? "" : normalize(entry.description),
                    tags: entry.tags.map(normalize),
                    categories: entry.categories.map(normalize),
                }
                DATASET.push(entry);
            }
        })
        shuffleArray(DATASET);
        document.getElementById("modal-loading").classList.remove("active");
        inflateList(DATASET);
    });


    document.getElementById("form-search").addEventListener("submit", (event) => {
        event.preventDefault();
        search();
    });

});


function deleteElement(container, selector) {
    let el = container.querySelector(selector);
    el.parentNode.removeChild(el);
}


function safeSpace(string) {
    let x = string;
    x = x.replace(/ ([?!;:])/gm, `&nbsp;$1`); // Non breaking spaces before some punct
    x = x.replace(/([:\.\?!])(\w)/gm, `$1 $2`); // Insert space after some punct
    x = x.replace(/(\w)([:\?!])/gm, `$1 $2`); // Insert space befoure some punct
    return x;
}


const shuffleArray = array => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}



function inflateList(data) {
    let templateFiche = document.getElementById("template-card");
    let templateTag = document.getElementById("template-tag");
    let templateCategory = document.getElementById("template-category");
    let container = document.getElementById("list");
    container.innerHTML = '<div class="grid-sizer"></div><div class="gutter-sizer"></div>';
    document.getElementById("count").innerHTML = data.length + " fiche" + (data.length > 1 ? "s" : "");
    data.forEach(entry => {
        let el = document.importNode(templateFiche.content, true);
        el.querySelector(".fiche-titre").innerHTML = safeSpace(entry.title);

        if (entry.description != null) {
            el.querySelector(".fiche-description").innerHTML = safeSpace(entry.description);
        } else {
            deleteElement(el, ".fiche-description");
        }
        if (entry.tags.length > 0) {
            let tagContainer = el.querySelector(".fiche-tags");
            entry.tags.forEach(tag => {
                let tagEl = document.importNode(templateTag.content, true);
                tagEl.querySelector(".tag-label").textContent = tag;
                tagEl.querySelector(".tag-label").addEventListener("click", () => {
                    document.getElementById("input-search").value = tag;
                    search();
                });
                tagContainer.appendChild(tagEl);
            });
        } else {
            deleteElement(el, ".fiche-tags");
        }

        if (entry.categories.length > 0) {
            let categoryContainer = el.querySelector(".fiche-categories");
            entry.categories.forEach(category => {
                let categoryEl = document.importNode(templateCategory.content, true);
                categoryEl.querySelector(".category-label").textContent = category;
                categoryEl.querySelector(".category-label").addEventListener("click", () => {
                    document.getElementById("input-search").value = category;
                    search();
                });
                categoryContainer.appendChild(categoryEl);
            });
        } else {
            deleteElement(el, ".fiche-categories");
        }

        if (entry.link != null) {
            el.querySelector(".fiche-link").href = entry.link;
        } else {
            deleteElement(el, ".fiche-link");
        }
        if (entry.pdf != null) {
            el.querySelector(".fiche-pdf").href = entry.pdf;
        } else {
            deleteElement(el, ".fiche-pdf");
        }
        el.querySelector(".fiche-source").textContent = entry.source;
        container.appendChild(el);
    });

    if (MASONRY == null) {
        MASONRY = new Masonry(".grid", {
            gutter: '.gutter-sizer',
            columnWidth: '.grid-sizer',
            itemSelector: '.grid-item',
            percentPrecision: true
        });
    } else {
        MASONRY.reloadItems();
        MASONRY.layout();
    }



}