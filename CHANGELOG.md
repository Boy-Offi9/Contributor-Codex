# Changelog

## 0.29.0 - 2026-11-26

### Added
- Streak endpoint: per-request token passthrough (`x-github-token` header or
  `token` param). GitHub only counts contributions visible to the
  authenticated viewer, so org/private-repo streaks undercounted (real case:
  52-day streak reported as 29). A user token makes GitHub include everything;
  such responses are never cached

## 0.28.0 - 2026-11-26

### Changed
- Glass theme joins the kit design language while keeping its light frosted
  identity: chamfered chassis with layered ink strokes, corner brackets,
  subtle scanlines, mono labels, squared HUD tiles/chips; purple accent blob
  replaced with the kit pink; glass repo card rebuilt the same way. Name
  stays `glass`

## 0.27.0 - 2026-11-26

### Changed
- Site chrome reskinned to the scifi-ui-kit design language: kit palette
  (#04070d bg, cyan/pink duo), global scanline overlay, chamfered panels with
  corner brackets, mono uppercase buttons and nav, '//'-prefixed section
  headers, hero accent rule + brackets, embed block restyled as a HUD readout;
  theme-color metas and favicon background aligned

## 0.26.4 - 2026-11-26

### Fixed
- Trophies XP bar track color aligned to kit rule color

## 0.26.3 - 2026-11-26

### Fixed
- Missed-surface sweep: detailed card's leftover old outline removed; detailed
  repo card rebuilt on the HUD chassis; error cards (all endpoints) restyled
  to the kit chassis with the danger accent; remaining old palette values
  (#05070c/#1b2233/#7a8399 dim text) aligned to the kit trio

## 0.26.2 - 2026-11-26

### Changed
- Small-surface pass to the kit design language: badges use the mono font,
  darker kit label segment and a seam tick; trophies strip rebuilt on the HUD
  chassis (chamfered frame, brackets, scanlines, mono labels); leaderboard
  palette aligned to the kit trio and its frame got brackets + scanlines

## 0.26.1 - 2026-11-26

### Fixed
- Cyberpunk dossier: stat icons no longer overlap the value digits (labels and
  values separated); row spacing rebalanced
- Codex card rebuilt on the kit HUD chassis — chamfered frame, layered glow,
  scanlines with scan band, corner brackets, traveling border light (was a
  single-stroke old-style panel that didn't match the theme)

## 0.26.0 - 2026-11-26

### Changed
- Cyberpunk card is now the full dossier: telemetry grid (repos, stars, forks,
  followers), language distribution bar with legend, activity row (pull
  requests, issues, account age, top language), XP footer with level progress.
  Dynamic height; /card now fetches PR/issue counts for cyberpunk too.

## 0.25.0 - 2026-11-26

### Changed
- The shared card frame (streak, langs, stats, activity in cyberpunk) now uses
  the scifi-ui-kit HUD language: chamfered chassis, triple-stroke glow,
  scanlines with a roaming scan band, corner brackets, traveling border light
- Terminal themes (card + repo) upgraded to the kit's phosphor variant: CRT
  scanlines, phosphor sweep, solid double frame, corner brackets
- Detailed theme: kit chassis — scanlines, scan band, brackets, layered frame
- Glass intentionally kept as the light/accessible variant (see README)

## 0.24.0 - 2026-11-26

### Changed
- The `cyberpunk` theme is now the sci-fi HUD card from scifi-ui-kit (formerly
  shipped as `holo`); the `holo` name is retired — `theme=cyberpunk` is the
  default for /card and /repo, `theme=holo` falls back to it. Old flat
  cyberpunk styling is gone.

## 0.23.1 - 2026-11-26

### Fixed
- Rate limiter no longer fails open: when the Vercel firewall is unavailable
  it degrades to a small in-memory per-client limiter instead of disabling
  itself (client key is bounded and header-derived)
- Badge `style` param: prototype-chain keys (`constructor`, `__proto__`) are
  rejected, so object/function source can no longer be interpolated into SVG
  attributes
- Activity card no longer 500s for accounts with an empty contribution
  calendar — renders an empty-state chart
- Hostile GitHub inputs (invalid `created_at`, non-numeric counters) can no
  longer produce NaN level/XP badges ("LV NaN")
- Language names are escaped exactly once (no more `&amp;amp;` artifacts in
  leaderboard/cyberpunk class labels)
- Long display names are truncated in detailed/holo/cyberpunk cards instead
  of overflowing the canvas
- Repos are paginated (up to 300) so stars/langs don't undercount past page 1
- Error cards are no longer pinned at the CDN edge for 60s (s-maxage=10);
  streak `debug=1` requires ENABLE_STREAK_DEBUG=1 and is no-store

### Added
- holo repo card in the scifi-ui-kit HUD language; holo is the default for
  both /card and /repo; builder wired

## 0.23.0 - 2026-11-26

### Added
- `holo` card theme: starship-HUD style contributor card — targeting brackets,
  radar reticle around the avatar with a rotating sweep, segmented XP arc,
  telemetry ruler, scanline animation, clearance readout. Registered for
  /card, the builder, frame palettes, and made the /card default.

## 0.22.0 - (previous)
