/* validation.js — Validación de red y esquema de conexiones */

// ============================
// UTILIDADES DE RED
// ============================

const NetworkUtils = {

    /**
     * Valida que una cadena tenga formato IPv4 correcto.
     * Requiere 4 octetos numéricos entre 0 y 255, sin ceros a la izquierda.
     * @param {string} ip — Dirección IP a validar
     * @returns {boolean}
     */
    isValidIP(ip) {
        if (!ip || typeof ip !== 'string') return false;
        const parts = ip.split('.');
        if (parts.length !== 4) return false;
        return parts.every(part => {
            if (!/^\d{1,3}$/.test(part)) return false;
            const num = parseInt(part, 10);
            return num >= 0 && num <= 255 && part === num.toString();
        });
    },

    /**
     * Valida que una cadena sea una máscara de subred válida.
     * Además de formato IP válido, en binario debe ser 1s contiguos seguidos de 0s.
     * Ejemplo válido: 255.255.255.0 → 11111111.11111111.11111111.00000000
     * Ejemplo inválido: 255.0.255.0 → 11111111.00000000.11111111.00000000
     * @param {string} mask
     * @returns {boolean}
     */
    isValidMask(mask) {
        if (!this.isValidIP(mask)) return false;
        const binary = mask.split('.')
            .map(octet => parseInt(octet, 10).toString(2).padStart(8, '0'))
            .join('');
        return /^1*0*$/.test(binary);
    },

    /**
     * Calcula la dirección de red (AND lógico entre IP y máscara).
     * @param {string} ip
     * @param {string} mask
     * @returns {string|null} — Dirección de red o null si entradas inválidas
     */
    getNetworkAddress(ip, mask) {
        if (!this.isValidIP(ip) || !this.isValidIP(mask)) return null;
        const ipParts = ip.split('.').map(Number);
        const maskParts = mask.split('.').map(Number);
        return ipParts.map((p, i) => p & maskParts[i]).join('.');
    },

    /**
     * Verifica si dos IPs pertenecen a la misma subred.
     * @param {string} ip1
     * @param {string} ip2
     * @param {string} mask — Máscara común para la comparación
     * @returns {boolean}
     */
    sameSubnet(ip1, ip2, mask) {
        const net1 = this.getNetworkAddress(ip1, mask);
        const net2 = this.getNetworkAddress(ip2, mask);
        return net1 !== null && net2 !== null && net1 === net2;
    },

    /**
     * Valida un campo de IP y retorna objeto con resultado y mensaje de error.
     * Campos vacíos se consideran válidos (configuración opcional).
     * @param {string} ip
     * @param {string} fieldName — Nombre del campo para mensajes de error
     * @returns {{ valid: boolean, message: string }}
     */
    validateIPField(ip, fieldName) {
        if (!ip) return { valid: true, message: '' };
        if (!this.isValidIP(ip)) {
            return {
                valid: false,
                message: `${fieldName}: "${ip}" no es una IP válida (ej: 192.168.1.1)`
            };
        }
        return { valid: true, message: '' };
    },

    /**
     * Valida un campo de máscara y retorna objeto con resultado y mensaje de error.
     * @param {string} mask
     * @param {string} fieldName
     * @returns {{ valid: boolean, message: string }}
     */
    validateMaskField(mask, fieldName) {
        if (!mask) return { valid: true, message: '' };
        if (!this.isValidMask(mask)) {
            return {
                valid: false,
                message: `${fieldName}: "${mask}" no es una máscara válida (ej: 255.255.255.0)`
            };
        }
        return { valid: true, message: '' };
    }
};

// ============================
// ESQUEMA DE CONEXIONES
// ============================

const ConnectionSchema = {

    /**
     * Reglas de compatibilidad cable ↔ puerto.
     * Cada regla define qué tipos de puerto acepta cada cable.
     * Si un cable no tiene regla definida, se permite en cualquier puerto.
     */
    rules: {
        serial: {
            allowedPorts: ['serial'],
            errorMessage: '¡Error de Capa 1! Un cable Serial solo entra en puertos Seriales.'
        },
        straight: {
            allowedPorts: ['fastethernet', 'gigabitethernet'],
            errorMessage: '¡Incompatibilidad! El cable directo es para puertos Ethernet.'
        },
        cross: {
            allowedPorts: ['fastethernet', 'gigabitethernet'],
            errorMessage: '¡Incompatibilidad! El cable cruzado es para puertos Ethernet.'
        },
        fiber: {
            allowedPorts: ['gigabitethernet'],
            errorMessage: '¡Incompatibilidad! La fibra óptica solo se conecta a puertos GigabitEthernet.'
        }
        // console: sin regla explícita → se permite en cualquier puerto
        // (en redes reales usa un puerto dedicado, pero este simulador no los modela)
    },

    /**
     * Valida si un tipo de cable es compatible con dos puertos dados.
     * @param {string} cableType — Tipo de cable (serial, straight, cross, fiber, console)
     * @param {string} port1Name — Nombre del puerto origen
     * @param {string} port2Name — Nombre del puerto destino
     * @returns {{ isValid: boolean, message: string }}
     */
    validate(cableType, port1Name, port2Name) {
        const rule = this.rules[cableType];
        if (!rule) return { isValid: true, message: '' };

        const p1 = port1Name.toLowerCase();
        const p2 = port2Name.toLowerCase();

        const isValid = rule.allowedPorts.some(p => p1.includes(p)) &&
            rule.allowedPorts.some(p => p2.includes(p));

        return {
            isValid,
            message: isValid ? '' : rule.errorMessage
        };
    }
};