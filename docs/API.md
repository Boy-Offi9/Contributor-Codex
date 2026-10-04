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

Seven tiered badges plus an optional custom one.

| Param | Required | Values | Default |
|---|---|---|---|
| `username` | yes | any GitHub username | — |
| `trophies` | no | comma-separated subset of the [trophy keys](#trophy-keys-and-thresholds) | all seven |
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

A compact dossier in one image: a header (avatar, level, XP), a four-stat strip, four tiered shields (stars, repos, languages, years), and up to five top-language chips.

| Param | Required | Values | Default |
|---|---|---|---|
| `username` | yes | any GitHub username | — |
| `color` | no | 6-digit hex, no `#` | `#00e5ff` |

```md
![Codex](https://contributor-codex.vercel.app/api/codex?username=octocat)
```

There is no `theme` or `shape` param. For a fuller view (bio, location, top repositories), use the Codex Profile page, `/profile.html?u=USERNAME`.

## Errors

Errors are returned as a rendered SVG, so a broken `<img>` shows a readable message instead of a blank box, together with a matching HTTP status:

| Status | Meaning |
|---|---|
| `400` | a required param is missing |
| `404` | the user, org, or repo does not exist |
| `429` | rate limited by this service's own firewall — see [Rate limiting](#rate-limiting) |
| `503` | rate limited by GitHub — the deployment needs a `GITHUB_TOKEN` |
| `500` | unexpected failure |

## Caching

Responses are cached at Vercel's edge via `Cache-Control`:

| Response | Fresh for | Stale-while-revalidate |
|---|---|---|
| `/api/card`, `/api/repo`, `/api/trophies`, `/api/codex` | 1 hour | 24 hours |
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

An unearned (INITIATE) shield is drawn dim and unfilled on purpose: it signals "not earned yet".

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
