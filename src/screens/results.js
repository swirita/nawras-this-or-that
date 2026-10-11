import { element, logo, actionButton } from '../ui/dom.js';
import { formatTime } from '../core/leaderboard.js';
import { createLeaderboardPanel, createClearButton } from './leaderboard.js';

export function renderResults(root, { result, results, error, onPlayAgain, onNextPlayer, onLeaderboard, onClear }) {
  const best = results.find(row => row.playerId === result.playerId);
  const title = element('h1', { text: 'Round complete', tabindex: '-1' });
  const metric = (label, value) => element('div', {}, [element('span', { text: label }), element('strong', { text: value, dir: 'ltr' })]);
  const section = element('section', { className: 'results-screen' }, [
    logo(), title, element('bdi', { className: 'result-player', dir: 'auto', text: result.name }),
    element('div', { className: 'result-metrics' }, [
      metric('Score', `${result.score} / 100`), metric('Correct answers', `${result.score / 10} / 10`), metric('Answer Time', formatTime(result.answerTimeCs))
    ]),
    element('p', { className: 'best-note', text: best && best.resultId !== result.resultId
      ? `Leaderboard shows your best: ${best.score} / 100 · ${formatTime(best.answerTimeCs)}`
      : best ? 'Leaderboard · Your best result' : 'Leaderboard' }),
    createLeaderboardPanel({ results, currentPlayerId: result.playerId }),
    createClearButton(results, onClear),
    element('div', { className: 'results-actions' }, [
      actionButton('Play Again', onPlayAgain, 'gold'), actionButton('Next Player', onNextPlayer), actionButton('Full Leaderboard', onLeaderboard)
    ])
  ]);
  if (error) section.append(element('p', { className: 'status', role: 'alert', text: error }));
  root.replaceChildren(section);
  title.focus({ preventScroll: true });
}
