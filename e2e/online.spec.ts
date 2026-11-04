import { expect, test } from '@playwright/test';
import fixture from './fixtures/day30.json' with { type: 'json' };

// Ranking online end-to-end: wymaga buildu z PUBLIC_API_URL i działającego API (lokalnie: wrangler dev).
// Uruchomienie: ONLINE=1 npx playwright test online
test.skip(!process.env.ONLINE, 'ustaw ONLINE=1, żeby testować ranking online');

test('wynik trafia do rankingu online i jest zweryfikowany przez serwer', async ({ page }) => {
  await page.goto('./');
  await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('ss_save_v3', JSON.stringify(s)); }, fixture);
  await page.reload();
  await page.getByRole('button', { name: 'Zakończ grę' }).first().click();
  await page.locator('#nick').fill('E2E Zbyszek');
  await page.locator('#nick').press('Enter');
  await expect(page.getByText(/miejsce.*wśród wszystkich graczy/)).toBeVisible();
  await expect(page.locator('.brow.me')).toContainText('E2E Zbyszek');
  await page.getByRole('button', { name: /To urządzenie/ }).click();
  await expect(page.locator('.brow.me')).toContainText('E2E Zbyszek');
});
