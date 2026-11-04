import { defineConfig } from 'vitest/config';

// Vitest: tylko testy logiki; testy przeglądarkowe (e2e/) uruchamia Playwright
export default defineConfig({ test: { include: ['tests/**/*.test.ts'] } });
