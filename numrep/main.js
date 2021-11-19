const BASIC_STEP = {
    task: "attendre 1 milliard d'années ⏰",
    size: BigInt(3.155692608e+16)
}

const STEPS = [{
        task: "mélanger un jeu de 52 cartes puis tirer 5 cartes 🃏",
        until: "obtenir une quinte flush royale",
        size: BigInt(6.49740e+5)
    },
    {
        task: "enlever un brin d'herbe d'un grand terrain de foot ⚽",
        until: "raser le terrain",
        size: BigInt(2.316816e+6),
        source: "https://www.youtube.com/watch?v=ouGQWdwT-g0",
        precision: "120 m x 90 m"
    },
    {
        task: "jouer une grille de loto",
        until: "gagner le gros lot 🍀",
        precision: "5 numéros corrects et le numéro complémentaire",
        size: BigInt(1.906884e+7)
    },
    {
        task: "avancer d'un pas le long de l'équateur 🌍",
        until: "faire le tour de la Terre",
        precision: "1 m",
        size: BigInt(4.0075017e+7)
    },
    {
        task: "poser une feuille de papier sur le sol 📜",
        until: "atteindre le Soleil",
        precision: "60 µm",
        size: BigInt(2.49329784485e+15)
    },
    {
        task: "enlever 1g du mont Everest 🗻",
        until: "le rendre plat",
        size: BigInt(1.6193247609e+17)
    },
    {
        task: "ajouter un grain de sable dans le Grand Canyon 🌄",
        until: "le remplir",
        size: BigInt(4e+19)
    },
    {
        task: "enlever une goutte d'eau dans l'Océan Pacifique 💧",
        until: "le vider",
        size: BigInt(1.4152e25)
    },
    {
        task: "écrire une lettre sur une feuille de papier",
        until: "rédiger l'œuvre complète des Misérables 📚",
        size: BigInt(3.108328e6)
    }
];


function enumerateParts(arr) {
    if (arr.length == 0) {
        return [
            []
        ];
    } else {
        let head = arr[0];
        let parts = [];
        enumerateParts(arr.slice(1)).forEach(part => {
            parts.push(part);
            parts.push([head].concat(part));
        });
        return parts;
    }
}


function toast(message, duration) {
    let snackbar = document.getElementById("snackbar");
    snackbar.textContent = message;
    snackbar.className = "show";
    setTimeout(function() {
        snackbar.classList.remove("show");
        snackbar.textContent = "";
    }, duration);
}


const shuffleArray = array => {
    if (array != undefined) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
    }
}


function generatePlan(target) {
    let indices = [];
    STEPS.forEach((step, index) => {
        indices.push(index);
    });
    let firstGoodFound = null;
    let minRepeats = null;
    let minSelection = null;
    let parts = enumerateParts(indices);
    shuffleArray(parts);
    for (let j = 0; j < parts.length; j++) {
        let product = parts[j].map(i => STEPS[i].size).reduce((acc, val) => acc * val, BASIC_STEP.size);
        let repeats = target / product;
        if (repeats >= .8) {
            if (repeats <= 1001 && firstGoodFound == null) {
                firstGoodFound = j;
            }
            if (minRepeats == null || repeats < minRepeats) {
                minRepeats = repeats;
                minSelection = j;
            }
        }
    }
    if (minRepeats == null) {
        return null;
    } else {
        let selected = firstGoodFound == null ? minSelection : firstGoodFound;
        shuffleArray(parts[selected]);
        let plan = {
            target: target,
            repeats: minRepeats,
            steps: []
        };
        parts[selected].forEach(i => {
            plan.steps.push(STEPS[i]);
        });
        return plan;
    }
}


const capitalize = (s) => {
    if (typeof s !== 'string') return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
}


function cleanBigNumber(s) {
    let newString = "";
    let zeroInARow = 0;
    let zeroLimitReached = false;
    const inARowThreshold = 5;
    if (s.length >= 5 && s.startsWith("99999")) {
        s = s.replace(/^99999/g, "100000");
    }
    for (let i = 0; i < s.length; i++) {
        let c = s.charAt(i);
        if (c == "0") {
            zeroInARow++;
        } else {
            zeroInARow = 0;
        }
        if (zeroInARow >= inARowThreshold) {
            zeroLimitReached = true;
        }
        if (zeroLimitReached) {
            newString = newString + "0";
        } else {
            newString = newString + c;
        }
    }
    return newString;
}


function separateThousands(x) {
    const separator = " ";
    let s = x.toString();
    return cleanBigNumber(s).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}


function inflatePlan(plan) {
    let wrapper = document.getElementById("plan-wrapper");
    wrapper.innerHTML = "<p style='color: grey'>Voici comment attendre pendant <span style='color: var(--primary);'>" + separateThousands(plan.target) + "</span> secondes.</p>";

    let list = document.createElement("div");
    list.id = "step-list";

    let container = list;

    plan.steps.concat([BASIC_STEP]).forEach(step => {
        let el = document.importNode(document.getElementById("template-step").content, true);
        el.querySelector(".step-task").textContent = capitalize(step.task);
        if (step.until == null || step.until == undefined) {
            el.querySelector(".step-until-wrapper").remove();
        } else {
            el.querySelector(".step-until").textContent = step.until;
        }
        let nextContainer = el.querySelector(".step-prev");
        container.appendChild(el);
        container = nextContainer;
    });

    wrapper.appendChild(list);

    let p = document.createElement("p");
    p.innerHTML = "<span style='color: gray'>Tout ceci est à faire</span> " + separateThousands(Number(plan.repeats).toFixed(0)) + " <span style='color: gray'>fois</span>";
    wrapper.appendChild(p);

    document.body.appendChild(wrapper);

}


window.addEventListener("load", () => {
    document.getElementById("form-target").addEventListener("submit", (event) => {
        event.preventDefault();
        let value = parseFloat(document.getElementById("input-target").value);
        if (isNaN(value)) {
            toast("Je n'arrive pas à comprendre cette valeur 😞", 3000);
        } else {
            let plan = generatePlan(BigInt(value));
            if (plan == null || plan == undefined) {
                toast("Je n'arrive pas à trouver de solution convenable 😥", 3000);
            } else {
                inflatePlan(plan);
            }
        }
    });
});