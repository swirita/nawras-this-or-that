import { element, logo } from '../ui/dom.js';

export function renderLanding(root, { name, questionsReady, onName, onStart, onLeaderboard }) {
  const leaderboard = element('button', { className: 'top-right', text: 'Leaderboard' });
  leaderboard.addEventListener('click', onLeaderboard);
  const input = element('input', { id: 'player-name', name: 'player-name', type: 'text', required: '', maxlength: '80', autocomplete: 'off', dir: 'auto', 'aria-label': 'Player name' });
  input.value = name;
  const start = element('button', { className: 'gold start', type: 'submit', text: 'Start' });
  const update = () => {
    start.disabled = !questionsReady || !input.value.trim();
    start.title = !questionsReady ? 'Available after 10 questions have been reviewed' : 'Enter a player name';
  };
  input.addEventListener('input', () => { onName(input.value); update(); });
  input.addEventListener('blur', () => { input.value = input.value.trim(); onName(input.value); update(); });
  update();
  const form = element('form', { className: 'name-form' }, [
    element('label', { for: 'player-name', text: 'Player name' }), input, start
  ]);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const trimmed = input.value.trim();
    if (questionsReady && trimmed) onStart(trimmed);
  });
  const title = element('h1', { className: 'game-title' }, [
    element('span', { className: 'english-title', text: 'Nawras' }),
    element('span', { className: 'arabic-title', lang: 'ar', dir: 'rtl', text: 'أيّهما؟' })
  ]);
  root.replaceChildren(leaderboard, element('section', { className: 'landing', 'aria-label': 'Nawras أيّهما؟' }, [logo(), title, form]));
}
