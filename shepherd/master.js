var FPS = 144;
var controller;
var POINT_RADIUS = 1;

const L = 150;
var N = 200;
var n = 50;
var r_s = 65;
var r_a = 2;
var rho_a = 2;
var c = 1.05;
var rho_s = 1;
var h = 0.5;
var e_a = 0.3;
var e_s = 0.3;
const delta = 1;
const delta_s = 1.5;
var n_s = 20;
const beta = Math.PI * 0.5;
const p = 0.05;
var N_t = 0;

var display_gcm = false;
var display_lcm = false;
var display_shepherd_zone = false;


function bindInputs() {
    document.getElementById("input-display-gcm").addEventListener("input", (event) => {
        display_gcm = event.target.checked;
    });
    document.getElementById("input-display-lcm").addEventListener("input", (event) => {
        display_lcm = event.target.checked;
    });
    document.getElementById("input-display-shepherd-zone").addEventListener("input", (event) => {
        display_shepherd_zone = event.target.checked;
    });
    document.getElementById("input-fps").addEventListener("input", (event) => {
        FPS = parseInt(event.target.value);
    });
    document.getElementById("input-n").addEventListener("input", (event) => {
        N = parseInt(event.target.value);
    });
    document.getElementById("input-n-s").addEventListener("input", (event) => {
        n_s = parseInt(event.target.value);
    });
    document.getElementById("input-nearest").addEventListener("input", (event) => {
        n = parseInt(event.target.value);
    });
    document.getElementById("input-e-s").addEventListener("input", (event) => {
        e_s = event.target.checked ? 0.3 : 0;
    });
    document.getElementById("input-rho-a").addEventListener("input", (event) => {
        rho_a = event.target.checked ? 2 : 0;
    });
    document.getElementById("input-rho-s").addEventListener("input", (event) => {
        rho_s = event.target.checked ? 1 : 0;
    });
    document.getElementById("input-c").addEventListener("input", (event) => {
        c = event.target.checked ? 1.05 : 0;
    });
    document.getElementById("input-h").addEventListener("input", (event) => {
        h = event.target.checked ? 0.5 : 0;
    });
    document.getElementById("input-e-a").addEventListener("input", (event) => {
        e_a = event.target.checked ? 0.3 : 0;
    });
    document.getElementById("input-r-s").addEventListener("input", (event) => {
        r_s = parseInt(event.target.value);
    });
    document.getElementById("input-r-a").addEventListener("input", (event) => {
        r_a = parseInt(event.target.value);
    });
    document.getElementById("input-point-radius").addEventListener("input", (event) => {
        POINT_RADIUS = [0.5, 1, 1.5, 2, 3][parseInt(event.target.value)];
    });

    display_gcm = document.getElementById("input-display-gcm").checked;
    display_lcm = document.getElementById("input-display-lcm").checked;
    display_shepherd_zone = document.getElementById("input-display-shepherd-zone").checked;
    FPS = parseInt(document.getElementById("input-fps").value);
    N = parseInt(document.getElementById("input-n").value);
    n_s = parseInt(document.getElementById("input-n-s").value);
    n = parseInt(document.getElementById("input-nearest").value);
    e_s = document.getElementById("input-e-s").checked ? 0.3 : 0;
    rho_a = document.getElementById("input-rho-a").checked ? 2 : 0;
    rho_s = document.getElementById("input-rho-s").checked ? 1 : 0;
    c = document.getElementById("input-c").checked ? 1.05 : 0;
    h = document.getElementById("input-h").checked ? 0.5 : 0;
    e_a = document.getElementById("input-e-a").checked ? 0.3 : 0;
    r_s = parseInt(document.getElementById("input-r-s").value);
    r_a = parseInt(document.getElementById("input-r-a").value);
    POINT_RADIUS = [0.5, 1, 1.5, 2, 3][parseInt(document.getElementById("input-point-radius").value)];
}


class Canvas {
    constructor(el) {
        this.el = el;
        this.ctx = this.el.getContext("2d");
        this.size = undefined;
        this.mouse = new Vector();
        this.scale = 1;
    }

    setup() {
        this.el.addEventListener("mousemove", (event) => {
            this.mouse.x = event.clientX;
            this.mouse.y = event.clientY;
        });
        this.resize();
    }

    resize() {
        this.size = Math.min(window.innerWidth, window.innerHeight) - 10;
        this.el.width = this.size;
        this.el.height = this.size;
        this.scale = this.size / (L * 3);
    }

    offset(z) {
        return (z + L) * this.scale;
    }

    clear() {
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(0, 0, this.size, this.size);
    }

    drawPoint(point, color) {
        if (point == undefined) return;
        if (color != undefined) {
            this.ctx.fillStyle = color;
        } else {
            this.ctx.fillStyle = "black";
        }
        this.ctx.beginPath();
        this.ctx.arc(this.offset(point.x), this.offset(point.y), POINT_RADIUS, 0, 2 * Math.PI);
        this.ctx.fill();
    }

    drawCircle(center, radius, strokeColor, fillColor) {
        if (strokeColor) {
            this.ctx.strokeStyle = strokeColor;
        }
        if (fillColor) {
            this.ctx.fillStyle = fillColor;
        }
        this.ctx.beginPath();
        this.ctx.arc(this.offset(center.x), this.offset(center.y), radius * this.scale, 0, 2 * Math.PI);
        if (strokeColor) {
            this.ctx.stroke();
        }
        if (fillColor) {
            this.ctx.fill();
        }
    }

    drawArc(center, radius, angleStart, angleEnd, fillColor) {
        this.ctx.fillStyle = fillColor;
        this.ctx.beginPath();
        this.ctx.arc(this.offset(center.x), this.offset(center.y), radius * this.scale, angleStart, angleEnd, true);
        this.ctx.fill();
    }

    drawFov(center, radius, angleStart, angleEnd, fillColor) {
        this.ctx.fillStyle = fillColor;
        this.ctx.beginPath();
        this.ctx.moveTo(this.offset(center.x), this.offset(center.y));
        this.ctx.lineTo(this.offset(center.x + radius * Math.cos(angleStart)), this.offset(center.y + radius * Math.sin(angleStart)));
        this.ctx.lineTo(this.offset(center.x + radius * Math.cos(angleEnd)), this.offset(center.y + radius * Math.sin(angleEnd)));
        this.ctx.lineTo(this.offset(center.x), this.offset(center.y));
        this.ctx.fill();
    }

    drawArrow(from, to, strokeColor) {
        this.ctx.strokeStyle = strokeColor;
        let headlen = 5;
        let delta = to.sub(from, true);
        let angle = delta.angle();
        this.ctx.beginPath();
        this.ctx.moveTo(this.offset(from.x), this.offset(from.y));
        this.ctx.lineTo(this.offset(to.x), this.offset(to.y));
        this.ctx.lineTo(this.offset(to.x - headlen * Math.cos(angle - Math.PI / 6)), this.offset(to.y - headlen * Math.sin(angle - Math.PI / 6)));
        this.ctx.moveTo(this.offset(to.x), this.offset(to.y));
        this.ctx.lineTo(this.offset(to.x - headlen * Math.cos(angle + Math.PI / 6)), this.offset(to.y - headlen * Math.sin(angle + Math.PI / 6)));
        this.ctx.stroke();
    }
}


class Vector {
    constructor(x, y) {
        this.x = x == undefined ? 0 : x;
        this.y = y == undefined ? 0 : y;
    }

    add(other, makeNew) {
        if (makeNew === true) {
            return new Vector(this.x + other.x, this.y + other.y);
        } else {
            this.x += other.x;
            this.y += other.y;
            return this;
        }
    }

    sub(other, makeNew) {
        if (makeNew === true) {
            return new Vector(this.x - other.x, this.y - other.y);
        } else {
            this.x -= other.x;
            this.y -= other.y;
            return this;
        }
    }

    mult(scalar, makeNew) {
        if (makeNew === true) {
            return new Vector(this.x * scalar, this.y * scalar);
        } else {
            this.x *= scalar;
            this.y *= scalar;
            return this;
        }
    }

    norm2() {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
    }

    normalize(makeNew) {
        let norm = this.norm2();
        if (makeNew) {
            if (norm > 0) {
                return new Vector(this.x / norm, this.y / norm);
            } else {
                return new Vector(this.x, this.y);
            }
        } else {
            if (norm > 0) {
                this.x /= norm;
                this.y /= norm;
            }
            return this;
        }
    }

    dist(other) {
        return this.sub(other, true).norm2();
    }

    angle() {
        return Math.atan2(this.y, this.x);
    }

    dot(other) {
        return new Vector(this.x * other.x, this.y * other.y);
    }
}

class Sheep {
    constructor(controller, id_, position) {
        this.id = id_;
        this.controller = controller;
        this.position = position;
        this.heading = new Vector();
        this.nextHeading = null;
        this.arrived = false;
    }

    getCenterOfMassAttraction() {
        let neighbors = [];
        this.controller.sheeps.forEach(sheep => {
            if (sheep.id != this.id) {
                neighbors.push(sheep);
            }
        });
        neighbors.sort((a, b) => {
            return this.position.dist(a.position) - this.position.dist(b.position);
        });
        let lcm = new Vector();
        let numberOfNeighbors = 0;
        for (let i = 0; i < Math.min(n, neighbors.length); i++) {
            lcm.add(neighbors[i].position);
            numberOfNeighbors++;
        }
        return lcm.mult(1 / numberOfNeighbors).sub(this.position).normalize();
    }

    getNeighborsRepulsion() {
        let repulsion = new Vector();
        this.controller.sheeps.forEach(sheep => {
            if (sheep.id != this.id && this.position.dist(sheep.position) < r_a && !sheep.arrived) {
                repulsion.add(this.position.sub(sheep.position, true).normalize());
            }
        });
        return repulsion.normalize();
    }

    getShepherdRepulsion() {
        if (this.position.dist(this.controller.shepherd.position) < r_s) {
            return this.position.sub(this.controller.shepherd.position, true).normalize();
        } else {
            return new Vector();
        }
    }

    getNoise() {
        return (new Vector(Math.random() - 0.5, Math.random() - 0.5)).normalize();
    }

    computeUpdate() {
        if (this.arrived) return;
        this.nextHeading = new Vector();
        this.nextHeading.add(this.heading.mult(h, true));
        this.nextHeading.add(this.getCenterOfMassAttraction().mult(c));
        this.nextHeading.add(this.getNeighborsRepulsion().mult(rho_a));
        this.nextHeading.add(this.getShepherdRepulsion().mult(rho_s));
        this.nextHeading.add(this.getNoise().mult(e_a));
        this.nextHeading.normalize();
    }

    applyUpdate() {
        if (this.arrived) return;
        this.heading = this.nextHeading;
        this.nextHeading = null;
        let movementAllowed = true;
        if (this.position.dist(this.controller.shepherd.position) > r_s) {
            movementAllowed = Math.random() < p;
        }
        if (movementAllowed) {
            this.position.add(this.heading.mult(delta, true));
        }
        if (this.position.dist(this.controller.shepherd.flockTarget) < 10) {
            this.arrived = true;
        }
    }

}


class Shepherd {
    constructor(controller, position, flockTarget) {
        this.controller = controller;
        this.position = position;
        this.flockTarget = flockTarget;
        this.target = null;
        this.closeToOne = false;
        this._heading = null;
        this.lcm = new Vector();
        this._last_n = null;
    }

    fn(n) {
        if (n == undefined) {
            if (this._last_n == null) {
                return r_a * Math.pow(this.controller.sheeps.length, 2 / 3);
            } else {
                return r_a * Math.pow(this._last_n, 2 / 3);
            }
        }
        this._last_n = n;
        return r_a * Math.pow(n, 2 / 3);
    }

    getNoise() {
        return (new Vector(Math.random() - 0.5, Math.random() - 0.5)).normalize();
    }

    heading() {
        if (this._heading == null) {
            let sheepsCopy = [];
            this.controller.sheeps.forEach(sheep => {
                if (!sheep.arrived) {
                    sheepsCopy.push(sheep);
                }
            });
            sheepsCopy.sort((a, b) => a.position.sub(this.position, true).norm2() - b.position.sub(this.position, true).norm2());
            let lcm = new Vector();
            for (let i = 0; i < Math.min(sheepsCopy.length, n_s); i++) {
                lcm.add(sheepsCopy[i].position);
            }
            lcm.mult(1 / Math.min(sheepsCopy.length, n_s));
            this._heading = lcm.sub(this.position).normalize();
        }
        return this._heading;
    }

    hasWithinVisualRange(sheep) {
        let shepherdHeading = this.heading();
        let sheepDirection = sheep.position.sub(this.position, true).normalize();
        let sheepAngle = Math.acos((sheepDirection.x * shepherdHeading.x + sheepDirection.y * shepherdHeading.y) / Math.sqrt(Math.pow(sheepDirection.x, 2) + Math.pow(sheepDirection.y, 2)) / Math.sqrt(Math.pow(shepherdHeading.x, 2) + Math.pow(shepherdHeading.y, 2)));
        if (sheep.position.sub(this.position, true).norm2() < r_s &&
            sheepAngle < Math.PI - 0.5 * beta &&
            sheepAngle > -Math.PI + 0.5 * beta) {
            return true;
        } else {
            return false;
        }
    }

    computeUpdate() {
        this.closeToOne = false;

        let sheepsWithinVisualRange = [];
        this.controller.sheeps.forEach(sheep => {
            if (!sheep.arrived) {
                if (sheep.position.dist(this.position) < 3 * r_a) {
                    this.closeToOne = true;
                }
                if (this.hasWithinVisualRange(sheep)) {
                    sheepsWithinVisualRange.push(sheep);
                }
            }
        });

        if (sheepsWithinVisualRange.length == 0) {
            this.controller.sheeps.forEach(sheep => {
                if (!sheep.arrived) {
                    sheepsWithinVisualRange.push(sheep);
                }
            });
        }

        sheepsWithinVisualRange.sort((sheepA, sheepB) => sheepA.position.sub(this.position, true).norm2() - sheepB.position.sub(this.position, true).norm2());
        let numberOfNearestAgents = Math.min(N_t, n_s);
        sheepsWithinVisualRange.splice(numberOfNearestAgents, sheepsWithinVisualRange.length - numberOfNearestAgents);

        this.lcm = new Vector();
        sheepsWithinVisualRange.forEach(sheep => {
            this.lcm.add(sheep.position);
        })
        this.lcm.mult(1 / sheepsWithinVisualRange.length);

        let furthestAway = null;
        let furthestAwayDistance = null;
        sheepsWithinVisualRange.forEach(sheep => {
            let distanceToLcm = sheep.position.dist(this.lcm);
            if (furthestAway == null || distanceToLcm > furthestAwayDistance) {
                furthestAway = sheep;
                furthestAwayDistance = distanceToLcm;
            }
        });
        if (furthestAway == null) return;
        if (furthestAwayDistance < this.fn(sheepsWithinVisualRange.length)) {
            // Driving
            let direction = this.lcm.sub(this.flockTarget, true).normalize();
            this.target = this.lcm.add(direction.mult(r_a * Math.sqrt(sheepsWithinVisualRange.length)), true);
        } else {
            // Collecting
            this.target = furthestAway.position.add(furthestAway.position.sub(this.lcm, true).normalize().mult(r_a), true);
        }

    }

    applyUpdate() {
        let direction = this.target.sub(this.position, true).normalize();
        direction.add(this.getNoise().mult(e_s));
        if (this.closeToOne) {
            this.position.add(direction.mult(0.3 * r_a));
        } else {
            this.position.add(direction.mult(delta_s));
        }
        this._heading = null;
    }
}


class Controller {
    constructor(canvas) {
        this.canvas = canvas;
        this.loop = true;
        this.start = null;
        this.previous = null;
        this.sheeps = [];
        this.shepherd = null;
    }

    draw() {
        this.canvas.clear();

        if (display_gcm) {
            let gcm = new Vector();
            this.sheeps.forEach(sheep => {
                gcm.add(sheep.position);
            });
            gcm.mult(1 / this.sheeps.length);
            this.canvas.drawCircle(gcm, 1, null, "#2157a1");
        }

        if (display_shepherd_zone) {
            this.canvas.drawCircle(this.shepherd.position, r_s, "#b8479f", "#b8479f20");
        }

        if (display_lcm) {
            this.canvas.drawCircle(this.shepherd.lcm, this.shepherd.fn(), "#6fd1d0", "#6fd1d020");
            this.canvas.drawCircle(this.shepherd.lcm, 1, null, "#6fd1d0");
        }

        this.sheeps.forEach(sheep => {
            this.canvas.drawCircle(sheep.position, POINT_RADIUS, "#101010", "#10101080");
        });

        this.canvas.drawCircle(this.shepherd.position, POINT_RADIUS, "#b8479f", "#b8479f80");

        this.canvas.drawCircle(this.shepherd.flockTarget, 10, "#65cc65", "#65cc6580");

    }

    update(elapsed) {
        this.sheeps.forEach(sheep => {
            sheep.computeUpdate();
        });
        this.shepherd.computeUpdate();
        this.sheeps.forEach(sheep => {
            sheep.applyUpdate();
        });
        this.shepherd.applyUpdate();


    }

    step(timestamp) {
        if (this.start === null) this.start = timestamp;
        if (this.previous === null) this.previous = timestamp;
        let elapsed = timestamp - this.start;
        let timeSincePreviousFrame = timestamp - this.previous;
        if (timeSincePreviousFrame > 1000 / FPS) {
            this.update(elapsed);
            this.draw();
            this.previous = timestamp;
        }
        if (this.loop) {
            let self = this;
            window.requestAnimationFrame((timestamp) => { self.step(timestamp); });
        }
    }

    animate() {
        this.loop = true;
        let self = this;
        window.requestAnimationFrame((timestamp) => { self.step(timestamp); });
    }
}


function onWindowLoad() {
    startAnimation();
    document.getElementById("btn-play").addEventListener("click", () => {
        if (controller.loop) {
            pauseAnimation();
        } else {
            resumeAnimation();
        }
    });
    document.getElementById("btn-stop").addEventListener("click", () => {
        stopAnimation();
    });
    bindInputs();
}


function onWindowResize() {
    controller.canvas.resize();
}


function startAnimation() {
    let canvas = new Canvas(document.getElementById("canvas"));
    canvas.setup();
    controller = new Controller(canvas);
    for (let i = 0; i < N; i++) {
        controller.sheeps.push(new Sheep(
            controller,
            i,
            new Vector(
                L / 2 + .5 * L * Math.random(),
                .5 * L * Math.random(),
            )
        ));
    }
    controller.shepherd = new Shepherd(
        controller,
        new Vector(
            .5 * L * Math.random(),
            .5 * L * Math.random(),
        ),
        new Vector(0, L)
    );
    N_t = N;
    controller.draw();
    controller.animate();
    document.querySelector("#btn-play i").classList.remove("icon-play");
    document.querySelector("#btn-play i").classList.add("icon-pause");
}

function pauseAnimation() {
    controller.loop = false;
    document.querySelector("#btn-play i").classList.remove("icon-pause");
    document.querySelector("#btn-play i").classList.add("icon-play");
}

function resumeAnimation() {
    controller.animate();
    document.querySelector("#btn-play i").classList.remove("icon-play");
    document.querySelector("#btn-play i").classList.add("icon-pause");
}

function stopAnimation() {
    controller.sheeps = [];
    for (let i = 0; i < N; i++) {
        controller.sheeps.push(new Sheep(
            controller,
            i,
            new Vector(
                L / 2 + .5 * L * Math.random(),
                .5 * L * Math.random(),
            )
        ));
    }
    controller.shepherd = new Shepherd(
        controller,
        new Vector(
            .5 * L * Math.random(),
            .5 * L * Math.random(),
        ),
        new Vector(0, L)
    );
    N_t = N;
    controller.draw();
    controller.loop = false;
    document.querySelector("#btn-play i").classList.add("icon-play");
    document.querySelector("#btn-play i").classList.remove("icon-pause");
}


window.addEventListener("load", onWindowLoad);
window.addEventListener("resize", onWindowResize);