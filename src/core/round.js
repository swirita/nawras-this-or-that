export function createPlayer(name) {
  const trimmed = name.trim();
  if (!trimmed) throw new TypeError('Player name is required');
  return { playerId: crypto.randomUUID(), name: trimmed };
}

// Content contract for stage two. Review approval belongs to each selected question.
export function hasReviewedSet(questions) {
  if (!Array.isArray(questions) || questions.length !== 10) return false;
  const ids = new Set();
  return questions.every(q => {
    if (!q || typeof q.id !== 'string' || !q.id || ids.has(q.id)) return false;
    ids.add(q.id);
    return q.reviewed === true && typeof q.prompt === 'string' && q.prompt.trim()
      && typeof q.explanation === 'string' && q.explanation.trim()
      && ['ar', 'en'].includes(q.language)
      && Array.isArray(q.answers) && q.answers.length === 2
      && q.answers.every(a => typeof a.id === 'string' && a.id && typeof a.text === 'string' && a.text.trim())
      && q.answers[0].id !== q.answers[1].id
      && q.answers.some(a => a.id === q.correctAnswerId);
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

// Presentation calls showQuestion only once the question is actually visible.
// next() returns a question but does not start its timer; feedback has no timer.
export function createRound(player, questions, { now = () => performance.now(), random = Math.random, resultId = crypto.randomUUID() } = {}) {
  if (!hasReviewedSet(questions)) throw new TypeError('Ten reviewed questions required');
  const order = shuffle(questions, random).map(q => ({ ...q, answers: shuffle(q.answers, random) }));
  let index = 0, score = 0, totalTime = 0, startedAt = null, answered = false, completed = false, saved = false;
  return {
    get question() { return completed ? null : order[index]; },
    showQuestion() {
      if (!completed && !answered && startedAt === null) startedAt = now();
    },
    hideQuestion() {
      if (startedAt !== null) {
        totalTime += Math.max(0, now() - startedAt);
        startedAt = null;
      }
    },
    answer(answerId) {
      if (completed || answered || startedAt === null) return null;
      const question = order[index];
      if (!question.answers.some(a => a.id === answerId)) return null;
      totalTime += Math.max(0, now() - startedAt);
      startedAt = null;
      answered = true;
      const correct = answerId === question.correctAnswerId;
      if (correct) score += 10;
      return { correct, correctAnswerId: question.correctAnswerId, explanation: question.explanation };
    },
    next() {
      if (!answered || completed) return null;
      index++;
      completed = index === order.length;
      answered = false;
      return completed ? null : order[index];
    },
    get result() {
      return completed ? { ...player, resultId, score, answerTimeMs: Math.round(totalTime) } : null;
    },
    saveCompleted(save) {
      if (!completed || saved) return null;
      const outcome = save(this.result);
      if (!outcome?.error) saved = true;
      return outcome;
    }
  };
}
