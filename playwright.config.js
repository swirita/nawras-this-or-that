import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:4178/nawras-this-or-that/', viewport: { width: 1440, height: 900 }, channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
  webServer: { command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4178 --strictPort', url: 'http://127.0.0.1:4178/nawras-this-or-that/', reuseExistingServer: false },
});
