const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const limiterPath = require.resolve('../api/_lib/ratelimit');
const limiter = { limited: false };
require.cache[limiterPath] = { id: limiterPath, filename: limiterPath, loaded: true, exports: { isRateLimited: async () => limiter.limited } };

process.env.GITHUB_TOKEN = 'test-token';
const { install, MATH_NAME } = require('./support/github-mock');
const { assertWellFormed } = require('./support/xml');

const realFetch = global.fetch;
before(() => install());
after(() => { global.fetch = realFetch; });

const call = async (endpoint, query) => {
  const mod = require(`../api/${endpoint}.js`);
  const res = await mod.GET({ url: `https://example.test/api/${endpoint}?${query}`, headers: new Map() });
  return { res, body: await res.text() };
};

const CARDS = [
  ['card', 'username=octo'], ['card', 'username=octo&theme=terminal'], ['card', 'username=octo&theme=glass'], ['card', 'username=octo&theme=detailed'],
  ['repo', 'owner=octo&repo=thing'], ['repo', 'owner=octo&repo=thing&theme=glass'],
  ['trophies', 'username=octo'], ['trophies', 'username=octo&trophies=STARGAZER,CURATOR&badge=octagon'],
  ['codex', 'username=octo'], ['codex', 'username=octo&streak=1&badge=diamond'], ['codex', 'username=empty&streak=1'],
  ['leaderboard', 'org=acme'], ['leaderboard', 'org=acme&theme=terminal'], ['leaderboard', 'org=acme&theme=glass'],
  ['leaderboard', 'org=acme&sort=streak'], ['leaderboard', 'org=acme&sort=contributions&theme=glass'], ['leaderboard', 'org=acme&sort=stars&theme=terminal'], ['leaderboard', 'org=acme&sort=followers'], ['leaderboard', 'org=acme&sort=repos&theme=glass'], ['leaderboard', 'org=acme&sort=bogus'],
  ['streak', 'username=octo'], ['streak', 'username=octo&profile=1&year=1&animate=1&theme=glass'], ['streak', 'username=empty'],
  ['stats', 'username=octo'], ['stats', 'username=empty&hide=stars,prs'],
  ['activity', 'username=octo'], ['activity', 'username=octo&days=365&animate=1'],
  ['langs', 'username=octo'], ['langs', 'username=octo&bg=1e1e2e&text=cdd6f4&border=89b4fa&hide_border=1'],
  ['badge', 'username=octo'], ['badge', 'username=octo&metric=xp&style=pill'], ['badge', 'username=octo&metric=class&style=square&theme=glass'],
  ['badge', 'username=octo&metric=rank'], ['badge', 'username=octo&metric=streak&color=ff4d6d'], ['badge', 'username=empty&metric=longest'],
  ['badge', 'username=octo&metric=contributions&label=all%20time'],
];

for (const [endpoint, query] of CARDS) {
  test(`${endpoint}?${query} renders a well-formed, hardened SVG`, async () => {
    const { res, body } = await call(endpoint, query);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /^image\/svg\+xml/);
    assert.match(res.headers.get('content-security-policy'), /default-src 'none'/);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.match(res.headers.get('cache-control'), /stale-if-error/);
    assert.match(body, /^<svg role="img"/);
    assertWellFormed(body);
    assert.ok(!/NaN|undefined|\[object/.test(body), 'no NaN / undefined in output');
  });
}

test('hostile and astral display names stay well-formed and inert', async () => {
  for (const [endpoint, query] of [['card', 'username=hostile'], ['card', 'username=hostile&theme=detailed'], ['codex', 'username=hostile'], ['streak', 'username=hostile&profile=1'], ['stats', 'username=hostile']]) {
    const { body } = await call(endpoint, query);
    assertWellFormed(body);
    assert.ok(!/<script|<b>x/.test(body), `${endpoint}: raw markup from a name reached the SVG`);
  }
});

test('a name in Unicode math-italic letters is shown whole, not cut mid-character', async () => {
  for (const [endpoint, query] of [['streak', 'username=mathname&profile=1'], ['codex', 'username=mathname'], ['card', 'username=mathname']]) {
    const { body } = await call(endpoint, query);
    assert.ok(body.includes(MATH_NAME), `${endpoint} lost part of the name`);
    assert.ok(!body.includes('\uFFFD'));
  }
});

test('names that could reach other GitHub URLs are refused with 400', async () => {
  for (const bad of ['a/b', 'a%2Fb', 'a?x=1', 'a+is:private', '..', 'x'.repeat(40)]) {
    for (const endpoint of ['card', 'codex', 'trophies', 'streak', 'activity', 'stats', 'langs']) {
      const { res } = await call(endpoint, `username=${bad}`);
      assert.equal(res.status, 400, `${endpoint} accepted username=${bad}`);
    }
    assert.equal((await call('leaderboard', `org=${bad}`)).res.status, 400);
    assert.equal((await call('repo', `owner=${bad}&repo=r`)).res.status, 400);
  }
  assert.equal((await call('card', '')).res.status, 400);
  assert.equal((await call('repo', 'owner=octo&repo=..')).res.status, 400);
});

test('unknown users and repos return a 404 card', async () => {
  for (const endpoint of ['card', 'codex', 'trophies', 'streak', 'activity', 'stats', 'langs']) {
    const { res, body } = await call(endpoint, 'username=nobody');
    assert.equal(res.status, 404, endpoint);
    assertWellFormed(body);
  }
  assert.equal((await call('repo', 'owner=octo&repo=missing')).res.status, 404);
  assert.equal((await call('leaderboard', 'org=nosuchorg')).res.status, 404);
});

test('junk colours and parameters are ignored, not rendered', async () => {
  const { res, body } = await call('streak', 'username=octo&bg=zzz&text=nothex&border=%22%3E%3Cscript%3E&color=%22%3E&theme=bogus&shape=bogus');
  assert.equal(res.status, 200);
  assertWellFormed(body);
  assert.ok(!body.includes('<script'));
});

test('when the firewall says rate limited, the card is a 429 that is never cached', async () => {
  limiter.limited = true;
  try {
    for (const [endpoint, query] of [['card', 'username=octo'], ['streak', 'username=octo'], ['stats', 'username=octo']]) {
      const { res, body } = await call(endpoint, query);
      assert.equal(res.status, 429, endpoint);
      assert.equal(res.headers.get('cache-control'), 'no-store');
      assertWellFormed(body);
    }
  } finally {
    limiter.limited = false;
  }
});

test('calendar cards explain a missing server token instead of crashing', async () => {
  const saved = process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_TOKEN;
  try {
    for (const endpoint of ['streak', 'activity', 'stats']) {
      const { res, body } = await call(endpoint, 'username=octo');
      assert.equal(res.status, 503, endpoint);
      assert.match(body, /GITHUB_TOKEN/);
    }
  } finally {
    process.env.GITHUB_TOKEN = saved;
  }
});

test('/api/status reports the budget without leaking the token', async () => {
  const { res, body } = await call('status', '');
  assert.equal(res.status, 200);
  const data = JSON.parse(body);
  assert.equal(data.ok, true);
  assert.equal(data.rest.remaining, 4000);
  assert.ok(!body.includes('test-token'));
});

const withFetch = async (replacement, fn) => {
  const previous = global.fetch;
  global.fetch = replacement;
  try { return await fn(); } finally { global.fetch = previous; }
};
const reply = (status, body = {}, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

test('GitHub failures become the right error card, not a generic one', async () => {
  await withFetch(async () => reply(200, { errors: [{ type: 'RATE_LIMITED', message: 'x' }] }), async () => {
    for (const endpoint of ['streak', 'activity', 'stats']) {
      const { res, body } = await call(endpoint, 'username=octo');
      assert.equal(res.status, 503, endpoint);
      assert.match(body, /rate limited/);
    }
  });
  await withFetch(async () => reply(401, { message: 'Bad credentials' }), async () => {
    const { res, body } = await call('streak', 'username=octo');
    assert.equal(res.status, 503);
    assert.match(body, /rejected/);
    assert.match(body, /\/api\/status/);
  });
  await withFetch(async () => reply(403, {}, { 'x-ratelimit-remaining': '0' }), async () => {
    const { res, body } = await call('stats', 'username=octo');
    assert.equal(res.status, 503);
    assert.match(body, /rate limited/);
  });
  await withFetch(async () => reply(403, { message: 'blocked' }), async () => {
    const { res, body } = await call('card', 'username=octo');
    assert.equal(res.status, 502);
    assert.match(body, /refused/);
    assert.ok(!/rate limited/.test(body), 'a plain 403 must not be called a rate limit');
  });
  await withFetch(async () => reply(500, {}), async () => {
    const { res, body } = await call('stats', 'username=octo');
    assert.equal(res.status, 500);
    assert.match(body, /failed to load/);
  });
});

test('a GitHub request that never answers ends as a 504 card within the timeout', async () => {
  process.env.GITHUB_TIMEOUT_MS = '60';
  const keepAlive = setTimeout(() => {}, 30000);
  try {
    const hang = (url, opts = {}) => new Promise((_, reject) => opts.signal.addEventListener('abort', () => reject(opts.signal.reason)));
    await withFetch(hang, async () => {
      for (const [endpoint, query] of [['card', 'username=octo'], ['streak', 'username=octo'], ['langs', 'username=octo']]) {
        const started = Date.now();
        const { res, body } = await call(endpoint, query);
        assert.equal(res.status, 504, endpoint);
        assert.match(body, /slow/);
        assert.ok(Date.now() - started < 10000, `${endpoint} should give up instead of hanging`);
      }
    });
  } finally {
    clearTimeout(keepAlive);
    delete process.env.GITHUB_TIMEOUT_MS;
  }
});

test('leaderboard sorts by the metric asked for and says so', async () => {
  const position = (body, text) => body.indexOf(text);
  const streak = (await call('leaderboard', 'org=acme&sort=streak')).body;
  assert.ok(position(streak, MATH_NAME) !== -1 && position(streak, MATH_NAME) < position(streak, 'Octo Cat'), 'the 30-day streak should outrank the 12-day streak');
  assert.match(streak, /30 day streak/);
  assert.match(streak, /12 day streak/, 'the current streak is shown, not the longest run (29 days)');
  assert.ok(!/29 day streak/.test(streak));
  assert.match(streak, /BY STREAK/);
  const followers = (await call('leaderboard', 'org=acme&sort=followers')).body;
  assert.ok(position(followers, 'Octo Cat') < position(followers, MATH_NAME), '215 followers should outrank 54');
  const terminal = (await call('leaderboard', 'org=acme&sort=contributions&theme=terminal')).body;
  assert.match(terminal, /ranked by contributions/);
  const fallback = (await call('leaderboard', 'org=acme&sort=bogus')).body;
  assert.match(fallback, /XP/);
  assert.ok(!/BY BOGUS/.test(fallback));
});

test('contribution sorts explain a missing token instead of guessing', async () => {
  const saved = process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_TOKEN;
  try {
    for (const sort of ['streak', 'contributions']) {
      const { res, body } = await call('leaderboard', `org=acme&sort=${sort}`);
      assert.equal(res.status, 503);
      assert.match(body, /GITHUB_TOKEN/);
    }
    const { res } = await call('leaderboard', 'org=acme&sort=stars');
    assert.equal(res.status, 200, 'sorts that use REST data keep working without a token');
  } finally {
    process.env.GITHUB_TOKEN = saved;
  }
});

test('badge shows the real value for each metric', async () => {
  const text = async (query) => (await call('badge', query)).body.match(/<title[^>]*>([^<]*)<\/title>/)[1];
  assert.equal(await text('username=octo&metric=followers'), 'followers: 215');
  assert.equal(await text('username=octo&metric=repos'), 'repos: 12');
  assert.match(await text('username=octo&metric=level'), /^level: LV \d+$/);
  assert.match(await text('username=octo&metric=rank'), /^rank: (C|B\+?|A\+?|S)$/);
  assert.match(await text('username=octo&metric=streak'), /^streak: 12 days$/);
  assert.equal(await text('username=empty&metric=streak'), 'streak: 0 days');
  assert.equal(await text('username=octo&metric=stars&label=my%20stars'), 'my stars: 40');
});

test('badge refuses bad input with a small error badge, and never trusts the label', async () => {
  for (const [query, status] of [['', 400], ['username=a%2Fb', 400], ['username=octo&metric=bogus', 400], ['username=nobody', 404], ['username=nobody&metric=streak', 404]]) {
    const { res, body } = await call('badge', query);
    assert.equal(res.status, status, query);
    assertWellFormed(body);
  }
  const { body } = await call('badge', 'username=octo&label=%3Cscript%3Ealert(1)%3C%2Fscript%3E%26%22');
  assertWellFormed(body);
  assert.ok(!body.includes('<script'));
  assert.equal((await call('badge', 'username=octo&style=bogus')).res.status, 200);
});

test('badges that need the calendar or stats explain a missing token', async () => {
  const saved = process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_TOKEN;
  try {
    for (const metric of ['rank', 'streak', 'longest', 'contributions']) {
      const { res, body } = await call('badge', `username=octo&metric=${metric}`);
      assert.equal(res.status, 503, metric);
      assert.match(body, /needs token/);
    }
    assert.equal((await call('badge', 'username=octo&metric=stars')).res.status, 200);
  } finally {
    process.env.GITHUB_TOKEN = saved;
  }
});
