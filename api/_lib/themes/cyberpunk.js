const { esc, MONO, classFor, clearanceFor, XP_FORMULA, icon , truncate } = require('../shared');

// Design language ported from the SciFi UI kit (boy-offi9-inc/scifi-ui-kit):
// HudFramePainter (chamfered panel, triple-stroke glow, scanlines, corner
// brackets, traveling border light), Radar.kt (sweep trail, ticks, dashed
// rings), SciFiPalette (accent 00E5FF / secondary FF2D6F / dim 7FB8C4).

const PALETTE = { accent: '#00E5FF', secondary: '#FF2D6F', dim: '#7FB8C4', bg: '#05080C', text: '#E8FDFF' };
const CHAMFER = 18;

function mixHex(a, b, f) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * f).toString(16).padStart(2, '0')).join('');
}

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
      `<path d="M${(cx + r * Math.cos(a0)).toFixed(1)} ${(cy + r * Math.sin(a0)).toFixed(1)} A${r} ${r} 0 0 1 ${(cx + rf * Math.cos(a1)).toFixed(1)} ${(cy + rf * Math.sin(a1)).toFixed(1)}" fill="none" stroke="${i < lit ? color : '#14202c'}" stroke-width="${i < lit ? 3.5 : 2.5}" stroke-linecap="butt"${i < lit ? ' filter="url(#glow)"' : ''}/>`
    );
  }
  return segs.join('');
}

function polar(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
}

function renderCyberpunk({ user, avatarUri, shape, topLang, level, xp, totalStars, tier, color, fontFace }) {
  const name = esc(truncate(user.name || user.login, 22));
  const cls = classFor(topLang);
  const clearance = clearanceFor(tier);
  const displayFont = fontFace ? "'Chakra Petch',system-ui,sans-serif" : 'system-ui,sans-serif';
  const accent = color || PALETTE.accent;
  const hot = mixHex(accent, PALETTE.secondary, 0.65); // kit secondary, tinted by the accent
  const bracketCol = mixHex(accent, '#ffffff', 0.55);
  const sweepCol = mixHex(accent, '#ffffff', 0.8);
  const cx = 180, cy = 126, R = 52;

  const pct = Math.max(0.04, Math.min(1, (xp % 1000) / 1000));

  // Radar sweep with a degree-based fading trail (Radar.kt trailDeg=95)
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

  // 48 reticle ticks (Radar.kt ticks=48), cardinals brighter
  const ticks = [];
  for (let d = 0; d < 360; d += 360 / 48) {
    const major = d % 90 === 0;
    ticks.push(`<line x1="${polar(cx, cy, R + (major ? 0 : 2), d).split(',')[0]}" y1="${polar(cx, cy, R + (major ? 0 : 2), d).split(',')[1]}" x2="${polar(cx, cy, R + (major ? 9 : 6), d).split(',')[0]}" y2="${polar(cx, cy, R + (major ? 9 : 6), d).split(',')[1]}" stroke="${accent}" stroke-width="${major ? 1.4 : 0.7}" opacity="${major ? 0.9 : 0.45}"/>`);
  }

  // Kit brackets: long, top-right + bottom-left only
  const framePts = `${CHAMFER},0 360,0 360,${360 - CHAMFER} ${360 - CHAMFER},360 0,360 0,${CHAMFER}`;
  // Perimeter of the chamfered frame (for the traveling light segment)
  const ch2 = CHAMFER * (2 - Math.SQRT2);
  const per = 2 * (360 + 360) - 2 * (2 * CHAMFER) + 2 * CHAMFER * Math.SQRT2;
  const seg = (per * 0.14).toFixed(1);
  const gap = (per - seg).toFixed(1);

  // Static scanlines every 6px at 10% alpha (HudFramePainter), plus a roaming band
  const scanlines = Array.from({ length: 58 }, (_, i) => `<line x1="${CHAMFER - 4}" y1="${i * 6}" x2="${360 - CHAMFER + 4}" y2="${i * 6}" stroke="${accent}" stroke-width="1" opacity="0.07"/>`).join('');
  const scanBand = `
    <rect x="0" y="-10" width="360" height="7" fill="${accent}" opacity="0.10">
      <animate attributeName="y" from="-10" to="360" dur="5.5s" repeatCount="indefinite"/>
    </rect>`;

  const stat = (y, label, value, iconName, isSecondary) => `
    <g>
      ${icon(iconName, 26, y - 9, isSecondary ? hot : accent, 1)}
      <text x="44" y="${y}" font-family="${MONO}" font-size="9" letter-spacing="2" fill="${PALETTE.dim}" opacity="0.85">${label}</text>
      <text x="334" y="${y}" text-anchor="end" font-family="${MONO}" font-size="12" font-weight="700" fill="${PALETTE.text}">${value}</text>
      <path d="M26 ${y + 6} H334" stroke="#122230" stroke-width="1"/>
      <path d="M26 ${y + 6} h10" stroke="${isSecondary ? hot : accent}" stroke-width="2" filter="url(#glow)"/>
    </g>`;

  return `<svg width="360" height="360" viewBox="0 0 360 360" xmlns="http://www.w3.org/2000/svg">
  <title>${name} — contributor card. XP = ${XP_FORMULA}</title>
  <defs>
    ${fontFace ? `<style>${fontFace}</style>` : ''}
    <style>
      .disp{font:700 17px ${displayFont};fill:${PALETTE.text};}
      .sub{font:500 11px ${MONO};fill:${PALETTE.dim};}
      .tag{font:700 9px ${MONO};letter-spacing:2.5px;}
    </style>
    <clipPath id="chassis"><polygon points="${framePts}"/></clipPath>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="2.2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <radialGradient id="vig" cx="50%" cy="40%" r="80%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.09"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="reticle"><circle cx="${cx}" cy="${cy}" r="${R - 5}"/></clipPath>
  </defs>

  <g clip-path="url(#chassis)">
    <rect width="360" height="360" fill="${PALETTE.bg}"/>
    <rect width="360" height="360" fill="url(#vig)"/>
    ${scanlines}
    ${scanBand}
  </g>

  <!-- chamfered panel: kit triple-stroke glow (wide faint to narrow bright) -->
  <polygon points="${framePts}" fill="${accent}" fill-opacity="0.04"/>
  <polygon points="${framePts}" fill="none" stroke="${accent}" stroke-opacity="0.08" stroke-width="6"/>
  <polygon points="${framePts}" fill="none" stroke="${accent}" stroke-opacity="0.18" stroke-width="3.4"/>
  <polygon points="${framePts}" fill="none" stroke="${accent}" stroke-opacity="0.9" stroke-width="1.4"/>
  <!-- traveling border light, 14% of perimeter, 3.2s period (HudFramePainter sweep) -->
  <polygon points="${framePts}" fill="none" stroke="${sweepCol}" stroke-width="2.2" stroke-dasharray="${seg} ${gap}">
    <animate attributeName="stroke-dashoffset" from="${per.toFixed(1)}" to="0" dur="3.2s" repeatCount="indefinite"/>
  </polygon>
  <!-- kit corner brackets: top-right + bottom-left only -->
  <g fill="none" stroke="${bracketCol}" stroke-width="2.8" stroke-linecap="square">
    <path d="M${360 - 44} 2 H358 V${2 + 44}"/>
    <path d="M44 358 H2 V${358 - 44}"/>
  </g>

  <!-- header readouts -->
  <g font-family="${MONO}" class="tag">
    <path d="M24 10 h9 M24 10 v9" stroke="${accent}" stroke-width="1.4" opacity="0.9"/>
    <rect x="30" y="14" width="86" height="15" fill="none" stroke="${accent}" stroke-opacity="0.55"/>
    <text x="37" y="25.5" fill="${accent}" font-size="9" letter-spacing="2.5">LV.${String(level).padStart(2, '0')}</text>
    <text x="332" y="25.5" text-anchor="end" fill="${hot}" font-size="9" letter-spacing="2.5">${esc(tier)}</text>
    <text x="332" y="38" text-anchor="end" fill="${PALETTE.dim}" opacity="0.8" font-size="8" letter-spacing="1.5">${esc(clearance)}</text>
    <text x="334" y="53" text-anchor="end" fill="${PALETTE.dim}" opacity="0.5" font-size="7" letter-spacing="1.5">SIG 0x${(xp % 65536).toString(16).toUpperCase().padStart(4, '0')}</text>
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

  <!-- identity block -->
  <text x="180" y="220" text-anchor="middle" class="disp">${name}</text>
  <text x="180" y="236" text-anchor="middle" class="sub">@${esc(user.login)}</text>
  <g font-family="${MONO}">
    <path d="M118 250 l-6 6 6 6 M242 250 l6 6 -6 6" fill="none" stroke="${accent}" stroke-width="1" opacity="0.6"/>
    <text x="180" y="260" text-anchor="middle" font-size="10" font-weight="700" letter-spacing="3" fill="${accent}" filter="url(#glow)">${esc(cls)}${topLang ? ' · ' + esc(topLang.toUpperCase()) : ''}</text>
  </g>

  <!-- telemetry rows -->
  ${stat(286, 'REPOSITORIES', user.public_repos ?? '—', 'repo')}
  ${stat(307, 'STARS EARNED', totalStars ?? '—', 'star')}
  ${stat(328, 'FOLLOWERS', user.followers ?? '—', 'people')}

  <!-- XP footer -->
  <g font-family="${MONO}">
    <text x="240" y="352" text-anchor="start" font-size="9" letter-spacing="2" fill="${PALETTE.dim}">XP</text>
    <text x="262" y="352" text-anchor="start" font-size="11" font-weight="700" fill="${accent}" filter="url(#glow)">${(xp ?? 0).toLocaleString('en-US')}</text>
    <text x="334" y="352" text-anchor="end" font-size="8" fill="${PALETTE.dim}" opacity="0.7">${Math.round(pct * 100)}%</text>
  </g>
</svg>`;
}

module.exports = renderCyberpunk;
