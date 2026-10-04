# Design notes

Contributor Codex treats GitHub data as raw material for a visual identity, not just a number badge. These notes describe the design system behind the cards so new work stays consistent with it.

- [Principles](#principles)
- [Themes](#themes)
- [Avatar shapes](#avatar-shapes)
- [The cut-corner frame](#the-cut-corner-frame)
- [Glow, icons, and color](#glow-icons-and-color)

## Principles

- **A theme is a voice, not a palette.** Switching theme changes what the card *says* — its vocabulary, its structure, which numbers it foregrounds — not only its accent color. Two themes never share rank or score words.
- **One data pipeline, several outputs.** A user's stats feed a single card, a leaderboard row, a collection, and a profile page. Outputs differ in presentation, not in how the numbers are computed.
- **Show the formula.** Every score is computed from the profile alone and its formula is available on the card. Nothing is ranked against other users or hidden behind an opaque algorithm.
- **Self-contained.** A card is one SVG with its font and avatar embedded. No scripts, no external requests, no icon font or library — icons are hand-drawn paths.
- **Fit the container.** Text that can overflow is truncated with an ellipsis, and chips that cannot fit are dropped. Nothing is allowed to overlap.

## Themes

`cyberpunk` (default) · `terminal` · `glass` · `detailed`

**`cyberpunk` — the RPG dossier.** Level and XP, a tier badge (INITIATE → LEGENDARY), and a character class derived from the user's top language (`NETRUNNER`, `DATA MAGE`, `SIGNAL WEAVER`, with `WANDERER` for anything unmapped). Stat bars with icons, a neon glow on contained elements, a faint circuit-grid texture, and a second purple gradient for depth. This is the only theme that uses RPG vocabulary.

**`terminal` — a hacker's session log.** A fake `scan.sh` run: `$ ./scan.sh --target=<login>`, then `[OK] identity verified`, then aligned `key  value` rows. Rank is a *clearance* rung on its own ladder — `SCRIPT KIDDIE → OPERATOR → GHOST → GATEKEEPER → ROOT` — mapped onto the same level thresholds as cyberpunk's tiers but sharing none of its words. There is no level number anywhere. XP appears as a hex `checksum` (for example `0x37b2a`), because a terminal reports numbers in hex, not as points. The leaderboard version is a column-aligned table with the same vocabulary.

**`glass` — the casual profile card.** No level, no XP, no class. A frosted panel over softly blurred gradient blobs, a glow ring behind a circular avatar, a verified-style checkmark, and the top language as a plain pill. Below three stat tiles sits a language donut (the top four languages by byte weight plus an "Other" slice), and a footer of icon chips for join year and location (or company when there is no location) under a diamond-accent divider.

**`detailed` — the analytics dossier.** Built around a circular rank gauge with a letter grade (S+ → D, see [Scoring and tiers](API.md#scoring-and-tiers)) instead of a level. A six-box stat grid (repos, stars, forks, followers, pull requests, issues) and a proportional language bar with a percentage legend. No class name, no XP.

The `detailed` theme also exists on the Repository Card, where it is a denser layout of repository facts rather than a rank dossier.

## Avatar shapes

Every avatar — on the Contributor Card and in each leaderboard row — is drawn by one shared helper, `avatarShape()`, so the frame, the clip, and the gap between ring and image are geometrically consistent for every shape:

| Shape | Notes |
|---|---|
| `hex` | A regular hexagon (all six sides equal). The brand shape. |
| `circle` | |
| `rounded` | A rounded square with a generous corner radius. |
| `square` | A square with a small corner radius. |

Each theme has a default (`hex` for `cyberpunk`, `circle` for `glass`, `rounded` for `detailed`) and `?shape=` overrides it. `terminal` has no avatar.

## The cut-corner frame

The neon-family cards — Contributor Card (`cyberpunk`, `detailed`), Codex Collection, Repository Card (`cyberpunk`, `detailed`), and the `cyberpunk` leaderboard — share a frame with two 45° cut corners (top-left and bottom-right, 14px). The frame is built from a single polygon used twice: once as the outline, and once as a clip path around every background layer — base fill, gradients, and grid texture. Clipping the background, not just outlining the shape, is what makes the corner a real cut rather than a line drawn across a square. Terminal cards and the achievements card use plain rectangles, and `glass` cards use rounded rectangles; none of them has a cut.

## Glow, icons, and color

**Glow** is a Gaussian-blur filter merged under the source graphic. It is applied only to contained shapes with roughly uniform edges — avatar rings, level badges, stat values, earned shields. It is never applied to the outer frame: a blur treats a short 14px corner segment the same as a 400px straight edge, so on the frame it blooms into a bright blob at the corners.

**Icons** are 12×12 hand-drawn stroke paths in a shared set (`repo`, `star`, `people`, `bolt`, `fork`, `pr`, `issue`, `calendar`, `pin`, `building`, `globe`, `license`) that inherit their stroke color from the parent group, so they follow the card's accent. Every glyph is a stroked path — no fills that depend on `currentColor`, which renders black inside an `<img>`-embedded SVG.

**Language colors** use the standard GitHub linguist palette for about thirty common languages. Anything unmapped falls back to the card's accent color rather than gray, so an obscure language still looks intentional.

**Accent color** comes from the level's tier unless `color` is set (see the [tier table](API.md#scoring-and-tiers)). Achievement shields use a separate tier palette on purpose: there, a dim INITIATE color means "not earned yet" and is correct, whereas a card's accent must always be readable against the near-black background — so the card's INITIATE accent is green, not the shields' dim gray.
