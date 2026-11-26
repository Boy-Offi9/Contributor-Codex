const { esc, truncate, MONO, clearanceFor, XP_FORMULA } = require('../shared');

function renderTerminal({ user, xp, totalStars, topLang, tier }) {
  const name = esc(truncate(user.name || user.login, 26));
  const login = esc(user.login);
  const green = '#3ddc6a';
  const rows = [
    ['login', login],
    ['alias', name.toLowerCase()],
    ['lang', topLang ? esc(topLang).toLowerCase() : 'unknown'],
    ['clearance', clearanceFor(tier).toLowerCase()],
    ['repos', user.public_repos || 0],
    ['stars', totalStars],
    ['followers', user.followers || 0],
    ['checksum', `0x${xp.toString(16)}`],
  ];
  const height = 108 + rows.length * 20;

  return `<svg width="360" height="${height}" viewBox="0 0 360 ${height}" xmlns="http://www.w3.org/2000/svg">
    <title>${name} — Contributor Card (terminal theme). checksum = hex(${XP_FORMULA})</title>
    <defs>
      <style>
        .term{font:400 13px ${MONO};fill:${green};}
        .key{font:400 13px ${MONO};fill:#2a6b3d;}
        .dim{fill:#2a6b3d;}
        .head{font:700 13px ${MONO};fill:${green};}
        .ok{font:400 12px ${MONO};fill:#2a6b3d;}
      </style>
    </defs>
    <rect width="360" height="${height}" fill="#020402"/>
    <g opacity="0.14">${Array.from({ length: Math.ceil(height / 6) }, (_, i) => `<line x1="0" y1="${i * 6}" x2="360" y2="${i * 6}" stroke="${green}" stroke-width="1"/>`).join('')}</g>
    <rect x="0" y="-8" width="360" height="5" fill="${green}" opacity="0.10">
      <animate attributeName="y" from="-8" to="${height}" dur="6s" repeatCount="indefinite"/>
    </rect>
    <rect width="360" height="${height}" fill="none" stroke="${green}" stroke-opacity="0.14" stroke-width="4"/>
    <rect width="360" height="${height}" fill="none" stroke="${green}" stroke-opacity="0.7" stroke-width="1"/>
    <g fill="none" stroke="${green}" stroke-width="2" stroke-linecap="square" opacity="0.8">
      <path d="M324 2 H358 V36"/>
      <path d="M36 ${height - 2} H2 V${height - 36}"/>
    </g>
    <rect x="0" y="0" width="360" height="24" fill="#0a140a"/>
    <circle cx="14" cy="12" r="4" fill="#ff4d6d"/>
    <circle cx="30" cy="12" r="4" fill="#ffb020"/>
    <circle cx="46" cy="12" r="4" fill="${green}"/>
    <text x="180" y="16" text-anchor="middle" class="dim" font-family="${MONO}" font-size="11">scan.sh</text>
    <text x="16" y="46" class="head">$ ./scan.sh --target=${login}</text>
    <text x="16" y="66" class="ok">[OK] identity verified</text>
    ${rows.map(([key, value], i) => `<text x="16" y="${88 + i * 20}" class="key">${key}</text><text x="112" y="${88 + i * 20}" class="term">${value}</text>`).join('')}
    <text x="16" y="${88 + rows.length * 20 + 6}" class="term">$ <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/>_</text>
  </svg>`;
}


module.exports = renderTerminal;
