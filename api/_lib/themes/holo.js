const { esc, MONO, classFor, clearanceFor, XP_FORMULA, icon } = require('../shared');

// Segment arc gauge (starship instrumentation, not a flat bar)
function arcGauge(cx, cy, r, startDeg, sweepDeg, pct, color) {
  const pts = 14;
  const segs = [];
  const lit = Math.round(pts * pct);
  for (let i = 0; i < pts; i++) {
    const a0 = ((startDeg + (sweepDeg / pts) * i) * Math.PI) / 180;
    const a1 = ((startDeg + (sweepDeg / pts) * (i + 1) - 2) * Math.PI) / 180;
    const rf = r + (i < lit ? 2.5 : 0);
    segs.push(
      `<path d="M${(cx + r * Math.cos(a0)).toFixed(1)} ${(cy + r * Math.sin(a0)).toFixed(1)} A${r} ${r} 0 0 1 ${(cx + rf * Math.cos(a1)).toFixed(1)} ${(cy + rf * Math.sin(a1)).toFixed(1)}" fill="none" stroke="${i < lit ? color : '#17202e'}" stroke-width="${i < lit ? 3.5 : 2.5}" stroke-linecap="butt"${i < lit ? ' filter="url(#glow)"' : ''}/>`
    );
  }
  return segs.join('');
}

function polar(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
}

function renderHolo({ user, avatarUri, shape, topLang, level, xp, totalStars, tier, color, fontFace }) {
  const name = esc(user.name || user.login);
  const cls = classFor(topLang);
  const clearance = clearanceFor(tier);
  const displayFont = fontFace ? "'Chakra Petch',system-ui,sans-serif" : 'system-ui,sans-serif';
  const accent = color;
  const cx = 180, cy = 128, R = 52;

  // XP progress toward next level (game.js XP curve is linear per level; show absolute XP vs gauge)
  const pct = Math.max(0.04, Math.min(1, (xp % 1000) / 1000));

  // Radar sweep (rotates once every 6s)
  const sweep = `
    <g opacity="0.5">
      <animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="6s" repeatCount="indefinite"/>
      <path d="M${cx} ${cy} L${polar(cx, cy, R - 6, 0)} A${R - 6} ${R - 6} 0 0 1 ${polar(cx, cy, R - 6, -42)} Z" fill="${accent}" opacity="0.16"/>
      <line x1="${cx}" y1="${cy}" x2="${polar(cx, cy, R - 6, 0).split(',')[0]}" y2="${polar(cx, cy, R - 6, 0).split(',')[1]}" stroke="${accent}" stroke-width="1.2" opacity="0.8"/>
    </g>`;

  // Reticle tick marks every 30 degrees
  const ticks = [];
  for (let d = 0; d < 360; d += 30) {
    const major = d % 90 === 0;
    ticks.push(`<line x1="${polar(cx, cy, R + (major ? 0 : 2), d).split(',')[0]}" y1="${polar(cx, cy, R + (major ? 0 : 2), d).split(',')[1]}" x2="${polar(cx, cy, R + (major ? 9 : 6), d).split(',')[0]}" y2="${polar(cx, cy, R + (major ? 9 : 6), d).split(',')[1]}" stroke="${accent}" stroke-width="${major ? 1.4 : 0.7}" opacity="${major ? 0.9 : 0.5}"/>`);
  }

  // Corner targeting brackets
  const bracket = (x, y, sx, sy) =>
    `<path d="M${x + 14 * sx} ${y} H${x} V${y + 14 * sy}" fill="none" stroke="${accent}" stroke-width="2" opacity="0.9"/>`;

  // Scanline
  const scanline = `
    <rect x="0" y="-2" width="360" height="2.5" fill="${accent}" opacity="0.12">
      <animate attributeName="y" from="-2" to="360" dur="7s" repeatCount="indefinite"/>
    </rect>`;

  const stat = (y, label, value, iconName) => `
    <g>
      ${icon(iconName, 26, y - 9, accent, 1)}
      <text x="44" y="${y}" font="${MONO}" font-size="9" letter-spacing="2" fill="#5f6b80">${label}</text>
      <text x="330" y="${y}" text-anchor="end" font="${MONO}" font-size="12" font-weight="700" fill="#dbe4f0">${value}</text>
      <path d="M26 ${y + 6} H334" stroke="#1a2434" stroke-width="1"/>
      <path d="M26 ${y + 6} h10" stroke="${accent}" stroke-width="2" filter="url(#glow)"/>
    </g>`;

  return `<svg width="360" height="360" viewBox="0 0 360 360" xmlns="http://www.w3.org/2000/svg">
  <title>${name} — contributor card. XP = ${XP_FORMULA}</title>
  <defs>
    ${fontFace ? `<style>${fontFace}</style>` : ''}
    <style>
      .disp{font:700 17px ${displayFont};fill:#eef3fa;}
      .sub{font:500 11px ${MONO};fill:#8a95ab;}
      .tag{font:700 9px ${MONO};letter-spacing:2.5px;}
    </style>
    <clipPath id="chassis"><polygon points="18,0 360,0 360,330 342,360 0,360 0,18"/></clipPath>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="2.2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <radialGradient id="vig" cx="50%" cy="42%" r="75%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="mesh" width="18" height="18" patternUnits="userSpaceOnUse">
      <path d="M18 0H0V18" fill="none" stroke="${accent}" stroke-width="0.4" opacity="0.35"/>
    </pattern>
    <clipPath id="reticle"><circle cx="${cx}" cy="${cy}" r="${R - 5}"/></clipPath>
  </defs>

  <g clip-path="url(#chassis)">
    <rect width="360" height="360" fill="#04070d"/>
    <rect width="360" height="360" fill="url(#mesh)" opacity="0.06"/>
    <rect width="360" height="360" fill="url(#vig)"/>
    <!-- chassis frame -->
    <polygon points="18,0 360,0 360,330 342,360 0,360 0,18" fill="none" stroke="#1c2638" stroke-width="1.2"/>
    <polygon points="18,0 360,0 360,330 342,360 0,360 0,18" fill="none" stroke="${accent}" stroke-opacity="0.18" stroke-width="3"/>
    <!-- top telemetry ruler -->
    <line x1="22" y1="34" x2="338" y2="34" stroke="#1a2434"/>
    ${Array.from({ length: 40 }, (_, i) => `<line x1="${22 + i * 8}" y1="34" x2="${22 + i * 8}" y2="${i % 5 === 0 ? 29 : 31.5}" stroke="${i % 5 === 0 ? accent : '#2a3549'}" stroke-width="1" opacity="${i % 5 === 0 ? 0.8 : 0.4}"/>`).join('')}
    ${bracket(6, 6, 1, 1)}${bracket(354, 6, -1, 1)}${bracket(6, 354, 1, -1)}${bracket(354, 354, -1, -1)}
    ${scanline}
  </g>

  <!-- header readouts -->
  <g font-family="${MONO}" class="tag">
    <rect x="24" y="12" width="86" height="15" fill="none" stroke="${accent}" stroke-opacity="0.7"/>
    <text x="31" y="23.5" fill="${accent}" font-size="9" letter-spacing="2.5">LV.${String(level).padStart(2, '0')}</text>
    <text x="336" y="23.5" text-anchor="end" fill="#5f6b80" font-size="9" letter-spacing="2.5">${esc(tier)} · ${esc(clearance)}</text>
    <text x="336" y="46" text-anchor="end" fill="#3d4a60" font-size="7" letter-spacing="1.5">SIG 0x${(xp % 65536).toString(16).toUpperCase().padStart(4, '0')}</text>
  </g>

  <!-- HUD reticle + avatar -->
  <circle cx="${cx}" cy="${cy}" r="${R + 12}" fill="none" stroke="#16202f" stroke-width="1"/>
  ${arcGauge(cx, cy, R + 17, 130, 280, pct, accent)}
  ${ticks.join('')}
  ${sweep}
  <circle cx="${cx}" cy="${cy}" r="${R - 5}" fill="#070b14"/>
  ${avatarUri ? `<image href="${avatarUri}" x="${cx - R + 5}" y="${cy - R + 5}" width="${2 * R - 10}" height="${2 * R - 10}" preserveAspectRatio="xMidYMid slice" clip-path="url(#reticle)"/>` : ''}
  <circle cx="${cx}" cy="${cy}" r="${R - 5}" fill="none" stroke="${accent}" stroke-width="1.6" filter="url(#glow)"/>
  <!-- crosshair stubs -->
  <line x1="${cx - R - 16}" y1="${cy}" x2="${cx - R - 4}" y2="${cy}" stroke="${accent}" stroke-width="1.2" opacity="0.85"/>
  <line x1="${cx + R + 4}" y1="${cy}" x2="${cx + R + 16}" y2="${cy}" stroke="${accent}" stroke-width="1.2" opacity="0.85"/>
  <circle cx="${cx}" cy="${cy}" r="2" fill="${accent}"/>

  <!-- identity block -->
  <text x="180" y="222" text-anchor="middle" class="disp">${name}</text>
  <text x="180" y="238" text-anchor="middle" class="sub">@${esc(user.login)}</text>
  <g font-family="${MONO}">
    <path d="M118 252 l-6 6 6 6 M242 252 l6 6 -6 6" fill="none" stroke="${accent}" stroke-width="1" opacity="0.6"/>
    <text x="180" y="262" text-anchor="middle" font-size="10" font-weight="700" letter-spacing="3" fill="${accent}" filter="url(#glow)">${esc(cls)}${topLang ? ' · ' + esc(topLang.toUpperCase()) : ''}</text>
  </g>

  <!-- telemetry rows -->
  ${stat(288, 'REPOSITORIES', user.public_repos ?? '—', 'repo')}
  ${stat(309, 'STARS EARNED', totalStars ?? '—', 'star')}
  ${stat(330, 'FOLLOWERS', user.followers ?? '—', 'people')}

  <!-- XP gauge footer -->
  <g font-family="${MONO}">
    <text x="240" y="354" text-anchor="start" font-size="9" letter-spacing="2" fill="#5f6b80">XP</text>
    <text x="262" y="352" text-anchor="start" font-size="11" font-weight="700" fill="${accent}" filter="url(#glow)">${(xp ?? 0).toLocaleString('en-US')}</text>
    <text x="338" y="352" text-anchor="end" font-size="8" fill="#3d4a60">${Math.round(pct * 100)}%</text>
  </g>
</svg>`;
}

module.exports = renderHolo;
