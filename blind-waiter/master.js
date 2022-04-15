let GLASS_STATES = [];

function applyStates() {
    GLASS_STATES.forEach(state => {
        state.element.style.transform = `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale})${ state.flip ? " rotate(180deg)" : ""}`;
    });
}

function swapGlasses(i, j) {
    let tmp = {
        element: GLASS_STATES[j].element,
        translateX: GLASS_STATES[i].translateX,
        translateY: GLASS_STATES[i].translateY,
        scale: GLASS_STATES[j].scale,
        flip: GLASS_STATES[j].flip
    };
    GLASS_STATES[i] = {
        element: GLASS_STATES[i].element,
        translateX: GLASS_STATES[j].translateX,
        translateY: GLASS_STATES[j].translateY,
        scale: GLASS_STATES[i].scale,
        flip: GLASS_STATES[i].flip
    };
    GLASS_STATES[j] = tmp;
}

function rotateGlassesQuarter() {
    swapGlasses(0, 1);
    swapGlasses(1, 2);
    swapGlasses(2, 3);
}

window.addEventListener("load", () => {
    const TARGET_CENTERS = [
        [-3, -3],
        [-3, 3],
        [3, 3],
        [3, -3]
    ];

    document.querySelectorAll(".glass").forEach((glass, i) => {
        let targetCenter = TARGET_CENTERS[i];
        const strokeWidth = 0.420738;
        const scale = 0.5;
        const width = 7.1272829 + strokeWidth;
        const height = 9.4467323 + strokeWidth;

        glass.style.transformOrigin = `${width / 2}px ${ height / 2}px`;

        GLASS_STATES.push({
            element: glass,
            translateX: targetCenter[0] - .5 * width,
            translateY: targetCenter[1] - .5 * height,
            scale: scale,
            flip: false
        });

        glass.addEventListener("click", () => {
            GLASS_STATES[i].flip = !GLASS_STATES[i].flip;
            applyStates();
        });
    });

    applyStates();

    document.getElementById("btn-rotate-1").addEventListener("click", () => {
        rotateGlassesQuarter();
        applyStates();
    });

});