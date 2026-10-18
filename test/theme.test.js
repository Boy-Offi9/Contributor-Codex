const test = require('node:test');
const assert = require('node:assert/strict');
const { readableAccent, luminance, sanitizeColor, a11y, svgHeaders, contrastRatio, mixColors } = require('../api/_lib/shared');
const { paletteFor, styleFromParams } = require('../api/_lib/frame');

test('readableAccent keeps accents visible without touching good ones', () => {
  assert.equal(readableAccent('#00e5ff', 'cyberpunk'), '#00e5ff');
  assert.equal(readableAccent('#00e5ff', 'glass'), '#00e5ff');
  assert.equal(readableAccent('#000000', 'cyberpunk'), '#aab4c8');
  assert.equal(readableAccent('#000000', 'glass'), '#000000');
  assert.ok(luminance(readableAccent('#1a1a2e', 'terminal')) >= 0.12);
  assert.ok(luminance(readableAccent('#ffffff', 'glass')) <= 0.76);
  assert.equal(readableAccent(null, 'glass'), null);
});

test('colour params: valid ones pass, junk is dropped, unreadable text is ignored', () => {
  const q = (o) => styleFromParams(new URLSearchParams(o), 'cyberpunk');
  assert.deepEqual(q({ bg: '1e1e2e', text: 'cdd6f4', border: '89b4fa' }), { bg: '#1e1e2e', text: '#cdd6f4', border: '#89b4fa', hideBorder: false });
  const junk = q({ bg: 'zzz', text: 'nothex', border: '"><script>' });
  assert.deepEqual([junk.bg, junk.text, junk.border], [null, null, null]);
  assert.equal(q({ bg: 'ffffff', text: 'fefefe' }).text, null);
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
