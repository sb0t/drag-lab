const COLORS = {
    c01: getComputedStyle(document.documentElement).getPropertyValue("--col-01").trim(),
    c02: getComputedStyle(document.documentElement).getPropertyValue("--col-02").trim(),
    c03: getComputedStyle(document.documentElement).getPropertyValue("--col-03").trim()
};

let varForm = document.querySelector("form");
const runButton = document.getElementById("run");
const exportButton = document.getElementById("export");

const graphWrap = document.getElementById("graph-wrap");
const floatButton = document.getElementById("float");
const moveButton = document.getElementById("move");

let hasRun = false;
const hiddenHeader = document.getElementById("hidden-header");
const slide = document.getElementById("slide");

const graph = document.getElementById("graph");
const thumb = document.getElementById("thumb");
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
canvas.width = 500;
canvas.height = 400;
let extending = false;
const graphState = {
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
    scale: { x: 1, y: 1 },
    canvOrig: { x: 0, y: 0 },
    mapX: null,
    mapY: null
};
let graphLabels = {
    x: "",
    y: "",
    xu: "",
    yu: ""
};

const table = document.querySelector("table");
const tbody = table.querySelector("tbody");
let state = {
    t: 0,
    B: 0,
    ax: 0,
    ay: 0,
    v: 0,
    vx: 0,
    vy: 0,
    x: 0,
    y: 0
};
let path = [];
let rowData = [state.t, state.B, state.ax, state.ay, state.v, state.vx, state.vy, state.x, state.y];
            // 0-time   1-angle  2-acc.x   3-acc.y   4-vel.   5-vel.x   6-vel.y   7-pos.x  8-pos.y
const show = document.getElementById("show");
let observerActive = false;
const observer = new IntersectionObserver((entries)=>{
    if(!observerActive) return;

    extending = true;
    loop(20);
    extending = false;

    if(path.length >= 2) {
        setGraphUI(true);
        drawGraph();
    }
}, {});
observer.observe(show);

function rad(deg) {
    return deg * (Math.PI/180);
}

let iPos = 1, dropVis = "false";
function toggleMenu() {
    document.getElementById("graph-items").classList.toggle("hide");
    dropVis ? dropVis = false : dropVis = true;
}
function switchPos(pos, snap) {
    switch(pos) {
        case 1:
            if(!snap) {
                graph.classList.toggle("xPos");
            }
            iPos++;
            break;
        case 2:
            if(!snap) {
                graph.classList.toggle("yPos");
            } else {
                graph.classList.toggle("xPos");
            }
            iPos++;
            break;
        case 3:
            graph.classList.toggle("xPos");
            if(snap) {
                graph.classList.toggle("yPos");
            }
            iPos++;
            break;
        case 4:
            graph.classList.toggle("yPos");
            iPos = 1;
            break;
        default:
            console.log("Unknown case");
    }
}
window.onclick = function(event) {
    if(event.target.id !== "menu") {
        if(event.target.id !== "float" && event.target.id !== "move" && window.getComputedStyle(graph).getPropertyValue("position") == "fixed") {
            switchPos(iPos, true);
            graph.classList.toggle("floating");
            iPos = 1;
        }
        if(dropVis) toggleMenu();
    }
}
floatButton.addEventListener("click", () => {
    if(window.getComputedStyle(graph).getPropertyValue("position") == "fixed") {
        switchPos(iPos, true);
        iPos = 1;
    }
    graph.classList.toggle("floating");
    toggleMenu(); // auto-keep-open
    dropVis = true;
});
moveButton.addEventListener("click", () => {
    if(window.getComputedStyle(graph).getPropertyValue("position") == "fixed") {
        switchPos(iPos, false);
        toggleMenu(); // auto-keep-open
    }
});

function setGraphUI(showGraph) {
    if (showGraph) {
        thumb.classList.add("hide");
        graphWrap.classList.remove("hide");
        document.getElementById("graph-items").classList.add("hide");
        canvas.classList.remove("hide");
        hiddenHeader.classList.remove("hide");
    } else {
        canvas.classList.add("hide");
        graphWrap.classList.add("hide");
        document.getElementById("graph-items").classList.remove("hide");
        thumb.classList.remove("hide");
        hiddenHeader.classList.add("hide");
    }
}

function build() {
    rowData = [state.t, state.B, state.ax, state.ay, state.v, state.vx, state.vy, state.x, state.y];
    const tr = document.createElement("tr");
    for(let j = 0; j < rowData.length; j++) {
        const td = document.createElement("td");
        let str = rowData[j].toString();
        if(str.length > 14) {
            str = str.slice(0, 14) + "...";
        }
        td.textContent = str;
        tr.appendChild(td);
    }
    tbody.insertBefore(tr, show);
}

function init() {
    state.t = 0;
    state.B = rad(varForm.B.value);
    state.v = parseFloat(varForm.v0.value);
    state.ax = (-Math.cos(state.B)*varForm.p.value*Math.pow(state.v, 2)*varForm.u.value*varForm.A.value/(2*varForm.m.value));
    state.ay = (-Math.sin(state.B)*varForm.p.value*Math.pow(state.v, 2)*varForm.u.value*varForm.A.value/(2*varForm.m.value))-9.807;
    state.vx = Math.sin(state.B)*state.v;
    state.vy = Math.cos(state.B)*state.v;
    state.x = 0;
    state.y = 0;
    build();
}

function drawGraph() {
    if (path.length < 2) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Coords
    const minX = Math.min(...path.map(p => p.x));
    graphState.minX = minX;
    const maxX = Math.max(...path.map(p => p.x));
    graphState.maxX = maxX;
    const minY = Math.min(...path.map(p => p.y));
    graphState.minY = minY;
    const maxY = Math.max(...path.map(p => p.y));
    graphState.maxY = maxY;

    // Padding
    const pad = 40;

    // Size
    const xRange = maxX - minX || 1;
    const yRange = maxY - minY || 1;
    const scale = {
        x: (canvas.width - 2*pad) / xRange,
        y: (canvas.height - 2*pad) / yRange
    };
    graphState.scale = scale;

    // Canvas Origin
    const canvOrig = {
        x: pad,
        y: canvas.height - pad
    };
    graphState.canvOrig = canvOrig;
    // Physics Origin is just 'path[0]'

    // Mapping
    function mapX(x) {
        return canvOrig.x + (x - minX) * scale.x;
    }
    graphState.mapX = mapX;
    function mapY(y) {
        return canvOrig.y - (y - minY) * scale.y;
    }
    graphState.mapY = mapY;

    // Grid
    const xStep = xRange / 10;
    const yStep = yRange / 10;
    // Horizontal Lines
    for (let y = minY; y <= maxY; y += yStep) {
        // if(mapY(y) > canvas.height) continue;
        ctx.beginPath();
        ctx.moveTo(mapX(minX), mapY(y));
        ctx.lineTo(mapX(maxX), mapY(y));
        ctx.strokeStyle = COLORS.c03;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    // Vertical Lines
    for (let x = minX; x <= maxX; x += xStep) {
        // if(mapX(x) > canvas.width) continue;
        ctx.beginPath();
        ctx.moveTo(mapX(x), mapY(minY));
        ctx.lineTo(mapX(x), mapY(maxY));
        ctx.strokeStyle = COLORS.c03;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // X Axis
    let yAxisZero = Math.max(minY, 0);
    ctx.beginPath();
    ctx.moveTo(mapX(minX), mapY(yAxisZero));
    ctx.lineTo(mapX(maxX), mapY(yAxisZero));
    ctx.strokeStyle = COLORS.c01;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Y Axis
    let xAxisZero = Math.max(minX, 0);
    ctx.beginPath();
    ctx.moveTo(mapX(xAxisZero), mapY(minY));
    ctx.lineTo(mapX(xAxisZero), mapY(maxY));
    ctx.strokeStyle = COLORS.c01;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Horizontal Label
    ctx.font = "16px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = COLORS.c01;
    ctx.fillText(graphLabels.x+" ", canvas.width/2, canvas.height - pad/2);
    ctx.font = "italic 16px monospace";
    ctx.fillText(graphLabels.xu, canvas.width/2 + 40, canvas.height - pad/2);

    // Vertical Label
    ctx.save();
    ctx.translate(pad/2, canvas.height/2);
    ctx.rotate(-rad(90));
    ctx.font = "16px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(graphLabels.y+" ", 0, -4);
    ctx.font = "italic 16px monospace";
    ctx.fillText(graphLabels.yu, (graphLabels.y.length+6)*5, -4);
    ctx.restore();

    // Trajectory
    ctx.beginPath();
    ctx.moveTo(mapX(path[0].x), mapY(path[0].y));
    for(let i = 1; i < path.length; i++) {
        ctx.lineTo(mapX(path[i].x), mapY(path[i].y));
    }
    ctx.strokeStyle = COLORS.c01;
    ctx.lineWidth = 3;
    ctx.stroke();
}

function toCoordStr(coord, decRound) {
    return +coord.toFixed(decRound).toString();
}

canvas.addEventListener("mousemove", function(info) {
    const mouseX = info.offsetX;
    const mouseY = info.offsetY;

    const margin = 30;
    const left = graphState.mapX(graphState.minX);
    const right = graphState.mapX(graphState.maxX);
    const top = graphState.mapY(graphState.maxY);
    const bottom = graphState.mapY(graphState.minY);

    if(mouseX < left - margin || mouseX > right + margin || mouseY < top - margin || mouseY > bottom + margin) { return; }
    const anchorX = Math.min(Math.max(mouseX, left), right);

    let pathX = graphState.minX + (anchorX - graphState.canvOrig.x) / graphState.scale.x;
    let min_d = Infinity, pathY, idx;
    for(let i = 0; i < path.length; i++) {
        const d = Math.abs(path[i].x - pathX)
        if(d < min_d) {
            min_d = d;
            pathY = path[i].y;
            idx = i;
        }
    }
    if(pathY === undefined) return;

    const pixelY = graphState.mapY(pathY);

    drawGraph();
    if(pixelY > graphState.mapY(Math.max(graphState.minY, 0))) {
        // Over yAxisZero
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(anchorX, pixelY);
        ctx.lineTo(anchorX, graphState.mapY(Math.max(graphState.minY, 0)));
        ctx.strokeStyle = COLORS.c01;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 15]);
        ctx.stroke();
        ctx.restore();
    } else {
        // Under
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(anchorX, graphState.mapY(Math.max(graphState.minY, 0)));
        ctx.lineTo(anchorX, pixelY);
        ctx.strokeStyle = COLORS.c01;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 15]);
        ctx.stroke();
        ctx.restore();
    }
    // Circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(anchorX, pixelY, 8, 0, Math.PI*2);
    ctx.lineWidth = 2;
    ctx.fillStyle = COLORS.c02;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // Text
    ctx.save();
    ctx.beginPath();
    ctx.font = "14px monospace";
    const txt = `(${toCoordStr(path[idx].x, 4)}, ${toCoordStr(path[idx].y, 4)})`;
    const txtWidth = ctx.measureText(txt).width;
    const txtHeight = 14 * 1.286;
    ctx.fillStyle = COLORS.c02;
    ctx.fillRect(anchorX-62, pixelY-33, txtWidth, txtHeight);
    ctx.fillStyle = COLORS.c01;
    ctx.textBaseline = "top";
    ctx.fillText(txt, anchorX, pixelY-30);
    ctx.restore();
});

function loop(rounds) {
    for(let i = 0; i < rounds; i++) {
        state.t += parseFloat(varForm.dt.value);
        state.x = state.x+state.vx*varForm.dt.value+state.ax*Math.pow(varForm.dt.value, 2)/2;
        state.y = state.y+state.vy*varForm.dt.value+state.ay*Math.pow(varForm.dt.value, 2)/2;;
        state.B = Math.atan(state.y/state.x);
        state.vx = state.vx+state.ax*varForm.dt.value;
        state.vy = state.vy+state.ay*varForm.dt.value;
        state.v = Math.sqrt(Math.pow(state.vx, 2)+Math.pow(state.vy, 2));
        state.ax = (-Math.cos(state.B)*varForm.p.value*Math.pow(state.v, 2)*varForm.u.value*varForm.A.value/(2*varForm.m.value));
        state.ay = (-Math.sin(state.B)*varForm.p.value*Math.pow(state.v, 2)*varForm.u.value*varForm.A.value/(2*varForm.m.value))-9.807;
        build();
        switch(varForm.gs.value) {
            case "xy":
                path.push({
                    x: state.x,
                    y: state.y
                });
                graphLabels = {
                    x: "X",
                    y: "Y",
                    xu: "(m)",
                    yu: "(m)"
                };
                break;
            case "pt":
                path.push({
                    x: state.t,
                    y: Math.sqrt(Math.pow(state.x, 2)+Math.pow(state.y, 2))
                });
                graphLabels = {
                    x: "Time",
                    y: "Position",
                    xu: "(s)",
                    yu: "(m)"
                };
                break;
            case "vt":
                path.push({
                    x: state.t,
                    y: state.v
                });
                graphLabels = {
                    x: "Time",
                    y: "Velocity",
                    xu: "(s)",
                    yu: "(m/s)"
                };
                break;
            case "at":
                path.push({
                    x: state.t,
                    y: Math.sqrt(Math.pow(state.ax, 2)+Math.pow(state.ay, 2))
                });
                graphLabels = {
                    x: "Time",
                    y: "Acceleration",
                    xu: "(s)",
                    yu: "(m/s²)"
                };
                break;
            default:
                console.log("ERROR: nonexistent option");
        }
    }
}

function reset() {
    while(tbody.firstChild && tbody.firstChild !== show) {
        tbody.removeChild(tbody.firstChild);
    }
    state = {
        t: 0,
        B: 0,
        ax: 0,
        ay: 0,
        v: 0,
        vx: 0,
        vy: 0,
        x: 0,
        y: 0
    };
    rowData = [];
    path = [];
    ctx.reset();
}

function toCSV() {
    let rows = document.querySelectorAll('table tr');
    let csv = [];
    for (let i = 0; i < rows.length; i++) {
        let row = [], cols = rows[i].querySelectorAll('td, th');
        for (let j = 0; j < cols.length; j++) {
            // Clean innertext to remove multiple spaces and jumpline (break csv)
            let data = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, '').replace(/(\s\s)/gm, ' ')
            // Escape double-quote with double-double-quote
            data = data.replace(/"/g, '""');
            row.push('"' + data + '"');
        }
        csv.push(row.join(','));
    }
    let csv_string = csv.join('\n');
    // Download
    let filename = 'export_table_' + new Date().toLocaleDateString() + '.csv';
    let link = document.createElement('a');
    link.style.display = 'none';
    link.setAttribute('target', '_blank');
    link.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv_string));
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

varForm.addEventListener("input", live);
varForm.addEventListener("change", live); // select dropdown
function live() {
    if(!hasRun) return;
    if(extending) return;

    const graphVisible = !canvas.classList.contains("hide");

    reset();
    init();

    const rows = parseInt(varForm.pg.value) || 0;
    loop(rows);

    table.classList.remove("hide");

    if (graphVisible && path.length >= 2) {
        drawGraph();
    }
}

function main() {
    if(hasRun) {
        observerActive = false;
        reset();
        runButton.value = "run";
        setGraphUI(false);
        hasRun = false;
    } else {
        init();
        runButton.value = "reset";
        loop(varForm.pg.value);
        observerActive = true;
        if(path.length >= 2) {
            setGraphUI(true);
            drawGraph();
        } else {
            setGraphUI(false);
        }
        hasRun = true;
    }
    table.classList.toggle("hide");
    graph.classList.toggle("hide");
}