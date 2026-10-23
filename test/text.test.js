const test = require('node:test');
const assert = require('node:assert/strict');
const { truncate, esc } = require('../api/_lib/shared');

const mathItalic = '\u{1d446}\u{1d466}\u{1d460}\u{1d461}\u{1d452}\u{1d45a}\u{1d463}\u{1d438}\u{1d45f}\u{1d45f}\u{1d45c}\u{1d45f}';

test('truncate counts characters, not UTF-16 code units', () => {
  assert.equal([...mathItalic].length, 12);
  assert.equal(truncate(mathItalic, 22), mathItalic);
  assert.equal(truncate('abcdef', 4), 'abc\u2026');
  assert.equal(truncate('abc', 4), 'abc');
});

test('truncate never splits an astral character or an emoji sequence', () => {
  const cut = truncate(mathItalic + mathItalic, 10);
  assert.equal([...cut].length, 10);
  assert.ok(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(cut), 'no lone high surrogate');
  assert.ok(!/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(cut), 'no lone low surrogate');
  assert.equal(truncate('\u{1f468}\u200d\u{1f469}\u200d\u{1f467}\u200d\u{1f466}abcd', 3), '\u{1f468}\u200d\u{1f469}\u200d\u{1f467}\u200d\u{1f466}a\u2026');
  assert.equal(truncate(null, 5), '');
});

test('esc removes characters that would make the SVG invalid XML', () => {
  assert.equal(esc('a\u0000b\u0008c\uFFFEd'), 'abcd');
  assert.equal(esc('x\uD835y'), 'xy');
  assert.equal(esc(mathItalic), mathItalic);
  assert.equal(esc('tab\tnewline\n'), 'tab\tnewline\n');
});
