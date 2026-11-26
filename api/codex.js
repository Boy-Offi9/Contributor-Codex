const { isRateLimited } = require('./_lib/ratelimit');
const errors = require('./_lib/errors');
const { fetchCalendar, computeStreaks, pickToken } = require('./_lib/contrib');
const { esc, sanitizeColor, CHAKRA_PETCH_FONT_FACE, colorForLang, icon, badge, sanitizeBadge, avatarShape, sanitizeShape, DISPLAY, readableAccent, svgReply, truncate } = require('./_lib/svg');
const { ghFetch, avatarDataUri, byteWeightedLangs, isGhName, loadUserWithRepos } = require('./_lib/github');
const { computeStats, classFor, trophyTier } = require('./_lib/game');

const WIDTH = 480;

const errorSVG = (message) => errors.errorSVG({ title: 'CODEX ERROR', message });

const COLLECTION_TROPHIES = [
  { key: 'STARGAZER', label: 'STARS', icon: 'star', thresholds: [10, 50, 200, 1000], value: (s, u) => s.totalStars },
  { key: 'BUILDER', label: 'REPOS', icon: 'repo', thresholds: [10, 25, 50, 100], value: (s, u) => u.public_repos || 0 },
  { key: 'POLYGLOT', label: 'LANGS', icon: 'globe', thresholds: [3, 6, 10, 15], value: (s, u) => s.langs.length },
  { key: 'VETERAN', label: 'YEARS', icon: 'calendar', thresholds: [1, 3, 5, 8], value: (s, u) => Math.floor(s.years) },
];

const LABEL_FONT = DISPLAY;

function statBox(x, y, w, label, value, color, iconName, suffix) {
  return `
    <rect x="${x}" y="${y}" width="${w}" height="58" fill="none" stroke="#1a2434"/>
    <rect x="${x}" y="${y}" width="${w}" height="2" fill="${color}" opacity="0.35"/>
    ${icon(iconName, x + 10, y + 9, color)}
    <text x="${x + 28}" y="${y + 20}" font-family="${LABEL_FONT}" font-weight="600" font-size="10" fill="#8a94ab" letter-spacing=".5">${label}</text>
    <text x="${x + 10}" y="${y + 46}" font-family="${LABEL_FONT}" font-weight="700" font-size="20" fill="${color}" filter="url(#glow)">${value}</text>${suffix ? `
    <text x="${x + 10 + String(value).length * 12.5 + 5}" y="${y + 46}" font-family="${LABEL_FONT}" font-weight="600" font-size="11" fill="#8a94ab">${suffix}</text>` : ''}`;
}

function streakStrip(y, streaks, color) {
  const w = (WIDTH - 40 - 16) / 3;
  return [
    statBox(20, y, w, 'CURRENT STREAK', streaks.current.length, color, 'flame', 'days'),
    statBox(20 + (w + 8), y, w, 'LONGEST STREAK', streaks.longest.length, color, 'trophy', 'days'),
    statBox(20 + 2 * (w + 8), y, w, 'CONTRIBUTIONS', streaks.total.toLocaleString('en-US'), color, 'pulse'),
  ].join('');
}

function achievement(x, y, cellW, def, value, tier, shape) {
  const cx = x + cellW / 2;
  const pct = tier.nextThreshold ? Math.min(100, Math.round((value / tier.nextThreshold) * 100)) : 100;
  const barW = 56;
  return `
    ${badge({ shape, cx, cy: y + 24, size: 46, tier, iconName: def.icon })}
    <text x="${cx}" y="${y + 66}" text-anchor="middle" font-family="${LABEL_FONT}" font-weight="700" font-size="16" fill="${tier.color}">${value}</text>
    <text x="${cx}" y="${y + 80}" text-anchor="middle" font-family="${LABEL_FONT}" font-weight="600" font-size="10.5" fill="#8a94ab" letter-spacing=".8">${def.label}</text>
    <text x="${cx}" y="${y + 93}" text-anchor="middle" font-family="${LABEL_FONT}" font-weight="700" font-size="10" fill="${tier.color}" letter-spacing=".6">${tier.name}</text>
    <rect x="${cx - barW / 2}" y="${y + 99}" width="${barW}" height="3" fill="#1a2434"/>
    <rect x="${cx - barW / 2}" y="${y + 99}" width="${(barW * pct) / 100}" height="3" fill="${tier.color}"/>`;
}

function render({ user, stats, avatarUri, topLangs, fontFace, color, badgeShape, avatarFrame, streaks }) {
  const displayFont = LABEL_FONT;
  const name = esc(truncate(user.name || user.login, 20));
  const classLabel = classFor(stats.topLang);

  const headerH = 96;
  const statsY = headerH + 14;
  const streakY = statsY + 58 + 8;
  const streakBlock = streaks ? 58 + 10 : 0;
  const shieldsY = statsY + 58 + 18 + streakBlock;
  const langsY = shieldsY + 102 + 14;
  const langChips = topLangs.slice(0, 5);
  const height = langChips.length ? langsY + 56 : langsY + 4;

  // kit HUD chassis (scifi-ui-kit HudFramePainter)
  const CH = 14;
  const outline = `${CH},0 ${WIDTH},0 ${WIDTH},${height - CH} ${WIDTH - CH},${height} 0,${height} 0,${CH}`;
  const mixC = (a, b, f) => {
    const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
    const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
    return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * f).toString(16).padStart(2, '0')).join('');
  };
  const bracketCol = mixC(color, '#ffffff', 0.55);
  const sweepCol = mixC(color, '#ffffff', 0.8);
  const per = 2 * (WIDTH + height) - 2 * (2 * CH) + 2 * CH * Math.SQRT2;
  const seg = per * 0.14;
  const avatarX = 20;
  const textX = 104;

  const xpLabel = `${stats.xp.toLocaleString()} XP`;
  const boxW = 104;
  const cellW = (WIDTH - 40) / 4;

  return `<svg width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" xmlns="http://www.w3.org/2000/svg">
    <title>${esc(user.login)} — Codex Collection</title>
    <defs>
      ${fontFace ? `<style>${fontFace}</style>` : ''}
      <radialGradient id="bg" cx="90%" cy="0%" r="90%">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="bg2" cx="5%" cy="100%" r="70%">
        <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.10"/>
        <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
      </radialGradient>
      <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
        <path d="M24 0H0V24" fill="none" stroke="${color}" stroke-width="0.5" stroke-opacity="0.03"/>
      </pattern>
      <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="1.5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <polygon points="${outline}" fill="#04070d"/>
    <polygon points="${outline}" fill="url(#bg)"/>
    <polygon points="${outline}" fill="url(#bg2)"/>
    ${Array.from({ length: Math.ceil(height / 6) }, (_, i) => `<line x1="10" y1="${i * 6}" x2="${WIDTH - 10}" y2="${i * 6}" stroke="${color}" stroke-width="1" opacity="0.06"/>`).join('')}
    <rect x="0" y="-8" width="${WIDTH}" height="6" fill="${color}" opacity="0.08">
      <animate attributeName="y" from="-8" to="${height}" dur="6s" repeatCount="indefinite"/>
    </rect>
    <polygon points="${outline}" fill="none" stroke="${color}" stroke-opacity="0.08" stroke-width="6"/>
    <polygon points="${outline}" fill="none" stroke="${color}" stroke-opacity="0.18" stroke-width="3.2"/>
    <polygon points="${outline}" fill="none" stroke="${color}" stroke-opacity="0.9" stroke-width="1.3"/>
    <polygon points="${outline}" fill="none" stroke="${sweepCol}" stroke-width="2" stroke-dasharray="${seg.toFixed(1)} ${(per - seg).toFixed(1)}">
      <animate attributeName="stroke-dashoffset" from="${per.toFixed(1)}" to="0" dur="3.2s" repeatCount="indefinite"/>
    </polygon>
    <g fill="none" stroke="${bracketCol}" stroke-width="2.6" stroke-linecap="square">
      <path d="M${WIDTH - 36} 2 H${WIDTH - 2} V36"/>
      <path d="M36 ${height - 2} H2 V${height - 36}"/>
    </g>

    <g transform="translate(${avatarX},14)">${avatarShape({ id: 'avatar', shape: avatarFrame, size: 68, uri: avatarUri, ring: color, bg: '#1a2434', glow: true })}</g>
    <text x="${textX}" y="36" font-family="${displayFont}" font-weight="700" font-size="19" fill="#e8edf5">${name}</text>
    <text x="${textX}" y="54" font-family="${LABEL_FONT}" font-weight="600" font-size="12" fill="#8a94ab">@${esc(user.login)}</text>
    <text x="${textX}" y="74" font-family="${LABEL_FONT}" font-weight="700" font-size="11" fill="${color}" letter-spacing=".6">${esc(classLabel.toUpperCase())}${stats.topLang ? ' · ' + esc(stats.topLang) : ''}</text>
    <rect x="${WIDTH - 78}" y="22" width="58" height="20" fill="${color}" filter="url(#glow)"/>
    <text x="${WIDTH - 49}" y="36" text-anchor="middle" font-family="${LABEL_FONT}" font-weight="700" font-size="12" fill="#05070c">LV ${stats.level}</text>
    ${icon('bolt', WIDTH - 20 - xpLabel.length * 6.6 - 16, 47, color)}
    <text x="${WIDTH - 20}" y="57" text-anchor="end" font-family="${LABEL_FONT}" font-weight="600" font-size="11.5" fill="#8a94ab">${xpLabel}</text>

    <line x1="20" y1="${headerH}" x2="${WIDTH - 20}" y2="${headerH}" stroke="#1a2434"/>

    ${statBox(20, statsY, boxW, 'STARS', stats.totalStars, color, 'star')}
    ${statBox(20 + (boxW + 8), statsY, boxW, 'FORKS', stats.totalForks, color, 'fork')}
    ${statBox(20 + 2 * (boxW + 8), statsY, boxW, 'FOLLOWERS', user.followers || 0, color, 'people')}
    ${statBox(20 + 3 * (boxW + 8), statsY, boxW, 'REPOS', user.public_repos || 0, color, 'repo')}

    ${streaks ? streakStrip(streakY, streaks, color) : ''}

    ${COLLECTION_TROPHIES.map((t, i) => {
      const value = t.value(stats, user);
      const tier = trophyTier(value, t.thresholds);
      return achievement(20 + i * cellW, shieldsY, cellW, t, value, tier, badgeShape);
    }).join('')}

    ${langChips.length ? `
      <text x="20" y="${langsY + 14}" font-family="${LABEL_FONT}" font-weight="600" font-size="10.5" fill="#8a94ab" letter-spacing=".8">TOP LANGUAGES</text>
      ${(() => {
        let cx = 20;
        return langChips.map((lang) => {
          const w = 32 + lang.length * 7.4;
          if (cx + w > WIDTH - 20) return '';
          const chip = `<rect x="${cx}" y="${langsY + 24}" width="${w}" height="26" fill="none" stroke="#1a2434"/><circle cx="${cx + 13}" cy="${langsY + 37}" r="4" fill="${colorForLang(lang, color)}"/><text x="${cx + 24}" y="${langsY + 41.5}" font-family="${LABEL_FONT}" font-weight="600" font-size="11.5" fill="#d3d9e8">${esc(lang)}</text>`;
          cx += w + 8;
          return chip;
        }).join('');
      })()}` : ''}
  </svg>`;
}

function svg(body, status, cacheControl) {
  return svgReply(body, status, cacheControl);
}

module.exports.GET = async (request) => {
  const rateLimited = await isRateLimited('codex-endpoint', request);
  if (rateLimited) return svg(errorSVG('rate limited — slow down a bit'), 429, 'no-store');

  const url = new URL(request.url);
  const username = (url.searchParams.get('username') || '').trim();
  if (!username) return svg(errorSVG('missing ?username='), 400);
  if (!isGhName(username)) return svg(errorSVG('invalid username'), 400);

  const token = pickToken(request, url.searchParams) || process.env.GITHUB_TOKEN;
  const personalized = Boolean(pickToken(request, url.searchParams));
  try {
    const { user, repos } = await loadUserWithRepos(username, token);

    const stats = computeStats(user, repos);
    const wantStreak = ['1', 'true', 'yes'].includes((url.searchParams.get('streak') || '').toLowerCase());
    const [avatarUri, langStats, streaks] = await Promise.all([
      avatarDataUri(`${user.avatar_url}&s=160`),
      byteWeightedLangs(repos, token),
      wantStreak ? fetchCalendar(username, token).then((c) => computeStreaks(c.days)).catch(() => null) : null,
    ]);
    const topLangs = langStats.map((l) => l.name);
    const color = readableAccent(sanitizeColor(url.searchParams.get('color')), 'dark') || '#00e5ff';
    const avatarFrame = sanitizeShape(url.searchParams.get('shape'), 'hex');
    const badgeShape = sanitizeBadge(url.searchParams.get('badge'), 'hex');

    return svg(render({ user, stats, avatarUri, topLangs, fontFace: CHAKRA_PETCH_FONT_FACE, color, badgeShape, avatarFrame, streaks }), 200, personalized ? 'no-store' : 'public, s-maxage=3600, stale-while-revalidate=86400, stale-if-error=604800');
  } catch (err) {
    if (err.status === 404) return svg(errorSVG(`user "${username}" not found`), 404, 'public, s-maxage=10');
    if (err.status === 429) return svg(errorSVG('rate limited — set GITHUB_TOKEN'), 503, 'public, s-maxage=10');
    if (err.status === 403) return svg(errorSVG('GitHub refused this request'), 502, 'public, s-maxage=10');
    if (err.status === 504) return svg(errorSVG('GitHub is slow right now — try again soon'), 504, 'public, s-maxage=10');
    return svg(errorSVG('failed to load'), 500, 'public, s-maxage=10');
  }
};
