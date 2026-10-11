import { test, expect } from '@playwright/test';

test('centered upright faces, transition locks and timing, repeated clicks, audio and mute persistence', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.addInitScript(() => {
    const native = window.AudioContext;
    window.audioEvents = [];
    window.AudioContext = class extends native {
      constructor(...args) { super(...args); window.audioEvents.push('init'); }
      createOscillator() {
        const oscillator = super.createOscillator(), start = oscillator.start.bind(oscillator);
        oscillator.start = (...args) => { window.audioEvents.push('tone'); return start(...args); };
        return oscillator;
      }
    };
  });
  await page.goto('./');
  await page.getByRole('textbox').fill('Flip');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.locator('.answer-button').first()).toBeEnabled();
  expect(await page.evaluate(() => audioEvents.filter(e => e === 'init').length)).toBe(1);
  const scene = page.locator('.card-scene');
  const space = await page.locator('.card-space').boundingBox(), before = await scene.boundingBox();
  expect(Math.abs(before.x + before.width / 2 - (space.x + space.width / 2))).toBeLessThan(1);
  expect(Math.abs(before.y + before.height / 2 - (space.y + space.height / 2))).toBeLessThan(1);
  expect(await page.locator('.card-back').getAttribute('aria-hidden')).toBe('true');
  await page.screenshot({ path: 'test-results/flip-front.png' });
  await page.locator('.answer-button').first().evaluate(el => el.addEventListener('click', () => {
    window.flipLock = {
      front: document.querySelector('.card-front').inert,
      back: document.querySelector('.card-back').inert,
      next: document.querySelector('.next').disabled
    };
  }, {once:true}));
  await page.locator('.answer-button').first().click();
  const stopped = await page.getByTestId('answer-time').textContent();
  expect(await page.evaluate(() => flipLock)).toEqual({front:true,back:true,next:true});
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();
  expect(await scene.boundingBox()).toEqual(before);
  expect(await page.getByTestId('answer-time').textContent()).toBe(stopped);
  expect(await page.locator('.card-back').getAttribute('aria-hidden')).toBe('false');
  expect(await page.locator('.card-back').evaluate(el => {
    const a = new DOMMatrix(getComputedStyle(el).transform);
    const b = new DOMMatrix(getComputedStyle(el.parentElement).transform);
    return Math.abs(a.multiply(b).m22 - 1) < .001;
  })).toBeTruthy();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/flip-back.png' });
  await page.getByRole('button', { name: 'Mute sound' }).click();
  const tones = await page.evaluate(() => audioEvents.filter(e => e === 'tone').length);
  const oldId = await page.locator('[data-question-id]').getAttribute('data-question-id');
  await page.locator('.next').evaluate(el => el.addEventListener('click', () => {
    window.returnLock = {
      disabled: document.querySelector('.answer-button').disabled,
      time: document.querySelector('[data-testid="answer-time"]').textContent,
      front: document.querySelector('.card-front').inert
    };
  }, {once:true}));
  await page.getByRole('button', { name: 'Next', exact: true }).dblclick();
  await expect(page.getByTestId('progress')).toHaveText('2 / 10');
  expect(await page.locator('[data-question-id]').getAttribute('data-question-id')).not.toBe(oldId);
  expect(await page.evaluate(() => returnLock)).toEqual({disabled:true,time:stopped,front:true});
  await expect(page.locator('.answer-button').first()).toBeEnabled();
  await page.locator('.answer-button').first().dblclick();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => audioEvents.filter(e => e === 'tone').length)).toBe(tones);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Unmute sound' })).toHaveAttribute('aria-pressed', 'true');
});

test('reduced motion still reveals and advances with hidden faces inert', async ({page}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('./');
  await page.getByRole('textbox').fill('Reduced');
  await page.getByRole('button', {name:'Start',exact:true}).click();
  await expect(page.locator('.answer-button').first()).toBeEnabled();
  await page.locator('.answer-button').first().click();
  await expect(page.getByRole('button', {name:'Next',exact:true})).toBeEnabled();
  expect(await page.locator('.flip-card').evaluate(el=>el.getAnimations().length)).toBe(0);
  expect(await page.locator('.card-front').evaluate(el=>el.inert)).toBeTruthy();
  await page.getByRole('button', {name:'Next',exact:true}).click();
  await expect(page.getByTestId('progress')).toHaveText('2 / 10');
  await expect(page.locator('.answer-button').first()).toBeEnabled();
  expect(await page.locator('.card-back').evaluate(el=>el.inert)).toBeTruthy();
});
