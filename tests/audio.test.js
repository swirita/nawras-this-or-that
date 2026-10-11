import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAudio, AUDIO_KEY } from '../src/ui/audio.js';

function harness(initial = false) {
  const events = [], data = new Map([[AUDIO_KEY, String(initial)]]);
  let instances = 0;
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const source = kind => ({
    frequency: param(), connect() {}, disconnect() {},
    start(time) { events.push({kind, time}); },
    stop(time) { events.push({kind:'stop', time}); }
  });
  const context = {
    state:'running', currentTime:10, sampleRate:1000, destination:{},
    createOscillator:()=>source('tone'),
    createBufferSource:()=>source('air'),
    createBuffer:()=>({getChannelData:()=>new Float32Array(180)}),
    createBiquadFilter:()=>({frequency:param(),Q:param(),connect(){},disconnect(){}}),
    createGain:()=>({gain:param(),connect(){},disconnect(){}})
  };
  const audio=createAudio({storage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},contextFactory:()=>{instances++;return context;}});
  return {audio,events,data,instances:()=>instances};
}
test('audio initializes once; correct phrase schedules click, air and rising notes sequentially',()=>{
  const {audio,events,instances}=harness();
  audio.init();audio.init();audio.play('correct');
  assert.equal(instances(),1);
  const starts=events.filter(e=>e.kind!=='stop');
  assert.deepEqual(starts.map(e=>e.kind),['tone','air','tone','tone']);
  assert.ok(starts[2].time>=starts[1].time+.18);
  assert.ok(starts[3].time>=starts[2].time+.10);
  audio.play('complete');
  assert.ok(events.some(e=>e.kind==='stop' && e.time===undefined));
});
test('mute cancels voices and prevents sound; preference persists and unmute works',()=>{
  const {audio,events,data}=harness();
  audio.init();audio.play('wrong');audio.toggle();
  assert.equal(data.get(AUDIO_KEY),'true');
  const count=events.length;audio.play('complete');
  assert.equal(events.length,count);
  audio.toggle();assert.equal(data.get(AUDIO_KEY),'false');
  assert.ok(events.length>count);
  const muted=harness(true);muted.audio.init();muted.audio.play('correct');
  assert.equal(muted.events.length,0);
  const beforeStart=harness(true);beforeStart.audio.toggle();
  assert.equal(beforeStart.instances(),0);
});
test('unsupported audio and inaccessible storage never block gameplay',()=>{
  const audio=createAudio({storage:{getItem(){throw Error();},setItem(){throw Error();}},contextFactory(){throw Error();}});
  assert.doesNotThrow(()=>{audio.init();audio.play('correct');audio.toggle();audio.toggle();});
});
