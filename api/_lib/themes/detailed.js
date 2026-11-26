const { esc, colorForLang, icon, avatarShape, MONO , truncate } = require('../shared');

function statBox(x, y, label, value, color, iconName, width = 178) {
  return `
    <rect x="${x}" y="${y}" width="${width}" height="60" fill="none" stroke="#1a2434"/>
    <rect x="${x}" y="${y}" width="${width}" height="2" fill="${color}" opacity="0.35"/>
    ${iconName ? icon(iconName, x + 12, y + 8, color) : ''}
    <text x="${iconName ? x + 30 : x + 12}" y="${y + 22}" font-family="${MONO}" font-size="10" fill="#7fb8c4" letter-spacing=".6">${label}</text>
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


const RANK_CAPS = { stars: 300, repos: 60, followers: 300, prs: 100, issues: 60 };
const RANK_WEIGHTS = { stars: 30, repos: 20, followers: 25, prs: 15, issues: 10 };
function computeRank({ totalStars, repoCount, followers, prs, issues }) {
  const contribution = (value, key) => {
    if (value === null || value === undefined) return 0;
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
  const name = esc(truncate(user.name || user.login, 22));
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
  const height = topLangs.length ? legendY + 12 : langBarY + 16;

  return `<svg width="420" height="${height}" viewBox="0 0 420 ${height}" xmlns="http://www.w3.org/2000/svg">
    <title>${name} — Contributor Card (detailed theme). Rank = ${RANK_FORMULA}</title>
    <defs>
      ${fontFace ? `<style>${fontFace}</style>` : ''}
      <style>
        .t1{font:700 18px ${displayFont};fill:#e8edf5;}
        .t2{font:500 12px ${MONO};fill:#7fb8c4;}
        .bio{font:400 12px system-ui,sans-serif;fill:#9db4c0;}
        .rankLbl{font:600 10px ${MONO};fill:#7fb8c4;letter-spacing:1px;}
        .rankGrade{font:700 18px ${displayFont};fill:${color};}
        .legend{font:500 10px ${MONO};fill:#9db4c0;}
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
      <clipPath id="cardClip"><polygon points="14,0 420,0 420,${height - 14} 406,${height} 0,${height} 0,14"/></clipPath>
    </defs>

    <g clip-path="url(#cardClip)">
      <rect width="420" height="${height}" fill="#04070d"/>
      <rect width="420" height="${height}" fill="url(#bg)"/>
      <g opacity="1">${Array.from({ length: Math.ceil(height / 6) }, (_, i) => `<line x1="10" y1="${i * 6}" x2="410" y2="${i * 6}" stroke="${color}" stroke-width="1" opacity="0.06"/>`).join('')}</g>
      <rect x="0" y="-8" width="420" height="6" fill="${color}" opacity="0.08">
        <animate attributeName="y" from="-8" to="${height}" dur="6.5s" repeatCount="indefinite"/>
      </rect>
      <rect width="420" height="${height}" fill="url(#bg2)"/>
    </g>


    <g transform="translate(24,24)">
      ${avatarShape({ id: 'avatar', shape, size: 72, uri: avatarUri, ring: color, bg: '#1a2434', glow: true })}
    </g>
    <text x="112" y="48" class="t1">${name}</text>
    <text x="112" y="66" class="t2">@${esc(user.login)}</text>

    <g transform="translate(${rCx},${rCy})">
      <title>${RANK_FORMULA}</title>
      <circle r="${rR}" fill="none" stroke="#1a2434" stroke-width="5"/>
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
      <rect x="24" y="${langBarY}" width="${barW}" height="10" rx="5" fill="#1a2434"/>
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


module.exports = renderDetailed;
