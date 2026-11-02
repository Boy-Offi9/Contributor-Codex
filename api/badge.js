const { isRateLimited } = require('./_lib/ratelimit');
const {
  esc, ghFetch, computeStats, classFor, computeRank, sanitizeColor, readableAccent, contrastRatio,
  isGhName, truncate, svgReply, SANS,
} = require('./_lib/shared');
const { fetchCalendar, fetchStats, computeStreaks } = require('./_lib/contrib');

const HEIGHT = 20;
const CACHE_REST = 'public, s-maxage=3600, stale-while-revalidate=86400, stale-if-error=604800';
const CACHE_GRAPHQL = 'public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=604800';
const CACHE_ERR = 'public, s-maxage=60';
const STYLES = { flat: 3, pill: 10, square: 0 };
const GRADE_COLORS = { C: '#7a8399', B: '#00e5ff', 'B+': '#2dd4bf', A: '#8b5cf6', 'A+': '#ff4d6d', S: '#ffb020' };
const fmt = (n) => Number(n).toLocaleString('en-US');

const METRICS = {
  level: { label: 'level', source: 'rest', value: (d) => `LV ${d.stats.level}`, color: (d) => d.stats.color },
  xp: { label: 'xp', source: 'rest', value: (d) => fmt(d.stats.xp) },
  class: { label: 'class', source: 'rest', value: (d) => classFor(d.stats.topLang).toLowerCase(), color: (d) => d.stats.color },
  stars: { label: 'stars', source: 'rest', value: (d) => fmt(d.stats.totalStars) },
  followers: { label: 'followers', source: 'rest', value: (d) => fmt(d.user.followers || 0) },
  repos: { label: 'repos', source: 'rest', value: (d) => fmt(d.user.public_repos || 0) },
  rank: { label: 'rank', source: 'stats', value: (d) => d.rank.grade, color: (d) => GRADE_COLORS[d.rank.grade] },
  streak: { label: 'streak', source: 'calendar', value: (d) => `${d.streaks.current.length} ${d.streaks.current.length === 1 ? 'day' : 'days'}`, color: () => '#ff8a3d' },
  longest: { label: 'longest streak', source: 'calendar', value: (d) => `${d.streaks.longest.length} ${d.streaks.longest.length === 1 ? 'day' : 'days'}`, color: () => '#ff8a3d' },
  contributions: { label: 'contributions', source: 'calendar', value: (d) => fmt(d.streaks.total) },
};

function textWidth(text, size = 11) {
  let units = 0;
  for (const ch of Array.from(text)) {
    if (/[0-9]/.test(ch)) units += 0.62;
    else if (ch === 'M' || ch === 'W') units += 0.92;
    else if (/[A-Z]/.test(ch)) units += 0.68;
    else if (/[mw@%]/.test(ch)) units += 0.88;
    else if (/[iljft.,:;!|'` ]/.test(ch)) units += 0.34;
    else if (ch.codePointAt(0) > 0x2e7f) units += 1.05;
    else units += 0.57;
  }
  return Math.ceil(units * size);
}

function badgeSvg({ label, value, color, style, light }) {
  const radius = STYLES[style];
  const labelW = textWidth(label) + 14;
  const valueW = textWidth(value) + 14;
  const width = labelW + valueW;
  const labelBg = light ? '#e6eaf4' : '#1b2233';
  const labelFg = light ? '#3d4760' : '#c3cadb';
  const valueFg = contrastRatio('#05070c', color) >= contrastRatio('#ffffff', color) ? '#05070c' : '#ffffff';
  const gloss = style === 'square' ? '' : `<rect width="${width}" height="${HEIGHT}" fill="url(#gloss)"/>`;
  return `<svg width="${width}" height="${HEIGHT}" viewBox="0 0 ${width} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <title>${esc(label)}: ${esc(value)}</title>
    <defs>
      <clipPath id="clip"><rect width="${width}" height="${HEIGHT}" rx="${radius}"/></clipPath>
      <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.14"/><stop offset="1" stop-color="#000000" stop-opacity="0.12"/></linearGradient>
    </defs>
    <g clip-path="url(#clip)">
      <rect width="${labelW}" height="${HEIGHT}" fill="${labelBg}"/>
      <rect x="${labelW}" width="${valueW}" height="${HEIGHT}" fill="${color}"/>
      ${gloss}
    </g>
    <g font-family="${SANS}" font-size="11" text-anchor="middle">
      <text x="${labelW / 2}" y="14" fill="${labelFg}" textLength="${labelW - 14}" lengthAdjust="spacingAndGlyphs">${esc(label)}</text>
      <text x="${labelW + valueW / 2}" y="14" fill="${valueFg}" font-weight="700" textLength="${valueW - 14}" lengthAdjust="spacingAndGlyphs">${esc(value)}</text>
    </g>
  </svg>`;
}

const errorBadge = (message, status, style = 'flat') =>
  svgReply(badgeSvg({ label: 'codex', value: message, color: '#ff4d6d', style, light: false }), status, CACHE_ERR);

function describe(err) {
  if (err.status === 404) return ['not found', 404];
  if (err.status === 401) return [err.rejected ? 'token rejected' : 'needs token', 503];
  if (err.status === 429) return ['rate limited', 503];
  if (err.status === 403) return ['refused', 502];
  if (err.status === 504) return ['timeout', 504];
  return ['error', 500];
}

module.exports.GET = async (request) => {
  const rateLimited = await isRateLimited('badge-endpoint', request);
  if (rateLimited) return svgReply(badgeSvg({ label: 'codex', value: 'rate limited', color: '#ff4d6d', style: 'flat', light: false }), 429, 'no-store');

  const url = new URL(request.url);
  const username = (url.searchParams.get('username') || '').trim();
  const style = STYLES[url.searchParams.get('style')] === undefined ? 'flat' : url.searchParams.get('style');
  if (!username) return errorBadge('missing username', 400, style);
  if (!isGhName(username)) return errorBadge('invalid username', 400, style);
  const metricKey = (url.searchParams.get('metric') || 'level').toLowerCase();
  const metric = METRICS[metricKey];
  if (!metric) return errorBadge('unknown metric', 400, style);

  const token = process.env.GITHUB_TOKEN;
  try {
    const data = {};
    if (metric.source === 'rest') {
      const [user, repos] = await Promise.all([
        ghFetch(`https://api.github.com/users/${username}`, token),
        ghFetch(`https://api.github.com/users/${username}/repos?per_page=100&type=owner`, token).catch(() => []),
      ]);
      data.user = user;
      data.stats = computeStats(user, repos);
    } else if (metric.source === 'stats') {
      data.rank = computeRank(await fetchStats(username, token));
    } else {
      data.streaks = computeStreaks((await fetchCalendar(username, token)).days);
    }

    const light = url.searchParams.get('theme') === 'glass';
    const requested = sanitizeColor(url.searchParams.get('color'));
    const chosen = requested || (metric.color ? metric.color(data) : '#00e5ff');
    const color = readableAccent(chosen, light ? 'glass' : 'dark');
    const customLabel = (url.searchParams.get('label') || '').replace(/[\u0000-\u001F]/g, '').trim();
    const label = customLabel ? truncate(customLabel, 24) : metric.label;
    return svgReply(badgeSvg({ label, value: metric.value(data), color, style, light }), 200, metric.source === 'rest' ? CACHE_REST : CACHE_GRAPHQL);
  } catch (err) {
    const [message, status] = describe(err);
    return errorBadge(message, status, style);
  }
};
