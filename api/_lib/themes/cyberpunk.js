const { esc, colorForLang, icon, avatarShape, truncate, MONO, classFor, clearanceFor, XP_FORMULA } = require('../shared');

function statBar(y, label, value, max, color, iconName) {
  const pct = Math.max(4, Math.min(100, Math.round((value / max) * 100)));
  return `
    ${iconName ? icon(iconName, 28, y - 10, color) : ''}
    <text x="${iconName ? 46 : 28}" y="${y}" class="lbl">${label}</text>
    <text x="332" y="${y}" text-anchor="end" class="lbl" filter="url(#glow)">${value}</text>
    <rect x="28" y="${y + 6}" width="304" height="4" fill="#1b2233"/>
    <rect x="28" y="${y + 6}" width="${(304 * pct) / 100}" height="4" fill="${color}" filter="url(#glow)"/>
    <rect x="28" y="${y + 6}" width="${(304 * pct) / 100}" height="1" fill="#ffffff" opacity="0.3"/>`;
}


function renderCyberpunk({ user, avatarUri, shape, topLang, level, xp, totalStars, tier, color, fontFace }) {
  const name = esc(truncate(user.name || user.login, 22));
  const classLabel = `${classFor(topLang)}${topLang ? ' · ' + topLang : ''}`;
  const displayFont = fontFace ? "'Chakra Petch',system-ui,sans-serif" : 'system-ui,sans-serif';
  const shimmer = tier === 'LEGENDARY' ? `
    <rect x="-400" y="0" width="200" height="360" fill="#ffffff" opacity="0.08" transform="rotate(20)">
      <animateTransform attributeName="transform" type="translate" from="-400 0" to="760 0" dur="2.4s" repeatCount="indefinite"/>
    </rect>` : '';

  return `<svg width="360" height="360" viewBox="0 0 360 360" xmlns="http://www.w3.org/2000/svg">
    <title>${name} — Contributor Card. XP = ${XP_FORMULA}</title>
    <defs>
      ${fontFace ? `<style>${fontFace}</style>` : ''}
      <style>
        .t1{font:700 16px ${displayFont};fill:#e8edf5;}
        .t2{font:500 11px ${MONO};fill:#7a8399;}
        .lbl{font:500 10px ${MONO};fill:#7a8399;letter-spacing:1px;}
        .tag{font:700 11px ${MONO};}
        .cls{font:600 11px ${displayFont};fill:${color};letter-spacing:1px;}
      </style>
      <clipPath id="cardClip"><polygon points="0,14 14,0 360,0 360,346 346,360 0,360"/></clipPath>
      <radialGradient id="bg" cx="15%" cy="0%" r="85%">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="bg2" cx="95%" cy="100%" r="70%">
        <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.10"/>
        <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
      </radialGradient>
      <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
        <path d="M24 0H0V24" fill="none" stroke="${color}" stroke-width="0.5" opacity="0.5"/>
      </pattern>
      <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="2.4" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <g clip-path="url(#cardClip)">
      <rect width="360" height="360" fill="#05070c"/>
      <rect width="360" height="360" fill="url(#grid)" opacity="0.05"/>
      <rect width="360" height="360" fill="url(#bg)"/>
      <rect width="360" height="360" fill="url(#bg2)"/>
      ${shimmer}
    </g>
    <polygon points="0,14 14,0 360,0 360,346 346,360 0,360" fill="none" stroke="#1b2233"/>
    <polygon points="0,14 14,0 360,0 360,346 346,360 0,360" fill="none" stroke="${color}" opacity="0.5">
      <animate attributeName="opacity" values="0.4;0.85;0.4" dur="3s" repeatCount="indefinite"/>
    </polygon>

    <rect x="20" y="20" width="58" height="20" fill="${color}" filter="url(#glow)"/>
    <text x="49" y="34" text-anchor="middle" class="tag" fill="#05070c">LV ${level}</text>
    <rect x="270" y="20" width="70" height="20" fill="none" stroke="${color}"/>
    <text x="305" y="34" text-anchor="middle" class="tag" fill="${color}">${tier}</text>

    <g transform="translate(144,54)">
      ${avatarShape({ id: 'avatar', shape, size: 72, uri: avatarUri, ring: color, bg: '#1b2233', glow: true })}
    </g>

    <text x="180" y="156" text-anchor="middle" class="t1">${name}</text>
    <text x="180" y="174" text-anchor="middle" class="t2">@${esc(user.login)}</text>
    <text x="180" y="194" text-anchor="middle" class="cls">${esc(classLabel.toUpperCase())}</text>

    ${statBar(224, 'REPOS', user.public_repos || 0, 60, color, 'repo')}
    ${statBar(254, 'STARS', totalStars, 200, color, 'star')}
    ${statBar(284, 'FOLLOWERS', user.followers || 0, 200, color, 'people')}

    <line x1="28" y1="312" x2="332" y2="312" stroke="#1b2233" stroke-dasharray="3,3"/>
    ${icon('bolt', 28, 326, color)}
    <text x="46" y="336" class="lbl">XP<title>${XP_FORMULA}</title></text>
    <text x="332" y="336" text-anchor="end" class="t1" filter="url(#glow)">${xp.toLocaleString()}</text>
  </svg>`;
}


module.exports = renderCyberpunk;
