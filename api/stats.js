const { checkRateLimit } = require('@vercel/firewall');
const { sanitizeColor, icon, esc, isGhName, readableAccent, luminance, computeRank } = require('./_lib/shared');
const { fetchStats } = require('./_lib/contrib');
const { FONT, paletteFor, styleFromParams, ink, inkTheme, sanitizeTheme, frame, errorCard, svgResponse } = require('./_lib/frame');

const WIDTH = 480;
const CACHE_OK = 'public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=604800';
const CACHE_ERR = 'public, s-maxage=60';

const CELLS = [
  { key: 'stars', label: 'Total Stars', icon: 'star', value: (s) => s.stars },
  { key: 'commits', label: 'Commits (12 mo)', icon: 'commit', value: (s) => s.commits },
  { key: 'prs', label: 'Pull Requests', icon: 'pr', value: (s) => s.prs },
  { key: 'issues', label: 'Issues', icon: 'issue', value: (s) => s.issues },
  { key: 'reviews', label: 'Reviews (12 mo)', icon: 'eye', value: (s) => s.reviews },
  { key: 'contrib', label: 'Contributed To', icon: 'repo', value: (s) => s.contributedTo },
];

const fmt = (n) => n.toLocaleString('en-US');
const flag = (v) => ['1', 'true', 'yes'].includes(String(v || '').toLowerCase());

function render({ stats, rank, cells, color, theme, style, animate }) {
  const p = paletteFor(theme, style);
  const y0 = 60;
  const rows = Math.max(1, Math.ceil(cells.length / 2));
  const gridH = Math.max(rows * 52, 104);
  const height = y0 + gridH + 18;

  const grid = cells.map((c, i) => {
    const x = 22 + (i % 2) * 170;
    const y = y0 + Math.floor(i / 2) * 52;
    return `${icon(c.icon, x, y + 3, color, 1.2)}
    <text x="${x + 22}" y="${y + 14}" font-family="${FONT}" font-weight="600" font-size="11" fill="${p.dim}">${c.label}</text>
    <text x="${x}" y="${y + 40}" font-family="${FONT}" font-weight="700" font-size="21" fill="${p.text}">${fmt(c.value(stats))}</text>`;
  }).join('');

  // Rank ring: progress toward the next grade (full at S).
  const r = 38;
  const circ = 2 * Math.PI * r;
  const cx = 412;
  const cy = y0 + gridH / 2 - 8;
  const offset = (circ * (1 - rank.progress)).toFixed(2);
  const css = animate ? `
    @media (prefers-reduced-motion: no-preference){
      .ringArc{animation:ringDraw 1.5s cubic-bezier(.22,.8,.3,1) .2s both}
      @keyframes ringDraw{from{stroke-dashoffset:${circ.toFixed(2)}}}
      .grade{animation:rise .8s ease-out both}
      @keyframes rise{from{opacity:0;transform:translateY(6px)}}
    }` : '';

  const body = `
    <text x="22" y="32" font-family="${FONT}" font-weight="700" font-size="12" fill="${ink(color, inkTheme(theme, style))}" letter-spacing="1">GITHUB STATS</text>
    <text x="${WIDTH - 22}" y="32" text-anchor="end" font-family="${FONT}" font-weight="600" font-size="11" fill="${p.dim}">@${esc(stats.login)}</text>
    ${grid}
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${p.track}" stroke-width="6"/>
    <circle class="ringArc" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"
      stroke-dasharray="${circ.toFixed(2)} ${circ.toFixed(2)}" stroke-dashoffset="${offset}" transform="rotate(-90 ${cx} ${cy})" filter="url(#glow)"/>
    <text class="grade" x="${cx}" y="${cy + 10}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${rank.grade.length > 1 ? 28 : 32}" fill="${p.text}">${esc(rank.grade)}</text>
    <text x="${cx}" y="${cy + r + 20}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="11" fill="${ink(color, inkTheme(theme, style))}" letter-spacing="1">RANK</text>
    <text x="${cx}" y="${cy + r + 35}" text-anchor="middle" font-family="${FONT}" font-weight="600" font-size="10.5" fill="${p.dim}">${rank.next ? `score ${fmt(rank.score)} · next ${esc(rank.next)}` : `score ${fmt(rank.score)} · max`}</text>`;

  return frame({ width: WIDTH, height, color, theme, style, css, title: `${stats.login} — GitHub stats, rank ${rank.grade}`, body });
}

module.exports.GET = async (request) => {
  const { rateLimited } = await checkRateLimit('stats-endpoint', { request });
  if (rateLimited) return svgResponse(errorCard('rate limited — slow down a bit'), 429, 'no-store');

  const url = new URL(request.url);
  const username = (url.searchParams.get('username') || '').trim();
  if (!username) return svgResponse(errorCard('missing ?username='), 400);
  if (!isGhName(username)) return svgResponse(errorCard('invalid username'), 400);

  // ?hide=stars,prs — unknown keys are ignored; at least one stat always stays.
  const hidden = new Set((url.searchParams.get('hide') || '').toLowerCase().split(',').map((x) => x.trim()));
  let cells = CELLS.filter((c) => !hidden.has(c.key));
  if (!cells.length) cells = CELLS;

  try {
    const stats = await fetchStats(username, process.env.GITHUB_TOKEN);
    const theme = sanitizeTheme(url.searchParams.get('theme'));
    const style = styleFromParams(url.searchParams, theme);
    const accentTheme = style.bg ? (luminance(style.bg) > 0.4 ? 'glass' : 'dark') : theme;
    const color = readableAccent(sanitizeColor(url.searchParams.get('color')), accentTheme) || '#00e5ff';
    const rank = computeRank(stats);
    return svgResponse(render({ stats, rank, cells, color, theme, style, animate: flag(url.searchParams.get('animate')) }), 200, CACHE_OK);
  } catch (err) {
    if (err.status === 404) return svgResponse(errorCard(`user "${username}" not found`), 404, CACHE_ERR);
    if (err.status === 401) return svgResponse(errorCard('stats need GITHUB_TOKEN on the server'), 503, CACHE_ERR);
    if (err.status === 403 || err.status === 429) return svgResponse(errorCard('rate limited — try again soon'), 503, CACHE_ERR);
    return svgResponse(errorCard('failed to load'), 500, CACHE_ERR);
  }
};
