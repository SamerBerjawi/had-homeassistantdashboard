import { test, expect } from '@playwright/test';
import { openTab, noHorizontalOverflow, AUTH, ctl } from '../helpers/app';

test.describe('D. Energy, system, network, health', () => {
  test('W12 energy period tabs switch without errors', async ({ page }) => {
    const errors = await openTab(page, 'energy');
    for (const p of ['Week', 'Month', 'Year', 'Day']) await ctl(page, p, true).first().click();
    expect(errors).toEqual([]);
  });

  test('W12 prev/next period and rapid double click', async ({ page }) => {
    const errors = await openTab(page, 'energy');
    await ctl(page, 'Previous period').first().dblclick();
    await ctl(page, 'Next period').first().dblclick();
    expect(errors).toEqual([]);
  });

  test('W12 series toggles and compare toggle', async ({ page }) => {
    const errors = await openTab(page, 'energy');
    for (const s of ['Solar', 'Home Load', 'Grid', 'Battery']) {
      await page.locator(`button[title*="${s}"]`).first().click();
    }
    await ctl(page, /Year-over-Year/i).first().click();
    expect(errors).toEqual([]);
  });

  test('W12 calendar opens custom range picker', async ({ page }) => {
    await openTab(page, 'energy');
    await ctl(page, /select custom/i).first().click();
    await page.waitForTimeout(500);
    expect(await noHorizontalOverflow(page)).toBe(true);
  });

  test('W12 refresh energy statistics', async ({ page }) => {
    const errors = await openTab(page, 'energy');
    await ctl(page, 'Refresh energy statistics').first().click();
    expect(errors).toEqual([]);
  });

  test('W17 system sub-tabs and time ranges', async ({ page }) => {
    const errors = await openTab(page, 'system');
    for (const n of ['UGreen NAS', 'Home Assistant Host']) await ctl(page, n).first().click();
    for (const r of ['6h', '24h', '1h']) await ctl(page, r, true).first().click();
    await page.locator('button[title*="Refresh" i]:visible, button[aria-label*="Refresh Data" i]:visible').first().click();
    expect(errors).toEqual([]);
  });

  test('W17 network ranges, search, speed test, reboot confirm/cancel', async ({ page }) => {
    const errors = await openTab(page, 'network');
    for (const r of ['7D', '30D', '90D', '24H']) await ctl(page, r, true).first().click();
    const s = page.getByPlaceholder(/Search clients/);
    await s.fill('zzzz-none');
    await s.fill('');
    await ctl(page, /Reboot/).first().click();
    await expect(ctl(page, /cancel/i).first()).toBeVisible({ timeout: 4000 });
    await ctl(page, /cancel/i).first().click();
    expect(errors).toEqual([]);
  });

  test('W17 network AdGuard tab switch', async ({ page }) => {
    const errors = await openTab(page, 'network');
    await ctl(page, 'AdGuard Home').first().click();
    expect(errors).toEqual([]);
  });

  test('W16 health offers demo preview and sensor scan', async ({ page }) => {
    const errors = await openTab(page, 'health');
    await ctl(page, 'Preview Demo Dashboard').first().click();
    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);
    expect(await noHorizontalOverflow(page)).toBe(true);
  });

  test('API: statistics validation and auth', async ({ request }) => {
    expect((await request.get('/api/statistics/status')).status()).toBe(401);
    expect((await request.get('/api/statistics/history', { headers: AUTH })).status()).toBe(400);
    expect((await request.get('/api/energy/history', { headers: AUTH })).status()).toBe(400);
    expect((await request.get('/api/statistics/status', { headers: AUTH })).status()).toBe(200);
    expect((await request.get('/api/statistics/entities', { headers: AUTH })).status()).toBe(200);
  });

  test('API: statistics history rejects garbage timestamps', async ({ request }) => {
    const r = await request.get('/api/statistics/history?statistic_ids=sensor.x&start=garbage&end=nonsense', { headers: AUTH });
    expect(r.status()).toBeLessThan(500);
  });
});
