
const LANG_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Java: '#b07219',
  'C++': '#f34b7d', C: '#555555', 'C#': '#178600', PHP: '#4F5D95', Ruby: '#701516',
  Go: '#00ADD8', Rust: '#dea584', Swift: '#F05138', Kotlin: '#A97BFF', HTML: '#e34c26',
  CSS: '#563d7c', Shell: '#89e051', 'Vim Script': '#199f4b', Dockerfile: '#384d54',
  Vue: '#41b883', 'Jupyter Notebook': '#DA5B0B', Scala: '#c22d40', Dart: '#00B4AB',
  Elixir: '#6e4a7e', Haskell: '#5e5086', Lua: '#000080', Perl: '#0298c3', R: '#198CE7',
  'Objective-C': '#438eff', MATLAB: '#e16737', PowerShell: '#012456',
};

const colorForLang = (name, fallback) => LANG_COLORS[name] || fallback;

const XML_INVALID = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

function esc(str = '') {
  return String(str)
    .replace(XML_INVALID, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let fontCache;
try {
  fontCache = require('./font-data');
} catch {
  fontCache = null;
}

const CHAKRA_PETCH_FONT_FACE = fontCache;

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function readableAccent(color, theme) {
  if (!color) return color;
  const light = theme === 'glass';
  if (!light && luminance(color) < 0.02) return '#aab4c8';
  const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  const target = light ? 0 : 255;
  const ok = (c) => (light ? luminance(c) <= 0.75 : luminance(c) >= 0.12);
  let out = color;
  for (let t = 0.04; !ok(out) && t <= 1; t += 0.04) {
    out = `#${rgb.map((v) => Math.round(v + (target - v) * t).toString(16).padStart(2, '0')).join('')}`;
  }
  return out;
}

function sanitizeColor(input) {
  if (!input) return null;
  const hex = String(input).replace(/^#/, '');
  return /^[0-9a-fA-F]{6}$/.test(hex) ? `#${hex}` : null;
}

const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

const graphemes = (text) => (segmenter ? Array.from(segmenter.segment(text), (part) => part.segment) : Array.from(text));

function truncate(str, max) {
  const chars = graphemes(String(str ?? ''));
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : chars.join('');
}

const AVATAR_SHAPES = ['hex', 'circle', 'rounded', 'square'];

const sanitizeShape = (input, fallback) => {
  const value = String(input || '').toLowerCase();
  return AVATAR_SHAPES.includes(value) ? value : fallback;
};

function shapeElement(shape, size, inset) {
  const c = size / 2;
  const r = c - inset;
  const box = size - inset * 2;
  if (shape === 'circle') return `circle cx="${c}" cy="${c}" r="${r}"`;
  if (shape === 'rounded') return `rect x="${inset}" y="${inset}" width="${box}" height="${box}" rx="${(box * 0.3).toFixed(2)}"`;
  if (shape === 'square') return `rect x="${inset}" y="${inset}" width="${box}" height="${box}" rx="${(box * 0.08).toFixed(2)}"`;
  const points = [0, 1, 2, 3, 4, 5].map((k) => {
    const a = ((-90 + 60 * k) * Math.PI) / 180;
    return `${(c + r * Math.cos(a)).toFixed(2)},${(c + r * Math.sin(a)).toFixed(2)}`;
  });
  return `polygon points="${points.join(' ')}"`;
}

function avatarShape({ id, shape = 'hex', size, uri, ring, bg = '#0b1220', glow = false, ringWidth = 1.6 }) {
  const outer = shapeElement(shape, size, 0.75);
  const inner = shapeElement(shape, size, size * 0.06 + 1.5);
  return `
    <clipPath id="${id}"><${inner}/></clipPath>
    <${outer} fill="none" stroke="${ring}" stroke-opacity="0.35" stroke-width="1" stroke-linejoin="round"/>
    <${inner} fill="${bg}"/>
    ${uri ? `<image href="${uri}" x="0" y="0" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>` : ''}
    <${inner} fill="none" stroke="${ring}" stroke-width="${ringWidth}" stroke-linejoin="round"${glow ? ' filter="url(#glow)"' : ''}/>`;
}

const ICONS = {
  repo: '<path d="M2 4l4-2 4 2v5l-4 2-4-2V4Z"/><path d="M2 4l4 2 4-2"/><path d="M6 6v5"/>',
  star: '<path d="M6 1l1.5 3.2L11 4.7l-2.5 2.4.6 3.4L6 8.9 2.9 10.5l.6-3.4L1 4.7l3.5-.5L6 1Z" stroke-linejoin="round"/>',
  people: '<circle cx="4" cy="4" r="1.7"/><path d="M1 10.2c.5-2 1.8-3 3-3s2.5 1 3 3"/><circle cx="9.2" cy="4.6" r="1.3"/><path d="M8.1 10.2c.3-1.6 1-2.6 1.9-3"/>',
  bolt: '<path d="M6.6 1 2.2 7.2h2.9l-.9 3.8 4.6-6h-2.8L6.6 1Z" stroke-linejoin="round"/>',
  fork: '<circle cx="3" cy="2.5" r="1.4"/><circle cx="9" cy="2.5" r="1.4"/><circle cx="6" cy="9.5" r="1.4"/><path d="M3 3.9v1.6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V3.9"/><path d="M6 7.5v1"/>',
  pr: '<circle cx="3" cy="2.5" r="1.4"/><circle cx="3" cy="9.5" r="1.4"/><path d="M3 3.9v4.2"/><path d="M3 6c3.5 0 5-1 5-4.2"/><circle cx="8" cy="1.8" r="1.3"/>',
  issue: '<circle cx="6" cy="6" r="4.6"/><path d="M6 3.4v3.2"/><path d="M6 8.5v.01"/>',
  calendar: '<rect x="1.5" y="2" width="9" height="8.5" rx="1"/><path d="M1.5 5h9"/><path d="M4 1v2"/><path d="M8 1v2"/>',
  pin: '<path d="M6 1c-1.9 0-3.4 1.4-3.4 3.2 0 2.3 3.4 6.8 3.4 6.8s3.4-4.5 3.4-6.8C9.4 2.4 7.9 1 6 1Z"/><circle cx="6" cy="4.2" r="1.1"/>',
  building: '<path d="M2.5 10.5V3l3-1.5 3 1.5v7.5"/><path d="M2.5 10.5h6"/><path d="M5 10.5V7.5h1.5v3"/>',
  globe: '<circle cx="6" cy="6" r="4.8"/><path d="M1.2 6h9.6"/><path d="M6 1.2c1.8 1.8 1.8 8 0 9.6"/><path d="M6 1.2c-1.8 1.8-1.8 8 0 9.6"/>',
  license: '<path d="M6 1l4 1.8v3c0 3-1.7 5-4 6.2-2.3-1.2-4-3.2-4-6.2v-3L6 1Z"/><path d="M4.2 6.2l1.2 1.2 2.4-2.6"/>',
  code: '<path d="M4.2 3 1.4 6l2.8 3"/><path d="M7.8 3 10.6 6 7.8 9"/><path d="M6.8 2.2 5.2 9.8"/>',
  pulse: '<path d="M1 6.4h2.2L4.6 3l2.2 6.2L8 6.4h3" stroke-linejoin="round"/>',
  tag: '<path d="M1.6 6.2V1.8h4.4l4.4 4.4-4.4 4.4-4.4-4.4Z" stroke-linejoin="round"/><circle cx="4" cy="4" r=".7"/>',
  flame: '<path d="M6.2 1c.3 2.1-1.9 3-1.9 5.1 0 .9.7 1.7 1.7 1.7s1.8-.8 1.8-1.8c0-.5-.2-.9-.4-1.2 1.2.7 2 1.9 2 3.3A3.5 3.5 0 0 1 6 10.6a3.5 3.5 0 0 1-3.5-3.5C2.5 4 5.4 3.3 6.2 1Z" stroke-linejoin="round"/>',
  commit: '<circle cx="6" cy="6" r="2.2"/><path d="M1 6h2.8M8.2 6H11"/>',
  eye: '<path d="M1 6s1.9-3.4 5-3.4S11 6 11 6s-1.9 3.4-5 3.4S1 6 1 6Z" stroke-linejoin="round"/><circle cx="6" cy="6" r="1.4"/>',
  trophy: '<path d="M3.4 1.6h5.2v3a2.6 2.6 0 0 1-5.2 0v-3Z" stroke-linejoin="round"/><path d="M3.4 2.6H1.7c0 1.5.6 2.4 1.9 2.7"/><path d="M8.6 2.6h1.7c0 1.5-.6 2.4-1.9 2.7"/><path d="M6 7.2v2"/><path d="M4.2 10.4h3.6"/>',
};

const MONO = "ui-monospace,'JetBrains Mono','DejaVu Sans Mono',Menlo,Consolas,monospace";

const SANS = "system-ui,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

const DISPLAY = "'Chakra Petch',system-ui,'Segoe UI',Roboto,sans-serif";

function icon(name, x, y, color, scale = 1) {
  const sw = (1.3 / scale).toFixed(2);
  const t = scale === 1 ? `translate(${x},${y})` : `translate(${x},${y}) scale(${scale})`;
  return `<g transform="${t}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round">${ICONS[name]}</g>`;
}

const BADGE_SHAPES = ['hex', 'shield', 'diamond', 'octagon', 'circle', 'square'];

const sanitizeBadge = (input, fallback) => {
  const value = String(input || '').toLowerCase();
  return BADGE_SHAPES.includes(value) ? value : fallback;
};

function badgeElement(shape, cx, cy, size) {
  const r = size / 2;
  const f = (n) => n.toFixed(2);
  const ring = (count, offsetDeg, rad) => Array.from({ length: count }, (_, k) => {
    const a = ((offsetDeg + (360 / count) * k) * Math.PI) / 180;
    return `${f(cx + rad * Math.cos(a))},${f(cy + rad * Math.sin(a))}`;
  }).join(' ');
  if (shape === 'circle') return `circle cx="${cx}" cy="${cy}" r="${f(r)}"`;
  if (shape === 'square') return `rect x="${f(cx - r * 0.86)}" y="${f(cy - r * 0.86)}" width="${f(r * 1.72)}" height="${f(r * 1.72)}" rx="${f(r * 0.28)}"`;
  if (shape === 'diamond') return `polygon points="${ring(4, -90, r * 1.08)}"`;
  if (shape === 'octagon') return `polygon points="${ring(8, -67.5, r * 1.04)}"`;
  if (shape === 'shield') {
    const pts = [[0, -1], [0.88, -0.58], [0.88, 0.3], [0, 1.08], [-0.88, 0.3], [-0.88, -0.58]];
    return `polygon points="${pts.map(([px, py]) => `${f(cx + px * r)},${f(cy + py * r)}`).join(' ')}"`;
  }
  return `polygon points="${ring(6, -90, r * 1.04)}"`;
}

function badge({ shape = 'hex', cx, cy, size = 46, tier, iconName = 'star' }) {
  const earned = tier.index > 0;
  const el = badgeElement(shape, cx, cy, size);
  const inner = badgeElement(shape, cx, cy, size - 8);
  const iconScale = size / 30;
  const ic = icon(iconName, cx - 6 * iconScale, cy - 6 * iconScale, earned ? tier.color : '#5b6477', iconScale);
  return earned
    ? `<${el} fill="${tier.color}" fill-opacity="0.16" stroke="${tier.color}" stroke-width="1.8" stroke-linejoin="round" filter="url(#glow)"/>
    <${inner} fill="none" stroke="${tier.color}" stroke-opacity="0.35" stroke-width="1" stroke-linejoin="round"/>${ic}`
    : `<${el} fill="none" stroke="${tier.color}" stroke-width="1.5" stroke-dasharray="4 3" stroke-linejoin="round" opacity="0.75"/>${ic}`;
}

function svgHeaders(cacheControl) {
  const headers = {
    'Content-Type': 'image/svg+xml; charset=utf-8',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:",
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Origin': '*',
  };
  if (cacheControl) headers['Cache-Control'] = cacheControl;
  return headers;
}

function a11y(svg) {
  const hasTitle = svg.includes('<title>');
  const out = svg.replace(/<svg\b/, hasTitle ? '<svg role="img" aria-labelledby="cardTitle"' : '<svg role="img"');
  return hasTitle ? out.replace('<title>', '<title id="cardTitle">') : out;
}

function svgReply(body, status, cacheControl) {
  return new Response(a11y(body), { status, headers: svgHeaders(cacheControl) });
}

function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function mixColors(a, b, t) {
  const ch = (hex, i) => parseInt(hex.slice(i, i + 2), 16);
  return `#${[1, 3, 5].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t).toString(16).padStart(2, '0')).join('')}`;
}

module.exports = {
  svgHeaders, svgReply, a11y, contrastRatio, mixColors,
  colorForLang, esc, CHAKRA_PETCH_FONT_FACE, sanitizeColor, readableAccent, luminance, truncate, sanitizeShape, avatarShape, ICONS, MONO, SANS, DISPLAY, icon, BADGE_SHAPES, sanitizeBadge, badge,
};
