const { checkRateLimit } = require('@vercel/firewall');
const { sanitizeColor, esc } = require('./_lib/shared');
const { fetchCalendar, fmtDate } = require('./_lib/contrib');
const { FONT, PALETTE, sanitizeTheme, frame, errorCard, svgResponse } = require('./_lib/frame');

const WIDTH = 480;
const HEIGHT = 238;
const RANGES = [30, 90, 180, 365];
const CACHE_OK = 'public, s-maxage=21600, stale-while-revalidate=86400';
const CACHE_ERR = 'public, s-maxage=60';

// Smallest "round" axis maximum (1, 2, 2.5, 5 × 10^k) that fits the data.
function niceMax(value) {
  if (value <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(value / 4));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * pow * 4 >= value) return m * pow * 4;
  return value;
}

// Monotone cubic (Fritsch–Carlson) through every data point: the curve is
// smooth but never overshoots, so a peak is drawn exactly at its true height
// and a quiet stretch never dips below zero.
function smoothPath(pts) {
  const n = pts.length;
  const f = (v) => v.toFixed(1);
  if (n < 3) return pts.map((q, i) => `${i ? 'L' : 'M'}${f(q[0])},${f(q[1])}`).join('');
  const h = [], d = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(pts[i + 1][0] - pts[i][0]);
    d.push((pts[i + 1][1] - pts[i][1]) / h[i]);
  }
  const m = new Array(n);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = d[i - 1] * d[i] <= 0 ? 0 : (3 * (h[i - 1] + h[i])) / ((2 * h[i] + h[i - 1]) / d[i - 1] + (h[i] + 2 * h[i - 1]) / d[i]);
  }
  let path = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const t = h[i] / 3;
    path += `C${f(pts[i][0] + t)},${f(pts[i][1] + m[i] * t)} ${f(pts[i + 1][0] - t)},${f(pts[i + 1][1] - m[i + 1] * t)} ${f(pts[i + 1][0])},${f(pts[i + 1][1])}`;
  }
  return path;
}

function render({ user, days, range, color, theme }) {
  const p = PALETTE[theme];
  const window = days.slice(-range);
  const weekly = range > 120;
  // 180/365-day views sum into weeks so the line stays readable.
  let series = window.map((d) => ({ date: d.date, value: d.count }));
  if (weekly) {
    series = [];
    for (let i = 0; i < window.length; i += 7) {
      const chunk = window.slice(i, i + 7);
      series.push({ date: chunk[0].date, value: chunk.reduce((a, d) => a + d.count, 0) });
    }
  }
  const total = window.reduce((a, d) => a + d.count, 0);
  const max = Math.max(1, ...series.map((s) => s.value));
  const top = niceMax(max);

  const x0 = 48, x1 = WIDTH - 22, y0 = 82, y1 = 190;
  const xAt = (i) => x0 + ((x1 - x0) * i) / Math.max(1, series.length - 1);
  const yAt = (v) => y1 - ((y1 - y0) * v) / top;
  const pts = series.map((s, i) => [xAt(i), yAt(s.value)]);
  const line = smoothPath(pts);
  const area = `${line}L${x1},${y1}L${x0},${y1}Z`;

  const peakIdx = series.reduce((best, s, i) => (s.value > series[best].value ? i : best), 0);
  const peak = series[peakIdx];
  const peakX = xAt(peakIdx);
  const labelAnchor = peakX > x1 - 90 ? 'end' : peakX < x0 + 90 ? 'start' : 'middle';

  const grid = [0, 1, 2, 3, 4].map((k) => {
    const y = y1 - ((y1 - y0) * k) / 4;
    return `<line x1="${x0}" y1="${y.toFixed(1)}" x2="${x1}" y2="${y.toFixed(1)}" stroke="${p.rule}" ${k ? 'stroke-dasharray="3 4"' : ''}/>
      <text x="${x0 - 8}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" font-family="${FONT}" font-weight="600" font-size="10" fill="${p.dim}">${Math.round((top * k) / 4 * 10) / 10}</text>`;
  }).join('');

  const ticks = [0, 1 / 3, 2 / 3, 1].map((f, k) => {
    const i = Math.min(series.length - 1, Math.round((series.length - 1) * f));
    const anchor = k === 0 ? 'start' : k === 3 ? 'end' : 'middle';
    const x = k === 0 ? x0 : k === 3 ? x1 : xAt(i);
    return `<text x="${x.toFixed(1)}" y="${y1 + 18}" text-anchor="${anchor}" font-family="${FONT}" font-weight="600" font-size="10" fill="${p.dim}">${fmtDate(series[i].date, range > 180)}</text>`;
  }).join('');

  const body = `
    <defs>
      <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.38"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <text x="22" y="32" font-family="${FONT}" font-weight="700" font-size="12" fill="${color}" letter-spacing="1">CONTRIBUTION ACTIVITY</text>
    <text x="${WIDTH - 22}" y="32" text-anchor="end" font-family="${FONT}" font-weight="600" font-size="11" fill="${p.dim}">last ${range} days · ${total.toLocaleString('en-US')} total</text>
    <text x="22" y="49" font-family="${FONT}" font-weight="600" font-size="11" fill="${p.sub}">@${esc(user.login)}${weekly ? ' · per week' : ' · per day'}</text>
    ${grid}
    <path d="${area}" fill="url(#areaFill)"/>
    <path d="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" filter="url(#glow)"/>
    ${peak.value > 0 ? `<circle cx="${peakX.toFixed(1)}" cy="${yAt(peak.value).toFixed(1)}" r="3.5" fill="${p.bg}" stroke="${color}" stroke-width="2"/>
    <text x="${peakX.toFixed(1)}" y="${(yAt(peak.value) - 10).toFixed(1)}" text-anchor="${labelAnchor}" font-family="${FONT}" font-weight="700" font-size="10.5" fill="${p.text}">peak ${peak.value} · ${fmtDate(peak.date)}</text>` : ''}
    ${ticks}`;

  return frame({ width: WIDTH, height: HEIGHT, color, theme, title: `${user.login} — Contribution activity`, body });
}

module.exports.GET = async (request) => {
  const { rateLimited } = await checkRateLimit('activity-endpoint', { request });
  if (rateLimited) return svgResponse(errorCard('rate limited — slow down a bit'), 429, 'no-store');

  const url = new URL(request.url);
  const username = (url.searchParams.get('username') || '').trim();
  if (!username) return svgResponse(errorCard('missing ?username='), 400);
  const asked = Number(url.searchParams.get('days'));
  const range = RANGES.includes(asked) ? asked : 90;

  try {
    const cal = await fetchCalendar(username, process.env.GITHUB_TOKEN);
    const color = sanitizeColor(url.searchParams.get('color')) || '#00e5ff';
    const theme = sanitizeTheme(url.searchParams.get('theme'));
    return svgResponse(render({ user: cal, days: cal.days, range, color, theme }), 200, CACHE_OK);
  } catch (err) {
    if (err.status === 404) return svgResponse(errorCard(`user "${username}" not found`), 404, CACHE_ERR);
    if (err.status === 401) return svgResponse(errorCard('activity needs GITHUB_TOKEN on the server'), 503, CACHE_ERR);
    if (err.status === 403 || err.status === 429) return svgResponse(errorCard('rate limited — try again soon'), 503, CACHE_ERR);
    return svgResponse(errorCard('failed to load'), 500, CACHE_ERR);
  }
};
