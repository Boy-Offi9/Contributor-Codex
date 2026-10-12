const { checkRateLimit } = require('@vercel/firewall');
const { sanitizeColor, icon, esc, isGhName, readableAccent } = require('./_lib/shared');
const { fetchCalendar, computeStreaks, listStreaks, fmtRange, fmtDate } = require('./_lib/contrib');
const { FONT, PALETTE, ink, sanitizeTheme, frame, errorCard, svgResponse } = require('./_lib/frame');

const WIDTH = 480;
const HEIGHT = 172;
const CACHE_OK = 'public, s-maxage=21600, stale-while-revalidate=86400'; // 6h — a streak only changes daily
const CACHE_ERR = 'public, s-maxage=60';

const fmtNumber = (n) => n.toLocaleString('en-US');

function render({ user, streaks, color, theme }) {
  const p = PALETTE[theme];
  const today = new Date().toISOString().slice(0, 10);
  const { total, since, current, longest } = streaks;
  const cols = [WIDTH / 6, WIDTH / 2, (WIDTH * 5) / 6];
  const cy = 66;

  // "Since day one": the range starts on the account's join date, not on the
  // first day that happened to have a contribution.
  const start = (user.createdAt || '').slice(0, 10) || since;
  const startYear = start && start.slice(0, 4) !== today.slice(0, 4);
  const totalRange = start ? `${fmtDate(start, startYear)} – Present` : 'no contributions yet';
  const currentRange = fmtRange(current.start, current.end, today, current.length > 0);
  const longestRange = fmtRange(longest.start, longest.end, today, false);

  // Ring shows the current streak relative to the personal best.
  const r = 33;
  const circ = 2 * Math.PI * r;
  const progress = longest.length ? Math.min(1, current.length / longest.length) : 0;
  const arc = (circ * progress).toFixed(2);

  const bigNumber = (x, value) =>
    `<text x="${x}" y="${cy + 10}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${String(value).length > 5 ? 26 : 30}" fill="${p.text}">${value}</text>`;
  const label = (x, text, strong) =>
    `<text x="${x}" y="126" text-anchor="middle" font-family="${FONT}" font-weight="${strong ? 700 : 600}" font-size="13" fill="${strong ? ink(color, theme) : p.sub}">${text}</text>`;
  const range = (x, text) =>
    `<text x="${x}" y="146" text-anchor="middle" font-family="${FONT}" font-weight="600" font-size="11" fill="${p.dim}">${esc(text)}</text>`;

  const body = `
    <line x1="${WIDTH / 3}" y1="26" x2="${WIDTH / 3}" y2="${HEIGHT - 26}" stroke="${p.rule}"/>
    <line x1="${(WIDTH * 2) / 3}" y1="26" x2="${(WIDTH * 2) / 3}" y2="${HEIGHT - 26}" stroke="${p.rule}"/>

    ${bigNumber(cols[0], fmtNumber(total))}
    ${label(cols[0], 'Total Contributions')}
    ${range(cols[0], totalRange)}

    <circle cx="${cols[1]}" cy="${cy}" r="${r}" fill="none" stroke="${p.track}" stroke-width="5"/>
    <circle cx="${cols[1]}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"
      stroke-dasharray="${arc} ${circ.toFixed(2)}" transform="rotate(-90 ${cols[1]} ${cy})"${progress > 0 ? ' filter="url(#glow)"' : ''}/>
    <circle cx="${cols[1]}" cy="${cy - r}" r="10" fill="${p.bg}"/>
    ${icon('flame', cols[1] - 8, cy - r - 8, current.length > 0 ? color : p.dim, 1.35)}
    ${bigNumber(cols[1], current.length)}
    ${label(cols[1], 'Current Streak', true)}
    ${range(cols[1], currentRange)}

    ${bigNumber(cols[2], longest.length)}
    ${label(cols[2], 'Longest Streak')}
    ${range(cols[2], longestRange)}`;

  return frame({ width: WIDTH, height: HEIGHT, color, theme, title: `${user.login} — Contribution streak`, body });
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
  const { rateLimited } = await checkRateLimit('streak-endpoint', { request });
  if (rateLimited) return svgResponse(errorCard('rate limited — slow down a bit'), 429, 'no-store');

  const url = new URL(request.url);
  const username = (url.searchParams.get('username') || '').trim();
  if (!username) return svgResponse(errorCard('missing ?username='), 400);
  if (!isGhName(username)) return svgResponse(errorCard('invalid username'), 400);

  try {
    const cal = await fetchCalendar(username, process.env.GITHUB_TOKEN);
    const theme = sanitizeTheme(url.searchParams.get('theme'));
    const color = readableAccent(sanitizeColor(url.searchParams.get('color')), theme) || '#00e5ff';
    const streaks = computeStreaks(cal.days);
    if (url.searchParams.get('debug') === '1') return debugResponse(cal, streaks, listStreaks(cal.days));
    return svgResponse(render({ user: cal, streaks, color, theme }), 200, CACHE_OK);
  } catch (err) {
    if (err.status === 404) return svgResponse(errorCard(`user "${username}" not found`), 404, CACHE_ERR);
    if (err.status === 401) return svgResponse(errorCard('streaks need GITHUB_TOKEN on the server'), 503, CACHE_ERR);
    if (err.status === 403 || err.status === 429) return svgResponse(errorCard('rate limited — try again soon'), 503, CACHE_ERR);
    return svgResponse(errorCard('failed to load'), 500, CACHE_ERR);
  }
};
module.exports.computeStreaks = computeStreaks;
