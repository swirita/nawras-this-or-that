import { test, expect } from '@playwright/test';
import questions from '../../src/data/questions.json' with { type: 'json' };
const key = 'nawras-this-or-that:leaderboard:v2';

async function play(page, mode = 'correct') {
  const seen = new Set();
  for (let i = 0; i < 10; i++) {
    await expect(page.getByTestId('progress')).toHaveText(`${i + 1} / 10`);
    const heading = page.locator('[data-question-id]');
    const id = await heading.getAttribute('data-question-id');
    expect(seen.has(id)).toBeFalsy(); seen.add(id);
    const q = questions.find(q => q.id === id);
    expect(await heading.getAttribute('dir')).toBe('rtl');
    await expect(page.locator('.answer-button')).toHaveCount(2);
    const wrong = mode === 'wrong' || (mode === 'mixed' && i === 0);
    const optionId = wrong ? q.options.find(o => o.id !== q.correctOptionId).id : q.correctOptionId;
    const answer = page.locator(`[data-option-id="${optionId}"]`);
    await expect(answer).toBeEnabled();
    if (i === 0) {
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBeTruthy();
      await page.screenshot({ path: 'test-results/game.png' });
    }
    await answer.dblclick();
    await expect(page.locator('.answer-button').nth(0)).toBeDisabled();
    await expect(page.locator('.answer-button').nth(1)).toBeDisabled();
    await expect(page.locator('.correct-answer')).toHaveCount(1);
    if (wrong) await expect(page.locator('.wrong-answer')).toHaveCount(1);
    await expect(page.locator('.feedback h2')).toContainText(wrong ? 'إجابة غير صحيحة' : 'إجابة صحيحة');
    await expect(page.locator('.feedback p')).toHaveText(q.explanation);
    const time = await page.getByTestId('answer-time').textContent();
    await page.waitForTimeout(80);
    expect(await page.getByTestId('answer-time').textContent()).toBe(time);
    if (i === 0) {
      const panel = await page.locator('.question-panel').boundingBox();
      expect(panel.height).toBeLessThan(650);
      await page.screenshot({ path: 'test-results/feedback.png' });
    }
    await page.getByRole('button', { name: 'Next', exact: true }).dblclick();
  }
  expect(seen.size).toBe(10);
  await expect(page.getByRole('heading', { name: 'Round complete' })).toBeVisible();
}

test('round, wrong answers, double clicks, replay best, next-player identity and persistence', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('textbox').fill('  Same name  ');
  await page.getByRole('button', { name: 'Start', exact: true }).dblclick();
  await play(page, 'mixed');
  await expect(page.locator('.result-player')).toHaveText('Same name');
  await expect(page.locator('.result-metrics')).toContainText('90 / 100');
  await expect(page.locator('.result-metrics')).toContainText('9 / 10');
  await expect(page.locator('.current-player')).toHaveCount(1);
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  expect(saved.results).toHaveLength(1);
  expect(Number.isInteger(saved.results[0].answerTimeCs)).toBeTruthy();
  await page.screenshot({ path: 'test-results/results.png' });
  await page.getByRole('button', { name: 'Full Leaderboard' }).click();
  await page.getByRole('button', { name: '← Back' }).click();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)).toEqual(saved);
  await page.getByRole('button', { name: 'Play Again' }).dblclick();
  await expect(page.getByTestId('score')).toHaveText('0');
  await play(page, 'wrong');
  await expect(page.locator('.result-metrics')).toContainText('0 / 100');
  await expect(page.locator('.best-note')).toContainText('Leaderboard shows your best: 90 / 100');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)).toEqual(saved);
  await page.getByRole('button', { name: 'Next Player' }).click();
  await expect(page.getByRole('textbox')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeDisabled();
  await page.getByRole('textbox').fill('Same name');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await play(page);
  await expect(page.locator('.result-metrics')).toContainText('100 / 100');
  const updated = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  expect(updated.results).toHaveLength(2);
  expect(new Set(updated.results.map(r => r.playerId)).size).toBe(2);
  expect(new Set(updated.results.map(r => r.resultId)).size).toBe(2);
  await page.reload();
  await page.getByRole('button', { name: 'Leaderboard', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await page.getByRole('button', { name: 'Clear Leaderboard' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await page.getByRole('button', { name: 'Clear Leaderboard' }).click();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByText('No completed rounds yet.')).toBeVisible();
});

test('unfinished rounds are not saved; current best scrolls only the panel; background counts', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({version:2, results:Array.from({length:20}, (_,i) => ({
    playerId:`seed${i}`, resultId:`round${i}`, name:`Test ${i}`, score:100, answerTimeCs:0
  }))})), key);
  await page.getByRole('textbox').fill('Last row');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.locator('.answer-button').first()).toBeEnabled();
  const initial = await page.getByTestId('answer-time').textContent();
  const other = await context.newPage(); await other.goto('about:blank');
  await other.waitForTimeout(250); await page.bringToFront();
  await expect(page.getByTestId('answer-time')).not.toHaveText(initial);
  expect((await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)).results).toHaveLength(20);
  await other.close();
  await play(page);
  await expect(page.locator('.current-player')).toBeInViewport();
  expect(await page.locator('.leaderboard-panel').evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.screenshot({ path: 'test-results/results-scrolled.png' });
});
