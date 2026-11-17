const { esc, MONO, SANS } = require('./svg');

function errorSVG({ width = 480, height = 120, title = 'CODEX ERROR', message, messageFont = SANS, messageSize = 12, messageFill = '#8a94ab' }) {
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="#05070c"/>
    <rect width="${width}" height="${height}" fill="none" stroke="#ff4d6d"/>
    <text x="20" y="55" font-family="system-ui,sans-serif" font-weight="700" font-size="13" fill="#ff4d6d">${esc(title)}</text>
    <text x="20" y="78" font-family="${messageFont}" font-size="${messageSize}" fill="${messageFill}">${esc(message)}</text>
  </svg>`;
}

function leaderboardError(width, message, height = 100) {
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="#05070c"/>
    <rect width="${width}" height="${height}" fill="none" stroke="#ff4d6d"/>
    <text x="20" y="${height / 2 + 5}" font-family="${MONO}" font-size="12" fill="#ff4d6d">${esc(message)}</text>
  </svg>`;
}

function errorCard(message, title = 'CODEX ERROR') {
  return errorSVG({ title, message });
}

module.exports = { errorSVG, leaderboardError, errorCard };
