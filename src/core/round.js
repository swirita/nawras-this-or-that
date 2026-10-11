export function createPlayer(name) {
  const trimmed = name.trim();
  if (!trimmed) throw new TypeError('Player name is required');
  return { playerId: crypto.randomUUID(), name: trimmed };
}

export function hasReviewedSet(questions) {
  if (!Array.isArray(questions) || questions.length !== 10) return false;
  const ids = new Set();
  const optionIds = new Set();
  return questions.every(q => {
    if (!q || typeof q.id !== 'string' || !q.id.trim() || ids.has(q.id)) return false;
    ids.add(q.id);
    return typeof q.prompt === 'string' && !!q.prompt.trim()
      && typeof q.explanation === 'string' && !!q.explanation.trim()
      && Array.isArray(q.options) && q.options.length === 2
      && q.options.every(a => {
        if (typeof a.id !== 'string' || !a.id.trim() || optionIds.has(a.id) || typeof a.label !== 'string' || !a.label.trim()) return false;
        optionIds.add(a.id); return true;
      })
      && q.options.some(a => a.id === q.correctOptionId);
  });
}

export function shuffle(values, random = Math.random) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createRound(player, questions, { now = () => performance.now(), random = Math.random, resultId = crypto.randomUUID() } = {}) {
  if (!hasReviewedSet(questions)) throw new TypeError('Ten valid questions required');
  const order = shuffle(questions, random).map(q => ({ ...q, options: shuffle(q.options, random) }));
  let index = 0, score = 0, totalTime = 0, startedAt = null, answered = false, completed = false, saved = false;
  const elapsed = () => totalTime + (startedAt === null ? 0 : Math.max(0, now() - startedAt));
  return {
    get question() { return completed ? null : order[index]; },
    get progress() { return index + 1; },
    get score() { return score; },
    get answerTimeCs() { return Math.round(elapsed() / 10); },
    showQuestion() {
      if (!completed && !answered && startedAt === null) startedAt = now();
    },
    // Background tabs keep counting; presentation never pauses an active question.
    answer(optionId) {
      if (completed || answered || startedAt === null) return null;
      const question = order[index];
      if (!question.options.some(a => a.id === optionId)) return null;
      totalTime = elapsed(); startedAt = null; answered = true;
      const correct = optionId === question.correctOptionId;
      if (correct) score += 10;
      return { correct, correctOptionId: question.correctOptionId, explanation: question.explanation };
    },
    next() {
      if (!answered || completed) return null;
      index++; completed = index === order.length; answered = false;
      return completed ? null : order[index];
    },
    get result() {
      return completed ? { ...player, resultId, score, answerTimeCs: Math.round(totalTime / 10) } : null;
    },
    saveCompleted(save) {
      if (!completed || saved) return null;
      saved = true;
      return save(this.result);
    }
  };
}
