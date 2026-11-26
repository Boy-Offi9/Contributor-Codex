# Changelog

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
