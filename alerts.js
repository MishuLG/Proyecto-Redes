/* alerts.js - Sistema de Alertas Flotantes */

class AlertSystem {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Crear contenedor de alertas si no existe
        if (!document.getElementById('alert-container')) {
            this.container = document.createElement('div');
            this.container.id = 'alert-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('alert-container');
        }
    }

    /**
     * Muestra una alerta flotante
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo de alerta: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duración en milisegundos (0 = permanente hasta cerrar)
     */
    show(message, type = 'info', duration = 4000) {
        const alert = document.createElement('div');
        alert.className = `alert-box alert-${type}`;

        // Icono según el tipo
        const icons = {
            success: 'fa-circle-check',
            error: 'fa-circle-xmark',
            warning: 'fa-triangle-exclamation',
            info: 'fa-circle-info'
        };

        // Títulos según el tipo
        const titles = {
            success: 'Éxito',
            error: 'Error',
            warning: 'Advertencia',
            info: 'Información'
        };

        alert.innerHTML = `
            <div class="alert-icon">
                <i class="fas ${icons[type]}"></i>
            </div>
            <div class="alert-content">
                <div class="alert-title">${titles[type]}</div>
                <div class="alert-message">${message}</div>
            </div>
            <button class="alert-close" onclick="alertSystem.close(this)">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Agregar al contenedor
        this.container.appendChild(alert);

        // Animación de entrada
        setTimeout(() => alert.classList.add('alert-show'), 10);

        // Auto-cerrar si duration > 0
        if (duration > 0) {
            setTimeout(() => this.close(alert), duration);
        }

        return alert;
    }

    /**
     * Cierra una alerta específica
     * @param {HTMLElement|Event} element - Elemento de alerta o botón de cierre
     */
    close(element) {
        const alert = element instanceof HTMLElement && element.classList.contains('alert-box')
            ? element
            : element.parentElement.parentElement;

        alert.classList.remove('alert-show');
        alert.classList.add('alert-hide');

        setTimeout(() => {
            if (alert.parentElement) {
                alert.parentElement.removeChild(alert);
            }
        }, 300);
    }

    /**
     * Métodos de conveniencia
     */
    success(message, duration = 4000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 5000) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration = 4500) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = 4000) {
        return this.show(message, 'info', duration);
    }

    /**
     * Cierra todas las alertas
     */
    closeAll() {
        const alerts = this.container.querySelectorAll('.alert-box');
        alerts.forEach(alert => this.close(alert));
    }
}

// Instancia global
const alertSystem = new AlertSystem();

// Exportar para uso en módulos (opcional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AlertSystem;
}
