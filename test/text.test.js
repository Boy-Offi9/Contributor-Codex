const test = require('node:test');
const assert = require('node:assert/strict');
const { truncate, esc } = require('../api/_lib/shared');

const mathItalic = 'ʙᴏʏ ᴏғғɪ9 ɪɴᴄ';

test('truncate counts characters, not UTF-16 code units', () => {
  assert.equal([...mathItalic].length, 12);
  assert.equal(truncate(mathItalic, 22), mathItalic);
  assert.equal(truncate('abcdef', 4), 'abc…');
  assert.equal(truncate('abc', 4), 'abc');
});

test('truncate never splits an astral character or an emoji sequence', () => {
  const cut = truncate(mathItalic + mathItalic, 10);
  assert.equal([...cut].length, 10);
  assert.ok(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(cut), 'no lone high surrogate');
  assert.ok(!/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(cut), 'no lone low surrogate');
  assert.equal(truncate('👨‍👩‍👧‍👦abcd', 3), '👨‍👩‍👧‍👦a…');
  assert.equal(truncate(null, 5), '');
});

test('esc removes characters that would make the SVG invalid XML', () => {
  assert.equal(esc('a\u0000b\u0008c\uFFFEd'), 'abcd');
  assert.equal(esc('x\uD835y'), 'xy');
  assert.equal(esc(mathItalic), mathItalic);
  assert.equal(esc('tab\tnewline\n'), 'tab\tnewline\n');
});
