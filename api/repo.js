const { checkRateLimit } = require('@vercel/firewall');
const { esc, ghFetch, chakraPetchFontFace, sanitizeColor } = require('./_lib/shared');

function errorSVG(message) {
  return `<svg width="420" height="120" viewBox="0 0 420 120" xmlns="http://www.w3.org/2000/svg">
    <rect width="420" height="120" fill="#05070c"/>
    <rect width="420" height="120" fill="none" stroke="#ff4d6d"/>
    <text x="20" y="55" font-family="system-ui,sans-serif" font-weight="700" font-size="13" fill="#ff4d6d">CARD ERROR</text>
    <text x="20" y="78" font-family="'Courier New',monospace" font-size="11" fill="#7a8399">${esc(message)}</text>
  </svg>`;
}

function statBlock(x, label, value, color) {
  return `
    <text x="${x}" y="70" class="lbl">${label}</text>
    <text x="${x}" y="94" class="statVal" fill="${color}">${value}</text>`;
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

function renderRepoSVG({ repo, color, fontFace }) {
  const displayFont = fontFace ? "'Chakra Petch',system-ui,sans-serif" : 'system-ui,sans-serif';
  const descLines = repo.description ? wrapText(esc(repo.description), 58) : [];
  const license = repo.license?.spdx_id && repo.license.spdx_id !== 'NOASSERTION' ? repo.license.spdx_id : null;

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
    <polygon points="0,14 14,0 420,0 420,186 406,200 0,200" fill="none" stroke="#1b2233"/>
    <polygon points="0,14 14,0 420,0 420,186 406,200 0,200" fill="none" stroke="${color}" opacity="0.5"/>

    <text x="24" y="36" class="name">${esc(repo.name)}</text>
    <text x="24" y="52" class="desc" fill="#7a8399">${esc(repo.owner.login)}</text>

    ${descLines.map((line, i) => `<text x="24" y="${118 + i * 16}" class="desc">${line}</text>`).join('')}

    ${statBlock(24, 'STARS', repo.stargazers_count, color)}
    ${statBlock(140, 'FORKS', repo.forks_count, color)}
    ${statBlock(256, 'ISSUES', repo.open_issues_count, color)}

    ${repo.language ? `<rect x="24" y="164" width="${16 + repo.language.length * 7}" height="20" fill="${color}"/><text x="32" y="178" class="chip">${esc(repo.language)}</text>` : ''}
    ${license ? `<rect x="${repo.language ? 40 + repo.language.length * 7 : 24}" y="164" width="${16 + license.length * 7}" height="20" fill="none" stroke="#1b2233"/><text x="${repo.language ? 48 + repo.language.length * 7 : 32}" y="178" class="chip" fill="#7a8399">${esc(license)}</text>` : ''}
  </svg>`;
}

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

  const token = process.env.GITHUB_TOKEN;
  try {
    const repo = await ghFetch(`https://api.github.com/repos/${owner}/${repoName}`, token);
    const fontFace = await chakraPetchFontFace();
    const color = sanitizeColor(url.searchParams.get('color')) || '#00e5ff';

    return svg(renderRepoSVG({ repo, color, fontFace }), 200, 'public, s-maxage=3600, stale-while-revalidate=86400');
  } catch (err) {
    if (err.status === 404) return svg(errorSVG(`"${owner}/${repoName}" not found`), 404, 'public, s-maxage=60');
    if (err.status === 403) return svg(errorSVG('rate limited — set GITHUB_TOKEN'), 503, 'public, s-maxage=60');
    return svg(errorSVG('failed to load'), 500, 'public, s-maxage=60');
  }
};
