import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('start: wybór trudności, samouczek, kupno bez migania, podróż, sprzedaż', async ({ page }) => {
  await expect(page.getByText('Wybierz poziom trudności')).toBeVisible();
  await page.screenshot({ path: 'e2e/shots/01-difficulty.png' });
  await page.getByRole('button', { name: /^Normalny/ }).click();
  await expect(page.getByText('Siema, tu Seba!')).toBeVisible();
  await page.screenshot({ path: 'e2e/shots/02-market.png' });

  await page.getByRole('button', { name: /Marihuana/ }).first().click();
  const sheet = page.getByRole('dialog');
  const slider = sheet.locator('input[type=range]');
  const handle = await slider.elementHandle();
  await slider.fill('5');
  await sheet.getByRole('button', { name: '+1' }).click();
  // ten sam element DOM po zmianach = brak przebudowy (brak migania)
  expect(await slider.elementHandle().then((h) => h?.evaluate((el, o) => el === o, handle))).toBe(true);
  await expect(sheet.locator('.n')).toHaveText('6');
  await page.screenshot({ path: 'e2e/shots/03-sheet.png' });
  await sheet.getByRole('button', { name: /Kup 6 szt/ }).click();
  await expect(page.getByText('Kupiono 6 × Marihuana')).toBeVisible();

  await page.getByRole('button', { name: 'Mapa' }).click();
  await page.getByRole('button', { name: /Kraków/ }).click();
  await page.getByRole('button', { name: /Jedź \(bilet/ }).click();
  await expect(page.locator('.day')).toContainText('Dzień 2 z 30');
  await page.getByRole('button', { name: /Marihuana/ }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: /Sprzedaj 6 szt/ }).click();
  await expect(page.getByText('Widzisz zysk?')).toBeVisible();
});

test('autozapis: po odświeżeniu gra trwa dalej', async ({ page }) => {
  await page.getByRole('button', { name: /^Łatwy/ }).click();
  await page.getByRole('button', { name: /Marihuana/ }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: /Kup/ }).last().click();
  await page.reload();
  await expect(page.getByText(/Wczytano zapisaną grę/)).toBeVisible();
  await expect(page.locator('.day')).toContainText('z 45');
});

test('sklep, gwiazdki, język EN', async ({ page }) => {
  await page.getByRole('button', { name: /^Trudny/ }).click();
  await page.getByRole('button', { name: 'Sklep' }).click();
  await expect(page.getByText('Duży plecak')).toBeVisible();
  await page.getByRole('button', { name: /^1\s?500 zł/ }).click();
  await expect(page.locator('.stat').nth(2)).toContainText('/150');
  await page.screenshot({ path: 'e2e/shots/04-shop.png' });
  await page.getByRole('button', { name: 'EN' }).click();
  await expect(page.getByRole('button', { name: 'Shop' })).toBeVisible();
  await page.getByRole('button', { name: 'Map' }).click();
  await page.screenshot({ path: 'e2e/shots/05-map-en.png' });
});

test('koniec gry: nick i ranking', async ({ page }) => {
  await page.getByRole('button', { name: /^Normalny/ }).click();
  // przewijamy grę do ostatniego dnia przez zapis
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('ss_save_v3')!);
    Object.assign(s, { day: 30, cash: 50000, debt: 0, tut: 4 });
    localStorage.setItem('ss_save_v3', JSON.stringify(s));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Zakończ grę' }).click();
  await page.locator('#nick').fill('Zbyszek');
  await page.locator('#nick').press('Enter');
  await expect(page.locator('.brow.me')).toContainText('Zbyszek');
  await expect(page.getByText('Zająłeś 1. miejsce')).toBeVisible();
  await page.screenshot({ path: 'e2e/shots/06-board.png' });
});

test('częściowa spłata długu i bank', async ({ page }) => {
  await page.getByRole('button', { name: /^Normalny/ }).click();
  await page.getByRole('button', { name: 'Portfel' }).click();
  const debtCard = page.locator('.wcard').first();
  await debtCard.getByRole('button', { name: '25%' }).click();
  await expect(debtCard.getByRole('button', { name: /Spłać 500 zł/ })).toBeVisible();
  await debtCard.locator('input[type=number]').fill('300');
  await page.screenshot({ path: 'e2e/shots/07-wallet.png' });
  await debtCard.getByRole('button', { name: /Spłać 300 zł/ }).click();
  await expect(page.locator('.stat').nth(1)).toContainText('4700 zł');
  await expect(page.locator('.stat').nth(0)).toContainText('1700 zł');
  const bank = page.locator('.wcard').nth(1);
  await bank.getByRole('button', { name: '50%' }).click();
  await bank.getByRole('button', { name: /Wpłać 850 zł/ }).click();
  await expect(page.locator('.stat').nth(0)).toContainText('850 zł');
});

test('wersja angielska pod /en/ i przełączanie języka zmienia adres', async ({ page }) => {
  await page.goto('./en/');
  await expect(page.getByText('Choose difficulty')).toBeVisible();
  await expect(page).toHaveTitle(/Night Run/);
  await page.getByRole('button', { name: /^Normal/ }).click();
  await page.getByRole('button', { name: 'PL' }).click();
  await expect(page).toHaveURL(/\/nocny-kurs\/$/);
  await expect(page).toHaveTitle(/Nocny Kurs/);
});

test('jazda na gapę bez pieniędzy', async ({ page }) => {
  await page.getByRole('button', { name: /^Normalny/ }).click();
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('ss_save_v3')!); Object.assign(s, { cash: 10, tut: 4 }); localStorage.setItem('ss_save_v3', JSON.stringify(s)); });
  await page.reload();
  await page.getByRole('button', { name: 'Mapa' }).click();
  await page.getByRole('button', { name: /Kraków/ }).click();
  await expect(page.getByText('Nie stać cię na bilet')).toBeVisible();
  await expect(page.getByRole('button', { name: /Jedź \(bilet/ })).toHaveCount(0);
  await page.getByRole('button', { name: /Jedź na gapę/ }).click();
  await expect(page.locator('.day')).toContainText('Dzień 2');
});

test('auto bez kasy na paliwo: pożyczka i jazda, bez opcji na gapę', async ({ page }) => {
  await page.getByRole('button', { name: /^Normalny/ }).click();
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('ss_save_v3')!); Object.assign(s, { cash: 20, tut: 4, vehicle: 'car', cap: 350 }); localStorage.setItem('ss_save_v3', JSON.stringify(s)); });
  await page.reload();
  await page.getByRole('button', { name: 'Mapa' }).click();
  await expect(page.getByText('paliwo 65 zł')).toBeVisible();
  await page.getByRole('button', { name: /Kraków/ }).click();
  await expect(page.getByText('Nie stać cię na paliwo')).toBeVisible();
  await expect(page.getByRole('button', { name: /na gapę/ })).toHaveCount(0);
  await page.getByRole('button', { name: /Pożycz 45 zł od Zbycha i jedź/ }).click();
  await expect(page.locator('.day')).toContainText('Dzień 2');
});
