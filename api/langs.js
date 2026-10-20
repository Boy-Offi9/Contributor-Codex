const { isRateLimited } = require('./_lib/ratelimit');
const { esc, ghFetch, sanitizeColor, byteWeightedLangs, colorForLang, isGhName, readableAccent, luminance } = require('./_lib/shared');
const { FONT, paletteFor, styleFromParams, ink, inkTheme, sanitizeTheme, frame, errorCard, svgResponse } = require('./_lib/frame');

const WIDTH = 480;
const CACHE_OK = 'public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=604800';
const CACHE_ERR = 'public, s-maxage=60';

function render({ username, langs, color, theme, style }) {
  const p = paletteFor(theme, style);
  const rows = Math.ceil(langs.length / 2);
  const height = 84 + rows * 26 + 14;
  const sum = langs.reduce((a, l) => a + l.bytes, 0) || 1;

  const barX = 22, barW = WIDTH - 44, barY = 50, barH = 10;
  let cursor = barX;
  const segs = langs.map((l) => {
    const w = (barW * l.bytes) / sum;
    const seg = `<rect x="${cursor.toFixed(2)}" y="${barY}" width="${Math.max(0, w - 1).toFixed(2)}" height="${barH}" fill="${colorForLang(l.name, color)}"/>`;
    cursor += w;
    return seg;
  }).join('');

  const colW = (WIDTH - 44) / 2;
  const legend = langs.map((l, i) => {
    const x = 22 + (i % 2) * colW;
    const y = 90 + Math.floor(i / 2) * 26;
    const pct = l.pct < 1 ? '<1' : l.pct;
    return `<circle cx="${x + 5}" cy="${y - 4}" r="4.5" fill="${colorForLang(l.name, color)}"/>
      <text x="${x + 17}" y="${y}" font-family="${FONT}" font-weight="600" font-size="12.5" fill="${p.sub}">${esc(l.name)}</text>
      <text x="${x + colW - 18}" y="${y}" text-anchor="end" font-family="${FONT}" font-weight="700" font-size="12.5" fill="${p.text}">${pct}%</text>`;
  }).join('');

  const body = `
    <defs><clipPath id="barClip"><rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="5"/></clipPath></defs>
    <text x="22" y="32" font-family="${FONT}" font-weight="700" font-size="12" fill="${ink(color, inkTheme(theme, style))}" letter-spacing="1">MOST USED LANGUAGES</text>
    <text x="${WIDTH - 22}" y="32" text-anchor="end" font-family="${FONT}" font-weight="600" font-size="11" fill="${p.dim}">@${esc(username)}</text>
    <rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="5" fill="${p.track}"/>
    <g clip-path="url(#barClip)">${segs}</g>
    ${legend}`;

  return frame({ width: WIDTH, height, color, theme, style, title: `${username} — Most used languages`, body });
}

module.exports.GET = async (request) => {
  const rateLimited = await isRateLimited('langs-endpoint', request);
  if (rateLimited) return svgResponse(errorCard('rate limited — slow down a bit'), 429, 'no-store');

  const url = new URL(request.url);
  const username = (url.searchParams.get('username') || '').trim();
  if (!username) return svgResponse(errorCard('missing ?username='), 400);
  if (!isGhName(username)) return svgResponse(errorCard('invalid username'), 400);
  const asked = Number(url.searchParams.get('limit'));
  const limit = Number.isInteger(asked) && asked >= 2 && asked <= 8 ? asked : 6;

  const token = process.env.GITHUB_TOKEN;
  try {
    const repos = await ghFetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&type=owner`, token);
    const langs = (await byteWeightedLangs(repos, token)).slice(0, limit);
    if (!langs.length) return svgResponse(errorCard('no language data for this account'), 200, CACHE_ERR);
    const theme = sanitizeTheme(url.searchParams.get('theme'));
    const style = styleFromParams(url.searchParams, theme);
    const accentTheme = style.bg ? (luminance(style.bg) > 0.4 ? 'glass' : 'dark') : theme;
    const color = readableAccent(sanitizeColor(url.searchParams.get('color')), accentTheme) || '#00e5ff';
    return svgResponse(render({ username, langs, color, theme, style }), 200, CACHE_OK);
  } catch (err) {
    if (err.status === 404) return svgResponse(errorCard(`user "${username}" not found`), 404, CACHE_ERR);
    if (err.status === 403) return svgResponse(errorCard('rate limited — set GITHUB_TOKEN'), 503, CACHE_ERR);
    if (err.status === 504) return svgResponse(errorCard('GitHub is slow right now — try again soon'), 504, CACHE_ERR);
    return svgResponse(errorCard('failed to load'), 500, CACHE_ERR);
  }
};
