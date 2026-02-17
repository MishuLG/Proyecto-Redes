/* device.js — Clase Device y utilidades */

// FIX #1: Contador global para IDs únicos.
// Antes se usaba devices.length, lo cual generaba IDs duplicados
// al borrar un dispositivo y crear otro nuevo.
let nextDeviceId = 0;

function generateMAC() {
    return "00:E0:" + Array.from({ length: 4 }, () =>
        Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()
    ).join(':');
}

class Device {
    constructor(id, type, x, y) {
        this.id = id;
        this.type = type;
        this.x = x;
        this.y = y;
        this.cliMode = 'user';
        this.selectedInterfaceIndex = null;
        this.interfaces = [];

        if (type === 'pc') {
            this.name = `PC${id}`;
            this.color = '#198754';
            this.unicode = '\uf108';
            this.config = { ip: '', mask: '', gateway: '', dns: '' };
            this.interfaces.push({
                name: 'FastEthernet0',
                mac: generateMAC(),
                ip: '', mask: '',
                adminStatus: true,
                connected: false
            });
        }
        else if (type === 'router') {
            this.name = `Router${id}`;
            this.color = '#0d6efd';
            this.unicode = '\uf4e2';
            this.interfaces.push({ name: 'GigabitEthernet0/0', mac: generateMAC(), ip: '', mask: '', adminStatus: false, connected: false });
            this.interfaces.push({ name: 'GigabitEthernet0/1', mac: generateMAC(), ip: '', mask: '', adminStatus: false, connected: false });
            this.interfaces.push({ name: 'Serial0/0/0', mac: '', ip: '', mask: '', adminStatus: false, connected: false });
        }
        else if (type === 'switch') {
            this.name = `Switch${id}`;
            this.color = '#fd7e14';
            this.unicode = '\uf0e8';
            for (let i = 1; i <= 24; i++) {
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

    getFirstFreePort() {
        return this.interfaces.findIndex(i => !i.connected);
    }
}
