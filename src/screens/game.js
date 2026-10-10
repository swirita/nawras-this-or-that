import { element, logo } from '../ui/dom.js';
import { formatTime } from '../core/leaderboard.js';

// Plain text plus isolated Latin runs; data never becomes HTML.
export function arabicText(tag, text, attributes = {}) {
  const node = element(tag, { ...attributes, lang: 'ar', dir: 'rtl' });
  for (const part of text.split(/([A-Za-z0-9][A-Za-z0-9 .+/-]*)/g)) {
    if (/^[A-Za-z0-9]/.test(part)) {
      const label = part.trimEnd();
      node.append(element('bdi', { dir: 'ltr', text: label }), document.createTextNode(part.slice(label.length)));
    } else node.append(document.createTextNode(part));
  }
  return node;
}

export function renderGame(root, { round, onComplete }) {
  const question = round.question;
  let live = true, locked = false, advanced = false, interval;
  const score = element('strong', { text: round.score, 'data-testid': 'score' });
  const time = element('strong', { text: formatTime(round.answerTimeCs), 'data-testid': 'answer-time', dir: 'ltr' });
  const stat = (label, value) => element('div', { className: 'game-stat' }, [element('span', { text: label }), value]);
  const heading = arabicText('h1', question.prompt, { tabindex: '-1', 'data-question-id': question.id });
  const options = element('div', { className: 'answer-options' });
  const feedback = element('div', { className: 'feedback', 'aria-live': 'polite', 'aria-atomic': 'true' });
  const next = element('button', { className: 'gold next', text: 'Next', type: 'button' });
  const buttons = question.options.map(option => {
    const button = element('button', { className: 'answer-button', type: 'button', 'data-option-id': option.id }, [
      element('bdi', { dir: 'ltr', text: option.label }), element('span', { className: 'answer-marker' })
    ]);
    button.disabled = true;
    button.addEventListener('click', event => {
      if (!live || locked || event.detail > 1) return;
      const answer = round.answer(option.id);
      if (!answer) return;
      locked = true;
      clearInterval(interval);
      score.textContent = round.score; time.textContent = formatTime(round.answerTimeCs);
      for (const [index, other] of buttons.entries()) {
        other.disabled = true;
        const correct = question.options[index].id === answer.correctOptionId;
        const wrong = other === button && !answer.correct;
        if (correct || wrong) {
          other.classList.add(correct ? 'correct-answer' : 'wrong-answer');
          other.querySelector('.answer-marker').textContent = correct ? '✓ صحيح' : '✕ اختيارك';
        }
      }
      feedback.replaceChildren(arabicText('h2', answer.correct ? '✓ إجابة صحيحة' : '✕ إجابة غير صحيحة', { className: answer.correct ? 'correct-message' : 'wrong-message' }),
        arabicText('p', answer.explanation), next);
    });
    return button;
  });
  options.append(...buttons);
  next.addEventListener('click', event => {
    if (!live || advanced || !locked || event.detail > 1) return;
    advanced = true; next.disabled = true;
    round.next();
    cleanup();
    if (round.result) onComplete(); else renderNext();
  });
  const section = element('section', { className: 'game-screen' }, [
    element('header', { className: 'game-header' }, [stat('Score', score), logo(), stat('Answer Time', time)]),
    element('p', { className: 'progress', text: `${round.progress} / 10`, dir: 'ltr', 'data-testid': 'progress' }),
    element('div', { className: 'question-panel' }, [heading, options, feedback])
  ]);
  root.replaceChildren(section);
  heading.focus({ preventScroll: true });
  // Two frames commit the static question before interaction and its clock begin.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (!live || !section.isConnected) return;
    buttons.forEach(button => { button.disabled = false; });
    round.showQuestion();
    interval = setInterval(() => { if (live && !locked) time.textContent = formatTime(round.answerTimeCs); }, 50);
  }));
  function cleanup() { live = false; clearInterval(interval); }
  function renderNext() { renderGame(root, { round, onComplete }); }
  return cleanup;
}
