const { esc, truncate, MONO, classFor, clearanceFor, XP_FORMULA, icon } = require('../shared');

// Design language: scifi-ui-kit HUD (chamfered chassis, triple-stroke glow,
// radar reticle, segmented gauges, telemetry rows, traveling border light).
// The cyberpunk card is the full dossier: every stat the engine computes.

const PALETTE = { accent: '#00E5FF', secondary: '#FF2D6F', dim: '#7FB8C4', bg: '#04070D', text: '#E8FDFF' };
const CHAMFER = 18;

function mixHex(a, b, f) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * f).toString(16).padStart(2, '0')).join('');
}

function polar(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
}

// Segmented arc gauge (starship instrumentation, not a flat bar)
function arcGauge(cx, cy, r, startDeg, sweepDeg, pct, color) {
  const pts = 14;
  const segs = [];
  const lit = Math.round(pts * pct);
  for (let i = 0; i < pts; i++) {
    const a0 = ((startDeg + (sweepDeg / pts) * i) * Math.PI) / 180;
    const a1 = ((startDeg + (sweepDeg / pts) * (i + 1) - 2) * Math.PI) / 180;
    const rf = r + (i < lit ? 2.5 : 0);
    segs.push(
      `<path d="M${(cx + r * Math.cos(a0)).toFixed(1)} ${(cy + r * Math.sin(a0)).toFixed(1)} A${r} ${r} 0 0 1 ${(cx + rf * Math.cos(a1)).toFixed(1)} ${(cy + rf * Math.sin(a1)).toFixed(1)}" fill="none" stroke="${i < lit ? color : '#14202c'}" stroke-width="${i < lit ? 3.5 : 2.5}" stroke-linecap="butt"${i < lit ? ' filter="url(#glow)"' : ''}/>`
    );
  }
  return segs.join('');
}

function renderCyberpunk({ user, avatarUri, shape, topLang, level, xp, years, totalStars, totalForks, tier, color, fontFace, langStats, prs, issues }) {
  const name = esc(truncate(user.name || user.login, 22));
  const cls = classFor(topLang);
  const clearance = clearanceFor(tier);
  const displayFont = fontFace ? "'Chakra Petch',system-ui,sans-serif" : 'system-ui,sans-serif';
  const accent = color || PALETTE.accent;
  const hot = mixHex(accent, PALETTE.secondary, 0.65);
  const bracketCol = mixHex(accent, '#ffffff', 0.55);
  const sweepCol = mixHex(accent, '#ffffff', 0.8);
  const cx = 180, cy = 118, R = 46;

  const pct = Math.max(0.04, Math.min(1, (xp % 1000) / 1000));
  const topLangs = (langStats || []).slice(0, 5);
  const shareSum = topLangs.reduce((sum, l) => sum + l.pct, 0) || 1;

  // dynamic height: header(150) + identity(72) + telemetry(2 rows) + langs + activity + xp
  const telemetryY = 268;
  const langY = telemetryY + 74;
  const legendRows = Math.ceil(topLangs.length / 3);
  const langBlockH = topLangs.length ? 44 + legendRows * 16 : 0;
  const activityY = langY + langBlockH + (topLangs.length ? 26 : 10);
  const height = activityY + 92;

  const W = 360;
  const framePts = `${CHAMFER},0 ${W},0 ${W},${height - CHAMFER} ${W - CHAMFER},${height} 0,${height} 0,${CHAMFER}`;
  const per = 2 * (W + height) - 2 * (2 * CHAMFER) + 2 * CHAMFER * Math.SQRT2;
  const seg = per * 0.14;

  // radar sweep with degree-based fading trail
  const trailDeg = 95;
  const trail = [];
  const STEPS = 7;
  for (let i = 0; i < STEPS; i++) {
    const a0 = -trailDeg + (trailDeg / STEPS) * i;
    const a1 = -trailDeg + (trailDeg / STEPS) * (i + 1);
    trail.push(`<path d="M${cx} ${cy} L${polar(cx, cy, R - 6, a0)} A${R - 6} ${R - 6} 0 0 1 ${polar(cx, cy, R - 6, a1)} Z" fill="${accent}" opacity="${(0.05 + (0.14 * (i + 1)) / STEPS).toFixed(3)}"/>`);
  }
  const sweep = `
    <g>
      <animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="3.2s" repeatCount="indefinite"/>
      ${trail.join('')}
      <line x1="${cx}" y1="${cy}" x2="${polar(cx, cy, R - 6, 0).split(',')[0]}" y2="${polar(cx, cy, R - 6, 0).split(',')[1]}" stroke="${sweepCol}" stroke-width="1.2" opacity="0.9"/>
    </g>`;

  const ticks = [];
  for (let d = 0; d < 360; d += 360 / 48) {
    const major = d % 90 === 0;
    ticks.push(`<line x1="${polar(cx, cy, R + (major ? 0 : 2), d).split(',')[0]}" y1="${polar(cx, cy, R + (major ? 0 : 2), d).split(',')[1]}" x2="${polar(cx, cy, R + (major ? 9 : 6), d).split(',')[0]}" y2="${polar(cx, cy, R + (major ? 9 : 6), d).split(',')[1]}" stroke="${accent}" stroke-width="${major ? 1.4 : 0.7}" opacity="${major ? 0.9 : 0.45}"/>`);
  }

  const scanlines = Array.from({ length: Math.ceil(height / 6) }, (_, i) => `<line x1="${CHAMFER - 4}" y1="${i * 6}" x2="${W - CHAMFER + 4}" y2="${i * 6}" stroke="${accent}" stroke-width="1" opacity="0.07"/>`).join('');

  const cell = (x, y, label, value, iconName, isSecondary) => `
    <g>
      ${icon(iconName, x, y - 18, isSecondary ? hot : accent, 1)}
      <text x="${x + 18}" y="${y - 14}" font-family="${MONO}" font-size="8.5" letter-spacing="1.5" fill="${PALETTE.dim}" opacity="0.85">${label}</text>
      <text x="${x}" y="${y + 2}" font-family="${displayFont}" font-size="16" font-weight="700" fill="${PALETTE.text}">${value}</text>
      <path d="M${x} ${y + 10} H${x + 150}" stroke="#122230" stroke-width="1"/>
    </g>`;

  // lang distribution bar
  let cursor = 24;
  const barW = W - 48;
  const langSegs = topLangs.map((l, i) => {
    const w = i === topLangs.length - 1 ? barW - (cursor - 24) : Math.round((l.pct / shareSum) * barW);
    const s = { x: cursor, w, color: l.color || accent, name: esc(l.name), pct: Math.round(l.pct) };
    cursor += w;
    return s;
  });
  const langLegend = langSegs.map((s, i) => {
    const lx = 24 + (i % 3) * 112;
    const ly = langY + 34 + Math.floor(i / 3) * 16;
    return `<rect x="${lx}" y="${ly - 7}" width="8" height="8" fill="${s.color}"/><text x="${lx + 13}" y="${ly}" font-family="${MONO}" font-size="9" fill="${PALETTE.dim}">${s.name} ${s.pct}%</text>`;
  }).join('');

  const actStat = (x, y, label, value, iconName) => cell(x, y, label, value, iconName);

  return `<svg width="${W}" height="${height}" viewBox="0 0 ${W} ${height}" xmlns="http://www.w3.org/2000/svg">
  <title>${name} — contributor dossier. XP = ${XP_FORMULA}</title>
  <defs>
    ${fontFace ? `<style>${fontFace}</style>` : ''}
    <style>
      .disp{font:700 17px ${displayFont};fill:${PALETTE.text};}
      .sub{font:500 11px ${MONO};fill:${PALETTE.dim};}
    </style>
    <clipPath id="chassis"><polygon points="${framePts}"/></clipPath>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="2.2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <radialGradient id="vig" cx="50%" cy="30%" r="80%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.09"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="reticle"><circle cx="${cx}" cy="${cy}" r="${R - 5}"/></clipPath>
  </defs>

  <g clip-path="url(#chassis)">
    <rect width="${W}" height="${height}" fill="${PALETTE.bg}"/>
    <rect width="${W}" height="${height}" fill="url(#vig)"/>
    ${scanlines}
    <rect x="0" y="-10" width="${W}" height="7" fill="${accent}" opacity="0.10">
      <animate attributeName="y" from="-10" to="${height}" dur="5.5s" repeatCount="indefinite"/>
    </rect>
  </g>

  <polygon points="${framePts}" fill="${accent}" fill-opacity="0.04"/>
  <polygon points="${framePts}" fill="none" stroke="${accent}" stroke-opacity="0.08" stroke-width="6"/>
  <polygon points="${framePts}" fill="none" stroke="${accent}" stroke-opacity="0.18" stroke-width="3.4"/>
  <polygon points="${framePts}" fill="none" stroke="${accent}" stroke-opacity="0.9" stroke-width="1.4"/>
  <polygon points="${framePts}" fill="none" stroke="${sweepCol}" stroke-width="2.2" stroke-dasharray="${seg.toFixed(1)} ${(per - seg).toFixed(1)}">
    <animate attributeName="stroke-dashoffset" from="${per.toFixed(1)}" to="0" dur="3.2s" repeatCount="indefinite"/>
  </polygon>
  <g fill="none" stroke="${bracketCol}" stroke-width="2.8" stroke-linecap="square">
    <path d="M${W - 44} 2 H${W - 2} V44"/>
    <path d="M44 ${height - 2} H2 V${height - 44}"/>
  </g>

  <!-- header readouts -->
  <g font-family="${MONO}">
    <path d="M24 10 h9 M24 10 v9" stroke="${accent}" stroke-width="1.4" opacity="0.9"/>
    <rect x="30" y="14" width="86" height="15" fill="none" stroke="${accent}" stroke-opacity="0.55"/>
    <text x="37" y="25.5" fill="${accent}" font-size="9" font-weight="700" letter-spacing="2.5">LV.${String(level).padStart(2, '0')}</text>
    <text x="332" y="25.5" text-anchor="end" fill="${hot}" font-size="9" font-weight="700" letter-spacing="2.5">${esc(tier)}</text>
    <text x="332" y="38" text-anchor="end" fill="${PALETTE.dim}" opacity="0.8" font-size="8" letter-spacing="1.5">${esc(clearance)}</text>
    <line x1="24" y1="34" x2="236" y2="34" stroke="#1a2434"/>
    ${Array.from({ length: 27 }, (_, i) => `<line x1="${24 + i * 8}" y1="34" x2="${24 + i * 8}" y2="${i % 5 === 0 ? 29 : 31.5}" stroke="${i % 5 === 0 ? accent : '#2a3549'}" stroke-width="1" opacity="${i % 5 === 0 ? 0.8 : 0.4}"/>`).join('')}
    <text x="334" y="52" text-anchor="end" fill="${PALETTE.dim}" opacity="0.5" font-size="7" letter-spacing="1.5">SIG 0x${(xp % 65536).toString(16).toUpperCase().padStart(4, '0')}</text>
  </g>

  <!-- HUD reticle + avatar -->
  <circle cx="${cx}" cy="${cy}" r="${R + 12}" fill="${accent}" fill-opacity="0.03"/>
  <circle cx="${cx}" cy="${cy}" r="${R + 12}" fill="none" stroke="#152430" stroke-width="1" stroke-dasharray="4 5"/>
  ${arcGauge(cx, cy, R + 17, 130, 280, pct, accent)}
  ${ticks.join('')}
  ${sweep}
  <circle cx="${cx}" cy="${cy}" r="${R - 5}" fill="#070d16"/>
  ${avatarUri ? `<image href="${avatarUri}" x="${cx - R + 5}" y="${cy - R + 5}" width="${2 * R - 10}" height="${2 * R - 10}" preserveAspectRatio="xMidYMid slice" clip-path="url(#reticle)"/>` : ''}
  <circle cx="${cx}" cy="${cy}" r="${R - 5}" fill="none" stroke="${accent}" stroke-width="1.6" filter="url(#glow)"/>
  <line x1="${cx - R - 16}" y1="${cy}" x2="${cx - R - 4}" y2="${cy}" stroke="${accent}" stroke-width="1.2" opacity="0.85"/>
  <line x1="${cx + R + 4}" y1="${cy}" x2="${cx + R + 16}" y2="${cy}" stroke="${accent}" stroke-width="1.2" opacity="0.85"/>
  <circle cx="${cx}" cy="${cy}" r="2" fill="${accent}"/>

  <!-- identity -->
  <text x="180" y="204" text-anchor="middle" class="disp">${name}</text>
  <text x="180" y="220" text-anchor="middle" class="sub">@${esc(user.login)}</text>
  <text x="180" y="242" text-anchor="middle" font-family="${MONO}" font-size="10" font-weight="700" letter-spacing="3" fill="${accent}" filter="url(#glow)">${esc(cls)}${topLang ? ' · ' + esc(topLang.toUpperCase()) : ''}</text>

  <!-- telemetry grid -->
  <g font-family="${MONO}">
    <text x="24" y="${telemetryY - 14}" font-size="8.5" letter-spacing="2" fill="${PALETTE.dim}" opacity="0.6">TELEMETRY</text>
    <path d="M92 ${telemetryY - 17} H336" stroke="#1a2434"/>
  </g>
  ${cell(24, telemetryY + 12, 'REPOSITORIES', (user.public_repos ?? 0).toLocaleString('en-US'), 'repo')}
  ${cell(186, telemetryY + 12, 'STARS EARNED', (totalStars ?? 0).toLocaleString('en-US'), 'star')}
  ${cell(24, telemetryY + 46, 'FORKS EARNED', (totalForks ?? 0).toLocaleString('en-US'), 'fork')}
  ${cell(186, telemetryY + 46, 'FOLLOWERS', (user.followers ?? 0).toLocaleString('en-US'), 'people')}

  <!-- language distribution -->
  ${topLangs.length ? `
  <g font-family="${MONO}">
    <text x="24" y="${langY - 14}" font-size="8.5" letter-spacing="2" fill="${PALETTE.dim}" opacity="0.6">LANG DISTRIBUTION</text>
    <path d="M148 ${langY - 17} H336" stroke="#1a2434"/>
  </g>
  <rect x="24" y="${langY}" width="${barW}" height="10" fill="#122230"/>
  ${langSegs.map((s) => `<rect x="${s.x}" y="${langY}" width="${s.w}" height="10" fill="${s.color}"/>`).join('')}
  ${langLegend}` : ''}

  <!-- activity -->
  <g font-family="${MONO}">
    <text x="24" y="${activityY - 30}" font-size="8.5" letter-spacing="2" fill="${PALETTE.dim}" opacity="0.6">ACTIVITY</text>
    <path d="M92 ${activityY - 33} H336" stroke="#1a2434"/>
  </g>
  ${actStat(24, activityY + 12, 'PULL REQUESTS', (prs ?? '—').toLocaleString('en-US'), 'pr')}
  ${actStat(186, activityY + 12, 'ISSUES', (issues ?? '—').toLocaleString('en-US'), 'issue')}
  ${actStat(24, activityY + 46, 'ACCOUNT AGE', years != null ? Math.floor(years) + 'y' : '—', 'calendar')}
  ${actStat(186, activityY + 46, 'TOP LANGUAGE', topLang ? esc(topLang).toUpperCase().slice(0, 12) : '—', 'code')}

  <!-- XP footer -->
  <g font-family="${MONO}">
    <path d="M24 ${height - 22} H336" stroke="#1a2434"/>
    <text x="24" y="${height - 8}" font-size="9" letter-spacing="2" fill="${PALETTE.dim}">XP</text>
    <text x="52" y="${height - 8}" font-size="11" font-weight="700" fill="${accent}" filter="url(#glow)">${(xp ?? 0).toLocaleString('en-US')}</text>
    <text x="336" y="${height - 8}" text-anchor="end" font-size="8" fill="${PALETTE.dim}" opacity="0.7">LVL PROGRESS ${Math.round(pct * 100)}%</text>
  </g>
</svg>`;
}

module.exports = renderCyberpunk;
