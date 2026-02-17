/* cli.js — Lógica de la terminal CLI (IOS) con ping funcional */

// ============================
// PROMPT
// ============================

function updatePrompt() {
    if (!currentDevice) return;
    const d = currentDevice;
    let suffix = '>';
    let context = '';
    if (d.cliMode === 'privileged') suffix = '#';
    if (d.cliMode === 'config') { suffix = '#'; context = '(config)'; }
    if (d.cliMode === 'config-if') { suffix = '#'; context = '(config-if)'; }
    document.getElementById('prompt').innerText = `${d.name}${context}${suffix}`;
}

// ============================
// PING FUNCIONAL (BFS)
// ============================

/**
 * Busca un camino entre dos dispositivos usando BFS (Breadth-First Search).
 * Solo atraviesa enlaces donde AMBOS puertos están activos (adminStatus + connected).
 * Esto simula el comportamiento real de Capa 1/2: si un puerto está shutdown
 * o desconectado, el paquete no puede pasar por ahí.
 *
 * @param {number} sourceId — ID del dispositivo origen
 * @param {number} targetId — ID del dispositivo destino
 * @returns {boolean} — true si existe un camino funcional
 */
function findPath(sourceId, targetId) {
    if (sourceId === targetId) return true;

    const visited = new Set([sourceId]);
    const queue = [sourceId];

    while (queue.length > 0) {
        const currentId = queue.shift();

        for (const cable of cables) {
            let neighborId = null;
            let localPortIdx = null;
            let remotePortIdx = null;

            // Determinar dirección del cable
            if (cable.from === currentId) {
                neighborId = cable.to;
                localPortIdx = cable.fromPort;
                remotePortIdx = cable.toPort;
            } else if (cable.to === currentId) {
                neighborId = cable.from;
                localPortIdx = cable.toPort;
                remotePortIdx = cable.fromPort;
            }

            if (neighborId === null || visited.has(neighborId)) continue;

            const localDevice = devices.find(d => d.id === currentId);
            const remoteDevice = devices.find(d => d.id === neighborId);
            if (!localDevice || !remoteDevice) continue;

            const localPort = localDevice.interfaces[localPortIdx];
            const remotePort = remoteDevice.interfaces[remotePortIdx];

            // Ambos puertos deben estar UP para que el tráfico fluya
            if (localPort.adminStatus && localPort.connected &&
                remotePort.adminStatus && remotePort.connected) {
                if (neighborId === targetId) return true;
                visited.add(neighborId);
                queue.push(neighborId);
            }
        }
    }

    return false;
}

/**
 * Ejecuta un ping funcional verificando conectividad REAL en la topología.
 * Comprueba: IP destino existe → origen tiene IP → BFS para encontrar camino →
 * interfaz destino está UP → genera respuesta con estadísticas.
 *
 * @param {Device} sourceDevice — Dispositivo que ejecuta el ping
 * @param {string} targetIP — Dirección IP destino
 * @returns {string} — Salida formateada tipo Cisco IOS / Windows
 */
function executePing(sourceDevice, targetIP) {
    // 1. Validar formato de IP destino
    if (!NetworkUtils.isValidIP(targetIP)) {
        return `% Invalid IP address: ${targetIP}`;
    }

    // 2. Verificar que el origen tenga al menos una IP configurada
    const sourceHasIP = sourceDevice.interfaces.some(i => i.ip);
    if (!sourceHasIP) {
        return '% Source has no IP configured.\n% Ping requires at least one active interface with IP.';
    }

    // 3. Buscar dispositivo que tenga la IP destino
    let targetDevice = null;
    let targetInterface = null;
    for (const dev of devices) {
        const iface = dev.interfaces.find(i => i.ip === targetIP);
        if (iface) {
            targetDevice = dev;
            targetInterface = iface;
            break;
        }
    }

    let output = `\nPinging ${targetIP} with 32 bytes of data:\n`;

    // 4. IP no encontrada en ningún dispositivo
    if (!targetDevice) {
        output += 'Request timed out.\nRequest timed out.\nRequest timed out.\nRequest timed out.\n';
        output += `\nPing statistics for ${targetIP}:\n`;
        output += '    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss)';
        return output;
    }

    // 5. Ping a sí mismo (loopback)
    if (sourceDevice.id === targetDevice.id) {
        for (let i = 0; i < 4; i++) {
            output += `Reply from ${targetIP}: bytes=32 time<1ms TTL=128\n`;
        }
        output += `\nPing statistics for ${targetIP}:\n`;
        output += '    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)';
        return output;
    }

    // 6. Verificar camino con BFS
    const pathExists = findPath(sourceDevice.id, targetDevice.id);

    if (pathExists && targetInterface.adminStatus) {
        // Camino encontrado y destino activo → éxito
        const times = [1, 2, 1, 3];
        times.forEach(t => {
            output += `Reply from ${targetIP}: bytes=32 time=${t}ms TTL=128\n`;
        });
        output += `\nPing statistics for ${targetIP}:\n`;
        output += '    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)\n';
        output += 'Approximate round trip times in milli-seconds:\n';
        output += '    Minimum = 1ms, Maximum = 3ms, Average = 1ms';
    } else {
        // Sin camino o destino apagado
        output += 'Destination host unreachable.\nDestination host unreachable.\nDestination host unreachable.\nDestination host unreachable.\n';
        output += `\nPing statistics for ${targetIP}:\n`;
        output += '    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss)';
    }

    return output;
}

// ============================
// MANEJADOR DE COMANDOS
// ============================

function handleCommand(e) {
    if (e.key !== 'Enter') return;
    const input = e.target;
    const line = input.value.trim();
    const output = document.getElementById('terminal-output');
    output.innerText += `\n${document.getElementById('prompt').innerText} ${line}`;
    input.value = '';

    if (!line) return;
    const parts = line.split(' ');
    const cmd = parts[0].toLowerCase();
    const d = currentDevice;
    let res = '';

    // ── COMANDOS PC (tipo Windows) ──
    if (d.type === 'pc') {
        if (cmd === 'ipconfig') {
            const eth = d.interfaces[0];
            res = `\nEthernet adapter FastEthernet0:\n`;
            res += `\n   Physical Address. . . : ${eth.mac}`;
            res += `\n   IPv4 Address. . . . . : ${eth.ip || '(not configured)'}`;
            res += `\n   Subnet Mask . . . . . : ${eth.mask || '(not configured)'}`;
            res += `\n   Default Gateway . . . : ${d.config.gateway || '(not configured)'}`;
        }
        else if (cmd === 'ping') {
            if (!parts[1]) {
                res = '\n% Usage: ping <IP address>';
            } else {
                res = executePing(d, parts[1]);
            }
        }
        else if (cmd === 'help' || cmd === '?') {
            res = '\nAvailable commands:';
            res += '\n  ipconfig    — Show network configuration';
            res += '\n  ping <IP>   — Test connectivity to a host';
            res += '\n  help        — Show this help';
        }
        else {
            res = `\n'${cmd}' is not recognized as a command.\nType 'help' for available commands.`;
        }
    }
    // ── COMANDOS ROUTER/SWITCH (Cisco IOS) ──
    else {
        if (d.cliMode === 'user') {
            if (cmd === 'enable') {
                d.cliMode = 'privileged';
            }
            else if (cmd === '?') {
                res = '\nAvailable commands:';
                res += '\n  enable  — Enter privileged EXEC mode';
            }
            else {
                res = `\n% Unknown command "${cmd}". Type ? for help.`;
            }
        }
        else if (d.cliMode === 'privileged') {
            if (cmd === 'configure' && parts[1] === 'terminal') {
                d.cliMode = 'config';
            }
            else if (cmd === 'ping') {
                if (!parts[1]) {
                    res = '\n% Usage: ping <IP address>';
                } else {
                    res = executePing(d, parts[1]);
                }
            }
            else if (cmd === 'show') {
                const subCmd = parts[1];
                if (subCmd === 'ip' && (parts[2] === 'int' || parts[2] === 'interface' || parts[2] === 'brief')) {
                    res = '\nInterface              IP-Address      Status               Protocol';
                    res += '\n' + '-'.repeat(72);
                    d.interfaces.forEach(i => {
                        const status = i.adminStatus ? 'up' : 'admin down';
                        const proto = (i.adminStatus && i.connected) ? 'up' : 'down';
                        res += `\n${i.name.padEnd(22)} ${(i.ip || 'unassigned').padEnd(15)} ${status.padEnd(20)} ${proto}`;
                    });
                }
                else if (subCmd === 'running-config' || subCmd === 'run') {
                    res = `\n!\n! Running configuration - ${d.name}\n!\nhostname ${d.name}\n!`;
                    d.interfaces.forEach(i => {
                        res += `\ninterface ${i.name}`;
                        if (i.ip) res += `\n ip address ${i.ip} ${i.mask}`;
                        res += i.adminStatus ? '\n no shutdown' : '\n shutdown';
                        res += '\n!';
                    });
                }
                else if (subCmd === 'mac-address-table' && d.type === 'switch') {
                    res = '\n          Mac Address Table';
                    res += '\n-------------------------------------------';
                    res += '\nVlan    Mac Address       Type        Ports';
                    res += '\n----    -----------       --------    -----';
                    d.interfaces.forEach((i, idx) => {
                        if (i.connected && i.mac) {
                            res += `\n${String(i.vlan || 1).padEnd(7)} ${i.mac}    DYNAMIC     ${i.name}`;
                        }
                    });
                }
                else {
                    res = '\n% Invalid show command.';
                    res += '\n  show ip int          — Interface status';
                    res += '\n  show running-config  — Running configuration';
                    if (d.type === 'switch') res += '\n  show mac-address-table — MAC table';
                }
            }
            else if (cmd === 'disable') {
                d.cliMode = 'user';
            }
            else if (cmd === '?') {
                res = '\nAvailable commands:';
                res += '\n  configure terminal   — Enter config mode';
                res += '\n  show ip int          — Show interface status';
                res += '\n  show running-config  — Show running configuration';
                if (d.type === 'switch') res += '\n  show mac-address-table — Show MAC table';
                res += '\n  ping <IP>            — Test connectivity';
                res += '\n  disable              — Return to user mode';
            }
            else {
                res = `\n% Unknown command "${cmd}". Type ? for help.`;
            }
        }
        else if (d.cliMode === 'config') {
            if (cmd === 'interface' || cmd === 'int') {
                if (!parts[1]) {
                    res = '\n% Incomplete command. Specify interface name.';
                } else {
                    const searchName = parts[1].toLowerCase();
                    const idx = d.interfaces.findIndex(i =>
                        i.name.toLowerCase().includes(searchName) ||
                        i.name.toLowerCase().replace('gigabitethernet', 'gi') === searchName ||
                        i.name.toLowerCase().replace('fastethernet', 'fa') === searchName ||
                        i.name.toLowerCase().replace('serial', 'se') === searchName
                    );
                    if (idx !== -1) {
                        d.selectedInterfaceIndex = idx;
                        d.cliMode = 'config-if';
                    }
                    else res = '\n% Invalid interface type and number';
                }
            }
            else if (cmd === 'hostname') {
                if (!parts[1]) {
                    res = '\n% Incomplete command. Usage: hostname <name>';
                } else {
                    History.push();
                    d.name = parts[1];
                    draw();
                }
            }
            else if (cmd === 'exit') {
                d.cliMode = 'privileged';
            }
            else if (cmd === '?') {
                res = '\nAvailable commands:';
                res += '\n  interface <name>   — Enter interface configuration';
                res += '\n  hostname <name>    — Set device hostname';
                res += '\n  exit               — Return to privileged mode';
            }
            else {
                res = `\n% Unknown command "${cmd}". Type ? for help.`;
            }
        }
        else if (d.cliMode === 'config-if') {
            const selectedIface = d.interfaces[d.selectedInterfaceIndex];

            if (cmd === 'ip' && parts[1] === 'address') {
                if (!parts[2] || !parts[3]) {
                    res = '\n% Incomplete command. Usage: ip address <IP> <MASK>';
                } else {
                    const ipCheck = NetworkUtils.validateIPField(parts[2], 'IP');
                    const maskCheck = NetworkUtils.validateMaskField(parts[3], 'Mask');
                    if (!ipCheck.valid) {
                        res = `\n% ${ipCheck.message}`;
                    } else if (!maskCheck.valid) {
                        res = `\n% ${maskCheck.message}`;
                    } else {
                        History.push();
                        selectedIface.ip = parts[2];
                        selectedIface.mask = parts[3];
                        draw();
                    }
                }
            }
            else if (cmd === 'no' && parts[1] === 'shutdown') {
                History.push();
                selectedIface.adminStatus = true;
                res = `\n%LINK-3-UPDOWN: Interface ${selectedIface.name}, changed state to up`;
                draw();
            }
            else if (cmd === 'shutdown') {
                History.push();
                selectedIface.adminStatus = false;
                res = `\n%LINK-5-CHANGED: Interface ${selectedIface.name}, changed state to administratively down`;
                draw();
            }
            else if (cmd === 'exit') {
                d.cliMode = 'config';
            }
            else if (cmd === '?') {
                res = '\nAvailable commands:';
                res += '\n  ip address <IP> <MASK>  — Set IP address';
                res += '\n  no shutdown             — Enable interface';
                res += '\n  shutdown                — Disable interface';
                res += '\n  exit                    — Return to config mode';
            }
            else {
                res = `\n% Unknown command "${cmd}". Type ? for help.`;
            }
        }
    }

    if (res) output.innerText += res;
    updatePrompt();
    document.getElementById('terminal-view').scrollTop = 99999;
}
