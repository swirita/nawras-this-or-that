import './styles.css';
import questions from './data/questions.json';
import { hasReviewedSet, createPlayer, createRound } from './core/round.js';
import { createLeaderboardStore } from './core/leaderboard.js';
import { renderLanding } from './screens/landing.js';
import { renderLeaderboard } from './screens/leaderboard.js';
import { renderGame } from './screens/game.js';
import { renderResults } from './screens/results.js';
import { assetUrl, element } from './ui/dom.js';
import { createAudio } from './ui/audio.js';

const root = document.querySelector('#app');
const dialog = document.querySelector('#clear-dialog');
const resetDialog = document.querySelector('#reset-dialog');
// Access itself can throw when browser storage is disabled.
const storage = { getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value), removeItem: key => localStorage.removeItem(key) };
const store = createLeaderboardStore(storage);
const audio = createAudio({ storage });
const mute = element('button', { className: 'mute-button', type: 'button' });
function updateMute() {
  mute.textContent = audio.muted ? '🔇' : '🔊';
  mute.setAttribute('aria-label', audio.muted ? 'Unmute sound' : 'Mute sound');
  mute.setAttribute('aria-pressed', String(audio.muted));
}
updateMute();
document.body.append(mute);
mute.addEventListener('click', event => {
  if (event.detail > 1) return;
  audio.toggle(); updateMute();
});
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (button && !button.disabled && !button.matches('.start, .answer-button, .next, .mute-button') && event.detail <= 1) audio.play('click');
});
let name = '', screen = 'landing', currentPlayerId = null, returnFocus;
let player = null, round = null, completedResult = null, saveError = null, leaderboardReturn = 'landing';
let cleanupGame = null, resetReturnFocus = null;
function stopGamePresentation() {
  cleanupGame?.(); cleanupGame = null;
}

function landing() {
  stopGamePresentation();
  screen = 'landing';
  renderLanding(root, { name, questionsReady: hasReviewedSet(questions),
    onName: value => { name = value; }, onStart: value => {
      if (screen !== 'landing') return;
      audio.init(); audio.play('click');
      player = createPlayer(value); currentPlayerId = player.playerId; startRound();
    }, onLeaderboard: () => { leaderboardReturn = 'landing'; leaderboard(); } });
}
function startRound() {
  stopGamePresentation();
  screen = 'game'; completedResult = null; saveError = null;
  round = createRound(player, questions);
  cleanupGame = renderGame(root, { round, audio, onReset: trigger => {
    if (screen !== 'game' || resetDialog.open) return;
    resetReturnFocus = trigger;
    resetDialog.showModal();
    document.body.classList.add('modal-open');
    document.querySelector('#close-reset').focus();
  }, onComplete: () => {
    completedResult = round.result;
    const outcome = round.saveCompleted(store.saveCompletedResult);
    saveError = outcome?.error;
    results();
  } });
}
document.querySelector('#close-reset').addEventListener('click', () => resetDialog.close());
resetDialog.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const first = document.querySelector('#close-reset'), last = document.querySelector('#reset-round');
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
resetDialog.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
  if (resetReturnFocus?.isConnected) resetReturnFocus.focus({ preventScroll: true });
});
document.querySelector('#reset-home').addEventListener('click', () => {
  if (!resetDialog.open || screen !== 'game') return;
  resetDialog.close();
  name = ''; player = null; currentPlayerId = null; round = null; completedResult = null;
  landing(); document.querySelector('#player-name').focus();
});
document.querySelector('#reset-round').addEventListener('click', () => {
  if (!resetDialog.open || screen !== 'game') return;
  resetDialog.close(); startRound();
});
function results() {
  screen = 'results';
  const data = store.read();
  renderResults(root, { result: completedResult, results: data.results, error: saveError || data.error,
    onClear: openClear,
    onPlayAgain: () => { if (screen === 'results') startRound(); },
    onNextPlayer: () => { name = ''; player = null; currentPlayerId = null; round = null; completedResult = null; landing(); document.querySelector('#player-name').focus(); },
    onLeaderboard: () => { leaderboardReturn = 'results'; leaderboard(); }
  });
}
function leaderboard(options = {}) {
  screen = 'leaderboard';
  currentPlayerId = options.currentPlayerId ?? currentPlayerId;
  renderLeaderboard(root, { ...store.read(), currentPlayerId, onBack: () => {
    if (leaderboardReturn === 'results') results();
    else { landing(); document.querySelector('.top-right').focus(); }
  }, onClear: openClear });
}
function openClear(trigger) {
  if (dialog.open) return;
  returnFocus = trigger;
  document.querySelector('#clear-error').hidden = true;
  dialog.showModal();
  document.body.classList.add('modal-open');
  document.querySelector('#cancel-clear').focus();
}
document.querySelector('#cancel-clear').addEventListener('click', () => dialog.close());
document.querySelector('#close-clear').addEventListener('click', () => dialog.close());
dialog.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const first = document.querySelector('#cancel-clear');
  const last = document.querySelector('#close-clear');
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first.focus();
  }
});
document.querySelector('#confirm-clear').addEventListener('click', () => {
  if (!dialog.open) return;
  const { error } = store.clear();
  if (error) {
    const message = document.querySelector('#clear-error');
    message.textContent = error; message.hidden = false; return;
  }
  dialog.close();
  if (screen === 'results') results();
  else { leaderboard(); document.querySelector('.back').focus(); }
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
  if (returnFocus?.isConnected && !returnFocus.disabled) returnFocus.focus({ preventScroll: true });
});
window.addEventListener('storage', event => {
  if (!dialog.open && (event.key === null || event.key?.startsWith('nawras-this-or-that:leaderboard:'))) {
    if (screen === 'leaderboard') leaderboard();
    if (screen === 'results') results();
  }
});
document.addEventListener('keydown', event => {
  if (event.repeat && event.target.closest('button') && ['Enter', ' '].includes(event.key)) event.preventDefault();
});
document.addEventListener('keydown', async event => {
  if (event.key.toLowerCase() !== 'f' || event.repeat || event.ctrlKey || event.metaKey || event.altKey || dialog.open || resetDialog.open) return;
  if (event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch { /* Fullscreen may be unavailable in an embedded preview. */ }
});
const particles = document.querySelector('.particles');
particles.style.setProperty('--particle-image', `url("${assetUrl('pixel-particles.png')}")`);
for (let i = 0; i < 40; i++) {
  const particle = element('i');
  particle.style.cssText = `left:${(i * 43 + 8) % 100}%;top:${(i * 29 + 11) % 100}%;--delay:-${i * 1.7}s;--duration:${22 + i % 11}s`;
  particles.append(particle);
}
landing();
