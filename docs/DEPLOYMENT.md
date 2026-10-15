# Deployment

Contributor Codex is a set of Vercel serverless functions plus four static pages. There is no database, no framework, and no build step.

- [Requirements](#requirements)
- [Deploy to Vercel](#deploy-to-vercel)
- [Environment variables](#environment-variables)
- [Rate-limit rules](#rate-limit-rules)
- [Self-hosting checklist](#self-hosting-checklist)
- [Fonts](#fonts)
- [Project layout](#project-layout)
- [Architecture](#architecture)
- [GitHub API budget](#github-api-budget)
- [Known limits](#known-limits)
- [Troubleshooting](#troubleshooting)

## Requirements

- Node.js 18 or newer
- A [Vercel](https://vercel.com) account
- A GitHub personal access token (strongly recommended). The service only reads public data, so a token with no scopes is enough.

## Deploy to Vercel

1. Fork or clone the repository.
2. Import it into Vercel as a new project. There is no build command and no output directory; leave the framework preset on **Other**.
3. Add the `GITHUB_TOKEN` [environment variable](#environment-variables) and redeploy.
4. Create the eight [rate-limit rules](#rate-limit-rules) in the Vercel Firewall.
5. If you are not deploying to `contributor-codex.vercel.app`, work through the [self-hosting checklist](#self-hosting-checklist).
6. Open `/` — the landing page's live demo should render a card.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `GITHUB_TOKEN` | required for streak/activity; recommended for everything | Authenticates every server-side GitHub request, raising the limit from 60 to 5,000 requests per hour. Without it, the whole deployment shares the unauthenticated limit across every visitor, and cards start returning `503` quickly. |

Set it in the Vercel dashboard. Never commit it.

## Rate-limit rules

Each endpoint checks a per-IP rate limit through `@vercel/firewall`, looked up by rule ID. Create one rate-limiting rule per ID, spelled exactly as below:

| Rule ID | Endpoint |
|---|---|
| `card-endpoint` | `/api/card` |
| `leaderboard-endpoint` | `/api/leaderboard` |
| `repo-endpoint` | `/api/repo` |
| `trophies-endpoint` | `/api/trophies` |
| `codex-endpoint` | `/api/codex` |
| `streak-endpoint` | `/api/streak` |
| `activity-endpoint` | `/api/activity` |
| `langs-endpoint` | `/api/langs` |

The thresholds are yours to choose. Leave each rule's action at its default: when a request is limited, the endpoint renders a `429` message card from application code rather than showing Vercel's block page.

## Checking your GitHub budget

`GET /api/status` shows the token's remaining REST and GraphQL budget and when each resets, and warns under 10%. It calls GitHub's rate-limit endpoint, which doesn't count against any quota. If it reports `token: "missing"` or `"rejected"`, that is why cards are failing.

## Rebuilding the embedded font

Cards embed Chakra Petch as base64 so they render identically inside a README image. The font is subset to the characters the cards draw, with both weights embedded. After changing the glyph list in `scripts/build-font.js`, run `npm run build-font` (needs network) and commit `api/_lib/font-data.js`. The script prints each weight's size and warns if the total is larger than expected for a subset. Characters outside the set (such as a non-Latin display name) fall back to the viewer's system font.

## Self-hosting checklist

The pages are written against the production domain, so a deployment elsewhere needs a few replacements:

- **API base URL.** `index.html`, `builder.html`, `roster.html`, and `profile.html` each define `API_BASE = 'https://contributor-codex.vercel.app'`, and `index.html` also uses that domain for its example images and embed snippet. Replace it with your deployment's origin — it must be absolute, because the Card Builder copies these URLs into READMEs. With GNU sed:

  ```sh
  sed -i 's#https://contributor-codex.vercel.app#https://YOUR-DOMAIN#g' index.html builder.html roster.html profile.html
  ```

- **Source links.** The footers link to `github.com/Boy-Offi9/Contributor-Codex`; point them at your fork.
- **License notices.** The MIT license requires copies to keep the copyright notice and license text, and the embedded font carries its own notice. Keep [`LICENSE`](../LICENSE) and [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) in your fork.
- **Example org and user.** The roster defaults to the `vercel` org and the landing demo to `octocat`. Change them if you want different first impressions.

## Fonts

Chakra Petch is embedded in the cards from a committed file, `api/_lib/font-data.js`, so deployed functions never fetch a font at request time. Regenerate it only if the pinned font weights change:

```sh
npm run build-font
```

This fetches the font from the network and rewrites `api/_lib/font-data.js`. Chakra Petch is licensed under the SIL Open Font License, and its notice must stay with the embedded file — see [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).

## Project layout

```
api/
  card.js            Contributor Card          (4 themes)
  leaderboard.js     Team Leaderboard          (3 themes)
  repo.js            Repository Card           (4 themes)
  trophies.js        Achievements              (12 badges, 6 badge shapes)
  codex.js           Codex Collection
  streak.js          Streak Card               (3 themes)
  activity.js        Contribution activity graph
  langs.js           Most-used languages
  _lib/
    shared.js        facade: re-exports game.js + github.js + svg.js
    game.js          XP, levels, tiers, language classes (pure functions)
    github.js        api.github.com access, avatar fetch, name validation
    svg.js           escaping, colours, font stacks, avatar frames, icons, badges
    frame.js         shared chrome for streak / activity / langs (background, border, glow)
    contrib.js       GraphQL contribution calendar + streak maths
    font-data.js     embedded Chakra Petch (generated)
scripts/
  build-font.js      regenerates font-data.js
index.html           landing page
roster.html          organization roster
builder.html         Card Builder
profile.html         Codex Profile
docs/                API reference, deployment, design notes
LICENSE              MIT
THIRD_PARTY_NOTICES.md   embedded font notice (SIL OFL 1.1)
```

## Architecture

Vercel serverless functions using the Web `Request` / `Response` API directly — no Next.js, no framework. Cards are hand-written SVG strings, with no charting or image library. [`@boy-offi9-inc/reqkit`](https://github.com/boy-offi9-inc/reqkit) handles retry and de-duplication for GitHub requests, and `@vercel/firewall` provides per-IP rate limiting.

Each endpoint file is independently deployable. The original five cards keep their own error cards and layout code; the three calendar cards (streak, activity, languages) share `_lib/frame.js`. `_lib/` holds only what several cards genuinely reuse, split by concern: `game.js` (rules), `github.js` (network and input validation) and `svg.js` (drawing). Endpoints import through `shared.js`, so a helper can move between those files without touching any endpoint.

Every name that reaches a GitHub URL (`username`, `org`, `owner`, `repo`) is validated with `isGhName` / `isGhRepo` first, because those requests carry the server's token. Anything that isn't a plain GitHub name returns a 400 card.

The four pages are single self-contained HTML files with no shared bundle. The roster and profile pages call GitHub directly from the visitor's browser, with an optional token field that raises that visitor's limit from 60 to 5,000 requests per hour. That token is sent only to `api.github.com` and never leaves the browser tab.

## GitHub API budget

GitHub requests made for one **uncached** render. Edge caching (1 hour, 6 for the leaderboard, streak, activity and languages cards — see [Caching](API.md#caching)) means most requests cost nothing.

| Endpoint | GitHub requests |
|---|---|
| `/api/card` (any theme) | 2 (user, repo list) + up to 6 (language bytes for the six most-starred repos) |
| `/api/card` with `theme=detailed` | the above + 2 Search API requests (pull requests, issues) |
| `/api/codex` | 2 + up to 6, as for `/api/card` |
| `/api/trophies` | 2 |
| `/api/repo` | 1 |
| `/api/repo` with `theme=detailed` | 1 + 2 (contributor count, latest release) |
| `/api/leaderboard` | 1 (member list) + 2 per ranked member, so up to 121 |
| `/api/streak`, `/api/activity` | 2 GraphQL requests (profile, then one aliased query covering every year since the account was created). Requires `GITHUB_TOKEN`. |
| `/api/langs` | 1 (repo list) + up to 6 (language bytes) |

Avatar images come from GitHub's avatar host and are not counted against the API limit. The Search API has its own, lower limit; pull request and issue counts fail soft when it is exhausted.

## Known limits

- **Public membership only.** The leaderboard and roster list only organization members whose membership is public, because that is all GitHub's API returns.
- **First 100 repositories.** Repo-derived stats — stars, forks, languages, licensed repos — are computed from the first 100 owned repositories GitHub returns for a user, and the member list is capped at 100. Results are not paginated, so a user with more than 100 repos is undercounted. Follower and repo totals come from the profile itself and are exact.
- **Leaderboard cap.** At most the first 60 public members are ranked, through a pool of 4 concurrent workers, and at most 20 are shown. Large orgs get a representative ranking rather than a timeout.
- **Leaderboard language.** The leaderboard uses the cheaper repo-count method for each member's top language; byte-weighting every member would multiply an already expensive request.
- **Language colors.** About thirty common languages have a defined color; others fall back to the card's accent. There are no per-user overrides.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Cards show "rate limited — set GITHUB_TOKEN" (`503`) | The deployment hit GitHub's limit. Set `GITHUB_TOKEN`. |
| Cards show "rate limited — slow down a bit" (`429`) | A visitor tripped your per-IP firewall rule. |
| Leaderboard shows "has no public members" | The org has no members with public membership. Members must make it public in their org settings. |
| A card does not reflect a recent change on GitHub | Edge caching: up to 1 hour (6 for a leaderboard), and the first request after that may still return the older copy while it refreshes. |
| Roster or profile page reports a rate limit | The visitor's 60 requests per hour are used up. Paste a personal access token into the page's token field. |
| A fork's pages show the original site's cards | `API_BASE` still points at the original domain — see the [self-hosting checklist](#self-hosting-checklist). |
