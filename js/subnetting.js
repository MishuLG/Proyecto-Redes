/* js/subnetting.js — Calculadora IP integrada */

const Subnetting = {

    init() {
        // Llenar el select de CIDR (de /30 a /8)
        const select = document.getElementById('calc-cidr');
        select.innerHTML = '';
        for (let i = 30; i >= 8; i--) {
            const option = document.createElement('option');
            option.value = i;
            option.text = `/${i} (${this.cidrToMask(i)})`;
            if (i === 24) option.selected = true;
            select.appendChild(option);
        }
    },

    openModal() {
        // Inicializar si el select está vacío
        if (document.getElementById('calc-cidr').options.length === 0) {
            this.init();
        }
        document.getElementById('subnet-modal').style.display = 'flex';
        // Usamos el overlay existente del modal de dispositivos
        if(document.getElementById('modal-overlay')) {
             document.getElementById('modal-overlay').style.display = 'block';
        }
    },

    closeModal() {
        document.getElementById('subnet-modal').style.display = 'none';
        if(document.getElementById('modal-overlay')) {
             document.getElementById('modal-overlay').style.display = 'none';
        }
    },

    // --- LÓGICA MATEMÁTICA ---

    ipToLong(ip) {
        return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
    },

    longToIp(long) {
        return [
            (long >>> 24) & 255,
            (long >>> 16) & 255,
            (long >>> 8) & 255,
            long & 255
        ].join('.');
    },

    cidrToMask(cidr) {
        return this.longToIp(~((1 << (32 - cidr)) - 1));
    },

    calculate() {
        const ipInput = document.getElementById('calc-ip').value.trim();
        const cidr = parseInt(document.getElementById('calc-cidr').value);

        // Usamos tu NetworkUtils existente para validar
        if (typeof NetworkUtils !== 'undefined' && !NetworkUtils.isValidIP(ipInput)) {
            // Si tienes el sistema de alertas, úsalo, si no, alert normal
            if(typeof alertSystem !== 'undefined') alertSystem.error("Dirección IP inválida");
            else alert("Dirección IP inválida");
            return;
        }

        const ipLong = this.ipToLong(ipInput);
        const maskLong = ~((1 << (32 - cidr)) - 1); // Máscara en bits
        
        const networkLong = ipLong & maskLong; // Dirección de Red
        const broadcastLong = networkLong | ~maskLong; // Dirección de Broadcast
        
        const firstHostLong = networkLong + 1;
        const lastHostLong = broadcastLong - 1;
        
        const totalHosts = Math.pow(2, 32 - cidr) - 2;

        const results = {
            network: this.longToIp(networkLong),
            mask: this.cidrToMask(cidr),
            firstHost: this.longToIp(firstHostLong),
            lastHost: this.longToIp(lastHostLong),
            broadcast: this.longToIp(broadcastLong),
            hosts: totalHosts > 0 ? totalHosts : 0
        };

        this.renderResults(results);
    },

    renderResults(data) {
        const tbody = document.getElementById('subnet-table-body');
        document.getElementById('subnet-results-container').style.display = 'block';
        
        tbody.innerHTML = `
            <tr>
                <td><strong>Máscara de Subred</strong></td>
                <td style="color:var(--accent-blue); font-weight:bold;">${data.mask}</td>
                <td class="hint-text">
                    Copia esto en el campo <b>"Mask"</b> de tus PCs y Routers.
                </td>
            </tr>
            <tr>
                <td><strong>Gateway Sugerido</strong><br><small>(Primera IP útil)</small></td>
                <td style="color:var(--accent-green); font-weight:bold;">${data.firstHost}</td>
                <td class="hint-text">
                    Úsalo en la interfaz del <b>Router</b> (ej: Fa0/0) y en el <b>"Default Gateway"</b> de las PCs.
                </td>
            </tr>
            <tr>
                <td><strong>Rango para PCs</strong></td>
                <td>${this.incrementIp(data.firstHost)} - ${data.lastHost}</td>
                <td class="hint-text">
                    Usa cualquier IP de este rango para tus <b>PCs</b> (campo "Dirección IP").
                </td>
            </tr>
            <tr>
                <td><strong>Dirección de Red</strong></td>
                <td style="color:var(--text-muted)">${data.network}</td>
                <td class="hint-text">Identificador de red. No se usa en dispositivos.</td>
            </tr>
            <tr>
                <td><strong>Broadcast</strong></td>
                <td style="color:var(--text-muted)">${data.broadcast}</td>
                <td class="hint-text">Dirección reservada. No se usa en dispositivos.</td>
            </tr>
            <tr>
                <td><strong>Total Hosts</strong></td>
                <td>${data.hosts}</td>
                <td class="hint-text">Dispositivos máximos permitidos.</td>
            </tr>
        `;
    },

    incrementIp(ip) {
        return this.longToIp(this.ipToLong(ip) + 1);
    }
};