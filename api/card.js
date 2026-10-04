const { checkRateLimit } = require('@vercel/firewall');
const { classFor, esc, ghFetch, avatarDataUri, computeStats, CHAKRA_PETCH_FONT_FACE, sanitizeColor, XP_FORMULA, byteWeightedLangs, colorForLang, icon, clearanceFor, avatarShape, sanitizeShape, truncate } = require('./_lib/shared');

function errorSVG(message) {
  return `<svg width="360" height="120" viewBox="0 0 360 120" xmlns="http://www.w3.org/2000/svg">
    <rect width="360" height="120" fill="#05070c"/>
    <rect width="360" height="120" fill="none" stroke="#ff4d6d"/>
    <text x="20" y="55" font-family="system-ui,sans-serif" font-weight="700" font-size="13" fill="#ff4d6d">CARD ERROR</text>
    <text x="20" y="78" font-family="'Courier New',monospace" font-size="11" fill="#7a8399">${esc(message)}</text>
  </svg>`;
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

function renderCyberpunk({ user, avatarUri, shape, topLang, level, xp, totalStars, tier, color, fontFace }) {
  const name = esc(user.name || user.login);
  const classLabel = `${classFor(topLang)}${topLang ? ' · ' + esc(topLang) : ''}`;
  const displayFont = fontFace ? "'Chakra Petch',system-ui,sans-serif" : 'system-ui,sans-serif';
  const shimmer = tier === 'LEGENDARY' ? `
    <rect x="-400" y="0" width="200" height="360" fill="#ffffff" opacity="0.08" transform="rotate(20)">
      <animateTransform attributeName="transform" type="translate" from="-400 0" to="760 0" dur="2.4s" repeatCount="indefinite"/>
    </rect>` : '';

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

    <g clip-path="url(#cardClip)">
      <rect width="360" height="360" fill="#05070c"/>
      <rect width="360" height="360" fill="url(#grid)" opacity="0.05"/>
      <rect width="360" height="360" fill="url(#bg)"/>
      <rect width="360" height="360" fill="url(#bg2)"/>
      ${shimmer}
    </g>
    <polygon points="0,14 14,0 360,0 360,346 346,360 0,360" fill="none" stroke="#1b2233"/>
    <polygon points="0,14 14,0 360,0 360,346 346,360 0,360" fill="none" stroke="${color}" opacity="0.5">
      <animate attributeName="opacity" values="0.4;0.85;0.4" dur="3s" repeatCount="indefinite"/>
    </polygon>

    <rect x="20" y="20" width="58" height="20" fill="${color}" filter="url(#glow)"/>
    <text x="49" y="34" text-anchor="middle" class="tag" fill="#05070c">LV ${level}</text>
    <rect x="270" y="20" width="70" height="20" fill="none" stroke="${color}"/>
    <text x="305" y="34" text-anchor="middle" class="tag" fill="${color}">${tier}</text>

    <g transform="translate(144,54)">
      ${avatarShape({ id: 'avatar', shape, size: 72, uri: avatarUri, ring: color, bg: '#1b2233', glow: true })}
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

function renderTerminal({ user, xp, totalStars, topLang, tier }) {
  const name = esc(truncate(user.name || user.login, 26));
  const login = esc(user.login);
  const green = '#3ddc6a';
  const rows = [
    ['login', login],
    ['alias', name.toLowerCase()],
    ['lang', topLang ? esc(topLang).toLowerCase() : 'unknown'],
    ['clearance', clearanceFor(tier).toLowerCase()],
    ['repos', user.public_repos || 0],
    ['stars', totalStars],
    ['followers', user.followers || 0],
    ['checksum', `0x${xp.toString(16)}`],
  ];
  const height = 108 + rows.length * 20;

  return `<svg width="360" height="${height}" viewBox="0 0 360 ${height}" xmlns="http://www.w3.org/2000/svg">
    <title>${name} — Contributor Card (terminal theme). checksum = hex(${XP_FORMULA})</title>
    <defs>
      <style>
        .term{font:400 13px 'Courier New',monospace;fill:${green};}
        .key{font:400 13px 'Courier New',monospace;fill:#2a6b3d;}
        .dim{fill:#2a6b3d;}
        .head{font:700 13px 'Courier New',monospace;fill:${green};}
        .ok{font:400 12px 'Courier New',monospace;fill:#2a6b3d;}
      </style>
    </defs>
    <rect width="360" height="${height}" fill="#020402"/>
    <rect width="360" height="${height}" fill="none" stroke="${green}" opacity="0.5"/>
    <rect x="0" y="0" width="360" height="24" fill="#0a140a"/>
    <circle cx="14" cy="12" r="4" fill="#ff4d6d"/>
    <circle cx="30" cy="12" r="4" fill="#ffb020"/>
    <circle cx="46" cy="12" r="4" fill="${green}"/>
    <text x="180" y="16" text-anchor="middle" class="dim" font-family="'Courier New',monospace" font-size="11">scan.sh</text>
    <text x="16" y="46" class="head">$ ./scan.sh --target=${login}</text>
    <text x="16" y="66" class="ok">[OK] identity verified</text>
    ${rows.map(([key, value], i) => `<text x="16" y="${88 + i * 20}" class="key">${key}</text><text x="112" y="${88 + i * 20}" class="term">${value}</text>`).join('')}
    <text x="16" y="${88 + rows.length * 20 + 6}" class="term">$ <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/>_</text>
  </svg>`;
}

function renderGlass({ user, avatarUri, shape, topLang, totalStars, langStats, color }) {
  const name = esc(user.name || user.login);
  const joined = new Date(user.created_at).getFullYear();

  // Language donut: top 4 by bytes plus an "Other" slice for the remainder.
  const segs = (langStats || []).slice(0, 4).map((l) => ({ name: l.name, pct: l.pct, color: colorForLang(l.name, color) }));
  const shown = segs.reduce((sum, l) => sum + l.pct, 0);
  if (segs.length && shown < 100) segs.push({ name: 'Other', pct: 100 - shown, color: '#c4cbdb' });
  const segTotal = segs.reduce((sum, l) => sum + l.pct, 0) || 1;
  const hasLangs = segs.length > 0;

  const tilesY = 132;
  const langLabelY = tilesY + 82;
  const donutCy = langLabelY + 48;
  const dividerY = hasLangs ? donutCy + 54 : tilesY + 90;
  const chipsY = dividerY + 12;
  const height = chipsY + 24 + 32;

  const R = 30;
  const C = 2 * Math.PI * R;
  let acc = 0;
  const arcs = segs.map((seg) => {
    const len = (seg.pct / segTotal) * C;
    const dash = Math.max(0, len - (segs.length > 1 ? 2.5 : 0));
    const out = `<circle cx="70" cy="${donutCy}" r="${R}" fill="none" stroke="${seg.color}" stroke-width="11" stroke-dasharray="${dash.toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}" transform="rotate(-90 70 ${donutCy})"/>`;
    acc += len;
    return out;
  }).join('');

  const tile = (x, label, value, ic) => `
    <g transform="translate(${x},${tilesY})">
      <rect width="94" height="60" rx="12" fill="#ffffff" opacity="0.7"/>
      ${icon(ic, 41, 9, color)}
      <text x="47" y="31" text-anchor="middle" class="lbl">${label}</text>
      <text x="47" y="51" text-anchor="middle" class="t1">${value}</text>
    </g>`;

  return `<svg width="360" height="${height}" viewBox="0 0 360 ${height}" xmlns="http://www.w3.org/2000/svg">
    <title>${name} — Contributor Card (glass theme)</title>
    <defs>
      <style>
        .t1{font:700 16px system-ui,sans-serif;fill:#1c2333;}
        .t2{font:500 11px system-ui,sans-serif;fill:#6b7488;}
        .lbl{font:500 9px system-ui,sans-serif;fill:#8891a3;letter-spacing:.5px;}
        .cls{font:600 11px system-ui,sans-serif;fill:${color};}
        .foot{font:500 10px system-ui,sans-serif;fill:#9aa2b3;}
        .sec{font:600 9px system-ui,sans-serif;fill:#8891a3;letter-spacing:1px;}
        .lg{font:500 11px system-ui,sans-serif;fill:#1c2333;}
        .lgp{font:600 11px system-ui,sans-serif;fill:#6b7488;}
        .big{font:700 15px system-ui,sans-serif;fill:#1c2333;}
        .small{font:500 8px system-ui,sans-serif;fill:#8891a3;}
      </style>
      <linearGradient id="glassBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#eef1f8"/>
        <stop offset="100%" stop-color="#dde3f0"/>
      </linearGradient>
      <filter id="soft"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-opacity="0.12"/></filter>
      <filter id="blob" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="26"/></filter>
      <filter id="avatarGlow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="6"/></filter>
    </defs>

    <rect width="360" height="${height}" rx="24" fill="url(#glassBg)"/>
    <circle cx="30" cy="20" r="70" fill="${color}" opacity="0.22" filter="url(#blob)"/>
    <circle cx="345" cy="60" r="60" fill="#8b5cf6" opacity="0.18" filter="url(#blob)"/>
    <circle cx="330" cy="${height - 30}" r="65" fill="${color}" opacity="0.14" filter="url(#blob)"/>

    <rect x="16" y="16" width="328" height="${height - 32}" rx="18" fill="#ffffff" opacity="0.55" filter="url(#soft)"/>
    <rect x="16" y="16" width="328" height="1.5" rx="1" fill="#ffffff" opacity="0.8"/>

    <g transform="translate(32,32)">
      <circle cx="36" cy="36" r="38" fill="${color}" opacity="0.35" filter="url(#avatarGlow)"/>
      ${avatarShape({ id: 'avatar', shape, size: 72, uri: avatarUri, ring: color, bg: '#dde3f0', ringWidth: 2 })}
    </g>

    <text x="120" y="50" class="t1">${name}</text>
    <g transform="translate(322,42)">
      <circle r="9" fill="${color}"/>
      <path d="M-4 0l3 3.2L4.2 -3.4" stroke="#ffffff" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <text x="120" y="68" class="t2">@${esc(user.login)}</text>
    ${topLang ? `<rect x="120" y="82" width="${18 + esc(topLang).length * 6.5}" height="20" rx="10" fill="${color}" opacity="0.12"/><text x="${130 + esc(topLang).length * 3.25}" y="96" text-anchor="middle" class="cls">${esc(topLang)}</text>` : ''}

    ${tile(32, 'REPOS', user.public_repos || 0, 'repo')}
    ${tile(133, 'STARS', totalStars, 'star')}
    ${tile(234, 'FOLLOWERS', user.followers || 0, 'people')}

    ${hasLangs ? `
    <text x="32" y="${langLabelY}" class="sec">LANGUAGES</text>
    <circle cx="70" cy="${donutCy}" r="${R}" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="11"/>
    ${arcs}
    <text x="70" y="${donutCy + 3}" text-anchor="middle" class="big">${segs[0].pct}%</text>
    <text x="70" y="${donutCy + 14}" text-anchor="middle" class="small">${esc(truncate(segs[0].name, 9))}</text>
    ${segs.map((seg, i) => `
      <circle cx="132" cy="${donutCy - 28 + i * 19}" r="4" fill="${seg.color}"/>
      <text x="144" y="${donutCy - 24 + i * 19}" class="lg">${esc(truncate(seg.name, 16))}</text>
      <text x="312" y="${donutCy - 24 + i * 19}" text-anchor="end" class="lgp">${seg.pct}%</text>`).join('')}` : ''}

    <line x1="32" y1="${dividerY}" x2="148" y2="${dividerY}" stroke="#c9d0e0" opacity="0.6"/>
    <path d="M180 ${dividerY - 4}l4 4-4 4-4-4Z" fill="${color}" opacity="0.45"/>
    <line x1="196" y1="${dividerY}" x2="312" y2="${dividerY}" stroke="#c9d0e0" opacity="0.6"/>
    ${(() => {
      const chips = [{ ic: 'calendar', text: `Joined ${joined}` }];
      const extra = user.location || (user.company ? user.company.replace(/^@/, '') : null);
      if (extra) chips.push({ ic: user.location ? 'pin' : 'building', text: esc(truncate(extra, 22)) });
      let cx = 32;
      return chips.slice(0, 2).map((c) => {
        const w = 26 + c.text.length * 5.6;
        const g = `<g transform="translate(${cx},${chipsY})">
          <rect width="${w}" height="24" rx="12" fill="#ffffff" opacity="0.6"/>
          ${icon(c.ic, 9, 6, '#8891a3')}
          <text x="26" y="16" class="foot">${c.text}</text>
        </g>`;
        cx += w + 8;
        return g;
      }).join('');
    })()}
  </svg>`;
}

function statBox(x, y, label, value, color, iconName, width = 178) {
  return `
    <rect x="${x}" y="${y}" width="${width}" height="60" fill="none" stroke="#1b2233"/>
    <rect x="${x}" y="${y}" width="${width}" height="2" fill="${color}" opacity="0.35"/>
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

// Detailed-theme-only. Uses the stable Search Issues API (not the commit
// search preview, which is still unlaunched years after its 2017 announcement)
// to count PRs and issues opened by a user. Fails soft — a search rate limit
// just omits these two fields rather than breaking the card.
async function prIssueCounts(username, token) {
  const headers = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `token ${token}`;
  const fetchCount = async (type) => {
    try {
      const res = await fetch(`https://api.github.com/search/issues?q=author:${username}+type:${type}&per_page=1`, { headers });
      if (!res.ok) return null;
      const data = await res.json();
      return typeof data.total_count === 'number' ? data.total_count : null;
    } catch {
      return null;
    }
  };
  const [prs, issues] = await Promise.all([fetchCount('pr'), fetchCount('issue')]);
  return { prs, issues };
}

// A transparent, soft-capped rank score — same "letter grade" idea used by
// stats cards across the GitHub README ecosystem, but our own simple formula
// rather than a hidden one, documented in full in docs/API.md. sqrt scaling
// (same diminishing-returns curve the XP->level formula already uses) means
// moderate activity still scores fairly instead of being crushed by caps
// tuned to top-percentile numbers. Missing PR/issue data (search rate-limited)
// just drops those two terms instead of failing.
const RANK_CAPS = { stars: 300, repos: 60, followers: 300, prs: 100, issues: 60 };
const RANK_WEIGHTS = { stars: 30, repos: 20, followers: 25, prs: 15, issues: 10 };
function computeRank({ totalStars, repoCount, followers, prs, issues }) {
  const contribution = (value, key) => {
    if (value === null || value === undefined) return 0; // missing data scores 0, not excluded
    return Math.min(1, Math.sqrt(value / RANK_CAPS[key])) * RANK_WEIGHTS[key];
  };
  const score = contribution(totalStars, 'stars') + contribution(repoCount, 'repos') + contribution(followers, 'followers')
    + contribution(prs, 'prs') + contribution(issues, 'issues');
  const maxPossible = Object.values(RANK_WEIGHTS).reduce((a, b) => a + b, 0);
  const pct = Math.round((score / maxPossible) * 100);
  let grade;
  if (pct >= 88) grade = 'S+';
  else if (pct >= 74) grade = 'S';
  else if (pct >= 56) grade = 'A';
  else if (pct >= 38) grade = 'B';
  else if (pct >= 20) grade = 'C';
  else grade = 'D';
  return { pct, grade };
}
const RANK_FORMULA = 'sqrt(stars/300)×30 + sqrt(repos/60)×20 + sqrt(followers/300)×25 + sqrt(prs/100)×15 + sqrt(issues/60)×10, each term capped at its own weight';

function renderDetailed({ user, avatarUri, shape, langStats, totalStars, totalForks, prs, issues, color, fontFace }) {
  const name = esc(user.name || user.login);
  const displayFont = fontFace ? "'Chakra Petch',system-ui,sans-serif" : 'system-ui,sans-serif';
  const bioLines = user.bio ? wrapBio(esc(user.bio), 52) : [];
  const bioBlockH = bioLines.length * 16;

  const rank = computeRank({ totalStars, repoCount: user.public_repos || 0, followers: user.followers || 0, prs, issues });
  const rCx = 372, rCy = 60, rR = 30;
  const circumference = 2 * Math.PI * rR;
  const dashoffset = circumference * (1 - rank.pct / 100);

  const topLangs = langStats.slice(0, 4);
  const shareSum = topLangs.reduce((sum, l) => sum + l.pct, 0) || 1;
  const barW = 372;
  let cursor = 0;
  const segments = topLangs.map((l, i) => {
    const w = i === topLangs.length - 1 ? barW - cursor : Math.round((l.pct / shareSum) * barW);
    const seg = { x: cursor, w, color: colorForLang(l.name, color) };
    cursor += w;
    return seg;
  });

  const statsY1 = 108 + bioBlockH + 14;
  const statsY2 = statsY1 + 76;
  const langBarY = statsY2 + 76;
  const legendY = langBarY + 34;
  const height = topLangs.length ? legendY + 6 : langBarY + 16;

  return `<svg width="420" height="${height}" viewBox="0 0 420 ${height}" xmlns="http://www.w3.org/2000/svg">
    <title>${name} — Contributor Card (detailed theme). Rank = ${RANK_FORMULA}</title>
    <defs>
      ${fontFace ? `<style>${fontFace}</style>` : ''}
      <style>
        .t1{font:700 18px ${displayFont};fill:#e8edf5;}
        .t2{font:500 12px 'Courier New',monospace;fill:#7a8399;}
        .bio{font:400 12px system-ui,sans-serif;fill:#a8b0c2;}
        .rankLbl{font:600 8px 'Courier New',monospace;fill:#7a8399;letter-spacing:1.5px;}
        .rankGrade{font:700 18px ${displayFont};fill:${color};}
        .legend{font:500 9px 'Courier New',monospace;fill:#a8b0c2;}
      </style>
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
      <clipPath id="cardClip"><polygon points="0,14 14,0 420,0 420,${height - 14} 406,${height} 0,${height}"/></clipPath>
    </defs>

    <g clip-path="url(#cardClip)">
      <rect width="420" height="${height}" fill="#05070c"/>
      <rect width="420" height="${height}" fill="url(#bg)"/>
      <rect width="420" height="${height}" fill="url(#bg2)"/>
    </g>
    <polygon points="0,14 14,0 420,0 420,${height - 14} 406,${height} 0,${height}" fill="none" stroke="${color}" opacity="0.5"/>

    <g transform="translate(24,24)">
      ${avatarShape({ id: 'avatar', shape, size: 72, uri: avatarUri, ring: color, bg: '#1b2233', glow: true })}
    </g>
    <text x="112" y="48" class="t1">${name}</text>
    <text x="112" y="66" class="t2">@${esc(user.login)}</text>

    <g transform="translate(${rCx},${rCy})">
      <title>${RANK_FORMULA}</title>
      <circle r="${rR}" fill="none" stroke="#1b2233" stroke-width="5"/>
      <circle r="${rR}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"
        stroke-dasharray="${circumference}" stroke-dashoffset="${dashoffset}"
        transform="rotate(-90)" filter="url(#glow)"/>
      <text text-anchor="middle" y="6" class="rankGrade">${rank.grade}</text>
      <text text-anchor="middle" y="${rR + 16}" class="rankLbl">RANK</text>
    </g>

    ${bioLines.map((line, i) => `<text x="24" y="${108 + i * 16}" class="bio">${line}</text>`).join('')}

    ${statBox(24, statsY1, 'REPOS', user.public_repos || 0, color, 'repo', 116)}
    ${statBox(152, statsY1, 'STARS', totalStars, color, 'star', 116)}
    ${statBox(280, statsY1, 'FORKS', totalForks, color, 'fork', 116)}
    ${statBox(24, statsY2, 'FOLLOWERS', user.followers || 0, color, 'people', 116)}
    ${statBox(152, statsY2, 'PRS', prs ?? '—', color, 'pr', 116)}
    ${statBox(280, statsY2, 'ISSUES', issues ?? '—', color, 'issue', 116)}

    ${topLangs.length ? `
      <rect x="24" y="${langBarY}" width="${barW}" height="10" rx="5" fill="#1b2233"/>
      ${segments.map((s) => `<rect x="${24 + s.x}" y="${langBarY}" width="${s.w}" height="10" fill="${s.color}"/>`).join('')}
      ${(() => {
        let lx = 24;
        return topLangs.map((l) => {
          const label = `${esc(l.name)} ${l.pct}%`;
          const entryW = 14 + label.length * 5.4 + 14;
          if (lx + entryW - 14 > 24 + barW) return '';
          const out = `<circle cx="${lx + 4}" cy="${legendY - 3}" r="3" fill="${colorForLang(l.name, color)}"/><text x="${lx + 12}" y="${legendY}" class="legend">${label}</text>`;
          lx += entryW;
          return out;
        }).join('');
      })()}
    ` : ''}
  </svg>`;
}

const THEMES = { cyberpunk: renderCyberpunk, terminal: renderTerminal, glass: renderGlass, detailed: renderDetailed };
// Each theme's natural avatar frame; ?shape= overrides it (terminal has no avatar).
const THEME_SHAPE = { cyberpunk: 'hex', detailed: 'rounded', glass: 'circle', terminal: 'hex' };

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
  const themeName = THEMES[requestedTheme] ? requestedTheme : 'cyberpunk';
  const render = THEMES[themeName];
  const shape = sanitizeShape(url.searchParams.get('shape'), THEME_SHAPE[themeName]);

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
    const langStats = await byteWeightedLangs(repos, token);
    if (langStats.length) {
      stats.langs = langStats.map((l) => l.name);
      stats.topLang = langStats[0].name;
    }
    const colorOverride = sanitizeColor(url.searchParams.get('color'));
    if (colorOverride) stats.color = colorOverride;

    let prs = null, issues = null;
    if (requestedTheme === 'detailed') {
      ({ prs, issues } = await prIssueCounts(username, token));
    }

    return svg(render({ user, avatarUri, shape, fontFace, langStats, prs, issues, ...stats }), 200, 'public, s-maxage=3600, stale-while-revalidate=86400');
  } catch (err) {
    if (err.status === 404) return svg(errorSVG(`user "${username}" not found`), 404, 'public, s-maxage=60');
    if (err.status === 403) return svg(errorSVG('rate limited — set GITHUB_TOKEN'), 503, 'public, s-maxage=60');
    return svg(errorSVG('failed to load'), 500, 'public, s-maxage=60');
  }
};
