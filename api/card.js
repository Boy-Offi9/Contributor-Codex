const { isRateLimited } = require('./_lib/ratelimit');
const errors = require('./_lib/errors');
const { sanitizeColor, CHAKRA_PETCH_FONT_FACE, svgReply, readableAccent, MONO, sanitizeShape } = require('./_lib/svg');
const { isGhName, loadUserWithRepos, avatarDataUri, byteWeightedLangs, prIssueCounts } = require('./_lib/github');
const { computeStats } = require('./_lib/game');
const { THEMES, THEME_SHAPE } = require('./_lib/themes');

const errorSVG = (message) => errors.errorSVG({ width: 360, title: 'CARD ERROR', message, messageFont: MONO, messageSize: 11, messageFill: '#8a95ab' });

const svg = (body, status, cacheControl) => svgReply(body, status, cacheControl);

module.exports.GET = async (request) => {
  const rateLimited = await isRateLimited('card-endpoint', request);
  if (rateLimited) return svg(errorSVG('rate limited — slow down a bit'), 429, 'no-store');

  const url = new URL(request.url);
  const username = (url.searchParams.get('username') || '').trim();
  if (!username) return svg(errorSVG('missing ?username='), 400);
  if (!isGhName(username)) return svg(errorSVG('invalid username'), 400);

  const requestedTheme = url.searchParams.get('theme');
  const themeName = THEMES[requestedTheme] ? requestedTheme : 'cyberpunk';
  const render = THEMES[themeName];
  const shape = sanitizeShape(url.searchParams.get('shape'), THEME_SHAPE[themeName]);

  const token = process.env.GITHUB_TOKEN;
  try {
    const { user, repos } = await loadUserWithRepos(username, token);

    const avatarUri = await avatarDataUri(`${user.avatar_url}&s=160`);
    const fontFace = CHAKRA_PETCH_FONT_FACE;
    const stats = computeStats(user, repos);
    const langStats = await byteWeightedLangs(repos, token);
    if (langStats.length) {
      stats.langs = langStats.map((l) => l.name);
      stats.topLang = langStats[0].name;
    }
    const colorOverride = readableAccent(sanitizeColor(url.searchParams.get('color')), themeName);
    if (colorOverride) stats.color = colorOverride;

    let prs = null, issues = null;
    if (requestedTheme === 'detailed' || requestedTheme === 'cyberpunk' || requestedTheme === 'terminal') {
      ({ prs, issues } = await prIssueCounts(username, token));
    }

    return svg(render({ user, avatarUri, shape, fontFace, langStats, prs, issues, ...stats }), 200, 'public, s-maxage=3600, stale-while-revalidate=86400, stale-if-error=604800');
  } catch (err) {
    if (err.status === 404) return svg(errorSVG(`user "${username}" not found`), 404, 'public, s-maxage=10');
    if (err.status === 429) return svg(errorSVG('rate limited — set GITHUB_TOKEN'), 503, 'public, s-maxage=10');
    if (err.status === 403) return svg(errorSVG('GitHub refused this request'), 502, 'public, s-maxage=10');
    if (err.status === 504) return svg(errorSVG('GitHub is slow right now — try again soon'), 504, 'public, s-maxage=10');
    return svg(errorSVG('failed to load'), 500, 'public, s-maxage=10');
  }
};
