const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const MATH_NAME = '\u{1d446}\u{1d466}\u{1d460}\u{1d461}\u{1d452}\u{1d45a}\u{1d463}\u{1d438}\u{1d45f}\u{1d45f}\u{1d45c}\u{1d45f}';

const users = {
  octo: { name: 'Octo Cat', followers: 215, repos: 12, stars: 40 },
  mathname: { name: MATH_NAME, followers: 54, repos: 1, stars: 1 },
  hostile: { name: `<script>alert(1)</script>&"'<b>x\u0000\ud835`, followers: 12345678, repos: 3, stars: 2 },
  empty: { name: null, followers: 0, repos: 0, stars: 0 },
};

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
const dayIso = (offset) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);

function calendarFor(login, from, to) {
  const days = [];
  const start = Date.parse(`${from.slice(0, 10)}T00:00:00Z`);
  const end = Math.min(Date.parse(to), Date.now());
  for (let t = start; t <= end; t += 86400000) {
    const ago = Math.round((Date.now() - t) / 86400000);
    const active = login !== 'empty' && (ago < 12 || (ago > 40 && ago < 70));
    days.push({ date: new Date(t).toISOString().slice(0, 10), contributionCount: active ? 3 : 0 });
  }
  return { contributionCalendar: { weeks: days.length ? [{ contributionDays: days }] : [] } };
}

function graphql(body) {
  const { query, variables } = JSON.parse(body);
  const login = variables.login;
  if (login === 'nobody') return json({ data: { user: null }, errors: [{ type: 'NOT_FOUND', message: 'not found' }] });
  const u = users[login] || users.octo;
  const total = (n) => ({ totalCount: login === 'empty' ? 0 : n });
  if (query.includes('repositoriesContributedTo')) {
    return json({ data: { user: { login, name: u.name, avatarUrl: 'https://avatars.test/u', createdAt: '2020-03-01T00:00:00Z', followers: total(u.followers), contributionsCollection: { totalCommitContributions: login === 'empty' ? 0 : 320, totalPullRequestReviewContributions: login === 'empty' ? 0 : 14 }, pullRequests: total(31), issues: total(9), repositoriesContributedTo: total(6), repositories: { nodes: [{ stargazerCount: u.stars }] } } } });
  }
  const years = [...query.matchAll(/y(\d{4}):/g)].map((m) => m[1]);
  if (!years.length) return json({ data: { user: { login, name: u.name, createdAt: '2020-03-01T00:00:00Z', avatarUrl: 'https://avatars.test/u' } } });
  const user = {};
  for (const y of years) user[`y${y}`] = calendarFor(login, `${y}-01-01`, y === String(new Date().getUTCFullYear()) ? new Date().toISOString() : `${y}-12-31T23:59:59Z`);
  return json({ data: { user } });
}

function install() {
  global.fetch = async (input, opts = {}) => {
    const url = String(input);
    if (url.endsWith('/graphql')) return graphql(opts.body);
    if (url.startsWith('https://avatars.test/')) return new Response(PNG, { status: 200, headers: { 'content-type': 'image/png' } });
    if (url.endsWith('/rate_limit')) return json({ resources: { core: { limit: 5000, remaining: 4000, used: 1000, reset: Math.floor(Date.now() / 1000) + 600 }, graphql: { limit: 5000, remaining: 4900, used: 100, reset: Math.floor(Date.now() / 1000) + 600 }, search: { limit: 30, remaining: 30, used: 0, reset: 0 } } });
    let m;
    if (url.includes('/languages')) return json({ JavaScript: 9000, CSS: 800, HTML: 300 });
    if ((m = url.match(/api\.github\.com\/users\/([^/?]+)\/repos/))) {
      const u = users[m[1]];
      if (!u) return json({ message: 'Not Found' }, 404);
      return json(u.repos === 0 ? [] : [
        { name: 'one', fork: false, stargazers_count: u.stars, forks_count: 1, language: 'JavaScript', pushed_at: new Date().toISOString(), topics: ['a'], license: { spdx_id: 'MIT' }, languages_url: `https://api.github.com/repos/${m[1]}/one/languages` },
        { name: 'two', fork: true, stargazers_count: 99, forks_count: 9, language: 'Go', languages_url: `https://api.github.com/repos/${m[1]}/two/languages` },
      ]);
    }
    if ((m = url.match(/api\.github\.com\/users\/([^/?]+)$/))) {
      const u = users[m[1]];
      if (!u) return json({ message: 'Not Found' }, 404);
      return json({ login: m[1], name: u.name, avatar_url: 'https://avatars.test/u', public_repos: u.repos, followers: u.followers, following: 3, public_gists: 1, created_at: '2020-03-01T00:00:00Z', bio: null, location: '~/workspace', company: null });
    }
    if (url.includes('/orgs/') && url.includes('/members')) return url.includes('/orgs/nosuchorg/') ? json({ message: 'Not Found' }, 404) : json([{ login: 'octo' }, { login: 'mathname' }, { login: 'empty' }]);
    if (url.includes('/search/issues')) return json({ total_count: 4 });
    if (/\/repos\/[^/]+\/[^/]+\/contributors/.test(url)) return json([], 200, { link: '<https://api.github.com/x?page=7>; rel="last"' });
    if (/\/repos\/[^/]+\/[^/]+\/releases\/latest/.test(url)) return json({ tag_name: 'v1.2.3' });
    if ((m = url.match(/api\.github\.com\/repos\/([^/]+)\/([^/?]+)$/))) {
      if (m[2] === 'missing') return json({ message: 'Not Found' }, 404);
      return json({ name: m[2], full_name: `${m[1]}/${m[2]}`, description: '<img src=x onerror=1> & "quotes"', stargazers_count: 1234, forks_count: 5, open_issues_count: 2, watchers_count: 1234, subscribers_count: 3, language: 'JavaScript', topics: ['a', 'b'], license: { spdx_id: 'MIT' }, pushed_at: new Date().toISOString(), created_at: '2020-01-01T00:00:00Z', owner: { login: m[1] }, fork: false, size: 100, archived: false, default_branch: 'main', homepage: null });
    }
    return json({ message: 'Not Found' }, 404);
  };
}

module.exports = { install, MATH_NAME, dayIso };
