const { retryAfterAware, withDedupe } = require('@boy-offi9-inc/reqkit');

const LANG_CLASS = {
  JavaScript: 'NETRUNNER', TypeScript: 'CIPHER ADEPT', Python: 'DATA MAGE',
  Java: 'IRON WARDEN', Kotlin: 'IRON WARDEN', Go: 'FORGE RUNNER', Rust: 'VOID SMITH',
  C: 'CORE ENGINEER', 'C++': 'CORE ENGINEER', 'C#': 'CORE ENGINEER',
  HTML: 'SIGNAL WEAVER', CSS: 'SIGNAL WEAVER', Vue: 'SIGNAL WEAVER', Svelte: 'SIGNAL WEAVER',
  Shell: 'TERMINAL RONIN', PowerShell: 'TERMINAL RONIN', Dockerfile: 'TERMINAL RONIN',
  Swift: 'GLASS ARCHITECT', Dart: 'GLASS ARCHITECT', 'Objective-C': 'GLASS ARCHITECT',
  Ruby: 'RUNE SMITH', PHP: 'GRID WARDEN', Elixir: 'GRID WARDEN', Erlang: 'GRID WARDEN',
  Scala: 'ARC CASTER', Clojure: 'ARC CASTER', Haskell: 'ARC CASTER', 'F#': 'ARC CASTER',
  R: 'ORACLE', Julia: 'ORACLE', 'Jupyter Notebook': 'ORACLE', MATLAB: 'ORACLE',
  Lua: 'SCRIPT REAVER', Perl: 'SCRIPT REAVER', Assembly: 'BIT REAPER',
  Solidity: 'CHAIN BREAKER', Zig: 'BIT REAPER', Nim: 'BIT REAPER',
  TeX: 'ARCHIVIST', Markdown: 'ARCHIVIST', 'Vim Script': 'ARCHIVIST', Emacs: 'ARCHIVIST',
};

const classFor = (lang) => LANG_CLASS[lang] || 'WANDERER';

const XP_WEIGHTS = { repo: 15, star: 5, follower: 10, year: 20 };
const XP_FORMULA = `repos×${XP_WEIGHTS.repo} + stars×${XP_WEIGHTS.star} + followers×${XP_WEIGHTS.follower} + years×${XP_WEIGHTS.year}`;

const TIERS = [
  { name: 'INITIATE', color: '#7a8399' },
  { name: 'OPERATIVE', color: '#00e5ff' },
  { name: 'SPECIALIST', color: '#8b5cf6' },
  { name: 'ELITE', color: '#ff4d6d' },
  { name: 'LEGENDARY', color: '#ffb020' },
];

function trophyTier(value, thresholds) {
  let index = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (value >= thresholds[i]) index = i + 1;
  }
  const current = TIERS[index];
  const nextThreshold = thresholds[index] ?? null;
  return { name: current.name, color: current.color, index, nextThreshold };
}

function tierFor(level) {
  if (level >= 25) return { color: '#ffb020', tier: 'LEGENDARY' };
  if (level >= 16) return { color: '#ff4d6d', tier: 'ELITE' };
  if (level >= 10) return { color: '#8b5cf6', tier: 'SPECIALIST' };
  if (level >= 5)  return { color: '#00e5ff', tier: 'OPERATIVE' };
  return { color: '#7a8399', tier: 'INITIATE' };
}

function esc(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const dedupedFetch = withDedupe(
  (url, headers) => fetch(url, { headers }),
  { keyFn: (url, headers) => `${headers.Authorization || 'anon'}:${url}` },
);

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

let fontCache = null;
async function chakraPetchFontFace() {
  if (fontCache) return fontCache;
  try {
    const cssRes = await fetch('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@600;700&display=swap', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const css = await cssRes.text();
    const fontUrl = css.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/)?.[1];
    if (!fontUrl) return null;
    const fontRes = await fetch(fontUrl);
    const buf = Buffer.from(await fontRes.arrayBuffer());
    fontCache = `@font-face{font-family:'Chakra Petch';font-weight:600 700;src:url(data:font/woff2;base64,${buf.toString('base64')}) format('woff2');}`;
    return fontCache;
  } catch {
    return null;
  }
}

function computeStats(user, repos) {
  const original = repos.filter((r) => !r.fork);
  const langCounts = {};
  let totalStars = 0;
  let totalForks = 0;
  original.forEach((r) => {
    totalStars += r.stargazers_count || 0;
    totalForks += r.forks_count || 0;
    if (r.language) langCounts[r.language] = (langCounts[r.language] || 0) + 1;
  });
  const langs = Object.entries(langCounts).sort((a, b) => b[1] - a[1]).map(([l]) => l);
  const topLang = langs[0] || null;

  const years = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365);
  const repoCount = user.public_repos || 0;
  const followers = user.followers || 0;

  const xp = repoCount * XP_WEIGHTS.repo + totalStars * XP_WEIGHTS.star + followers * XP_WEIGHTS.follower + Math.floor(years) * XP_WEIGHTS.year;
  const level = Math.max(1, Math.min(99, 1 + Math.floor(Math.sqrt(xp) / 6)));
  const { color, tier } = tierFor(level);

  return { topLang, langs, totalStars, totalForks, years, xp, level, color, tier };
}

function sanitizeColor(input) {
  if (!input) return null;
  const hex = String(input).replace(/^#/, '');
  return /^[0-9a-fA-F]{6}$/.test(hex) ? `#${hex}` : null;
}

module.exports = {
  classFor, esc, ghFetch, avatarDataUri, computeStats, chakraPetchFontFace,
  sanitizeColor, XP_FORMULA, trophyTier,
};
