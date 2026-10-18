const test = require('node:test');
const assert = require('node:assert/strict');
const { computeRank } = require('../api/_lib/shared');

test('rank grades: bands, weights and progress', () => {
  assert.equal(computeRank({}).grade, 'C');
  assert.equal(computeRank({ commits: 99 }).grade, 'C');
  assert.equal(computeRank({ commits: 100 }).grade, 'B');
  assert.equal(computeRank({ prs: 25 }).score, 100);
  assert.equal(computeRank({ stars: 20 }).score, 100);
  assert.equal(computeRank({ commits: 3000 }).grade, 'S');
  const mid = computeRank({ commits: 200 });
  assert.deepEqual([mid.grade, mid.next, mid.progress], ['B', 'B+', 0.5]);
  assert.equal(computeRank({ commits: 99999 }).progress, 1);
  assert.equal(computeRank({ commits: 99999 }).next, null);
  assert.equal(computeRank({ commits: 'abc', stars: null }).score, 0);
});
