const { esc, CHAKRA_PETCH_FONT_FACE, DISPLAY, svgReply, sanitizeColor, contrastRatio, mixColors, luminance } = require('./shared');

const FONT = DISPLAY;
const THEMES = ['cyberpunk', 'glass', 'terminal'];
const sanitizeTheme = (input, fallback = 'cyberpunk') => {
  const v = String(input || '').toLowerCase();
  return THEMES.includes(v) ? v : fallback;
};

const PALETTE = {
  cyberpunk: { bg: '#05070c', text: '#e8edf5', sub: '#c3cadb', dim: '#8a94ab', track: '#1b2233', rule: '#1b2233' },
  glass:     { bg: '#f4f6fb', text: '#1c2333', sub: '#3d4760', dim: '#7b8499', track: '#dfe5f1', rule: '#c9d0e0' },
  terminal:  { bg: '#000000', text: '#d8f5d8', sub: '#b6d9b6', dim: '#7da07d', track: '#12261a', rule: '#16301f' },
};

function styleFromParams(params, theme) {
  const bg = sanitizeColor(params.get('bg'));
  let text = sanitizeColor(params.get('text'));
  const border = sanitizeColor(params.get('border'));
  const base = PALETTE[theme] || PALETTE.cyberpunk;
  if (text && contrastRatio(text, bg || base.bg) < 3) text = null;
  const hideBorder = ['1', 'true', 'yes'].includes((params.get('hide_border') || '').toLowerCase());
  return { bg, text, border, hideBorder };
}

function paletteFor(theme, style = {}) {
  const base = PALETTE[theme] || PALETTE.cyberpunk;
  const bg = style.bg || base.bg;
  let text = style.text || base.text;
  if (style.bg && !style.text && contrastRatio(text, bg) < 4.5) {
    text = contrastRatio('#0b0f19', bg) > contrastRatio('#f5f7fb', bg) ? '#0b0f19' : '#f5f7fb';
  }
  const custom = Boolean(style.bg || style.text);
  return {
    bg,
    text,
    sub: custom ? mixColors(text, bg, 0.18) : base.sub,
    dim: custom ? mixColors(text, bg, 0.45) : base.dim,
    track: style.bg ? mixColors(bg, text, 0.12) : base.track,
    rule: style.border || (style.bg ? mixColors(bg, text, 0.16) : base.rule),
  };
}

function ink(color, theme) {
  if (theme !== 'glass') return color;
  const mix = (a, b) => Math.round(a * 0.55 + b * 0.45);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  return `#${[mix(r, 0x1c), mix(g, 0x23), mix(b, 0x33)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function inkTheme(theme, style = {}) {
  if (style.bg) return luminance(style.bg) > 0.4 ? 'glass' : 'dark';
  return theme;
}

function frame({ width, height, color, theme, title, body, style = {}, css = '' }) {
  const p = paletteFor(theme, style);
  const cyber = theme === 'cyberpunk';
  const glass = theme === 'glass';
  const outline = cyber
    ? `0,14 14,0 ${width},0 ${width},${height - 14} ${width - 14},${height} 0,${height}`
    : null;
  const clip = cyber
    ? `<clipPath id="cardClip"><polygon points="${outline}"/></clipPath>`
    : `<clipPath id="cardClip"><rect width="${width}" height="${height}" rx="${glass ? 24 : 2}"/></clipPath>`;
  const bStroke = style.border || color;
  const bOpacity = style.border ? 1 : cyber ? 0.5 : 0.6;
  const border = style.hideBorder
    ? ''
    : cyber
      ? `<polygon points="${outline}" fill="none" stroke="${bStroke}" opacity="${bOpacity}"/>`
      : glass
        ? (style.border ? `<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="24" fill="none" stroke="${style.border}"/>` : '')
        : `<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="2" fill="none" stroke="${bStroke}" opacity="${bOpacity}"/>`;
  const layers = glass
    ? `<rect width="${width}" height="${height}" fill="url(#glassBg)"/>
      <circle cx="30" cy="20" r="70" fill="${color}" opacity="0.22" filter="url(#blob)"/>
      <circle cx="${width - 15}" cy="60" r="60" fill="#8b5cf6" opacity="0.18" filter="url(#blob)"/>
      <circle cx="${width - 30}" cy="${height - 30}" r="65" fill="${color}" opacity="0.14" filter="url(#blob)"/>
      <rect x="10" y="10" width="${width - 20}" height="${height - 20}" rx="18" fill="${style.bg ? p.bg : '#ffffff'}" opacity="${style.bg ? 0.7 : 0.55}" filter="url(#soft)"/>
      <rect x="10" y="10" width="${width - 20}" height="1.5" rx="1" fill="#ffffff" opacity="0.8"/>`
    : `<rect width="${width}" height="${height}" fill="${p.bg}"/>
      ${theme === 'terminal' ? '' : `<rect width="${width}" height="${height}" fill="url(#grid)" opacity="0.05"/><rect width="${width}" height="${height}" fill="url(#bgA)"/>`}`;
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <title>${esc(title)}</title>
    <defs>
      ${CHAKRA_PETCH_FONT_FACE || css ? `<style>${CHAKRA_PETCH_FONT_FACE || ''}${css}</style>` : ''}
      ${clip}
      <radialGradient id="bgA" cx="90%" cy="0%" r="90%">
        <stop offset="0%" stop-color="${color}" stop-opacity="${glass ? 0.16 : 0.13}"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </radialGradient>
      <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
        <path d="M24 0H0V24" fill="none" stroke="${color}" stroke-width="0.5" opacity="0.5"/>
      </pattern>
      <linearGradient id="glassBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${style.bg ? mixColors(p.bg, '#ffffff', 0.2) : '#eef1f8'}"/>
        <stop offset="100%" stop-color="${style.bg ? p.bg : '#dde3f0'}"/>
      </linearGradient>
      <filter id="soft"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-opacity="0.12"/></filter>
      <filter id="blob" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="26"/></filter>
      <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="2.4" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <g clip-path="url(#cardClip)">
      ${layers}
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
  return svgReply(body, status, cacheControl);
}

module.exports = { ink, inkTheme, FONT, THEMES, PALETTE, paletteFor, styleFromParams, sanitizeTheme, frame, errorCard, svgResponse };
