// GET /api/status — how much GitHub API budget the server token has left.
// Calls GitHub's rate-limit endpoint, which does not count against any quota,
// so it is safe to check as often as the 60s edge cache allows. The token
// itself is never returned.
const { version } = require('../package.json');

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      'X-Content-Type-Options': 'nosniff',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

const pick = (r) => r && {
  limit: r.limit,
  remaining: r.remaining,
  used: r.used,
  resetsAt: new Date(r.reset * 1000).toISOString(),
  minutesUntilReset: Math.max(0, Math.ceil((r.reset * 1000 - Date.now()) / 60000)),
};

module.exports.GET = async () => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return json({
      ok: false,
      version,
      token: 'missing',
      message: 'GITHUB_TOKEN is not set. Without it GitHub allows only 60 requests/hour per server IP, and the streak and activity cards cannot work at all.',
    });
  }
  try {
    const res = await fetch('https://api.github.com/rate_limit', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'contributor-codex' },
    });
    if (res.status === 401) {
      return json({ ok: false, version, token: 'rejected', message: 'GitHub rejected GITHUB_TOKEN (expired, revoked or mistyped). Create a new one and redeploy.' });
    }
    if (!res.ok) return json({ ok: false, version, token: 'unknown', message: `GitHub answered ${res.status}.` }, 502);
    const { resources } = await res.json();
    const rest = pick(resources.core);
    const graphql = pick(resources.graphql);
    const low = [rest, graphql].some((r) => r && r.remaining < r.limit * 0.1);
    return json({
      ok: true,
      version,
      token: 'valid',
      rest,
      graphql,
      search: pick(resources.search),
      warning: low ? 'Under 10% of an hourly budget is left; uncached cards may start failing until it resets.' : undefined,
    });
  } catch {
    return json({ ok: false, version, token: 'unknown', message: 'Could not reach GitHub.' }, 502);
  }
};
