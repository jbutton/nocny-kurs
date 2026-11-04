import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:4321/nocny-kurs/', channel: 'chrome', viewport: { width: 500, height: 900 } },
  // BASE_URL=https://jbutton.github.io/nocny-kurs/ npx playwright test e2e/game.spec.ts — testy na żywej stronie
  webServer: process.env.BASE_URL ? undefined : { command: 'npx astro preview --port 4321', url: 'http://localhost:4321/nocny-kurs/', reuseExistingServer: true },
});
