(() => {
  const { API_BASE, $, $$, esc, enc, loadImage, copyText, onEnter } = window.Codex;

  const CARD_TYPES = [
    {
      title: 'Contributor',
      text: 'A profile card built from a single username — stats, top language, four themes.',
      icon: '<path d="M12 2l8 4.2v11.6L12 22l-8-4.2V6.2L12 2Z"/><circle cx="12" cy="10" r="2.6"/><path d="M7.5 17c1-2.2 2.8-3.3 4.5-3.3s3.5 1.1 4.5 3.3"/>',
      src: '/api/card?username=octocat',
      code: '/api/card?username=',
      alt: 'contributor card example',
    },
    {
      title: 'Team / Leaderboard',
      text: 'Point it at an org and every public member gets ranked by a transparent, self-referential XP formula.',
      icon: '<line x1="5" y1="20" x2="5" y2="13"/><line x1="12" y1="20" x2="12" y2="8"/><line x1="19" y1="20" x2="19" y2="4"/>',
      src: '/api/leaderboard?org=boy-offi9-inc&limit=4',
      code: '/api/leaderboard?org=&limit=',
      alt: 'leaderboard card example',
    },
    {
      title: 'Repository',
      text: 'Stars, forks, license, topics, contributors, and the latest release for a single repo.',
      icon: '<path d="M9 4 5 12l4 8"/><path d="M15 4l4 8-4 8"/>',
      src: '/api/repo?owner=Boy-Offi9&repo=Contributor-Codex',
      code: '/api/repo?owner=&repo=',
      alt: 'repository card example',
    },
    {
      title: 'Achievements',
      text: 'Twelve tiered badges in six shapes — stars, repos, followers, years, languages, forks, licenses, gists, activity and more.',
      icon: '<path d="M12 2l7 3.5v6c0 5-3 8.5-7 10.5-4-2-7-5.5-7-10.5v-6L12 2Z"/><path d="M12 8l1.2 2.4 2.6.4-1.9 1.9.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.9 2.6-.4L12 8Z"/>',
      src: '/api/trophies?username=octocat&trophies=STARGAZER,BUILDER,POLYGLOT',
      code: '/api/trophies?username=&trophies=',
      alt: 'achievements card example',
    },
    {
      title: 'Codex collection',
      text: 'A compact dossier in a single image, with an optional streak strip.',
      icon: '<rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/>',
      src: '/api/codex?username=octocat',
      code: '/api/codex?username=',
      alt: 'codex collection example',
    },
    {
      title: 'Stats + rank',
      text: 'Stars, commits, PRs, issues and reviews, with a rank grade that shows progress to the next one.',
      icon: '<path d="M4 4v16h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
      src: '/api/stats?username=octocat',
      code: '/api/stats?username=',
      alt: 'stats and rank example',
    },
    {
      title: 'Streak',
      text: 'Total contributions, current streak and longest streak with date ranges. Needs the server token.',
      icon: '<path d="M12 3c.5 3-2.6 4.3-2.6 7.4a2.6 2.6 0 0 0 5.2 0c0-.8-.3-1.4-.6-1.8 1.8 1 3 2.8 3 5A5 5 0 0 1 12 19a5 5 0 0 1-5-5.4C7 8.8 11 7.5 12 3Z"/>',
      src: '/api/streak?username=octocat',
      code: '/api/streak?username=',
      alt: 'streak card example',
    },
    {
      title: 'Activity graph',
      text: 'A smooth contribution graph over 30, 90, 180 or 365 days with a labelled peak.',
      icon: '<path d="M3 17l5-6 4 3 5-8 4 5"/><line x1="3" y1="21" x2="21" y2="21"/>',
      src: '/api/activity?username=octocat&days=90',
      code: '/api/activity?username=&days=',
      alt: 'activity graph example',
    },
    {
      title: 'Top languages',
      text: 'Your most-used languages as a stacked bar with percentages.',
      icon: '<rect x="3" y="9" width="18" height="6" rx="3"/><line x1="8" y1="19" x2="8" y2="21"/><line x1="16" y1="19" x2="16" y2="21"/>',
      src: '/api/langs?username=octocat',
      code: '/api/langs?username=',
      alt: 'top languages example',
    },
  ];

  const typeGrid = $('#typeGrid');
  typeGrid.innerHTML = CARD_TYPES.map((type) => `
    <article class="typeCard hexPanel">
      <div class="head">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${type.icon}</svg>
        <h3>${esc(type.title)}</h3>
      </div>
      <p>${esc(type.text)}</p>
      <div class="thumb lazyBox" data-src="${esc(API_BASE + type.src)}" data-alt="${esc(type.alt)}">
        <button class="btn dashed sm" type="button">▶ load live preview</button>
      </div>
      <code>${esc(type.code)}</code>
    </article>`).join('');

  $$('.lazyBox[data-src]').forEach((box) => {
    const button = $('button', box);
    if (!button) return;
    button.addEventListener('click', () => {
      loadImage(box, box.dataset.src, { alt: box.dataset.alt });
    }, { once: true });
  });

  const demoInput = $('#demoInput');
  const demoStage = $('#demoStage');

  function runDemo() {
    const login = demoInput.value.trim();
    if (!login) return;
    loadImage(demoStage, `${API_BASE}/api/card?username=${enc(login)}&theme=cyberpunk`, {
      alt: `${login} card`,
      failure: `couldn't generate a card for "${login}" — check the username`,
    });
  }

  $('#demoBtn').addEventListener('click', runDemo);
  onEnter(demoInput, runDemo);

  const embedMarkdown = `![Card](${API_BASE}/api/card?username=octocat)`;
  $('#embedText').textContent = embedMarkdown;
  $('#embedCopyBtn').addEventListener('click', (event) => copyText(event.currentTarget, embedMarkdown, { done: 'copied ✓', fail: 'copy failed' }));

  const embedPreview = $('#embedPreview');
  embedPreview.dataset.src = `${API_BASE}/api/card?username=octocat&theme=glass`;
  $('button', embedPreview).addEventListener('click', () => {
    loadImage(embedPreview, embedPreview.dataset.src, { alt: 'glass theme card example' });
  }, { once: true });
})();
