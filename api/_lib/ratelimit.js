const { checkRateLimit } = require('@vercel/firewall');

function createLimiter(check, env = process.env) {
  return async function isRateLimited(name, request) {
    const id = (env.RATE_LIMIT_SHARED_ID || '').trim() || name;
    try {
      const result = await check(id, { request });
      return Boolean(result && result.rateLimited);
    } catch {
      return false;
    }
  };
}

module.exports = { createLimiter, isRateLimited: createLimiter(checkRateLimit) };
