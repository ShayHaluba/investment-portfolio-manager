const { test, expect } = require('@playwright/test');
const path = require('path');

const pageUrl = `file://${path.resolve(__dirname, '../index.html')}`;

test.beforeEach(async ({ page }) => {
  await page.goto(pageUrl);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('page loads with title and 8 ETF rows', async ({ page }) => {
  await expect(page.locator('h1')).toContainText('Portfolio Rebalancer');
  const rows = page.locator('#holdingsBody tr');
  await expect(rows).toHaveCount(8);
});

test('all expected ETF tickers are shown', async ({ page }) => {
  const tickers = ['CNDX', 'IWDA', 'ISPY', 'IUIT', 'EIMI', 'TA125', 'QQQ', 'VGT'];
  for (const ticker of tickers) {
    await expect(page.locator('#holdingsBody .ticker', { hasText: ticker }).first()).toBeVisible();
  }
});

test('target percentages sum to 100%', async ({ page }) => {
  const sum = await page.locator('#tgt-sum').textContent();
  expect(sum?.trim()).toBe('100%');
});

test('calculate buys shows buy section', async ({ page }) => {
  const prices = ['500', '800', '300', '400', '250', '200', '480', '570'];
  for (let i = 0; i < prices.length; i++) {
    await page.locator(`#pr${i}`).fill(prices[i]);
  }

  await expect(page.locator('#buySection')).toBeHidden();
  await page.getByRole('button', { name: /Calculate buys/i }).click();
  await expect(page.locator('#buySection')).toBeVisible();
});

test('approve buy button appears after calculate and updates holdings', async ({ page }) => {
  const prices = ['500', '800', '300', '400', '250', '200', '480', '570'];
  for (let i = 0; i < prices.length; i++) {
    await page.locator(`#pr${i}`).fill(prices[i]);
  }

  await page.getByRole('button', { name: /Calculate buys/i }).click();
  await expect(page.locator('#buySection')).toBeVisible();

  const approveBtn = page.getByRole('button', { name: /Approve buy/i });
  await expect(approveBtn).toBeVisible();

  // QQQ is index 6 with 6 units pre-set
  const unitsInput = page.locator('#holdingsBody tr').nth(6).locator('input[type=number]').nth(1);
  const unitsBefore = Number(await unitsInput.inputValue());

  await approveBtn.click();

  await expect(page.locator('#buySection')).toBeHidden();
  const unitsAfter = Number(await unitsInput.inputValue());
  expect(unitsAfter).toBeGreaterThanOrEqual(unitsBefore);
});

test('save holdings persists units across page reload', async ({ page }) => {
  const unitsInput = page.locator('#holdingsBody tr').nth(0).locator('input[type=number]').nth(1);
  await unitsInput.fill('42');
  // Trigger refresh by changing price
  await page.locator('#pr0').fill('500');

  await page.getByRole('button', { name: /Save holdings/i }).click();
  await expect(page.locator('#saveConfirm')).toBeVisible();

  await page.reload();

  const unitsAfterReload = page.locator('#holdingsBody tr').nth(0).locator('input[type=number]').nth(1);
  await expect(unitsAfterReload).toHaveValue('42');
});

test('portfolio value updates when units and price are entered', async ({ page }) => {
  const unitsInput = page.locator('#holdingsBody tr').nth(0).locator('input[type=number]').nth(1);
  await unitsInput.fill('10');
  await unitsInput.press('Tab');

  await page.locator('#pr0').fill('1000');
  await page.locator('#pr0').press('Tab');

  await expect(page.locator('#m-total')).not.toContainText('₪0');
});
