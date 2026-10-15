# API reference

Base URL: `https://contributor-codex.vercel.app` (or your own deployment — see [Deployment](DEPLOYMENT.md)).

- [Conventions](#conventions)
- [Contributor Card](#contributor-card) · [Team Leaderboard](#team-leaderboard) · [Repository Card](#repository-card) · [Achievements](#achievements) · [Codex Collection](#codex-collection)
- [Errors](#errors) · [Caching](#caching) · [Rate limiting](#rate-limiting)
- Reference: [Trophy keys and thresholds](#trophy-keys-and-thresholds) · [Scoring and tiers](#scoring-and-tiers)

## Conventions

- Every endpoint is `GET`-only and returns `image/svg+xml`.
- No API key is needed to call an endpoint. Cards are plain image URLs, so they work in a README, an `<img>` tag, or anywhere that renders an image.
- Each card is a self-contained SVG: any avatar and the font are embedded, so rendering a card makes no further requests.
- `color` is a 6-digit hex value **without** the `#` (for example `ff00aa`). An invalid value is ignored and the default is used.
- Unknown `theme` and `shape` values fall back to the endpoint's default rather than erroring.
- Links inside an `<img>`-embedded SVG are not clickable, so cards carry no GitHub link.

## Contributor Card

`GET /api/card`

A single GitHub user's profile as a card.

| Param | Required | Values | Default |
|---|---|---|---|
| `username` | yes | any GitHub username | — |
| `theme` | no | `cyberpunk` \| `terminal` \| `glass` \| `detailed` | `cyberpunk` |
| `color` | no | 6-digit hex, no `#` | the level's tier color (see [Scoring and tiers](#scoring-and-tiers)) |
| `shape` | no | `hex` \| `circle` \| `rounded` \| `square` | per theme: `hex` (`cyberpunk`), `circle` (`glass`), `rounded` (`detailed`) |

```md
![Card](https://contributor-codex.vercel.app/api/card?username=octocat&theme=detailed&color=ff00aa&shape=rounded)
```

Each theme has its own voice — see [Design notes](DESIGN.md#themes). What differs in the data:

- `cyberpunk` shows level, XP, tier, and a language-based class.
- `terminal` shows a clearance rung and a hex checksum instead of level and XP. It has no avatar, so `shape` has no effect.
- `glass` shows repos, stars, followers, a language donut, and icon chips for join year and location or company. No level, no XP.
- `detailed` shows a letter-grade rank gauge, six stats (repos, stars, forks, followers, pull requests, issues), and a proportional language bar with per-language colors.

## Team Leaderboard

`GET /api/leaderboard`

Ranks the public members of a GitHub organization by XP.

| Param | Required | Values | Default |
|---|---|---|---|
| `org` | yes | any GitHub org login | — |
| `limit` | no | integer, clamped to 1–20 | `10` |
| `theme` | no | `cyberpunk` \| `terminal` \| `glass` | `cyberpunk` |
| `color` | no | 6-digit hex, no `#` | accent `#00e5ff`; on `cyberpunk`, when set, it also replaces each row's own tier color |
| `shape` | no | `hex` \| `circle` \| `rounded` \| `square` | `hex` (`circle` on `glass`) |

```md
![Leaderboard](https://contributor-codex.vercel.app/api/leaderboard?org=vercel&limit=5)
```

- The header reports how many members were ranked against how many are shown (`TOP 5 OF 60`).
- On `cyberpunk` and `glass`, the top three rank badges are gold, silver, and bronze. On `cyberpunk`, each row also has an XP bar drawn relative to first place.
- Long names are truncated with an ellipsis.
- There is no `detailed` theme.
- Only members with a **public** organization membership are listed. An org with none returns `200` with a message card, not an error.
- At most the first 60 public members are ranked. See [GitHub API budget](DEPLOYMENT.md#github-api-budget).

## Repository Card

`GET /api/repo`

| Param | Required | Values | Default |
|---|---|---|---|
| `owner` | yes | repo owner (user or org) | — |
| `repo` | yes | repo name | — |
| `theme` | no | `cyberpunk` \| `terminal` \| `glass` \| `detailed` | `cyberpunk` |
| `color` | no | 6-digit hex, no `#` | `#00e5ff` |

```md
![Repo](https://contributor-codex.vercel.app/api/repo?owner=vercel&repo=next.js&theme=detailed)
```

- Every theme shows stars, forks, open issues, primary language, and license.
- `detailed` adds watchers, default branch, last push, creation date, size, contributor count, latest release tag, and topics.
- Contributor count and release tag are best-effort: if either lookup fails, or the repo has no releases, the card still renders and shows `—` for that field.
- Topic chips size to their own text. A topic that would not fit on the card is omitted.

## Achievements

`GET /api/trophies`

Twelve tiered badges plus an optional custom one.

| Param | Required | Values | Default |
|---|---|---|---|
| `username` | yes | any GitHub username | — |
| `trophies` | no | comma-separated subset of the [trophy keys](#trophy-keys-and-thresholds) | all twelve |
| `badge` | no | `hex` \| `shield` \| `diamond` \| `octagon` \| `circle` \| `square` | `shield` |
| `customLabel` | no | up to 10 characters, letters, numbers, and spaces only | — |
| `customValue` | no | any number | — |
| `customThresholds` | no | 4 comma-separated, strictly ascending numbers | — |
| `color` | no | 6-digit hex, no `#` | the level's tier color |

```md
![Achievements](https://contributor-codex.vercel.app/api/trophies?username=octocat&trophies=STARGAZER,POLYGLOT)
```

The three `custom*` params are all-or-nothing. Unless all three are present and valid, the custom trophy is omitted silently rather than returning an error. Use it for a metric that does not come from GitHub, such as a Codewars rank:

```md
![Achievements](https://contributor-codex.vercel.app/api/trophies?username=octocat&customLabel=CODEWARS&customValue=1450&customThresholds=100,500,1500,5000)
```

There is no `theme` or `shape` param; the card is a single fixed layout.

## Codex Collection

`GET /api/codex`

A compact dossier in one image: a header (avatar, level, XP), a four-stat strip, four tiered badges (stars, repos, languages, years) with a progress bar toward the next tier, and up to five top-language chips.

| Param | Required | Values | Default |
|---|---|---|---|
| `username` | yes | any GitHub username | — |
| `color` | no | 6-digit hex, no `#` | `#00e5ff` |
| `badge` | no | `hex` \| `shield` \| `diamond` \| `octagon` \| `circle` \| `square` | `hex` |
| `streak` | no | `1` adds a strip with current streak, longest streak and total contributions | off |

```md
![Codex](https://contributor-codex.vercel.app/api/codex?username=octocat)
```

`streak=1` costs two extra GraphQL calls and needs `GITHUB_TOKEN` on the server; if that fails the strip is simply left out and the rest of the card still renders. There is no `theme` param; `shape` sets the avatar frame. For a fuller view (bio, location, top repositories), use the Codex Profile page, `/profile.html?u=USERNAME`.

## Stats + Rank

`GET /api/stats`

Stars, commits, pull requests, issues, reviews and repositories contributed to, with a rank grade in a progress ring.

| Param | Required | Values | Default |
|---|---|---|---|
| `username` | yes | any GitHub username | — |
| `hide` | no | comma list of `stars`, `commits`, `prs`, `issues`, `reviews`, `contrib` (at least one stat always stays) | none hidden |
| `theme` | no | `cyberpunk` \| `glass` \| `terminal` | `cyberpunk` |
| `color` | no | 6-digit hex, no `#` | `#00e5ff` |
| `animate` | no | `1` draws the rank ring in | off |
| `bg` `text` `border` `hide_border` | no | [colour overrides](#colour-overrides) | — |

```md
![Stats](https://contributor-codex.vercel.app/api/stats?username=octocat)
```

- Commits and reviews are GitHub's own "last 12 months" totals; stars are summed over the owner's 100 most-starred non-fork repositories; pull requests, issues and "contributed to" are all-time.
- **Rank** is this project's own scale, not a percentile of GitHub users. Score = commits×1 + PRs×4 + issues×2 + reviews×3 + stars×5 + followers×2 + repos contributed to×3, mapped to **C** (<100), **B** (100), **B+** (300), **A** (700), **A+** (1,500), **S** (3,000). The ring shows progress toward the next grade.
- One GraphQL request; needs `GITHUB_TOKEN`; cached for 6 hours.

## Streak Card

`GET /api/streak`

Total contributions, the current streak (with a progress ring relative to your personal best), and the longest streak — each with its date range.

| Param | Required | Values | Default |
|---|---|---|---|
| `username` | yes | any GitHub username | — |
| `theme` | no | `cyberpunk` \| `glass` (light frosted, matches the Contributor card) \| `terminal` | `cyberpunk` |
| `color` | no | 6-digit hex, no `#` | `#00e5ff` |
| `profile` | no | `1` adds a header with avatar, name and join year | off |
| `year` | no | `1` adds a footer: contributions so far this calendar year | off |
| `animate` | no | `1` draws the ring in, flickers the flame and pulses a halo | off |
| `shape` | no | avatar frame for `profile=1`: `hex` \| `circle` \| `rounded` \| `square` | per theme |
| `bg` `text` `border` `hide_border` | no | [colour overrides](#colour-overrides) | — |

```md
![Streak](https://contributor-codex.vercel.app/api/streak?username=octocat)
```

- Counts GitHub's own contribution calendar (the green squares), in UTC days, across every year the account has been active. The total's date range starts on the account's join date ("since day one"), not on its first contribution.
- A streak that was alive yesterday still counts as current while today is empty, so the card doesn't reset to 0 every morning.
- Needs `GITHUB_TOKEN` on the server: the contribution calendar only exists in GitHub's GraphQL API, which has no anonymous access. Without it the card renders a `503` message.
- Cached for 6 hours (24 hours stale-while-revalidate).
- Every calendar year from the account's join year to now is requested, so an old streak can't be dropped because GitHub's own year list omitted that year.
- **Number looks wrong?** Add `&debug=1` to the URL. It returns JSON (no card) showing the first and last day seen, days and contributions per year, and the five longest streaks found. If a streak you remember is missing there, GitHub isn't exposing those days to the server token — usually private-repo activity with "Include private contributions on my profile" turned off.

## Activity Graph

`GET /api/activity`

A smooth area graph of contributions with a labelled peak.

| Param | Required | Values | Default |
|---|---|---|---|
| `username` | yes | any GitHub username | — |
| `days` | no | `30` \| `90` \| `180` \| `365` | `90` |
| `theme` | no | `cyberpunk` \| `glass` \| `terminal` | `cyberpunk` |
| `color` | no | 6-digit hex, no `#` | `#00e5ff` |
| `animate` | no | `1` draws the line in (static when the viewer prefers reduced motion) | off |
| `bg` `text` `border` `hide_border` | no | [colour overrides](#colour-overrides) | — |

- 30 and 90 days plot one point per day; 180 and 365 sum into weeks so the line stays readable.
- Same data source, token requirement and caching as the streak card.

## Top Languages

`GET /api/langs`

A stacked bar plus legend of the languages you write the most.

| Param | Required | Values | Default |
|---|---|---|---|
| `username` | yes | any GitHub username | — |
| `limit` | no | integer `2`–`8` | `6` |
| `bg` `text` `border` `hide_border` | no | [colour overrides](#colour-overrides) | — |
| `theme` | no | `cyberpunk` \| `glass` \| `terminal` | `cyberpunk` |
| `color` | no | 6-digit hex, no `#` (used for languages with no known colour) | `#00e5ff` |

- Percentages are by bytes of code across the six most-starred owned, non-fork repositories — the same sample `/api/card` uses.

## Status

`GET /api/status` returns JSON with the server token's remaining GitHub budget (REST, GraphQL, search), when each resets, and a warning under 10%. It uses GitHub's rate-limit endpoint, which costs no quota, and is cached for 60 seconds. The token is never included. If the token is missing or rejected, the response says so.

## Errors

Errors are returned as a rendered SVG, so a broken `<img>` shows a readable message instead of a blank box, together with a matching HTTP status:

| Status | Meaning |
|---|---|
| `400` | a required param is missing |
| `404` | the user, org, or repo does not exist |
| `429` | rate limited by this service's own firewall — see [Rate limiting](#rate-limiting) |
| `503` | rate limited by GitHub — the deployment needs a `GITHUB_TOKEN` |
| `500` | unexpected failure |

## Colour overrides

The streak, activity and languages cards accept per-element colours on top of any theme. All take six hex digits (no `#`).

| Param | Sets |
|---|---|
| `bg` | card background. Text switches to a readable light or dark automatically if you don't set `text` |
| `text` | main text. Ignored if it wouldn't reach 3:1 contrast against the background |
| `border` | border and divider lines |
| `hide_border` | `1` removes the border |

```md
![Streak](https://contributor-codex.vercel.app/api/streak?username=octocat&bg=1e1e2e&text=cdd6f4&border=45475a&color=cba6f7)
```

The Card Builder has one-tap presets (Mocha, Tokyo Night, Dracula, Nord, GitHub Dark, Rosé Pine, Solarized).

## Accent colours

`color=` takes six hex digits. A colour that would vanish into the card is adjusted instead of rendering a blank one: on the dark themes near-black becomes a light steel and dark shades are lifted until they read; on `glass`, near-white is darkened. Colours that already read well are never touched.

## Response headers

Every card is served with `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:`, `X-Content-Type-Options: nosniff` and `Access-Control-Allow-Origin: *` (so the builder can export PNGs). Cards carry `role="img"` and a `<title>` for screen readers. Cache-Control includes `stale-if-error=604800`, so when GitHub is down or rate-limited the last good card keeps being served for up to a week.

To force a README image to refresh sooner (GitHub caches images for hours), append any unused parameter, e.g. `&v=2`.

## Caching

Responses are cached at Vercel's edge via `Cache-Control`:

| Response | Fresh for | Stale-while-revalidate |
|---|---|---|
| `/api/card`, `/api/repo`, `/api/trophies`, `/api/codex` | 1 hour | 24 hours |
| `/api/streak`, `/api/activity`, `/api/langs` | 6 hours | 24 hours |
| `/api/leaderboard` | 6 hours | 24 hours |
| Leaderboard for an org with no public members | 1 hour | — |
| Errors (`404`, `503`, `500`) | 1 minute | — |
| Rate-limited (`429`) | not cached (`no-store`) | — |

A change on GitHub can therefore take an hour (six for a leaderboard) to appear, and the first request after that window may still be served the older copy while a fresh one is generated. The leaderboard caches longest because ranking every member is the most expensive request the service makes.

## Rate limiting

Requests are limited per IP. A limited request receives `429` with a rendered message card. This is separate from GitHub's own limits, which surface as `503`. Operators: the matching firewall rules are listed in [Deployment](DEPLOYMENT.md#rate-limit-rules).

## Trophy keys and thresholds

Each trophy is a single check against its own thresholds. There is no weighted composite. A trophy tiers INITIATE → OPERATIVE → SPECIALIST → ELITE → LEGENDARY as its value crosses each of the four thresholds in turn.

| Key | Measures | Thresholds |
|---|---|---|
| `STARGAZER` | total stars across owned, non-fork repos | 10 / 50 / 200 / 1000 |
| `BUILDER` | public repo count | 10 / 25 / 50 / 100 |
| `INFLUENCE` | follower count | 10 / 50 / 200 / 1000 |
| `VETERAN` | whole years since account creation | 1 / 3 / 5 / 8 |
| `POLYGLOT` | distinct primary languages across owned, non-fork repos | 3 / 6 / 10 / 15 |
| `FORKED` | total forks across owned, non-fork repos | 5 / 25 / 100 / 500 |
| `OPEN_SOURCE` | owned, non-fork repos with a recognized SPDX license | 1 / 5 / 15 / 30 |
| `NETWORKER` | accounts the user follows | 10 / 50 / 200 / 500 |
| `SNIPPETS` | public gists | 3 / 10 / 30 / 100 |
| `ACTIVE` | owned, non-fork repos pushed to in the last 90 days | 1 / 3 / 6 / 12 |
| `HEADLINER` | stars on the single most-starred owned repo | 5 / 25 / 100 / 500 |
| `CURATOR` | owned, non-fork repos with at least one topic | 3 / 8 / 15 / 30 |

An unearned (INITIATE) badge is drawn as a dashed, unfilled outline on purpose: it signals "not earned yet". The five newest keys need no extra GitHub requests — they're read from the two calls every trophy card already makes.

## Scoring and tiers

Every score is self-referential — computed from the profile alone, never relative to other users — and the formula is available in a hover tooltip on the card.

**XP** (`cyberpunk`, `terminal` checksum, `/api/codex`, and leaderboard ordering):

```
XP = repos × 15 + stars × 5 + followers × 10 + years × 20
level = min(99, 1 + floor(sqrt(XP) / 6))
```

Repos are the user's public repo count; stars are totalled across owned, non-fork repos; years are whole years since account creation.

**Tiers and default accent color.** Unless `color` is set, a card's accent comes from its level:

| Level | Tier | Color |
|---|---|---|
| 1–4 | INITIATE | `#4ade80` |
| 5–9 | OPERATIVE | `#00e5ff` |
| 10–15 | SPECIALIST | `#8b5cf6` |
| 16–24 | ELITE | `#ff4d6d` |
| 25+ | LEGENDARY | `#ffb020` |

**Rank grade** (`detailed` theme only). A letter grade from a soft-capped weighted sum:

```
score = sqrt(stars/300)×30 + sqrt(repos/60)×20 + sqrt(followers/300)×25
      + sqrt(prs/100)×15  + sqrt(issues/60)×10        (each term capped at its weight)
```

| Score | Grade |
|---|---|
| 88+ | S+ |
| 74–87 | S |
| 56–73 | A |
| 38–55 | B |
| 20–37 | C |
| below 20 | D |

The square root gives realistic activity levels a fair score instead of leaving everything below top-percentile numbers at the bottom. Pull request and issue counts come from GitHub's Search API; if that lookup fails they count as zero, so a failed lookup can only lower a grade, never raise it.
