import { test } from '@playwright/test';
// Obrazek podglądu linku (Open Graph) 1200×630 → public/og.png.
// Renderujemy w oknie 1800×945 (te same proporcje) i skalujemy ×2/3, żeby telefon miał naturalny kształt.
test.use({ viewport: { width: 1800, height: 945 }, deviceScaleFactor: 2 / 3 });
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
