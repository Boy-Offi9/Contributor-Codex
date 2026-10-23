const test = require('node:test');
const assert = require('node:assert/strict');
const { isGhName, isGhRepo, trophyTier, sanitizeColor, sanitizeBadge, sanitizeShape, esc, truncate } = require('../api/_lib/shared');

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
  assert.equal(truncate('abcdef', 4), 'abc\u2026');
  assert.equal(truncate('abc', 4), 'abc');
});
