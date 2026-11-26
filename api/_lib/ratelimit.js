const { checkRateLimit } = require('@vercel/firewall');

// Local fallback limiter: when the Vercel firewall is unavailable (non-Vercel
// host, missing x-real-ip) we used to fail open and let every request through.
// Now we fall back to a small in-memory fixed-window limiter.
const WINDOW_MS = 60_000;
const buckets = new Map(); // key -> { count, resetAt }
const LOCAL_LIMITS = { default: 60 };

function localLimited(id, key) {
  const now = Date.now();
  const k = `${id}:${key}`;
  let b = buckets.get(k);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(k, b);
    if (buckets.size > 10_000) buckets.delete(buckets.keys().next().value);
  }
  b.count += 1;
  return b.count > (LOCAL_LIMITS[id] || LOCAL_LIMITS.default);
}

function clientKey(request) {
  const h = (request && request.headers) || {};
  const real = typeof h.get === 'function' ? h.get('x-real-ip') : h['x-real-ip'];
  const fwd = typeof h.get === 'function' ? h.get('x-forwarded-for') : h['x-forwarded-for'];
  const key = (typeof real === 'string' && real.trim()) || (typeof fwd === 'string' ? fwd.split(',')[0].trim() : '');
  // header-derived keys are client-controlled; bound their length
  return key.slice(0, 64) || 'anon';
}

function createLimiter(check, env = process.env) {
  return async function isRateLimited(name, request) {
    const id = (env.RATE_LIMIT_SHARED_ID || '').trim() || name;
    try {
      const result = await check(id, { request });
      return Boolean(result && result.rateLimited);
    } catch {
      // firewall unavailable — degrade to the local limiter instead of failing open
      return localLimited(id, clientKey(request));
    }
  };
}

module.exports = { createLimiter, isRateLimited: createLimiter(checkRateLimit) };
