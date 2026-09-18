const { checkRateLimit } = require('@vercel/firewall');
const { esc, ghFetch, computeStats, trophyTier } = require('./_lib/shared');

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
];

function shield(x, key, label, value, tier) {
  const points = `${x + 30},0 ${x + 60},15 ${x + 60},50 ${x + 30},70 ${x},50 ${x},15`;
  const pct = tier.nextThreshold ? Math.min(100, Math.round((value / tier.nextThreshold) * 100)) : 100;
  return `
    <polygon points="${points}" fill="${tier.index === 0 ? 'none' : tier.color}" fill-opacity="${tier.index === 0 ? 0 : 0.15}" stroke="${tier.color}" stroke-width="2"/>
    <text x="${x + 30}" y="34" text-anchor="middle" class="val" fill="${tier.color}">${value}</text>
    <text x="${x + 30}" y="88" text-anchor="middle" class="lbl">${label}</text>
    <text x="${x + 30}" y="100" text-anchor="middle" class="tier" fill="${tier.color}">${tier.name}</text>
    <rect x="${x + 8}" y="108" width="44" height="3" fill="#1b2233"/>
    <rect x="${x + 8}" y="108" width="${(44 * pct) / 100}" height="3" fill="${tier.color}"/>`;
}

function renderTrophies(user, stats, selected) {
  const items = TROPHIES.filter((t) => !selected || selected.includes(t.key));
  const width = items.length * 80 + 20;

  const badges = items.map((t, i) => {
    const value = t.value(stats, user);
    const tier = trophyTier(value, t.thresholds);
    return shield(20 + i * 80, t.key, t.label, value, tier);
  }).join('');

  return `<svg width="${width}" height="120" viewBox="0 0 ${width} 120" xmlns="http://www.w3.org/2000/svg">
    <title>${esc(user.login)} — Achievements</title>
    <defs>
      <style>
        .val{font:700 16px system-ui,sans-serif;}
        .lbl{font:500 8px 'Courier New',monospace;fill:#7a8399;letter-spacing:.5px;}
        .tier{font:700 8px 'Courier New',monospace;letter-spacing:.5px;}
      </style>
    </defs>
    <rect width="${width}" height="120" fill="#05070c"/>
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

  const token = process.env.GITHUB_TOKEN;
  try {
    const user = await ghFetch(`https://api.github.com/users/${username}`, token);
    let repos = [];
    try {
      repos = await ghFetch(`https://api.github.com/users/${username}/repos?per_page=100&type=owner`, token);
    } catch {}

    const stats = computeStats(user, repos);
    return svg(renderTrophies(user, stats, selected), 200, 'public, s-maxage=3600, stale-while-revalidate=86400');
  } catch (err) {
    if (err.status === 404) return svg(errorSVG(`user "${username}" not found`), 404, 'public, s-maxage=60');
    if (err.status === 403) return svg(errorSVG('rate limited — set GITHUB_TOKEN'), 503, 'public, s-maxage=60');
    return svg(errorSVG('failed to load'), 500, 'public, s-maxage=60');
  }
};
