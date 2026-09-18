# Contributor Codex

<p align="center">
  <a href="https://github-tech-cards.vercel.app"><img src="https://img.shields.io/badge/demo-live-0EA5E9?style=for-the-badge&logo=vercel&logoColor=white" alt="Live demo"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D18-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node >= 18">
  <img src="https://img.shields.io/badge/no%20database-required-7B2FF7?style=for-the-badge" alt="No database required">
</p>

Sci-fi RPG-style GitHub cards, rendered server-side as SVG. Org-aware: point it at a GitHub org and every public member becomes a card, a leaderboard, or a full roster page.

## Cards

| Card | Endpoint |
|---|---|
| Contributor | `/api/card?username=` |
| Team / Leaderboard | `/api/leaderboard?org=&limit=` |
| Repository | `/api/repo?owner=&repo=` |
| Organization roster | `/` (interactive, not embeddable) |

```md
![Card](https://github-tech-cards.vercel.app/api/card?username=octocat)
```

All params: `theme`, `color` (hex, no `#`) on every card; `limit` (leaderboard only, max 20).

## Themes

`cyberpunk` (default) · `terminal` · `glass` · `detailed` (Contributor Card only — bio, full stat grid, language chips, no GitHub link since links inside an `<img>`-embedded SVG don't work)

## Scoring

```
XP = repos × 15 + stars × 5 + followers × 10 + years × 20
```

Self-referential only — never compared against other users. Formula is shown on-card via hover tooltip.

## Rate limiting

Per-IP via `@vercel/firewall`. Requires matching Firewall rules in the Vercel dashboard: `card-endpoint`, `leaderboard-endpoint`, `repo-endpoint`. Leave each rule's action at default — 429s are returned as SVG from code, not Vercel's block page.

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
