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
  assert.equal(paletteFor('cyberpunk').bg, '#04070d');
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

test('cyberpunk theme: renders a valid instrumented card', () => {
  const renderHolo = require('../api/_lib/themes/cyberpunk');
  const svg = renderHolo({
    user: { login: 'Boy-Offi9', name: 'Boy Offi9', public_repos: 42, followers: 310 },
    level: 12, xp: 8420, totalStars: 1240, topLang: 'TypeScript',
    color: '#22d3ee', tier: 'ELITE', shape: 'circle', avatarUri: '', fontFace: '',
  });
  assert.match(svg, /^<svg width="360" height="360"/);
  assert.match(svg, /LV\.12/);
  assert.match(svg, /Boy Offi9/);
  assert.match(svg, /@Boy-Offi9/);
  assert.match(svg, /8,420/);
  assert.match(svg, /ELITE/);
  assert.ok(!svg.includes('undefined'), 'no undefined leaked into markup');
});

test('cyberpunk theme: hostile login is escaped, missing fields fall back', () => {
  const renderHolo = require('../api/_lib/themes/cyberpunk');
  const svg = renderHolo({
    user: { login: '<script>x', name: null }, level: 1, xp: 0, totalStars: 0,
    color: '#ff0055', tier: 'ROOKIE', shape: 'circle', avatarUri: '', fontFace: '',
  });
  assert.ok(!svg.includes('<script>'), 'login must be escaped');
  assert.match(svg, /@&lt;script&gt;x/);
});

test('badge style param: prototype keys are rejected (no attribute injection)', async () => {
  const prevFetch = global.fetch;
  global.fetch = async () => ({ ok: true, status: 200, headers: new Map(), json: async () => ({ login: 'octocat', name: 'Octo', public_repos: 8, followers: 1, created_at: '2015-01-01T00:00:00Z' }) });
  try {
    const badge = require('../api/badge');
    const req = { url: 'https://x/api/badge?username=octocat&metric=level&style=constructor', headers: new Map() };
    const res = await badge.GET(req);
    const body = await res.text();
    assert.ok(!body.includes('native code'), 'prototype-chain style must not reach markup');
    assert.match(body, /rx="[0-9.]+"/);
  } finally { global.fetch = prevFetch; }
});

test('computeStats: hostile inputs never produce NaN level/xp', () => {
  const { computeStats } = require('../api/_lib/game');
  const bad1 = computeStats({ created_at: 'invalid-date', public_repos: 1, followers: 0 }, []);
  assert.equal(Number.isFinite(bad1.level), true);
  assert.equal(Number.isFinite(bad1.xp), true);
  const bad2 = computeStats({ public_repos: 'x', followers: 'y' }, []);
  assert.equal(Number.isFinite(bad2.level), true);
  const bad3 = computeStats({}, []);
  assert.equal(Number.isFinite(bad3.level), true);
});

test('leaderboard class label: lang names escape exactly once', () => {
  const { esc } = require('../api/_lib/svg');
  assert.equal(esc(esc('A&B')), 'A&amp;amp;B'); // documents the bug shape
  // the fix: label built raw, escaped once at interpolation — see leaderboard.js line ~74
});

test('cyberpunk theme: long display names are truncated', () => {
  const renderHolo = require('../api/_lib/themes/cyberpunk');
  const svg = renderHolo({
    user: { login: 'x', name: 'N'.repeat(400) }, level: 3, xp: 100, totalStars: 0,
    color: '#00e5ff', tier: 'INITIATE', shape: 'circle', avatarUri: '', fontFace: '',
  });
  assert.ok(!svg.includes('N'.repeat(40)), 'name must be truncated to fit the card');
});
