import { defineConfig } from 'vitest/config';

// Vitest: testy logiki (tests/*.test.ts). Symulacja balansu (*.sim.test.ts) tylko przez `npm run sim`.
// Testy przeglądarkowe (e2e/) uruchamia Playwright.
export default defineConfig({
  test: {
    include: process.env.SIM ? ['tests/**/*.sim.test.ts'] : ['tests/**/*.test.ts'],
    exclude: process.env.SIM ? [] : ['tests/**/*.sim.test.ts'],
  },
});
