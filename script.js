/* script.js - Lógica de Puertos y MAC */

// --- UTILS ---
function generateMAC() {
    return "00:E0:" + Array.from({length: 4}, () => Math.floor(Math.random()*256).toString(16).padStart(2, '0').toUpperCase()).join(':');
}

// --- CONFIG CANVAS ---
const canvas = document.getElementById('networkCanvas');
const ctx = canvas.getContext('2d');
let canvasBounds;

function resizeCanvas() {
    const container = document.getElementById('workspace');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    canvasBounds = canvas.getBoundingClientRect();
    draw();
}
window.addEventListener('resize', resizeCanvas);
setTimeout(resizeCanvas, 100);

// --- MODELO DE DATOS ---
let devices = [];
let cables = []; // { from: id, to: id, type: string, fromPort: index, toPort: index }
let draggingDevice = null;
let currentDevice = null;
let currentCableType = null;
let cableStartDevice = null;

class Device {
    constructor(id, type, x, y) {
        this.id = id;
        this.type = type;
        this.x = x;
        this.y = y;
        this.cliMode = 'user';
        this.selectedInterfaceIndex = null;
        this.interfaces = []; // Unificamos: Routers, PCs y Switches usan esto.

        // Configuración específica
        if (type === 'pc') {
            this.name = `PC${id}`;
            this.color = '#198754';
            this.unicode = '\uf108'; 
            this.config = { ip: '', mask: '', gateway: '', dns: '' };
            // PC tiene 1 puerto Ethernet (index 0)
            this.interfaces.push({ 
                name: 'FastEthernet0', 
                mac: generateMAC(), 
                ip: '', mask: '', 
                adminStatus: true,  // PC siempre encendida por defecto
                connected: false 
            });
        } 
        else if (type === 'router') {
            this.name = `Router${id}`;
            this.color = '#0d6efd';
            this.unicode = '\uf4e2'; 
            // 2 Gig, 1 Serial
            this.interfaces.push({ name: 'GigabitEthernet0/0', mac: generateMAC(), ip: '', mask: '', adminStatus: false, connected: false });
            this.interfaces.push({ name: 'GigabitEthernet0/1', mac: generateMAC(), ip: '', mask: '', adminStatus: false, connected: false });
            this.interfaces.push({ name: 'Serial0/0/0', mac: '', ip: '', mask: '', adminStatus: false, connected: false });
        } 
        else if (type === 'switch') {
            this.name = `Switch${id}`;
            this.color = '#fd7e14';
            this.unicode = '\uf0e8'; 
            // 24 Puertos
            for(let i=1; i<=24; i++) {
                this.interfaces.push({ 
                    name: `FastEthernet0/${i}`, 
                    mac: generateMAC(), 
                    vlan: 1, 
                    mode: 'access', 
                    adminStatus: true, 
                    connected: false 
                });
            }
        }
    }

    // Helper para buscar puerto libre
    getFirstFreePort() {
        return this.interfaces.findIndex(i => !i.connected);
    }
}

// --- ARRASTRAR Y SOLTAR ---
function dragStart(ev, type) { ev.dataTransfer.setData("type", type); }
function dragOverHandler(ev) { ev.preventDefault(); }
function dropHandler(ev) {
    ev.preventDefault();
    const type = ev.dataTransfer.getData("type");
    if(!type) return;
    const x = ev.clientX - canvasBounds.left;
    const y = ev.clientY - canvasBounds.top;
    devices.push(new Device(devices.length, type, x, y));
    draw();
}

// --- LÓGICA DE CONEXIÓN (MEJORADA) ---

function selectCable(type) {
    if(currentCableType === type) {
        currentCableType = null;
        cableStartDevice = null;
        document.getElementById('workspace').style.cursor = 'default';
        document.getElementById('selected-cable-text').innerText = "Selecciona un cable";
    } else {
        currentCableType = type;
        cableStartDevice = null;
        document.getElementById('workspace').style.cursor = 'crosshair';
        document.getElementById('selected-cable-text').innerText = `Cable ${type.toUpperCase()} seleccionado`;
    }
    updateCableButtons();
}

function updateCableButtons() {
    document.querySelectorAll('.cable-btn').forEach(btn => btn.classList.remove('active'));
    if(currentCableType) {
        // Buscar botón aproximado
        const btn = document.querySelector(`.cable-btn[onclick*="'${currentCableType}'"]`);
        if(btn) btn.classList.add('active');
    }
}

function resolveAutoCable(d1, d2) {
    if(d1.type === 'router' && d2.type === 'router') return 'serial';
    if(d1.type === 'pc' && d2.type === 'pc') return 'cross';
    if(d1.type === 'switch' && d2.type === 'switch') return 'cross';
    if((d1.type === 'pc' && d2.type === 'router') || (d1.type === 'router' && d2.type === 'pc')) return 'cross';
    return 'straight';
}

function connectDevices(d1, d2) {
    // 1. Buscar puertos libres
    const p1Index = d1.getFirstFreePort();
    const p2Index = d2.getFirstFreePort();

    if (p1Index === -1) { alert(`${d1.name} no tiene puertos libres.`); return; }
    if (p2Index === -1) { alert(`${d2.name} no tiene puertos libres.`); return; }

    // 2. Determinar tipo cable
    let type = currentCableType;
    if (type === 'auto') type = resolveAutoCable(d1, d2);

    // 3. Crear conexión física
    cables.push({
        from: d1.id, to: d2.id, 
        fromPort: p1Index, toPort: p2Index, 
        type: type
    });

    // 4. Actualizar estado lógico de los puertos
    d1.interfaces[p1Index].connected = true;
    d2.interfaces[p2Index].connected = true;

    // Reset UI
    cableStartDevice = null;
    currentCableType = null;
    document.getElementById('workspace').style.cursor = 'default';
    document.getElementById('selected-cable-text').innerText = "Conexión Exitosa";
    updateCableButtons();
    draw();
}

// --- DIBUJADO ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Cables
    cables.forEach(c => {
        const d1 = devices.find(d => d.id === c.from);
        const d2 = devices.find(d => d.id === c.to);
        if(!d1 || !d2) return;

        ctx.beginPath();
        ctx.moveTo(d1.x, d1.y);
        ctx.lineTo(d2.x, d2.y);
        ctx.lineWidth = 3;
        ctx.setLineDash([]); 

        // Estilos
        switch(c.type) {
            case 'console': ctx.strokeStyle = '#0dcaf0'; break;
            case 'straight': ctx.strokeStyle = '#212529'; break;
            case 'cross': ctx.strokeStyle = '#212529'; ctx.setLineDash([10, 5]); break;
            case 'fiber': ctx.strokeStyle = '#fd7e14'; break;
            case 'serial': ctx.strokeStyle = '#dc3545'; ctx.lineWidth = 4; break;
            default: ctx.strokeStyle = '#333';
        }
        ctx.stroke();

        // Indicadores de estado (Luces Verde/Roja en el cable)
        // Router: Depende de adminStatus + connected
        // Switch/PC: Generalmente Up si connected
        drawLinkLight(d1, c.fromPort, d1.x, d1.y, d2.x, d2.y);
        drawLinkLight(d2, c.toPort, d2.x, d2.y, d1.x, d1.y);
    });

    // Dispositivos
    devices.forEach(d => {
        ctx.shadowBlur = 15; ctx.shadowColor = "rgba(0,0,0,0.15)";
        ctx.fillStyle = d.color;
        ctx.beginPath(); ctx.arc(d.x, d.y, 28, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = 'white'; ctx.font = '900 20px "Font Awesome 6 Free"';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(d.unicode, d.x, d.y);

        ctx.fillStyle = '#343a40'; ctx.font = 'bold 12px Segoe UI';
        ctx.fillText(d.name, d.x, d.y + 45);

        // Mostrar IP si existe en interfaz 0 (Simplificación visual)
        if(d.interfaces[0] && d.interfaces[0].ip) {
            ctx.fillStyle = '#dc3545'; ctx.font = '11px Consolas';
            ctx.fillText(d.interfaces[0].ip, d.x, d.y - 40);
        }
    });

    if (currentCableType && cableStartDevice && lastMousePos) {
        ctx.beginPath(); ctx.moveTo(cableStartDevice.x, cableStartDevice.y);
        ctx.lineTo(lastMousePos.x, lastMousePos.y);
        ctx.strokeStyle = '#999'; ctx.setLineDash([5, 5]); ctx.stroke();
    }
}

function drawLinkLight(device, portIndex, x1, y1, x2, y2) {
    // Calcular posición un poco alejada del centro hacia el cable
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const dist = 35; // Radio dispositivo + margen
    const lx = x1 + Math.cos(angle) * dist;
    const ly = y1 + Math.sin(angle) * dist;

    const iface = device.interfaces[portIndex];
    // Estado lógico: Si es Switch/PC suele estar UP si conectado. Router requiere no shut.
    let isUp = iface.connected && iface.adminStatus;
    
    ctx.beginPath();
    ctx.arc(lx, ly, 4, 0, Math.PI * 2);
    ctx.fillStyle = isUp ? '#00ff00' : '#ff0000'; // Verde o Rojo
    ctx.fill();
}

// --- INTERACCIÓN ---
let lastMousePos = {x:0, y:0};

canvas.addEventListener('mousedown', e => {
    const x = e.offsetX, y = e.offsetY;
    const clicked = devices.find(d => Math.hypot(d.x - x, d.y - y) < 30);

    if (clicked) {
        if (currentCableType) {
            if (!cableStartDevice) {
                cableStartDevice = clicked;
            } else {
                if(cableStartDevice !== clicked) connectDevices(cableStartDevice, clicked);
            }
        } else {
            draggingDevice = clicked;
        }
    }
    draw();
});

canvas.addEventListener('mousemove', e => {
    lastMousePos = {x: e.offsetX, y: e.offsetY};
    if (draggingDevice) { draggingDevice.x = e.offsetX; draggingDevice.y = e.offsetY; draw(); }
    if (currentCableType && cableStartDevice) draw();
});
canvas.addEventListener('mouseup', () => draggingDevice = null);
canvas.addEventListener('dblclick', e => {
    if(!currentCableType) {
        const clicked = devices.find(d => Math.hypot(d.x - e.offsetX, d.y - e.offsetY) < 30);
        if (clicked) openDeviceModal(clicked);
    }
});

// --- GUI MODAL ---
function openDeviceModal(device) {
    currentDevice = device;
    const modal = document.getElementById('device-modal');
    modal.style.display = 'flex';
    document.getElementById('modal-device-name').innerText = `${device.type.toUpperCase()}: ${device.name}`;

    const container = document.getElementById('config-form-container');
    let html = `
        <div class="config-section">
            <div class="section-title">Global</div>
            <div class="form-group"><label>Hostname:</label><input type="text" id="gui-hostname" value="${device.name}"></div>
        </div>`;

    if (device.type === 'pc') {
        const eth = device.interfaces[0];
        html += `
        <div class="config-section">
            <div class="section-title">Interfaz FastEthernet0</div>
            <div class="form-group"><label>Dirección IP</label><input type="text" id="pc-ip" value="${eth.ip}"></div>
            <div class="form-group"><label>Máscara Subred</label><input type="text" id="pc-mask" value="${eth.mask}"></div>
            <div class="form-group"><label>Default Gateway</label><input type="text" id="pc-gw" value="${device.config.gateway}"></div>
            <div class="form-group"><label>MAC Address</label><input type="text" disabled value="${eth.mac}" style="background:#eee; color:#666;"></div>
        </div>`;
    } 
    else if (device.type === 'router') {
        let rows = '';
        device.interfaces.forEach((iface, idx) => {
            rows += `
            <tr>
                <td>${iface.name}<br><small style="color:#888">${iface.mac || 'N/A'}</small></td>
                <td><input type="text" id="r-ip-${idx}" value="${iface.ip}" placeholder="IP"></td>
                <td><input type="text" id="r-mask-${idx}" value="${iface.mask}" placeholder="Mask"></td>
                <td style="text-align:center"><label class="toggle-switch"><input type="checkbox" id="r-on-${idx}" ${iface.adminStatus ? 'checked' : ''}><span class="slider"></span></label></td>
            </tr>`;
        });
        html += `<div class="config-section"><div class="section-title">Interfaces</div><table class="interface-table"><thead><tr><th>Interfaz</th><th>IP</th><th>Mask</th><th>Link</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    else if (device.type === 'switch') {
        let rows = '';
        // Solo mostrar primeros 6 puertos para no saturar
        for(let i=0; i<6; i++) {
            let p = device.interfaces[i];
            rows += `<tr><td>${p.name}</td><td><select id="sw-vlan-${i}"><option value="1" ${p.vlan==1?'selected':''}>1 (Default)</option><option value="10" ${p.vlan==10?'selected':''}>10</option></select></td><td><select id="sw-mode-${i}"><option value="access" ${p.mode=='access'?'selected':''}>Access</option><option value="trunk" ${p.mode=='trunk'?'selected':''}>Trunk</option></select></td></tr>`;
        }
        html += `<div class="config-section"><div class="section-title">Puertos (1-6)</div><table class="interface-table"><thead><tr><th>Puerto</th><th>VLAN</th><th>Modo</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }

    container.innerHTML = html;
    updatePrompt();
    switchTab('config');
}

function saveCurrentConfig() {
    if(!currentDevice) return;
    const newName = document.getElementById('gui-hostname').value;
    if(newName) currentDevice.name = newName;

    if (currentDevice.type === 'pc') {
        const eth = currentDevice.interfaces[0];
        eth.ip = document.getElementById('pc-ip').value;
        eth.mask = document.getElementById('pc-mask').value;
        currentDevice.config.gateway = document.getElementById('pc-gw').value;
        // PC siempre UP si tiene IP
        eth.adminStatus = true;
    } else if (currentDevice.type === 'router') {
        currentDevice.interfaces.forEach((iface, idx) => {
            iface.ip = document.getElementById(`r-ip-${idx}`).value;
            iface.mask = document.getElementById(`r-mask-${idx}`).value;
            iface.adminStatus = document.getElementById(`r-on-${idx}`).checked;
        });
    } else if (currentDevice.type === 'switch') {
        for(let i=0; i<6; i++) {
            currentDevice.interfaces[i].vlan = document.getElementById(`sw-vlan-${i}`).value;
            currentDevice.interfaces[i].mode = document.getElementById(`sw-mode-${i}`).value;
        }
    }
    draw();
    alert("Configuración aplicada.");
}

function closeModal() { document.getElementById('device-modal').style.display = 'none'; currentDevice = null; }

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tab}`).style.display = 'block';
    document.getElementById(`btn-tab-${tab}`).classList.add('active');
}

// --- CLI LÓGICA ---
function updatePrompt() {
    if(!currentDevice) return;
    const d = currentDevice;
    let s = '>'; let context = '';
    if (d.cliMode === 'privileged') s = '#';
    if (d.cliMode === 'config') { s = '#'; context = '(config)'; }
    if (d.cliMode === 'config-if') { s = '#'; context = '(config-if)'; }
    document.getElementById('prompt').innerText = `${d.name}${context}${s}`;
}

function handleCommand(e) {
    if(e.key !== 'Enter') return;
    const input = e.target;
    const line = input.value.trim();
    const output = document.getElementById('terminal-output');
    output.innerText += `\n${document.getElementById('prompt').innerText} ${line}`;
    input.value = '';

    if(!line) return;
    const parts = line.split(' ');
    const cmd = parts[0].toLowerCase();
    const d = currentDevice;
    let res = '';

    // Lógica Comandos
    if (d.type === 'pc') {
        if (cmd === 'ipconfig') {
            const eth = d.interfaces[0];
            res = `\nPhysical Address. . . : ${eth.mac}\nIPv4 Address. . . . . : ${eth.ip}\nSubnet Mask . . . . . : ${eth.mask}\nDefault Gateway . . . : ${d.config.gateway}`;
        }
        else if (cmd === 'ping') res = `Pinging ${parts[1]} with 32 bytes of data:\nReply from ${parts[1]}: bytes=32 time<1ms TTL=128`;
        else res = 'Bad command.';
    } else {
        if (d.cliMode === 'user') {
            if (cmd === 'enable') d.cliMode = 'privileged';
        } else if (d.cliMode === 'privileged') {
            if (cmd === 'configure' && parts[1] === 'terminal') d.cliMode = 'config';
            else if (cmd === 'show' && parts[1] === 'ip' && parts[2] === 'int') {
                res = '\nInterface              IP-Address      Status      Protocol\n';
                d.interfaces.forEach(i => {
                    const status = i.adminStatus ? 'up' : 'administratively down';
                    const proto = (i.adminStatus && i.connected) ? 'up' : 'down';
                    res += `${i.name.padEnd(22)} ${ (i.ip || 'unassigned').padEnd(15) } ${status.padEnd(11)} ${proto}\n`;
                });
            }
            else if (cmd === 'disable') d.cliMode = 'user';
        } else if (d.cliMode === 'config') {
            if (cmd === 'interface' || cmd === 'int') {
                // Búsqueda inteligente de interfaz
                const searchName = parts[1].toLowerCase();
                const idx = d.interfaces.findIndex(i => i.name.toLowerCase().includes(searchName) || i.name.toLowerCase().replace('gigabitethernet','gi') === searchName);
                if(idx !== -1) { d.selectedInterfaceIndex = idx; d.cliMode = 'config-if'; }
                else res = '% Invalid interface type and number';
            }
            else if (cmd === 'hostname') { d.name = parts[1]; draw(); }
            else if (cmd === 'exit') d.cliMode = 'privileged';
        } else if (d.cliMode === 'config-if') {
             if(cmd === 'ip' && parts[1] === 'address') { 
                 d.interfaces[d.selectedInterfaceIndex].ip = parts[2]; 
                 d.interfaces[d.selectedInterfaceIndex].mask = parts[3];
                 draw(); 
             }
             else if (cmd === 'no' && parts[1] === 'shutdown') {
                 d.interfaces[d.selectedInterfaceIndex].adminStatus = true;
                 res = `%LINK-3-UPDOWN: Interface ${d.interfaces[d.selectedInterfaceIndex].name}, changed state to up`;
                 draw(); // Actualizar luz verde
             }
             else if (cmd === 'shutdown') {
                 d.interfaces[d.selectedInterfaceIndex].adminStatus = false;
                 res = `%LINK-5-CHANGED: Interface ${d.interfaces[d.selectedInterfaceIndex].name}, changed state to administratively down`;
                 draw(); // Actualizar luz roja
             }
             else if (cmd === 'exit') d.cliMode = 'config';
        }
    }
    if(res) output.innerText += `\n${res}`;
    updatePrompt();
    document.getElementById('terminal-view').scrollTop = 99999;
}