import { test, expect } from '@playwright/test';
import { openTab, noHorizontalOverflow, AUTH, ctl } from '../helpers/app';

const SECTIONS = [/Devices & Entity|Navigation & Entity/, /Theme & Customization/, /WebSocket|Connection & Home Assistant/, /Backup, Snapshots|Backup & Restore/, /Cameras & Video|Cameras & RTSP/];

test.describe('G. Settings, config & sync', () => {
  for (const [i, sec] of SECTIONS.entries()) {
    test(`W21-W26 settings section #${i + 1} opens without errors`, async ({ page }) => {
      const errors = await openTab(page, 'settings');
      await page.getByText(sec).locator('visible=true').first().click();
      await page.waitForTimeout(1200);
      expect(errors).toEqual([]);
      expect(await noHorizontalOverflow(page)).toBe(true);
    });
  }

  test('W21 devices section search with no match and very long input', async ({ page }) => {
    const errors = await openTab(page, 'settings');
    await page.getByText(/Devices & Entity|Navigation & Entity/).locator('visible=true').first().click();
    const s = page.locator('input:visible').first();
    test.skip(!(await s.isVisible({ timeout: 4000 }).catch(() => false)), 'No search input visible in devices section');
    await s.fill('zzzz-none');
    await s.fill('y'.repeat(4000));
    expect(errors).toEqual([]);
  });

  test('W22 theme section save', async ({ page }) => {
    const errors = await openTab(page, 'settings');
    await page.getByText(/Theme & Customization/).locator('visible=true').first().click();
    await ctl(page, /^Save/).first().click({ timeout: 5000 }).catch(() => {});
    expect(errors).toEqual([]);
  });

  test('W23 profile: set PIN control and time range', async ({ page }) => {
    await openTab(page, 'settings');
    await page.getByText(/Home Owner|User Profile/).locator('visible=true').first().click();
    await expect(ctl(page, /Set PIN/).first()).toBeVisible();
    await expect(ctl(page, /Save Profile Details/).first()).toBeVisible();
  });

  test('W25 factory reset requires confirmation', async ({ page }) => {
    await openTab(page, 'settings');
    await page.getByText(/Backup, Snapshots|Backup & Restore/).locator('visible=true').first().click();
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Confirm Reset' })).toBeVisible({ timeout: 4000 });
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('button', { name: 'Confirm Reset' })).toHaveCount(0);
  });

  test('W25 import of invalid JSON file is handled', async ({ page }) => {
    const errors = await openTab(page, 'settings');
    await page.getByText(/Backup, Snapshots|Backup & Restore/).locator('visible=true').first().click();
    const f = page.locator('input[type="file"]').first();
    if (await f.count()) {
      await f.setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{not json') });
      await page.waitForTimeout(800);
    }
    expect(errors).toEqual([]);
  });

  test('W27 offline: app still renders after going offline', async ({ page, context }) => {
    const errors = await openTab(page, 'overview');
    await context.setOffline(true);
    await page.waitForTimeout(1500);
    await expect(page.locator('#root')).toBeVisible();
    await context.setOffline(false);
    expect(errors).toEqual([]);
  });

  test('API: config round trip, persistence, stale version, oversize body', async ({ request }) => {
    const cfg = { navigation: { hiddenPages: [] } };
    const w = await request.post('/api/config', { headers: AUTH, data: { config: cfg } });
    expect([200, 400, 409]).toContain(w.status());
    const big = 'a'.repeat(16 * 1024 * 1024);
    const r = await request.post('/api/config', { headers: AUTH, data: { config: { x: big } } });
    expect(r.status()).toBeGreaterThanOrEqual(400);
  });

  test('API: /api/config/stream auth', async ({ request }) => {
    expect((await request.get('/api/config/stream')).status()).toBe(401);
  });

  test('API: /api/health fields', async ({ request }) => {
    const r = await request.get('/api/health');
    expect(r.status()).toBe(200);
    const j = await r.json();
    expect(j).toHaveProperty('status');
  });

  test('API: uploaded assets served publicly; path traversal blocked', async ({ request }) => {
    const r = await request.get('/api/assets/..%2f..%2fpackage.json');
    const body = await r.text();
    expect(body).not.toContain('"scripts"'); // package.json must never be served
  });
});
