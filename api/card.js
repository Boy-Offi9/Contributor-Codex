const { checkRateLimit } = require('@vercel/firewall');
const { classFor, esc, ghFetch, avatarDataUri, computeStats, CHAKRA_PETCH_FONT_FACE, sanitizeColor, XP_FORMULA, byteWeightedLangs } = require('./_lib/shared');

function errorSVG(message) {
  return `<svg width="360" height="120" viewBox="0 0 360 120" xmlns="http://www.w3.org/2000/svg">
    <rect width="360" height="120" fill="#05070c"/>
    <rect width="360" height="120" fill="none" stroke="#ff4d6d"/>
    <text x="20" y="55" font-family="system-ui,sans-serif" font-weight="700" font-size="13" fill="#ff4d6d">CARD ERROR</text>
    <text x="20" y="78" font-family="'Courier New',monospace" font-size="11" fill="#7a8399">${esc(message)}</text>
  </svg>`;
}

// Small stroke icons matching the hand-drawn set already used on the HTML
// pages (hex/shield motifs) — 12x12, stroke=currentColor. Kept as raw path
// fragments rather than full <svg> so they can be dropped straight into a
// parent <g fill="none" stroke="${color}"> without a nested viewBox.
const ICONS = {
  repo: '<path d="M2 4l4-2 4 2v5l-4 2-4-2V4Z"/><path d="M2 4l4 2 4-2"/><path d="M6 6v5"/>',
  star: '<path d="M6 1l1.5 3.2L11 4.7l-2.5 2.4.6 3.4L6 8.9 2.9 10.5l.6-3.4L1 4.7l3.5-.5L6 1Z" stroke-linejoin="round"/>',
  people: '<circle cx="4" cy="4" r="1.7"/><path d="M1 10.2c.5-2 1.8-3 3-3s2.5 1 3 3"/><circle cx="9.2" cy="4.6" r="1.3"/><path d="M8.1 10.2c.3-1.6 1-2.6 1.9-3"/>',
  bolt: '<path d="M6.6 1 2.2 7.2h2.9l-.9 3.8 4.6-6h-2.8L6.6 1Z" stroke-linejoin="round"/>',
};

function icon(name, x, y, color) {
  return `<g transform="translate(${x},${y})" fill="none" stroke="${color}" stroke-width="1.3" stroke-linecap="round">${ICONS[name]}</g>`;
}

function statBar(y, label, value, max, color, iconName) {
  const pct = Math.max(4, Math.min(100, Math.round((value / max) * 100)));
  return `
    ${iconName ? icon(iconName, 28, y - 10, color) : ''}
    <text x="${iconName ? 46 : 28}" y="${y}" class="lbl">${label}</text>
    <text x="332" y="${y}" text-anchor="end" class="lbl" filter="url(#glow)">${value}</text>
    <rect x="28" y="${y + 6}" width="304" height="4" fill="#1b2233"/>
    <rect x="28" y="${y + 6}" width="${(304 * pct) / 100}" height="4" fill="${color}" filter="url(#glow)"/>
    <rect x="28" y="${y + 6}" width="${(304 * pct) / 100}" height="1" fill="#ffffff" opacity="0.3"/>`;
}

function renderCyberpunk({ user, avatarUri, topLang, level, xp, totalStars, tier, color, fontFace }) {
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
      <radialGradient id="bg2" cx="95%" cy="100%" r="70%">
        <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.10"/>
        <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
      </radialGradient>
      <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
        <path d="M24 0H0V24" fill="none" stroke="${color}" stroke-width="0.5" opacity="0.5"/>
      </pattern>
      <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="2.4" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <rect width="360" height="360" fill="#05070c"/>
    <rect width="360" height="360" fill="url(#grid)" opacity="0.05"/>
    <rect width="360" height="360" fill="url(#bg)"/>
    <rect width="360" height="360" fill="url(#bg2)"/>
    ${shimmer}
    <polygon points="0,14 14,0 360,0 360,346 346,360 0,360" fill="none" stroke="#1b2233"/>
    <polygon points="0,14 14,0 360,0 360,346 346,360 0,360" fill="none" stroke="${color}" opacity="0.5" filter="url(#glow)">
      <animate attributeName="opacity" values="0.4;0.85;0.4" dur="3s" repeatCount="indefinite"/>
    </polygon>

    <rect x="20" y="20" width="58" height="20" fill="${color}" filter="url(#glow)"/>
    <text x="49" y="34" text-anchor="middle" class="tag" fill="#05070c">LV ${level}</text>
    <rect x="270" y="20" width="70" height="20" fill="none" stroke="${color}"/>
    <text x="305" y="34" text-anchor="middle" class="tag" fill="${color}">${tier}</text>

    <g transform="translate(144,54)">
      <polygon points="36,0 72,18 72,54 36,72 0,54 0,18" fill="#1b2233" stroke="${color}" filter="url(#glow)"/>
      ${avatarTag}
    </g>

    <text x="180" y="156" text-anchor="middle" class="t1">${name}</text>
    <text x="180" y="174" text-anchor="middle" class="t2">@${esc(user.login)}</text>
    <text x="180" y="194" text-anchor="middle" class="cls">${esc(classLabel.toUpperCase())}</text>

    ${statBar(224, 'REPOS', user.public_repos || 0, 60, color, 'repo')}
    ${statBar(254, 'STARS', totalStars, 200, color, 'star')}
    ${statBar(284, 'FOLLOWERS', user.followers || 0, 200, color, 'people')}

    <line x1="28" y1="312" x2="332" y2="312" stroke="#1b2233" stroke-dasharray="3,3"/>
    ${icon('bolt', 28, 326, color)}
    <text x="46" y="336" class="lbl">XP<title>${XP_FORMULA}</title></text>
    <text x="332" y="336" text-anchor="end" class="t1" filter="url(#glow)">${xp.toLocaleString()}</text>
  </svg>`;
}

function renderTerminal({ user, topLang, level, xp, totalStars, tier }) {
  const name = esc(user.name || user.login);
  const login = esc(user.login);
  const classLabel = `${classFor(topLang)}${topLang ? ':' + esc(topLang) : ''}`;
  const green = '#3ddc6a';
  const rows = [
    `user     ${login}`,
    `name     ${name}`,
    `class    ${classLabel.toLowerCase()}`,
    `rank     ${tier.toLowerCase()} (lv ${level})`,
    `repos    ${user.public_repos || 0}`,
    `stars    ${totalStars}`,
    `followers ${user.followers || 0}`,
    `xp       ${xp.toLocaleString()}`,
  ];

  return `<svg width="360" height="280" viewBox="0 0 360 280" xmlns="http://www.w3.org/2000/svg">
    <title>${name} — Contributor Card (terminal theme). XP = ${XP_FORMULA}</title>
    <defs>
      <style>
        .term{font:400 13px 'Courier New',monospace;fill:${green};}
        .dim{fill:#2a6b3d;}
        .head{font:700 13px 'Courier New',monospace;fill:${green};}
      </style>
    </defs>
    <rect width="360" height="280" fill="#020402"/>
    <rect width="360" height="280" fill="none" stroke="${green}" opacity="0.5"/>
    <rect x="0" y="0" width="360" height="24" fill="#0a140a"/>
    <circle cx="14" cy="12" r="4" fill="#ff4d6d"/>
    <circle cx="30" cy="12" r="4" fill="#ffb020"/>
    <circle cx="46" cy="12" r="4" fill="${green}"/>
    <text x="180" y="16" text-anchor="middle" class="dim" font-family="'Courier New',monospace" font-size="11">contributor.sh</text>
    <text x="16" y="46" class="head">$ whoami --verbose</text>
    ${rows.map((line, i) => `<text x="16" y="${68 + i * 20}" class="term">${esc(line)}</text>`).join('')}
    <text x="16" y="${68 + rows.length * 20 + 6}" class="term">$ <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/>_</text>
  </svg>`;
}

function renderGlass({ user, topLang, level, xp, totalStars, tier, color, avatarUri }) {
  const name = esc(user.name || user.login);
  const classLabel = `${classFor(topLang)}${topLang ? ' · ' + esc(topLang) : ''}`;
  const avatarTag = avatarUri
    ? `<image href="${avatarUri}" x="0" y="0" width="72" height="72" preserveAspectRatio="xMidYMid slice" clip-path="url(#circle)"/>`
    : '';

  return `<svg width="360" height="340" viewBox="0 0 360 340" xmlns="http://www.w3.org/2000/svg">
    <title>${name} — Contributor Card (glass theme). XP = ${XP_FORMULA}</title>
    <defs>
      <style>
        .t1{font:700 16px system-ui,sans-serif;fill:#1c2333;}
        .t2{font:500 11px system-ui,sans-serif;fill:#6b7488;}
        .lbl{font:500 9px system-ui,sans-serif;fill:#8891a3;letter-spacing:.5px;}
        .cls{font:600 11px system-ui,sans-serif;fill:${color};}
        .tag{font:700 11px system-ui,sans-serif;}
      </style>
      <clipPath id="circle"><circle cx="36" cy="36" r="36"/></clipPath>
      <linearGradient id="glassBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#eef1f8"/>
        <stop offset="100%" stop-color="#dde3f0"/>
      </linearGradient>
      <filter id="soft"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-opacity="0.12"/></filter>
    </defs>
    <rect width="360" height="340" rx="24" fill="url(#glassBg)"/>
    <rect x="16" y="16" width="328" height="308" rx="18" fill="#ffffff" opacity="0.6" filter="url(#soft)"/>

    <g transform="translate(32,32)">${avatarTag}<circle cx="36" cy="36" r="36" fill="none" stroke="${color}" stroke-width="2"/></g>
    <rect x="270" y="32" width="62" height="22" rx="11" fill="${color}"/>
    <text x="301" y="47" text-anchor="middle" class="tag" fill="#ffffff">LV ${level}</text>

    <text x="120" y="52" class="t1">${name}</text>
    <text x="120" y="70" class="t2">@${esc(user.login)}</text>
    <text x="32" y="128" class="cls">${esc(classLabel)}</text>

    <g transform="translate(32,150)">
      <rect width="94" height="60" rx="12" fill="#ffffff" opacity="0.7"/>
      <text x="47" y="24" text-anchor="middle" class="lbl">REPOS</text>
      <text x="47" y="46" text-anchor="middle" class="t1">${user.public_repos || 0}</text>
    </g>
    <g transform="translate(133,150)">
      <rect width="94" height="60" rx="12" fill="#ffffff" opacity="0.7"/>
      <text x="47" y="24" text-anchor="middle" class="lbl">STARS</text>
      <text x="47" y="46" text-anchor="middle" class="t1">${totalStars}</text>
    </g>
    <g transform="translate(234,150)">
      <rect width="94" height="60" rx="12" fill="#ffffff" opacity="0.7"/>
      <text x="47" y="24" text-anchor="middle" class="lbl">FOLLOWERS</text>
      <text x="47" y="46" text-anchor="middle" class="t1">${user.followers || 0}</text>
    </g>

    <text x="32" y="248" class="lbl">${tier}<title>${XP_FORMULA}</title></text>
    <text x="32" y="272" class="t1" font-size="20">${xp.toLocaleString()} XP</text>
  </svg>`;
}

function statBox(x, y, label, value, color, iconName) {
  return `
    <rect x="${x}" y="${y}" width="178" height="60" fill="none" stroke="#1b2233"/>
    <rect x="${x}" y="${y}" width="178" height="2" fill="${color}" opacity="0.35"/>
    ${iconName ? icon(iconName, x + 12, y + 8, color) : ''}
    <text x="${iconName ? x + 30 : x + 12}" y="${y + 22}" font-family="'Courier New',monospace" font-size="9" fill="#7a8399" letter-spacing="1">${label}</text>
    <text x="${x + 12}" y="${y + 46}" font-family="system-ui,sans-serif" font-weight="700" font-size="18" fill="${color}" filter="url(#glow)">${value}</text>`;
}

function wrapBio(text, maxChars) {
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
  return lines.slice(0, 3);
}

function renderDetailed({ user, avatarUri, topLang, langs, level, xp, totalStars, tier, color, fontFace }) {
  const name = esc(user.name || user.login);
  const classLabel = `${classFor(topLang)}${topLang ? ' · ' + esc(topLang) : ''}`;
  const displayFont = fontFace ? "'Chakra Petch',system-ui,sans-serif" : 'system-ui,sans-serif';
  const avatarTag = avatarUri
    ? `<image href="${avatarUri}" x="-9" y="-9" width="90" height="90" preserveAspectRatio="xMidYMid slice" clip-path="url(#hex)"/>`
    : '';
  const bioLines = user.bio ? wrapBio(esc(user.bio), 52) : [];
  const chips = langs.slice(0, 5);
  const height = 340 + bioLines.length * 16;

  return `<svg width="420" height="${height}" viewBox="0 0 420 ${height}" xmlns="http://www.w3.org/2000/svg">
    <title>${name} — Contributor Card (detailed theme). XP = ${XP_FORMULA}</title>
    <defs>
      ${fontFace ? `<style>${fontFace}</style>` : ''}
      <style>
        .t1{font:700 18px ${displayFont};fill:#e8edf5;}
        .t2{font:500 12px 'Courier New',monospace;fill:#7a8399;}
        .tag{font:700 11px 'Courier New',monospace;}
        .cls{font:600 12px ${displayFont};fill:${color};letter-spacing:1px;}
        .bio{font:400 12px system-ui,sans-serif;fill:#a8b0c2;}
        .chip{font:600 10px 'Courier New',monospace;fill:${color};}
      </style>
      <clipPath id="hex"><polygon points="36,2 68,20 68,52 36,70 4,52 4,20"/></clipPath>
      <radialGradient id="bg" cx="10%" cy="0%" r="80%">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.10"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="bg2" cx="95%" cy="100%" r="65%">
        <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
      </radialGradient>
      <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="2.4" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <rect width="420" height="${height}" fill="#05070c"/>
    <rect width="420" height="${height}" fill="url(#bg)"/>
    <rect width="420" height="${height}" fill="url(#bg2)"/>
    <polygon points="0,14 14,0 420,0 420,${height - 14} 406,${height} 0,${height}" fill="none" stroke="${color}" opacity="0.5" filter="url(#glow)"/>

    <g transform="translate(24,24)">
      <polygon points="36,0 72,18 72,54 36,72 0,54 0,18" fill="#1b2233" stroke="${color}" filter="url(#glow)"/>
      ${avatarTag}
    </g>
    <text x="112" y="48" class="t1">${name}</text>
    <text x="112" y="66" class="t2">@${esc(user.login)}</text>
    <text x="112" y="86" class="cls">${esc(classLabel.toUpperCase())}</text>
    <rect x="330" y="24" width="66" height="22" fill="${color}" filter="url(#glow)"/>
    <text x="363" y="39" text-anchor="middle" class="tag" fill="#05070c">LV ${level}</text>

    ${bioLines.map((line, i) => `<text x="24" y="${120 + i * 16}" class="bio">${line}</text>`).join('')}

    ${statBox(24, 140 + bioLines.length * 16, 'REPOS', user.public_repos || 0, color, 'repo')}
    ${statBox(212, 140 + bioLines.length * 16, 'STARS', totalStars, color, 'star')}
    ${statBox(24, 216 + bioLines.length * 16, 'FOLLOWERS', user.followers || 0, color, 'people')}
    ${statBox(212, 216 + bioLines.length * 16, 'XP', xp.toLocaleString(), color, 'bolt')}

    ${chips.map((lang, i) => `<rect x="${24 + i * 76}" y="${292 + bioLines.length * 16}" width="70" height="20" fill="none" stroke="${color}"/><text x="${59 + i * 76}" y="${306 + bioLines.length * 16}" text-anchor="middle" class="chip">${esc(lang)}</text>`).join('')}
  </svg>`;
}

const THEMES = { cyberpunk: renderCyberpunk, terminal: renderTerminal, glass: renderGlass, detailed: renderDetailed };

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

  const requestedTheme = url.searchParams.get('theme');
  const render = THEMES[requestedTheme] || THEMES.cyberpunk;

  const token = process.env.GITHUB_TOKEN;
  try {
    const user = await ghFetch(`https://api.github.com/users/${username}`, token);
    let repos = [];
    try {
      repos = await ghFetch(`https://api.github.com/users/${username}/repos?per_page=100&type=owner`, token);
    } catch {}

    const avatarUri = await avatarDataUri(`${user.avatar_url}&s=160`);
    const fontFace = CHAKRA_PETCH_FONT_FACE;
    const stats = computeStats(user, repos);
    const byteLangs = await byteWeightedLangs(repos, token);
    if (byteLangs.length) {
      stats.langs = byteLangs;
      stats.topLang = byteLangs[0];
    }
    const colorOverride = sanitizeColor(url.searchParams.get('color'));
    if (colorOverride) stats.color = colorOverride;

    return svg(render({ user, avatarUri, fontFace, ...stats }), 200, 'public, s-maxage=3600, stale-while-revalidate=86400');
  } catch (err) {
    if (err.status === 404) return svg(errorSVG(`user "${username}" not found`), 404, 'public, s-maxage=60');
    if (err.status === 403) return svg(errorSVG('rate limited — set GITHUB_TOKEN'), 503, 'public, s-maxage=60');
    return svg(errorSVG('failed to load'), 500, 'public, s-maxage=60');
  }
};
