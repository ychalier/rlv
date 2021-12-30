var vectFromX = null;
var vectToX = null;
var vectFromY = null;
var vectToY = null;
var chart = null;
var cache = [];

Chart.plugins.register(ChartDataLabels);


async function vectorize(word, callback) {
    let request = new XMLHttpRequest();
    request.open("GET", "http://localhost:8000/vect?word=" + word, true);
    request.onreadystatechange = function() {
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            let data = JSON.parse(this.responseText);
            if (data.success) {
                callback(math.matrix(data.vector));
            } else {
                console.log("Vector not found");
            }
        }
    }
    request.send(null);
}


async function setAxes() {
    await vectorize(document.querySelector("#axis-x input[name='from']").value, (vect) => {
        vectFromX = vect;
    });
    await vectorize(document.querySelector("#axis-x input[name='to']").value, (vect) => {
        vectToX = vect;
    });
    await vectorize(document.querySelector("#axis-y input[name='from']").value, (vect) => {
        vectFromY = vect;
    });
    await vectorize(document.querySelector("#axis-y input[name='to']").value, (vect) => {
        vectToY = vect;
    });
    chart.data.datasets[0].data = [];
    chart.update();
    cache.forEach((word) => {
        addWord(word);
    });
}

function addWord(word) {
    vectorize(word, (vect) => {
        let vectX = math.subtract(vectToX, vectFromX);
        let x = math.dot(vect, vectX);
        let vectY = math.subtract(vectToY, vectFromY);
        let y = math.dot(vect, vectY);
        chart.data.datasets[0].data.push({
            x: x,
            y: y,
            r: 50,
            label: word,
        });
        chart.ctx.fillText(word, x, y);
        chart.update();
    });
}

function addWordFromForm(event) {
    event.preventDefault();
    let form = document.getElementById("form-add-word");
    let word = form.querySelector("input[type='text']").value;
    form.reset();
    addWord(word);
    cache.push(word);
}

function reset() {
    chart.data.datasets[0].data = [];
    chart.update();
    cache = [];
}

function onLoad() {
    document.getElementById("btn-set-axes").addEventListener("click", setAxes);
    document.getElementById("btn-reset").addEventListener("click", reset);
    document.getElementById("form-add-word").addEventListener("submit", addWordFromForm);
    var ctx = document.getElementById("graph").getContext('2d');
    chart = new Chart(ctx, {
        type: "bubble",
        data: {
            datasets: [{
                backgroundColor: "rgba(127, 0, 0, 0.8)",
                borderColor: "crimson",
                label: "",
                data: [],
            }],
        },
        plugins: [ChartDataLabels],
        options: {
            legend: {
                display: false
            },
            tooltips: {
                enabled: false
            },
            plugins: {
                datalabels: {
                    anchor: function(context) {
                        return "center";
                    },
                    align: function(context) {
                        return "center";
                    },
                    color: function(context) {
                        return "white";
                    },
                    font: {
                        weight: 'bold'
                    },
                    formatter: function(value) {
                        return value.label;
                    },
                    offset: 2,
                    padding: 0
                }
            },

            // Core options
            aspectRatio: 5 / 3,
            layout: {
                padding: 16
            },
            scales: {
                xAxes: [{
                    ticks: {
                        display: false
                    }
                }],
                yAxes: [{
                    ticks: {
                        display: false
                    }
                }]
            }
        }
    });
}

window.addEventListener("load", onLoad);