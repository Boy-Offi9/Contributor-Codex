<h1 align="center">Contributor Codex</h1>

<p align="center">
  <b>GitHub activity, compiled into a codex.</b><br>
  Cards, achievements, leaderboards, and profiles — rendered as SVG, embedded as an image URL.
</p>

<p align="center">
  <a href="https://contributor-codex.vercel.app"><img src="https://img.shields.io/badge/demo-live-0EA5E9?style=for-the-badge&logo=vercel&logoColor=white" alt="Live demo"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D18-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node >= 18">
  <img src="https://img.shields.io/badge/no%20database-required-7B2FF7?style=for-the-badge" alt="No database required">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-F59E0B?style=for-the-badge" alt="MIT license"></a>
</p>

<p align="center">
  <a href="https://contributor-codex.vercel.app">Live site</a> ·
  <a href="docs/API.md">API reference</a> ·
  <a href="docs/DEPLOYMENT.md">Deployment</a> ·
  <a href="docs/DESIGN.md">Design notes</a>
</p>

<table>
  <tr>
    <td align="center"><img src="https://contributor-codex.vercel.app/api/card?username=octocat&amp;theme=cyberpunk" width="400" alt="Cyberpunk theme card"><br><sub><b>cyberpunk</b> — the RPG dossier</sub></td>
    <td align="center"><img src="https://contributor-codex.vercel.app/api/card?username=octocat&amp;theme=terminal" width="400" alt="Terminal theme card"><br><sub><b>terminal</b> — a hacker's session log</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="https://contributor-codex.vercel.app/api/card?username=octocat&amp;theme=glass" width="400" alt="Glass theme card"><br><sub><b>glass</b> — the casual profile</sub></td>
    <td align="center"><img src="https://contributor-codex.vercel.app/api/card?username=octocat&amp;theme=detailed" width="400" alt="Detailed theme card"><br><sub><b>detailed</b> — the analytics dossier</sub></td>
  </tr>
</table>

## What it is

Contributor Codex turns a GitHub username, organization, or repository into a visual: a profile card, a set of tiered achievements, a team leaderboard, a repository card, or a one-image dossier. Every output is a self-contained SVG served from a URL, so it drops into a README, a portfolio, or a docs page with a single image tag — no script, no build step, no tracking pixel.

It started as a personal experiment with server-rendered SVG and the GitHub API, and is now a live, actively developed product.

## Why it's different

- **Four voices, not four palettes.** `cyberpunk` is an RPG dossier. `terminal` is a hacker's session log with its own vocabulary. `glass` is a casual, gamification-free profile. `detailed` is an analytics dossier built around a rank gauge. Choosing a theme changes what the card *says*, not just its accent color.
- **From one person to a whole org.** The same data that builds a single card also ranks every public member of an organization, describes a repository, or folds into a one-image collection.
- **A toolkit, not just an endpoint.** A no-code Card Builder, a shareable profile page, and an org roster sit beside the raw API, for anyone who would rather not hand-write a query string.
- **Every score shows its formula.** Nothing is ranked against other users or hidden behind an opaque algorithm.

## Quick start

Paste this into any README, with your own username:

```md
![Card](https://contributor-codex.vercel.app/api/card?username=YOUR_USERNAME)
```

Then make it yours:

- **[Card Builder](https://contributor-codex.vercel.app/builder.html)** — pick a card type, theme, avatar shape, and color with a live preview, then copy the Markdown, URL, or HTML.
- **[Codex Profile](https://contributor-codex.vercel.app/profile.html)** — a shareable page per contributor: the generated cards plus bio, location, and top repositories.
- **[Org Roster](https://contributor-codex.vercel.app/roster.html)** — load any organization to see its leaderboard and every public member's card.

## The codex

| Endpoint | Renders |
|---|---|
| [`/api/card`](docs/API.md#contributor-card) | A user's profile as a card, in four themes |
| [`/api/leaderboard`](docs/API.md#team-leaderboard) | An organization's public members, ranked |
| [`/api/repo`](docs/API.md#repository-card) | A repository's vital signs |
| [`/api/trophies`](docs/API.md#achievements) | Seven tiered achievements, plus an optional custom one |
| [`/api/codex`](docs/API.md#codex-collection) | A compact dossier in a single image |

Full parameters, defaults, errors, and caching are in the **[API reference](docs/API.md)**.

## Four voices

- **`cyberpunk`** — level, XP, a tier from INITIATE to LEGENDARY, and a character class drawn from your top language.
- **`terminal`** — a `scan.sh` session, a clearance rung from `SCRIPT KIDDIE` to `ROOT`, and a hex checksum instead of a score.
- **`glass`** — frosted panels and a language donut, with no level, XP, or rank.
- **`detailed`** — a letter-grade rank gauge, six stats, and a proportional language bar.

Every avatar can be a `hex`, `circle`, `rounded`, or `square` frame. The reasoning behind all of it is in the **[design notes](docs/DESIGN.md)**.

## Transparent by design

Scores are computed from a profile alone and the formula is on the card:

```
XP   = repos × 15 + stars × 5 + followers × 10 + years × 20
Rank = sqrt(stars/300)×30 + sqrt(repos/60)×20 + sqrt(followers/300)×25
     + sqrt(prs/100)×15 + sqrt(issues/60)×10          (detailed theme)
```

Tiers, grades, and every trophy threshold are listed in [Scoring and tiers](docs/API.md#scoring-and-tiers).

## Documentation

- **[API reference](docs/API.md)** — endpoints, parameters, errors, caching, rate limits, scoring.
- **[Deployment](docs/DEPLOYMENT.md)** — run your own: Vercel setup, environment, rate-limit rules, architecture, GitHub API budget, known limits.
- **[Design notes](docs/DESIGN.md)** — the theme voices, avatar shapes, and the visual system behind them.

## License

Contributor Codex is released under the [MIT License](LICENSE): use it, fork it, and build on it without asking. The license asks one thing in return — copies keep the copyright notice.

The embedded Chakra Petch font is the work of its own authors, under the SIL Open Font License; its notice is in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

---

<p align="center">Made by <a href="https://github.com/Boy-Offi9">Boy Offi9</a> · <a href="https://github.com/boy-offi9-inc">boy-offi9-inc</a></p>
