import { test, expect } from '@playwright/test';
import { openTab, noHorizontalOverflow, AUTH, ctl } from '../helpers/app';

test.describe('E. Media, vacuums, mobility', () => {
  test('W13 media floor filter and transport controls', async ({ page }) => {
    const errors = await openTab(page, 'media');
    await ctl(page, 'First Floor').first().click();
    await ctl(page, 'All Floors').first().click();
    await ctl(page, 'Pause').first().click();
    await ctl(page, 'Next Track').first().click();
    await ctl(page, 'Mute').first().click();
    expect(errors).toEqual([]);
  });

  test('W13 media power toggle double click', async ({ page }) => {
    const errors = await openTab(page, 'media');
    await ctl(page, 'Power Toggle').first().dblclick();
    expect(errors).toEqual([]);
  });

  test('W14 vacuums tabs, mode and commands', async ({ page }) => {
    const errors = await openTab(page, 'vacuums');
    await ctl(page, 'Stick Vacuum').first().click();
    await ctl(page, 'Robot Vacuum').first().click();
    for (const n of ['Pause', 'Dock', 'Spot', 'Locate', 'Quiet', 'Turbo']) {
      await ctl(page, n, true).first().click();
    }
    expect(errors).toEqual([]);
  });

  test('W14 upload rejects non-image file gracefully', async ({ page }) => {
    const errors = await openTab(page, 'vacuums');
    const input = page.locator('input[type="file"]').first();
    if (await input.count()) {
      await input.setInputFiles({ name: 'x.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
      await page.waitForTimeout(800);
    }
    expect(errors).toEqual([]);
  });

  test('W15 mobility vehicle controls', async ({ page }) => {
    const errors = await openTab(page, 'mobility');
    await ctl(page, /Zoom In/).first().click();
    await ctl(page, /Zoom Out/).first().click();
    await ctl(page, /Electric Bike/).first().click();
    await ctl(page, /Electric Car/).first().click();
    await ctl(page, /Start climate preconditioning/).first().click();
    expect(errors).toEqual([]);
    expect(await noHorizontalOverflow(page)).toBe(true);
  });

  test('API: image-proxy requires auth, url and http(s)', async ({ request }) => {
    expect((await request.get('/api/image-proxy?url=http://x')).status()).toBe(401);
    expect((await request.get('/api/image-proxy', { headers: AUTH })).status()).toBe(400);
    expect((await request.get('/api/image-proxy?url=file:///etc/passwd', { headers: AUTH })).status()).toBeGreaterThanOrEqual(400);
    const priv = await request.get('/api/image-proxy?url=http://169.254.169.254/latest', { headers: AUTH });
    expect(priv.status()).toBeGreaterThanOrEqual(400);
  });

  test('API: assets upload validation', async ({ request }) => {
    expect((await request.post('/api/assets', { data: {} })).status()).toBe(401);
    expect((await request.post('/api/assets', { headers: AUTH, data: {} })).status()).toBe(400);
    expect((await request.post('/api/assets', { headers: AUTH, data: { dataUrl: 'data:image/svg+xml;base64,PHN2Zy8+' } })).status()).toBeGreaterThanOrEqual(400);
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const ok = await request.post('/api/assets', { headers: AUTH, data: { dataUrl: png, key: 'qa' } });
    expect(ok.status()).toBe(200);
  });
});
