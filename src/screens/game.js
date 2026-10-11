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

export function renderGame(root, { round, onComplete, onReset, audio }) {
  let live = true, phase = 'entering', interval, question, buttons = [];
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const score = element('strong', { text: round.score, 'data-testid': 'score' });
  const time = element('strong', { text: formatTime(round.answerTimeCs), 'data-testid': 'answer-time', dir: 'ltr' });
  const stat = (label, value) => element('div', { className: 'game-stat' }, [element('span', { text: label }), value]);
  const progress = element('p', { className: 'progress', dir: 'ltr', 'data-testid': 'progress' });
  const front = element('div', { className: 'card-face card-front', 'aria-hidden': 'true' });
  const back = element('div', { className: 'card-face card-back feedback', 'aria-hidden': 'true' });
  front.inert = true; back.inert = true;
  const card = element('div', { className: 'flip-card' }, [front, back]);
  const scene = element('div', { className: 'question-panel card-scene' }, [card]);
  const reset = element('button', { className: 'reset-button', type: 'button', text: 'Reset / Stop' });
  reset.addEventListener('click', event => {
    if (live && event.detail <= 1) onReset(reset);
  });
  const section = element('section', { className: 'game-screen', tabindex: '-1' }, [
    element('header', { className: 'game-header' }, [stat('Score', score), logo(), stat('Answer Time', time)]),
    progress, element('div', { className: 'card-space' }, [scene, reset])
  ]);
  root.replaceChildren(section);
  section.focus({ preventScroll: true });
  function accessibility(face, accessible) {
    face.inert = !accessible;
    face.setAttribute('aria-hidden', String(!accessible));
  }
  function frames() { return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); }
  async function turn(angle) {
    // A turn has no audio. Cancel any still-playing button or outcome notes.
    audio?.stop?.();
    accessibility(front, false); accessibility(back, false);
    const duration = reduced() ? 0 : 550;
    const from = card.style.transform || 'rotateX(0deg)';
    card.style.transform = `rotateX(${angle}deg)`;
    if (duration) {
      const motion = card.animate([{ transform: from }, { transform: card.style.transform }], {
        duration, easing: 'cubic-bezier(.4,0,.2,1)'
      });
      await motion.finished.catch(() => {});
    }
  }
  function loadQuestion() {
    question = round.question;
    progress.textContent = `${round.progress} / 10`;
    const heading = arabicText('h1', question.prompt, { tabindex: '-1', 'data-question-id': question.id });
    const options = element('div', { className: 'answer-options' });
    buttons = question.options.map(option => {
      const button = element('button', { className: 'answer-button', type: 'button', 'data-option-id': option.id }, [
        element('bdi', { dir: 'ltr', text: option.label })
      ]);
      button.disabled = true;
      button.addEventListener('click', event => select(option.id, button, event));
      return button;
    });
    options.append(...buttons); front.replaceChildren(heading, options);
  }
  async function readyFront() {
    await frames();
    if (!live || !section.isConnected) return;
    accessibility(front, true);
    phase = 'question';
    buttons.forEach(button => { button.disabled = false; });
    round.showQuestion();
    front.querySelector('h1').focus({ preventScroll: true });
    interval = setInterval(() => { if (phase === 'question') time.textContent = formatTime(round.answerTimeCs); }, 50);
  }
  async function select(optionId, selected, event) {
    if (!live || phase !== 'question' || event.detail > 1) return;
    const answer = round.answer(optionId);
    if (!answer) return;
    phase = 'flipping'; clearInterval(interval);
    score.textContent = round.score; time.textContent = formatTime(round.answerTimeCs);
    buttons.forEach((button, index) => {
      button.disabled = true;
      const correct = question.options[index].id === answer.correctOptionId;
      if (correct || (button === selected && !answer.correct)) button.classList.add(correct ? 'correct-answer' : 'wrong-answer');
    });
    section.focus({ preventScroll: true });
    const correct = question.options.find(option => option.id === answer.correctOptionId);
    const status = arabicText('h2', answer.correct ? '✓ إجابة صحيحة' : '✕ إجابة غير صحيحة', {
      tabindex: '-1', className: answer.correct ? 'correct-message' : 'wrong-message'
    });
    const next = element('button', { className: 'gold next', text: 'Next', type: 'button' });
    next.disabled = true;
    next.addEventListener('click', async event => {
      if (!live || phase !== 'reveal' || event.detail > 1) return;
      phase = 'advancing'; next.disabled = true;
      section.focus({ preventScroll: true });
      accessibility(back, false);
      round.next();
      if (round.result) {
        audio?.play('complete'); cleanup(); onComplete(); return;
      }
      // Replace the hidden front while the upright back is still on screen.
      loadQuestion();
      await turn(0);
      if (!live) return;
      back.classList.remove('reveal-ready'); back.replaceChildren();
      await readyFront();
    });
    back.replaceChildren(status, element('bdi', { className: 'reveal-answer', dir: 'ltr', text: correct.label }),
      arabicText('p', answer.explanation), next);
    await turn(180);
    if (!live) return;
    accessibility(back, true); back.classList.add('reveal-ready');
    if (!reduced()) {
      const fade = back.animate([{ opacity: .4 }, { opacity: 1 }], { duration: 120 });
      await fade.finished.catch(() => {});
    }
    if (!live) return;
    phase = 'reveal'; next.disabled = false;
    audio?.play(answer.correct ? 'correct' : 'wrong');
    status.focus({ preventScroll: true });
  }
  loadQuestion();
  (async () => {
    if (!reduced()) {
      const entrance = scene.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 180, easing: 'ease-out' });
      await entrance.finished.catch(() => {});
    }
    await readyFront();
  })();
  function cleanup() {
    live = false; clearInterval(interval);
    for (const animation of section.getAnimations({ subtree: true })) animation.cancel();
  }
  return cleanup;
}
