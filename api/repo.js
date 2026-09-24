const { checkRateLimit } = require('@vercel/firewall');
const { esc, ghFetch, CHAKRA_PETCH_FONT_FACE, sanitizeColor } = require('./_lib/shared');

function errorSVG(message) {
  return `<svg width="420" height="120" viewBox="0 0 420 120" xmlns="http://www.w3.org/2000/svg">
    <rect width="420" height="120" fill="#05070c"/>
    <rect width="420" height="120" fill="none" stroke="#ff4d6d"/>
    <text x="20" y="55" font-family="system-ui,sans-serif" font-weight="700" font-size="13" fill="#ff4d6d">CARD ERROR</text>
    <text x="20" y="78" font-family="'Courier New',monospace" font-size="11" fill="#7a8399">${esc(message)}</text>
  </svg>`;
}

function wrapText(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) {
      lines.push(current.trim());
      current = word;
    } else {
      current += ' ' + word;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines.slice(0, 2);
}

function licenseOf(repo) {
  return repo.license?.spdx_id && repo.license.spdx_id !== 'NOASSERTION' ? repo.license.spdx_id : null;
}

// Lightweight, best-effort lookups for the detailed theme only. Both fail soft
// (return null) rather than throw, so a rate limit or a repo with zero releases
// never breaks the whole card — it just omits that one field.
async function contributorCount(owner, repoName, token) {
  try {
    const headers = { Accept: 'application/vnd.github+json' };
    if (token) headers.Authorization = `token ${token}`;
    // per_page=1 + reading the Link header's last page number is the standard
    // cheap way to get a total count without paginating through everyone.
    const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contributors?per_page=1&anon=true`, { headers });
    if (!res.ok) return null;
    const link = res.headers.get('link');
    if (link) {
      const match = link.match(/[?&]page=(\d+)>;\s*rel="last"/);
      if (match) return parseInt(match[1], 10);
    }
    const body = await res.json();
    return Array.isArray(body) ? body.length : null;
  } catch {
    return null;
  }
}

async function latestReleaseTag(owner, repoName, token) {
  try {
    const headers = { Accept: 'application/vnd.github+json' };
    if (token) headers.Authorization = `token ${token}`;
    const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}/releases/latest`, { headers });
    if (!res.ok) return null; // 404 means no releases published — not an error
    const data = await res.json();
    return data.tag_name || null;
  } catch {
    return null;
  }
}

function renderCyberpunk({ repo, color, fontFace }) {
  const displayFont = fontFace ? "'Chakra Petch',system-ui,sans-serif" : 'system-ui,sans-serif';
  const descLines = repo.description ? wrapText(esc(repo.description), 58) : [];
  const license = licenseOf(repo);

  return `<svg width="420" height="200" viewBox="0 0 420 200" xmlns="http://www.w3.org/2000/svg">
    <title>${esc(repo.full_name)} — Repository Card</title>
    <defs>
      ${fontFace ? `<style>${fontFace}</style>` : ''}
      <style>
        .name{font:700 17px ${displayFont};fill:#e8edf5;}
        .desc{font:400 12px system-ui,sans-serif;fill:#a8b0c2;}
        .lbl{font:500 9px 'Courier New',monospace;fill:#7a8399;letter-spacing:1px;}
        .statVal{font:700 18px ${displayFont};}
        .chip{font:600 10px 'Courier New',monospace;fill:#05070c;}
      </style>
      <radialGradient id="bg" cx="90%" cy="0%" r="90%">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="420" height="200" fill="#05070c"/>
    <rect width="420" height="200" fill="url(#bg)"/>
    <polygon points="0,14 14,0 420,0 420,186 406,200 0,200" fill="none" stroke="${color}" opacity="0.5"/>
    <text x="24" y="36" class="name">${esc(repo.name)}</text>
    <text x="24" y="52" class="desc" fill="#7a8399">${esc(repo.owner.login)}</text>
    ${descLines.map((line, i) => `<text x="24" y="${118 + i * 16}" class="desc">${line}</text>`).join('')}
    <text x="24" y="70" class="lbl">STARS</text><text x="24" y="94" class="statVal" fill="${color}">${repo.stargazers_count}</text>
    <text x="140" y="70" class="lbl">FORKS</text><text x="140" y="94" class="statVal" fill="${color}">${repo.forks_count}</text>
    <text x="256" y="70" class="lbl">ISSUES</text><text x="256" y="94" class="statVal" fill="${color}">${repo.open_issues_count}</text>
    ${repo.language ? `<rect x="24" y="164" width="${16 + repo.language.length * 7}" height="20" fill="${color}"/><text x="32" y="178" class="chip">${esc(repo.language)}</text>` : ''}
    ${license ? `<rect x="${repo.language ? 40 + repo.language.length * 7 : 24}" y="164" width="${16 + license.length * 7}" height="20" fill="none" stroke="#1b2233"/><text x="${repo.language ? 48 + repo.language.length * 7 : 32}" y="178" class="chip" fill="#7a8399">${esc(license)}</text>` : ''}
  </svg>`;
}

function renderTerminal({ repo }) {
  const green = '#3ddc6a';
  const license = licenseOf(repo);
  const rows = [
    `repo     ${esc(repo.full_name)}`,
    `lang     ${repo.language || 'n/a'}`,
    `license  ${license || 'none'}`,
    `stars    ${repo.stargazers_count}`,
    `forks    ${repo.forks_count}`,
    `issues   ${repo.open_issues_count}`,
  ];
  return `<svg width="420" height="220" viewBox="0 0 420 220" xmlns="http://www.w3.org/2000/svg">
    <title>${esc(repo.full_name)} — Repository Card (terminal theme)</title>
    <defs><style>.term{font:400 13px 'Courier New',monospace;fill:${green};}.head{font:700 13px 'Courier New',monospace;fill:${green};}</style></defs>
    <rect width="420" height="220" fill="#020402"/>
    <rect width="420" height="220" fill="none" stroke="${green}" opacity="0.5"/>
    <text x="16" y="30" class="head">$ git remote show origin</text>
    ${rows.map((line, i) => `<text x="16" y="${58 + i * 20}" class="term">${esc(line)}</text>`).join('')}
  </svg>`;
}

function renderGlass({ repo, color }) {
  const descLines = repo.description ? wrapText(esc(repo.description), 60) : [];
  const license = licenseOf(repo);
  return `<svg width="420" height="200" viewBox="0 0 420 200" xmlns="http://www.w3.org/2000/svg">
    <title>${esc(repo.full_name)} — Repository Card (glass theme)</title>
    <defs>
      <style>
        .name{font:700 17px system-ui,sans-serif;fill:#1c2333;}
        .desc{font:400 12px system-ui,sans-serif;fill:#5b6478;}
        .lbl{font:500 9px system-ui,sans-serif;fill:#8891a3;letter-spacing:.5px;}
        .statVal{font:700 18px system-ui,sans-serif;}
        .chip{font:600 10px system-ui,sans-serif;fill:#1c2333;}
      </style>
      <linearGradient id="glassBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#eef1f8"/><stop offset="100%" stop-color="#dde3f0"/>
      </linearGradient>
    </defs>
    <rect width="420" height="200" rx="18" fill="url(#glassBg)"/>
    <text x="24" y="36" class="name">${esc(repo.name)}</text>
    <text x="24" y="52" class="desc">${esc(repo.owner.login)}</text>
    ${descLines.map((line, i) => `<text x="24" y="${118 + i * 16}" class="desc">${line}</text>`).join('')}
    <text x="24" y="70" class="lbl">STARS</text><text x="24" y="94" class="statVal" fill="${color}">${repo.stargazers_count}</text>
    <text x="140" y="70" class="lbl">FORKS</text><text x="140" y="94" class="statVal" fill="${color}">${repo.forks_count}</text>
    <text x="256" y="70" class="lbl">ISSUES</text><text x="256" y="94" class="statVal" fill="${color}">${repo.open_issues_count}</text>
    ${repo.language ? `<rect x="24" y="164" width="${16 + repo.language.length * 7}" height="20" rx="10" fill="#ffffff" opacity="0.7"/><text x="32" y="178" class="chip">${esc(repo.language)}</text>` : ''}
    ${license ? `<rect x="${repo.language ? 40 + repo.language.length * 7 : 24}" y="164" width="${16 + license.length * 7}" height="20" rx="10" fill="#ffffff" opacity="0.4"/><text x="${repo.language ? 48 + repo.language.length * 7 : 32}" y="178" class="chip" fill="#5b6478">${esc(license)}</text>` : ''}
  </svg>`;
}

function formatSize(kb) {
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

function formatDate(iso) {
  return new Date(iso).toISOString().slice(0, 10);
}

function renderDetailed({ repo, color, fontFace, contributors, releaseTag }) {
  const displayFont = fontFace ? "'Chakra Petch',system-ui,sans-serif" : 'system-ui,sans-serif';
  const descLines = repo.description ? wrapText(esc(repo.description), 56) : [];
  const license = licenseOf(repo);
  const topics = (repo.topics || []).slice(0, 6);
  const d = descLines.length * 16; // extra vertical room the description block needs

  // Running layout in fixed stages, each offset from the last, so adding a
  // field later means inserting one stage rather than re-deriving every
  // coordinate below it.
  const row1Y = 100 + d;               // STARS / FORKS
  const row2Y = row1Y + 76;            // ISSUES / WATCHERS
  const row3Y = row2Y + 76;            // CONTRIBUTORS / RELEASE
  const metaY = row3Y + 78;            // DEFAULT BRANCH / LAST PUSH (label baseline)
  const metaValY = metaY + 18;
  const meta2Y = metaY + 38;           // CREATED / SIZE (label baseline)
  const meta2ValY = meta2Y + 18;
  const topicsY = meta2Y + 40;
  const langY = topics.length ? topicsY + 32 : topicsY;
  const height = langY + 32;

  return `<svg width="440" height="${height}" viewBox="0 0 440 ${height}" xmlns="http://www.w3.org/2000/svg">
    <title>${esc(repo.full_name)} — Repository Card (detailed theme)</title>
    <defs>
      ${fontFace ? `<style>${fontFace}</style>` : ''}
      <style>
        .name{font:700 19px ${displayFont};fill:#e8edf5;}
        .desc{font:400 12px system-ui,sans-serif;fill:#a8b0c2;}
        .lbl{font:500 9px 'Courier New',monospace;fill:#7a8399;letter-spacing:1px;}
        .statVal{font:700 17px ${displayFont};}
        .chip{font:600 10px 'Courier New',monospace;fill:${color};}
        .topic{font:600 10px 'Courier New',monospace;fill:#05070c;}
      </style>
    </defs>
    <rect width="440" height="${height}" fill="#05070c"/>
    <polygon points="0,14 14,0 440,0 440,${height - 14} 426,${height} 0,${height}" fill="none" stroke="${color}" opacity="0.5"/>

    <text x="24" y="40" class="name">${esc(repo.name)}</text>
    <text x="24" y="58" class="desc" fill="#7a8399">${esc(repo.full_name)}</text>
    ${descLines.map((line, i) => `<text x="24" y="${86 + i * 16}" class="desc">${line}</text>`).join('')}

    ${statBox(24, row1Y, 'STARS', repo.stargazers_count, color)}
    ${statBox(212, row1Y, 'FORKS', repo.forks_count, color)}
    ${statBox(24, row2Y, 'ISSUES', repo.open_issues_count, color)}
    ${statBox(212, row2Y, 'WATCHERS', repo.watchers_count, color)}
    ${statBox(24, row3Y, 'CONTRIBUTORS', contributors ?? '—', color)}
    ${statBox(212, row3Y, 'RELEASE', releaseTag ? esc(releaseTag) : '—', color)}

    <text x="24" y="${metaY}" class="lbl">DEFAULT BRANCH</text>
    <text x="24" y="${metaValY}" class="desc">${esc(repo.default_branch)}</text>
    <text x="150" y="${metaY}" class="lbl">LAST PUSH</text>
    <text x="150" y="${metaValY}" class="desc">${formatDate(repo.pushed_at)}</text>

    <text x="24" y="${meta2Y}" class="lbl">CREATED</text>
    <text x="24" y="${meta2ValY}" class="desc">${formatDate(repo.created_at)}</text>
    <text x="150" y="${meta2Y}" class="lbl">SIZE</text>
    <text x="150" y="${meta2ValY}" class="desc">${formatSize(repo.size)}</text>

    ${topics.map((topic, i) => `<rect x="${24 + i * 70}" y="${topicsY}" width="64" height="20" fill="none" stroke="${color}"/><text x="${56 + i * 70}" y="${topicsY + 14}" text-anchor="middle" class="chip">${esc(topic)}</text>`).join('')}

    ${repo.language ? `<rect x="24" y="${langY}" width="${16 + repo.language.length * 7}" height="20" fill="${color}"/><text x="32" y="${langY + 14}" class="topic">${esc(repo.language)}</text>` : ''}
    ${license ? `<rect x="${(repo.language ? 40 + repo.language.length * 7 : 24)}" y="${langY}" width="${16 + license.length * 7}" height="20" fill="none" stroke="#1b2233"/><text x="${(repo.language ? 48 + repo.language.length * 7 : 32)}" y="${langY + 14}" class="chip" fill="#7a8399">${esc(license)}</text>` : ''}
  </svg>`;
}

function statBox(x, y, label, value, color) {
  return `
    <rect x="${x}" y="${y}" width="204" height="60" fill="none" stroke="#1b2233"/>
    <text x="${x + 12}" y="${y + 22}" font-family="'Courier New',monospace" font-size="9" fill="#7a8399" letter-spacing="1">${label}</text>
    <text x="${x + 12}" y="${y + 46}" font-family="system-ui,sans-serif" font-weight="700" font-size="18" fill="${color}">${value}</text>`;
}

const THEMES = { cyberpunk: renderCyberpunk, terminal: renderTerminal, glass: renderGlass, detailed: renderDetailed };

function svg(body, status, cacheControl) {
  const headers = { 'Content-Type': 'image/svg+xml' };
  if (cacheControl) headers['Cache-Control'] = cacheControl;
  return new Response(body, { status, headers });
}

module.exports.GET = async (request) => {
  const { rateLimited } = await checkRateLimit('repo-endpoint', { request });
  if (rateLimited) return svg(errorSVG('rate limited — slow down a bit'), 429, 'no-store');

  const url = new URL(request.url);
  const owner = (url.searchParams.get('owner') || '').trim();
  const repoName = (url.searchParams.get('repo') || '').trim();
  if (!owner || !repoName) return svg(errorSVG('missing ?owner= or ?repo='), 400);

  const requestedTheme = url.searchParams.get('theme');
  const render = THEMES[requestedTheme] || THEMES.cyberpunk;

  const token = process.env.GITHUB_TOKEN;
  try {
    const repo = await ghFetch(`https://api.github.com/repos/${owner}/${repoName}`, token);
    const fontFace = CHAKRA_PETCH_FONT_FACE;
    const color = sanitizeColor(url.searchParams.get('color')) || '#00e5ff';

    let contributors = null;
    let releaseTag = null;
    if (requestedTheme === 'detailed') {
      // Only the detailed theme needs these — two extra calls, run in parallel,
      // and both fail soft so a rate limit or a repo with no releases still
      // renders a complete card.
      [contributors, releaseTag] = await Promise.all([
        contributorCount(owner, repoName, token),
        latestReleaseTag(owner, repoName, token),
      ]);
    }

    return svg(render({ repo, color, fontFace, contributors, releaseTag }), 200, 'public, s-maxage=3600, stale-while-revalidate=86400');
  } catch (err) {
    if (err.status === 404) return svg(errorSVG(`"${owner}/${repoName}" not found`), 404, 'public, s-maxage=60');
    if (err.status === 403) return svg(errorSVG('rate limited — set GITHUB_TOKEN'), 503, 'public, s-maxage=60');
    return svg(errorSVG('failed to load'), 500, 'public, s-maxage=60');
  }
};
