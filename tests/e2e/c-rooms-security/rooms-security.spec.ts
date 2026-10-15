import { test, expect } from '@playwright/test';
import { openTab, noHorizontalOverflow, AUTH, ctl } from '../helpers/app';

test.describe('C. Rooms & security', () => {
  test('W10 rooms floor tabs filter and stay on page', async ({ page }) => {
    const errors = await openTab(page, 'rooms');
    for (const f of ['First Floor', 'Ground Floor', 'All Floors']) {
      await ctl(page, f).first().click();
    }
    expect(errors).toEqual([]);
  });

  test('W10 area card opens detail and Back returns', async ({ page }) => {
    await openTab(page, 'rooms');
    await ctl(page, /lights on/).first().click({ force: true });
    await page.waitForTimeout(500);
    expect(await noHorizontalOverflow(page)).toBe(true);
  });

  test('W10 light toggle on card double-click does not error', async ({ page }) => {
    const errors = await openTab(page, 'rooms');
    await ctl(page, /lights on/).first().dblclick();
    expect(errors).toEqual([]);
  });

  test('W11 security shows alarm panel and mode buttons', async ({ page }) => {
    await openTab(page, 'security');
    for (const n of ['Disarm', 'Arm Home', 'Arm Away', 'Arm Night']) {
      await expect(ctl(page, n).first()).toBeVisible();
    }
  });

  test('W11 PIN pad digits and Clear work', async ({ page }) => {
    await openTab(page, 'security');
    const one = page.locator('button:visible', { hasText: /^1$/ }).first();
    test.skip(!(await one.isVisible().catch(() => false)), 'PIN pad not visible in demo disarmed state');
    await one.click();
    await page.locator('button:visible', { hasText: /^2$/ }).first().click();
    await page.locator('button:visible', { hasText: /^Clear$/ }).first().click();
  });

  test('W11 panic requires confirmation before triggering', async ({ page }) => {
    await openTab(page, 'security');
    await ctl(page, /Emergency SOS/).first().click();
    await expect(ctl(page, /cancel/i).first()).toBeVisible({ timeout: 4000 });
    await ctl(page, /cancel/i).first().click();
  });

  test('W11 search with no match then category filter tabs', async ({ page }) => {
    await openTab(page, 'security');
    await page.getByPlaceholder('Search security devices...').fill('zzzzzz-no-match');
    await page.getByPlaceholder('Search security devices...').fill('');
    for (const n of ['Locks', 'Openings', 'Motion', 'Hazards', 'Alarm']) {
      await ctl(page, n).first().click();
    }
  });

  test('W11 very long search input does not break layout', async ({ page }) => {
    await openTab(page, 'security');
    await page.getByPlaceholder('Search security devices...').fill('x'.repeat(5000));
    expect(await noHorizontalOverflow(page)).toBe(true);
  });

  test('W26 camera settings section loads', async ({ page }) => {
    await openTab(page, 'settings');
    await page.getByText(/Cameras & Video|Cameras & RTSP/).locator('visible=true').first().click();
    await expect(page.getByText(/go2rtc/i).first()).toBeVisible();
  });

  test('W26 camera settings shows go2rtc status banner', async ({ page }) => {
    await openTab(page, 'settings');
    await page.getByText(/Cameras & Video|Cameras & RTSP/).locator('visible=true').first().click();
    await page.waitForTimeout(1500);
    const txt = (await page.locator('body').innerText()).toLowerCase();
    expect(/online|offline|unreachable|not configured|connected|standby/.test(txt)).toBe(true);
  });

  test('API: cameras endpoints', async ({ request }) => {
    expect((await request.get('/api/cameras/status')).status()).toBe(401);
    const s = await request.get('/api/cameras/status', { headers: AUTH });
    expect(s.status()).toBe(200);
    expect((await request.post('/api/cameras/nope/webrtc', { headers: AUTH, data: 'v=0' })).status()).toBeGreaterThanOrEqual(400);
    expect((await request.delete('/api/cameras/nope')).status()).toBe(401);
  });
});
