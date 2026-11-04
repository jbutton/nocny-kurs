import { test } from '@playwright/test';
// Generuje obrazek podglądu linku (Open Graph) 1200×630 do public/og.png
test.use({ viewport: { width: 1200, height: 630 } });
test('og image', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /^Normalny/ }).click();
  await page.getByRole('button', { name: 'Pomiń' }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'public/og.png' });
});
