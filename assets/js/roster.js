(() => {
  const { $, $$, esc, enc, apiUrl, setStatus, loadImage, copyText, ghFetch, describeGhError, onEnter } = window.Codex;

  const LB_THEMES = ['cyberpunk', 'terminal', 'glass'];

  const grid = $('#grid');
  const statusEl = $('#status');
  const overlay = $('#overlay');
  const dossier = $('#dossier');
  const themeSelect = $('#themeSelect');
  const orgInput = $('#orgInput');
  const userInput = $('#userInput');
  const tokenInput = $('#tokenInput');
  const lbPreview = $('#lbPreview');
  const lbStage = $('#lbStage');
  const lbCopyBtn = $('#lbCopyBtn');

  const loaded = new Set();
  let currentOrg = null;
  let lbRequested = false;
  let dossierTicket = 0;
  let lastFocus = null;

  const token = () => tokenInput.value.trim();
  const cardUrlFor = (login, theme) => apiUrl('/api/card', { username: login, theme });

  function leaderboardUrlFor(org, theme) {
    const lbTheme = LB_THEMES.includes(theme) ? theme : 'cyberpunk';
    return apiUrl('/api/leaderboard', { org, limit: 10, theme: lbTheme });
  }

  function showLeaderboardPreview() {
    if (!currentOrg) return;
    const url = leaderboardUrlFor(currentOrg, themeSelect.value);
    lbCopyBtn.dataset.url = url;
    lbPreview.classList.add('show');
    if (lbRequested) {
      loadImage(lbStage, url, { alt: `${currentOrg} team leaderboard`, failure: "couldn't load the leaderboard — try again in a minute" });
      return;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn dashed sm';
    button.textContent = '▶ Load leaderboard (ranks every member — uses the most API calls)';
    button.addEventListener('click', () => {
      lbRequested = true;
      showLeaderboardPreview();
    });
    lbStage.replaceChildren(button);
  }

  lbCopyBtn.addEventListener('click', (event) => {
    const url = event.currentTarget.dataset.url;
    if (url) copyText(event.currentTarget, `![Leaderboard](${url})`, { done: 'Copied ✓', fail: 'Copy failed' });
  });

  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      cardObserver.unobserve(entry.target);
      if (entry.target._start) entry.target._start();
    });
  }, { rootMargin: '150px' });

  function makeInteractive(el, login) {
    el.classList.add('ready');
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
    el.setAttribute('aria-label', `Open dossier for ${login}`);
    el.addEventListener('click', () => openDossier(login));
    el.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openDossier(login);
      }
    });
  }

  function renderCard(login) {
    const key = login.toLowerCase();
    if (loaded.has(key)) return;
    loaded.add(key);

    const el = document.createElement('div');
    el.className = 'card skeleton shimmer';
    el.dataset.login = login;
    el.textContent = `loading @${login}…`;
    grid.appendChild(el);

    el._start = () => {
      const img = new Image();
      img.alt = `${login} card`;
      img.decoding = 'async';
      img.onload = () => {
        el.classList.remove('skeleton', 'shimmer');
        el.replaceChildren(img);
        makeInteractive(el, login);
      };
      img.onerror = () => {
        el.classList.remove('skeleton', 'shimmer');
        el.classList.add('errorCard');
        el.textContent = `@${login} — failed to load card`;
      };
      img.src = cardUrlFor(login, themeSelect.value);
    };
    cardObserver.observe(el);
  }

  function dossierShell(inner) {
    dossier.innerHTML = `<div class="scan"></div><button class="closeBtn" type="button" aria-label="Close">✕</button>${inner}`;
    $('.closeBtn', dossier).addEventListener('click', closeDossier);
  }

  async function openDossier(login) {
    const ticket = ++dossierTicket;
    lastFocus = document.activeElement;
    dossierShell(`<p class="dLogin">loading @${esc(login)}…</p>`);
    overlay.classList.add('open');
    document.documentElement.style.overflow = 'hidden';
    $('.closeBtn', dossier).focus();

    const cardUrl = cardUrlFor(login, themeSelect.value);
    let user = null;
    try {
      user = await ghFetch(`/users/${enc(login)}`, token());
    } catch {
      user = null;
    }
    if (ticket !== dossierTicket || !overlay.classList.contains('open')) return;

    const joined = user ? new Date(user.created_at).getFullYear() : null;
    dossierShell(`
      <img class="dossierCard" src="${esc(cardUrl)}" alt="${esc(login)} card">
      ${joined ? `<p class="dLogin">member since ${joined}</p>` : ''}
      ${user && user.bio ? `<p class="bio">${esc(user.bio)}</p>` : ''}
      <div class="dossierActions">
        <a class="btn solid" href="profile.html?u=${enc(login)}">FULL PROFILE →</a>
        <button class="btn ghost" id="dossierCopy" type="button">COPY EMBED LINK</button>
      </div>`);
    $('#dossierCopy').addEventListener('click', (event) => {
      copyText(event.currentTarget, cardUrl, { done: 'COPIED ✓', fail: 'COPY FAILED — SELECT MANUALLY' });
    });
    $('.closeBtn', dossier).focus();
  }

  function closeDossier() {
    if (!overlay.classList.contains('open')) return;
    dossierTicket += 1;
    overlay.classList.remove('open');
    document.documentElement.style.overflow = '';
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeDossier();
  });

  document.addEventListener('keydown', (event) => {
    if (!overlay.classList.contains('open')) return;
    if (event.key === 'Escape') {
      closeDossier();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = $$('button, a[href]', dossier);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  function resetGrid() {
    grid.replaceChildren();
    loaded.clear();
  }

  async function loadOrg() {
    const org = orgInput.value.trim();
    if (!org) return;
    resetGrid();
    currentOrg = null;
    lbPreview.classList.remove('show');
    lbRequested = false;
    setStatus(statusEl, `Fetching ${org}'s member list…`);
    try {
      const members = await ghFetch(`/orgs/${enc(org)}/members?per_page=100`, token());
      if (!members.length) {
        setStatus(statusEl, `No public members returned for "${org}" — its member list may be private. Add usernames manually below instead.`, true);
        return;
      }
      currentOrg = org;
      showLeaderboardPreview();
      members.forEach((member) => renderCard(member.login));
      setStatus(statusEl, `${members.length} member${members.length === 1 ? '' : 's'} found — cards load as you scroll.`);
    } catch (err) {
      setStatus(statusEl, describeGhError(err, `Org "${org}" not found.`), true);
    }
  }

  function addUser() {
    const login = userInput.value.trim();
    if (!login) return;
    userInput.value = '';
    renderCard(login);
  }

  $('#loadOrgBtn').addEventListener('click', loadOrg);
  $('#addUserBtn').addEventListener('click', addUser);
  onEnter(orgInput, loadOrg);
  onEnter(userInput, addUser);

  themeSelect.addEventListener('change', () => {
    const logins = $$('.card[data-login]', grid).map((el) => el.dataset.login);
    resetGrid();
    logins.forEach(renderCard);
    showLeaderboardPreview();
  });

  setStatus(statusEl, 'Enter an org and tap Load — nothing is fetched until you do.');
})();
