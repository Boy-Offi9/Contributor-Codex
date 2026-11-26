// terminal skin — the detailed engine rendered in the phosphor design language:
// CRT frame on near-black green, phosphor scanlines, box-drawn section headers,
// mono everything, bracketed stat cells with glowing phosphor values.
const { icon, MONO } = require('../../shared');

const GREEN = '#3ddc6a';
const DIM = '#2a6b3d';
const MID = '#4e9e63';
const BRIGHT = '#7dffa8';
const BG = '#020402';
const CHAR_W = 7.5; // mono char width estimate for box-drawn header rules

module.exports = {
  name: 'terminal',
  light: false,
  width: 420,
  headerH: 16,
  legendPad: 16,
  palette: { bg: BG, ink: BRIGHT, sub: MID, dim: DIM, rule: '#12331d', accent: GREEN, secondary: '#ffb020' },
  avatarBg: '#0a140a',
  css(displayFont) {
    return `
        .t1{font:700 18px ${MONO};fill:${BRIGHT};}
        .t2{font:500 12px ${MONO};fill:${MID};}
        .bio{font:400 12px ${MONO};fill:${MID};}
        .rankLbl{font:600 10px ${MONO};fill:${DIM};letter-spacing:1px;}
        .legend{font:500 10px ${MONO};fill:${MID};}`;
  },
  defs() {
    return `<filter id="sk-phos" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.6"/></filter>`;
  },
  chassis(W, H) {
    const scanlines = Array.from({ length: Math.ceil(H / 6) }, (_, i) => `<line x1="0" y1="${i * 6}" x2="${W}" y2="${i * 6}" stroke="${GREEN}" stroke-width="1" opacity="0.12"/>`).join('');
    return `
    <rect width="${W}" height="${H}" fill="${BG}"/>
    <g opacity="0.14">${scanlines}</g>
    <rect x="0" y="-8" width="${W}" height="5" fill="${GREEN}" opacity="0.10">
      <animate attributeName="y" from="-8" to="${H}" dur="6s" repeatCount="indefinite"/>
    </rect>
    <rect width="${W}" height="${H}" fill="none" stroke="${GREEN}" stroke-opacity="0.14" stroke-width="4"/>
    <rect width="${W}" height="${H}" fill="none" stroke="${GREEN}" stroke-opacity="0.7" stroke-width="1"/>
    <g fill="none" stroke="${GREEN}" stroke-width="2" stroke-linecap="square" opacity="0.8">
      <path d="M${W - 36} 2 H${W - 2} V36"/>
      <path d="M36 ${H - 2} H2 V${H - 36}"/>
    </g>`;
  },
  sectionHeader(label, y, W) {
    const trail = Math.max(0, Math.floor((W - 32 - (label.length + 4) * CHAR_W) / CHAR_W));
    return `<text x="16" y="${y}" font-family="${MONO}" font-size="11" fill="${DIM}" letter-spacing="1">┌─ ${label} ${'─'.repeat(trail)}</text>`;
  },
  statCell(x, y, label, value, accent, iconName, width = 116) {
    return `
    <rect x="${x}" y="${y}" width="${width}" height="60" fill="${GREEN}" fill-opacity="0.04" stroke="${GREEN}" stroke-opacity="0.4" stroke-width="1" stroke-dasharray="3 3"/>
    <path d="M${x + 4} ${y + 8} h6 M${x + 4} ${y + 8} v6" stroke="${GREEN}" stroke-width="1.4" opacity="0.9"/>
    ${iconName ? icon(iconName, x + 16, y + 8, GREEN, 0.9) : ''}
    <text x="${x + 34}" y="${y + 24}" font-family="${MONO}" font-size="9.5" fill="${DIM}">${label}</text>
    <text x="${x + 12}" y="${y + 46}" font-family="${MONO}" font-weight="700" font-size="17" fill="${BRIGHT}" filter="url(#sk-phos)">${value}</text>`;
  },
  langTrack(x, y, w, h) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#0a140a" stroke="${DIM}" stroke-width="1"/>`;
  },
  legendEntry(x, y, fill, label) {
    return `<rect x="${x}" y="${y - 7}" width="8" height="8" fill="${fill}" stroke="${BG}" stroke-width="1"/><text x="${x + 13}" y="${y}" class="legend">${label}</text>`;
  },
};
