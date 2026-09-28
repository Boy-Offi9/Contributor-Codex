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

// The color convention github-linguist popularized and most of the README
// stats ecosystem now shares — factual hex associations, not copied code.
// Falls back to the card's own accent color for anything unmapped, so an
// obscure language still looks intentional rather than defaulting to gray.
const LANG_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Java: '#b07219',
  'C++': '#f34b7d', C: '#555555', 'C#': '#178600', PHP: '#4F5D95', Ruby: '#701516',
  Go: '#00ADD8', Rust: '#dea584', Swift: '#F05138', Kotlin: '#A97BFF', HTML: '#e34c26',
  CSS: '#563d7c', Shell: '#89e051', 'Vim Script': '#199f4b', Dockerfile: '#384d54',
  Vue: '#41b883', 'Jupyter Notebook': '#DA5B0B', Scala: '#c22d40', Dart: '#00B4AB',
  Elixir: '#6e4a7e', Haskell: '#5e5086', Lua: '#000080', Perl: '#0298c3', R: '#198CE7',
  'Objective-C': '#438eff', MATLAB: '#e16737', PowerShell: '#012456',
};
const colorForLang = (name, fallback) => LANG_COLORS[name] || fallback;

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

let fontCache;
try {
  fontCache = require('./font-data');
} catch {
  fontCache = null; // scripts/build-font.js hasn't been run yet - falls back to system-ui, same as a failed fetch used to
}
const CHAKRA_PETCH_FONT_FACE = fontCache;

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

// Small stroke icons (12x12, stroke=currentColor) as raw path fragments so
// they drop into a parent <g fill="none" stroke="${color}"> without a nested
// viewBox — matches the icon set used across the HTML pages.
const ICONS = {
  repo: '<path d="M2 4l4-2 4 2v5l-4 2-4-2V4Z"/><path d="M2 4l4 2 4-2"/><path d="M6 6v5"/>',
  star: '<path d="M6 1l1.5 3.2L11 4.7l-2.5 2.4.6 3.4L6 8.9 2.9 10.5l.6-3.4L1 4.7l3.5-.5L6 1Z" stroke-linejoin="round"/>',
  people: '<circle cx="4" cy="4" r="1.7"/><path d="M1 10.2c.5-2 1.8-3 3-3s2.5 1 3 3"/><circle cx="9.2" cy="4.6" r="1.3"/><path d="M8.1 10.2c.3-1.6 1-2.6 1.9-3"/>',
  bolt: '<path d="M6.6 1 2.2 7.2h2.9l-.9 3.8 4.6-6h-2.8L6.6 1Z" stroke-linejoin="round"/>',
  fork: '<circle cx="3" cy="2.5" r="1.4"/><circle cx="9" cy="2.5" r="1.4"/><circle cx="6" cy="9.5" r="1.4"/><path d="M3 3.9v1.6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V3.9"/><path d="M6 7.5v1"/>',
  pr: '<circle cx="3" cy="2.5" r="1.4"/><circle cx="3" cy="9.5" r="1.4"/><path d="M3 3.9v4.2"/><path d="M3 6c3.5 0 5-1 5-4.2"/><circle cx="8" cy="1.8" r="1.3"/>',
  issue: '<circle cx="6" cy="6" r="4.6"/><path d="M6 3.4v3.2"/><path d="M6 8.5v.01"/>',
  calendar: '<rect x="1.5" y="2" width="9" height="8.5" rx="1"/><path d="M1.5 5h9"/><path d="M4 1v2"/><path d="M8 1v2"/>',
  pin: '<path d="M6 1c-1.9 0-3.4 1.4-3.4 3.2 0 2.3 3.4 6.8 3.4 6.8s3.4-4.5 3.4-6.8C9.4 2.4 7.9 1 6 1Z"/><circle cx="6" cy="4.2" r="1.1"/>',
  building: '<path d="M2.5 10.5V3l3-1.5 3 1.5v7.5"/><path d="M2.5 10.5h6"/><path d="M5 10.5V7.5h1.5v3"/>',
};

function icon(name, x, y, color) {
  return `<g transform="translate(${x},${y})" fill="none" stroke="${color}" stroke-width="1.3" stroke-linecap="round">${ICONS[name]}</g>`;
}

module.exports = {
  classFor, esc, ghFetch, avatarDataUri, computeStats, CHAKRA_PETCH_FONT_FACE,
  sanitizeColor, XP_FORMULA, trophyTier, byteWeightedLangs, colorForLang, ICONS, icon,
};
