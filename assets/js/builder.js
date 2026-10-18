(() => {
  const { $, $$, esc, apiUrl, message, copyText } = window.Codex;

  const CAL_THEMES = ['cyberpunk', 'glass', 'terminal'];
  const ALL_THEMES = ['cyberpunk', 'terminal', 'glass', 'detailed'];
  const ALL_TROPHIES = ['STARGAZER', 'BUILDER', 'INFLUENCE', 'VETERAN', 'POLYGLOT', 'FORKED', 'OPEN_SOURCE', 'NETWORKER', 'SNIPPETS', 'ACTIVE', 'HEADLINER', 'CURATOR'];
  const COLOR_KEYS = ['bg', 'text', 'border'];

  const USERNAME = { key: 'username', label: 'GitHub username', placeholder: 'octocat', required: true };
  const ON = (label) => ({ type: 'select', options: ['1'], labels: { 1: label } });
  const ANIMATE = { key: 'animate', label: 'Animation', ...ON('on (off for reduced-motion users)') };
  const STYLE_FIELDS = [
    { key: 'bg', label: 'Background color (hex, optional)', placeholder: '1e1e2e' },
    { key: 'text', label: 'Text color (hex, optional)', placeholder: 'cdd6f4' },
    { key: 'border', label: 'Border color (hex, optional)', placeholder: '89b4fa' },
    { key: 'hide_border', label: 'Border', ...ON('hide it') },
  ];

  const PRESETS = [
    { name: 'Mocha', bg: '1e1e2e', text: 'cdd6f4', border: '45475a', color: 'cba6f7' },
    { name: 'Tokyo Night', bg: '1a1b26', text: 'c0caf5', border: '292e42', color: '7aa2f7' },
    { name: 'Dracula', bg: '282a36', text: 'f8f8f2', border: '44475a', color: 'bd93f9' },
    { name: 'Nord', bg: '2e3440', text: 'eceff4', border: '434c5e', color: '88c0d0' },
    { name: 'GitHub Dark', bg: '0d1117', text: 'e6edf3', border: '30363d', color: '58a6ff' },
    { name: 'Rosé Pine', bg: '191724', text: 'e0def4', border: '26233a', color: 'eb6f92' },
    { name: 'Solarized', bg: 'fdf6e3', text: '657b83', border: 'eee8d5', color: '268bd2' },
  ];

  const TYPES = {
    card: {
      label: 'Contributor',
      endpoint: '/api/card',
      themes: ALL_THEMES,
      shapeSupport: true,
      fields: [USERNAME],
    },
    leaderboard: {
      label: 'Leaderboard',
      endpoint: '/api/leaderboard',
      themes: CAL_THEMES,
      shapeSupport: true,
      fields: [
        { key: 'org', label: 'Organization', placeholder: 'boy-offi9-inc', required: true },
        { key: 'limit', label: 'Member limit (1-20)', placeholder: '10', type: 'number', min: 1, max: 20 },
      ],
    },
    repo: {
      label: 'Repository',
      endpoint: '/api/repo',
      themes: ALL_THEMES,
      fields: [
        { key: 'owner', label: 'Repo owner', placeholder: 'boy-offi9-inc', required: true },
        { key: 'repo', label: 'Repo name', placeholder: 'Contributor-Codex', required: true },
      ],
    },
    trophies: {
      label: 'Achievements',
      endpoint: '/api/trophies',
      themes: null,
      badgeSupport: true,
      trophyPicker: true,
      fields: [USERNAME],
    },
    codex: {
      label: 'Codex Collection',
      endpoint: '/api/codex',
      themes: null,
      badgeSupport: true,
      fields: [
        USERNAME,
        { key: 'streak', label: 'Streak strip', ...ON('include (needs server token)') },
      ],
    },
    stats: {
      label: 'Stats + rank',
      endpoint: '/api/stats',
      themes: CAL_THEMES,
      styleSupport: true,
      fields: [
        USERNAME,
        { key: 'hide', label: 'Hide stats (comma list, optional)', placeholder: 'issues,reviews' },
        ANIMATE,
        ...STYLE_FIELDS,
      ],
    },
    streak: {
      label: 'Streak',
      endpoint: '/api/streak',
      themes: CAL_THEMES,
      shapeSupport: true,
      styleSupport: true,
      fields: [
        USERNAME,
        { key: 'profile', label: 'Avatar & name header', ...ON('show') },
        { key: 'year', label: 'This-year footer', ...ON('show') },
        ANIMATE,
        ...STYLE_FIELDS,
      ],
    },
    activity: {
      label: 'Activity graph',
      endpoint: '/api/activity',
      themes: CAL_THEMES,
      styleSupport: true,
      fields: [
        USERNAME,
        { key: 'days', label: 'Range', type: 'select', options: ['30', '90', '180', '365'] },
        ANIMATE,
        ...STYLE_FIELDS,
      ],
    },
    langs: {
      label: 'Top languages',
      endpoint: '/api/langs',
      themes: CAL_THEMES,
      styleSupport: true,
      fields: [
        USERNAME,
        { key: 'limit', label: 'Languages shown (2-8)', placeholder: '6', type: 'number', min: 2, max: 8 },
        ...STYLE_FIELDS,
      ],
    },
  };

  let currentType = 'card';
  let pendingUrl = null;
  let debounceTimer;
  let previewTicket = 0;
  const state = {};

  const typePicker = $('#typePicker');
  const dynamicFields = $('#dynamicFields');
  const themeField = $('#themeField');
  const themeSelect = $('#themeSelect');
  const shapeField = $('#shapeField');
  const shapeSelect = $('#shapeSelect');
  const badgeField = $('#badgeField');
  const badgeSelect = $('#badgeSelect');
  const colorFieldWrap = $('#colorFieldWrap');
  const colorPicker = $('#colorPicker');
  const colorText = $('#colorText');
  const presetField = $('#presetField');
  const presetGrid = $('#presetGrid');
  const previewBox = $('#previewBox');
  const pngBtn = $('#pngBtn');
  const pairRow = $('#pairRow');
  const pairOut = $('#pairOut');
  const mdOut = $('#mdOut');
  const urlOut = $('#urlOut');
  const htmlOut = $('#htmlOut');

  function fieldMarkup(field) {
    const id = `f_${field.key}`;
    const label = `<label for="${id}">${esc(field.label)}</label>`;
    if (field.type === 'select') {
      const options = field.options.map((value) => {
        const selected = state[field.key] === value ? ' selected' : '';
        return `<option value="${esc(value)}"${selected}>${esc((field.labels && field.labels[value]) || value)}</option>`;
      }).join('');
      return `<div class="field">${label}<select id="${id}"><option value="">default</option>${options}</select></div>`;
    }
    const bounds = `${field.min !== undefined ? ` min="${field.min}"` : ''}${field.max !== undefined ? ` max="${field.max}"` : ''}`;
    return `<div class="field">${label}<input type="${field.type || 'text'}" id="${id}" class="mono" autocomplete="off" spellcheck="false" placeholder="${esc(field.placeholder || '')}"${bounds} value="${esc(state[field.key] || '')}"></div>`;
  }

  function trophyMarkup() {
    const chips = ALL_TROPHIES.map((name) => {
      const checked = state.trophies && state.trophies.includes(name) ? ' checked' : '';
      return `<label class="trophyChip"><input type="checkbox" value="${name}"${checked}> ${name}</label>`;
    }).join('');
    return `
      <div class="field">
        <span class="fieldLabel">Trophies (none selected = show all)</span>
        <div class="trophyGrid" id="trophyGrid">${chips}</div>
      </div>
      <div class="field">
        <span class="fieldLabel">Custom trophy (optional) — for anything that isn't from GitHub</span>
        <div class="stack">
          <input type="text" id="f_customLabel" class="mono" aria-label="Custom trophy label" placeholder="Label, e.g. CODEWARS (max 10 chars)" maxlength="10" value="${esc(state.customLabel || '')}">
          <input type="text" id="f_customValue" class="mono" aria-label="Custom trophy value" placeholder="Current value, e.g. 1450" value="${esc(state.customValue || '')}">
          <input type="text" id="f_customThresholds" class="mono" aria-label="Custom trophy thresholds" placeholder="4 ascending thresholds, e.g. 100,500,1500,5000" value="${esc(state.customThresholds || '')}">
        </div>
        <p class="hint">All three fields are required together, or the custom trophy is silently skipped.</p>
      </div>`;
  }

  function bindValue(id, key) {
    $(`#${id}`).addEventListener('input', (event) => {
      state[key] = event.target.value;
      update();
    });
  }

  function renderPresets(def) {
    presetField.classList.toggle('hidden', !def.styleSupport);
    if (!def.styleSupport) {
      presetGrid.replaceChildren();
      return;
    }
    presetGrid.innerHTML = PRESETS.map((preset, index) => `
      <button type="button" class="presetChip" data-i="${index}">
        <i style="background:#${preset.bg}"></i><i style="background:#${preset.color}"></i>${esc(preset.name)}
      </button>`).join('') + '<button type="button" class="presetChip" data-i="reset">Reset</button>';
    $$('.presetChip', presetGrid).forEach((button) => {
      button.addEventListener('click', () => {
        const preset = button.dataset.i === 'reset'
          ? { bg: '', text: '', border: '', color: '' }
          : PRESETS[Number(button.dataset.i)];
        COLOR_KEYS.forEach((key) => { state[key] = preset[key]; });
        colorText.value = preset.color;
        if (preset.color) colorPicker.value = `#${preset.color}`;
        renderFields();
        update();
      });
    });
  }

  function renderFields() {
    const def = TYPES[currentType];
    dynamicFields.innerHTML = def.fields.map(fieldMarkup).join('') + (def.trophyPicker ? trophyMarkup() : '');

    def.fields.forEach((field) => bindValue(`f_${field.key}`, field.key));

    if (def.trophyPicker) {
      $$('#trophyGrid input').forEach((box) => {
        box.addEventListener('change', () => {
          state.trophies = $$('#trophyGrid input:checked').map((checked) => checked.value);
          update();
        });
      });
      ['customLabel', 'customValue', 'customThresholds'].forEach((key) => bindValue(`f_${key}`, key));
    }

    renderPresets(def);

    if (def.themes) {
      themeField.classList.remove('hidden');
      themeSelect.innerHTML = def.themes.map((theme) => `<option value="${theme}">${theme}</option>`).join('');
      themeSelect.value = state.theme && def.themes.includes(state.theme) ? state.theme : def.themes[0];
      state.theme = themeSelect.value;
    } else {
      themeField.classList.add('hidden');
    }

    colorFieldWrap.classList.toggle('hidden', currentType === 'trophies');

    shapeField.classList.toggle('hidden', !def.shapeSupport);
    if (def.shapeSupport) shapeSelect.value = state.shape || '';

    badgeField.classList.toggle('hidden', !def.badgeSupport);
    if (def.badgeSupport) badgeSelect.value = state.badge || '';
  }

  function buildUrl(themeOverride) {
    const def = TYPES[currentType];
    const params = {};
    let missing = false;

    def.fields.forEach((field) => {
      let value = (state[field.key] || '').trim();
      if (COLOR_KEYS.includes(field.key)) value = value.replace(/^#/, '');
      if (field.required && !value) missing = true;
      if (value) params[field.key] = value;
    });

    if (def.trophyPicker) {
      if (state.trophies && state.trophies.length) params.trophies = state.trophies.join(',');
      const label = (state.customLabel || '').trim();
      const value = (state.customValue || '').trim();
      const thresholds = (state.customThresholds || '').trim();
      if (label && value && thresholds) {
        params.customLabel = label;
        params.customValue = value;
        params.customThresholds = thresholds;
      }
    }

    const theme = themeOverride || state.theme;
    if (def.themes && theme) params.theme = theme;
    if (def.shapeSupport && state.shape) params.shape = state.shape;
    if (def.badgeSupport && state.badge) params.badge = state.badge;

    if (currentType !== 'trophies') {
      const color = (colorText.value || '').trim().replace(/^#/, '');
      if (/^[0-9a-fA-F]{6}$/.test(color)) params.color = color;
    }

    return { url: apiUrl(def.endpoint, params), missing };
  }

  function setPair() {
    const def = TYPES[currentType];
    const customBg = def.fields.some((field) => field.key === 'bg') && (state.bg || '').trim();
    if (!def.themes || !def.themes.includes('glass') || customBg) {
      pairRow.classList.add('hidden');
      return;
    }
    const dark = state.theme && state.theme !== 'glass' ? state.theme : 'cyberpunk';
    const darkUrl = buildUrl(dark).url;
    const lightUrl = buildUrl('glass').url;
    pairOut.value = [
      '<picture>',
      `  <source media="(prefers-color-scheme: dark)" srcset="${darkUrl}">`,
      `  <source media="(prefers-color-scheme: light)" srcset="${lightUrl}">`,
      `  <img alt="GitHub card" src="${darkUrl}">`,
      '</picture>',
    ].join('\n');
    pairRow.classList.remove('hidden');
  }

  function showPreviewPrompt(text, withButton) {
    previewTicket += 1;
    pngBtn.disabled = true;
    const nodes = [message(text)];
    if (withButton) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn dashed';
      button.textContent = '▶ Generate preview';
      button.addEventListener('click', loadPreview);
      nodes.push(button);
    }
    previewBox.replaceChildren(...nodes);
  }

  function loadPreview() {
    if (!pendingUrl) return;
    const url = pendingUrl;
    const ticket = ++previewTicket;
    previewBox.replaceChildren(message('loading…'));
    const img = new Image();
    img.alt = 'card preview';
    img.onload = () => {
      if (ticket !== previewTicket) return;
      previewBox.replaceChildren(img);
      pngBtn.disabled = false;
    };
    img.onerror = () => {
      if (ticket !== previewTicket) return;
      previewBox.replaceChildren(message('failed to load — check the fields above', true));
    };
    img.src = url;
  }

  function update() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const { url, missing } = buildUrl();
      if (missing) {
        pendingUrl = null;
        showPreviewPrompt('fill in the required fields to preview', false);
        mdOut.value = '';
        urlOut.value = '';
        htmlOut.value = '';
        pairRow.classList.add('hidden');
        return;
      }
      pendingUrl = url;
      mdOut.value = `![Card](${url})`;
      urlOut.value = url;
      htmlOut.value = `<img src="${url}" alt="card">`;
      setPair();
      showPreviewPrompt('ready — tap to render the live card', true);
    }, 250);
  }

  async function downloadPng() {
    if (!pendingUrl) return;
    const label = pngBtn.textContent;
    pngBtn.disabled = true;
    pngBtn.textContent = 'rendering…';
    try {
      const target = new URL(pendingUrl, location.href);
      target.searchParams.delete('animate');
      const svgText = await (await fetch(target)).text();
      const objectUrl = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
      const img = new Image();
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = objectUrl; });
      const width = img.naturalWidth || 480;
      const height = img.naturalHeight || 200;
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);
      canvas.toBlob((blob) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${currentType}-card.png`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 2000);
      }, 'image/png');
    } catch {
      pngBtn.textContent = 'PNG export failed';
      setTimeout(() => { pngBtn.textContent = label; pngBtn.disabled = false; }, 2500);
      return;
    }
    pngBtn.textContent = label;
    pngBtn.disabled = false;
  }

  function renderTypePicker() {
    typePicker.innerHTML = Object.entries(TYPES).map(([key, def]) =>
      `<button type="button" class="typeBtn" data-type="${key}" aria-pressed="${key === currentType}">${esc(def.label)}</button>`).join('');
  }

  typePicker.addEventListener('click', (event) => {
    const button = event.target.closest('.typeBtn');
    if (!button) return;
    currentType = button.dataset.type;
    $$('.typeBtn', typePicker).forEach((el) => el.setAttribute('aria-pressed', String(el === button)));
    renderFields();
    update();
  });

  themeSelect.addEventListener('change', () => { state.theme = themeSelect.value; update(); });
  shapeSelect.addEventListener('change', () => { state.shape = shapeSelect.value; update(); });
  badgeSelect.addEventListener('change', () => { state.badge = badgeSelect.value; update(); });
  colorPicker.addEventListener('input', () => { colorText.value = colorPicker.value.replace(/^#/, ''); update(); });
  colorText.addEventListener('input', update);
  pngBtn.addEventListener('click', downloadPng);

  $$('.copyBtn').forEach((button) => {
    button.addEventListener('click', async () => {
      const target = $(`#${button.dataset.target}`);
      if (!target.value) return;
      const ok = await copyText(button, target.value, { fail: 'Select & copy manually' });
      if (!ok) target.select();
    });
  });

  renderTypePicker();
  renderFields();
  update();
})();
