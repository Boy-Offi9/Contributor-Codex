const cyberpunk = require('./cyberpunk');
const terminal = require('./terminal');
const glass = require('./glass');
const detailed = require('./detailed');
const holo = require('./holo');

const THEMES = { cyberpunk, terminal, glass, detailed, holo };
const THEME_SHAPE = { cyberpunk: 'hex', detailed: 'rounded', glass: 'circle', terminal: 'hex', holo: 'circle' };

module.exports = { THEMES, THEME_SHAPE, renderDetailed: detailed };
