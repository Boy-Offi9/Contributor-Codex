const { esc, MONO, SANS } = require('./svg');

// Error cards share the kit HUD language: chamfered chassis, layered glow,
// scanlines, corner brackets — with the danger accent (FF2D6F family).
function chassis(width, height, accent, body) {
  const pts = `14,0 ${width},0 ${width},${height - 14} ${width - 14},${height} 0,${height} 0,14`;
  return `
    <polygon points="${pts}" fill="none" stroke="${accent}" stroke-opacity="0.14" stroke-width="5"/>
    <polygon points="${pts}" fill="none" stroke="${accent}" stroke-opacity="0.35" stroke-width="2.6"/>
    <polygon points="${pts}" fill="none" stroke="${accent}" stroke-opacity="0.95" stroke-width="1.2"/>
    <g fill="none" stroke="${accent}" stroke-width="2.4" stroke-linecap="square" opacity="0.9">
      <path d="M${width - 34} 2 H${width - 2} V34"/>
      <path d="M34 ${height - 2} H2 V${height - 34}"/>
    </g>${body}`;
}

function scanlines(width, height, accent) {
  return Array.from({ length: Math.ceil(height / 6) }, (_, i) =>
    `<line x1="10" y1="${i * 6}" x2="${width - 10}" y2="${i * 6}" stroke="${accent}" stroke-width="1" opacity="0.07"/>`).join('');
}

function errorSVG({ width = 480, height = 120, title = 'CODEX ERROR', message, messageFont = MONO, messageSize = 12, messageFill = '#8a95ab' }) {
  const accent = '#ff2d6f';
  const body = `
    <text x="24" y="52" font-family="${SANS}" font-weight="700" font-size="13" fill="${accent}" letter-spacing="2">${esc(title)}</text>
    <path d="M24 60 H${width - 24}" stroke="#1a2434"/>
    <text x="24" y="80" font-family="${messageFont}" font-size="${messageSize}" fill="${messageFill}">${esc(message)}</text>`;
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="#04070d"/>
    ${scanlines(width, height, accent)}
    ${chassis(width, height, accent, body)}
  </svg>`;
}

function leaderboardError(width, message, height = 100) {
  const accent = '#ff2d6f';
  const body = `
    <text x="24" y="${height / 2 + 5}" font-family="${MONO}" font-size="12" fill="${accent}">${esc(message)}</text>`;
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="#04070d"/>
    ${scanlines(width, height, accent)}
    ${chassis(width, height, accent, body)}
  </svg>`;
}

function errorCard(message, title = 'CODEX ERROR') {
  return errorSVG({ title, message });
}

module.exports = { errorSVG, leaderboardError, errorCard };
