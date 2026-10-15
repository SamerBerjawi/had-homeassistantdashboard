import { test, expect } from '@playwright/test';
import { openTab, noHorizontalOverflow, ctl } from '../helpers/app';

test.describe('F. Automations & integrations', () => {
  test('W18 filters, tabs and search', async ({ page }) => {
    const errors = await openTab(page, 'automations');
    for (const n of ['Automations', 'Scenes', 'Active', 'Paused', 'All Routines']) {
      await page.getByRole('tab', { name: n, exact: true }).or(ctl(page, n, true)).first().click();
    }
    const s = page.getByPlaceholder('Search routines...');
    await s.fill('zzzz-none');
    await s.fill('x'.repeat(3000));
    expect(errors).toEqual([]);
    expect(await noHorizontalOverflow(page)).toBe(true);
  });

  test('W18 run routine, enable/pause all', async ({ page }) => {
    const errors = await openTab(page, 'automations');
    await ctl(page, 'Run this routine now').first().dblclick();
    await ctl(page, 'Pause All').first().click();
    await ctl(page, 'Enable All').first().click();
    expect(errors).toEqual([]);
  });

  test('W19 filters, search and sort', async ({ page }) => {
    const errors = await openTab(page, 'integrations');
    for (const n of ['Official Core', 'HACS Community', 'Add-ons & Apps', 'Updates', 'Attention', 'All Components']) {
      await ctl(page, n).first().click();
      await page.keyboard.press('Escape');
    }
    await page.getByPlaceholder(/Search components/).fill('zzzz-none');
    await page.getByPlaceholder(/Search components/).fill('');
    await ctl(page, /Sort by/).first().click();
    expect(errors).toEqual([]);
  });

  test('W19 inspect opens detail with tabs', async ({ page }) => {
    const errors = await openTab(page, 'integrations');
    await ctl(page, 'Inspect').first().click();
    await page.waitForTimeout(600);
    for (const n of ['Entities', 'Devices', 'Overview']) {
      const b = page.getByRole('tab', { name: new RegExp(`^${n}$`) }).or(page.getByRole('button', { name: new RegExp(`^${n}$`) })).first();
      if (await b.count()) await b.click();
    }
    expect(errors).toEqual([]);
    expect(await noHorizontalOverflow(page)).toBe(true);
  });

  test('W19 refresh integrations', async ({ page }) => {
    const errors = await openTab(page, 'integrations');
    await ctl(page, /Refresh integrations/).first().click();
    expect(errors).toEqual([]);
  });
});
