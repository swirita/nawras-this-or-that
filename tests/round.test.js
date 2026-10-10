import { test } from 'node:test';
import assert from 'node:assert/strict';
import questions from '../src/data/questions.json' with { type: 'json' };
import { createPlayer, createRound, hasReviewedSet, shuffle } from '../src/core/round.js';

test('supplied ten questions have distinct IDs, two options and valid correct IDs', () => {
  assert.equal(hasReviewedSet(questions), true);
  assert.equal(new Set(questions.flatMap(q=>q.options.map(o=>o.id))).size,20);
  assert.equal(hasReviewedSet([]),false);
  assert.equal(hasReviewedSet(questions.map(q=>({...q,id:'same'}))),false);
  assert.equal(hasReviewedSet(questions.map(q=>({...q,correctOptionId:'missing'}))),false);
  assert.equal(hasReviewedSet(questions.map(q=>({...q,options:[q.options[0]]}))),false);
  assert.throws(()=>createPlayer('  '));
  assert.equal(createPlayer('  Nawras  ').name,'Nawras');
});
test('Fisher-Yates copies its input and independently shuffles options; grade by ID', () => {
  const original = JSON.stringify(questions);
  const round = createRound(createPlayer('Same'),questions,{random:()=>0});
  const seen = [];
  for(let i=0;i<10;i++) {
    const q=round.question; seen.push(q.id);
    assert.deepEqual(q.options.map(o=>o.id), [...questions.find(x=>x.id===q.id).options].reverse().map(o=>o.id));
    round.showQuestion();
    assert.equal(round.answer(q.correctOptionId).correct,true);
    assert.equal(round.answer(q.correctOptionId),null);
    round.next(); assert.equal(round.next(),null);
  }
  assert.equal(new Set(seen).size,10); assert.equal(round.result.score,100);
  assert.equal(JSON.stringify(questions),original);
  assert.notDeepEqual(shuffle(questions,()=>0).map(q=>q.id),questions.map(q=>q.id));
});
test('wrong answers continue; transition and feedback time excluded; background counted', () => {
  let time=0;
  const round=createRound(createPlayer('Test'),questions,{now:()=>time});
  assert.equal(round.answer(round.question.correctOptionId),null);
  assert.equal(round.saveCompleted(()=>assert.fail()),null);
  for(let i=0;i<10;i++) {
    time+=10000; round.showQuestion(); time+=1234;
    // No visibility pause: the monotonic clock continues during a tab switch.
    const q=round.question;
    const id=i%2?q.options.find(o=>o.id!==q.correctOptionId).id:q.correctOptionId;
    assert.equal(round.answer(id).correct,i%2===0);
    const stopped=round.answerTimeCs; time+=20000;
    assert.equal(round.answerTimeCs,stopped);
    round.next();
  }
  assert.equal(round.result.score,50); assert.equal(round.result.answerTimeCs,1234);
});
test('round completion saves exactly once, including reentrant calls and save failure', () => {
  const round=createRound(createPlayer('Test'),questions);
  for(let i=0;i<10;i++){ round.showQuestion();round.answer(round.question.correctOptionId);round.next(); }
  let calls=0;
  round.saveCompleted(()=>{calls++;round.saveCompleted(()=>calls++);return {error:'blocked'};});
  round.saveCompleted(()=>calls++);
  assert.equal(calls,1);
  const again=createRound({playerId:round.result.playerId,name:round.result.name},questions);
  assert.equal(again.score,0); assert.equal(again.answerTimeCs,0); assert.equal(again.progress,1);
  for(let i=0;i<10;i++){again.showQuestion();again.answer(again.question.correctOptionId);again.next();}
  assert.notEqual(again.result.resultId,round.result.resultId);
  assert.equal(again.result.playerId,round.result.playerId);
});
