// Run with: npm test   (Node >= 18, no extra dependencies)
const test = require('node:test');
const assert = require('node:assert/strict');
const { computeStreaks, fmtRange } = require('../api/_lib/contrib');
const { isGhName, isGhRepo, trophyTier, sanitizeColor, sanitizeBadge, sanitizeShape, esc, truncate } = require('../api/_lib/shared');

const mk = (counts, start = '2026-10-01') =>
  counts.map((count, i) => ({ date: new Date(Date.parse(start) + i * 86400000).toISOString().slice(0, 10), count }));

test('streak: counts through today', () => {
  const r = computeStreaks(mk([0, 1, 1, 1]), '2026-10-04');
  assert.equal(r.current.length, 3);
  assert.equal(r.longest.length, 3);
});
test('streak: an empty today does not reset a live streak', () => {
  assert.equal(computeStreaks(mk([0, 1, 1, 0]), '2026-10-04').current.length, 2);
});
test('streak: two empty days end it', () => {
  const r = computeStreaks(mk([1, 1, 0, 0]), '2026-10-04');
  assert.equal(r.current.length, 0);
  assert.equal(r.longest.length, 2);
});
test('streak: longest can be in the past', () => {
  const r = computeStreaks(mk([1, 1, 1, 0, 1, 1]), '2026-10-06');
  assert.equal(r.current.length, 2);
  assert.equal(r.longest.length, 3);
  assert.equal(r.total, 5);
});
test('streak: no contributions at all', () => {
  const r = computeStreaks(mk([0, 0, 0]), '2026-10-03');
  assert.deepEqual([r.current.length, r.longest.length, r.total, r.since], [0, 0, 0, null]);
});
test('date ranges', () => {
  assert.equal(fmtRange('2026-09-18', '2026-10-11', '2026-10-11', true), 'Sep 18 – Present');
  assert.equal(fmtRange('2025-05-14', '2025-06-01', '2026-10-11', false), 'May 14 – Jun 1, 2025');
  assert.equal(fmtRange('2020-01-01', '2026-10-12', '2026-10-12', false), 'Jan 2020 – Oct 2026');
  assert.equal(fmtRange('2025-12-20', '2026-01-18', '2026-10-12', false), 'Dec 2025 – Jan 2026');
  assert.equal(fmtRange(null, null), 'no streak yet');
});

test('GitHub names: accepted', () => {
  for (const ok of ['octocat', 'Boy-Offi9', 'a', 'a1-b2', 'x'.repeat(39)]) assert.ok(isGhName(ok), ok);
  for (const ok of ['Contributor-Codex', 'a.b_c-d', '.github']) assert.ok(isGhRepo(ok), ok);
});
test('GitHub names: path / query / qualifier injection is refused', () => {
  for (const bad of ['', 'a/b', 'a/../../orgs/x', 'a?per_page=1', 'a+is:private', 'a b', 'a#x', '-lead', 'x'.repeat(40), '%2F', 'a\n']) {
    assert.ok(!isGhName(bad), JSON.stringify(bad));
  }
  for (const bad of ['', '.', '..', 'a/b', 'a?x', 'a b', 'x'.repeat(101)]) assert.ok(!isGhRepo(bad), JSON.stringify(bad));
});

test('trophy tiers', () => {
  const t = [10, 50, 200, 1000];
  assert.equal(trophyTier(0, t).index, 0);
  assert.equal(trophyTier(10, t).index, 1);
  assert.equal(trophyTier(1000, t).index, 4);
});
test('sanitizers fall back instead of passing junk through', () => {
  assert.equal(sanitizeColor('ff0000'), '#ff0000');
  assert.equal(sanitizeColor('#00E5FF'), '#00E5FF');
  assert.equal(sanitizeColor('red"/><script>'), null);
  assert.equal(sanitizeBadge('OCTAGON', 'hex'), 'octagon');
  assert.equal(sanitizeBadge('nope', 'hex'), 'hex');
  assert.equal(sanitizeShape('nope', 'circle'), 'circle');
});
test('esc and truncate', () => {
  assert.equal(esc(`<a href="x">&'</a>`), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  assert.equal(truncate('abcdef', 4), 'abc…');
  assert.equal(truncate('abc', 4), 'abc');
});

const { listStreaks } = require('../api/_lib/contrib');
test('longest streak survives an older year and a year boundary', () => {
  // 45 days ending 2025-01-10 (spans the new year), gap, then a 21-day current run
  const days = [];
  const push = (start, n, count) => { for (let i = 0; i < n; i++) days.push({ date: new Date(Date.parse(start) + i * 86400000).toISOString().slice(0, 10), count }); };
  push('2024-11-27', 45, 1);   // -> 2025-01-10
  push('2025-01-11', 100, 0);
  push('2025-04-21', 21, 1);
  const r = computeStreaks(days, '2025-05-11');
  assert.equal(r.longest.length, 45);
  assert.equal(r.longest.start, '2024-11-27');
  assert.equal(r.current.length, 21);
  assert.equal(listStreaks(days).length, 2);
});

const { readableAccent, luminance } = require('../api/_lib/shared');
test('readableAccent keeps accents visible without touching good ones', () => {
  assert.equal(readableAccent('#00e5ff', 'cyberpunk'), '#00e5ff');
  assert.equal(readableAccent('#00e5ff', 'glass'), '#00e5ff');
  assert.equal(readableAccent('#000000', 'cyberpunk'), '#aab4c8');
  assert.equal(readableAccent('#000000', 'glass'), '#000000');
  assert.ok(luminance(readableAccent('#1a1a2e', 'terminal')) >= 0.12);
  assert.ok(luminance(readableAccent('#ffffff', 'glass')) <= 0.76);
  assert.equal(readableAccent(null, 'glass'), null);
});

const { paletteFor, styleFromParams } = require('../api/_lib/frame');
const { a11y, svgHeaders, contrastRatio, mixColors } = require('../api/_lib/shared');

test('colour params: valid ones pass, junk is dropped, unreadable text is ignored', () => {
  const q = (o) => styleFromParams(new URLSearchParams(o), 'cyberpunk');
  assert.deepEqual(q({ bg: '1e1e2e', text: 'cdd6f4', border: '89b4fa' }), { bg: '#1e1e2e', text: '#cdd6f4', border: '#89b4fa', hideBorder: false });
  const junk = q({ bg: 'zzz', text: 'nothex', border: '"><script>' });
  assert.deepEqual([junk.bg, junk.text, junk.border], [null, null, null]);
  assert.equal(q({ bg: 'ffffff', text: 'fefefe' }).text, null);          // white on white
  assert.equal(q({ hide_border: '1' }).hideBorder, true);
});
test('paletteFor picks readable text for a custom background and never mutates the theme', () => {
  const light = paletteFor('cyberpunk', { bg: '#fdf6e3' });
  assert.ok(contrastRatio(light.text, light.bg) >= 4.5, 'auto text must contrast with a light bg');
  assert.equal(paletteFor('cyberpunk').bg, '#05070c');
  assert.equal(paletteFor('cyberpunk', { border: '#89b4fa' }).rule, '#89b4fa');
});
test('mixColors endpoints', () => {
  assert.equal(mixColors('#000000', '#ffffff', 0), '#000000');
  assert.equal(mixColors('#000000', '#ffffff', 1), '#ffffff');
});
test('SVG responses: hardened headers and accessible root', () => {
  const h = svgHeaders('public, s-maxage=60');
  assert.match(h['Content-Security-Policy'], /default-src 'none'/);
  assert.equal(h['X-Content-Type-Options'], 'nosniff');
  assert.equal(h['Cache-Control'], 'public, s-maxage=60');
  assert.match(a11y('<svg width="1"><title>Hi</title></svg>'), /^<svg role="img" aria-labelledby="cardTitle" width="1"><title id="cardTitle">/);
  assert.match(a11y('<svg width="1"></svg>'), /^<svg role="img" width="1">/);
});

const { computeRank } = require('../api/_lib/shared');
test('rank grades: bands, weights and progress', () => {
  assert.equal(computeRank({}).grade, 'C');
  assert.equal(computeRank({ commits: 99 }).grade, 'C');
  assert.equal(computeRank({ commits: 100 }).grade, 'B');
  // PRs, reviews and stars outweigh raw commits
  assert.equal(computeRank({ prs: 25 }).score, 100);
  assert.equal(computeRank({ stars: 20 }).score, 100);
  assert.equal(computeRank({ commits: 3000 }).grade, 'S');
  const mid = computeRank({ commits: 200 });                 // halfway from B (100) to B+ (300)
  assert.deepEqual([mid.grade, mid.next, mid.progress], ['B', 'B+', 0.5]);
  assert.equal(computeRank({ commits: 99999 }).progress, 1);
  assert.equal(computeRank({ commits: 99999 }).next, null);
  assert.equal(computeRank({ commits: 'abc', stars: null }).score, 0);   // junk never produces NaN
});

const { createLimiter } = require('../api/_lib/ratelimit');
test('rate limiter: own id by default, shared id from env, fails open', async () => {
  const seen = [];
  const check = async (id) => { seen.push(id); return { rateLimited: id === 'blocked' }; };
  assert.equal(await createLimiter(check, {})('card-endpoint', {}), false);
  assert.equal(await createLimiter(check, { RATE_LIMIT_SHARED_ID: 'one-rule' })('card-endpoint', {}), false);
  assert.deepEqual(seen, ['card-endpoint', 'one-rule']);                       // shared id overrides every name
  assert.equal(await createLimiter(check, {})('blocked', {}), true);           // limited when the firewall says so
  assert.equal(await createLimiter(check, { RATE_LIMIT_SHARED_ID: '   ' })('x-endpoint', {}), false);
  assert.equal(seen[seen.length - 1], 'x-endpoint');                           // blank env var is ignored
  const boom = async () => { throw new Error('firewall down'); };
  assert.equal(await createLimiter(boom, {})('card-endpoint', {}), false);     // fail open
});
