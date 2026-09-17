// Shared by api/card.js and api/leaderboard.js.
// Files under api/_lib are excluded from Vercel's routing, so this is a
// plain helper module, not its own endpoint.

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

function rarityFor(level) {
  if (level >= 25) return { color: '#ffb020', rank: 'LEGENDARY' };
  if (level >= 16) return { color: '#ff4d6d', rank: 'ELITE' };
  if (level >= 10) return { color: '#8b5cf6', rank: 'SPECIALIST' };
  if (level >= 5)  return { color: '#00e5ff', rank: 'OPERATIVE' };
  return { color: '#7a8399', rank: 'INITIATE' };
}

function esc(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function ghFetch(url, token) {
  const headers = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `token ${token}`;
  const res = await fetch(url, { headers });
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

function computeStats(user, repos) {
  const original = repos.filter((r) => !r.fork);
  const langCounts = {};
  let totalStars = 0;
  original.forEach((r) => {
    totalStars += r.stargazers_count || 0;
    if (r.language) langCounts[r.language] = (langCounts[r.language] || 0) + 1;
  });
  const topLang = Object.entries(langCounts).sort((a, b) => b[1] - a[1]).map(([l]) => l)[0] || null;

  const ageYears = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365);
  const xp = (user.followers || 0) * 10 + (user.public_repos || 0) * 15 + totalStars * 5 + Math.floor(ageYears) * 20;
  const level = Math.max(1, Math.min(99, 1 + Math.floor(Math.sqrt(xp) / 6)));

  return { topLang, totalStars, xp, level, ...rarityFor(level) };
}

// Fetches Chakra Petch (bold, latin) once per warm serverless instance and
// caches it as a base64 @font-face block. Embedding it inline (rather than
// linking out with url()) is what makes it survive being rendered inside an
// <img> — the same reason the avatar had to move from a href to a data URI:
// browsers block *new* network requests from inside an image context, but
// bytes already inside the SVG document aren't a new request.
let cachedFontFace = null;
async function chakraPetchFontFace() {
  if (cachedFontFace !== null) return cachedFontFace;
  try {
    const cssRes = await fetch('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@700&display=swap', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' },
    });
    const cssText = await cssRes.text();
    const match = cssText.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/);
    if (!match) { cachedFontFace = ''; return cachedFontFace; }
    const fontRes = await fetch(match[1]);
    const buf = Buffer.from(await fontRes.arrayBuffer());
    cachedFontFace = `@font-face{font-family:'Chakra Petch';font-weight:700;src:url(data:font/woff2;base64,${buf.toString('base64')}) format('woff2');}`;
  } catch {
    cachedFontFace = '';
  }
  return cachedFontFace;
}

function sanitizeColor(input) {
  if (!input) return null;
  const hex = String(input).replace(/^#/, '');
  return /^[0-9a-fA-F]{6}$/.test(hex) ? `#${hex}` : null;
}

module.exports = { classFor, rarityFor, esc, ghFetch, avatarDataUri, computeStats, chakraPetchFontFace, sanitizeColor };
