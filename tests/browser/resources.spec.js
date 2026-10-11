import { test, expect } from '@playwright/test';

test('repeated reset, home and replay retain one timer and no accumulating listeners or frames', async ({ page }) => {
  await page.addInitScript(() => {
    const activeIntervals = new Set(), activeFrames = new Set(), listeners = new Map();
    const interval = window.setInterval.bind(window), clear = window.clearInterval.bind(window);
    window.setInterval = (...args) => { const id = interval(...args); activeIntervals.add(id); return id; };
    window.clearInterval = id => { activeIntervals.delete(id); clear(id); };
    const raf = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => {
      const id = raf(time => { activeFrames.delete(id); callback(time); }); activeFrames.add(id); return id;
    };
    window.cancelAnimationFrame = id => { activeFrames.delete(id); cancel(id); };
    const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (this === document || this === window) {
        const key = `${this === document ? 'document' : 'window'}:${type}`;
        if (!listeners.has(key)) listeners.set(key, new Set()); listeners.get(key).add(listener);
      }
      return add.call(this, type, listener, options);
    };
    EventTarget.prototype.removeEventListener = function(type, listener, options) {
      listeners.get(`${this === document ? 'document' : 'window'}:${type}`)?.delete(listener);
      return remove.call(this, type, listener, options);
    };
    window.resources = () => ({ intervals: activeIntervals.size, frames: activeFrames.size,
      visibility: listeners.get('document:visibilitychange')?.size || 0,
      click: listeners.get('document:click')?.size || 0,
      keydown: listeners.get('document:keydown')?.size || 0 });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  const baseline = await page.evaluate(() => resources());
  expect(baseline.intervals).toBe(0);
  const assertResources = async playing => {
    await expect.poll(() => page.evaluate(() => resources().intervals)).toBe(playing ? 1 : 0);
    const current = await page.evaluate(() => resources());
    expect(current.visibility).toBe(baseline.visibility + (playing ? 1 : 0));
    await expect.poll(() => page.evaluate(() => resources().frames)).toBe(0);
    expect(current.click).toBe(baseline.click); expect(current.keydown).toBe(baseline.keydown);
    await expect(page.locator('.particles')).toHaveCount(1);
    await expect(page.locator('.particles i')).toHaveCount(40);
  };
  for (let run = 0; run < 3; run++) {
    await page.getByRole('textbox').fill('Isolated lifecycle check');
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await expect(page.locator('.answer-button').first()).toBeEnabled();
    await assertResources(true);
    for (let reset = 0; reset < 4; reset++) {
      await page.getByRole('button', { name: 'Reset / Stop' }).click();
      await page.getByRole('button', { name: 'Reset Game', exact: true }).click();
      await expect(page.locator('.answer-button').first()).toBeEnabled();
      await assertResources(true);
    }
    for (let question = 0; question < 10; question++) {
      await page.locator('.answer-button').first().click();
      await expect.poll(() => page.evaluate(() => resources().intervals)).toBe(0);
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
    await expect(page.getByRole('heading', { name: 'Round complete' })).toBeVisible();
    await assertResources(false);
    await page.getByRole('button', { name: 'Play Again' }).click();
    await expect(page.locator('.answer-button').first()).toBeEnabled();
    await assertResources(true);
    await page.getByRole('button', { name: 'Reset / Stop' }).click();
    await page.getByRole('button', { name: 'Home Screen' }).click();
    await assertResources(false);
  }
});

test('hidden tabs pause particles and timer polling while answer time continues', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('textbox').fill('Visibility check');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.locator('.answer-button').first()).toBeEnabled();
  await page.evaluate(() => {
    // Deterministic Page Visibility simulation; the engine still uses real performance.now().
    window.hidePage = hidden => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
      document.dispatchEvent(new Event('visibilitychange'));
    };
    hidePage(true);
  });
  const frozenDisplay = await page.getByTestId('answer-time').textContent();
  const particle = page.locator('.particles i').first();
  expect(await particle.evaluate(el => getComputedStyle(el).animationPlayState)).toBe('paused');
  const before = await particle.evaluate(el => getComputedStyle(el).transform);
  await page.waitForTimeout(250);
  expect(await page.getByTestId('answer-time').textContent()).toBe(frozenDisplay);
  expect(await particle.evaluate(el => getComputedStyle(el).transform)).toBe(before);
  await page.evaluate(() => hidePage(false));
  await expect(page.getByTestId('answer-time')).not.toHaveText(frozenDisplay);
  expect(await particle.evaluate(el => getComputedStyle(el).animationPlayState)).toBe('running');
  await page.locator('.answer-button').first().evaluate(el => el.addEventListener('click', () => hidePage(true), { once: true }));
  await page.locator('.answer-button').first().click();
  const stopped = await page.getByTestId('answer-time').textContent();
  expect(await page.locator('.flip-card').evaluate(el => el.getAnimations().some(animation => animation.playState === 'paused'))).toBe(true);
  await expect(page.locator('.next')).toBeDisabled();
  await page.waitForTimeout(80);
  expect(await page.getByTestId('answer-time').textContent()).toBe(stopped);
  await page.evaluate(() => hidePage(false));
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();
  expect(await page.getByTestId('answer-time').textContent()).toBe(stopped);
});
