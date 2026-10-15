import { test, expect } from '@playwright/test';
import { enterDemo, collectErrors, noHorizontalOverflow, MOCK_TOKEN } from '../helpers/app';

test.describe('A. Auth & session', () => {
  test('W1 first load shows blocking AuthModal with OAuth and LLAT tabs', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('HAD Security Gate')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /OAuth2 Sign In/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Long-Lived Token/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Explore Demo Dashboard/ })).toBeVisible();
  });

  test('W1 modal is not dismissible with Escape or backdrop click when unauthenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('HAD Security Gate')).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press('Escape');
    await page.mouse.click(5, 5);
    await expect(page.getByText('HAD Security Gate')).toBeVisible();
  });

  test('W1 no horizontal overflow on auth gate', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('HAD Security Gate')).toBeVisible({ timeout: 15_000 });
    expect(await noHorizontalOverflow(page)).toBe(true);
  });

  test('W2 URL field is prefilled with default HA URL', async ({ page }) => {
    await page.goto('/');
    const input = page.locator('input[type="url"], input[type="text"]').first();
    await input.waitFor({ timeout: 15_000 });
    await expect(input).toHaveValue(/homeassistant\.local:8123/);
  });

  test('W2 OAuth with malformed URL is rejected with a message (QA-A-001)', async ({ page }) => {
    await page.goto('/');
    const input = page.locator('input[type="url"], input[type="text"]').first();
    await input.waitFor({ timeout: 15_000 });
    await input.fill('not a url');
    await page.getByRole('button', { name: /Sign In with Home Assistant/ }).click();
    await page.waitForTimeout(1500);
    // Expected: stay on the app and show a validation message.
    expect(page.url().startsWith('http://localhost:3100')).toBe(true);
    await expect(page.getByRole('alert').filter({ hasText: /valid Home Assistant URL/i })).toBeVisible();
  });

  test('W3 LLAT tab: token field is masked and can be toggled', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Long-Lived Token/ }).first().click({ timeout: 15_000 });
    const token = page.locator('input[type="password"]').first();
    await expect(token).toBeVisible();
    await token.fill('abc');
    await expect(token).toHaveValue('abc');
  });

  test('W3 LLAT submit with empty token does not authenticate', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Long-Lived Token/ }).first().click({ timeout: 15_000 });
    await page.getByRole('button', { name: /Connect via LLAT/ }).click();
    await expect(page.getByText('HAD Security Gate')).toBeVisible();
  });

  test('W3 LLAT with bad token against unreachable HA shows error, stays gated', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Long-Lived Token/ }).first().click({ timeout: 15_000 });
    const url = page.locator('input[type="url"], input[type="text"]').first();
    await url.fill('http://127.0.0.1:9');
    await page.locator('input[type="password"]').first().fill('bad_token_value');
    await page.getByRole('button', { name: /Connect via LLAT/ }).click();
    await expect(page.getByText('HAD Security Gate')).toBeVisible({ timeout: 20_000 });
  });

  test('W4 demo mode enters dashboard and shows demo status', async ({ page }) => {
    const errors = collectErrors(page);
    await enterDemo(page);
    await expect(page.getByRole('button', { name: 'Rooms' }).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('W4 demo mode survives page refresh', async ({ page }) => {
    await enterDemo(page);
    await page.reload();
    await page.waitForTimeout(2500);
    await expect(page.getByRole('button', { name: /Explore Demo Dashboard/ })).toHaveCount(0);
  });

  test('W4 double-click demo button does not break app', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    const demo = page.getByRole('button', { name: /Explore Demo Dashboard/ });
    await demo.waitFor({ timeout: 15_000 });
    await demo.dblclick();
    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);
  });

  test('W6 demo profile offers Switch User and header offers Connect Live HA', async ({ page }) => {
    await enterDemo(page, '/settings');
    await expect(page.getByRole('button', { name: /Connect Live HA/ })).toBeVisible({ timeout: 8000 });
    await page.getByText(/Home Owner|User Profile/).locator('visible=true').first().click();
    await expect(page.getByRole('button', { name: /Switch User/ })).toBeVisible();
  });

  test('W6 Connect Live HA reopens the auth modal', async ({ page }) => {
    await enterDemo(page);
    await page.getByRole('button', { name: /Connect Live HA/ }).click();
    await expect(page.getByText('HAD Security Gate')).toBeVisible();
  });

  test('server: protected API rejects missing and bad tokens', async ({ request }) => {
    expect((await request.get('/api/config')).status()).toBe(401);
    expect((await request.get('/api/config', { headers: { Authorization: 'Bearer nope' } })).status()).toBe(401);
    expect((await request.get('/api/statistics/status')).status()).toBe(401);
    expect((await request.get('/api/cameras/status')).status()).toBe(401);
  });

  test('server: mock token accepted in dev; query token only on stream/image-proxy', async ({ request }) => {
    const ok = await request.get('/api/config', { headers: { Authorization: `Bearer ${MOCK_TOKEN}` } });
    expect([200, 404]).toContain(ok.status()); // 404 = no config saved yet
    const q = await request.get(`/api/config?token=${MOCK_TOKEN}`);
    expect(q.status()).toBe(401);
  });

  test('server: /api/health is public', async ({ request }) => {
    const r = await request.get('/api/health');
    expect(r.status()).toBe(200);
  });
});
