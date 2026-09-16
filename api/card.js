// Vercel serverless function — no framework needed, /api/*.js is auto-detected.
// GET /api/card?username=octocat
//   -> image/svg+xml, cacheable, safe to embed as <img src="..."> in any README.

const LANG_CLASS = {
  JavaScript: 'NETRUNNER', TypeScript: 'CIPHER ADEPT', Python: 'DATA MAGE',
  Java: 'IRON WARDEN', Kotlin: 'IRON WARDEN', Go: 'FORGE RUNNER', Rust: 'VOID SMITH',
  C: 'CORE ENGINEER', 'C++': 'CORE ENGINEER', 'C#': 'CORE ENGINEER',
  HTML: 'SIGNAL WEAVER', CSS: 'SIGNAL WEAVER', Shell: 'TERMINAL RONIN',
  Swift: 'GLASS ARCHITECT', Dart: 'GLASS ARCHITECT', Ruby: 'RUNE SMITH',
  PHP: 'GRID WARDEN', Vue: 'SIGNAL WEAVER',
};

const classFor = (lang) => LANG_CLASS[lang] || 'WANDERER';

function rarityFor(level) {
  if (level >= 25) return { color: '#ffb020', rank: 'LEGENDARY' };
  if (level >= 16) return { color: '#ff4d6d', rank: 'ELITE' };
  if (level >= 10) return { color: '#8b5cf6', rank: 'SPECIALIST' };
  if (level >= 5)  return { color: '#00e5ff', rank: 'OPERATIVE' };
  return { color: '#7a8399', rank: 'INITIATE' };
}

function esc(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function ghFetch(url, token) {
  const headers = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `token ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const err = new Error(String(res.status));
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function avatarDataUri(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

function statBar(y, label, value, max, color) {
  const pct = Math.max(4, Math.min(100, Math.round((value / max) * 100)));
  return `
    <text x="28" y="${y}" class="lbl">${label}</text>
    <text x="332" y="${y}" text-anchor="end" class="lbl">${value}</text>
    <rect x="28" y="${y + 6}" width="304" height="4" fill="#1b2233"/>
    <rect x="28" y="${y + 6}" width="${(304 * pct) / 100}" height="4" fill="${color}"/>`;
}

function renderCardSVG({ user, avatarUri, topLang, level, xp, totalStars, rank, color }) {
  const name = esc(user.name || user.login);
  const classLabel = `${classFor(topLang)}${topLang ? ' · ' + esc(topLang) : ''}`;
  const avatarTag = avatarUri
    ? `<image href="${avatarUri}" x="4" y="5" width="64" height="62" clip-path="url(#hex)"/>`
    : '';

  return `<svg width="360" height="360" viewBox="0 0 360 360" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>
        .t1{font:700 16px system-ui,sans-serif;fill:#e8edf5;}
        .t2{font:500 11px 'Courier New',monospace;fill:#7a8399;}
        .lbl{font:500 9px 'Courier New',monospace;fill:#7a8399;letter-spacing:1px;}
        .tag{font:700 11px 'Courier New',monospace;}
        .cls{font:600 11px system-ui,sans-serif;fill:${color};letter-spacing:1px;}
      </style>
      <clipPath id="hex"><polygon points="36,2 68,20 68,52 36,70 4,52 4,20"/></clipPath>
      <radialGradient id="bg" cx="15%" cy="0%" r="85%">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <rect width="360" height="360" fill="#05070c"/>
    <rect width="360" height="360" fill="url(#bg)"/>
    <polygon points="0,14 14,0 360,0 360,346 346,360 0,360" fill="none" stroke="#1b2233"/>
    <polygon points="0,14 14,0 360,0 360,346 346,360 0,360" fill="none" stroke="${color}" opacity="0.5">
      <animate attributeName="opacity" values="0.4;0.85;0.4" dur="3s" repeatCount="indefinite"/>
    </polygon>

    <rect x="20" y="20" width="58" height="20" fill="${color}"/>
    <text x="49" y="34" text-anchor="middle" class="tag" fill="#05070c">LV ${level}</text>
    <rect x="270" y="20" width="70" height="20" fill="none" stroke="${color}"/>
    <text x="305" y="34" text-anchor="middle" class="tag" fill="${color}">${rank}</text>

    <g transform="translate(144,54)">
      <polygon points="36,0 72,18 72,54 36,72 0,54 0,18" fill="#1b2233" stroke="${color}"/>
      ${avatarTag}
    </g>

    <text x="180" y="156" text-anchor="middle" class="t1">${name}</text>
    <text x="180" y="174" text-anchor="middle" class="t2">@${esc(user.login)}</text>
    <text x="180" y="194" text-anchor="middle" class="cls">${esc(classLabel.toUpperCase())}</text>

    ${statBar(224, 'REPOS', user.public_repos || 0, 60, color)}
    ${statBar(254, 'STARS', totalStars, 200, color)}
    ${statBar(284, 'FOLLOWERS', user.followers || 0, 200, color)}

    <line x1="28" y1="312" x2="332" y2="312" stroke="#1b2233" stroke-dasharray="3,3"/>
    <text x="28" y="336" class="lbl">XP</text>
    <text x="332" y="336" text-anchor="end" class="t1">${xp.toLocaleString()}</text>
  </svg>`;
}

function errorSVG(message) {
  return `<svg width="360" height="120" viewBox="0 0 360 120" xmlns="http://www.w3.org/2000/svg">
    <rect width="360" height="120" fill="#05070c"/>
    <rect width="360" height="120" fill="none" stroke="#ff4d6d"/>
    <text x="20" y="55" font="700 13px system-ui,sans-serif" fill="#ff4d6d">CARD ERROR</text>
    <text x="20" y="78" font="500 11px 'Courier New',monospace" fill="#7a8399">${esc(message)}</text>
  </svg>`;
}

module.exports = async (req, res) => {
  const username = (req.query.username || '').trim();
  res.setHeader('Content-Type', 'image/svg+xml');

  if (!username) {
    res.status(400).send(errorSVG('missing ?username='));
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  try {
    const user = await ghFetch(`https://api.github.com/users/${username}`, token);
    let repos = [];
    try {
      repos = await ghFetch(`https://api.github.com/users/${username}/repos?per_page=100&type=owner`, token);
    } catch { /* repos failing shouldn't kill the card */ }
    const avatarUri = await avatarDataUri(`${user.avatar_url}&s=160`);

    const original = repos.filter((r) => !r.fork);
    const langCounts = {};
    let totalStars = 0;
    original.forEach((r) => {
      totalStars += r.stargazers_count || 0;
      if (r.language) langCounts[r.language] = (langCounts[r.language] || 0) + 1;
    });
    const topLang = Object.entries(langCounts).sort((a, b) => b[1] - a[1]).map(([l]) => l)[0] || null;

    const ageYears = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365);
    const xp = (user.followers || 0) * 10 + (user.public_repos || 0) * 15 + totalStars * 5 + Math.floor(ageYears) * 20;
    const level = Math.max(1, Math.min(99, 1 + Math.floor(Math.sqrt(xp) / 6)));
    const { color, rank } = rarityFor(level);

    // Cached at the edge for an hour; served stale (refreshed in the background)
    // for up to a day after that so a burst of README views never hits GitHub's
    // API directly and risks the 60/hr unauthenticated cap.
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(renderCardSVG({ user, avatarUri, topLang, level, xp, totalStars, rank, color }));
  } catch (err) {
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    if (err.status === 404) res.status(404).send(errorSVG(`user "${username}" not found`));
    else if (err.status === 403) res.status(503).send(errorSVG('rate limited — set GITHUB_TOKEN'));
    else res.status(500).send(errorSVG('failed to load'));
  }
};
