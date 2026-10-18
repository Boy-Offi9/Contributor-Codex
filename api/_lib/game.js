
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
  return { color: '#4ade80', tier: 'INITIATE' };
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

const TIER_ORDER = ['INITIATE', 'OPERATIVE', 'SPECIALIST', 'ELITE', 'LEGENDARY'];

const HACKER_CLEARANCE = ['SCRIPT KIDDIE', 'OPERATOR', 'GHOST', 'GATEKEEPER', 'ROOT'];

const clearanceFor = (tier) => HACKER_CLEARANCE[TIER_ORDER.indexOf(tier)] || 'SCRIPT KIDDIE';

const RANK_WEIGHTS = { commits: 1, prs: 4, issues: 2, reviews: 3, stars: 5, followers: 2, contributedTo: 3 };
const RANK_BANDS = [
  { grade: 'C', min: 0 },
  { grade: 'B', min: 100 },
  { grade: 'B+', min: 300 },
  { grade: 'A', min: 700 },
  { grade: 'A+', min: 1500 },
  { grade: 'S', min: 3000 },
];

function computeRank(stats) {
  const score = Math.round(Object.entries(RANK_WEIGHTS).reduce((sum, [key, weight]) => sum + (Number(stats[key]) || 0) * weight, 0));
  let i = 0;
  RANK_BANDS.forEach((band, idx) => { if (score >= band.min) i = idx; });
  const band = RANK_BANDS[i];
  const next = RANK_BANDS[i + 1];
  const progress = next ? Math.min(1, (score - band.min) / (next.min - band.min)) : 1;
  return { score, grade: band.grade, next: next ? next.grade : null, progress };
}

module.exports = {
  computeRank,
  classFor, XP_FORMULA, trophyTier, tierFor, computeStats, clearanceFor,
};
