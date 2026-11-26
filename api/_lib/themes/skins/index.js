// Design-language skins for the detailed base card. Each skin implements the
// contract consumed by themes/detailed.js:
//   name, light, width, headerH        — identity + layout knobs
//   legendPad                          — horizontal slot left of a legend label
//   palette { bg, ink, sub, dim, rule, accent, secondary }
//   avatarBg                           — avatar plate color
//   css(displayFont)                   — <style> content for .t1/.t2/.bio/.rankLbl/.legend
//   defs()                             — optional extra <defs> markup
//   chassis(W, H, accent)              — background + frame + effects (self-contained <defs> ok)
//   sectionHeader(label, y, W)         — section rule above stat grid / language bar
//   statCell(x, y, label, value, accent, iconName, width)
//   langTrack(x, y, w, h)              — empty language bar
//   legendEntry(x, y, fill, label)     — one language legend entry
// Missing hooks fall back to no-ops, so a skin only implements what it styles.
const NOOP = () => '';

const registry = {
  classic: require('./classic'),
  cyberpunk: require('./cyberpunk'),
  terminal: require('./terminal'),
  glass: require('./glass'),
};

const SKINS = Object.fromEntries(
  Object.entries(registry).map(([key, skin]) => [key, { defs: NOOP, sectionHeader: NOOP, ...skin }])
);

module.exports = { SKINS };
