import { expect, test } from '@playwright/test';

// Ranking online end-to-end: wymaga buildu z PUBLIC_API_URL i działającego API (lokalnie: npm run api:dev).
// Uruchomienie: ONLINE=1 npx playwright test online
test.skip(!process.env.ONLINE, 'ustaw ONLINE=1, żeby testować ranking online');

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

const save = (page: import('@playwright/test').Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('ss_save_v3')!) as { day: number; run?: { id: string; synced: number } | null; log: unknown[] });

async function travel(page: import('@playwright/test').Page, city: RegExp) {
  await page.getByRole('button', { name: 'Mapa' }).click();
  await page.getByRole('button', { name: city }).click();
  await page.getByRole('button', { name: /Jedź \(bilet/ }).click();
}

test('gra rankingowa: seed i losowość od serwera, brak sieci → ponów albo graj offline', async ({ page }) => {
  await page.getByRole('button', { name: /^Normalny/ }).click();
  await expect.poll(async () => (await save(page)).run?.id).toBeTruthy();
  await page.getByRole('button', { name: /Marihuana/ }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: /Kup/ }).last().click();

  await travel(page, /Kraków/);
  await expect(page.locator('.day')).toContainText('Dzień 2 z 30');
  const s1 = await save(page);
  expect(s1.run!.synced).toBe(s1.log.length);
  expect(s1.log.some((a) => (a as unknown[])[0] === 'e')).toBe(true);

  // serwer nie odpowiada → okno z wyborem, dzień się nie zmienia
  await page.route('**/api/runs/**', (r) => r.abort());
  await travel(page, /Katowice/);
  await expect(page.getByText('Brak połączenia')).toBeVisible();
  await expect(page.locator('.day')).toContainText('Dzień 2 z 30');
  await page.unroute('**/api/runs/**');
  await page.getByRole('button', { name: 'Spróbuj ponownie' }).click();
  await expect(page.locator('.day')).toContainText('Dzień 3 z 30');
  expect((await save(page)).run).toBeTruthy();

  await page.route('**/api/runs/**', (r) => r.abort());
  await travel(page, /Kraków/);
  await page.getByRole('button', { name: 'Graj dalej bez rankingu online' }).click();
  await expect(page.locator('.day')).toContainText('Dzień 4 z 30');
  expect((await save(page)).run).toBeNull();
});

test('podrobiony zapis gry: serwer sam liczy wynik i odrzuca zgłoszenie', async ({ page }) => {
  await page.getByRole('button', { name: /^Normalny/ }).click();
  await expect.poll(async () => (await save(page)).run?.id).toBeTruthy();
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('ss_save_v3')!);
    Object.assign(s, { day: 30, cash: 9_000_000, debt: 0, tut: 4 });
    localStorage.setItem('ss_save_v3', JSON.stringify(s));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Zakończ grę' }).first().click();
  await page.locator('#nick').fill('E2E Oszust');
  await page.locator('#nick').press('Enter');
  await expect(page.getByText(/Nie udało się wysłać wyniku do rankingu online \(score\)/)).toBeVisible();
  await page.getByRole('button', { name: /To urządzenie/ }).click();
  await expect(page.locator('.brow.me')).toContainText('E2E Oszust');
});
