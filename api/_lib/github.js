// Everything that talks to api.github.com (or fetches an avatar), plus the
// name validation that guards what we put into those URLs.
const { retryAfterAware, withDedupe } = require('@boy-offi9-inc/reqkit');

const dedupedFetch = withDedupe(
  (url, headers) => fetch(url, { headers }),
  { keyFn: (url, headers) => `${headers.Authorization || 'anon'}:${url}` },
);

// Names go straight into api.github.com paths (and one search query) that are
// called with the server's token, so anything that isn't a plain GitHub name
// must be refused up front: "a/../../orgs/x", "a?per_page=1", "a+is:private".
const isGhName = (v) => /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(v);

const isGhRepo = (v) => /^[A-Za-z0-9._-]{1,100}$/.test(v) && v !== '.' && v !== '..';

async function ghFetch(url, token) {
  const headers = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `token ${token}`;

  const res = await retryAfterAware(() => dedupedFetch(url, headers), {
    retries: 2,
    retryStatusCodes: [403, 429],
  });
  if (!res.ok) {
    const err = new Error(String(res.status));
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function avatarDataUri(url) {
  try {
    const res = await fetch(url);
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
  for (const repo of candidates) {
    try {
      const bytes = await ghFetch(repo.languages_url, token);
      for (const [lang, count] of Object.entries(bytes)) {
        totals[lang] = (totals[lang] || 0) + count;
      }
    } catch {}
  }
  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, bytes]) => ({ name, bytes, pct: Math.round((bytes / grandTotal) * 100) }));
}

module.exports = {
  isGhName, isGhRepo, ghFetch, avatarDataUri, byteWeightedLangs,
};
