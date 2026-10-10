import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankResults, bestResults, formatTime, createLeaderboardStore, STORAGE_KEY } from '../src/core/leaderboard.js';

const result = (playerId, score, answerTimeCs, resultId = `r-${playerId}`) => ({ playerId, resultId, name: 'Shared name', score, answerTimeCs });
function memoryStorage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
}
test('scores descend, time ascends, exact ties get competition ranks', () => {
  const rows = rankResults([result('d', 70, 0), result('b', 90, 1200), result('c', 90, 1200), result('a', 100, 5000)]);
  assert.deepEqual(rows.map(x => [x.playerId, x.rank]), [['a', 1], ['b', 2], ['c', 2], ['d', 4]]);
});
test('all ties at rank five retain rank five; distinct centisecond times are distinct', () => {
  const rows = rankResults([result('a',100,0),result('b',90,0),result('c',80,0),result('d',70,0),result('e',60,1234),result('f',60,1234),result('g',60,1235)]);
  assert.deepEqual(rows.map(x => x.rank), [1,2,3,4,5,5,7]);
  assert.equal(formatTime(rows[4].answerTimeCs), '12.34 s');
  assert.equal(formatTime(rows[6].answerTimeCs), '12.35 s');
});
test('best completed result compares score then time, keeps identities and is idempotent', () => {
  const store = createLeaderboardStore(memoryStorage());
  store.saveCompletedResult(result('a',80,3000,'r1'));
  store.saveCompletedResult(result('a',70,1000,'r2'));
  store.saveCompletedResult(result('a',80,2000,'r3'));
  store.saveCompletedResult(result('a',80,2000,'r4'));
  store.saveCompletedResult(result('b',80,2000,'r5'));
  store.saveCompletedResult(result('b',80,2000,'r5'));
  assert.deepEqual(store.read().results.map(x => x.resultId), ['r3','r5']);
  store.saveCompletedResult(result('a',90,9999,'r6'));
  assert.equal(store.read().results[0].resultId, 'r6');
});
test('invalid records and malformed storage are handled; clearing is scoped', () => {
  const storage = memoryStorage(); const store = createLeaderboardStore(storage);
  assert.deepEqual(store.read(), { results: [], error: null });
  storage.setItem(STORAGE_KEY, '{broken');
  assert.equal(store.read().results.length, 0); assert.ok(store.read().error);
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, results: [null, result('a',100,1001),result('b',110,1),result('c',80,1.2)] }));
  assert.equal(store.read().results.length, 1);
  storage.setItem('other-game', 'keep'); store.clear();
  assert.equal(storage.getItem('other-game'), 'keep');
  assert.equal(storage.getItem(STORAGE_KEY), null);
  assert.equal(bestResults([result('a',80,1), result('b',80,1)]).length, 2);
});
test('blocked storage returns useful failures', () => {
  const store = createLeaderboardStore({ getItem() { throw Error(); }, setItem() { throw Error(); }, removeItem() { throw Error(); } });
  assert.ok(store.read().error); assert.ok(store.saveCompletedResult(result('a',100,1000)).error); assert.ok(store.clear().error);
});
test('legacy millisecond results are preserved and normalized to displayed centiseconds', () => {
  const storage=memoryStorage();
  const legacy='nawras-this-or-that:leaderboard:v1';
  storage.setItem(legacy,JSON.stringify({version:1,results:[
    {playerId:'old1',resultId:'round1',name:'Same',score:100,answerTimeMs:1231},
    {playerId:'old2',resultId:'round2',name:'Same',score:100,answerTimeMs:1234}
  ]}));
  const store=createLeaderboardStore(storage);
  assert.deepEqual(rankResults(store.read().results).map(r=>r.rank),[1,1]);
  assert.equal(formatTime(store.read().results[0].answerTimeCs),'1.23 s');
  store.saveCompletedResult(result('new',100,123));
  assert.equal(store.read().results.length,3);
  assert.ok(storage.getItem(legacy));
  store.clear(); assert.equal(storage.getItem(legacy),null);
});
