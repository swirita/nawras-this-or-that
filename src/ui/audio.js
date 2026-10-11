export const AUDIO_KEY = 'nawras-this-or-that:muted:v1';

export function createAudio({ storage, contextFactory = () => new (window.AudioContext || window.webkitAudioContext)() }) {
  let context, muted = false, voices = [], generation = 0;
  try { muted = storage.getItem(AUDIO_KEY) === 'true'; } catch {}
  function stop() {
    generation++;
    for (const source of voices) { try { source.stop(); } catch {} }
    voices = [];
  }
  function init() {
    try {
      context ??= contextFactory();
      if (context.state === 'suspended') void context.resume().catch(() => {});
    } catch { /* Audio is optional when unsupported or blocked. */ }
  }
  function tone(frequency, start, duration, volume = .035) {
    const source = context.createOscillator(), gain = context.createGain();
    source.type = 'sine'; source.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(gain); gain.connect(context.destination);
    voices.push(source); source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start(start); source.stop(start + duration);
  }
  function airy(start) {
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * .18), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / samples.length);
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = buffer; filter.type = 'bandpass'; filter.frequency.value = 1800; filter.Q.value = .5; gain.gain.value = .024;
    source.connect(filter); filter.connect(gain); gain.connect(context.destination);
    voices.push(source); source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    source.start(start);
  }
  // Each action owns one short, sequential phrase. New actions cancel old voices.
  function play(kind) {
    stop();
    if (muted || !context || context.state !== 'running') return;
    const start = context.currentTime + .005;
    tone(520, start, .045, .018);
    if (kind === 'flip' || kind === 'correct' || kind === 'wrong') airy(start + .05);
    if (kind === 'correct') {
      tone(660, start + .24, .10); tone(880, start + .35, .15);
    } else if (kind === 'wrong') tone(240, start + .24, .16, .026);
    else if (kind === 'complete') {
      tone(660, start + .06, .10); tone(880, start + .17, .10); tone(1100, start + .28, .20);
    }
    return generation;
  }
  function toggle() {
    muted = !muted; stop();
    try { storage.setItem(AUDIO_KEY, String(muted)); } catch {}
    if (!muted && context) { init(); play('click'); }
    return muted;
  }
  return { init, play, toggle, get muted() { return muted; } };
}
