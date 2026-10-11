// Contribution-calendar data for the streak and activity cards.
//
// GitHub only exposes the calendar through GraphQL (the REST API has no
// equivalent), and GraphQL always needs a token. A calendar window can span at
// most one year, so lifetime totals take one aliased query covering every year
// the user was active. That is two HTTP calls per card render, both hidden
// behind the long s-maxage the endpoints send.

const GQL = 'https://api.github.com/graphql';

async function gql(query, variables, token) {
  const res = await fetch(GQL, {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'contributor-codex' },
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

// Returns { login, name, createdAt, days: [{ date: 'YYYY-MM-DD', count }] } sorted ascending.
async function fetchCalendar(username, token) {
  if (!token) {
    const err = new Error('GITHUB_TOKEN required');
    err.status = 401;
    throw err;
  }
  const head = await gql(
    'query($login:String!){user(login:$login){login name createdAt contributionsCollection{contributionYears}}}',
    { login: username },
    token,
  );
  const user = head.user;
  if (!user) {
    const err = new Error('not found');
    err.status = 404;
    throw err;
  }
  const years = (user.contributionsCollection.contributionYears || []).slice().sort((a, b) => a - b);
  const nowYear = new Date().getUTCFullYear();
  const wanted = years.length ? years : [nowYear];

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
        if (d.date.startsWith(String(y))) byDate.set(d.date, d.contributionCount); // drops the neighbouring year's padding days
      }
    }
  }
  const days = [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([date, count]) => ({ date, count }));
  return { login: user.login, name: user.name, createdAt: user.createdAt, days };
}

const dayNum = (iso) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86400000);

// Streak maths. Dates are GitHub's own UTC calendar days. A streak that was
// alive yesterday still counts as current while today is empty — otherwise
// every card would reset to 0 each morning until the first commit.
function computeStreaks(days, todayIso = new Date().toISOString().slice(0, 10)) {
  const total = days.reduce((a, d) => a + d.count, 0);
  const firstActive = days.find((d) => d.count > 0);

  let longest = { length: 0, start: null, end: null };
  let run = null;
  for (const d of days) {
    if (d.count > 0) {
      if (run && dayNum(d.date) === dayNum(run.end) + 1) { run.end = d.date; run.length += 1; }
      else run = { start: d.date, end: d.date, length: 1 };
      if (run.length > longest.length) longest = { ...run };
    } else if (d.date !== todayIso) {
      run = null;
    }
  }

  // current: walk back from today (or yesterday if today is still empty)
  const map = new Map(days.map((d) => [d.date, d.count]));
  let cursor = dayNum(todayIso);
  const isoOf = (n) => new Date(n * 86400000).toISOString().slice(0, 10);
  if (!(map.get(isoOf(cursor)) > 0)) cursor -= 1;
  let current = { length: 0, start: null, end: null };
  while (map.get(isoOf(cursor)) > 0) {
    current = { length: current.length + 1, start: isoOf(cursor), end: current.end || isoOf(cursor) };
    cursor -= 1;
  }
  return { total, since: firstActive ? firstActive.date : null, current, longest };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(iso, withYear) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}${withYear ? `, ${y}` : ''}`;
}
// "Sep 18 – Oct 11" within the current year, otherwise with years.
function fmtRange(start, end, todayIso = new Date().toISOString().slice(0, 10), openEnded = false) {
  if (!start) return 'no streak yet';
  const nowYear = todayIso.slice(0, 4);
  const sameYear = start.slice(0, 4) === end.slice(0, 4) && end.slice(0, 4) === nowYear;
  const left = fmtDate(start, !sameYear);
  const right = openEnded ? 'Present' : fmtDate(end, !sameYear);
  return `${left} – ${right}`;
}

module.exports = { fetchCalendar, computeStreaks, fmtRange, fmtDate };
