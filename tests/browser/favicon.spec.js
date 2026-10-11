import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';

test('branding icons decode as images with exactly one base in dev and production', async ({ page }) => {
  const dev = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5184', '--strictPort'], { stdio: 'ignore' });
  const devUrl = 'http://127.0.0.1:5184/nawras-this-or-that/';
  try {
    await expect.poll(async () => {
      try { return (await page.request.get(devUrl)).ok(); } catch { return false; }
    }, { timeout: 10000 }).toBe(true);
    for (const url of ['./', devUrl]) {
      await page.goto(url);
      for (const link of await page.locator('link[rel="icon"], link[rel="apple-touch-icon"]').all()) {
        const href = await link.evaluate(el => el.href);
        expect(new URL(href).pathname.match(/nawras-this-or-that/g)).toHaveLength(1);
        const response = await page.request.get(href);
        expect(response.ok()).toBe(true);
        expect(response.headers()['content-type']).toMatch(/^image\//);
        expect(await page.evaluate(async href => {
          const image = new Image(); image.src = href;
          try { await image.decode(); return image.naturalWidth > 0; } catch { return false; }
        }, href)).toBe(true);
      }
    }
  } finally { dev.kill(); }
});
