const test = require('node:test');
const assert = require('node:assert/strict');
const { createLimiter } = require('../api/_lib/ratelimit');

test('rate limiter: own id by default, shared id from env, fails open', async () => {
  const seen = [];
  const check = async (id) => { seen.push(id); return { rateLimited: id === 'blocked' }; };
  assert.equal(await createLimiter(check, {})('card-endpoint', {}), false);
  assert.equal(await createLimiter(check, { RATE_LIMIT_SHARED_ID: 'one-rule' })('card-endpoint', {}), false);
  assert.deepEqual(seen, ['card-endpoint', 'one-rule']);
  assert.equal(await createLimiter(check, {})('blocked', {}), true);
  assert.equal(await createLimiter(check, { RATE_LIMIT_SHARED_ID: '   ' })('x-endpoint', {}), false);
  assert.equal(seen[seen.length - 1], 'x-endpoint');
  const boom = async () => { throw new Error('firewall down'); };
  assert.equal(await createLimiter(boom, {})('card-endpoint', {}), false);
});
