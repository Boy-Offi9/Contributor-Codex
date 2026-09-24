const { checkRateLimit } = require('@vercel/firewall');
const {
  esc, ghFetch, avatarDataUri, computeStats, classFor,
  trophyTier, sanitizeColor, CHAKRA_PETCH_FONT_FACE, byteWeightedLangs,
} = require('./_lib/shared');

const WIDTH = 480;

function errorSVG(message) {
  return `<svg width="480" height="120" viewBox="0 0 480 120" xmlns="http://www.w3.org/2000/svg">
    <rect width="480" height="120" fill="#05070c"/>
    <rect width="480" height="120" fill="none" stroke="#ff4d6d"/>
    <text x="20" y="55" font-family="system-ui,sans-serif" font-weight="700" font-size="13" fill="#ff4d6d">CODEX ERROR</text>
    <text x="20" y="78" font-family="'Courier New',monospace" font-size="11" fill="#7a8399">${esc(message)}</text>
  </svg>`;
}

// A small, fixed subset of the full trophy list — Collections is meant to be
// one glanceable dossier, not a full achievements card (that's what
// /api/trophies is for). Same tiering logic as trophies.js, duplicated
// rather than imported to keep each endpoint independently deployable, same
// pattern already used for errorSVG/svg() across every card in this repo.
const COLLECTION_TROPHIES = [
  { key: 'STARGAZER', label: 'STARS', thresholds: [10, 50, 200, 1000], value: (s, u) => s.totalStars },
  { key: 'BUILDER', label: 'REPOS', thresholds: [10, 25, 50, 100], value: (s, u) => u.public_repos || 0 },
  { key: 'POLYGLOT', label: 'LANGS', thresholds: [3, 6, 10, 15], value: (s, u) => s.langs.length },
  { key: 'VETERAN', label: 'YEARS', thresholds: [1, 3, 5, 8], value: (s, u) => Math.floor(s.years) },
];

function statBox(x, y, w, label, value, color) {
  return `
    <rect x="${x}" y="${y}" width="${w}" height="54" fill="none" stroke="#1b2233"/>
    <text x="${x + 10}" y="${y + 19}" font-family="'Courier New',monospace" font-size="8.5" fill="#7a8399" letter-spacing="1">${label}</text>
    <text x="${x + 10}" y="${y + 40}" font-family="system-ui,sans-serif" font-weight="700" font-size="17" fill="${color}">${value}</text>`;
}

function shield(x, y, label, value, tier) {
  const w = 96;
  const points = `${x + w / 2},${y} ${x + w},${y + 12} ${x + w},${y + 40} ${x + w / 2},${y + 54} ${x},${y + 40} ${x},${y + 12}`;
  return `
    <polygon points="${points}" fill="${tier.index === 0 ? 'none' : tier.color}" fill-opacity="${tier.index === 0 ? 0 : 0.15}" stroke="${tier.color}" stroke-width="1.5"/>
    <text x="${x + w / 2}" y="${y + 26}" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="700" font-size="13" fill="${tier.color}">${value}</text>
    <text x="${x + w / 2}" y="${y + 40}" text-anchor="middle" font-family="'Courier New',monospace" font-size="7.5" fill="#7a8399" letter-spacing=".5">${label}</text>
    <text x="${x + w / 2}" y="${y + 50}" text-anchor="middle" font-family="'Courier New',monospace" font-size="7" font-weight="700" fill="${tier.color}">${tier.name}</text>`;
}

function render({ user, stats, avatarUri, topLangs, fontFace, color }) {
  const displayFont = fontFace ? "'Chakra Petch',system-ui,sans-serif" : 'system-ui,sans-serif';
  const name = esc(user.name || user.login);
  const classLabel = classFor(stats.topLang);

  // Running layout, same pattern used in repo.js's detailed theme: each
  // section's Y is derived from the one before it, so inserting a new
  // section later doesn't require re-deriving every coordinate below it.
  const headerH = 96;
  const statsY = headerH + 14;
  const shieldsY = statsY + 68;
  const langsY = shieldsY + 78;
  const langChips = topLangs.slice(0, 5);
  const height = langChips.length ? langsY + 40 : langsY + 4;

  const avatarTag = avatarUri
    ? `<image href="${avatarUri}" x="20" y="18" width="60" height="60" clip-path="url(#hexAvatar)" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="20" y="18" width="60" height="60" fill="#1b2233"/>`;

  return `<svg width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" xmlns="http://www.w3.org/2000/svg">
    <title>${esc(user.login)} — Codex Collection</title>
    <defs>
      ${fontFace ? `<style>${fontFace}</style>` : ''}
      <clipPath id="hexAvatar"><polygon points="30,18 70,18 78,48 70,78 30,78 22,48"/></clipPath>
      <radialGradient id="bg" cx="90%" cy="0%" r="90%">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${WIDTH}" height="${height}" fill="#05070c"/>
    <rect width="${WIDTH}" height="${height}" fill="url(#bg)"/>
    <polygon points="0,14 14,0 ${WIDTH},0 ${WIDTH},${height - 14} ${WIDTH - 14},${height} 0,${height}" fill="none" stroke="${color}" opacity="0.5"/>

    ${avatarTag}
    <text x="94" y="36" font-family="${displayFont}" font-weight="700" font-size="17" fill="#e8edf5">${name}</text>
    <text x="94" y="53" font-family="'JetBrains Mono','Courier New',monospace" font-size="11" fill="#7a8399">@${esc(user.login)}</text>
    <text x="94" y="72" font-family="'Courier New',monospace" font-size="9.5" fill="${color}" letter-spacing=".5">${esc(classLabel.toUpperCase())}${stats.topLang ? ' · ' + esc(stats.topLang) : ''}</text>
    <text x="${WIDTH - 20}" y="36" text-anchor="end" font-family="${displayFont}" font-weight="700" font-size="15" fill="${color}">LV ${stats.level}</text>
    <text x="${WIDTH - 20}" y="53" text-anchor="end" font-family="'Courier New',monospace" font-size="10" fill="#7a8399">${stats.xp.toLocaleString()} XP</text>

    <line x1="20" y1="${headerH}" x2="${WIDTH - 20}" y2="${headerH}" stroke="#1b2233"/>

    ${statBox(20, statsY, 105, 'STARS', stats.totalStars, color)}
    ${statBox(133, statsY, 105, 'FORKS', stats.totalForks, color)}
    ${statBox(246, statsY, 105, 'FOLLOWERS', user.followers || 0, color)}
    ${statBox(359, statsY, 101, 'REPOS', user.public_repos || 0, color)}

    ${COLLECTION_TROPHIES.map((t, i) => {
      const value = t.value(stats, user);
      const tier = trophyTier(value, t.thresholds);
      return shield(20 + i * 108, shieldsY, t.label, value, tier);
    }).join('')}

    ${langChips.length ? `
      <text x="20" y="${langsY + 14}" font-family="'Courier New',monospace" font-size="8.5" fill="#7a8399" letter-spacing="1">TOP LANGUAGES</text>
      ${(() => {
        let cx = 20;
        return langChips.map((lang) => {
          const w = 16 + lang.length * 7;
          const chip = `<rect x="${cx}" y="${langsY + 22}" width="${w}" height="20" fill="none" stroke="${color}"/><text x="${cx + w / 2}" y="${langsY + 36}" text-anchor="middle" font-family="'Courier New',monospace" font-size="9.5" fill="${color}">${esc(lang)}</text>`;
          cx += w + 8;
          return chip;
        }).join('');
      })()}` : ''}
  </svg>`;
}

function svg(body, status, cacheControl) {
  const headers = { 'Content-Type': 'image/svg+xml' };
  if (cacheControl) headers['Cache-Control'] = cacheControl;
  return new Response(body, { status, headers });
}

module.exports.GET = async (request) => {
  const { rateLimited } = await checkRateLimit('codex-endpoint', { request });
  if (rateLimited) return svg(errorSVG('rate limited — slow down a bit'), 429, 'no-store');

  const url = new URL(request.url);
  const username = (url.searchParams.get('username') || '').trim();
  if (!username) return svg(errorSVG('missing ?username='), 400);

  const token = process.env.GITHUB_TOKEN;
  try {
    const user = await ghFetch(`https://api.github.com/users/${username}`, token);
    let repos = [];
    try {
      repos = await ghFetch(`https://api.github.com/users/${username}/repos?per_page=100&type=owner`, token);
    } catch {}

    const stats = computeStats(user, repos);
    const [avatarUri, topLangs] = await Promise.all([
      avatarDataUri(`${user.avatar_url}&s=100`),
      byteWeightedLangs(repos, token),
    ]);
    const color = sanitizeColor(url.searchParams.get('color')) || '#00e5ff';

    return svg(render({ user, stats, avatarUri, topLangs, fontFace: CHAKRA_PETCH_FONT_FACE, color }), 200, 'public, s-maxage=3600, stale-while-revalidate=86400');
  } catch (err) {
    if (err.status === 404) return svg(errorSVG(`user "${username}" not found`), 404, 'public, s-maxage=60');
    if (err.status === 403) return svg(errorSVG('rate limited — set GITHUB_TOKEN'), 503, 'public, s-maxage=60');
    return svg(errorSVG('failed to load'), 500, 'public, s-maxage=60');
  }
};
