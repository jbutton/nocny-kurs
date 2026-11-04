import { test, type Page } from '@playwright/test';
// Zrzuty ekranu do README (docs/): sam telefon w naturalnych proporcjach
test.use({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });

// zrzut telefonu razem z ramką (ramka to cień 11 px wokół .phone)
async function shot(page: Page, path: string) {
  const b = (await page.locator('.phone').boundingBox())!;
  const m = 14;
  await page.screenshot({ path, clip: { x: b.x - m, y: b.y - m, width: b.width + 2 * m, height: b.height + 2 * m }, omitBackground: true });
}

async function start(page: Page, path = './') {
  await page.goto(path);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /^(Normalny|Normal)/ }).click();
  await page.getByRole('button', { name: /^(Pomiń|Skip)$/ }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
}

test('readme: rynek (PL)', async ({ page }) => {
  await start(page);
  await page.waitForTimeout(800);
  await shot(page, 'docs/screen-market.png');
});

test('readme: map (EN)', async ({ page }) => {
  await start(page, './en/');
  await page.getByRole('button', { name: 'Map' }).click();
  await page.waitForTimeout(800);
  await shot(page, 'docs/screen-map.png');
});

test('readme: trade sheet (EN)', async ({ page }) => {
  await start(page, './en/');
  await page.getByRole('button', { name: /Weed/ }).first().click();
  await page.waitForTimeout(800);
  await shot(page, 'docs/screen-trade.png');
});
