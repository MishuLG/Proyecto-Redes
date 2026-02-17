/* connections.js — Lógica de conexiones y cables */

// FIX #2: selectCable() corregido.
// ANTES: El bloque if(type === 'eraser') estaba FUERA del else,
// por lo que se ejecutaba siempre que type era 'eraser', incluso
// al intentar deseleccionarlo (primer if). Esto causaba que el
// cursor y texto se sobreescribieran de forma incorrecta.
// AHORA: El chequeo de 'eraser' está DENTRO del else, donde corresponde.

function selectCable(type) {
    if (currentCableType === type) {
        // Deseleccionar cable actual
        currentCableType = null;
        cableStartDevice = null;
        document.getElementById('workspace').style.cursor = 'default';
        document.getElementById('selected-cable-text').innerText = "Selecciona un cable";
    } else {
        // Seleccionar nuevo cable
        currentCableType = type;
        cableStartDevice = null;

        if (type === 'eraser') {
            document.getElementById('workspace').style.cursor = 'cell';
            document.getElementById('selected-cable-text').innerText = "Modo Borrador Activo";
        } else {
            document.getElementById('workspace').style.cursor = 'crosshair';
            document.getElementById('selected-cable-text').innerText = `Cable ${type.toUpperCase()} seleccionado`;
        }
    }
    updateCableButtons();
}

function updateCableButtons() {
    document.querySelectorAll('.cable-btn').forEach(btn => btn.classList.remove('active'));
    if (currentCableType) {
        const btn = document.querySelector(`.cable-btn[onclick*="'${currentCableType}'"]`);
        if (btn) btn.classList.add('active');
    }
}

function resolveAutoCable(d1, d2) {
    if (d1.type === 'router' && d2.type === 'router') return 'serial';
    if (d1.type === 'pc' && d2.type === 'pc') return 'cross';
    if (d1.type === 'switch' && d2.type === 'switch') return 'cross';
    if ((d1.type === 'pc' && d2.type === 'router') || (d1.type === 'router' && d2.type === 'pc')) return 'cross';
    return 'straight';
}

function connectDevices(d1, d2) {
    const p1Index = d1.getFirstFreePort();
    const p2Index = d2.getFirstFreePort();

    if (p1Index === -1) {
        alertSystem.error(`${d1.name} no tiene puertos libres.`);
        return;
    }
    if (p2Index === -1) {
        alertSystem.error(`${d2.name} no tiene puertos libres.`);
        return;
    }

    let type = currentCableType;
    if (type === 'auto') type = resolveAutoCable(d1, d2);

    const validation = ConnectionSchema.validate(type, d1.interfaces[p1Index].name, d2.interfaces[p2Index].name);
    if (!validation.isValid) {
        alertSystem.error(validation.message);
        return;
    }

    History.push();
    cables.push({
        from: d1.id, to: d2.id,
        fromPort: p1Index, toPort: p2Index,
        type: type
    });

    d1.interfaces[p1Index].connected = true;
    d2.interfaces[p2Index].connected = true;

    cableStartDevice = null;
    currentCableType = null;
    document.getElementById('workspace').style.cursor = 'default';
    document.getElementById('selected-cable-text').innerText = "Selecciona un cable";
    alertSystem.success(`Conexión exitosa: ${d1.name} ↔ ${d2.name}`);
    updateCableButtons();
    draw();
}

// FIX #3: Nueva función para liberar puertos de dispositivos conectados.
// ANTES: Al borrar un dispositivo, se eliminaban los cables pero los puertos
// del OTRO dispositivo conectado quedaban marcados como connected = true,
// impidiendo crear nuevas conexiones en esos puertos.
// AHORA: Esta función recorre todos los cables del dispositivo a eliminar
// y pone connected = false en los puertos del dispositivo contrario.

function freePortsOfDevice(deviceToDelete) {
    cables.forEach(c => {
        if (c.from === deviceToDelete.id) {
            const otherDevice = devices.find(d => d.id === c.to);
            if (otherDevice) otherDevice.interfaces[c.toPort].connected = false;
        } else if (c.to === deviceToDelete.id) {
            const otherDevice = devices.find(d => d.id === c.from);
            if (otherDevice) otherDevice.interfaces[c.fromPort].connected = false;
        }
    });
}
