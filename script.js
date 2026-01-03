let varForm;
const runButton = document.getElementById("run");
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
}
let rowData = [state.t, state.B, state.ax, state.ay, state.v, state.vx, state.vy, state.x, state.y];
            // 0-time   1-angle  2-acc.x   3-acc.y   4-vel.   5-vel.x   6-vel.y   7-pos.x  8-pos.y
const show = document.getElementById("show");
const observer = new IntersectionObserver((entries)=>{
    loop(varForm);
}, {})
observer.observe(show);

function rad(deg) {
    return deg * (Math.PI/180);
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

function init(varForm) {
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

function loop(varForm) {
    for(let i = 0; i < 20; i++) {
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
    }
}

function main(form) {
    varForm = form;
    if(window.getComputedStyle(table).display == "none") {
        table.classList.toggle("hide");
    }
    init(varForm);
}