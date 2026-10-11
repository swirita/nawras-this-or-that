import { test, expect } from '@playwright/test';
import questions from '../../src/data/questions.json' with { type: 'json' };

// Measure visible navy glyphs in an actual browser screenshot, not the label's line box.
async function inkCenter(page, button) {
  const png = (await button.screenshot()).toString('base64');
  return page.evaluate(async png => {
    const image = await createImageBitmap(new Blob([Uint8Array.from(atob(png), c => c.charCodeAt(0))], { type: 'image/png' }));
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    const { data } = ctx.getImageData(0, 0, image.width, image.height);
    let left = image.width, right = 0, top = image.height, bottom = 0;
    for (let y = 6; y < image.height - 6; y++) for (let x = 6; x < image.width - 6; x++) {
      const i = (y * image.width + x) * 4;
      if (data[i] < 70 && data[i + 1] < 110 && data[i + 2] < 140) {
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
    return { x: (left + right + 1 - image.width) / 2, y: (top + bottom + 1 - image.height) / 2, top, bottom, height: image.height };
  }, png);
}

test('actual answer glyphs are centered, including Linux, Windows 95 and wrapped labels', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./'); await page.getByRole('textbox').fill('Visual check');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  for (let i = 0; i < 10; i++) {
    await expect(page.locator('.answer-button').first()).toBeEnabled();
    for (const button of await page.locator('.answer-button').all()) {
      const label = await button.innerText(), ink = await inkCenter(page, button);
      expect(Math.abs(ink.x), `${label}: horizontal ink centering`).toBeLessThanOrEqual(2);
      expect(Math.abs(ink.y), `${label}: vertical ink centering`).toBeLessThanOrEqual(3);
    }
    if (await page.getByRole('button', { name: 'Linux', exact: true }).count()) await page.screenshot({ path: 'test-results/linux-centered.png' });
    await page.locator('.answer-button').first().click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Play Again' }).click();
  await expect(page.locator('.answer-button').first()).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 800 });
  const button = page.locator('.answer-button').first();
  await button.locator('bdi').evaluate(el => { el.textContent = 'Windows 95 Linux Windows 95 Linux'; });
  const ink = await inkCenter(page, button);
  expect(Math.abs(ink.y)).toBeLessThanOrEqual(3);
  expect(ink.top).toBeGreaterThan(6); expect(ink.bottom).toBeLessThan(ink.height - 6);
  await page.screenshot({ path: 'test-results/wrapped-centered.png' });
});

test('both animated flips start no sounds and cancel notes; correct and wrong sounds follow reveal', async ({ page }) => {
  await page.addInitScript(() => {
    const Native = window.AudioContext; window.audioStarts = []; window.audioStops = [];
    window.AudioContext = class extends Native {
      createOscillator() {
        const o = super.createOscillator(), start = o.start.bind(o), stop = o.stop.bind(o);
        o.start = (...args) => { audioStarts.push(performance.now()); return start(...args); };
        o.stop = (...args) => { audioStops.push({ at: performance.now(), immediate: !args.length }); return stop(...args); };
        return o;
      }
      createBufferSource() { throw Error('No flip/noise source is allowed'); }
    };
  });
  await page.goto('./'); await page.getByRole('textbox').fill('Sound check');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  for (const correct of [true, false]) {
    await expect(page.locator('.answer-button').first()).toBeEnabled();
    const id = await page.locator('[data-question-id]').getAttribute('data-question-id'), q = questions.find(q => q.id === id);
    const option = correct ? q.correctOptionId : q.options.find(o => o.id !== q.correctOptionId).id;
    const before = await page.evaluate(() => audioStarts.length);
    await page.locator(`[data-option-id="${option}"]`).click();
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => audioStarts.length)).toBe(before);
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();
    expect(await page.evaluate(() => audioStarts.length)).toBe(before + (correct ? 3 : 2));
    const stops = await page.evaluate(() => audioStops.filter(s => s.immediate).length);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => audioStarts.length)).toBe(before + (correct ? 3 : 2));
    expect(await page.evaluate(() => audioStops.filter(s => s.immediate).length)).toBeGreaterThan(stops);
    await expect(page.locator('.answer-button').first()).toBeEnabled();
  }
});
