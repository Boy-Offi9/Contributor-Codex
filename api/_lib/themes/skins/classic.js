// classic — the original detailed look, unchanged. Baseline skin: no section
// headers, chamfered dark chassis with a soft accent wash and faint scanlines.
const { icon, MONO } = require('../../shared');

module.exports = {
  name: 'classic',
  light: false,
  width: 420,
  headerH: 0,
  legendPad: 14,
  palette: { bg: '#04070d', ink: '#e8edf5', sub: '#9db4c0', dim: '#7fb8c4', rule: '#1a2434', accent: '#00e5ff', secondary: '#8b5cf6' },
  avatarBg: '#1a2434',
  css(displayFont) {
    return `
        .t1{font:700 18px ${displayFont};fill:#e8edf5;}
        .t2{font:500 12px ${MONO};fill:#7fb8c4;}
        .bio{font:400 12px system-ui,sans-serif;fill:#9db4c0;}
        .rankLbl{font:600 10px ${MONO};fill:#7fb8c4;letter-spacing:1px;}
        .legend{font:500 10px ${MONO};fill:#9db4c0;}`;
  },
  chassis(W, H, accent) {
    return `
    <defs>
      <radialGradient id="sk-bg" cx="10%" cy="0%" r="80%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.10"/>
        <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="sk-bg2" cx="95%" cy="100%" r="65%">
        <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
      </radialGradient>
      <clipPath id="sk-clip"><polygon points="14,0 ${W},0 ${W},${H - 14} ${W - 14},${H} 0,${H} 0,14"/></clipPath>
    </defs>
    <g clip-path="url(#sk-clip)">
      <rect width="${W}" height="${H}" fill="#04070d"/>
      <rect width="${W}" height="${H}" fill="url(#sk-bg)"/>
      <g opacity="1">${Array.from({ length: Math.ceil(H / 6) }, (_, i) => `<line x1="10" y1="${i * 6}" x2="${W - 10}" y2="${i * 6}" stroke="${accent}" stroke-width="1" opacity="0.06"/>`).join('')}</g>
      <rect x="0" y="-8" width="${W}" height="6" fill="${accent}" opacity="0.08">
        <animate attributeName="y" from="-8" to="${H}" dur="6.5s" repeatCount="indefinite"/>
      </rect>
      <rect width="${W}" height="${H}" fill="url(#sk-bg2)"/>
    </g>`;
  },
  statCell(x, y, label, value, accent, iconName, width = 178) {
    return `
    <rect x="${x}" y="${y}" width="${width}" height="60" fill="none" stroke="#1a2434"/>
    <rect x="${x}" y="${y}" width="${width}" height="2" fill="${accent}" opacity="0.35"/>
    ${iconName ? icon(iconName, x + 12, y + 8, accent) : ''}
    <text x="${iconName ? x + 30 : x + 12}" y="${y + 22}" font-family="${MONO}" font-size="10" fill="#7fb8c4" letter-spacing=".6">${label}</text>
    <text x="${x + 12}" y="${y + 46}" font-family="system-ui,sans-serif" font-weight="700" font-size="18" fill="${accent}" filter="url(#glow)">${value}</text>`;
  },
  langTrack(x, y, w, h) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="#1a2434"/>`;
  },
  legendEntry(x, y, fill, label) {
    return `<circle cx="${x + 4}" cy="${y - 3}" r="3" fill="${fill}"/><text x="${x + 12}" y="${y}" class="legend">${label}</text>`;
  },
};
