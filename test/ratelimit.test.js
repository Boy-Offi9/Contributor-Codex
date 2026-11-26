const test = require('node:test');
const assert = require('node:assert/strict');
const { createLimiter } = require('../api/_lib/ratelimit');

test('rate limiter: own id by default, shared id from env, fails closed via local limiter', async () => {
  const seen = [];
  const check = async (id) => { seen.push(id); return { rateLimited: id === 'blocked' }; };
  assert.equal(await createLimiter(check, {})('card-endpoint', {}), false);
  assert.equal(await createLimiter(check, { RATE_LIMIT_SHARED_ID: 'one-rule' })('card-endpoint', {}), false);
  assert.deepEqual(seen, ['card-endpoint', 'one-rule']);
  assert.equal(await createLimiter(check, {})('blocked', {}), true);
  assert.equal(await createLimiter(check, { RATE_LIMIT_SHARED_ID: '   ' })('x-endpoint', {}), false);
  assert.equal(seen[seen.length - 1], 'x-endpoint');
  const boom = async () => { throw new Error('firewall down'); };
  // firewall unavailable: local in-memory limiter takes over, so hammering trips it
  const limiter = createLimiter(boom, {});
  let tripped = false;
  for (let i = 0; i < 100; i++) tripped = await limiter('card-endpoint', {}) || tripped;
  assert.equal(tripped, true, 'fallback limiter must engage instead of failing open');
  // distinct clients get separate buckets
  const limiter2 = createLimiter(boom, {});
  assert.equal(await limiter2('other-endpoint', { headers: { get: (h) => (h === 'x-real-ip' ? '1.2.3.4' : null) } }), false);
});
