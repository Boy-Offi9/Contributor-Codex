const { esc, truncate, colorForLang, icon, avatarShape } = require('../shared');

const LANG_ALIASES = { JavaScript: 'JS', TypeScript: 'TS', 'Jupyter Notebook': 'Jupyter', 'Objective-C': 'ObjC', 'Visual Basic': 'VB', Dockerfile: 'Docker', PowerShell: 'PShell', 'Vim Script': 'Vim' };
const shortLang = (name) => LANG_ALIASES[name] || truncate(name, 7);


function renderGlass({ user, avatarUri, shape, topLang, totalStars, langStats, color }) {
  const name = esc(truncate(user.name || user.login, 18));
  const joined = new Date(user.created_at).getFullYear();

  const segs = (langStats || []).slice(0, 4).map((l) => ({ name: l.name, pct: l.pct, color: colorForLang(l.name, color) }));
  const shown = segs.reduce((sum, l) => sum + l.pct, 0);
  if (segs.length && shown < 100) segs.push({ name: 'Other', pct: 100 - shown, color: '#c4cbdb' });
  const segTotal = segs.reduce((sum, l) => sum + l.pct, 0) || 1;
  const hasLangs = segs.length > 0;

  const tilesY = 132;
  const langLabelY = tilesY + 82;
  const donutCy = langLabelY + 48;
  const dividerY = hasLangs ? donutCy + 66 : tilesY + 60 + 30;
  const chipsY = dividerY - 12;
  const height = dividerY + 12 + 18 + 16;

  const R = 30;
  const C = 2 * Math.PI * R;
  let acc = 0;
  const arcs = segs.map((seg) => {
    const len = (seg.pct / segTotal) * C;
    const gap = segs.length > 1 ? Math.min(2.5, len * 0.4) : 0;
    const dash = Math.max(0, len - gap);
    const out = `<circle cx="70" cy="${donutCy}" r="${R}" fill="none" stroke="${seg.color}" stroke-width="11" stroke-dasharray="${dash.toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}" transform="rotate(-90 70 ${donutCy})"/>`;
    acc += len;
    return out;
  }).join('');

  const tile = (x, label, value, ic) => `
    <g transform="translate(${x},${tilesY})">
      <rect width="94" height="60" rx="4" fill="#ffffff" opacity="0.7" stroke="#1c2333" stroke-opacity="0.12"/>
      ${icon(ic, 41, 9, color)}
      <text x="47" y="31" text-anchor="middle" class="lbl">${label}</text>
      <text x="47" y="51" text-anchor="middle" class="t1">${value}</text>
    </g>`;

  return `<svg width="360" height="${height}" viewBox="0 0 360 ${height}" xmlns="http://www.w3.org/2000/svg">
    <title>${name} — Contributor Card (glass theme)</title>
    <defs>
      <style>
        .t1{font:700 16px system-ui,sans-serif;fill:#1c2333;}
        .t2{font:500 11px system-ui,sans-serif;fill:#6b7488;}
        .lbl{font:500 9.5px 'JetBrains Mono',ui-monospace,monospace;fill:#5b6478;letter-spacing:1.1px;}
        .cls{font:600 11px system-ui,sans-serif;fill:${color};}
        .foot{font:500 10px 'JetBrains Mono',ui-monospace,monospace;fill:#6b7488;}
        .sec{font:600 9.5px 'JetBrains Mono',ui-monospace,monospace;fill:#5b6478;letter-spacing:1.6px;}
        .lg{font:500 11px system-ui,sans-serif;fill:#1c2333;}
        .lgp{font:600 11px system-ui,sans-serif;fill:#6b7488;}
        .big{font:700 15px system-ui,sans-serif;fill:#1c2333;}
        .small{font:500 9px system-ui,sans-serif;fill:#8891a3;}
      </style>
      <linearGradient id="glassBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#eef1f8"/>
        <stop offset="100%" stop-color="#dde3f0"/>
      </linearGradient>
      <linearGradient id="glassShine" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
        <stop offset="18%" stop-color="#ffffff" stop-opacity="0.9"/>
        <stop offset="82%" stop-color="#ffffff" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
      <filter id="soft"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-opacity="0.12"/></filter>
      <filter id="blob" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="26"/></filter>
      <filter id="avatarGlow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="6"/></filter>
    </defs>

    <polygon points="18,0 360,0 360,${height - 18} 342,${height} 0,${height} 0,18" fill="url(#glassBg)"/>
    <circle cx="30" cy="20" r="70" fill="${color}" opacity="0.22" filter="url(#blob)"/>
    <circle cx="345" cy="60" r="60" fill="#ff2d6f" opacity="0.16" filter="url(#blob)"/>
    <circle cx="330" cy="${height - 30}" r="65" fill="${color}" opacity="0.14" filter="url(#blob)"/>

    <polygon points="32,16 344,16 344,${height - 34} 326,${height - 16} 16,${height - 16} 16,32" fill="#ffffff" opacity="0.55" filter="url(#soft)"/>
    <polygon points="32,16 344,16 344,${height - 34} 326,${height - 16} 16,${height - 16} 16,32" fill="none" stroke="#1c2333" stroke-opacity="0.1" stroke-width="4"/>
    <polygon points="32,16 344,16 344,${height - 34} 326,${height - 16} 16,${height - 16} 16,32" fill="none" stroke="#1c2333" stroke-opacity="0.35" stroke-width="1.2"/>
    <g fill="none" stroke="#1c2333" stroke-width="2.2" stroke-linecap="square" opacity="0.65">
      <path d="M312 17 H343 V48"/>
      <path d="M48 ${height - 17} H17 V${height - 48}"/>
    </g>
    ${Array.from({ length: Math.ceil(height / 7) }, (_, i) => `<line x1="24" y1="${i * 7}" x2="336" y2="${i * 7}" stroke="#1c2333" stroke-width="1" opacity="0.035"/>`).join('')}
    <rect x="40" y="16" width="264" height="1.5" rx="0.75" fill="url(#glassShine)"/>

    <g transform="translate(32,32)">
      <circle cx="36" cy="36" r="38" fill="${color}" opacity="0.35" filter="url(#avatarGlow)"/>
      ${avatarShape({ id: 'avatar', shape, size: 72, uri: avatarUri, ring: color, bg: '#dde3f0', ringWidth: 2 })}
    </g>

    <text x="120" y="50" class="t1">${name}</text>
    <g transform="translate(322,42)">
      <circle r="9" fill="${color}"/>
      <path d="M-4 0l3 3.2L4.2 -3.4" stroke="#ffffff" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <text x="120" y="68" class="t2">@${esc(user.login)}</text>
    ${topLang ? `<rect x="120" y="82" width="${18 + esc(topLang).length * 6.5}" height="20" rx="4" fill="${color}" opacity="0.12"/><text x="${130 + esc(topLang).length * 3.25}" y="96" text-anchor="middle" class="cls">${esc(topLang)}</text>` : ''}

    ${tile(32, 'REPOS', user.public_repos || 0, 'repo')}
    ${tile(133, 'STARS', totalStars, 'star')}
    ${tile(234, 'FOLLOWERS', user.followers || 0, 'people')}

    ${hasLangs ? `
    <text x="32" y="${langLabelY}" class="sec">LANGUAGES</text>
    <circle cx="70" cy="${donutCy}" r="${R}" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="11"/>
    ${arcs}
    <text x="70" y="${donutCy + 3}" text-anchor="middle" class="big">${segs[0].pct}%</text>
    <text x="70" y="${donutCy + 14}" text-anchor="middle" class="small">${esc(shortLang(segs[0].name))}</text>
    ${segs.map((seg, i) => `
      <circle cx="132" cy="${donutCy - 28 + i * 19}" r="4" fill="${seg.color}"/>
      <text x="144" y="${donutCy - 24 + i * 19}" class="lg">${esc(truncate(seg.name, 16))}</text>
      <text x="312" y="${donutCy - 24 + i * 19}" text-anchor="end" class="lgp">${seg.pct}%</text>`).join('')}` : ''}

    ${(() => {
      const chips = [{ ic: 'calendar', text: `Joined ${joined}` }];
      const extra = user.location || (user.company ? user.company.replace(/^@/, '') : null);
      if (extra) chips.push({ ic: user.location ? 'pin' : 'building', text: esc(truncate(extra, 16)) });
      const gap = 8;
      const widths = chips.map((c) => 30 + c.text.length * 6.1);
      const total = widths.reduce((a, b) => a + b, 0) + gap * (chips.length - 1);
      const left = 180 - total / 2;
      const right = left + total;
      let cx = left;
      const chipMarkup = chips.map((c, i) => {
        const g = `<g transform="translate(${cx.toFixed(1)},${chipsY})">
          <rect width="${widths[i].toFixed(1)}" height="24" rx="4" fill="#ffffff" opacity="0.6" stroke="#1c2333" stroke-opacity="0.1"/>
          ${icon(c.ic, 9, 6, '#8891a3')}
          <text x="26" y="16" class="foot">${c.text}</text>
        </g>`;
        cx += widths[i] + gap;
        return g;
      }).join('');
      const diamond = (x) => `<path d="M${x} ${dividerY - 3.5}l3.5 3.5-3.5 3.5-3.5-3.5Z" fill="${color}" opacity="0.5"/>`;
      return `<line x1="32" y1="${dividerY}" x2="${(left - 18).toFixed(1)}" y2="${dividerY}" stroke="#c9d0e0" opacity="0.6"/>
    ${diamond((left - 11).toFixed(1))}
    ${chipMarkup}
    ${diamond((right + 11).toFixed(1))}
    <line x1="${(right + 18).toFixed(1)}" y1="${dividerY}" x2="328" y2="${dividerY}" stroke="#c9d0e0" opacity="0.6"/>`;
    })()}
  </svg>`;
}


module.exports = renderGlass;
