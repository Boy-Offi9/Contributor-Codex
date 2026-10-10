const { checkRateLimit } = require('@vercel/firewall');
const {
  esc, ghFetch, avatarDataUri, computeStats, classFor, trophyTier, sanitizeColor,
  CHAKRA_PETCH_FONT_FACE, byteWeightedLangs, colorForLang, icon, badge, sanitizeBadge,
} = require('./_lib/shared');

const WIDTH = 480;

function errorSVG(message) {
  return `<svg width="480" height="120" viewBox="0 0 480 120" xmlns="http://www.w3.org/2000/svg">
    <rect width="480" height="120" fill="#05070c"/>
    <rect width="480" height="120" fill="none" stroke="#ff4d6d"/>
    <text x="20" y="55" font-family="system-ui,sans-serif" font-weight="700" font-size="13" fill="#ff4d6d">CODEX ERROR</text>
    <text x="20" y="78" font-family="system-ui,sans-serif" font-size="12" fill="#8a94ab">${esc(message)}</text>
  </svg>`;
}

// Fixed subset of the full trophy list — Collections is a glanceable
// dossier, not a full achievements card. Tiering logic duplicated from
// trophies.js rather than imported, keeping each endpoint independently
// deployable.
const COLLECTION_TROPHIES = [
  { key: 'STARGAZER', label: 'STARS', icon: 'star', thresholds: [10, 50, 200, 1000], value: (s, u) => s.totalStars },
  { key: 'BUILDER', label: 'REPOS', icon: 'repo', thresholds: [10, 25, 50, 100], value: (s, u) => u.public_repos || 0 },
  { key: 'POLYGLOT', label: 'LANGS', icon: 'globe', thresholds: [3, 6, 10, 15], value: (s, u) => s.langs.length },
  { key: 'VETERAN', label: 'YEARS', icon: 'calendar', thresholds: [1, 3, 5, 8], value: (s, u) => Math.floor(s.years) },
];

// Android swaps 'Courier New' for a thin serif face and downscaled README
// embeds shrink everything ~40%, so every label uses the embedded display
// font (system sans as fallback) and nothing is drawn below 10px.
const LABEL_FONT = "'Chakra Petch',system-ui,'Segoe UI',Roboto,sans-serif";

function statBox(x, y, w, label, value, color, iconName) {
  return `
    <rect x="${x}" y="${y}" width="${w}" height="58" fill="none" stroke="#1b2233"/>
    <rect x="${x}" y="${y}" width="${w}" height="2" fill="${color}" opacity="0.35"/>
    ${icon(iconName, x + 10, y + 9, color)}
    <text x="${x + 28}" y="${y + 20}" font-family="${LABEL_FONT}" font-weight="600" font-size="10" fill="#8a94ab" letter-spacing=".5">${label}</text>
    <text x="${x + 10}" y="${y + 46}" font-family="${LABEL_FONT}" font-weight="700" font-size="20" fill="${color}" filter="url(#glow)">${value}</text>`;
}

// One achievement cell: a compact framed icon, then value / label / tier as
// real text underneath, plus a thin progress bar toward the next tier.
function achievement(x, y, cellW, def, value, tier, shape) {
  const cx = x + cellW / 2;
  const pct = tier.nextThreshold ? Math.min(100, Math.round((value / tier.nextThreshold) * 100)) : 100;
  const barW = 56;
  return `
    ${badge({ shape, cx, cy: y + 24, size: 46, tier, iconName: def.icon })}
    <text x="${cx}" y="${y + 66}" text-anchor="middle" font-family="${LABEL_FONT}" font-weight="700" font-size="16" fill="${tier.color}">${value}</text>
    <text x="${cx}" y="${y + 80}" text-anchor="middle" font-family="${LABEL_FONT}" font-weight="600" font-size="10.5" fill="#8a94ab" letter-spacing=".8">${def.label}</text>
    <text x="${cx}" y="${y + 93}" text-anchor="middle" font-family="${LABEL_FONT}" font-weight="700" font-size="10" fill="${tier.color}" letter-spacing=".6">${tier.name}</text>
    <rect x="${cx - barW / 2}" y="${y + 99}" width="${barW}" height="3" fill="#1b2233"/>
    <rect x="${cx - barW / 2}" y="${y + 99}" width="${(barW * pct) / 100}" height="3" fill="${tier.color}"/>`;
}

function render({ user, stats, avatarUri, topLangs, fontFace, color, badgeShape }) {
  const displayFont = LABEL_FONT;
  const name = esc(user.name || user.login);
  const classLabel = classFor(stats.topLang);

  // Each section's Y offset derives from the one before it, so a new
  // section only requires one insertion, not re-deriving every coordinate.
  const headerH = 96;
  const statsY = headerH + 14;
  const shieldsY = statsY + 58 + 18;
  const langsY = shieldsY + 102 + 14;
  const langChips = topLangs.slice(0, 5);
  const height = langChips.length ? langsY + 56 : langsY + 4;

  const hexPoints = '30,18 70,18 78,48 70,78 30,78 22,48';
  const avatarTag = avatarUri
    ? `<image href="${avatarUri}" x="20" y="18" width="60" height="60" clip-path="url(#hexAvatar)" preserveAspectRatio="xMidYMid slice"/>`
    : `<polygon points="${hexPoints}" fill="#1b2233"/>`;

  const xpLabel = `${stats.xp.toLocaleString()} XP`;
  const boxW = 104;
  const cellW = (WIDTH - 40) / 4;

  return `<svg width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" xmlns="http://www.w3.org/2000/svg">
    <title>${esc(user.login)} — Codex Collection</title>
    <defs>
      ${fontFace ? `<style>${fontFace}</style>` : ''}
      <clipPath id="hexAvatar"><polygon points="${hexPoints}"/></clipPath>
      <radialGradient id="bg" cx="90%" cy="0%" r="90%">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="bg2" cx="5%" cy="100%" r="70%">
        <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.10"/>
        <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
      </radialGradient>
      <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
        <path d="M24 0H0V24" fill="none" stroke="${color}" stroke-width="0.5" opacity="0.5"/>
      </pattern>
      <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="2.4" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <clipPath id="cardClip"><polygon points="0,14 14,0 ${WIDTH},0 ${WIDTH},${height - 14} ${WIDTH - 14},${height} 0,${height}"/></clipPath>
    </defs>
    <g clip-path="url(#cardClip)">
      <rect width="${WIDTH}" height="${height}" fill="#05070c"/>
      <rect width="${WIDTH}" height="${height}" fill="url(#grid)" opacity="0.05"/>
      <rect width="${WIDTH}" height="${height}" fill="url(#bg)"/>
      <rect width="${WIDTH}" height="${height}" fill="url(#bg2)"/>
    </g>
    <polygon points="0,14 14,0 ${WIDTH},0 ${WIDTH},${height - 14} ${WIDTH - 14},${height} 0,${height}" fill="none" stroke="${color}" opacity="0.5"/>

    <polygon points="${hexPoints}" fill="#1b2233" stroke="${color}" filter="url(#glow)"/>
    ${avatarTag}
    <text x="94" y="36" font-family="${displayFont}" font-weight="700" font-size="19" fill="#e8edf5">${name}</text>
    <text x="94" y="54" font-family="${LABEL_FONT}" font-weight="600" font-size="12" fill="#8a94ab">@${esc(user.login)}</text>
    <text x="94" y="74" font-family="${LABEL_FONT}" font-weight="700" font-size="11" fill="${color}" letter-spacing=".6">${esc(classLabel.toUpperCase())}${stats.topLang ? ' · ' + esc(stats.topLang) : ''}</text>
    <rect x="${WIDTH - 78}" y="22" width="58" height="20" fill="${color}" filter="url(#glow)"/>
    <text x="${WIDTH - 49}" y="36" text-anchor="middle" font-family="${LABEL_FONT}" font-weight="700" font-size="12" fill="#05070c">LV ${stats.level}</text>
    ${icon('bolt', WIDTH - 20 - xpLabel.length * 6.6 - 16, 47, color)}
    <text x="${WIDTH - 20}" y="57" text-anchor="end" font-family="${LABEL_FONT}" font-weight="600" font-size="11.5" fill="#8a94ab">${xpLabel}</text>

    <line x1="20" y1="${headerH}" x2="${WIDTH - 20}" y2="${headerH}" stroke="#1b2233"/>

    ${statBox(20, statsY, boxW, 'STARS', stats.totalStars, color, 'star')}
    ${statBox(20 + (boxW + 8), statsY, boxW, 'FORKS', stats.totalForks, color, 'fork')}
    ${statBox(20 + 2 * (boxW + 8), statsY, boxW, 'FOLLOWERS', user.followers || 0, color, 'people')}
    ${statBox(20 + 3 * (boxW + 8), statsY, boxW, 'REPOS', user.public_repos || 0, color, 'repo')}

    ${COLLECTION_TROPHIES.map((t, i) => {
      const value = t.value(stats, user);
      const tier = trophyTier(value, t.thresholds);
      return achievement(20 + i * cellW, shieldsY, cellW, t, value, tier, badgeShape);
    }).join('')}

    ${langChips.length ? `
      <text x="20" y="${langsY + 14}" font-family="${LABEL_FONT}" font-weight="600" font-size="10.5" fill="#8a94ab" letter-spacing=".8">TOP LANGUAGES</text>
      ${(() => {
        let cx = 20;
        return langChips.map((lang) => {
          const w = 32 + lang.length * 7.4;
          if (cx + w > WIDTH - 20) return '';
          const chip = `<rect x="${cx}" y="${langsY + 24}" width="${w}" height="26" fill="none" stroke="#1b2233"/><circle cx="${cx + 13}" cy="${langsY + 37}" r="4" fill="${colorForLang(lang, color)}"/><text x="${cx + 24}" y="${langsY + 41.5}" font-family="${LABEL_FONT}" font-weight="600" font-size="11.5" fill="#d3d9e8">${esc(lang)}</text>`;
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
    const [avatarUri, langStats] = await Promise.all([
      avatarDataUri(`${user.avatar_url}&s=100`),
      byteWeightedLangs(repos, token),
    ]);
    const topLangs = langStats.map((l) => l.name);
    const color = sanitizeColor(url.searchParams.get('color')) || '#00e5ff';
    const badgeShape = sanitizeBadge(url.searchParams.get('badge'), 'hex');

    return svg(render({ user, stats, avatarUri, topLangs, fontFace: CHAKRA_PETCH_FONT_FACE, color, badgeShape }), 200, 'public, s-maxage=3600, stale-while-revalidate=86400');
  } catch (err) {
    if (err.status === 404) return svg(errorSVG(`user "${username}" not found`), 404, 'public, s-maxage=60');
    if (err.status === 403) return svg(errorSVG('rate limited — set GITHUB_TOKEN'), 503, 'public, s-maxage=60');
    return svg(errorSVG('failed to load'), 500, 'public, s-maxage=60');
  }
};
