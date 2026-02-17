/* history.js — Sistema de Deshacer/Rehacer (Undo/Redo) */

/**
 * Implementa un historial de estados usando el patrón Memento.
 * Cada "push" captura un snapshot completo (dispositivos + cables)
 * serializado como JSON string para aislamiento total de referencias.
 *
 * Uso: llamar History.push() ANTES de cada acción que modifique el estado.
 *
 * Atajos: Ctrl+Z = deshacer, Ctrl+Y = rehacer
 */
const History = {

    undoStack: [],
    redoStack: [],
    MAX_SIZE: 50,

    // ============================
    // CAPTURA Y RESTAURACIÓN
    // ============================

    /**
     * Captura una instantánea completa del estado actual.
     * Se serializa a JSON string para evitar referencias compartidas
     * entre snapshots (deep clone implícito).
     * @returns {string} — Estado serializado
     */
    _snapshot() {
        return JSON.stringify({
            nextDeviceId,
            devices: devices.map(d => ({
                id: d.id,
                type: d.type,
                name: d.name,
                x: d.x,
                y: d.y,
                cliMode: d.cliMode,
                selectedInterfaceIndex: d.selectedInterfaceIndex,
                config: d.config || null,
                interfaces: d.interfaces.map(i => ({ ...i }))
            })),
            cables: cables.map(c => ({ ...c }))
        });
    },

    /**
     * Restaura el estado desde una instantánea.
     * Re-crea instancias de Device para preservar los métodos de clase.
     * @param {string} snapshot — Estado serializado previamente
     */
    _restore(snapshot) {
        const data = JSON.parse(snapshot);
        nextDeviceId = data.nextDeviceId;

        // Limpiar arrays sin perder la referencia
        devices.length = 0;
        cables.length = 0;

        // Re-crear dispositivos como instancias de Device (con métodos)
        data.devices.forEach(d => {
            const device = new Device(d.id, d.type, d.x, d.y);
            device.name = d.name;
            device.cliMode = d.cliMode || 'user';
            device.selectedInterfaceIndex = d.selectedInterfaceIndex || null;
            if (d.config) device.config = { ...d.config };
            device.interfaces = d.interfaces.map(i => ({ ...i }));
            devices.push(device);
        });

        cables.push(...data.cables.map(c => ({ ...c })));
        draw();
    },

    // ============================
    // ACCIONES PÚBLICAS
    // ============================

    /**
     * Guarda el estado actual en la pila de deshacer.
     * Debe llamarse ANTES de cada modificación al estado.
     * Limpia la pila de rehacer (nueva acción invalida el historial futuro).
     */
    push() {
        this.undoStack.push(this._snapshot());
        this.redoStack.length = 0;

        // Limitar tamaño para no consumir memoria excesiva
        if (this.undoStack.length > this.MAX_SIZE) {
            this.undoStack.shift();
        }
    },

    /**
     * Deshace la última acción: restaura el estado anterior.
     */
    undo() {
        if (this.undoStack.length === 0) {
            alertSystem.info('No hay acciones para deshacer.');
            return;
        }
        // Guardar estado actual para poder rehacer
        this.redoStack.push(this._snapshot());
        this._restore(this.undoStack.pop());
    },

    /**
     * Rehace la última acción deshecha.
     */
    redo() {
        if (this.redoStack.length === 0) {
            alertSystem.info('No hay acciones para rehacer.');
            return;
        }
        this.undoStack.push(this._snapshot());
        this._restore(this.redoStack.pop());
    },

    /**
     * Limpia todo el historial (se usa al cargar/importar topología).
     */
    clear() {
        this.undoStack.length = 0;
        this.redoStack.length = 0;
    }
};
