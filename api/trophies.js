const { checkRateLimit } = require('@vercel/firewall');
const { esc, ghFetch, computeStats, trophyTier, icon, sanitizeColor } = require('./_lib/shared');

function errorSVG(message) {
  return `<svg width="420" height="120" viewBox="0 0 420 120" xmlns="http://www.w3.org/2000/svg">
    <rect width="420" height="120" fill="#05070c"/>
    <rect width="420" height="120" fill="none" stroke="#ff4d6d"/>
    <text x="20" y="55" font-family="system-ui,sans-serif" font-weight="700" font-size="13" fill="#ff4d6d">TROPHY ERROR</text>
    <text x="20" y="78" font-family="'Courier New',monospace" font-size="11" fill="#7a8399">${esc(message)}</text>
  </svg>`;
}

const TROPHIES = [
  { key: 'STARGAZER', label: 'STARS', thresholds: [10, 50, 200, 1000], value: (s, u) => s.totalStars },
  { key: 'BUILDER', label: 'REPOS', thresholds: [10, 25, 50, 100], value: (s, u) => u.public_repos || 0 },
  { key: 'INFLUENCE', label: 'FOLLOWERS', thresholds: [10, 50, 200, 1000], value: (s, u) => u.followers || 0 },
  { key: 'VETERAN', label: 'YEARS', thresholds: [1, 3, 5, 8], value: (s, u) => Math.floor(s.years) },
  { key: 'POLYGLOT', label: 'LANGUAGES', thresholds: [3, 6, 10, 15], value: (s, u) => s.langs.length },
  { key: 'FORKED', label: 'FORKS', thresholds: [5, 25, 100, 500], value: (s, u) => s.totalForks },
  { key: 'OPEN_SOURCE', label: 'LICENSED', thresholds: [1, 5, 15, 30], value: (s, u) => s.licensedRepos },
];

// Optional 7th slot for a user-supplied metric (e.g. a Codewars rank),
// rendered through the same tiered-shield logic. Opt-in only.
function parseCustomTrophy(url) {
  const label = (url.searchParams.get('customLabel') || '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .slice(0, 10)
    .toUpperCase();
  const rawValue = url.searchParams.get('customValue');
  const rawThresholds = url.searchParams.get('customThresholds');
  if (!label || rawValue === null || !rawThresholds) return null;

  const value = Number(rawValue);
  if (!Number.isFinite(value)) return null;

  const thresholds = rawThresholds.split(',').map((s) => Number(s.trim()));
  if (thresholds.length !== 4 || thresholds.some((n) => !Number.isFinite(n))) return null;
  for (let i = 1; i < thresholds.length; i++) {
    if (thresholds[i] <= thresholds[i - 1]) return null; // must be strictly ascending
  }

  return { key: 'CUSTOM', label, thresholds, value: () => value };
}

const TROPHY_ICONS = {
  STARGAZER: 'star', BUILDER: 'repo', INFLUENCE: 'people', VETERAN: 'calendar',
  POLYGLOT: 'globe', FORKED: 'fork', OPEN_SOURCE: 'license', CUSTOM: 'bolt',
};

function shield(x, key, label, value, tier) {
  const w = 84;
  const points = `${x + w / 2},2 ${x + w - 2},18 ${x + w - 2},54 ${x + w / 2},70 ${x + 2},54 ${x + 2},18`;
  const earned = tier.index > 0;
  const pct = tier.nextThreshold ? Math.min(100, Math.round((value / tier.nextThreshold) * 100)) : 100;
  return `
    <polygon points="${points}" fill="${earned ? tier.color : 'none'}" fill-opacity="${earned ? 0.14 : 0}" stroke="${tier.color}" stroke-width="1.5"${earned ? ' filter="url(#glow)"' : ''}/>
    ${icon(TROPHY_ICONS[key] || 'star', x + w / 2 - 6, 22, tier.color)}
    <text x="${x + w / 2}" y="48" text-anchor="middle" class="val" fill="${tier.color}"${earned ? ' filter="url(#glow)"' : ''}>${value}</text>
    <text x="${x + w / 2}" y="88" text-anchor="middle" class="lbl">${label}</text>
    <text x="${x + w / 2}" y="99" text-anchor="middle" class="tier" fill="${tier.color}">${tier.name}</text>
    <rect x="${x + 10}" y="106" width="${w - 20}" height="3" fill="#1b2233"/>
    <rect x="${x + 10}" y="106" width="${((w - 20) * pct) / 100}" height="3" fill="${tier.color}"/>`;
}

function renderTrophies(user, stats, selected, trophyDefs) {
  const items = trophyDefs.filter((t) => !selected || selected.includes(t.key));
  const pitch = 90;
  const width = items.length * pitch + 16;
  const accent = stats.color || '#00e5ff';

  const badges = items.map((t, i) => {
    const value = t.value(stats, user);
    const tier = trophyTier(value, t.thresholds);
    return shield(8 + i * pitch, t.key, t.label, value, tier);
  }).join('');

  return `<svg width="${width}" height="120" viewBox="0 0 ${width} 120" xmlns="http://www.w3.org/2000/svg">
    <title>${esc(user.login)} — Achievements</title>
    <defs>
      <style>
        .val{font:700 16px system-ui,sans-serif;}
        .lbl{font:500 8px 'Courier New',monospace;fill:#7a8399;letter-spacing:.5px;}
        .tier{font:700 8px 'Courier New',monospace;letter-spacing:.5px;}
      </style>
      <radialGradient id="bg" cx="10%" cy="0%" r="90%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
      </radialGradient>
      <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
        <path d="M24 0H0V24" fill="none" stroke="${accent}" stroke-width="0.5" opacity="0.5"/>
      </pattern>
      <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="2" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <rect width="${width}" height="120" fill="#05070c"/>
    <rect width="${width}" height="120" fill="url(#grid)" opacity="0.05"/>
    <rect width="${width}" height="120" fill="url(#bg)"/>
    <rect width="${width}" height="120" fill="none" stroke="#1b2233"/>
    ${badges}
  </svg>`;
}

function svg(body, status, cacheControl) {
  const headers = { 'Content-Type': 'image/svg+xml' };
  if (cacheControl) headers['Cache-Control'] = cacheControl;
  return new Response(body, { status, headers });
}

module.exports.GET = async (request) => {
  const { rateLimited } = await checkRateLimit('trophies-endpoint', { request });
  if (rateLimited) return svg(errorSVG('rate limited — slow down a bit'), 429, 'no-store');

  const url = new URL(request.url);
  const username = (url.searchParams.get('username') || '').trim();
  if (!username) return svg(errorSVG('missing ?username='), 400);

  const rawSelected = url.searchParams.get('trophies');
  const selected = rawSelected ? rawSelected.split(',').map((s) => s.trim().toUpperCase()) : null;
  const customTrophy = parseCustomTrophy(url);
  const trophyDefs = customTrophy ? [...TROPHIES, customTrophy] : TROPHIES;

  const token = process.env.GITHUB_TOKEN;
  try {
    const user = await ghFetch(`https://api.github.com/users/${username}`, token);
    let repos = [];
    try {
      repos = await ghFetch(`https://api.github.com/users/${username}/repos?per_page=100&type=owner`, token);
    } catch {}

    const stats = computeStats(user, repos);
    stats.licensedRepos = repos.filter((r) => !r.fork && r.license && r.license.spdx_id && r.license.spdx_id !== 'NOASSERTION').length;
    const colorOverride = sanitizeColor(url.searchParams.get('color'));
    if (colorOverride) stats.color = colorOverride;

    return svg(renderTrophies(user, stats, selected, trophyDefs), 200, 'public, s-maxage=3600, stale-while-revalidate=86400');
  } catch (err) {
    if (err.status === 404) return svg(errorSVG(`user "${username}" not found`), 404, 'public, s-maxage=60');
    if (err.status === 403) return svg(errorSVG('rate limited — set GITHUB_TOKEN'), 503, 'public, s-maxage=60');
    return svg(errorSVG('failed to load'), 500, 'public, s-maxage=60');
  }
};
