# Contributor Codex

<p align="center">
  <a href="https://contributor-codex.vercel.app"><img src="https://img.shields.io/badge/demo-live-0EA5E9?style=for-the-badge&logo=vercel&logoColor=white" alt="Live demo"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D18-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node >= 18">
  <img src="https://img.shields.io/badge/no%20database-required-7B2FF7?style=for-the-badge" alt="No database required">
</p>

Contributor Codex turns GitHub data into shareable visuals: point it at a username, an organization, or a repository, and it renders a hand-drawn SVG card, a tiered achievement badge, a team leaderboard, or a full visual profile — all server-side, all embeddable as a plain image URL, no client-side script or build step required.

It's org-aware: point it at a GitHub org and every public member becomes a card, a ranked leaderboard entry, or a row in the roster. It's also composable — the same underlying stats power a single card, a full profile page, or a one-image "collection" that folds several of them together.

**Live at [contributor-codex.vercel.app](https://contributor-codex.vercel.app).**

```md
![Card](https://contributor-codex.vercel.app/api/card?username=octocat)
```

## Table of contents

- [API reference](#api-reference)
- [Frontend pages](#frontend-pages)
- [Themes](#themes)
- [Achievements](#achievements)
- [Scoring](#scoring)
- [Caching](#caching)
- [Rate limiting](#rate-limiting)
- [Architecture](#architecture)
- [Setup & development](#setup--development)
- [Limitations](#limitations)

## API reference

Every endpoint is a Vercel serverless function returning `image/svg+xml`. All are GET-only, unauthenticated to call (no API key needed to *view* a card — `GITHUB_TOKEN` only raises the server's own GitHub rate limit, see [Setup](#setup--development)).

### `GET /api/card` — Contributor Card

A single GitHub user's profile as a card: level, XP, top language, and repo/star/follower stats.

| Param | Required | Values | Default |
|---|---|---|---|
| `username` | yes | any GitHub username | — |
| `theme` | no | `cyberpunk` \| `terminal` \| `glass` \| `detailed` | `cyberpunk` |
| `color` | no | 6-digit hex, no `#` (e.g. `ff00aa`) | theme's own accent |

```md
![Card](https://contributor-codex.vercel.app/api/card?username=octocat&theme=detailed&color=ff00aa)
```

`detailed` additionally shows bio, a full stat grid, and byte-weighted top-language chips (one extra GitHub API call to compute). It omits the GitHub profile link present in other themes, since links inside an `<img>`-embedded SVG aren't clickable.

### `GET /api/leaderboard` — Team / Leaderboard

Ranks every public member of a GitHub org by a transparent, self-referential XP formula (see [Scoring](#scoring)).

| Param | Required | Values | Default |
|---|---|---|---|
| `org` | yes | any GitHub org login | — |
| `limit` | no | integer, clamped to 1–20 | `10` |
| `theme` | no | `cyberpunk` \| `terminal` \| `glass` | `cyberpunk` |
| `color` | no | 6-digit hex, no `#` | theme's own accent |

```md
![Leaderboard](https://contributor-codex.vercel.app/api/leaderboard?org=vercel&limit=5)
```

No `detailed` theme here — see [Limitations](#limitations) for why per-member byte-weighting isn't worth the added cost at this endpoint.

### `GET /api/repo` — Repository Card

Stars, forks, open issues, license, and topics for a single repository.

| Param | Required | Values | Default |
|---|---|---|---|
| `owner` | yes | repo owner (user or org) | — |
| `repo` | yes | repo name | — |
| `theme` | no | `cyberpunk` \| `terminal` \| `glass` \| `detailed` | `cyberpunk` |
| `color` | no | 6-digit hex, no `#` | theme's own accent |

```md
![Repo](https://contributor-codex.vercel.app/api/repo?owner=vercel&repo=next.js&theme=detailed)
```

`detailed` additionally shows the default branch, creation date, size, contributor count, and latest release tag (two extra GitHub API calls; both fail soft — a rate limit or a repo with no releases still renders a complete card, just missing that one field).

### `GET /api/trophies` — Achievements

Seven independent tiered badges, plus an optional user-supplied custom one.

| Param | Required | Values | Default |
|---|---|---|---|
| `username` | yes | any GitHub username | — |
| `trophies` | no | comma-separated subset of the keys below | all seven |
| `customLabel` | no | up to 10 characters, letters/numbers/spaces only | — |
| `customValue` | no | any number | — |
| `customThresholds` | no | 4 comma-separated, strictly ascending numbers | — |

Trophy keys: `STARGAZER`, `BUILDER`, `INFLUENCE`, `VETERAN`, `POLYGLOT`, `FORKED`, `OPEN_SOURCE`. Each tiers INITIATE → OPERATIVE → SPECIALIST → ELITE → LEGENDARY against its own fixed thresholds — see [Achievements](#achievements) for what each one measures.

```md
![Achievements](https://contributor-codex.vercel.app/api/trophies?username=octocat&trophies=STARGAZER,POLYGLOT)
```

The three `custom*` params are all-or-nothing: unless all three are present and valid (four strictly ascending thresholds), the custom trophy is silently omitted rather than erroring.

### `GET /api/codex` — Codex Collection

One image instead of several: a compact header, a 4-stat strip, four achievement shields, and up to five top-language chips, folded into a single SVG.

| Param | Required | Values | Default |
|---|---|---|---|
| `username` | yes | any GitHub username | — |
| `color` | no | 6-digit hex, no `#` | `#00e5ff` |

```md
![Codex](https://contributor-codex.vercel.app/api/codex?username=octocat)
```

No `theme` param — Collections is intentionally a single fixed layout. For an interactive equivalent with more detail (bio, location, top repos), see [`/profile.html`](#frontend-pages) instead.

### Errors

Every endpoint returns errors as a rendered SVG (so a broken `<img>` still shows a readable message instead of a blank box), with a matching HTTP status:

| Status | Meaning |
|---|---|
| `400` | missing a required param |
| `404` | the user, org, or repo doesn't exist |
| `429` | rate limited by this service's own firewall — see [Rate limiting](#rate-limiting) |
| `503` | rate limited by GitHub itself (set `GITHUB_TOKEN` to avoid this) |
| `500` | unexpected failure |

## Frontend pages

Four static, self-contained HTML pages (no shared JS bundle, no build step) sit alongside the API:

| Page | Path | Purpose |
|---|---|---|
| Landing | `/` | Overview, a live card-generator demo, and links into the three tools below |
| Organization Roster | `/roster.html` | Load any org; every public member's card renders in a grid, with a click-through dossier |
| Card Builder | `/builder.html` | Pick a card type, fill in fields, get a live preview plus ready-to-copy Markdown/URL/HTML |
| Codex Profile | `/profile.html?u=USERNAME` | A shareable page per contributor — the generated cards plus bio, location, company, and top repositories |

The roster and profile pages fetch GitHub client-side (in the visitor's browser), with an optional personal-access-token field to raise the rate limit from 60/hr to 5,000/hr — that token never leaves the browser tab. The API endpoints above are separate: they run server-side and use the deployment's own `GITHUB_TOKEN`.

Icons across all four pages are hand-drawn inline SVG in the same hex/shield motif as the cards — no emoji, no icon font, no external icon library, keeping every page a single dependency-free file.

## Themes

`cyberpunk` (default) · `terminal` · `glass` · `detailed`

- **`cyberpunk`** and **`detailed`** share a neon aesthetic: an `feGaussianBlur` glow filter on the border, avatar frame, level badge, and stat values; a faint circuit-grid texture; a second gradient for two-tone depth; and small stroke icons next to each stat.
- **`terminal`** is a flat green-on-black CRT look.
- **`glass`** is a light, frosted-panel look.

`terminal` and `glass` intentionally don't carry the glow treatment — it wouldn't fit either aesthetic.

`detailed` is the information-dense variant, available on Contributor Card and Repository Card (see their sections in the [API reference](#api-reference) above for exactly what it adds to each).

## Achievements

Seven independent badges, each a single "did this cross this line" check against its own plain threshold — not a weighted composite, so there's nothing to argue is unfairly weighted:

| Key | Measures | Thresholds |
|---|---|---|
| `STARGAZER` | total stars across owned repos | 10 / 50 / 200 / 1000 |
| `BUILDER` | public repo count | 10 / 25 / 50 / 100 |
| `INFLUENCE` | follower count | 10 / 50 / 200 / 1000 |
| `VETERAN` | years since account creation | 1 / 3 / 5 / 8 |
| `POLYGLOT` | distinct languages used | 3 / 6 / 10 / 15 |
| `FORKED` | total forks across owned repos | 5 / 25 / 100 / 500 |
| `OPEN_SOURCE` | owned repos with a real SPDX license | 1 / 5 / 15 / 30 |

Each tiers INITIATE → OPERATIVE → SPECIALIST → ELITE → LEGENDARY. A **custom trophy** slot lets you bolt on any non-GitHub metric (a Codewars rank, a LeetCode streak) through the same tiered-shield rendering — see the `/api/trophies` params above. It isn't exposed in the Card Builder yet; build that URL by hand.

## Scoring

```
XP = repos × 15 + stars × 5 + followers × 10 + years × 20
```

Self-referential only — never compared against other users, and shown on-card via a hover tooltip on the XP value so the formula is never hidden. Level is derived from XP on a square-root curve, capped at 99.

## Caching

Every successful response sets `Cache-Control` for Vercel's edge cache:

| Endpoint | Fresh for | Stale-while-revalidate |
|---|---|---|
| `/api/card`, `/api/repo`, `/api/trophies`, `/api/codex` | 1 hour | 24 hours |
| `/api/leaderboard` | 6 hours | 24 hours |
| Error responses (404/503/500) | 1 minute | — |
| Rate-limited responses (429) | not cached (`no-store`) | — |

Leaderboard caches longer because ranking every member is the most expensive request this service makes — see [Limitations](#limitations).

## Rate limiting

Per-IP via `@vercel/firewall`. Requires a matching Firewall rule in the Vercel dashboard for each endpoint: `card-endpoint`, `leaderboard-endpoint`, `repo-endpoint`, `trophies-endpoint`, `codex-endpoint`. Leave each rule's action at default — a `429` is returned as a rendered SVG from application code, not Vercel's own block page.

This is separate from GitHub's own rate limiting (60 requests/hour unauthenticated, 5,000/hour with a token) — see `GITHUB_TOKEN` in [Setup](#setup--development).

## Architecture

Vercel serverless functions using the Web `Request`/`Response` API directly (no Next.js, no framework) · hand-written SVG, no charting or image library · [`@boy-offi9-inc/reqkit`](https://github.com/boy-offi9-inc/reqkit) for GitHub API retry/dedupe · `@vercel/firewall` for per-IP rate limiting.

Each endpoint file (`api/*.js`) is independently deployable and intentionally duplicates small helpers (error rendering, tiered-shield layout) rather than sharing them beyond `api/_lib/shared.js`, which holds only what's genuinely reused across every card: GitHub fetching, avatar embedding, and stat computation.

## Setup & development

```
npm install
```

Set `GITHUB_TOKEN` as an environment variable in the Vercel dashboard (not committed to the repo) to raise the server's own GitHub API limit from 60/hour to 5,000/hour. Without it, the deployment shares the unauthenticated limit across every visitor.

Font data is pre-generated and committed, so deployed functions embed Chakra Petch with zero runtime network calls:

```
npm run build-font
```

Only needs re-running if the pinned font weights change — it fetches Chakra Petch and writes `api/_lib/font-data.js` (a plain JS constant, not fetched at request time).

## Limitations

- Org roster and leaderboard both require the org to have at least one member with a **public** organization membership — GitHub's API only lists those.
- `/api/leaderboard` fetches members through a 4-worker concurrent pool rather than one at a time, and caps at the first 60 public members — very large orgs get a representative ranking rather than risking a timeout trying to rank everyone.
- Contributor Card's `detailed` theme byte-weights the top language across a user's 6 most-starred repos (one extra API call each). Leaderboard intentionally keeps the cheaper repo-count method instead — per-member byte-weighting there would multiply an already more expensive request.
- The custom trophy slot (`/api/trophies`) isn't yet exposed in the Card Builder UI.
