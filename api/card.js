const { checkRateLimit } = require('@vercel/firewall');
const { classFor, esc, ghFetch, avatarDataUri, computeStats, chakraPetchFontFace, sanitizeColor, XP_FORMULA } = require('./_lib/shared');

function errorSVG(message) {
  return `<svg width="360" height="120" viewBox="0 0 360 120" xmlns="http://www.w3.org/2000/svg">
    <rect width="360" height="120" fill="#05070c"/>
    <rect width="360" height="120" fill="none" stroke="#ff4d6d"/>
    <text x="20" y="55" font-family="system-ui,sans-serif" font-weight="700" font-size="13" fill="#ff4d6d">CARD ERROR</text>
    <text x="20" y="78" font-family="'Courier New',monospace" font-size="11" fill="#7a8399">${esc(message)}</text>
  </svg>`;
}

function statBar(y, label, value, max, color) {
  const pct = Math.max(4, Math.min(100, Math.round((value / max) * 100)));
  return `
    <text x="28" y="${y}" class="lbl">${label}</text>
    <text x="332" y="${y}" text-anchor="end" class="lbl">${value}</text>
    <rect x="28" y="${y + 6}" width="304" height="4" fill="#1b2233"/>
    <rect x="28" y="${y + 6}" width="${(304 * pct) / 100}" height="4" fill="${color}"/>`;
}

function renderCardSVG({ user, avatarUri, topLang, level, xp, totalStars, tier, color, fontFace }) {
  const name = esc(user.name || user.login);
  const classLabel = `${classFor(topLang)}${topLang ? ' · ' + esc(topLang) : ''}`;
  const displayFont = fontFace ? "'Chakra Petch',system-ui,sans-serif" : 'system-ui,sans-serif';
  const avatarTag = avatarUri
    ? `<image href="${avatarUri}" x="-9" y="-9" width="90" height="90" preserveAspectRatio="xMidYMid slice" clip-path="url(#hex)"/>`
    : '';
  const shimmer = tier === 'LEGENDARY' ? `
    <g clip-path="url(#cardClip)">
      <rect x="-400" y="0" width="200" height="360" fill="#ffffff" opacity="0.08" transform="rotate(20)">
        <animateTransform attributeName="transform" type="translate" from="-400 0" to="760 0" dur="2.4s" repeatCount="indefinite"/>
      </rect>
    </g>` : '';

  return `<svg width="360" height="360" viewBox="0 0 360 360" xmlns="http://www.w3.org/2000/svg">
    <title>${name} — Contributor Card. XP = ${XP_FORMULA}</title>
    <defs>
      ${fontFace ? `<style>${fontFace}</style>` : ''}
      <style>
        .t1{font:700 16px ${displayFont};fill:#e8edf5;}
        .t2{font:500 11px 'Courier New',monospace;fill:#7a8399;}
        .lbl{font:500 9px 'Courier New',monospace;fill:#7a8399;letter-spacing:1px;}
        .tag{font:700 11px 'Courier New',monospace;}
        .cls{font:600 11px ${displayFont};fill:${color};letter-spacing:1px;}
      </style>
      <clipPath id="hex"><polygon points="36,2 68,20 68,52 36,70 4,52 4,20"/></clipPath>
      <clipPath id="cardClip"><polygon points="0,14 14,0 360,0 360,346 346,360 0,360"/></clipPath>
      <radialGradient id="bg" cx="15%" cy="0%" r="85%">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <rect width="360" height="360" fill="#05070c"/>
    <rect width="360" height="360" fill="url(#bg)"/>
    ${shimmer}
    <polygon points="0,14 14,0 360,0 360,346 346,360 0,360" fill="none" stroke="#1b2233"/>
    <polygon points="0,14 14,0 360,0 360,346 346,360 0,360" fill="none" stroke="${color}" opacity="0.5">
      <animate attributeName="opacity" values="0.4;0.85;0.4" dur="3s" repeatCount="indefinite"/>
    </polygon>

    <rect x="20" y="20" width="58" height="20" fill="${color}"/>
    <text x="49" y="34" text-anchor="middle" class="tag" fill="#05070c">LV ${level}</text>
    <rect x="270" y="20" width="70" height="20" fill="none" stroke="${color}"/>
    <text x="305" y="34" text-anchor="middle" class="tag" fill="${color}">${tier}</text>

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
    <text x="28" y="336" class="lbl">XP<title>${XP_FORMULA}</title></text>
    <text x="332" y="336" text-anchor="end" class="t1">${xp.toLocaleString()}</text>
  </svg>`;
}

function svg(body, status, cacheControl) {
  const headers = { 'Content-Type': 'image/svg+xml' };
  if (cacheControl) headers['Cache-Control'] = cacheControl;
  return new Response(body, { status, headers });
}

module.exports.GET = async (request) => {
  const { rateLimited } = await checkRateLimit('card-endpoint', { request });
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

    const [avatarUri, fontFace] = await Promise.all([
      avatarDataUri(`${user.avatar_url}&s=160`),
      chakraPetchFontFace(),
    ]);
    const stats = computeStats(user, repos);
    const colorOverride = sanitizeColor(url.searchParams.get('color'));
    if (colorOverride) stats.color = colorOverride;

    return svg(renderCardSVG({ user, avatarUri, fontFace, ...stats }), 200, 'public, s-maxage=3600, stale-while-revalidate=86400');
  } catch (err) {
    if (err.status === 404) return svg(errorSVG(`user "${username}" not found`), 404, 'public, s-maxage=60');
    if (err.status === 403) return svg(errorSVG('rate limited — set GITHUB_TOKEN'), 503, 'public, s-maxage=60');
    return svg(errorSVG('failed to load'), 500, 'public, s-maxage=60');
  }
};
