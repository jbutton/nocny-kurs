import { test } from '@playwright/test';
// Zrzuty ekranu do przeglądu wyglądu (bez asercji)
test.use({ viewport: { width: 1440, height: 900 } });

test('zrzuty: rynek, portfel, start', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.screenshot({ path: 'e2e/shots/00-start.png' });
  await page.getByRole('button', { name: /^Normalny/ }).click();
  await page.getByRole('button', { name: 'Pomiń' }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'e2e/shots/08-desktop-market.png' });
  await page.getByRole('button', { name: 'Portfel' }).click();
  await page.screenshot({ path: 'e2e/shots/09-desktop-wallet.png' });
});

for (const city of ['waw', 'krk', 'gda', 'szc', 'wro', 'poz', 'lod', 'kat']) {
  test(`panorama ${city}`, async ({ page }) => {
    await page.goto('./');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole('button', { name: /^Normalny/ }).click();
    await page.evaluate((c) => { const s = JSON.parse(localStorage.getItem('ss_save_v3')!); Object.assign(s, { city: c, tut: 4 }); localStorage.setItem('ss_save_v3', JSON.stringify(s)); }, city);
    await page.reload();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `e2e/shots/city-${city}.png`, clip: { x: 0, y: 450, width: 1440, height: 450 } });
  });
}
