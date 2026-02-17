/* canvas.js — Renderizado del canvas con iconos vectoriales premium */

const canvas = document.getElementById('networkCanvas');
const ctx = canvas.getContext('2d');
let canvasBounds;

// ============================
// COLORES DE DISPOSITIVOS
// ============================

const DEVICE_THEME = {
    router: {
        bg: 'rgba(59, 130, 246, 0.1)',
        border: '#3b82f6',
        icon: '#60a5fa',
        glow: 'rgba(59, 130, 246, 0.25)',
        gradient: ['#3b82f6', '#2563eb']
    },
    switch: {
        bg: 'rgba(249, 115, 22, 0.1)',
        border: '#f97316',
        icon: '#fb923c',
        glow: 'rgba(249, 115, 22, 0.25)',
        gradient: ['#f97316', '#ea580c']
    },
    pc: {
        bg: 'rgba(16, 185, 129, 0.1)',
        border: '#10b981',
        icon: '#34d399',
        glow: 'rgba(16, 185, 129, 0.25)',
        gradient: ['#10b981', '#059669']
    }
};

// ============================
// UTILIDADES
// ============================

function distToSegment(p, v, w) {
    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function resizeCanvas() {
    const container = document.getElementById('workspace');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    canvasBounds = canvas.getBoundingClientRect();
    draw();
}

// ============================
// DIBUJAR ICONOS VECTORIALES
// ============================

/**
 * Router: Círculo con 4 flechas radiales (símbolo estándar de enrutamiento)
 */
function drawRouterIcon(ctx, x, y) {
    const theme = DEVICE_THEME.router;
    const bw = 48, bh = 24;   // body width/height

    // ── Glow ──
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 18;

    // ── Cuerpo del router (rectángulo redondeado) ──
    roundRect(ctx, x - bw / 2, y - bh / 2 + 2, bw, bh, 5);
    ctx.fillStyle = theme.bg;
    ctx.fill();
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 1.5;
    roundRect(ctx, x - bw / 2, y - bh / 2 + 2, bw, bh, 5);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // ── Antena izquierda (inclinada) ──
    ctx.strokeStyle = theme.icon;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(x - 10, y - bh / 2 + 2);
    ctx.lineTo(x - 16, y - bh / 2 - 14);
    ctx.stroke();

    // Bolita en la punta
    ctx.beginPath();
    ctx.arc(x - 16, y - bh / 2 - 14, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = theme.icon;
    ctx.fill();

    // ── Antena derecha (inclinada al otro lado) ──
    ctx.beginPath();
    ctx.moveTo(x + 10, y - bh / 2 + 2);
    ctx.lineTo(x + 16, y - bh / 2 - 14);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x + 16, y - bh / 2 - 14, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = theme.icon;
    ctx.fill();

    // ── Señal WiFi (arcos entre antenas) ──
    ctx.strokeStyle = theme.icon;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.3;
    for (let i = 1; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(x, y - bh / 2 - 6, i * 6, Math.PI * 1.2, Math.PI * 1.8);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // ── LEDs de estado ──
    const ledY = y - 2;
    // LED verde (power)
    ctx.beginPath();
    ctx.arc(x - 14, ledY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#4ade80';
    ctx.fill();
    // LED azul (actividad)
    ctx.beginPath();
    ctx.arc(x - 7, ledY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = theme.icon;
    ctx.fill();
    // LED azul tenue
    ctx.beginPath();
    ctx.arc(x, ledY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = theme.icon;
    ctx.globalAlpha = 0.4;
    ctx.fill();
    ctx.globalAlpha = 1;

    // ── Puertos Ethernet (3 rectángulos en la parte inferior) ──
    ctx.fillStyle = theme.icon;
    ctx.globalAlpha = 0.6;
    const portW = 7, portH = 5;
    const portY = y + 6;
    for (let i = 0; i < 3; i++) {
        roundRect(ctx, x + 4 + i * (portW + 3), portY, portW, portH, 1.5);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

/**
 * Switch: Rectángulo redondeado con indicadores de puertos
 */
function drawSwitchIcon(ctx, x, y) {
    const theme = DEVICE_THEME.switch;
    const w = 50, h = 30;

    // Glow
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 18;

    // Cuerpo del switch
    roundRect(ctx, x - w / 2, y - h / 2, w, h, 6);
    ctx.fillStyle = theme.bg;
    ctx.fill();
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 1.5;
    roundRect(ctx, x - w / 2, y - h / 2, w, h, 6);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // LED de estado (arriba izquierda)
    ctx.beginPath();
    ctx.arc(x - 18, y - 6, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#4ade80';
    ctx.fill();

    // Puertos (fila de 6 rectángulos pequeños en la parte inferior)
    ctx.fillStyle = theme.icon;
    const portW = 4, portH = 5, gap = 2;
    const totalPorts = 6;
    const startX = x - ((totalPorts * (portW + gap) - gap) / 2);

    for (let i = 0; i < totalPorts; i++) {
        const px = startX + i * (portW + gap);
        roundRect(ctx, px, y + 2, portW, portH, 1);
        ctx.fill();
    }

    // Líneas decorativas (flujo de datos)
    ctx.strokeStyle = theme.icon;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x - 16, y - 2);
    ctx.lineTo(x + 16, y - 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
}

/**
 * PC: Monitor con pantalla brillante y base
 */
function drawPCIcon(ctx, x, y) {
    const theme = DEVICE_THEME.pc;
    const monW = 36, monH = 26;

    // Glow del monitor
    ctx.shadowColor = theme.glow;
    ctx.shadowBlur = 18;

    // Monitor (cuerpo)
    roundRect(ctx, x - monW / 2, y - monH / 2 - 4, monW, monH, 4);
    ctx.fillStyle = theme.bg;
    ctx.fill();
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 1.5;
    roundRect(ctx, x - monW / 2, y - monH / 2 - 4, monW, monH, 4);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // Pantalla (interior del monitor más brillante)
    roundRect(ctx, x - monW / 2 + 4, y - monH / 2, monW - 8, monH - 8, 2);
    ctx.fillStyle = 'rgba(52, 211, 153, 0.08)';
    ctx.fill();

    // Líneas de texto en la pantalla
    ctx.fillStyle = theme.icon;
    ctx.globalAlpha = 0.5;
    roundRect(ctx, x - 10, y - 8, 14, 2, 1);
    ctx.fill();
    roundRect(ctx, x - 10, y - 4, 20, 2, 1);
    ctx.fill();
    roundRect(ctx, x - 10, y, 11, 2, 1);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Cursor parpadeante
    ctx.fillStyle = theme.icon;
    roundRect(ctx, x + 4, y, 2, 2, 0.5);
    ctx.fill();

    // Soporte
    ctx.fillStyle = theme.border;
    ctx.fillRect(x - 2, y + monH / 2 - 4, 4, 6);

    // Base
    roundRect(ctx, x - 8, y + monH / 2 + 1, 16, 3, 1.5);
    ctx.fill();
}

// ============================
// DIBUJO PRINCIPAL
// ============================

/**
 * Retorna el radio visual del icono para acortar los cables.
 */
function getDeviceRadius(type) {
    switch (type) {
        case 'router': return 28;
        case 'switch': return 28;
        case 'pc': return 24;
        default: return 26;
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ── Controlar watermark ──
    updateWatermark();

    // ══════════════════════════════════════
    // CAPA 1: CABLES (debajo de todo)
    // ══════════════════════════════════════
    cables.forEach(c => {
        const d1 = devices.find(d => d.id === c.from);
        const d2 = devices.find(d => d.id === c.to);
        if (!d1 || !d2) return;

        // Calcular ángulo y acortar línea al borde de cada dispositivo
        const angle = Math.atan2(d2.y - d1.y, d2.x - d1.x);
        const r1 = getDeviceRadius(d1.type);
        const r2 = getDeviceRadius(d2.type);

        const startX = d1.x + Math.cos(angle) * r1;
        const startY = d1.y + Math.sin(angle) * r1;
        const endX = d2.x - Math.cos(angle) * r2;
        const endY = d2.y - Math.sin(angle) * r2;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
        ctx.lineCap = 'round';

        switch (c.type) {
            case 'console':
                ctx.strokeStyle = '#22d3ee';
                ctx.lineWidth = 2;
                break;
            case 'straight':
                ctx.strokeStyle = '#94a3b8';
                break;
            case 'cross':
                ctx.strokeStyle = '#94a3b8';
                ctx.setLineDash([10, 5]);
                break;
            case 'fiber':
                ctx.strokeStyle = '#fb923c';
                break;
            case 'serial':
                ctx.strokeStyle = '#f87171';
                ctx.lineWidth = 3;
                break;
            default:
                ctx.strokeStyle = '#64748b';
        }
        ctx.stroke();
        ctx.setLineDash([]);
    });

    // ══════════════════════════════════════
    // CAPA 2: LINK LIGHTS (entre cables y dispositivos)
    // ══════════════════════════════════════
    cables.forEach(c => {
        const d1 = devices.find(d => d.id === c.from);
        const d2 = devices.find(d => d.id === c.to);
        if (!d1 || !d2) return;

        const angle = Math.atan2(d2.y - d1.y, d2.x - d1.x);
        const r1 = getDeviceRadius(d1.type);
        const r2 = getDeviceRadius(d2.type);

        // Luces justo en el borde del dispositivo
        drawLinkLight(d1, c.fromPort,
            d1.x + Math.cos(angle) * (r1 + 4),
            d1.y + Math.sin(angle) * (r1 + 4));

        drawLinkLight(d2, c.toPort,
            d2.x - Math.cos(angle) * (r2 + 4),
            d2.y - Math.sin(angle) * (r2 + 4));
    });

    // ══════════════════════════════════════
    // CAPA 3: DISPOSITIVOS (encima de todo)
    // ══════════════════════════════════════
    devices.forEach(d => {
        // Dibujar icono vectorial según tipo
        if (d.type === 'router') drawRouterIcon(ctx, d.x, d.y);
        else if (d.type === 'switch') drawSwitchIcon(ctx, d.x, d.y);
        else drawPCIcon(ctx, d.x, d.y);

        // ── Nombre (pill con fondo) ──
        ctx.font = '600 11px Inter, Segoe UI, sans-serif';
        const textWidth = ctx.measureText(d.name).width;
        const pillX = d.x - textWidth / 2 - 8;
        const pillY = d.y + 30;
        const pillW = textWidth + 16;
        const pillH = 20;

        // Background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        roundRect(ctx, pillX, pillY, pillW, pillH, 5);
        ctx.fill();

        // Border
        const theme = DEVICE_THEME[d.type];
        ctx.strokeStyle = theme.border + '40'; // 25% opacity
        ctx.lineWidth = 1;
        roundRect(ctx, pillX, pillY, pillW, pillH, 5);
        ctx.stroke();

        // Texto
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.fillText(d.name, d.x, d.y + 43);

        // ── IP (si existe) ──
        if (d.interfaces[0] && d.interfaces[0].ip) {
            const ipText = d.interfaces[0].ip;
            ctx.font = '500 10px JetBrains Mono, Consolas, monospace';
            const ipWidth = ctx.measureText(ipText).width;

            // IP background pill
            ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
            roundRect(ctx, d.x - ipWidth / 2 - 6, d.y - 44, ipWidth + 12, 17, 4);
            ctx.fill();

            ctx.fillStyle = '#60a5fa';
            ctx.textAlign = 'center';
            ctx.fillText(ipText, d.x, d.y - 32);
        }
    });

    // ══════════════════════════════════════
    // CAPA 4: PREVISUALIZACIÓN DE CABLE
    // ══════════════════════════════════════
    if (currentCableType && cableStartDevice && lastMousePos) {
        const angle = Math.atan2(
            lastMousePos.y - cableStartDevice.y,
            lastMousePos.x - cableStartDevice.x
        );
        const r = getDeviceRadius(cableStartDevice.type);

        ctx.beginPath();
        ctx.moveTo(
            cableStartDevice.x + Math.cos(angle) * r,
            cableStartDevice.y + Math.sin(angle) * r
        );
        ctx.lineTo(lastMousePos.x, lastMousePos.y);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

// ============================
// INDICADOR DE ESTADO DEL ENLACE
// ============================

function drawLinkLight(device, portIndex, lx, ly) {
    const iface = device.interfaces[portIndex];
    if (!iface) return; // Protección contra índice inválido
    const isUp = iface.connected && iface.adminStatus;

    // Glow
    ctx.shadowColor = isUp ? 'rgba(74, 222, 128, 0.6)' : 'rgba(248, 113, 113, 0.6)';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = isUp ? '#4ade80' : '#f87171';
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
}

// ============================
// WATERMARK
// ============================

/**
 * Muestra/oculta el texto "Arrastra dispositivos aquí"
 * con una animación suave de fade-in cuando reaparece.
 */
function updateWatermark() {
    const wm = document.querySelector('.workspace-watermark');
    if (!wm) return;

    if (devices.length === 0) {
        if (wm.style.display === 'none' || wm.style.display === '') {
            wm.style.display = 'flex';
            // Trigger reflow para reiniciar la animación
            wm.classList.remove('watermark-animate');
            void wm.offsetWidth;
            wm.classList.add('watermark-animate');
        }
    } else {
        wm.style.display = 'none';
    }
}
