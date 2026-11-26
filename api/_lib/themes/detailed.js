const { esc, colorForLang, avatarShape, truncate } = require('../shared');
const { SKINS } = require('./skins');

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

// detailed is the spec-sheet layout ENGINE: stat grid, rank gauge, bio, language
// bar + chips. The visual identity comes from a skin (see ./skins) — classic
// (default) reproduces the original look; cyberpunk/terminal/glass re-render the
// same layout in their design language.
function renderDetailed({ user, avatarUri, shape, langStats, totalStars, totalForks, prs, issues, color, fontFace, skin: skinNameArg }) {
  const skinName = skinNameArg;
  const skin = Object.prototype.hasOwnProperty.call(SKINS, skinName) ? SKINS[skinName] : SKINS.classic;
  const S = skin.palette;
  const W = skin.width || 420;
  // the endpoint sanitizes ?color=, but the renderer stays safe on its own too
  const accent = typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color) ? color : S.accent;
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
  const barW = W - 48;
  let cursor = 0;
  const segments = topLangs.map((l, i) => {
    const w = i === topLangs.length - 1 ? barW - cursor : Math.round((l.pct / shareSum) * barW);
    const seg = { x: cursor, w, color: colorForLang(l.name, accent) };
    cursor += w;
    return seg;
  });

  // dynamic height: section headers (when the skin draws them) push everything down
  const hdr = skin.headerH || 0;
  const statsY1 = 108 + bioBlockH + 14 + hdr;
  const statsY2 = statsY1 + 76;
  const langBarY = statsY2 + 76 + hdr;
  const legendY = langBarY + 34;
  const height = topLangs.length ? legendY + 12 + hdr : langBarY + 16 + hdr;

  const header1 = hdr ? skin.sectionHeader('TELEMETRY', 108 + bioBlockH + 6, W) : '';
  const header2 = hdr && topLangs.length ? skin.sectionHeader('LANGUAGES', langBarY - 12, W) : '';

  return `<svg width="${W}" height="${height}" viewBox="0 0 ${W} ${height}" xmlns="http://www.w3.org/2000/svg" data-skin="${skin.name}">
    <title>${name} — Contributor Card (detailed theme, ${skin.name} skin). Rank = ${RANK_FORMULA}</title>
    <defs>
      ${fontFace ? `<style>${fontFace}</style>` : ''}
      <style>${skin.css(displayFont)}
      </style>
      ${skin.defs(accent)}
      <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="2.4" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    ${skin.chassis(W, height, accent)}

    <g transform="translate(24,24)">
      ${avatarShape({ id: 'avatar', shape, size: 72, uri: avatarUri, ring: accent, bg: skin.avatarBg, glow: !skin.light })}
    </g>
    <text x="112" y="48" class="t1">${name}</text>
    <text x="112" y="66" class="t2">@${esc(user.login)}</text>

    <g transform="translate(${rCx},${rCy})">
      <title>${RANK_FORMULA}</title>
      <circle r="${rR}" fill="none" stroke="${S.rule}" stroke-width="5"/>
      <circle r="${rR}" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round"
        stroke-dasharray="${circumference}" stroke-dashoffset="${dashoffset}"
        transform="rotate(-90)" filter="url(#glow)"/>
      <text text-anchor="middle" y="6" class="rankGrade" fill="${accent}">${rank.grade}</text>
      <text text-anchor="middle" y="${rR + 16}" class="rankLbl">RANK</text>
    </g>

    ${bioLines.map((line, i) => `<text x="24" y="${108 + i * 16}" class="bio">${line}</text>`).join('')}

    ${header1}
    ${skin.statCell(24, statsY1, 'REPOS', user.public_repos || 0, accent, 'repo', 116)}
    ${skin.statCell(152, statsY1, 'STARS', totalStars ?? 0, accent, 'star', 116)}
    ${skin.statCell(280, statsY1, 'FORKS', totalForks ?? 0, accent, 'fork', 116)}
    ${skin.statCell(24, statsY2, 'FOLLOWERS', user.followers || 0, accent, 'people', 116)}
    ${skin.statCell(152, statsY2, 'PRS', prs ?? '—', accent, 'pr', 116)}
    ${skin.statCell(280, statsY2, 'ISSUES', issues ?? '—', accent, 'issue', 116)}

    ${topLangs.length ? `
      ${header2}
      ${skin.langTrack(24, langBarY, barW, 10)}
      ${segments.map((s) => `<rect x="${24 + s.x}" y="${langBarY}" width="${s.w}" height="10" fill="${s.color}"/>`).join('')}
      ${(() => {
        let lx = 24;
        return topLangs.map((l) => {
          const label = `${esc(l.name)} ${l.pct}%`;
          const entryW = (skin.legendPad || 14) + label.length * 5.4 + 14;
          if (lx + entryW - 14 > 24 + barW) return '';
          const out = skin.legendEntry(lx, legendY, colorForLang(l.name, accent), label);
          lx += entryW;
          return out;
        }).join('');
      })()}
    ` : ''}
  </svg>`;
}

module.exports = renderDetailed;
