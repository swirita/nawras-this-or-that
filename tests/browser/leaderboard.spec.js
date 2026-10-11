import { test, expect } from '@playwright/test';
import questions from '../../src/data/questions.json' with { type: 'json' };

const key = 'nawras-this-or-that:leaderboard:v2';
const records = count => Array.from({ length: count }, (_, i) => ({
  playerId: `layout-${i}`, resultId: `layout-round-${i}`, name: `Player ${i} with a readable name`,
  score: 100 - Math.min(i, 10) * 10, answerTimeCs: i + 100
}));

async function geometry(page, long = false) {
  const panel = page.locator('.leaderboard-panel');
  const metrics = await panel.evaluate(el => {
    const table = el.querySelector('table'), row = el.querySelector('tbody tr');
    const bounds = el.getBoundingClientRect(), header = el.querySelectorAll('th');
    return {
      client: el.clientWidth, table: table.getBoundingClientRect().width,
      row: row.getBoundingClientRect().width, horizontal: el.scrollWidth > el.clientWidth,
      scrolling: el.scrollHeight > el.clientHeight,
      gap: el.clientHeight - table.getBoundingClientRect().height,
      gutter: getComputedStyle(el).scrollbarGutter,
      columns: [...header].map((th, i) => {
        const a = th.getBoundingClientRect(), b = row.cells[i].getBoundingClientRect();
        return [a.left - b.left, a.width - b.width];
      }), width: bounds.width
    };
  });
  expect(Math.abs(metrics.client - metrics.table)).toBeLessThan(1);
  expect(Math.abs(metrics.table - metrics.row)).toBeLessThan(1);
  expect(metrics.horizontal).toBe(false);
  expect(metrics.scrolling).toBe(long);
  expect(metrics.gutter).toBe('auto');
  for (const column of metrics.columns) for (const delta of column) expect(Math.abs(delta)).toBeLessThan(1);
  if (!long) expect(Math.abs(metrics.gap)).toBeLessThan(1);
  if (long) {
    await panel.evaluate(el => { el.scrollTop = 250; });
    await expect(page.getByRole('columnheader', { name: 'Rank', exact: true })).toBeInViewport();
  }
}

test('full leaderboard uses full width for short and scrolling lists without modal shifts', async ({ page }) => {
  await page.goto('./');
  for (const count of [2, 30]) {
    await page.evaluate(({ key, rows }) => localStorage.setItem(key, JSON.stringify({ version: 2, results: rows })), { key, rows: records(count) });
    await page.reload();
    await page.getByRole('button', { name: 'Leaderboard', exact: true }).click();
    await geometry(page, count > 2);
    const before = await page.locator('table').boundingBox();
    await page.getByRole('button', { name: 'Clear Leaderboard' }).click();
    expect(await page.locator('table').boundingBox()).toEqual(before);
    await expect(page.getByText('This will permanently delete all saved scores.')).toBeVisible();
    await page.getByRole('button', { name: 'Close clear popup' }).click();
    await expect(page.locator('tbody tr')).toHaveCount(count);
    await page.screenshot({ path: `test-results/leaderboard-width-${count}.png` });
  }
  await page.setViewportSize({ width: 390, height: 700 });
  await geometry(page, true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('results clear preserves round metrics and stays cleared across rerenders and refresh', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page.evaluate(() => localStorage.setItem('another-game', 'keep'));
  await page.getByRole('textbox').fill('Current player');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  for (let i = 0; i < 10; i++) {
    const id = await page.locator('[data-question-id]').getAttribute('data-question-id');
    const q = questions.find(q => q.id === id);
    await page.locator(`[data-option-id="${q.correctOptionId}"]`).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Round complete' })).toBeVisible();
  await geometry(page);
  const displayed = await page.locator('.result-metrics').textContent();
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  for (const dismiss of ['Cancel', 'Escape', 'Close clear popup']) {
    await page.getByRole('button', { name: 'Clear Leaderboard' }).click();
    if (dismiss === 'Escape') await page.keyboard.press('Escape');
    else await page.getByRole('button', { name: dismiss, exact: true }).click();
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)).toEqual(saved);
  }
  await page.evaluate(({ key, rows, saved }) => {
    localStorage.setItem(key, JSON.stringify({ version: 2, results: [...rows, ...saved.results] }));
    window.dispatchEvent(new StorageEvent('storage', { key }));
  }, { key, rows: records(30), saved });
  await geometry(page, true);
  await page.screenshot({ path: 'test-results/results-leaderboard-width.png' });
  const before = await page.locator('table').boundingBox();
  await page.getByRole('button', { name: 'Clear Leaderboard' }).click();
  expect(await page.locator('table').boundingBox()).toEqual(before);
  await page.getByRole('button', { name: 'Clear', exact: true }).dblclick();
  await expect(page.getByText('No completed rounds yet.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clear Leaderboard' })).toBeDisabled();
  expect(await page.locator('.result-metrics').textContent()).toBe(displayed);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBeNull();
  await page.getByRole('button', { name: 'Full Leaderboard' }).click();
  await expect(page.getByRole('button', { name: 'Clear Leaderboard' })).toBeDisabled();
  await page.getByRole('button', { name: '← Back' }).click();
  expect(await page.locator('.result-metrics').textContent()).toBe(displayed);
  await page.evaluate(key => window.dispatchEvent(new StorageEvent('storage', { key })), key);
  await expect(page.getByText('No completed rounds yet.')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('another-game'))).toBe('keep');
  await page.reload();
  await page.getByRole('button', { name: 'Leaderboard', exact: true }).click();
  await expect(page.getByText('No completed rounds yet.')).toBeVisible();
  await page.getByRole('button', { name: '← Back' }).click();
  await page.getByRole('textbox').fill('New completion');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  for (let i = 0; i < 10; i++) {
    await page.locator('.answer-button').first().click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await expect(page.locator('.current-player')).toHaveCount(1);
  expect((await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)).results).toHaveLength(1);
});
