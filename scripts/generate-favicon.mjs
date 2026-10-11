import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

// Keep the supplied branding image intact; create browser-sized icon variants.
const source = await readFile(new URL('../public/assets/branding/nawras-small.png', import.meta.url));
const browser = await chromium.launch({ channel: 'chromium' });
try {
  const page = await browser.newPage();
  const images = await page.evaluate(async data => {
    const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
    return [16, 32, 48].map(size => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d'); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(image, 0, 0, size, size);
      return { size, data: canvas.toDataURL('image/png').split(',')[1] };
    });
  }, source.toString('base64'));
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  const buffers = images.map(({ size, data }, index) => {
    const png = Buffer.from(data, 'base64'), entry = 6 + index * 16;
    header[entry] = header[entry + 1] = size;
    header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8); header.writeUInt32LE(offset, entry + 12);
    offset += png.length; return png;
  });
  for (let i = 0; i < images.length; i++) {
    await writeFile(new URL(`../public/assets/branding/favicon-${images[i].size}.png`, import.meta.url), buffers[i]);
  }
  await writeFile(new URL('../public/favicon.ico', import.meta.url), Buffer.concat([header, ...buffers]));
} finally { await browser.close(); }
