/* persistence.js — Guardado, carga, exportación e importación de topologías */

const Persistence = {

    STORAGE_KEY: 'netsim-pro-topology',
    VERSION: 1,

    // ============================
    // SERIALIZACIÓN
    // ============================

    /**
     * Convierte el estado actual (devices + cables) en un objeto JSON-compatible.
     * No incluye métodos de clase, solo datos puros.
     */
    serialize() {
        return {
            version: this.VERSION,
            timestamp: new Date().toISOString(),
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
                interfaces: d.interfaces.map(iface => ({ ...iface }))
            })),
            cables: cables.map(c => ({ ...c }))
        };
    },

    /**
     * Restaura una topología desde un objeto previamente serializado.
     * Re-crea instancias de Device para mantener los métodos de clase.
     * @param {Object} data — Datos serializados
     * @returns {boolean} — true si la deserialización fue exitosa
     */
    deserialize(data) {
        if (!data || data.version !== this.VERSION) return false;

        // Limpiar estado actual sin perder la referencia del array
        devices.length = 0;
        cables.length = 0;

        nextDeviceId = data.nextDeviceId || 0;

        data.devices.forEach(d => {
            // Crear instancia real de Device (con métodos como getFirstFreePort)
            const device = new Device(d.id, d.type, d.x, d.y);
            device.name = d.name;
            device.cliMode = d.cliMode || 'user';
            device.selectedInterfaceIndex = d.selectedInterfaceIndex || null;
            if (d.config) device.config = { ...d.config };
            // Sobreescribir interfaces generadas por el constructor con las guardadas
            device.interfaces = d.interfaces.map(iface => ({ ...iface }));
            devices.push(device);
        });

        cables.push(...data.cables.map(c => ({ ...c })));

        draw();
        return true;
    },

    // ============================
    // LOCAL STORAGE
    // ============================

    /**
     * Guarda la topología actual en localStorage del navegador.
     */
    saveLocal() {
        try {
            const data = this.serialize();
            const jsonStr = JSON.stringify(data);
            localStorage.setItem(this.STORAGE_KEY, jsonStr);

            // Verificar que se guardó correctamente
            const verify = localStorage.getItem(this.STORAGE_KEY);
            if (!verify) {
                alertSystem.error('localStorage bloqueado. Intenta abrir con un servidor local (Live Server).');
                return;
            }
            console.log(`[Persistence] Guardado OK: ${devices.length} dispositivos, ${cables.length} cables (${(jsonStr.length / 1024).toFixed(1)} KB)`);
            alertSystem.success('Topología guardada en el navegador.');
        } catch (err) {
            console.error('[Persistence] saveLocal ERROR:', err);
            if (err.name === 'QuotaExceededError') {
                alertSystem.error('Sin espacio en localStorage. Limpia datos del navegador.');
            } else {
                alertSystem.error('Error al guardar: ' + err.message);
            }
        }
    },

    /**
     * Carga la topología guardada desde localStorage.
     */
    loadLocal() {
        try {
            const json = localStorage.getItem(this.STORAGE_KEY);
            console.log('[Persistence] loadLocal() - raw JSON:', json ? json.substring(0, 100) + '...' : 'null');

            if (!json) {
                alertSystem.warning('No hay topología guardada.');
                return;
            }

            const data = JSON.parse(json);
            console.log('[Persistence] Parsed data:', {
                version: data.version,
                devices: data.devices ? data.devices.length : 0,
                cables: data.cables ? data.cables.length : 0,
                nextDeviceId: data.nextDeviceId
            });

            if (this.deserialize(data)) {
                alertSystem.success(`Topología cargada: ${devices.length} dispositivos, ${cables.length} cables.`);
            } else {
                alertSystem.error('Formato de topología incompatible (versión: ' + (data.version || 'unknown') + ').');
            }
        } catch (err) {
            console.error('[Persistence] loadLocal ERROR:', err);
            alertSystem.error('Error al cargar: ' + err.message);
        }
    },

    // ============================
    // EXPORTAR / IMPORTAR ARCHIVO
    // ============================

    /**
     * Exporta la topología como archivo .json descargable.
     * Genera un nombre de archivo con timestamp para evitar colisiones.
     */
    exportJSON() {
        const data = this.serialize();
        const blob = new Blob(
            [JSON.stringify(data, null, 2)],
            { type: 'application/json' }
        );
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `netsim-topology-${Date.now()}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
        alertSystem.success('Topología exportada como archivo JSON.');
    },

    /**
     * Abre un diálogo de archivo para importar una topología .json.
     * Usa FileReader para leer el contenido del archivo seleccionado.
     */
    importJSON() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (this.deserialize(data)) {
                        alertSystem.success(`Topología "${file.name}" importada.`);
                    } else {
                        alertSystem.error('El archivo no tiene un formato válido.');
                    }
                } catch (err) {
                    alertSystem.error('Error al leer el archivo: ' + err.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    },

    // ============================
    // UTILIDADES
    // ============================

    /**
     * Limpia toda la topología del canvas.
     * Resetea dispositivos, cables y el contador de IDs.
     */
    clearAll() {
        if (devices.length === 0 && cables.length === 0) {
            alertSystem.info('El canvas ya está vacío.');
            return;
        }
        devices.length = 0;
        cables.length = 0;
        nextDeviceId = 0;
        History.clear();
        draw();
        alertSystem.info('Topología limpiada.');
    }
};
