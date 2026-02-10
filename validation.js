/* validation.js - Esquema de validación de conexiones */

const ConnectionSchema = {
    rules: {
        serial: {
            allowedPorts: ['serial'],
            errorMessage: "¡Error de Capa 1! Un cable Serial solo entra en puertos Seriales."
        },
        straight: {
            allowedPorts: ['fastethernet', 'gigabitethernet'],
            errorMessage: "¡Incompatibilidad! El cable directo es para puertos Ethernet."
        },
        cross: {
            allowedPorts: ['fastethernet', 'gigabitethernet'],
            errorMessage: "¡Incompatibilidad! El cable cruzado es para puertos Ethernet."
        }
    },

    // La función que llamarás desde script.js
    validate: (cableType, port1Name, port2Name) => {
        const rule = ConnectionSchema.rules[cableType];
        if (!rule) return { isValid: true }; // Si no hay regla, pasa

        const p1 = port1Name.toLowerCase();
        const p2 = port2Name.toLowerCase();

        // Verificamos si ambos puertos cumplen la regla
        const isValid = rule.allowedPorts.some(p => p1.includes(p)) &&
            rule.allowedPorts.some(p => p2.includes(p));

        return {
            isValid: isValid,
            message: isValid ? "" : rule.errorMessage
        };
    }
};