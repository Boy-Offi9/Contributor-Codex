const test = require('node:test');
const assert = require('node:assert/strict');
const { computeStreaks, listStreaks, fmtRange } = require('../api/_lib/contrib');

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

test('longest streak survives an older year and a year boundary', () => {
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
