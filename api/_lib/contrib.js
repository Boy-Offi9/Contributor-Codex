
const GQL = 'https://api.github.com/graphql';

async function gql(query, variables, token) {
  const res = await fetch(GQL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'contributor-codex' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const err = new Error(String(res.status));
    err.status = res.status;
    throw err;
  }
  const body = await res.json();
  if (body.errors && body.errors.length) {
    const notFound = body.errors.some((e) => e.type === 'NOT_FOUND');
    const err = new Error(body.errors[0].message || 'graphql error');
    err.status = notFound ? 404 : 502;
    throw err;
  }
  return body.data;
}

async function fetchCalendar(username, token) {
  if (!token) {
    const err = new Error('GITHUB_TOKEN required');
    err.status = 401;
    throw err;
  }
  const head = await gql(
    'query($login:String!){user(login:$login){login name createdAt avatarUrl(size:160)}}',
    { login: username },
    token,
  );
  const user = head.user;
  if (!user) {
    const err = new Error('not found');
    err.status = 404;
    throw err;
  }
  const nowYear = new Date().getUTCFullYear();
  const joinYear = Math.min(nowYear, Math.max(2008, new Date(user.createdAt).getUTCFullYear() || nowYear));
  const wanted = [];
  for (let y = joinYear; y <= nowYear; y++) wanted.push(y);

  const fields = wanted.map((y) => {
    const to = y === nowYear ? new Date().toISOString() : `${y}-12-31T23:59:59Z`;
    return `y${y}:contributionsCollection(from:"${y}-01-01T00:00:00Z",to:"${to}"){contributionCalendar{weeks{contributionDays{date contributionCount}}}}`;
  }).join(' ');
  const data = await gql(`query($login:String!){user(login:$login){${fields}}}`, { login: username }, token);

  const byDate = new Map();
  for (const y of wanted) {
    const weeks = data.user[`y${y}`].contributionCalendar.weeks;
    for (const w of weeks) {
      for (const d of w.contributionDays) {
        if (d.date.startsWith(String(y))) byDate.set(d.date, d.contributionCount);
      }
    }
  }
  const days = [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([date, count]) => ({ date, count }));
  return { login: user.login, name: user.name, createdAt: user.createdAt, avatarUrl: user.avatarUrl || null, days };
}

async function fetchStats(username, token) {
  if (!token) {
    const err = new Error('GITHUB_TOKEN required');
    err.status = 401;
    throw err;
  }
  const data = await gql(
    `query($login:String!){user(login:$login){
      login name avatarUrl(size:160) createdAt
      followers{totalCount}
      contributionsCollection{totalCommitContributions totalPullRequestReviewContributions}
      pullRequests{totalCount}
      issues{totalCount}
      repositoriesContributedTo(first:1,contributionTypes:[COMMIT,ISSUE,PULL_REQUEST,REPOSITORY]){totalCount}
      repositories(first:100,ownerAffiliations:OWNER,isFork:false,orderBy:{field:STARGAZERS,direction:DESC}){nodes{stargazerCount}}
    }}`,
    { login: username },
    token,
  );
  const u = data.user;
  if (!u) {
    const err = new Error('not found');
    err.status = 404;
    throw err;
  }
  return {
    login: u.login,
    name: u.name,
    avatarUrl: u.avatarUrl || null,
    createdAt: u.createdAt,
    followers: u.followers.totalCount,
    stars: u.repositories.nodes.reduce((a, r) => a + r.stargazerCount, 0),
    commits: u.contributionsCollection.totalCommitContributions,
    reviews: u.contributionsCollection.totalPullRequestReviewContributions,
    prs: u.pullRequests.totalCount,
    issues: u.issues.totalCount,
    contributedTo: u.repositoriesContributedTo.totalCount,
  };
}

const dayNum = (iso) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86400000);

function listStreaks(days) {
  const runs = [];
  let run = null;
  for (const d of days) {
    if (d.count > 0) {
      if (run && dayNum(d.date) === dayNum(run.end) + 1) {
        run.end = d.date;
        run.length += 1;
      } else {
        run = { start: d.date, end: d.date, length: 1 };
        runs.push(run);
      }
    } else {
      run = null;
    }
  }
  return runs;
}

function computeStreaks(days, todayIso = new Date().toISOString().slice(0, 10)) {
  const total = days.reduce((a, d) => a + d.count, 0);
  const firstActive = days.find((d) => d.count > 0);
  const runs = listStreaks(days);

  const none = { length: 0, start: null, end: null };
  const longest = runs.reduce((best, r) => (r.length > best.length ? { ...r } : best), none);

  const yesterday = new Date(dayNum(todayIso) * 86400000 - 86400000).toISOString().slice(0, 10);
  const last = runs[runs.length - 1];
  const current = last && (last.end === todayIso || last.end === yesterday) ? { ...last } : none;

  return { total, since: firstActive ? firstActive.date : null, current, longest };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(iso, withYear) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}${withYear ? `, ${y}` : ''}`;
}
function fmtRange(start, end, todayIso = new Date().toISOString().slice(0, 10), openEnded = false) {
  if (!start) return 'no streak yet';
  const nowYear = todayIso.slice(0, 4);
  const [sy, sm] = [start.slice(0, 4), Number(start.slice(5, 7))];
  const [ey, em] = [end.slice(0, 4), Number(end.slice(5, 7))];
  if (sy !== ey) {
    return `${MONTHS[sm - 1]} ${sy} – ${openEnded ? 'Present' : `${MONTHS[em - 1]} ${ey}`}`;
  }
  const left = fmtDate(start, false);
  const right = openEnded ? 'Present' : fmtDate(end, false);
  if (sy === nowYear) return `${left} – ${right}`;
  return `${left} – ${right}${openEnded ? '' : ','} ${sy}`.replace(' Present,', ' Present');
}

module.exports = { fetchCalendar, fetchStats, computeStreaks, listStreaks, fmtRange, fmtDate };
