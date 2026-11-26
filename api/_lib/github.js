const { retryAfterAware, withDedupe } = require('@boy-offi9-inc/reqkit');

const timeoutMs = () => Number(process.env.GITHUB_TIMEOUT_MS) || 6000;

function asTimeout(err) {
  if (err && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
    const out = new Error('github timeout');
    out.status = 504;
    return out;
  }
  return err;
}

function isRateLimitResponse(res) {
  if (res.status === 429) return true;
  return res.status === 403 && (res.headers.get('x-ratelimit-remaining') === '0' || Boolean(res.headers.get('retry-after')));
}

function normalizeRateLimit(res) {
  if (res.status !== 403 || !isRateLimitResponse(res)) return res;
  return new Response(null, { status: 429, headers: res.headers });
}

const dedupedFetch = withDedupe(
  (url, headers) => fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs()) }).then(normalizeRateLimit),
  { keyFn: (url, headers) => `${headers.Authorization || 'anon'}:${url}` },
);

const isGhName = (v) => /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(v);

const isGhRepo = (v) => /^[A-Za-z0-9._-]{1,100}$/.test(v) && v !== '.' && v !== '..';

async function ghFetch(url, token) {
  const headers = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await retryAfterAware(() => dedupedFetch(url, headers), {
      retries: 2,
      retryStatusCodes: [429],
    });
  } catch (err) {
    throw asTimeout(err);
  }
  if (!res.ok) {
    const err = new Error(String(res.status));
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function avatarDataUri(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(Math.min(timeoutMs(), 3000)) });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

async function byteWeightedLangs(repos, token) {
  const candidates = repos.filter((r) => !r.fork).sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 6);
  const totals = {};
  const results = await Promise.all(candidates.map((repo) => ghFetch(repo.languages_url, token).catch(() => ({}))));
  for (const bytes of results) {
    for (const [lang, count] of Object.entries(bytes)) {
      totals[lang] = (totals[lang] || 0) + count;
    }
  }
  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, bytes]) => ({ name, bytes, pct: Math.round((bytes / grandTotal) * 100) }));
}

async function prIssueCounts(username, token) {
  const headers = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const fetchCount = async (type) => {
    try {
      const res = await fetch(`https://api.github.com/search/issues?q=author:${username}+type:${type}&per_page=1`, { headers });
      if (!res.ok) return null;
      const data = await res.json();
      return typeof data.total_count === 'number' ? data.total_count : null;
    } catch {
      return null;
    }
  };
  const [prs, issues] = await Promise.all([fetchCount('pr'), fetchCount('issue')]);
  return { prs, issues };
}



async function loadUserWithRepos(username, token) {
  const user = await ghFetch(`https://api.github.com/users/${username}`, token);
  let repos = [];
  try {
    // paginate up to 300 repos so stars/langs don't undercount past page 1
    const pages = await Promise.all([
      ghFetch(`https://api.github.com/users/${username}/repos?per_page=100&type=owner`, token),
      ghFetch(`https://api.github.com/users/${username}/repos?per_page=100&type=owner&page=2`, token).catch(() => []),
      ghFetch(`https://api.github.com/users/${username}/repos?per_page=100&type=owner&page=3`, token).catch(() => []),
    ]);
    repos = pages.flat().filter(Boolean);
  } catch {}
  return { user, repos };
}

module.exports = {
  loadUserWithRepos, prIssueCounts, isRateLimitResponse, normalizeRateLimit, asTimeout, isGhName, isGhRepo, ghFetch, avatarDataUri, byteWeightedLangs,
};
