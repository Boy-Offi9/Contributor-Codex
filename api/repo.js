const { isRateLimited } = require('./_lib/ratelimit');
const errors = require('./_lib/errors');
const { esc, CHAKRA_PETCH_FONT_FACE, sanitizeColor, MONO, readableAccent, svgReply } = require('./_lib/svg');
const { ghFetch, isGhName, isGhRepo } = require('./_lib/github');

const errorSVG = (message) => errors.errorSVG({ width: 420, title: 'CARD ERROR', message, messageFont: MONO, messageSize: 11, messageFill: '#7fb8c4' });

function wrapText(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) {
      lines.push(current.trim());
      current = word;
    } else {
      current += ' ' + word;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines.slice(0, 2);
}

function licenseOf(repo) {
  return repo.license?.spdx_id && repo.license.spdx_id !== 'NOASSERTION' ? repo.license.spdx_id : null;
}

async function contributorCount(owner, repoName, token) {
  try {
    const headers = { Accept: 'application/vnd.github+json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contributors?per_page=1&anon=true`, { headers });
    if (!res.ok) return null;
    const link = res.headers.get('link');
    if (link) {
      const match = link.match(/[?&]page=(\d+)>;\s*rel="last"/);
      if (match) return parseInt(match[1], 10);
    }
    const body = await res.json();
    return Array.isArray(body) ? body.length : null;
  } catch {
    return null;
  }
}

async function latestReleaseTag(owner, repoName, token) {
  try {
    const headers = { Accept: 'application/vnd.github+json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}/releases/latest`, { headers });
    if (!res.ok) return null; // 404 means no releases published — not an error
    const data = await res.json();
    return data.tag_name || null;
  } catch {
    return null;
  }
}

// cyberpunk (sci-fi HUD language (chamfered panel, triple-stroke glow,
// scanlines, corner brackets, traveling border light) applied to repo cards

// Kit HUD chip: chamfered bottom-right corner, optional accent marker tick.
// variant: 'solid' (accent fill, dark text) | 'line' (hairline stroke, dim text)
function hudChip(x, y, w, h, label, variant, color, extraFill) {
  const c = 6; // corner cut
  const pts = `M${x + c} ${y} H${x + w} V${y + h - c} L${x + w - c} ${y + h} H${x} Z`;
  const isSolid = variant === 'solid';
  const body = isSolid
    ? `<path d="${pts}" fill="${color}" fill-opacity="0.92"/>`
    : `<path d="${pts}" fill="${color}" fill-opacity="${extraFill || 0.07}"/>
       <path d="${pts}" fill="none" stroke="${color}" stroke-opacity="0.65" stroke-width="1"/>`;
  const textFill = isSolid ? '#04070d' : '#7fb8c4';
  const tick = isSolid ? '' : `<path d="M${x} ${y} h4" stroke="${color}" stroke-width="2.4" opacity="0.9"/>`;
  return `${body}${tick}
    <text x="${x + 8}" y="${y + h / 2 + 3.5}" font-family="'JetBrains Mono',ui-monospace,monospace" font-size="10" font-weight="600" fill="${textFill}" letter-spacing="0.5">${label}</text>`;
}

function renderCyberpunk({ repo, color, fontFace }) {
  const displayFont = fontFace ? "'Chakra Petch',system-ui,sans-serif" : 'system-ui,sans-serif';
  const descLines = repo.description ? wrapText(esc(repo.description), 58) : [];
  const license = licenseOf(repo);
  const CH = 14, W = 420, H = 200;
  const framePts = `${CH},0 ${W},0 ${W},${H - CH} ${W - CH},${H} 0,${H} 0,${CH}`;
  const bracketCol = mix(color, '#ffffff', 0.55);
  const sweepCol = mix(color, '#ffffff', 0.8);
  const per = 2 * (W + H) - 2 * (2 * CH) + 2 * CH * Math.SQRT2;
  const seg = per * 0.14;
  const scanlines = Array.from({ length: 32 }, (_, i) => `<line x1="${CH - 4}" y1="${i * 6}" x2="${W - CH + 4}" y2="${i * 6}" stroke="${color}" stroke-width="1" opacity="0.07"/>`).join('');

  const stat = (x, label, value) => `
    <text x="${x}" y="96" font-family="${MONO}" font-size="9" letter-spacing="2" fill="#7fb8c4" opacity="0.85">${label}</text>
    <text x="${x}" y="120" font-family="${displayFont}" font-size="19" font-weight="700" fill="${color}" filter="url(#rglow)">${Number(value ?? 0).toLocaleString('en-US')}</text>`;

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <title>${esc(repo.full_name)} — Repository Card</title>
  <defs>
    ${fontFace ? `<style>${fontFace}</style>` : ''}
    <clipPath id="rh"><polygon points="${framePts}"/></clipPath>
    <filter id="rglow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <radialGradient id="rvig" cx="20%" cy="0%" r="90%">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.10"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <g clip-path="url(#rh)">
    <rect width="${W}" height="${H}" fill="#05080c"/>
    <rect width="${W}" height="${H}" fill="url(#rvig)"/>
    ${scanlines}
    <rect x="0" y="-8" width="${W}" height="5" fill="${color}" opacity="0.10">
      <animate attributeName="y" from="-8" to="${H}" dur="5.5s" repeatCount="indefinite"/>
    </rect>
  </g>
  <polygon points="${framePts}" fill="${color}" fill-opacity="0.04"/>
  <polygon points="${framePts}" fill="none" stroke="${color}" stroke-opacity="0.08" stroke-width="6"/>
  <polygon points="${framePts}" fill="none" stroke="${color}" stroke-opacity="0.18" stroke-width="3.2"/>
  <polygon points="${framePts}" fill="none" stroke="${color}" stroke-opacity="0.9" stroke-width="1.3"/>
  <polygon points="${framePts}" fill="none" stroke="${sweepCol}" stroke-width="2" stroke-dasharray="${seg.toFixed(1)} ${(per - seg).toFixed(1)}">
    <animate attributeName="stroke-dashoffset" from="${per.toFixed(1)}" to="0" dur="3.2s" repeatCount="indefinite"/>
  </polygon>
  <g fill="none" stroke="${bracketCol}" stroke-width="2.6" stroke-linecap="square">
    <path d="M${W - 36} 2 H${W - 2} V36"/>
    <path d="M36 ${H - 2} H2 V${H - 36}"/>
  </g>
  <!-- HUD readout: repo ident -->
  <path d="M24 18 h9 M24 18 v9" stroke="${color}" stroke-width="1.3" opacity="0.9"/>
  <text x="42" y="30" font-family="${MONO}" font-size="8" letter-spacing="2" fill="#7fb8c4" opacity="0.8">REPO // ${esc(repo.owner.login)}</text>
  <text x="24" y="62" font-family="${displayFont}" font-size="20" font-weight="700" fill="#e8fdff">${esc(repo.name)}</text>
  ${descLines.map((line, i) => `<text x="24" y="${146 + i * 16}" font-family="system-ui,sans-serif" font-size="12" fill="#9db4c0">${line}</text>`).join('')}
  ${stat(24, 'STARS', repo.stargazers_count)}
  ${stat(140, 'FORKS', repo.forks_count)}
  ${stat(256, 'ISSUES', repo.open_issues_count)}
  ${stat(364, 'WATCH', repo.subscribers_count ?? repo.watchers_count)}
  ${repo.language ? hudChip(24, 172, 20 + repo.language.length * 7, 18, esc(repo.language), 'solid', color) : ''}
  ${license ? hudChip(repo.language ? 52 + repo.language.length * 7 : 24, 172, 20 + license.length * 7, 18, esc(license), 'line', color) : ''}
</svg>`;
}

function mix(a, b, f) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * f).toString(16).padStart(2, '0')).join('');
}


function renderTerminal({ repo }) {
  const green = '#3ddc6a';
  const license = licenseOf(repo);
  const rows = [
    `repo     ${esc(repo.full_name)}`,
    `lang     ${repo.language || 'n/a'}`,
    `license  ${license || 'none'}`,
    `stars    ${repo.stargazers_count}`,
    `forks    ${repo.forks_count}`,
    `issues   ${repo.open_issues_count}`,
  ];
  return `<svg width="420" height="220" viewBox="0 0 420 220" xmlns="http://www.w3.org/2000/svg">
    <title>${esc(repo.full_name)} — Repository Card (terminal theme)</title>
    <defs><style>.term{font:400 13px ${MONO};fill:${green};}.head{font:700 13px ${MONO};fill:${green};}</style></defs>
    <rect width="420" height="220" fill="#020402"/>
    <g opacity="0.14">${Array.from({ length: 37 }, (_, i) => `<line x1="0" y1="${i * 6}" x2="420" y2="${i * 6}" stroke="${green}" stroke-width="1"/>`).join('')}</g>
    <rect x="0" y="-8" width="420" height="5" fill="${green}" opacity="0.10">
      <animate attributeName="y" from="-8" to="220" dur="6s" repeatCount="indefinite"/>
    </rect>
    <rect width="420" height="220" fill="none" stroke="${green}" stroke-opacity="0.14" stroke-width="4"/>
    <rect width="420" height="220" fill="none" stroke="${green}" stroke-opacity="0.7" stroke-width="1"/>
    <g fill="none" stroke="${green}" stroke-width="2" stroke-linecap="square" opacity="0.8">
      <path d="M384 2 H418 V36"/>
      <path d="M36 218 H2 V184"/>
    </g>
    <text x="16" y="30" class="head">$ git remote show origin</text>
    ${rows.map((line, i) => `<text x="16" y="${58 + i * 20}" class="term">${esc(line)}</text>`).join('')}
  </svg>`;
}


// Glass chip: frosted body, chamfered top-left corner, accent marker dot.
function glassChip(x, y, w, h, label, inkColor, color) {
  const c = 6;
  const pts = `M${x} ${y + c} V${y} H${x + w} V${y + h} H${x} Z`;
  return `<path d="${pts}" fill="#ffffff" fill-opacity="0.6" stroke="#1c2333" stroke-opacity="0.15"/>
    <circle cx="${x + 8}" cy="${y + h / 2}" r="2.2" fill="${color}"/>
    <text x="${x + 15}" y="${y + h / 2 + 3.5}" font-family="'JetBrains Mono',ui-monospace,monospace" font-size="10" font-weight="600" fill="${inkColor}" letter-spacing="0.5">${label}</text>`;
}

function renderGlass({ repo, color }) {
  const descLines = repo.description ? wrapText(esc(repo.description), 60) : [];
  const license = licenseOf(repo);
  return `<svg width="420" height="200" viewBox="0 0 420 200" xmlns="http://www.w3.org/2000/svg">
    <title>${esc(repo.full_name)} — Repository Card (glass theme)</title>
    <defs>
      <style>
        .name{font:700 17px system-ui,sans-serif;fill:#1c2333;}
        .desc{font:400 12px system-ui,sans-serif;fill:#5b6478;}
        .lbl{font:500 9px 'JetBrains Mono',ui-monospace,monospace;fill:#5b6478;letter-spacing:1.2px;}
        .statVal{font:700 18px system-ui,sans-serif;}
        .chip{font:600 10px 'JetBrains Mono',ui-monospace,monospace;fill:#1c2333;}
      </style>
      <linearGradient id="glassBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#eef1f8"/><stop offset="100%" stop-color="#dde3f0"/>
      </linearGradient>
    </defs>
    <polygon points="16,0 420,0 420,184 404,200 0,200 0,16" fill="url(#glassBg)"/>
    <polygon points="16,0 420,0 420,184 404,200 0,200 0,16" fill="none" stroke="#1c2333" stroke-opacity="0.1" stroke-width="4"/>
    <polygon points="16,0 420,0 420,184 404,200 0,200 0,16" fill="none" stroke="#1c2333" stroke-opacity="0.35" stroke-width="1.2"/>
    <g fill="none" stroke="#1c2333" stroke-width="2.2" stroke-linecap="square" opacity="0.65">
      <path d="M388 1 H419 V32"/>
      <path d="M32 199 H1 V168"/>
    </g>
    ${Array.from({ length: 29 }, (_, i) => `<line x1="8" y1="${i * 7}" x2="412" y2="${i * 7}" stroke="#1c2333" stroke-width="1" opacity="0.035"/>`).join('')}
    <text x="24" y="36" class="name">${esc(repo.name)}</text>
    <text x="24" y="52" class="desc">${esc(repo.owner.login)}</text>
    ${descLines.map((line, i) => `<text x="24" y="${118 + i * 16}" class="desc">${line}</text>`).join('')}
    <text x="24" y="70" class="lbl">STARS</text><text x="24" y="94" class="statVal" fill="${color}">${repo.stargazers_count}</text>
    <text x="140" y="70" class="lbl">FORKS</text><text x="140" y="94" class="statVal" fill="${color}">${repo.forks_count}</text>
    <text x="256" y="70" class="lbl">ISSUES</text><text x="256" y="94" class="statVal" fill="${color}">${repo.open_issues_count}</text>
    ${repo.language ? glassChip(24, 164, 22 + repo.language.length * 7, 20, esc(repo.language), '#1c2333', color) : ''}
    ${license ? glassChip(repo.language ? 54 + repo.language.length * 7 : 24, 164, 22 + license.length * 7, 20, esc(license), '#5b6478', color) : ''}
  </svg>`;
}

function formatSize(kb) {
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

function formatDate(iso) {
  return new Date(iso).toISOString().slice(0, 10);
}

function renderDetailed({ repo, color, fontFace, contributors, releaseTag, skinName = 'classic' }) {
  const S = Object.prototype.hasOwnProperty.call(REPO_SKINS, skinName) ? REPO_SKINS[skinName] : REPO_SKINS.classic;
  const displayFont = fontFace ? "'Chakra Petch',system-ui,sans-serif" : 'system-ui,sans-serif';
  const descLines = repo.description ? wrapText(esc(repo.description), 56) : [];
  const license = licenseOf(repo);
  const topics = (repo.topics || []).slice(0, 6);
  const d = descLines.length * 16;

  const row1Y = 100 + d;
  const row2Y = row1Y + 76;
  const row3Y = row2Y + 76;
  const metaY = row3Y + 78;
  const metaValY = metaY + 18;
  const meta2Y = metaY + 38;
  const meta2ValY = meta2Y + 18;
  const topicsY = meta2Y + 40;
  const langY = topics.length ? topicsY + 32 : topicsY;
  const height = langY + 32;

  const isKit = !S.frame; // classic + cyberpunk share the kit HUD chassis
  const cell = S.statCell || ((x, y, label, value, c, w) => statBox(x, y, label, value, c));
  const chip = S.chip || ((x, y, w, h, label, variant, c) => hudChip(x, y, w, h, label, variant, c));
  const nameFill = S.ink || '#e8edf5';
  const subFill = S.sub || '#7fb8c4';
  const descFill = S.dim || '#a8b0c2';
  const statW = 204;

  return `<svg width="440" height="${height}" viewBox="0 0 440 ${height}" xmlns="http://www.w3.org/2000/svg">
    <title>${esc(repo.full_name)} — Repository Card (detailed theme${isKit ? '' : ', ' + S.name + ' skin'})</title>
    <defs>
      ${fontFace ? `<style>${fontFace}</style>` : ''}
      ${S.name === 'glass' ? '<linearGradient id="repoGlassBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#eef1f8"/><stop offset="100%" stop-color="#dde3f0"/></linearGradient>' : ''}
      <style>
        .name{font:700 19px ${displayFont};fill:${nameFill};${S.name === 'terminal' ? 'filter:url(#phosRepo);' : ''}}
        .desc{font:400 12px system-ui,sans-serif;fill:${descFill};}
        .lbl{font:500 10px ${MONO};fill:${subFill};letter-spacing:1px;}
        .statVal{font:700 17px ${displayFont};}
        .chip{font:600 10px ${MONO};fill:${color};}
        .topic{font:600 10px ${MONO};fill:${S.light ? '#04070d' : '#04070d'};}
      </style>
      ${S.name === 'terminal' ? '<filter id="phosRepo" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.4"/></filter>' : ''}
      <clipPath id="cardClip"><polygon points="14,0 440,0 440,${height - 14} 426,${height} 0,${height} 0,14"/></clipPath>
    </defs>
    <g clip-path="url(#cardClip)">
      ${S.name === 'glass'
        ? `<rect width="440" height="${height}" fill="url(#repoGlassBg)"/>`
        : `<rect width="440" height="${height}" fill="${S.bg || '#04070d'}"/>`}
      ${S.scan ? S.scan(440, height) : ''}
    </g>
    ${S.frame
      ? S.frame(440, height)
      : `<polygon points="14,0 440,0 440,${height - 14} 426,${height} 0,${height} 0,14" fill="none" stroke="${color}" stroke-opacity="0.14" stroke-width="4"/>
    <polygon points="14,0 440,0 440,${height - 14} 426,${height} 0,${height} 0,14" fill="none" stroke="${color}" stroke-opacity="0.8" stroke-width="1.3"/>
    <g fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="square" opacity="0.85">
      <path d="M406 2 H438 V34"/>
      <path d="M34 ${height - 2} H2 V${height - 34}"/>
    </g>`}

    <text x="24" y="40" class="name">${esc(repo.name)}</text>
    <text x="24" y="58" class="desc" fill="${subFill}">${esc(repo.full_name)}</text>
    ${descLines.map((line, i) => `<text x="24" y="${86 + i * 16}" class="desc">${line}</text>`).join('')}

    ${cell(24, row1Y, 'STARS', repo.stargazers_count, color, statW)}
    ${cell(212, row1Y, 'FORKS', repo.forks_count, color, statW)}
    ${cell(24, row2Y, 'ISSUES', repo.open_issues_count, color, statW)}
    ${cell(212, row2Y, 'WATCHERS', repo.watchers_count, color, statW)}
    ${cell(24, row3Y, 'CONTRIBUTORS', contributors ?? '—', color, statW)}
    ${cell(212, row3Y, 'RELEASE', releaseTag ? esc(releaseTag) : '—', color, statW)}

    <text x="24" y="${metaY}" class="lbl">DEFAULT BRANCH</text>
    <text x="24" y="${metaValY}" class="desc" fill="${S.dim || '#a8b0c2'}">${esc(repo.default_branch)}</text>
    <text x="150" y="${metaY}" class="lbl">LAST PUSH</text>
    <text x="150" y="${metaValY}" class="desc" fill="${S.dim || '#a8b0c2'}">${formatDate(repo.pushed_at)}</text>

    <text x="24" y="${meta2Y}" class="lbl">CREATED</text>
    <text x="24" y="${meta2ValY}" class="desc" fill="${S.dim || '#a8b0c2'}">${formatDate(repo.created_at)}</text>
    <text x="150" y="${meta2Y}" class="lbl">SIZE</text>
    <text x="150" y="${meta2ValY}" class="desc" fill="${S.dim || '#a8b0c2'}">${formatSize(repo.size)}</text>

    ${(() => {
      let tx = 24;
      return topics.map((topic) => {
        const label = esc(topic);
        const w = 20 + label.length * 6.2;
        if (tx + w > 416) return '';
        const out = chip(tx, topicsY, w.toFixed(1), 20, label, 'line', color);
        tx += w + 8;
        return out;
      }).join('');
    })()}

    ${repo.language ? chip(24, langY, 20 + repo.language.length * 7, 20, esc(repo.language), 'solid', color) : ''}
    ${license ? chip(repo.language ? 52 + repo.language.length * 7 : 24, langY, 20 + license.length * 7, 20, esc(license), 'line', color) : ''}
  </svg>`;
}


// Repo-card skins for the detailed base renderer. Each entry restyles the
// spec-sheet layout in a theme's design language (classic/cyberpunk share the
// kit HUD chassis; terminal is phosphor CRT; glass is frosted light).
const REPO_SKINS = {
  classic: { name: 'classic' },
  cyberpunk: { name: 'cyberpunk' },
  terminal: {
    name: 'terminal',
    bg: '#020402',
    ink: '#3ddc6a',
    sub: '#7fb8c4',
    dim: '#2a6b3d',
    rule: '#1c3a24',
    frame: (W, H) => `
    <rect width="${W}" height="${H}" fill="none" stroke="#3ddc6a" stroke-opacity="0.14" stroke-width="4"/>
    <rect width="${W}" height="${H}" fill="none" stroke="#3ddc6a" stroke-opacity="0.7" stroke-width="1"/>
    <g fill="none" stroke="#3ddc6a" stroke-width="2" stroke-linecap="square" opacity="0.8">
      <path d="M${W - 36} 2 H${W - 2} V36"/>
      <path d="M36 ${H - 2} H2 V${H - 36}"/>
    </g>`,
    scan: (W, H) => `<g opacity="0.12">${Array.from({ length: Math.ceil(H / 6) }, (_, i) => `<line x1="0" y1="${i * 6}" x2="${W}" y2="${i * 6}" stroke="#3ddc6a" stroke-width="1"/>`).join('')}</g>
    <rect x="0" y="-8" width="${W}" height="5" fill="#3ddc6a" opacity="0.10"><animate attributeName="y" from="-8" to="${H}" dur="6s" repeatCount="indefinite"/></rect>`,
    statCell: (x, y, label, value, color, W) => `
    <rect x="${x}" y="${y}" width="${W}" height="60" fill="none" stroke="#3ddc6a" stroke-dasharray="6 3" stroke-opacity="0.8"/>
    <text x="${x + 12}" y="${y + 22}" font-family="${MONO}" font-size="10" fill="#2a6b3d" letter-spacing="1">┌ ${label} ${'─'.repeat(Math.max(0, 12 - label.length))}</text>
    <text x="${x + 12}" y="${y + 46}" font-family="${MONO}" font-weight="700" font-size="17" fill="#7dffa8">${value}</text>`,
    chip: (x, y, w, h, label, variant, color) => {
      const solid = variant === 'solid';
      return `<path d="M${x + 6} ${y} H${x + w} V${y + h - 6} L${x + w - 6} ${y + h} H${x} Z" fill="${solid ? '#3ddc6a' : 'none'}" fill-opacity="${solid ? 0.9 : 0}" stroke="${solid ? 'none' : '#3ddc6a'}" stroke-opacity="${solid ? 0 : 0.7}"/>
    <text x="${x + 8}" y="${y + h / 2 + 3.5}" font-family="${MONO}" font-size="10" font-weight="600" fill="${solid ? '#020402' : '#3ddc6a'}">${label}</text>`;
    },
  },
  glass: {
    name: 'glass',
    light: true,
    bg: 'url(#repoGlassBg)',
    ink: '#1c2333',
    sub: '#5b6478',
    dim: '#8891a3',
    rule: '#c9d2e4',
    frame: (W, H) => `
    <polygon points="14,0 ${W},0 ${W},${H - 14} ${W - 14},${H} 0,${H} 0,14" fill="none" stroke="#1c2333" stroke-opacity="0.1" stroke-width="4"/>
    <polygon points="14,0 ${W},0 ${W},${H - 14} ${W - 14},${H} 0,${H} 0,14" fill="none" stroke="#1c2333" stroke-opacity="0.35" stroke-width="1.2"/>
    <g fill="none" stroke="#1c2333" stroke-width="2.2" stroke-linecap="square" opacity="0.65">
      <path d="M${W - 36} 2 H${W - 2} V36"/>
      <path d="M36 ${H - 2} H2 V${H - 36}"/>
    </g>`,
    statCell: (x, y, label, value, color, W) => `
    <rect x="${x}" y="${y}" width="${W}" height="60" rx="4" fill="#ffffff" opacity="0.65" stroke="#1c2333" stroke-opacity="0.14"/>
    <circle cx="${x + 12}" cy="${y + 18}" r="2.4" fill="${color}"/>
    <text x="${x + 20}" y="${y + 22}" font-family="${MONO}" font-size="10" fill="#8891a3" letter-spacing="1">${label}</text>
    <text x="${x + 12}" y="${y + 46}" font-family="system-ui,sans-serif" font-weight="700" font-size="18" fill="#1c2333">${value}</text>`,
    chip: (x, y, w, h, label, variant, color) => {
      const solid = variant === 'solid';
      return `<path d="M${x} ${y + 6} V${y} H${x + w} V${y + h} H${x} Z" fill="#ffffff" fill-opacity="0.6" stroke="#1c2333" stroke-opacity="0.15"/>
    <circle cx="${x + 8}" cy="${y + h / 2}" r="2.2" fill="${color}"/>
    <text x="${x + 15}" y="${y + h / 2 + 3.5}" font-family="${MONO}" font-size="10" font-weight="600" fill="${solid ? '#1c2333' : '#5b6478'}">${label}</text>`;
    },
  },
};

function statBox(x, y, label, value, color) {
  return `
    <rect x="${x}" y="${y}" width="204" height="60" fill="none" stroke="#1a2434"/>
    <text x="${x + 12}" y="${y + 22}" font-family="${MONO}" font-size="10" fill="#7fb8c4" letter-spacing=".6">${label}</text>
    <text x="${x + 12}" y="${y + 46}" font-family="system-ui,sans-serif" font-weight="700" font-size="18" fill="${color}">${value}</text>`;
}

const THEMES = { cyberpunk: renderCyberpunk, terminal: renderTerminal, glass: renderGlass, detailed: renderDetailed };

function svg(body, status, cacheControl) {
  return svgReply(body, status, cacheControl);
}

module.exports.__THEMES = THEMES;
module.exports.GET = async (request) => {
  const rateLimited = await isRateLimited('repo-endpoint', request);
  if (rateLimited) return svg(errorSVG('rate limited — slow down a bit'), 429, 'no-store');

  const url = new URL(request.url);
  const owner = (url.searchParams.get('owner') || '').trim();
  const repoName = (url.searchParams.get('repo') || '').trim();
  if (!owner || !repoName) return svg(errorSVG('missing ?owner= or ?repo='), 400);
  if (!isGhName(owner) || !isGhRepo(repoName)) return svg(errorSVG('invalid owner or repo'), 400);

  const requestedTheme = url.searchParams.get('theme');
  const render = THEMES[requestedTheme] || THEMES.cyberpunk;
  const skinParam = Object.prototype.hasOwnProperty.call(REPO_SKINS, url.searchParams.get('skin') || '')
    ? url.searchParams.get('skin') : null;

  const token = process.env.GITHUB_TOKEN;
  try {
    const repo = await ghFetch(`https://api.github.com/repos/${owner}/${repoName}`, token);
    const fontFace = CHAKRA_PETCH_FONT_FACE;
    const color = readableAccent(sanitizeColor(url.searchParams.get('color')), requestedTheme) || '#00e5ff';

    let contributors = null;
    let releaseTag = null;
    if (requestedTheme === 'detailed') {
      [contributors, releaseTag] = await Promise.all([
        contributorCount(owner, repoName, token),
        latestReleaseTag(owner, repoName, token),
      ]);
    }

    const skinArgs = requestedTheme === 'detailed' && skinParam && skinParam !== 'classic' ? { skinName: skinParam } : {};
    return svg(render({ repo, color, fontFace, contributors, releaseTag, ...skinArgs }), 200, 'public, s-maxage=3600, stale-while-revalidate=86400, stale-if-error=604800');
  } catch (err) {
    if (err.status === 404) return svg(errorSVG(`"${owner}/${repoName}" not found`), 404, 'public, s-maxage=10');
    if (err.status === 429) return svg(errorSVG('rate limited — set GITHUB_TOKEN'), 503, 'public, s-maxage=10');
    if (err.status === 403) return svg(errorSVG('GitHub refused this request'), 502, 'public, s-maxage=10');
    if (err.status === 504) return svg(errorSVG('GitHub is slow right now — try again soon'), 504, 'public, s-maxage=10');
    return svg(errorSVG('failed to load'), 500, 'public, s-maxage=10');
  }
};
