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
  assert.equal(fmtRange('2025-05-14', '2025-06-01', '2026-10-11', false), 'May 14, 2025 – Jun 1, 2025');
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
