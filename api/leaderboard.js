// GET /api/leaderboard?org=boy-offi9-inc&limit=10
//   -> image/svg+xml — a wide ranked banner, embeddable directly in the org README.

const { classFor, esc, ghFetch, avatarDataUri, computeStats, sanitizeColor } = require('./_lib/shared');

const ROW_H = 56;
const WIDTH = 640;
const HEADER_H = 50;

function errorSVG(message, height = 100) {
  return `<svg width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${WIDTH}" height="${height}" fill="#05070c"/>
    <rect width="${WIDTH}" height="${height}" fill="none" stroke="#ff4d6d"/>
    <text x="20" y="${height / 2}" font="700 13px system-ui,sans-serif" fill="#ff4d6d">LEADERBOARD ERROR — ${esc(message)}</text>
  </svg>`;
}

function row(index, entry, total) {
  const y = HEADER_H + index * ROW_H;
  const { user, avatarUri, topLang, level, xp, rank, color } = entry;
  const name = esc(user.name || user.login);
  const classLabel = `${classFor(topLang)}${topLang ? ' · ' + esc(topLang) : ''}`;
  const avatarTag = avatarUri
    ? `<image href="${avatarUri}" x="8" y="${y}" width="56" height="56" preserveAspectRatio="xMidYMid slice" clip-path="url(#hexSmall${index})"/>`
    : `<rect x="16" y="${y + 8}" width="40" height="40" fill="#1b2233"/>`;

  return `
    <clipPath id="hexSmall${index}"><polygon points="20,${y + 8} 40,${y + 18} 40,${y + 38} 20,${y + 48} 0,${y + 38} 0,${y + 18}" transform="translate(16,0)"/></clipPath>
    ${index < total - 1 ? `<line x1="16" y1="${y + ROW_H}" x2="${WIDTH - 16}" y2="${y + ROW_H}" stroke="#1b2233" stroke-dasharray="2,3"/>` : ''}
    <text x="72" y="${y + 8}" class="rankNum" fill="${color}">#${index + 1}</text>
    ${avatarTag}
    <text x="98" y="${y + 24}" class="name">${name}</text>
    <text x="98" y="${y + 40}" class="cls" fill="${color}">${esc(classLabel.toUpperCase())}</text>
    <rect x="${WIDTH - 150}" y="${y + 14}" width="46" height="18" fill="${color}"/>
    <text x="${WIDTH - 127}" y="${y + 27}" text-anchor="middle" class="tag" fill="#05070c">LV ${level}</text>
    <text x="${WIDTH - 20}" y="${y + 27}" text-anchor="end" class="xp">${xp.toLocaleString()} XP</text>`;
}

async function buildEntry(login, token) {
  const user = await ghFetch(`https://api.github.com/users/${login}`, token);
  let repos = [];
  try {
    repos = await ghFetch(`https://api.github.com/users/${login}/repos?per_page=100&type=owner`, token);
  } catch { /* ok without repos */ }
  const avatarUri = await avatarDataUri(`${user.avatar_url}&s=80`);
  return { user, avatarUri, ...computeStats(user, repos) };
}

module.exports = async (req, res) => {
  const org = (req.query.org || '').trim();
  const limit = Math.max(1, Math.min(20, parseInt(req.query.limit, 10) || 10));
  const accent = sanitizeColor(req.query.color) || '#00e5ff';
  res.setHeader('Content-Type', 'image/svg+xml');

  if (!org) {
    res.status(400).send(errorSVG('missing ?org='));
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  try {
    const members = await ghFetch(`https://api.github.com/orgs/${org}/members?per_page=100`, token);
    if (!members.length) {
      res.status(404).send(errorSVG(`"${org}" has no public members`));
      return;
    }

    const entries = [];
    for (const m of members) {
      try { entries.push(await buildEntry(m.login, token)); } catch { /* skip users that fail to load */ }
    }
    entries.sort((a, b) => b.xp - a.xp);
    const top = entries.slice(0, limit);

    const height = HEADER_H + top.length * ROW_H + 12;
    const rowsSVG = top.map((entry, i) => row(i, entry, top.length)).join('');

    const svg = `<svg width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .title{font:700 15px system-ui,sans-serif;fill:#e8edf5;letter-spacing:1px;}
          .rankNum{font:700 13px 'Courier New',monospace;}
          .name{font:600 13px system-ui,sans-serif;fill:#e8edf5;}
          .cls{font:600 9px system-ui,sans-serif;letter-spacing:.5px;}
          .tag{font:700 10px 'Courier New',monospace;}
          .xp{font:700 12px system-ui,sans-serif;fill:#e8edf5;}
        </style>
        <radialGradient id="bg" cx="10%" cy="0%" r="90%">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.10"/>
          <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${WIDTH}" height="${height}" fill="#05070c"/>
      <rect width="${WIDTH}" height="${height}" fill="url(#bg)"/>
      <rect width="${WIDTH}" height="${height}" fill="none" stroke="#1b2233"/>
      <text x="16" y="30" class="title">${esc(org.toUpperCase())} // LEADERBOARD</text>
      <line x1="16" y1="${HEADER_H - 8}" x2="${WIDTH - 16}" y2="${HEADER_H - 8}" stroke="#1b2233"/>
      ${rowsSVG}
    </svg>`;

    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');
    res.status(200).send(svg);
  } catch (err) {
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    if (err.status === 404) res.status(404).send(errorSVG(`org "${org}" not found`));
    else if (err.status === 403) res.status(503).send(errorSVG('rate limited — set GITHUB_TOKEN'));
    else res.status(500).send(errorSVG('failed to load'));
  }
};
