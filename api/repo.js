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

function renderDetailed({ repo, color, fontFace }) {
  const displayFont = fontFace ? "'Chakra Petch',system-ui,sans-serif" : 'system-ui,sans-serif';
  const descLines = repo.description ? wrapText(esc(repo.description), 56) : [];
  const license = licenseOf(repo);
  const topics = (repo.topics || []).slice(0, 6);
  const height = 340 + descLines.length * 16 + (topics.length ? 32 : 0);

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

    ${statBox(24, 100 + descLines.length * 16, 'STARS', repo.stargazers_count, color)}
    ${statBox(212, 100 + descLines.length * 16, 'FORKS', repo.forks_count, color)}
    ${statBox(24, 176 + descLines.length * 16, 'ISSUES', repo.open_issues_count, color)}
    ${statBox(212, 176 + descLines.length * 16, 'WATCHERS', repo.watchers_count, color)}

    <text x="24" y="${272 + descLines.length * 16}" class="lbl">DEFAULT BRANCH</text>
    <text x="24" y="${290 + descLines.length * 16}" class="desc">${esc(repo.default_branch)}</text>
    <text x="150" y="${272 + descLines.length * 16}" class="lbl">LAST PUSH</text>
    <text x="150" y="${290 + descLines.length * 16}" class="desc">${formatDate(repo.pushed_at)}</text>
    <text x="280" y="${272 + descLines.length * 16}" class="lbl">SIZE</text>
    <text x="280" y="${290 + descLines.length * 16}" class="desc">${formatSize(repo.size)}</text>

    ${topics.map((topic, i) => `<rect x="${24 + i * 70}" y="${310 + descLines.length * 16}" width="64" height="20" fill="none" stroke="${color}"/><text x="${56 + i * 70}" y="${324 + descLines.length * 16}" text-anchor="middle" class="chip">${esc(topic)}</text>`).join('')}

    ${repo.language ? `<rect x="24" y="${(topics.length ? 342 : 310) + descLines.length * 16}" width="${16 + repo.language.length * 7}" height="20" fill="${color}"/><text x="32" y="${(topics.length ? 356 : 324) + descLines.length * 16}" class="topic">${esc(repo.language)}</text>` : ''}
    ${license ? `<rect x="${(repo.language ? 40 + repo.language.length * 7 : 24)}" y="${(topics.length ? 342 : 310) + descLines.length * 16}" width="${16 + license.length * 7}" height="20" fill="none" stroke="#1b2233"/><text x="${(repo.language ? 48 + repo.language.length * 7 : 32)}" y="${(topics.length ? 356 : 324) + descLines.length * 16}" class="chip" fill="#7a8399">${esc(license)}</text>` : ''}
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

    return svg(render({ repo, color, fontFace }), 200, 'public, s-maxage=3600, stale-while-revalidate=86400');
  } catch (err) {
    if (err.status === 404) return svg(errorSVG(`"${owner}/${repoName}" not found`), 404, 'public, s-maxage=60');
    if (err.status === 403) return svg(errorSVG('rate limited — set GITHUB_TOKEN'), 503, 'public, s-maxage=60');
    return svg(errorSVG('failed to load'), 500, 'public, s-maxage=60');
  }
};
