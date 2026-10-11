import { rankResults, formatTime } from '../core/leaderboard.js';
import { element, logo, actionButton } from '../ui/dom.js';

export function createLeaderboardPanel({ results, currentPlayerId }) {
  const body = element('tbody');
  let currentRow;
  for (const result of rankResults(results)) {
    const current = result.playerId === currentPlayerId;
    const row = element('tr', { className: `${result.rank <= 5 ? `top-rank rank-${result.rank}` : ''} ${current ? 'current-player' : ''}`, 'data-player-id': result.playerId }, [
      element('td', {}, [element('span', { className: 'rank-badge', text: result.rank })]),
      element('td', { className: 'player-cell' }, [element('bdi', { dir: 'auto', text: result.name })]),
      element('td', { text: result.score }), element('td', { text: formatTime(result.answerTimeCs) })
    ]);
    if (current) { row.setAttribute('aria-current', 'true'); currentRow = row; }
    body.append(row);
  }
  if (!results.length) body.append(element('tr', {}, [element('td', { colspan: '4', className: 'empty-state', text: 'No completed rounds yet.' })]));
  const table = element('table', { 'aria-label': 'Leaderboard' }, [
    element('thead', {}, [element('tr', {}, ['Rank', 'Player', 'Score', 'Answer Time'].map(text => element('th', { scope: 'col', text })))]), body
  ]);
  const panel = element('div', { className: 'leaderboard-panel', tabindex: '0', 'aria-label': 'Scrollable leaderboard' }, [table]);
  if (currentRow) requestAnimationFrame(() => {
    if (!panel.isConnected) return;
    panel.scrollTop += currentRow.getBoundingClientRect().top - panel.getBoundingClientRect().top - panel.clientHeight / 2 + currentRow.clientHeight / 2;
  });
  return panel;
}

export function createClearButton(results, onClear) {
  const clear = actionButton('Clear Leaderboard', onClear, 'clear-button');
  clear.disabled = results.length === 0;
  return clear;
}

export function renderLeaderboard(root, { results, error, currentPlayerId, onBack, onClear }) {
  const back = actionButton('← Back', onBack, 'back');
  const clear = createClearButton(results, onClear);
  const section = element('section', { className: 'leaderboard-screen' }, [
    element('div', { className: 'leaderboard-header' }, [back, logo()]),
    element('h1', { text: 'Leaderboard', tabindex: '-1' }), createLeaderboardPanel({ results, currentPlayerId }), clear
  ]);
  if (error) section.append(element('p', { className: 'status', role: 'status', text: error }));
  root.replaceChildren(section);
  section.querySelector('h1').focus({ preventScroll: true });
}
