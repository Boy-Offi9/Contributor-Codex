const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const limiterPath = require.resolve('../api/_lib/ratelimit');
const limiter = { limited: false };
require.cache[limiterPath] = { id: limiterPath, filename: limiterPath, loaded: true, exports: { isRateLimited: async () => limiter.limited } };

process.env.GITHUB_TOKEN = 'test-token';
const { install } = require('./support/github-mock');
const { assertWellFormed } = require('./support/xml');

const realFetch = global.fetch;
before(() => install());
after(() => { global.fetch = realFetch; });

const renderDetailed = require('../api/_lib/themes/detailed');
const { SKINS } = require('../api/_lib/themes/skins');

const MOCK = {
  user: { login: 'octocat', name: 'Octo Cat', public_repos: 12, followers: 88, bio: 'Just a mock.' },
  avatarUri: '', shape: 'rounded', fontFace: '',
  totalStars: 210, totalForks: 44, prs: 19, issues: 7, color: '#00e5ff',
  langStats: [{ name: 'TypeScript', pct: 55 }, { name: 'Go', pct: 45 }],
};

test('skin registry: exactly the four design languages, normalized contract', () => {
  assert.deepEqual(Object.keys(SKINS).sort(), ['classic', 'cyberpunk', 'glass', 'terminal']);
  for (const [name, skin] of Object.entries(SKINS)) {
    assert.equal(skin.name, name);
    assert.equal(typeof skin.chassis, 'function', `${name}.chassis`);
    assert.equal(typeof skin.statCell, 'function', `${name}.statCell`);
    assert.equal(typeof skin.css, 'function', `${name}.css`);
    assert.equal(typeof skin.langTrack, 'function', `${name}.langTrack`);
    assert.equal(typeof skin.legendEntry, 'function', `${name}.legendEntry`);
    assert.equal(typeof skin.sectionHeader, 'function', `${name}.sectionHeader`);
    assert.ok(skin.palette && skin.palette.ink && skin.palette.rule, `${name}.palette`);
  }
});

for (const name of ['classic', 'cyberpunk', 'terminal', 'glass']) {
  test(`detailed engine renders the ${name} skin well-formed with all data`, () => {
    const svg = renderDetailed({ ...MOCK, skin: name });
    assert.match(svg, /^<svg width="420" height="\d+"/);
    assert.ok(svg.includes(`data-skin="${name}"`), 'skin identity marker');
    assertWellFormed(svg);
    assert.match(svg, /Octo Cat/);
    assert.match(svg, /@octocat/);
    assert.match(svg, /TELEMETRY|REPOS/, 'stat grid rendered');
    assert.match(svg, /TypeScript 55%/, 'legend rendered');
    assert.ok(!/undefined|\[object/.test(svg), 'no undefined leaks');
  });

  test(`detailed engine renders the ${name} skin safely with empty data`, () => {
    const svg = renderDetailed({
      ...MOCK, skin: name, langStats: [], prs: null, issues: null, bio: null, totalForks: undefined,
    });
    assertWellFormed(svg);
    assert.ok(!/undefined|\[object|NaN/.test(svg), 'no undefined/NaN leaks with empty langStats/prs');
    assert.match(svg, />—</, 'missing prs/issues render as an em dash');
    assert.ok(!svg.includes('TypeScript'), 'no language bar when langStats is empty');
  });

  test(`detailed engine renders the ${name} skin safely under hostile input`, () => {
    const svg = renderDetailed({
      ...MOCK, skin: name,
      user: { login: '<script>x&"', name: null },
      color: '"><img onerror=1>',
    });
    assertWellFormed(svg, 'hostile strings must not break the XML');
    assert.ok(!svg.includes('<script>'), 'login escaped');
    assert.ok(!svg.includes('onerror'), 'unsanitized color must not reach markup');
  });
}

test('unknown / missing / prototype skin names fall back to classic', () => {
  assert.equal(renderDetailed({ ...MOCK, skin: 'nope' }).includes('data-skin="classic"'), true);
  assert.equal(renderDetailed({ ...MOCK }).includes('data-skin="classic"'), true);
  assert.equal(renderDetailed({ ...MOCK, skin: 'constructor' }).includes('data-skin="classic"'), true);
  assert.equal(renderDetailed({ ...MOCK, skin: '__proto__' }).includes('data-skin="classic"'), true);
});

test('skins are visually distinct: each carries its design-language markers', () => {
  const mk = (name) => renderDetailed({ ...MOCK, color: null, skin: name });
  assert.match(mk('cyberpunk'), /#00E5FF/, 'kit palette accent');
  assert.match(mk('cyberpunk'), /stroke-dasharray/, 'traveling perimeter light');
  assert.match(mk('cyberpunk'), /chassis/, 'chassis clip');
  assert.match(mk('terminal'), /┌─ TELEMETRY/, 'box-drawn phosphor header');
  assert.match(mk('terminal'), /#3ddc6a/, 'phosphor green');
  assert.match(mk('glass'), /#eef1f8/, 'frosted light gradient');
  assert.match(mk('glass'), /#1c2333/, 'ink strokes');
  assert.equal(mk('classic').includes('┌─'), false, 'classic keeps the original headerless look');
});

test('skins keep dynamic height: more content, taller card', () => {
  const short = renderDetailed({ ...MOCK, skin: 'cyberpunk', langStats: [] });
  const tall = renderDetailed({ ...MOCK, skin: 'cyberpunk' });
  const h = (s) => Number(s.match(/height="(\d+)"/)[1]);
  assert.ok(h(tall) > h(short), 'languages block grows the card');
});

// ---- endpoint wiring -------------------------------------------------------
const call = async (query) => {
  const card = require('../api/card.js');
  const res = await card.GET({ url: `https://example.test/api/card?${query}`, headers: new Map() });
  return { res, body: await res.text() };
};

test('card endpoint accepts ?skin= for theme=detailed', async () => {
  for (const skin of ['classic', 'cyberpunk', 'terminal', 'glass']) {
    const { res, body } = await call(`username=octo&theme=detailed&skin=${skin}`);
    assert.equal(res.status, 200);
    assertWellFormed(body);
    assert.ok(body.includes(`data-skin="${skin}"`), `skin=${skin} reaches the renderer`);
  }
});

test('card endpoint: invalid skin falls back to classic; skin ignored on other themes', async () => {
  const bad = await call('username=octo&theme=detailed&skin=constructor');
  assert.ok(bad.body.includes('data-skin="classic"'), 'prototype junk falls back to classic');
  const other = await call('username=octo&theme=cyberpunk&skin=terminal');
  assert.equal(other.body.includes('data-skin='), false, 'cyberpunk dossier is standalone');
  assert.ok(other.body.includes('LV.'), 'cyberpunk card still renders as the dossier');
});

test('card endpoint: skin param does not open attribute injection', async () => {
  const { body } = await call('username=octo&theme=detailed&skin=%22%3E%3Cscript%3E');
  assertWellFormed(body);
  assert.ok(!body.includes('<script>'), 'hostile skin param must not reach markup');
  assert.ok(body.includes('data-skin="classic"'), 'hostile skin param falls back to classic');
});
