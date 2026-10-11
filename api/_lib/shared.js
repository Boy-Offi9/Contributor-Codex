// Compatibility facade. The helpers live in three focused modules:
//   game.js    — XP, levels, tiers, language classes (pure functions)
//   github.js  — api.github.com access + name validation
//   svg.js     — escaping, colours, fonts, avatar frames, icons, badges
// Endpoints keep importing from './_lib/shared'; new code can import the
// specific module it needs.
module.exports = {
  ...require('./game'),
  ...require('./github'),
  ...require('./svg'),
};
