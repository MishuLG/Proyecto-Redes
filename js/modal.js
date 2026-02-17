/* modal.js — Lógica del modal de configuración con validación y 24 puertos */

// ============================
// ABRIR MODAL
// ============================

function openDeviceModal(device) {
    currentDevice = device;
    const modal = document.getElementById('device-modal');
    const overlay = document.getElementById('modal-overlay');
    modal.style.display = 'flex';
    overlay.style.display = 'block';
    document.getElementById('modal-device-name').innerText = `${device.type.toUpperCase()}: ${device.name}`;

    const container = document.getElementById('config-form-container');

    // Sección global (común a todos los dispositivos)
    let html = `
        <div class="config-section">
            <div class="section-title">Global</div>
            <div class="form-group">
                <label>Hostname:</label>
                <input type="text" id="gui-hostname" value="${device.name}">
            </div>
        </div>`;

    // ── Formulario específico: PC ──
    if (device.type === 'pc') {
        const eth = device.interfaces[0];
        html += `
        <div class="config-section">
            <div class="section-title">Interfaz FastEthernet0</div>
            <div class="form-group">
                <label>Dirección IP</label>
                <input type="text" id="pc-ip" value="${eth.ip}" placeholder="192.168.1.10">
            </div>
            <div class="form-group">
                <label>Máscara Subred</label>
                <input type="text" id="pc-mask" value="${eth.mask}" placeholder="255.255.255.0">
            </div>
            <div class="form-group">
                <label>Default Gateway</label>
                <input type="text" id="pc-gw" value="${device.config.gateway}" placeholder="192.168.1.1">
            </div>
            <div class="form-group">
                <label>MAC Address</label>
                <input type="text" disabled value="${eth.mac}">
            </div>
        </div>`;
    }
    // ── Formulario específico: Router ──
    else if (device.type === 'router') {
        let rows = '';
        device.interfaces.forEach((iface, idx) => {
            rows += `
            <tr>
                <td>
                    ${iface.name}
                    <br><small style="color:#888">${iface.mac || 'N/A'}</small>
                </td>
                <td><input type="text" id="r-ip-${idx}" value="${iface.ip}" placeholder="IP"></td>
                <td><input type="text" id="r-mask-${idx}" value="${iface.mask}" placeholder="Mask"></td>
                <td style="text-align:center">
                    <label class="toggle-switch">
                        <input type="checkbox" id="r-on-${idx}" ${iface.adminStatus ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </td>
            </tr>`;
        });
        html += `
        <div class="config-section">
            <div class="section-title">Interfaces</div>
            <table class="interface-table">
                <thead>
                    <tr><th>Interfaz</th><th>IP</th><th>Mask</th><th>Link</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
    }
    // ── Formulario específico: Switch (24 puertos completos) ──
    else if (device.type === 'switch') {
        let rows = '';
        for (let i = 0; i < device.interfaces.length; i++) {
            const p = device.interfaces[i];
            const statusDot = p.connected
                ? '<span style="color:#198754">●</span>'
                : '<span style="color:#adb5bd">●</span>';
            rows += `
            <tr>
                <td>${statusDot} ${p.name}</td>
                <td>
                    <input type="number" id="sw-vlan-${i}" value="${p.vlan}"
                           min="1" max="4094" style="width:70px; padding:4px;">
                </td>
                <td>
                    <select id="sw-mode-${i}" style="padding:4px;">
                        <option value="access" ${p.mode === 'access' ? 'selected' : ''}>Access</option>
                        <option value="trunk" ${p.mode === 'trunk' ? 'selected' : ''}>Trunk</option>
                    </select>
                </td>
            </tr>`;
        }
        html += `
        <div class="config-section">
            <div class="section-title">Puertos (1-24)</div>
            <div class="ports-scroll-container">
                <table class="interface-table">
                    <thead>
                        <tr><th>Puerto</th><th>VLAN</th><th>Modo</th></tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
    }

    container.innerHTML = html;
    updatePrompt();
    switchTab('config');
}

// ============================
// GUARDAR CONFIGURACIÓN
// ============================

function saveCurrentConfig() {
    if (!currentDevice) return;
    History.push();

    const newName = document.getElementById('gui-hostname').value;
    if (newName) currentDevice.name = newName;

    // ── Guardar PC (con validación de IP) ──
    if (currentDevice.type === 'pc') {
        const ip = document.getElementById('pc-ip').value.trim();
        const mask = document.getElementById('pc-mask').value.trim();
        const gw = document.getElementById('pc-gw').value.trim();

        // Validar cada campo si tiene contenido
        const ipCheck = NetworkUtils.validateIPField(ip, 'Dirección IP');
        if (!ipCheck.valid) { alertSystem.error(ipCheck.message); return; }

        const maskCheck = NetworkUtils.validateMaskField(mask, 'Máscara');
        if (!maskCheck.valid) { alertSystem.error(maskCheck.message); return; }

        const gwCheck = NetworkUtils.validateIPField(gw, 'Gateway');
        if (!gwCheck.valid) { alertSystem.error(gwCheck.message); return; }

        const eth = currentDevice.interfaces[0];
        eth.ip = ip;
        eth.mask = mask;
        currentDevice.config.gateway = gw;
        eth.adminStatus = true;
    }
    // ── Guardar Router (con validación de IP por interfaz) ──
    else if (currentDevice.type === 'router') {
        // Primero validar TODAS las interfaces antes de aplicar cambios
        for (let idx = 0; idx < currentDevice.interfaces.length; idx++) {
            const ip = document.getElementById(`r-ip-${idx}`).value.trim();
            const mask = document.getElementById(`r-mask-${idx}`).value.trim();
            const ifaceName = currentDevice.interfaces[idx].name;

            const ipCheck = NetworkUtils.validateIPField(ip, `${ifaceName} IP`);
            if (!ipCheck.valid) { alertSystem.error(ipCheck.message); return; }

            const maskCheck = NetworkUtils.validateMaskField(mask, `${ifaceName} Mask`);
            if (!maskCheck.valid) { alertSystem.error(maskCheck.message); return; }
        }

        // Si todas las validaciones pasaron, aplicar cambios
        currentDevice.interfaces.forEach((iface, idx) => {
            iface.ip = document.getElementById(`r-ip-${idx}`).value.trim();
            iface.mask = document.getElementById(`r-mask-${idx}`).value.trim();
            iface.adminStatus = document.getElementById(`r-on-${idx}`).checked;
        });
    }
    // ── Guardar Switch (VLAN 1-4094, todos los puertos) ──
    else if (currentDevice.type === 'switch') {
        for (let i = 0; i < currentDevice.interfaces.length; i++) {
            const vlanEl = document.getElementById(`sw-vlan-${i}`);
            const modeEl = document.getElementById(`sw-mode-${i}`);

            if (vlanEl) {
                const vlan = parseInt(vlanEl.value, 10);
                if (isNaN(vlan) || vlan < 1 || vlan > 4094) {
                    alertSystem.error(`Puerto ${i + 1}: VLAN debe estar entre 1 y 4094.`);
                    return;
                }
                currentDevice.interfaces[i].vlan = vlan;
            }
            if (modeEl) {
                currentDevice.interfaces[i].mode = modeEl.value;
            }
        }
    }

    draw();
    alertSystem.success('Configuración aplicada correctamente.');
}

// ============================
// CONTROL DEL MODAL
// ============================

function closeModal() {
    document.getElementById('device-modal').style.display = 'none';
    document.getElementById('modal-overlay').style.display = 'none';
    currentDevice = null;
}

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tab}`).style.display = 'block';
    document.getElementById(`btn-tab-${tab}`).classList.add('active');
}

// ============================
// ELIMINAR DISPOSITIVO
// ============================

/**
 * Elimina el dispositivo actualmente seleccionado en el modal.
 * Usa freePortsOfDevice() para liberar puertos de dispositivos conectados
 * antes de eliminar cables y el dispositivo.
 */
function deleteCurrentDevice() {
    if (!currentDevice) return;
    History.push();

    freePortsOfDevice(currentDevice);
    cables = cables.filter(c => c.from !== currentDevice.id && c.to !== currentDevice.id);
    devices = devices.filter(d => d.id !== currentDevice.id);

    closeModal();
    draw();
    alertSystem.warning('Dispositivo eliminado.');
}
