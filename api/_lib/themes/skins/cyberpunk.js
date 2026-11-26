// cyberpunk skin — the detailed engine rendered in the kit-HUD design language:
// chamfered chassis with layered glow strokes, traveling perimeter light, corner
// brackets, scanlines, mono telemetry labels, chamfered stat cells.
const { icon, MONO } = require('../../shared');

const PALETTE = { accent: '#00E5FF', secondary: '#FF2D6F', dim: '#7FB8C4', bg: '#04070D', ink: '#E8FDFF', sub: '#9db4c0', text: '#E8FDFF', rule: '#1a2434', cell: '#122230' };
const CHAMFER = 18;

module.exports = {
  name: 'cyberpunk',
  light: false,
  width: 420,
  headerH: 16,
  legendPad: 16,
  palette: PALETTE,
  avatarBg: '#070d16',
  css(displayFont) {
    return `
        .t1{font:700 18px ${displayFont};fill:${PALETTE.text};}
        .t2{font:500 12px ${MONO};fill:${PALETTE.dim};}
        .bio{font:400 12px system-ui,sans-serif;fill:${PALETTE.dim};}
        .rankLbl{font:600 10px ${MONO};fill:${PALETTE.dim};letter-spacing:1px;}
        .legend{font:500 10px ${MONO};fill:${PALETTE.dim};}`;
  },
  chassis(W, H, accent) {
    const framePts = `${CHAMFER},0 ${W},0 ${W},${H - CHAMFER} ${W - CHAMFER},${H} 0,${H} 0,${CHAMFER}`;
    const per = 2 * (W + H) - 2 * (2 * CHAMFER) + 2 * CHAMFER * Math.SQRT2;
    const seg = per * 0.14;
    const bracketCol = '#c8f6ff';
    const scanlines = Array.from({ length: Math.ceil(H / 6) }, (_, i) => `<line x1="${CHAMFER - 4}" y1="${i * 6}" x2="${W - CHAMFER + 4}" y2="${i * 6}" stroke="${accent}" stroke-width="1" opacity="0.07"/>`).join('');
    return `
    <defs>
      <clipPath id="sk-chassis"><polygon points="${framePts}"/></clipPath>
      <radialGradient id="sk-vig" cx="50%" cy="30%" r="80%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.09"/>
        <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <g clip-path="url(#sk-chassis)">
      <rect width="${W}" height="${H}" fill="${PALETTE.bg}"/>
      <rect width="${W}" height="${H}" fill="url(#sk-vig)"/>
      ${scanlines}
      <rect x="0" y="-10" width="${W}" height="7" fill="${accent}" opacity="0.10">
        <animate attributeName="y" from="-10" to="${H}" dur="5.5s" repeatCount="indefinite"/>
      </rect>
    </g>
    <polygon points="${framePts}" fill="${accent}" fill-opacity="0.04"/>
    <polygon points="${framePts}" fill="none" stroke="${accent}" stroke-opacity="0.08" stroke-width="6"/>
    <polygon points="${framePts}" fill="none" stroke="${accent}" stroke-opacity="0.18" stroke-width="3.4"/>
    <polygon points="${framePts}" fill="none" stroke="${accent}" stroke-opacity="0.9" stroke-width="1.4"/>
    <polygon points="${framePts}" fill="none" stroke="#dffaff" stroke-width="2.2" stroke-dasharray="${seg.toFixed(1)} ${(per - seg).toFixed(1)}">
      <animate attributeName="stroke-dashoffset" from="${per.toFixed(1)}" to="0" dur="3.2s" repeatCount="indefinite"/>
    </polygon>
    <g fill="none" stroke="${bracketCol}" stroke-width="2.8" stroke-linecap="square">
      <path d="M${W - 44} 2 H${W - 2} V44"/>
      <path d="M44 ${H - 2} H2 V${H - 44}"/>
    </g>`;
  },
  sectionHeader(label, y, W) {
    const lx = 24 + label.length * 7 + 14;
    return `
    <text x="24" y="${y}" font-family="${MONO}" font-size="8.5" letter-spacing="2" fill="${PALETTE.dim}" opacity="0.6">${label}</text>
    <path d="M${lx} ${y - 3} H${W - 24}" stroke="${PALETTE.rule}"/>
    <path d="M${W - 30} ${y - 7} v6" stroke="${PALETTE.secondary}" stroke-width="1.4" opacity="0.8"/>`;
  },
  statCell(x, y, label, value, accent, iconName, width = 116) {
    const c = 8;
    return `
    <path d="M${x} ${y} H${x + width} V${y + 60 - c} L${x + width - c} ${y + 60} H${x} Z" fill="${accent}" fill-opacity="0.05" stroke="${accent}" stroke-opacity="0.4" stroke-width="1"/>
    <path d="M${x} ${y} H${x + width}" stroke="${accent}" stroke-opacity="0.9" stroke-width="2" filter="url(#glow)"/>
    ${iconName ? icon(iconName, x + 12, y + 10, accent, 1) : ''}
    <text x="${iconName ? x + 30 : x + 12}" y="${y + 24}" font-family="${MONO}" font-size="8.5" letter-spacing="1.5" fill="${PALETTE.dim}" opacity="0.85">${label}</text>
    <text x="${x + 12}" y="${y + 46}" font-family="system-ui,sans-serif" font-weight="700" font-size="18" fill="${PALETTE.text}" filter="url(#glow)">${value}</text>`;
  },
  langTrack(x, y, w, h) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${PALETTE.cell}"/>`;
  },
  legendEntry(x, y, fill, label) {
    return `<rect x="${x}" y="${y - 7}" width="8" height="8" fill="${fill}"/><text x="${x + 13}" y="${y}" class="legend">${label}</text>`;
  },
};
