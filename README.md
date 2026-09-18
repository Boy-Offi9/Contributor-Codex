# Contributor Codex

<p align="center">
  <a href="https://contributor-codex.vercel.app"><img src="https://img.shields.io/badge/demo-live-0EA5E9?style=for-the-badge&logo=vercel&logoColor=white" alt="Live demo"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D18-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node >= 18">
  <img src="https://img.shields.io/badge/no%20database-required-7B2FF7?style=for-the-badge" alt="No database required">
</p>

Sci-fi RPG-style GitHub cards, rendered server-side as SVG. Org-aware: point it at a GitHub org and every public member becomes a card, a leaderboard, or a full roster page.

Live at [contributor-codex.vercel.app](https://contributor-codex.vercel.app).

## Cards

| Card | Endpoint |
|---|---|
| Contributor | `/api/card?username=` |
| Team / Leaderboard | `/api/leaderboard?org=&limit=` |
| Repository | `/api/repo?owner=&repo=` |
| Achievements | `/api/trophies?username=&trophies=` |
| Organization roster | `/` (interactive, not embeddable) |

```md
![Card](https://contributor-codex.vercel.app/api/card?username=octocat)
```

All params: `theme`, `color` (hex, no `#`) on every card; `limit` (leaderboard only, max 20).

## Themes

`cyberpunk` (default) · `terminal` · `glass` · `detailed`

`detailed` on Contributor Card adds bio, full stat grid, and language chips — no GitHub link, since links inside an `<img>`-embedded SVG don't work. On Repository Card it adds topics, watchers, default branch, last push date, and size.

## Achievements

`/api/trophies` — six independent badges (STARGAZER, BUILDER, INFLUENCE, VETERAN, POLYGLOT, FORKED), each tiered INITIATE→OPERATIVE→SPECIALIST→ELITE→LEGENDARY by its own plain threshold. Filter with `?trophies=STARGAZER,POLYGLOT`.

Unlike XP, these aren't a weighted composite — each trophy is a single "did this cross this line" check, so there's nothing to argue is unfair or arbitrarily weighted.

## Scoring

```
XP = repos × 15 + stars × 5 + followers × 10 + years × 20
```

Self-referential only — never compared against other users. Formula is shown on-card via hover tooltip.

## Rate limiting

Per-IP via `@vercel/firewall`. Requires matching Firewall rules in the Vercel dashboard: `card-endpoint`, `leaderboard-endpoint`, `repo-endpoint`, `trophies-endpoint`. Leave each rule's action at default — 429s are returned as SVG from code, not Vercel's block page.

## Setup

```
npm install
```

`GITHUB_TOKEN` env var in Vercel (not committed) — 60/hr → 5,000/hr.

## Stack

Vercel serverless functions (Web `Request`/`Response`, no Next.js) · hand-written SVG · [`@boy-offi9-inc/reqkit`](https://github.com/boy-offi9-inc/reqkit) for retry/dedupe · `@vercel/firewall` for rate limiting

## Limitations

- Org roster requires a public member list
- `/api/leaderboard` fetches members sequentially — risks timeout past ~20-30 members
- Chakra Petch is fetched and base64-embedded per cold start, not bundled
