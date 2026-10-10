// Stage two adapter: mount question content only after the reviewed set is supplied.
// Use textContent/bdi for answer text; call round.showQuestion after rendering.
export function applyQuestionDirection(container, question) {
  container.lang = question.language;
  container.dir = question.language === 'ar' ? 'rtl' : 'ltr';
  container.classList.add('question-content');
}
