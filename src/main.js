import './styles.css';
import questions from './data/questions.json';
import { hasReviewedSet } from './core/round.js';
import { createLeaderboardStore } from './core/leaderboard.js';
import { renderLanding } from './screens/landing.js';
import { renderLeaderboard } from './screens/leaderboard.js';
import { assetUrl, element } from './ui/dom.js';

const root = document.querySelector('#app');
const dialog = document.querySelector('#clear-dialog');
// Access itself can throw when browser storage is disabled.
const storage = { getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value), removeItem: key => localStorage.removeItem(key) };
const store = createLeaderboardStore(storage);
let name = '', screen = 'landing', currentPlayerId = null, returnFocus;
// Reviewed content and playable presentation are two independent stage gates.
const playableIntegrationReady = false;

function landing() {
  screen = 'landing';
  renderLanding(root, { name, questionsReady: hasReviewedSet(questions) && playableIntegrationReady,
    onName: value => { name = value; }, onStart: () => {}, onLeaderboard: () => leaderboard() });
}
function leaderboard(options = {}) {
  screen = 'leaderboard';
  currentPlayerId = options.currentPlayerId ?? currentPlayerId;
  renderLeaderboard(root, { ...store.read(), currentPlayerId, onBack: () => {
    landing(); document.querySelector('.top-right').focus();
  }, onClear: trigger => {
    returnFocus = trigger;
    document.querySelector('#clear-error').hidden = true;
    dialog.showModal();
    document.body.classList.add('modal-open');
    document.querySelector('#cancel-clear').focus();
  } });
}
document.querySelector('#cancel-clear').addEventListener('click', () => dialog.close());
dialog.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const first = document.querySelector('#cancel-clear');
  const last = document.querySelector('#confirm-clear');
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first.focus();
  }
});
document.querySelector('#confirm-clear').addEventListener('click', () => {
  const { error } = store.clear();
  if (error) {
    const message = document.querySelector('#clear-error');
    message.textContent = error; message.hidden = false; return;
  }
  dialog.close();
  leaderboard();
  document.querySelector('.back').focus();
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
  if (returnFocus?.isConnected && !returnFocus.disabled) returnFocus.focus();
});
window.addEventListener('storage', event => {
  if (screen === 'leaderboard' && !dialog.open && (event.key === null || event.key === 'nawras-this-or-that:leaderboard:v1')) leaderboard();
});
document.addEventListener('keydown', async event => {
  if (event.key.toLowerCase() !== 'f' || event.repeat || event.ctrlKey || event.metaKey || event.altKey || dialog.open) return;
  if (event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch { /* Fullscreen may be unavailable in an embedded preview. */ }
});
const particles = document.querySelector('.particles');
particles.style.setProperty('--particle-image', `url("${assetUrl('pixel-particles.png')}")`);
for (let i = 0; i < 22; i++) {
  const particle = element('i');
  particle.style.cssText = `left:${(i * 43 + 8) % 100}%;top:${(i * 29 + 11) % 100}%;--delay:-${i * 1.7}s;--duration:${14 + i % 9}s`;
  particles.append(particle);
}
landing();
