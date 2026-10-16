import { test, expect } from '@playwright/test';
import { AUTH } from '../helpers/app';

// Server-side hardening regressions (SEC-002/003/006, REL-002/003). API-only, run once.
test.describe('H. Server hardening', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1000, 'API specs run on the desktop project only');
  test.describe.configure({ mode: 'serial' });

  test('SEC-003 config rejects non-rtsp/http camera sources', async ({ request }) => {
    const r = await request.post('/api/config', {
      headers: AUTH,
      data: { config: { cameras: { sources: { c1: { id: 'c1', rtspUrl: 'exec:touch /tmp/pwned #' } } } } }
    });
    expect(r.status()).toBe(400);
    expect((await r.json()).error).toMatch(/cameras\.sources\.c1/);
  });

  test('REL-003 config rejects wrong-typed sections', async ({ request }) => {
    for (const body of [{ rooms: [] }, { entities: 'x' }, { cameras: 5 }, { rooms: { floorOrder: [1] } }]) {
      const r = await request.post('/api/config', { headers: AUTH, data: { config: body } });
      expect(r.status(), JSON.stringify(body)).toBe(400);
    }
  });

  test('SEC-006 camera credentials and PIN are never returned', async ({ request }) => {
    const save = await request.post('/api/config', {
      headers: AUTH,
      data: {
        config: {
          theme: { accentColor: '#38bdf8' },
          cameras: { sources: { qa_cam: { id: 'qa_cam', rtspUrl: 'rtsp://qauser:qa-secret-pw@10.0.0.9:554/s1' } } },
          canvas: { pinCode: '4821' }
        }
      }
    });
    expect(save.status()).toBe(200);
    const saved = JSON.stringify(await save.json());
    expect(saved).not.toContain('qa-secret-pw');
    expect(saved).not.toContain('4821');

    const get = await request.get('/api/config', { headers: AUTH });
    expect(get.status()).toBe(200);
    const text = JSON.stringify(await get.json());
    expect(text).not.toContain('qa-secret-pw');
    expect(text).not.toContain('"4821"');
    expect(text).toContain('rtsp://***:***@10.0.0.9:554/s1');
    expect(text).toContain('__pin_set__');
  });

  test('SEC-006 echoing the redacted URL back does not overwrite the stored one', async ({ request }) => {
    const get = await (await request.get('/api/config', { headers: AUTH })).json();
    const save = await request.post('/api/config', { headers: AUTH, data: { config: get.config } });
    expect(save.status()).toBe(200);
    const after = JSON.stringify(await (await request.get('/api/config', { headers: AUTH })).json());
    expect(after).toContain('rtsp://***:***@10.0.0.9:554/s1');
    expect(after).not.toContain('rtsp://***:***@***');
  });

  test('SEC-002 HLS proxy only allows GET/HEAD', async ({ request }) => {
    for (const method of ['post', 'put', 'delete', 'patch'] as const) {
      const r = await request[method]('/api/cameras/qa_cam/hls/restart', { headers: AUTH });
      expect(r.status(), method).toBe(405);
    }
  });

  test('REL-002 deleting a camera removes it and is idempotent', async ({ request }) => {
    const first = await request.delete('/api/cameras/qa_cam', { headers: AUTH });
    expect(first.status()).toBe(200);
    expect((await first.json()).removed).toBe(true);
    const second = await request.delete('/api/cameras/qa_cam', { headers: AUTH });
    expect(second.status()).toBe(200);
    expect((await second.json()).removed).toBe(false);
  });

  test('SEC-005 non-admin users cannot change cameras, upload assets or trigger sync', async ({ request }) => {
    const user = { Authorization: 'Bearer test_nonadmin_user' };
    expect((await request.post('/api/assets', { headers: user, data: { dataUrl: 'data:image/png;base64,AAAA' } })).status()).toBe(403);
    expect((await request.delete('/api/cameras/qa_cam', { headers: user })).status()).toBe(403);
    expect((await request.post('/api/statistics/sync', { headers: user, data: { statistics: {} } })).status()).toBe(403);
    const change = await request.post('/api/config', {
      headers: user,
      data: { config: { cameras: { sources: { x: { id: 'x', rtspUrl: 'rtsp://10.0.0.1/s' } } } } }
    });
    expect(change.status()).toBe(403);
  });

  test('SEC-005 non-admin users can still save layout and read config', async ({ request }) => {
    const user = { Authorization: 'Bearer test_nonadmin_user' };
    const current = await (await request.get('/api/config', { headers: user })).json();
    expect(current.success).toBe(true);
    // Echoing the (unchanged) camera sources back is not a camera change
    const save = await request.post('/api/config', {
      headers: user,
      data: { config: { ...current.config, theme: { ...(current.config.theme || {}), accentColor: '#22c55e' } } }
    });
    expect(save.status()).toBe(200);
  });

  test('SEC-013 query-string tokens are rejected everywhere', async ({ request }) => {
    expect((await request.get(`/api/config/stream?token=${'test_qa_token'}`)).status()).toBe(401);
    expect((await request.get(`/api/image-proxy?url=http://example.com/a.png&token=${'test_qa_token'}`)).status()).toBe(401);
  });

  test('SEC-013 config stream works with the Authorization header', async ({ page }) => {
    await page.goto('/');
    const first = await page.evaluate(async () => {
      const controller = new AbortController();
      const res = await fetch('/api/config/stream', {
        headers: { Authorization: 'Bearer test_qa_token' },
        signal: controller.signal
      });
      const reader = res.body!.getReader();
      const { value } = await reader.read();
      controller.abort();
      return { status: res.status, text: new TextDecoder().decode(value) };
    });
    expect(first.status).toBe(200);
    expect(first.text).toContain('event: ping');
  });

  test('SEC-014 errors do not leak internal messages', async ({ request }) => {
    const r = await request.post('/api/statistics/sync', { headers: AUTH, data: { statistics: { x: [] }, periodType: 'bogus' } });
    expect(r.status()).toBe(400);
    const bad = await request.get('/api/statistics/history?statistic_ids=a&start=1&end=2&period_type=bogus', { headers: AUTH });
    expect(JSON.stringify(await bad.json())).not.toMatch(/sqlite|ENOENT|at \//i);
  });

  test('SEC-015 ingest rejects unknown period types and oversized ids', async ({ request }) => {
    const longId = 'x'.repeat(300);
    const r = await request.post('/api/statistics/sync', { headers: AUTH, data: { statistics: { [longId]: [] }, periodType: 'hour' } });
    expect(r.status()).toBe(400);
  });

  test('SEC-009 no CORS headers without an allow-list', async ({ request }) => {
    const r = await request.get('/api/statistics/status', { headers: { ...AUTH, Origin: 'https://evil.example' } });
    expect(r.headers()['access-control-allow-origin']).toBeUndefined();
  });

  test('SEC-011 sends Permissions-Policy and a scoped connect-src', async ({ request }) => {
    const r = await request.get('/api/health');
    expect(r.headers()['permissions-policy']).toContain('camera=()');
    expect(r.headers()['content-security-policy']).toMatch(/connect-src 'self'/);
  });
});
