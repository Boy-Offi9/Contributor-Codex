const cyberpunk = require('./cyberpunk');
const terminal = require('./terminal');
const glass = require('./glass');
const detailed = require('./detailed');

const THEMES = { cyberpunk, terminal, glass, detailed };
const THEME_SHAPE = { cyberpunk: 'circle', detailed: 'rounded', glass: 'circle', terminal: 'hex' };

module.exports = { THEMES, THEME_SHAPE, renderDetailed: detailed };
