// glass skin — the detailed engine rendered in the light frosted design language:
// gradient sky panel with soft accent blobs, frosted white chassis with ink
// strokes and dark brackets, chamfered frosted stat tiles with accent dots.
const { icon, MONO } = require('../../shared');

const INK = '#1c2333';
const SUB = '#5b6478';
const DIM = '#6b7488';
const RULE = '#c9d0e0';

module.exports = {
  name: 'glass',
  light: true,
  width: 420,
  headerH: 16,
  legendPad: 16,
  palette: { bg: '#dde3f0', ink: INK, sub: SUB, dim: DIM, rule: RULE, accent: '#2563eb', secondary: '#ff2d6f' },
  avatarBg: '#dde3f0',
  css(displayFont) {
    return `
        .t1{font:700 18px ${displayFont};fill:${INK};}
        .t2{font:500 12px ${displayFont};fill:${DIM};}
        .bio{font:400 12px system-ui,sans-serif;fill:${SUB};}
        .rankLbl{font:600 10px ${MONO};fill:${SUB};letter-spacing:1px;}
        .legend{font:500 10px ${MONO};fill:${SUB};}`;
  },
  chassis(W, H, accent) {
    const H2 = H - 18;
    const scanlines = Array.from({ length: Math.ceil(H / 7) }, (_, i) => `<line x1="24" y1="${i * 7}" x2="${W - 24}" y2="${i * 7}" stroke="${INK}" stroke-width="1" opacity="0.035"/>`).join('');
    return `
    <defs>
      <linearGradient id="sk-glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#eef1f8"/>
        <stop offset="100%" stop-color="#dde3f0"/>
      </linearGradient>
      <filter id="sk-soft" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-opacity="0.12"/></filter>
      <filter id="sk-blob" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="26"/></filter>
    </defs>
    <polygon points="18,0 ${W},0 ${W},${H2} ${W - 18},${H} 0,${H} 0,18" fill="url(#sk-glass)"/>
    <circle cx="40" cy="24" r="70" fill="${accent}" opacity="0.22" filter="url(#sk-blob)"/>
    <circle cx="${W - 15}" cy="60" r="60" fill="#ff2d6f" opacity="0.16" filter="url(#sk-blob)"/>
    <circle cx="${W - 30}" cy="${H - 34}" r="65" fill="${accent}" opacity="0.14" filter="url(#sk-blob)"/>
    <polygon points="32,16 ${W - 16},16 ${W - 16},${H - 34} ${W - 34},${H - 16} 16,${H - 16} 16,32" fill="#ffffff" opacity="0.55" filter="url(#sk-soft)"/>
    <polygon points="32,16 ${W - 16},16 ${W - 16},${H - 34} ${W - 34},${H - 16} 16,${H - 16} 16,32" fill="none" stroke="${INK}" stroke-opacity="0.1" stroke-width="4"/>
    <polygon points="32,16 ${W - 16},16 ${W - 16},${H - 34} ${W - 34},${H - 16} 16,${H - 16} 16,32" fill="none" stroke="${INK}" stroke-opacity="0.35" stroke-width="1.2"/>
    <g fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="square" opacity="0.65">
      <path d="M${W - 48} 17 H${W - 17} V48"/>
      <path d="M48 ${H - 17} H17 V${H - 48}"/>
    </g>
    ${scanlines}
    <rect x="40" y="16" width="${W - 96}" height="1.5" rx="0.75" fill="#ffffff" opacity="0.85"/>`;
  },
  sectionHeader(label, y, W) {
    const lx = 32;
    return `
    <circle cx="${lx + 4}" cy="${y - 4}" r="3" fill="${SUB}"/>
    <text x="${lx + 12}" y="${y}" font-family="${MONO}" font-size="9.5" letter-spacing="1.6" fill="${SUB}">${label}</text>
    <path d="M${lx + 12 + label.length * 8} ${y - 3} H${W - 32}" stroke="${RULE}" stroke-width="1"/>`;
  },
  statCell(x, y, label, value, accent, iconName, width = 116) {
    return `
    <path d="M${x + 8} ${y} H${x + width} V${y + 60} H${x} V${y + 8} Z" fill="#ffffff" opacity="0.7" stroke="${INK}" stroke-opacity="0.12"/>
    <path d="M${x + 8} ${y} L${x} ${y + 8}" stroke="${accent}" stroke-width="1.6" opacity="0.8"/>
    ${iconName ? icon(iconName, x + 12, y + 10, accent) : ''}
    <text x="${x + 32}" y="${y + 24}" font-family="${MONO}" font-size="9" letter-spacing="1.1" fill="${SUB}">${label}</text>
    <text x="${x + 12}" y="${y + 46}" font-family="system-ui,sans-serif" font-weight="700" font-size="18" fill="${INK}">${value}</text>`;
  },
  langTrack(x, y, w, h) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="#ffffff" opacity="0.55" stroke="${RULE}" stroke-width="1"/>`;
  },
  legendEntry(x, y, fill, label) {
    return `<circle cx="${x + 4}" cy="${y - 3}" r="3.5" fill="${fill}" stroke="#ffffff" stroke-width="1"/><text x="${x + 14}" y="${y}" class="legend">${label}</text>`;
  },
};
