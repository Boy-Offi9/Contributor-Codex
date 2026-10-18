(() => {
  const { $, esc, enc, apiUrl, setStatus, loadImage, copyText, ghFetch, describeGhError, onEnter } = window.Codex;

  const statusEl = $('#status');
  const profileEl = $('#profile');
  const hero = $('#hero');
  const statTiles = $('#statTiles');
  const cardShell = $('#cardShell');
  const trophyShell = $('#trophyShell');
  const cardCopy = $('#cardCopy');
  const trophyCopy = $('#trophyCopy');
  const repoList = $('#repoList');
  const userInput = $('#userInput');
  const tokenInput = $('#tokenInput');
  const baseTitle = document.title;

  const PIN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 21s7-7.58 7-12A7 7 0 0 0 5 9c0 4.42 7 12 7 12Z"/><circle cx="12" cy="9" r="2.4"/></svg>';
  const BUILDING_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 21V6l6-3 6 3v15"/><path d="M4 21h16"/><path d="M10 21v-5h4v5"/></svg>';

  const token = () => tokenInput.value.trim();
  const fmt = (n) => Number(n).toLocaleString('en-US');

  function avatarUrl(raw) {
    try {
      const url = new URL(raw);
      url.searchParams.set('s', '160');
      return url.toString();
    } catch {
      return raw;
    }
  }

  function heroMarkup(user, login) {
    const joined = new Date(user.created_at).getFullYear();
    return `
      <img class="avatar" src="${esc(avatarUrl(user.avatar_url))}" alt="${esc(login)} avatar" width="84" height="84">
      <div class="heroInfo">
        <p class="heroName">${esc(user.name || user.login)}</p>
        <p class="heroLogin mono">@${esc(user.login)}</p>
        ${user.bio ? `<p class="heroBio">${esc(user.bio)}</p>` : ''}
        <div class="heroMeta">
          <span>member since ${joined}</span>
          ${user.location ? `<span>${PIN_ICON}${esc(user.location)}</span>` : ''}
          ${user.company ? `<span>${BUILDING_ICON}${esc(user.company)}</span>` : ''}
        </div>
        <div class="heroActions">
          <a class="btn solid" href="${esc(user.html_url)}" target="_blank" rel="noopener">VIEW ON GITHUB</a>
          <button class="btn ghost" id="copyLinkBtn" type="button">COPY PROFILE LINK</button>
        </div>
      </div>`;
  }

  function tilesMarkup(user, repos) {
    const stars = repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
    const capped = user.public_repos > 100 ? ' title="Counted across the first 100 repositories"' : '';
    const tiles = [
      ['Followers', fmt(user.followers)],
      ['Following', fmt(user.following)],
      ['Public repos', fmt(user.public_repos)],
      ['Stars', `<span${capped}>${fmt(stars)}${capped ? '+' : ''}</span>`],
    ];
    return tiles.map(([key, value]) => `<div class="statTile"><div class="k">${key}</div><div class="v">${value}</div></div>`).join('');
  }

  function repoMarkup(repo) {
    return `
      <li>
        <div>
          <a class="repoName" href="${esc(repo.html_url)}" target="_blank" rel="noopener">${esc(repo.name)}</a>
          ${repo.description ? `<p class="repoDesc">${esc(repo.description)}</p>` : ''}
        </div>
        <div class="repoMeta">
          <div class="stars">★ ${fmt(repo.stargazers_count)}</div>
          ${repo.language ? `<div>${esc(repo.language)}</div>` : ''}
        </div>
      </li>`;
  }

  function wireCopy(button, url, label) {
    button.onclick = () => copyText(button, `![${label}](${url})`, { fail: 'Copy failed' });
  }

  async function loadProfile(login) {
    profileEl.classList.remove('show');
    setStatus(statusEl, `Loading @${login}…`);

    let user;
    try {
      user = await ghFetch(`/users/${enc(login)}`, token());
    } catch (err) {
      setStatus(statusEl, describeGhError(err, `User "${login}" not found.`), true);
      return;
    }

    let repos = [];
    try {
      repos = await ghFetch(`/users/${enc(login)}/repos?per_page=100&type=owner`, token());
    } catch {
      repos = [];
    }

    const owned = repos.filter((repo) => !repo.fork);
    const topRepos = [...owned].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 5);

    hero.innerHTML = heroMarkup(user, login);
    statTiles.innerHTML = tilesMarkup(user, owned);
    repoList.innerHTML = topRepos.length
      ? topRepos.map(repoMarkup).join('')
      : '<li><span class="repoEmpty">no public repositories</span></li>';

    $('#copyLinkBtn').onclick = (event) => {
      const link = `${location.origin}${location.pathname}?u=${enc(login)}`;
      copyText(event.currentTarget, link, { done: 'COPIED ✓', fail: 'COPY FAILED' });
    };

    const cardSrc = apiUrl('/api/card', { username: login, theme: 'detailed' });
    const trophySrc = apiUrl('/api/trophies', { username: login });
    loadImage(cardShell, cardSrc, { alt: `${login} contributor card`, failure: "couldn't load the card — try again in a minute" });
    loadImage(trophyShell, trophySrc, { alt: `${login} achievements`, failure: "couldn't load the achievements — try again in a minute" });
    wireCopy(cardCopy, cardSrc, 'Card');
    wireCopy(trophyCopy, trophySrc, 'Achievements');

    document.title = `${user.name || user.login} — ${baseTitle}`;
    profileEl.classList.add('show');
    setStatus(statusEl, '');
    history.replaceState(null, '', `${location.pathname}?u=${enc(login)}`);
  }

  function submit() {
    const login = userInput.value.trim();
    if (login) loadProfile(login);
  }

  $('#loadBtn').addEventListener('click', submit);
  onEnter(userInput, submit);

  const params = new URLSearchParams(location.search);
  const initial = params.get('u') || params.get('username');
  if (initial) {
    userInput.value = initial;
    loadProfile(initial);
  } else {
    setStatus(statusEl, 'Enter a GitHub username to load their Codex profile.');
  }
})();
