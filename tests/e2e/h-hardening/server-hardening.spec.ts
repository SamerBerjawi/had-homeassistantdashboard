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
});
