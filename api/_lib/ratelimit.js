// One place for the Vercel Firewall rate-limit check every endpoint makes.
//
// Rule IDs: each endpoint asks for its own ID ('card-endpoint', ...), which is
// right on a Pro plan (40 rate-limit rules per project). Hobby projects get ONE
// rate-limit rule, so setting RATE_LIMIT_SHARED_ID makes every endpoint use
// that single ID, and therefore one shared per-IP counter.
//
// Fails open: if the firewall lookup throws (network hiccup, rule missing),
// the request is served rather than turning every card into an error image.
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
