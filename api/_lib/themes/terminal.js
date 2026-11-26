const { esc, truncate, MONO, clearanceFor, XP_FORMULA } = require('../shared');

const GREEN = '#3ddc6a';
const DIM = '#2a6b3d';
const BRIGHT = '#7dffa8';
const TIER_RANK = ['INITIATE', 'OPERATOR', 'SPECIALIST', 'ELITE', 'LEGENDARY', 'MYTHIC'];
const LANG_ALIAS = { JavaScript: 'JS', TypeScript: 'TS', 'Jupyter Notebook': 'JUPYTER', 'Objective-C': 'OBJC', 'Visual Basic': 'VB', Dockerfile: 'DOCKER', PowerShell: 'PSHELL', 'Vim Script': 'VIM' };

const meter = (pct, width = 18) => {
  const on = Math.round(Math.max(0, Math.min(1, pct)) * width);
  return `[${'▓'.repeat(on)}${'░'.repeat(width - on)}]`;
};

// Full phosphor dossier: the terminal theme reads like a live security-scan
// session — boot log, box-drawn sections, ASCII meters, blocky data, [EOF].
function renderTerminal({ user, xp, totalStars, topLang, tier, langStats, prs, issues }) {
  const name = esc(truncate(user.name || user.login, 26));
  const login = esc(user.login);
  const W = 360;
  const years = user.created_at ? Math.max(1, Math.floor((Date.now() - new Date(user.created_at).getTime()) / 31557600000)) : null;
  const rank = TIER_RANK.indexOf(tier);
  const clearance = clearanceFor(tier) || 'UNKNOWN';
  const level = Math.max(1, Math.min(99, 1 + Math.floor(Math.sqrt(Math.max(0, xp)) / 6)));
  const xpFor = (l) => Math.pow((l - 1) * 6, 2);
  const nextXp = xpFor(level + 1);
  const prevXp = xpFor(level);
  const lvlPct = nextXp > prevXp ? (xp - prevXp) / (nextXp - prevXp) : 1;

  const alias = (n) => LANG_ALIAS[n] || String(n).toUpperCase().slice(0, 7);
  const langs = (langStats || []).slice(0, 4);

  let y = 96;
  const section = (label) => {
    const out = `<text x="16" y="${y}" class="sec">┌─ ${label} ${'─'.repeat(Math.max(0, 30 - label.length))}</text>`;
    y += 20;
    return out;
  };
  const kv = (key, value, bright) => {
    const dots = '.'.repeat(Math.max(2, Math.floor((W - 32 - 148 - String(key).length * 7.8) / 6.2)));
    const out = `<text x="24" y="${y}" class="key">${esc(key)}</text><text x="${24 + String(key).length * 7.8 + 4}" y="${y}" class="dim" font-size="12.5">${dots}</text><text x="172" y="${y}" class="${bright ? 'val hi' : 'val'}">${value}</text>`;
    y += 18;
    return out;
  };

  const rows = [];
  rows.push(`<text x="16" y="${y}" class="sec">┌─ TELEMETRY ${'─'.repeat(21)}</text>`); y += 20;
  rows.push(kv('repos', user.public_repos || 0));
  rows.push(kv('stars', totalStars));
  rows.push(kv('followers', user.followers || 0));
  if (prs != null) rows.push(kv('pull requests', prs));
  if (issues != null) rows.push(kv('issues', issues));
  rows.push(kv('xp', `${xp} · lv ${level}`, true));
  rows.push(`<text x="24" y="${y}" class="term">xp ${meter(lvlPct, 16)} ${Math.round(lvlPct * 100)}% → lv ${level + 1}</text>`);
  y += 18;
  y += 6;

  if (langs.length) {
    rows.push(`<text x="16" y="${y}" class="sec">┌─ LANG WEIGHT ${'─'.repeat(17)}</text>`); y += 20;
    for (const l of langs) {
      const pct = Math.round(l.pct);
      rows.push(`<text x="24" y="${y}" class="key">${esc(alias(l.name)).toLowerCase()}</text><text x="104" y="${y}" class="dim" font-size="12.5">${meter(l.pct / 100, 14)}</text><text x="268" y="${y}" class="term">${pct}%</text>`);
      y += 18;
    }
    y += 6;
  }

  rows.push(`<text x="16" y="${y}" class="sec">┌─ IDENTITY ${'─'.repeat(23)}</text>`); y += 20;
  rows.push(kv('login', login));
  rows.push(kv('alias', name.toLowerCase()));
  rows.push(kv('clearance', clearance.toLowerCase(), true));
  rows.push(kv('top lang', topLang ? esc(topLang).toLowerCase() : 'unknown'));
  rows.push(kv('uptime', years ? `${years}y` : '—'));
  rows.push(kv('checksum', `0x${xp.toString(16)}`));

  const height = y + 34;
  const secCss = `.sec{font:400 11px ${MONO};fill:${DIM};letter-spacing:1px;}`;

  return `<svg width="${W}" height="${height}" viewBox="0 0 ${W} ${height}" xmlns="http://www.w3.org/2000/svg">
    <title>${name} — Codex Dossier (terminal theme). checksum = hex(${XP_FORMULA})</title>
    <defs>
      <style>
        .term{font:400 12.5px ${MONO};fill:${GREEN};}
        .val{font:400 12.5px ${MONO};fill:${GREEN};}
        .hi{fill:${BRIGHT};font-weight:700;}
        .key{font:400 12.5px ${MONO};fill:${DIM};}
        .dim{fill:${DIM};}
        .head{font:700 13px ${MONO};fill:${GREEN};}
        .ok{font:400 11.5px ${MONO};fill:${DIM};}
        ${secCss}
      </style>
      <filter id="phosGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.6"/></filter>
    </defs>
    <rect width="${W}" height="${height}" fill="#020402"/>
    <g opacity="0.14">${Array.from({ length: Math.ceil(height / 6) }, (_, i) => `<line x1="0" y1="${i * 6}" x2="${W}" y2="${i * 6}" stroke="${GREEN}" stroke-width="1"/>`).join('')}</g>
    <rect x="0" y="-8" width="${W}" height="5" fill="${GREEN}" opacity="0.10">
      <animate attributeName="y" from="-8" to="${height}" dur="6s" repeatCount="indefinite"/>
    </rect>
    <rect width="${W}" height="${height}" fill="none" stroke="${GREEN}" stroke-opacity="0.14" stroke-width="4"/>
    <rect width="${W}" height="${height}" fill="none" stroke="${GREEN}" stroke-opacity="0.7" stroke-width="1"/>
    <g fill="none" stroke="${GREEN}" stroke-width="2" stroke-linecap="square" opacity="0.8">
      <path d="M324 2 H358 V36"/>
      <path d="M36 ${height - 2} H2 V${height - 36}"/>
    </g>
    <rect x="0" y="0" width="${W}" height="24" fill="#0a140a"/>
    <circle cx="14" cy="12" r="4" fill="#ff4d6d"/>
    <circle cx="30" cy="12" r="4" fill="#ffb020"/>
    <circle cx="46" cy="12" r="4" fill="${GREEN}"/>
    <text x="180" y="16" text-anchor="middle" class="dim" font-family="${MONO}" font-size="11">codex@vercel:~/dossier</text>
    <text x="344" y="16" text-anchor="end" class="dim" font-family="${MONO}" font-size="9.5" letter-spacing="1">${esc(clearance)}</text>
    <g opacity="0.4" filter="url(#phosGlow)">
      <text x="16" y="46" class="head">$ codex scan --target=${login} --full</text>
    </g>
    <text x="16" y="46" class="head">$ codex scan --target=${login} --full</text>
    <text x="16" y="64" class="ok">[BOOT] phosphor interface v0.31 · link github api</text>
    <text x="16" y="80" class="ok">[OK] identity verified · clearance ${esc(clearance.toLowerCase())} · rank ${rank >= 0 ? rank + 1 : '?'}/${TIER_RANK.length}</text>
    ${rows.join('')}
    <text x="16" y="${height - 12}" class="dim" font-family="${MONO}" font-size="11">[EOF]</text>
    <text x="${W - 16}" y="${height - 12}" text-anchor="end" class="term">$ <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/>_</text>
  </svg>`;
}

module.exports = renderTerminal;
