const { checkRateLimit } = require('@vercel/firewall');
const { classFor, esc, ghFetch, avatarDataUri, computeStats, sanitizeColor, XP_FORMULA } = require('./_lib/shared');

const ROW_H = 56;
const WIDTH = 640;
const HEADER_H = 50;

function errorSVG(message, height = 100) {
  return `<svg width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${WIDTH}" height="${height}" fill="#05070c"/>
    <rect width="${WIDTH}" height="${height}" fill="none" stroke="#ff4d6d"/>
    <text x="20" y="${height / 2 + 5}" font-family="'Courier New',monospace" font-size="12" fill="#ff4d6d">${esc(message)}</text>
  </svg>`;
}

async function buildEntry(login, token) {
  const user = await ghFetch(`https://api.github.com/users/${login}`, token);
  let repos = [];
  try {
    repos = await ghFetch(`https://api.github.com/users/${login}/repos?per_page=100&type=owner`, token);
  } catch {}
  const avatarUri = await avatarDataUri(`${user.avatar_url}&s=100`);
  const stats = computeStats(user, repos);
  return { user, avatarUri, ...stats };
}

function cyberpunkRow(index, entry, total) {
  const y = HEADER_H + index * ROW_H;
  const { user, avatarUri, topLang, level, xp, color } = entry;
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
    <text x="${WIDTH - 20}" y="${y + 27}" text-anchor="end" class="xp"><title>${XP_FORMULA}</title>${xp.toLocaleString()} XP</text>`;
}

function renderCyberpunkBoard(org, top, accent) {
  const height = HEADER_H + top.length * ROW_H + 12;
  const rows = top.map((entry, i) => cyberpunkRow(i, entry, top.length)).join('');

  return `<svg width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" xmlns="http://www.w3.org/2000/svg">
    <title>${esc(org)} — Team Leaderboard. XP = ${XP_FORMULA}</title>
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
    ${rows}
  </svg>`;
}

function terminalRow(index, entry) {
  const y = 48 + index * 22;
  const { user, level, xp } = entry;
  const login = esc(user.login).padEnd(20, ' ');
  return `<text x="16" y="${y}" class="term">#${String(index + 1).padStart(2, '0')}  ${login} lv${String(level).padStart(2, '0')}  ${xp.toLocaleString()} xp</text>`;
}

function renderTerminalBoard(org, top) {
  const green = '#3ddc6a';
  const height = 60 + top.length * 22 + 16;
  return `<svg width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" xmlns="http://www.w3.org/2000/svg">
    <title>${esc(org)} — Team Leaderboard (terminal theme). XP = ${XP_FORMULA}</title>
    <defs><style>.term{font:400 13px 'Courier New',monospace;fill:${green};}.head{font:700 13px 'Courier New',monospace;fill:${green};}</style></defs>
    <rect width="${WIDTH}" height="${height}" fill="#020402"/>
    <rect width="${WIDTH}" height="${height}" fill="none" stroke="${green}" opacity="0.5"/>
    <text x="16" y="28" class="head">$ leaderboard --org=${esc(org)}</text>
    ${top.map((entry, i) => terminalRow(i, entry)).join('')}
  </svg>`;
}

function glassRow(index, entry, accent) {
  const y = 76 + index * 58;
  const { user, avatarUri, topLang, level, xp } = entry;
  const name = esc(user.name || user.login);
  const classLabel = classFor(topLang);
  const avatarTag = avatarUri
    ? `<image href="${avatarUri}" x="0" y="0" width="40" height="40" preserveAspectRatio="xMidYMid slice" clip-path="url(#circle${index})"/>`
    : '';
  return `
    <clipPath id="circle${index}"><circle cx="20" cy="20" r="20"/></clipPath>
    <g transform="translate(24,${y})">
      ${avatarTag}
      <circle cx="20" cy="20" r="20" fill="none" stroke="${accent}" stroke-width="1.5"/>
    </g>
    <text x="76" y="${y + 18}" class="name">#${index + 1} ${name}</text>
    <text x="76" y="${y + 34}" class="cls" fill="${accent}">${esc(classLabel)}</text>
    <text x="${WIDTH - 32}" y="${y + 26}" text-anchor="end" class="xp"><title>${XP_FORMULA}</title>LV ${level} · ${xp.toLocaleString()} XP</text>`;
}

function renderGlassBoard(org, top, accent) {
  const height = 76 + top.length * 58 + 16;
  return `<svg width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" xmlns="http://www.w3.org/2000/svg">
    <title>${esc(org)} — Team Leaderboard (glass theme). XP = ${XP_FORMULA}</title>
    <defs>
      <style>
        .title{font:700 16px system-ui,sans-serif;fill:#1c2333;}
        .name{font:600 13px system-ui,sans-serif;fill:#1c2333;}
        .cls{font:600 10px system-ui,sans-serif;letter-spacing:.5px;}
        .xp{font:600 12px system-ui,sans-serif;fill:#4a5468;}
      </style>
      <linearGradient id="glassBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#eef1f8"/><stop offset="100%" stop-color="#dde3f0"/>
      </linearGradient>
    </defs>
    <rect width="${WIDTH}" height="${height}" rx="20" fill="url(#glassBg)"/>
    <text x="24" y="36" class="title">${esc(org)} Leaderboard</text>
    ${top.map((entry, i) => glassRow(i, entry, accent)).join('')}
  </svg>`;
}

function svgResponse(body, status, cacheControl) {
  const headers = { 'Content-Type': 'image/svg+xml' };
  if (cacheControl) headers['Cache-Control'] = cacheControl;
  return new Response(body, { status, headers });
}

module.exports.GET = async (request) => {
  const { rateLimited } = await checkRateLimit('leaderboard-endpoint', { request });
  if (rateLimited) return svgResponse(errorSVG('rate limited — slow down a bit'), 100);

  const url = new URL(request.url);
  const org = (url.searchParams.get('org') || '').trim();
  const limit = Math.max(1, Math.min(20, parseInt(url.searchParams.get('limit'), 10) || 10));
  const accent = sanitizeColor(url.searchParams.get('color')) || '#00e5ff';
  const theme = url.searchParams.get('theme');

  if (!org) return svgResponse(errorSVG('missing ?org='), 100);

  const token = process.env.GITHUB_TOKEN;
  try {
    const members = await ghFetch(`https://api.github.com/orgs/${org}/members?per_page=100`, token);
    if (!members.length) return svgResponse(errorSVG(`"${org}" has no public members`), 100);

    const entries = [];
    for (const m of members) {
      try { entries.push(await buildEntry(m.login, token)); } catch {}
    }
    entries.sort((a, b) => b.xp - a.xp);
    const top = entries.slice(0, limit);

    const svg = theme === 'terminal'
      ? renderTerminalBoard(org, top)
      : theme === 'glass'
        ? renderGlassBoard(org, top, accent)
        : renderCyberpunkBoard(org, top, accent);

    return svgResponse(svg, 200, 'public, s-maxage=21600, stale-while-revalidate=86400');
  } catch (err) {
    if (err.status === 404) return svgResponse(errorSVG(`org "${org}" not found`), 100, 'public, s-maxage=60');
    if (err.status === 403) return svgResponse(errorSVG('rate limited — set GITHUB_TOKEN'), 100, 'public, s-maxage=60');
    return svgResponse(errorSVG('failed to load'), 100, 'public, s-maxage=60');
  }
};
