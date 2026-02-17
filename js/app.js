/* app.js — Estado global, inicialización y eventos */

// --- ESTADO GLOBAL ---
let devices = [];
let cables = [];
let draggingDevice = null;
let currentDevice = null;
let currentCableType = null;
let cableStartDevice = null;
let lastMousePos = { x: 0, y: 0 };

// --- DRAG & DROP DESDE SIDEBAR ---
function dragStart(ev, type) {
    ev.dataTransfer.setData("type", type);
}

function dragOverHandler(ev) {
    ev.preventDefault();
}

function dropHandler(ev) {
    ev.preventDefault();
    const type = ev.dataTransfer.getData("type");
    if (!type) return;
    const x = ev.clientX - canvasBounds.left;
    const y = ev.clientY - canvasBounds.top;
    History.push();
    devices.push(new Device(nextDeviceId++, type, x, y));
    draw();
}

// --- EVENTOS DEL CANVAS ---
canvas.addEventListener('mousedown', e => {
    const x = e.offsetX, y = e.offsetY;

    // Modo borrador
    if (currentCableType === 'eraser') {
        // Intentar borrar dispositivo
        const deviceIdx = devices.findIndex(d => Math.hypot(d.x - x, d.y - y) < 30);
        if (deviceIdx !== -1) {
            const deviceToDelete = devices[deviceIdx];
            History.push();
            freePortsOfDevice(deviceToDelete);
            cables = cables.filter(c => c.from !== deviceToDelete.id && c.to !== deviceToDelete.id);
            devices.splice(deviceIdx, 1);
            alertSystem.warning("Dispositivo y conexiones eliminados");
            draw();
            return;
        }

        // Intentar borrar cable
        const cableIdx = cables.findIndex(c => {
            const d1 = devices.find(d => d.id === c.from);
            const d2 = devices.find(d => d.id === c.to);
            if (!d1 || !d2) return false;
            return distToSegment({ x, y }, { x: d1.x, y: d1.y }, { x: d2.x, y: d2.y }) < 5;
        });

        if (cableIdx !== -1) {
            History.push();
            const cable = cables[cableIdx];
            const d1 = devices.find(d => d.id === cable.from);
            const d2 = devices.find(d => d.id === cable.to);
            if (d1) d1.interfaces[cable.fromPort].connected = false;
            if (d2) d2.interfaces[cable.toPort].connected = false;
            cables.splice(cableIdx, 1);
            alertSystem.info("Cable eliminado");
            draw();
        }
        return;
    }

    // Lógica normal: conectar o arrastrar
    const clicked = devices.find(d => Math.hypot(d.x - x, d.y - y) < 30);
    if (clicked) {
        if (currentCableType) {
            if (!cableStartDevice) {
                cableStartDevice = clicked;
            } else {
                if (cableStartDevice !== clicked) connectDevices(cableStartDevice, clicked);
            }
        } else {
            History.push();
            draggingDevice = clicked;
        }
    }
    draw();
});

canvas.addEventListener('mousemove', e => {
    lastMousePos = { x: e.offsetX, y: e.offsetY };
    if (draggingDevice) {
        draggingDevice.x = e.offsetX;
        draggingDevice.y = e.offsetY;
        draw();
    }
    if (currentCableType && cableStartDevice) draw();
});

canvas.addEventListener('mouseup', () => draggingDevice = null);

canvas.addEventListener('dblclick', e => {
    if (!currentCableType) {
        const clicked = devices.find(d => Math.hypot(d.x - e.offsetX, d.y - e.offsetY) < 30);
        if (clicked) openDeviceModal(clicked);
    }
});

// --- INICIALIZACIÓN ---
window.addEventListener('resize', resizeCanvas);
setTimeout(resizeCanvas, 100);

// --- ATAJOS DE TECLADO ---
document.addEventListener('keydown', e => {
    // Ctrl+Z = Deshacer
    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        History.undo();
    }
    // Ctrl+Y = Rehacer
    if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        History.redo();
    }
});
