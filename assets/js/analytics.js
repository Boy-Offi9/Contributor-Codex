import('https://cdn.jsdelivr.net/npm/@vercel/analytics@1/dist/index.mjs')
  .then((analytics) => analytics.inject())
  .catch(() => {});
