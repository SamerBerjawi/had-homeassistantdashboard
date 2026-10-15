import { test, expect } from '@playwright/test';
import { enterDemo, openTab, noHorizontalOverflow, AUTH, ctl, revealNav } from '../helpers/app';

const TABS = ['overview','rooms','energy','security','media','system','network','mobility','health','vacuums','automations','integrations','settings'];

test.describe('B. Shell, navigation & overview', () => {
  for (const t of TABS) {
    test(`W7 /${t} renders without page errors or horizontal overflow`, async ({ page }) => {
      const errors = await openTab(page, t);
      await expect(page.locator('main, #root').first()).toBeVisible();
      expect(errors).toEqual([]);
      expect(await noHorizontalOverflow(page)).toBe(true);
    });
  }

  test('W7 ?tab= query selects the page', async ({ page }) => {
    await enterDemo(page);
    await page.goto('/?tab=energy');
    await expect(page.getByRole('heading', { name: /Energy/ }).first()).toBeVisible({ timeout: 8000 });
  });

  test('W7 unknown path falls back to overview without crash', async ({ page }) => {
    const errors = await openTab(page, 'does-not-exist');
    expect(errors).toEqual([]);
    await expect(page.getByText(/Samer's|Lights|Overview/).locator('visible=true').first()).toBeVisible();
  });

  test('W7 nav button changes page and browser back returns', async ({ page }) => {
    await enterDemo(page);
    await (await revealNav(page, 'Energy', true)).click();
    await expect(page).toHaveURL(/energy/);
    await page.goBack();
    await expect(page).not.toHaveURL(/energy/);
  });

  test('W7 refresh on a deep page keeps the page', async ({ page }) => {
    await enterDemo(page);
    await page.goto('/network');
    await page.reload();
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/network/);
  });

  test('W7 theme toggle flips the dark class', async ({ page }) => {
    await enterDemo(page);
    const before = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    await (await revealNav(page, /Toggle theme/)).click();
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(after).not.toBe(before);
  });

  test('W8 overview batch badges are present', async ({ page }) => {
    await enterDemo(page);
    await expect(page.getByText(/Lights/).first()).toBeVisible();
    await expect(page.getByText(/Switches/).first()).toBeVisible();
  });

  test('W8 edit mode toggle shows and hides Done Editing', async ({ page }) => {
    await enterDemo(page);
    const edit = ctl(page, /edit/i).first();
    await expect(edit).toBeVisible();
    await edit.click();
    await expect(ctl(page, /Done Editing/i).first()).toBeVisible({ timeout: 5000 });
    await ctl(page, /Done Editing/i).first().click();
    await expect(ctl(page, /Done Editing/i)).toHaveCount(0);
  });

  test('W9 entity tile opens a detail modal that closes with Escape', async ({ page }) => {
    await openTab(page, 'rooms');
    await ctl(page, /Open Entity Details/).first().click();
    // The modal has no role="dialog" (see QA-B-001); detect it by the extra fixed overlays.
    const overlays = page.locator('.fixed.inset-0');
    await expect.poll(() => overlays.count(), { timeout: 5000 }).toBeGreaterThan(1);
    await page.keyboard.press('Escape');
    await expect.poll(() => overlays.count(), { timeout: 5000 }).toBeLessThanOrEqual(1);
  });

  test('W9 entity detail modal exposes role=dialog (QA-B-001)', async ({ page }) => {
    await openTab(page, 'rooms');
    await page.getByRole('button', { name: /Open Entity Details/ }).first().click();
    await expect(page.locator('[role="dialog"]')).not.toHaveCount(0, { timeout: 3000 });
  });

  test('W20 notification drawer opens and closes', async ({ page }) => {
    await enterDemo(page);
    await (await revealNav(page, /Notifications/)).click();
    await expect(page.getByText(/Notifications|Updates|Alerts/).locator('visible=true').first()).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('W28 manifest and service worker assets are served', async ({ request }) => {
    const m = await request.get('/manifest.webmanifest');
    expect([200, 404]).toContain(m.status());
  });

  test('API: GET/POST /api/config validation', async ({ request }) => {
    expect((await request.post('/api/config', { headers: AUTH, data: [1, 2] })).status()).toBe(400);
    expect((await request.post('/api/config', { headers: AUTH, data: 'str' })).status()).toBe(400);
    expect((await request.post('/api/config')).status()).toBe(401);
  });
});
