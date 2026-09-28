const { checkRateLimit } = require('@vercel/firewall');
const {
  classFor, esc, ghFetch, avatarDataUri, computeStats, sanitizeColor, XP_FORMULA,
  clearanceFor, truncate, avatarShape, sanitizeShape, icon, colorForLang,
} = require('./_lib/shared');

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

// Ranking requires every member's stats before sorting, so total GitHub
// calls are fixed either way — a worker pool just parallelizes them.
// MEMBER_CAP bounds worst-case time for very large orgs.
const CONCURRENCY = 4;
const MEMBER_CAP = 60;

async function buildEntries(members, token) {
  const pool = members.slice(0, MEMBER_CAP);
  const results = new Array(pool.length);
  let cursor = 0;

  async function worker() {
    while (cursor < pool.length) {
      const i = cursor++;
      try {
        results[i] = await buildEntry(pool[i].login, token);
      } catch {
        // one member's profile/repos failing shouldn't sink the whole board
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pool.length) }, worker));
  return results.filter(Boolean);
}

const MEDALS = ['#ffd166', '#cbd5e1', '#d08a5c']; // gold, silver, bronze

const hexPoints = (cx, cy, r) => [0, 1, 2, 3, 4, 5].map((k) => {
  const a = ((-90 + 60 * k) * Math.PI) / 180;
  return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
}).join(' ');

function cyberpunkRow(index, entry, total, topXp, shape, override) {
  const y = HEADER_H + index * ROW_H;
  const mid = y + ROW_H / 2;
  const { user, avatarUri, topLang, level, xp } = entry;
  const color = override || entry.color;
  const name = esc(truncate(user.name || user.login, 24));
  const classLabel = `${classFor(topLang)}${topLang ? ' · ' + esc(truncate(topLang, 14)) : ''}`;
  const medal = MEDALS[index];
  const pct = topXp ? Math.max(3, Math.round((xp / topXp) * 100)) : 0;
  const barX = 350;
  const barW = 130;

  const rank = medal
    ? `<polygon points="${hexPoints(36, mid, 13)}" fill="${medal}" fill-opacity="0.16" stroke="${medal}" stroke-width="1.5" stroke-linejoin="round"/>
       <text x="36" y="${mid + 4}" text-anchor="middle" class="rankNum" fill="${medal}">${index + 1}</text>`
    : `<text x="36" y="${mid + 4}" text-anchor="middle" class="rankDim">${index + 1}</text>`;

  return `
    ${medal ? `<rect x="8" y="${y + 2}" width="${WIDTH - 16}" height="${ROW_H - 4}" fill="url(#medal${index})"/>` : ''}
    ${index < total - 1 ? `<line x1="16" y1="${y + ROW_H}" x2="${WIDTH - 16}" y2="${y + ROW_H}" stroke="#1b2233" stroke-dasharray="2,3"/>` : ''}
    ${rank}
    <g transform="translate(60,${y + (ROW_H - 42) / 2})">
      ${avatarShape({ id: `av${index}`, shape, size: 42, uri: avatarUri, ring: color, bg: '#1b2233', ringWidth: 1.4 })}
    </g>
    <text x="114" y="${mid - 3}" class="name">${name}</text>
    <text x="114" y="${mid + 12}" class="cls" fill="${color}">${esc(classLabel.toUpperCase())}</text>
    <rect x="${barX}" y="${mid - 2}" width="${barW}" height="4" fill="#1b2233"/>
    <rect x="${barX}" y="${mid - 2}" width="${(barW * pct) / 100}" height="4" fill="${color}"/>
    <rect x="${barX}" y="${mid - 2}" width="${(barW * pct) / 100}" height="1" fill="#ffffff" opacity="0.3"/>
    <rect x="${WIDTH - 150}" y="${mid - 9}" width="46" height="18" fill="${color}"/>
    <text x="${WIDTH - 127}" y="${mid + 4}" text-anchor="middle" class="tag" fill="#05070c">LV ${level}</text>
    <text x="${WIDTH - 20}" y="${mid + 4}" text-anchor="end" class="xp"><title>${XP_FORMULA}</title>${xp.toLocaleString()} XP</text>`;
}

function renderCyberpunkBoard(org, top, ranked, accent, shape, override) {
  const height = HEADER_H + top.length * ROW_H + 12;
  const topXp = top[0] ? top[0].xp : 0;
  const rows = top.map((entry, i) => cyberpunkRow(i, entry, top.length, topXp, shape, override)).join('');
  const medalDefs = MEDALS.slice(0, top.length).map((m, i) => `
      <linearGradient id="medal${i}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${m}" stop-opacity="0.14"/><stop offset="100%" stop-color="${m}" stop-opacity="0"/>
      </linearGradient>`).join('');

  return `<svg width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" xmlns="http://www.w3.org/2000/svg">
    <title>${esc(org)} — Team Leaderboard. XP = ${XP_FORMULA}</title>
    <defs>
      <style>
        .title{font:700 15px system-ui,sans-serif;fill:#e8edf5;letter-spacing:1px;}
        .meta{font:500 10px 'Courier New',monospace;fill:#7a8399;letter-spacing:1px;}
        .rankNum{font:700 12px 'Courier New',monospace;}
        .rankDim{font:700 12px 'Courier New',monospace;fill:#5a6480;}
        .name{font:600 13.5px system-ui,sans-serif;fill:#e8edf5;}
        .cls{font:600 9px system-ui,sans-serif;letter-spacing:.5px;}
        .tag{font:700 10px 'Courier New',monospace;}
        .xp{font:700 12px system-ui,sans-serif;fill:#e8edf5;}
      </style>
      <radialGradient id="bg" cx="10%" cy="0%" r="90%">
        <stop offset="0%" stop-color="${accent}" stop-opacity="0.10"/>
        <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="bg2" cx="100%" cy="100%" r="70%">
        <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.09"/>
        <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
      </radialGradient>${medalDefs}
    </defs>
    <rect width="${WIDTH}" height="${height}" fill="#05070c"/>
    <rect width="${WIDTH}" height="${height}" fill="url(#bg)"/>
    <rect width="${WIDTH}" height="${height}" fill="url(#bg2)"/>
    <polygon points="0,14 14,0 ${WIDTH},0 ${WIDTH},${height - 14} ${WIDTH - 14},${height} 0,${height}" fill="none" stroke="${accent}" opacity="0.45"/>
    <rect x="16" y="16" width="3" height="20" fill="${accent}"/>
    <text x="28" y="32" class="title">${esc(truncate(org.toUpperCase(), 28))} // LEADERBOARD</text>
    <text x="${WIDTH - 16}" y="31" text-anchor="end" class="meta">TOP ${top.length} OF ${ranked}</text>
    <line x1="16" y1="${HEADER_H - 8}" x2="${WIDTH - 16}" y2="${HEADER_H - 8}" stroke="#1b2233"/>
    ${rows}
  </svg>`;
}

function renderTerminalBoard(org, top, ranked) {
  const green = '#3ddc6a';
  const rowsY = 108;
  const height = rowsY + top.length * 22 + 16;
  const rows = top.map((entry, i) => {
    const y = rowsY + i * 22;
    return `<text x="16" y="${y}" class="key">${String(i + 1).padStart(2, '0')}</text>
    <text x="56" y="${y}" class="${i === 0 ? 'head' : 'term'}">${esc(truncate(entry.user.login, 26))}</text>
    <text x="360" y="${y}" class="term">${clearanceFor(entry.tier).toLowerCase()}</text>
    <text x="${WIDTH - 16}" y="${y}" text-anchor="end" class="term">${entry.xp.toLocaleString()}</text>`;
  }).join('\n    ');
  return `<svg width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" xmlns="http://www.w3.org/2000/svg">
    <title>${esc(org)} — Team Leaderboard (terminal theme). Score = ${XP_FORMULA}</title>
    <defs><style>.term{font:400 13px 'Courier New',monospace;fill:${green};}.key{font:400 13px 'Courier New',monospace;fill:#2a6b3d;}.head{font:700 13px 'Courier New',monospace;fill:${green};}.ok{font:400 12px 'Courier New',monospace;fill:#2a6b3d;}</style></defs>
    <rect width="${WIDTH}" height="${height}" fill="#020402"/>
    <rect width="${WIDTH}" height="${height}" fill="none" stroke="${green}" opacity="0.5"/>
    <text x="16" y="28" class="head">$ ./leaderboard.sh --org=${esc(truncate(org, 30))}</text>
    <text x="16" y="48" class="ok">[OK] ${ranked} members ranked, showing top ${top.length}</text>
    <line x1="16" y1="62" x2="${WIDTH - 16}" y2="62" stroke="${green}" stroke-opacity="0.3" stroke-dasharray="3,3"/>
    <text x="16" y="82" class="key">#</text>
    <text x="56" y="82" class="key">login</text>
    <text x="360" y="82" class="key">clearance</text>
    <text x="${WIDTH - 16}" y="82" text-anchor="end" class="key">score</text>
    ${rows}
  </svg>`;
}

function glassRow(index, entry, accent, shape) {
  const y = 86 + index * 58;
  const mid = y + 25;
  const { user, avatarUri, topLang, totalStars } = entry;
  const name = esc(truncate(user.name || user.login, 24));
  const medal = MEDALS[index];
  const langColor = topLang ? colorForLang(topLang, accent) : accent;
  const langLabel = topLang ? esc(truncate(topLang, 14)) : '';

  return `
    <rect x="28" y="${y}" width="${WIDTH - 56}" height="50" rx="16" fill="#ffffff" opacity="0.62"/>
    <circle cx="56" cy="${mid}" r="13" fill="${medal || '#e6eaf4'}" fill-opacity="${medal ? 0.28 : 1}" stroke="${medal || 'none'}" stroke-width="1.4"/>
    <text x="56" y="${mid + 4}" text-anchor="middle" class="rank">${index + 1}</text>
    <g transform="translate(80,${y + 6})">
      ${avatarShape({ id: `av${index}`, shape, size: 38, uri: avatarUri, ring: accent, bg: '#dde3f0', ringWidth: 1.4 })}
    </g>
    <text x="130" y="${mid - 3}" class="name">${name}</text>
    <text x="130" y="${mid + 12}" class="handle">@${esc(truncate(user.login, 26))}</text>
    ${topLang ? `<rect x="330" y="${mid - 10}" width="${20 + langLabel.length * 6}" height="20" rx="10" fill="${langColor}" fill-opacity="0.16"/>
    <circle cx="341" cy="${mid}" r="3.5" fill="${langColor}"/>
    <text x="350" y="${mid + 4}" class="lang">${langLabel}</text>` : ''}
    ${icon('star', 458, mid - 6, '#8891a3')}
    <text x="475" y="${mid + 4}" class="stat">${totalStars.toLocaleString()}</text>
    ${icon('people', 530, mid - 6, '#8891a3')}
    <text x="547" y="${mid + 4}" class="stat">${(user.followers || 0).toLocaleString()}</text>`;
}

function renderGlassBoard(org, top, ranked, accent, shape) {
  const height = 86 + top.length * 58 + 22;
  return `<svg width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" xmlns="http://www.w3.org/2000/svg">
    <title>${esc(org)} — Team Leaderboard (glass theme). Ranked by activity score = ${XP_FORMULA}</title>
    <defs>
      <style>
        .title{font:700 18px system-ui,sans-serif;fill:#1c2333;}
        .sub{font:500 11px system-ui,sans-serif;fill:#6b7488;}
        .rank{font:700 11px system-ui,sans-serif;fill:#3a4358;}
        .name{font:600 13.5px system-ui,sans-serif;fill:#1c2333;}
        .handle{font:500 10.5px system-ui,sans-serif;fill:#8891a3;}
        .lang{font:600 10.5px system-ui,sans-serif;fill:#3a4358;}
        .stat{font:600 12px system-ui,sans-serif;fill:#3a4358;}
      </style>
      <linearGradient id="glassBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#eef1f8"/><stop offset="100%" stop-color="#dde3f0"/>
      </linearGradient>
      <filter id="blob" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="34"/></filter>
    </defs>
    <rect width="${WIDTH}" height="${height}" rx="22" fill="url(#glassBg)"/>
    <circle cx="60" cy="30" r="90" fill="${accent}" opacity="0.2" filter="url(#blob)"/>
    <circle cx="${WIDTH - 40}" cy="70" r="80" fill="#8b5cf6" opacity="0.16" filter="url(#blob)"/>
    <circle cx="${WIDTH - 90}" cy="${height - 20}" r="90" fill="${accent}" opacity="0.13" filter="url(#blob)"/>
    <text x="32" y="44" class="title">${esc(truncate(org, 30))}</text>
    <text x="32" y="64" class="sub">Team leaderboard · top ${top.length} of ${ranked}</text>
    ${top.map((entry, i) => glassRow(i, entry, accent, shape)).join('')}
  </svg>`;
}

function svgResponse(body, status, cacheControl) {
  const headers = { 'Content-Type': 'image/svg+xml' };
  if (cacheControl) headers['Cache-Control'] = cacheControl;
  return new Response(body, { status, headers });
}

module.exports.GET = async (request) => {
  const { rateLimited } = await checkRateLimit('leaderboard-endpoint', { request });
  if (rateLimited) return svgResponse(errorSVG('rate limited — slow down a bit'), 429, 'no-store');

  const url = new URL(request.url);
  const org = (url.searchParams.get('org') || '').trim();
  const limit = Math.max(1, Math.min(20, parseInt(url.searchParams.get('limit'), 10) || 10));
  const colorOverride = sanitizeColor(url.searchParams.get('color'));
  const accent = colorOverride || '#00e5ff';
  const theme = url.searchParams.get('theme');
  const shape = sanitizeShape(url.searchParams.get('shape'), theme === 'glass' ? 'circle' : 'hex');

  if (!org) return svgResponse(errorSVG('missing ?org='), 400);

  const token = process.env.GITHUB_TOKEN;
  try {
    const members = await ghFetch(`https://api.github.com/orgs/${org}/members?per_page=100`, token);
    if (!members.length) return svgResponse(errorSVG(`"${org}" has no public members`), 200, 'public, s-maxage=3600');

    const entries = await buildEntries(members, token);
    entries.sort((a, b) => b.xp - a.xp);
    const top = entries.slice(0, limit);

    const ranked = entries.length;
    const svg = theme === 'terminal'
      ? renderTerminalBoard(org, top, ranked)
      : theme === 'glass'
        ? renderGlassBoard(org, top, ranked, accent, shape)
        : renderCyberpunkBoard(org, top, ranked, accent, shape, colorOverride);

    return svgResponse(svg, 200, 'public, s-maxage=21600, stale-while-revalidate=86400');
  } catch (err) {
    if (err.status === 404) return svgResponse(errorSVG(`org "${org}" not found`), 404, 'public, s-maxage=60');
    if (err.status === 403) return svgResponse(errorSVG('rate limited — set GITHUB_TOKEN'), 503, 'public, s-maxage=60');
    return svgResponse(errorSVG('failed to load'), 500, 'public, s-maxage=60');
  }
};
