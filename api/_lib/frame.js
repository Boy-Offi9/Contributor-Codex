// Shared SVG chrome for the streak / activity / languages cards: background,
// border, glow filter, embedded font. The card body is drawn by the caller.
const { esc, CHAKRA_PETCH_FONT_FACE, DISPLAY } = require('./shared');

const FONT = DISPLAY;
const THEMES = ['cyberpunk', 'glass', 'terminal'];
const sanitizeTheme = (input, fallback = 'cyberpunk') => {
  const v = String(input || '').toLowerCase();
  return THEMES.includes(v) ? v : fallback;
};

const PALETTE = {
  cyberpunk: { bg: '#05070c', text: '#e8edf5', sub: '#c3cadb', dim: '#8a94ab', track: '#1b2233', rule: '#1b2233' },
  glass:     { bg: '#0d1424', text: '#f1f5fb', sub: '#d3d9e8', dim: '#93a0b8', track: '#222c44', rule: '#26314a' },
  terminal:  { bg: '#000000', text: '#d8f5d8', sub: '#b6d9b6', dim: '#7da07d', track: '#12261a', rule: '#16301f' },
};

function frame({ width, height, color, theme, title, body }) {
  const p = PALETTE[theme] || PALETTE.cyberpunk;
  const cyber = theme === 'cyberpunk';
  const glass = theme === 'glass';
  const outline = cyber
    ? `0,14 14,0 ${width},0 ${width},${height - 14} ${width - 14},${height} 0,${height}`
    : null;
  const clip = cyber
    ? `<clipPath id="cardClip"><polygon points="${outline}"/></clipPath>`
    : `<clipPath id="cardClip"><rect width="${width}" height="${height}" rx="${glass ? 14 : 2}"/></clipPath>`;
  const border = cyber
    ? `<polygon points="${outline}" fill="none" stroke="${color}" opacity="0.5"/>`
    : `<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="${glass ? 14 : 2}" fill="none" stroke="${glass ? p.rule : color}" ${glass ? '' : 'opacity="0.6"'}/>`;
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <title>${esc(title)}</title>
    <defs>
      ${CHAKRA_PETCH_FONT_FACE ? `<style>${CHAKRA_PETCH_FONT_FACE}</style>` : ''}
      ${clip}
      <radialGradient id="bgA" cx="90%" cy="0%" r="90%">
        <stop offset="0%" stop-color="${color}" stop-opacity="${glass ? 0.16 : 0.13}"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </radialGradient>
      <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
        <path d="M24 0H0V24" fill="none" stroke="${color}" stroke-width="0.5" opacity="0.5"/>
      </pattern>
      <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="2.4" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <g clip-path="url(#cardClip)">
      <rect width="${width}" height="${height}" fill="${p.bg}"/>
      ${theme === 'terminal' ? '' : `<rect width="${width}" height="${height}" fill="url(#grid)" opacity="0.05"/><rect width="${width}" height="${height}" fill="url(#bgA)"/>`}
    </g>
    ${border}
    ${body}
  </svg>`;
}

function errorCard(message, title = 'CODEX ERROR') {
  return `<svg width="480" height="120" viewBox="0 0 480 120" xmlns="http://www.w3.org/2000/svg">
    <rect width="480" height="120" fill="#05070c"/>
    <rect width="480" height="120" fill="none" stroke="#ff4d6d"/>
    <text x="20" y="55" font-family="system-ui,sans-serif" font-weight="700" font-size="13" fill="#ff4d6d">${esc(title)}</text>
    <text x="20" y="78" font-family="system-ui,sans-serif" font-size="12" fill="#8a94ab">${esc(message)}</text>
  </svg>`;
}

function svgResponse(body, status, cacheControl) {
  const headers = { 'Content-Type': 'image/svg+xml' };
  if (cacheControl) headers['Cache-Control'] = cacheControl;
  return new Response(body, { status, headers });
}

module.exports = { FONT, THEMES, PALETTE, sanitizeTheme, frame, errorCard, svgResponse };
