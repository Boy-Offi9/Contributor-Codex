const test = require('node:test');
const assert = require('node:assert/strict');
const { byteWeightedLangs, ghFetch } = require('../api/_lib/github');
const { fetchStats } = require('../api/_lib/contrib');

const realFetch = global.fetch;
test.afterEach(() => { global.fetch = realFetch; delete process.env.GITHUB_TIMEOUT_MS; });

const json = (body, status = 200) => ({ ok: status < 400, status, headers: { get: () => 'application/json' }, json: async () => body });
const repos = Array.from({ length: 8 }, (_, i) => ({ name: `r${i}`, fork: false, stargazers_count: 10 - i, languages_url: `https://api.github.com/repos/o/r${i}/languages` }));

test('language lookups run in parallel and still add up', async () => {
  global.fetch = async () => { await new Promise((r) => setTimeout(r, 120)); return json({ JavaScript: 100, CSS: 50 }); };
  const started = Date.now();
  const langs = await byteWeightedLangs(repos, 'tok');
  const elapsed = Date.now() - started;
  assert.ok(elapsed < 120 * 3, `6 lookups took ${elapsed}ms; sequential would be ~720ms`);
  assert.deepEqual(langs.map((l) => [l.name, l.bytes]), [['JavaScript', 600], ['CSS', 300]]);
});

test('one failing language lookup does not sink the rest', async () => {
  let n = 0;
  global.fetch = async () => (++n === 2 ? json({}, 500) : json({ Go: 10 }));
  const langs = await byteWeightedLangs(repos, 'tok');
  assert.equal(langs[0].bytes, 50);
});

test('a hung GitHub request times out as a 504 instead of hanging', async () => {
  process.env.GITHUB_TIMEOUT_MS = '40';
  global.fetch = (url, opts = {}) => new Promise((_, reject) => opts.signal.addEventListener('abort', () => reject(opts.signal.reason)));
  const keepAlive = setTimeout(() => {}, 2000);
  try {
    await assert.rejects(() => ghFetch('https://api.github.com/users/hang', 'tok'), (err) => err.status === 504);
  } finally {
    clearTimeout(keepAlive);
  }
});

test('GraphQL errors are classified: rate limit, not found, rejected token', async () => {
  const gqlError = (type) => async () => json({ errors: [{ type, message: type }] });
  global.fetch = gqlError('RATE_LIMITED');
  await assert.rejects(() => fetchStats('octo', 'tok'), (err) => err.status === 429);
  global.fetch = gqlError('NOT_FOUND');
  await assert.rejects(() => fetchStats('octo', 'tok'), (err) => err.status === 404);
  global.fetch = async () => json({ message: 'Bad credentials' }, 401);
  await assert.rejects(() => fetchStats('octo', 'tok'), (err) => err.status === 401 && err.rejected === true);
  await assert.rejects(() => fetchStats('octo', ''), (err) => err.status === 401 && !err.rejected);
});
