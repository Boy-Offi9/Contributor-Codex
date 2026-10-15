const { isRateLimited } = require('./_lib/ratelimit');
const { sanitizeColor, icon, esc, isGhName, readableAccent, luminance, avatarDataUri, avatarShape, sanitizeShape, truncate } = require('./_lib/shared');
const { fetchCalendar, computeStreaks, listStreaks, fmtRange, fmtDate } = require('./_lib/contrib');
const { FONT, paletteFor, styleFromParams, ink, inkTheme, sanitizeTheme, frame, errorCard, svgResponse } = require('./_lib/frame');

const WIDTH = 480;
const BASE_HEIGHT = 172;
const HEADER_H = 72;   // ?profile=1 — avatar, name, join year
const FOOTER_H = 34;   // ?year=1   — contributions this year
const CACHE_OK = 'public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=604800'; // 6h — a streak only changes daily
const CACHE_ERR = 'public, s-maxage=60';
const THEME_SHAPE = { cyberpunk: 'hex', glass: 'circle', terminal: 'hex' };

const fmtNumber = (n) => n.toLocaleString('en-US');
const flag = (v) => ['1', 'true', 'yes'].includes(String(v || '').toLowerCase());

// Everything animated lives in CSS (not SMIL) so it can sit behind a
// prefers-reduced-motion query: people who ask for less motion get the
// finished, static card.
function animationCss(circ) {
  return `
    @media (prefers-reduced-motion: no-preference){
      .ringArc{animation:ringDraw 1.5s cubic-bezier(.22,.8,.3,1) .2s both}
      @keyframes ringDraw{from{stroke-dashoffset:${circ.toFixed(2)}}}
      .flame{transform-box:fill-box;transform-origin:50% 100%;animation:flick 2.6s ease-in-out infinite}
      @keyframes flick{0%,100%{transform:scale(1) rotate(0deg)}35%{transform:scale(1.1,1.16) rotate(-4deg)}70%{transform:scale(.95,1.04) rotate(3deg)}}
      .halo{animation:halo 3.2s ease-in-out infinite}
      @keyframes halo{0%,100%{opacity:.06}50%{opacity:.42}}
      .num{animation:rise .8s ease-out both}
      @keyframes rise{from{opacity:0;transform:translateY(6px)}}
    }`;
}

function render({ user, streaks, color, theme, opts }) {
  const { animate, profile, year, thisYear, avatarUri, shape, style } = opts;
  const p = paletteFor(theme, style);
  const today = new Date().toISOString().slice(0, 10);
  const { total, since, current, longest } = streaks;
  const cols = [WIDTH / 6, WIDTH / 2, (WIDTH * 5) / 6];
  const cy = 66;
  const top = profile ? HEADER_H : 0;
  const height = BASE_HEIGHT + top + (year ? FOOTER_H : 0);

  // "Since day one": the range starts on the account's join date, not on the
  // first day that happened to have a contribution.
  const start = (user.createdAt || '').slice(0, 10) || since;
  const startYear = start && start.slice(0, 4) !== today.slice(0, 4);
  const totalRange = start ? `${fmtDate(start, startYear)} – Present` : 'no contributions yet';
  const currentRange = fmtRange(current.start, current.end, today, current.length > 0);
  const longestRange = fmtRange(longest.start, longest.end, today, false);

  // Ring shows the current streak relative to the personal best. The arc is a
  // full-length dash shifted by dashoffset so the draw-in animation can start
  // from "empty" and end exactly where the static card sits.
  const r = 33;
  const circ = 2 * Math.PI * r;
  const progress = longest.length ? Math.min(1, current.length / longest.length) : 0;
  const offset = (circ * (1 - progress)).toFixed(2);

  const bigNumber = (x, value) =>
    `<text class="num" x="${x}" y="${cy + 10}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${String(value).length > 5 ? 26 : 30}" fill="${p.text}">${value}</text>`;
  const label = (x, text, strong) =>
    `<text x="${x}" y="126" text-anchor="middle" font-family="${FONT}" font-weight="${strong ? 700 : 600}" font-size="13" fill="${strong ? ink(color, inkTheme(theme, style)) : p.sub}">${text}</text>`;
  const range = (x, text) =>
    `<text x="${x}" y="146" text-anchor="middle" font-family="${FONT}" font-weight="600" font-size="11" fill="${p.dim}">${esc(text)}</text>`;

  const header = profile ? `
    <g transform="translate(22,13)">${avatarShape({ id: 'streakAvatar', shape, size: 46, uri: avatarUri, ring: color, bg: p.track, glow: false })}</g>
    <text x="84" y="34" font-family="${FONT}" font-weight="700" font-size="16" fill="${p.text}">${esc(truncate(user.name || user.login, 22))}</text>
    <text x="84" y="52" font-family="${FONT}" font-weight="600" font-size="12" fill="${p.dim}">@${esc(user.login)}</text>
    <text x="${WIDTH - 22}" y="40" text-anchor="end" font-family="${FONT}" font-weight="600" font-size="11.5" fill="${p.dim}">Since ${esc((user.createdAt || since || today).slice(0, 4))}</text>
    <line x1="22" y1="${HEADER_H - 2}" x2="${WIDTH - 22}" y2="${HEADER_H - 2}" stroke="${p.rule}"/>` : '';

  const footer = year ? `
    <line x1="22" y1="${top + BASE_HEIGHT - 8}" x2="${WIDTH - 22}" y2="${top + BASE_HEIGHT - 8}" stroke="${p.rule}"/>
    <text x="${WIDTH / 2}" y="${top + BASE_HEIGHT + 16}" text-anchor="middle" font-family="${FONT}" font-weight="600" font-size="12.5" fill="${p.sub}"><tspan font-weight="700" fill="${p.text}">${fmtNumber(thisYear)}</tspan> contributions in ${new Date().getUTCFullYear()}</text>` : '';

  const content = `
    <line x1="${WIDTH / 3}" y1="26" x2="${WIDTH / 3}" y2="${BASE_HEIGHT - 26}" stroke="${p.rule}"/>
    <line x1="${(WIDTH * 2) / 3}" y1="26" x2="${(WIDTH * 2) / 3}" y2="${BASE_HEIGHT - 26}" stroke="${p.rule}"/>

    ${bigNumber(cols[0], fmtNumber(total))}
    ${label(cols[0], 'Total Contributions')}
    ${range(cols[0], totalRange)}

    <circle cx="${cols[1]}" cy="${cy}" r="${r}" fill="none" stroke="${p.track}" stroke-width="5"/>
    ${animate && current.length > 0 ? `<circle class="halo" cx="${cols[1]}" cy="${cy}" r="${r + 7}" fill="none" stroke="${color}" stroke-width="2" opacity="0.2"/>` : ''}
    <circle class="ringArc" cx="${cols[1]}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"
      stroke-dasharray="${circ.toFixed(2)} ${circ.toFixed(2)}" stroke-dashoffset="${offset}" transform="rotate(-90 ${cols[1]} ${cy})"${progress > 0 ? ' filter="url(#glow)"' : ''}/>
    <circle cx="${cols[1]}" cy="${cy - r}" r="10" fill="${p.bg}"/>
    <g class="flame">${icon('flame', cols[1] - 8, cy - r - 8, current.length > 0 ? color : p.dim, 1.35)}</g>
    ${bigNumber(cols[1], current.length)}
    ${label(cols[1], 'Current Streak', true)}
    ${range(cols[1], currentRange)}

    ${bigNumber(cols[2], longest.length)}
    ${label(cols[2], 'Longest Streak')}
    ${range(cols[2], longestRange)}`;

  const body = `${header}<g transform="translate(0,${top})">${content}</g>${footer}`;
  return frame({
    width: WIDTH, height, color, theme, style,
    css: animate ? animationCss(circ) : '',
    title: `${user.login} — Contribution streak`,
    body,
  });
}

// ?debug=1 — what the card was computed from. Use it when a number looks
// wrong: it shows which years GitHub returned, how many days and contributions
// each held, and the five longest streaks it found.
function debugResponse(cal, streaks, runs) {
  const perYear = {};
  for (const d of cal.days) {
    const y = d.date.slice(0, 4);
    perYear[y] = perYear[y] || { days: 0, activeDays: 0, contributions: 0 };
    perYear[y].days += 1;
    perYear[y].contributions += d.count;
    if (d.count > 0) perYear[y].activeDays += 1;
  }
  const body = {
    login: cal.login,
    createdAt: cal.createdAt,
    firstDay: cal.days[0] && cal.days[0].date,
    lastDay: cal.days[cal.days.length - 1] && cal.days[cal.days.length - 1].date,
    perYear,
    total: streaks.total,
    current: streaks.current,
    longest: streaks.longest,
    topStreaks: runs.slice().sort((a, b) => b.length - a.length).slice(0, 5),
    note: 'Only contributions GitHub exposes to the server token are counted. Private-repo activity appears only if the profile setting "Include private contributions" is on.',
  };
  return new Response(JSON.stringify(body, null, 2), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=300' } });
}

module.exports.GET = async (request) => {
  const rateLimited = await isRateLimited('streak-endpoint', request);
  if (rateLimited) return svgResponse(errorCard('rate limited — slow down a bit'), 429, 'no-store');

  const url = new URL(request.url);
  const username = (url.searchParams.get('username') || '').trim();
  if (!username) return svgResponse(errorCard('missing ?username='), 400);
  if (!isGhName(username)) return svgResponse(errorCard('invalid username'), 400);

  try {
    const cal = await fetchCalendar(username, process.env.GITHUB_TOKEN);
    const theme = sanitizeTheme(url.searchParams.get('theme'));
    const style = styleFromParams(url.searchParams, theme);
    // With a custom background, "is this card light or dark?" follows the colour, not the theme.
    const accentTheme = style.bg ? (luminance(style.bg) > 0.4 ? 'glass' : 'dark') : theme;
    const color = readableAccent(sanitizeColor(url.searchParams.get('color')), accentTheme) || '#00e5ff';
    const streaks = computeStreaks(cal.days);
    if (url.searchParams.get('debug') === '1') return debugResponse(cal, streaks, listStreaks(cal.days));

    const profile = flag(url.searchParams.get('profile'));
    const yearStat = flag(url.searchParams.get('year'));
    const thisYear = cal.days.filter((d) => d.date.startsWith(String(new Date().getUTCFullYear()))).reduce((a, d) => a + d.count, 0);
    const opts = {
      animate: flag(url.searchParams.get('animate')),
      profile,
      year: yearStat,
      thisYear,
      shape: sanitizeShape(url.searchParams.get('shape'), THEME_SHAPE[theme] || 'hex'),
      avatarUri: profile && cal.avatarUrl ? await avatarDataUri(cal.avatarUrl) : null,
      style,
    };
    return svgResponse(render({ user: cal, streaks, color, theme, opts }), 200, CACHE_OK);
  } catch (err) {
    if (err.status === 404) return svgResponse(errorCard(`user "${username}" not found`), 404, CACHE_ERR);
    if (err.status === 401) return svgResponse(errorCard('streaks need GITHUB_TOKEN on the server'), 503, CACHE_ERR);
    if (err.status === 403 || err.status === 429) return svgResponse(errorCard('rate limited — try again soon'), 503, CACHE_ERR);
    return svgResponse(errorCard('failed to load'), 500, CACHE_ERR);
  }
};
module.exports.computeStreaks = computeStreaks;
