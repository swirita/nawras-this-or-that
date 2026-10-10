import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, createRound, hasReviewedSet } from '../src/core/round.js';

// Synthetic fixtures stay in tests; the delivered question file is empty.
const questions = Array.from({length:10}, (_,i) => ({ id: `q${i}`, reviewed: true, prompt: 'Test', language: 'ar', answers: [{id:'a',text:'A'},{id:'b',text:'B'}], correctAnswerId:'a', explanation:'Test' }));
test('review gate requires ten valid, distinct, explicitly reviewed questions', () => {
  assert.equal(hasReviewedSet([]), false);
  assert.equal(hasReviewedSet(questions), true);
  assert.equal(hasReviewedSet(questions.map(q => ({...q, reviewed:false}))), false);
  assert.equal(hasReviewedSet(questions.map(q => ({...q, id:'same'}))), false);
  assert.throws(() => createPlayer('   '));
  assert.equal(createPlayer('  Nawras  ').name, 'Nawras');
});
test('one answer, ID based scoring, visible unanswered time only, one completed save', () => {
  let time = 0, calls = 0;
  const round = createRound(createPlayer('Test'), questions, {now:()=>time, random:()=>0, resultId:'test-result'});
  assert.equal(round.answer('a'), null); assert.equal(round.result, null); assert.equal(round.saveCompleted(()=>calls++), null);
  for (let i=0;i<10;i++) {
    time += 10000; round.showQuestion(); time += 1234;
    assert.ok(round.answer(i%2 ? 'b':'a'));
    assert.equal(round.answer('a'), null);
    time += 20000; round.next();
  }
  assert.equal(round.result.score, 50); assert.equal(round.result.answerTimeMs,12340);
  round.saveCompleted(()=>{ calls++; return {error:null}; });
  round.saveCompleted(()=>{ calls++; return {error:null}; });
  assert.equal(calls,1);
});
test('hiding an unanswered question excludes hidden time', () => {
  let time = 0;
  const round = createRound(createPlayer('Test'), questions, {now:()=>time, resultId:'hidden-time'});
  for (let i=0;i<10;i++) {
    round.showQuestion(); time+=100; round.hideQuestion();
    time+=10000; round.showQuestion(); time+=100;
    round.answer('a'); round.next();
  }
  assert.equal(round.result.answerTimeMs,2000);
});
