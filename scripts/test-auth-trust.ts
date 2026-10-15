/**
 * Integration suite for who the server trusts to validate tokens (SEC-001) and for the mock-token
 * bypass (SEC-007). Starts server.ts several times with different environments and a fake HA.
 */
import assert from 'node:assert';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Duplex } from 'node:stream';
import { fork, type ChildProcess } from 'node:child_process';

const GOOD_TOKEN = 'good-ha-token';

function startFakeHa(port: number): Promise<{ server: http.Server; hits: string[] }> {
  const hits: string[] = [];
  const server = http.createServer((req, res) => {
    hits.push(`${req.method} ${req.url} ${req.headers.authorization}`);
    res.statusCode = req.headers.authorization === `Bearer ${GOOD_TOKEN}` ? 200 : 401;
    res.end('{}');
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, hits })));
}

/** Minimal Home Assistant: REST /api/ for two tokens plus the websocket auth + auth/current_user flow. */
function startFakeHaWithWs(port: number): Promise<http.Server> {
  const roles: Record<string, boolean> = { 'admin-tok': true, 'user-tok': false };
  const server = http.createServer((req, res) => {
    const token = String(req.headers.authorization || '').replace('Bearer ', '');
    res.statusCode = token in roles ? 200 : 401;
    res.end('{}');
  });
  const frame = (obj: unknown) => {
    const payload = Buffer.from(JSON.stringify(obj));
    return Buffer.concat([Buffer.from([0x81, payload.length]), payload]); // payloads here are < 126 bytes
  };
  const readText = (buf: Buffer): string => {
    const len = buf[1] & 0x7f;
    const mask = buf.subarray(2, 6);
    const data = buf.subarray(6, 6 + len);
    return Buffer.from(data.map((b, i) => b ^ mask[i % 4])).toString('utf-8');
  };
  server.on('upgrade', (req, socket: Duplex) => {
    const key = String(req.headers['sec-websocket-key']);
    const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    socket.write(frame({ type: 'auth_required' }));
    let token = '';
    socket.on('data', (buf: Buffer) => {
      let msg: any;
      try { msg = JSON.parse(readText(buf)); } catch { return; }
      if (msg.type === 'auth') {
        token = msg.access_token;
        socket.write(frame(token in roles ? { type: 'auth_ok' } : { type: 'auth_invalid' }));
      } else if (msg.type === 'auth/current_user') {
        socket.write(frame({ id: msg.id, type: 'result', success: true, result: { is_admin: roles[token] } }));
      }
    });
    socket.on('error', () => undefined);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

function request(port: number, pathName: string, headers: Record<string, string> = {}, method = 'GET'): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: pathName, headers, method }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode || 0));
    });
    req.on('error', reject);
    req.end();
  });
}

async function waitForServer(port: number, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if ((await request(port, '/api/health')) === 200) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Server did not start on ${port}`);
}

async function withServer(port: number, env: Record<string, string>, fn: () => Promise<void>) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'had-trust-'));
  const baseEnv: NodeJS.ProcessEnv = { ...process.env, PORT: String(port), DATA_DIR: dataDir, NODE_ENV: 'test' };
  for (const k of ['HASS_URL', 'HA_URL', 'HOME_ASSISTANT_URL', 'HOMEASSISTANT_URL', 'ALLOW_MOCK_TOKENS', 'ALLOW_TOFU_PIN']) {
    delete baseEnv[k];
  }
  const child: ChildProcess = fork(path.resolve('node_modules/tsx/dist/cli.mjs'), ['server.ts'], {
    env: { ...baseEnv, ...env },
    stdio: 'ignore'
  });
  try {
    await waitForServer(port);
    await fn();
  } finally {
    child.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 300));
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}

async function main() {
  const fake = await startFakeHa(19871);
  const evil = await startFakeHa(19872); // answers 401 to everything except GOOD_TOKEN, like any HA
  const auth = { Authorization: `Bearer ${GOOD_TOKEN}` };

  console.log('--- 1. No HASS_URL, no pin, no TOFU: authenticated routes are refused ---');
  await withServer(19881, {}, async () => {
    assert.strictEqual(await request(19881, '/api/config', auth), 503);
    assert.strictEqual(
      await request(19881, '/api/config', { ...auth, 'X-HA-URL': 'http://127.0.0.1:19871' }),
      503,
      'X-HA-URL must not bootstrap trust'
    );
    assert.strictEqual(await request(19881, '/api/config', { Authorization: 'Bearer test_x' }), 503);
    assert.strictEqual(await request(19881, '/api/config'), 401, 'missing token stays 401');
  });
  console.log('✓ unconfigured server refuses tokens and ignores X-HA-URL');

  console.log('--- 2. Mock tokens need ALLOW_MOCK_TOKENS=true (not just a non-production NODE_ENV) ---');
  await withServer(19882, { HASS_URL: 'http://127.0.0.1:19871' }, async () => {
    assert.strictEqual(await request(19882, '/api/config', { Authorization: 'Bearer test_x' }), 401);
    assert.strictEqual(await request(19882, '/api/config', { Authorization: 'Bearer mock_x' }), 401);
  });
  await withServer(19883, { HASS_URL: 'http://127.0.0.1:19871', ALLOW_MOCK_TOKENS: 'true' }, async () => {
    const status = await request(19883, '/api/config', { Authorization: 'Bearer test_x' });
    assert.ok(status === 200 || status === 404, `mock token should pass auth, got ${status}`);
  });
  console.log('✓ mock tokens are opt-in only');

  console.log('--- 3. HASS_URL is the only validator; a client-chosen HA URL is ignored ---');
  await withServer(19884, { HASS_URL: 'http://127.0.0.1:19871' }, async () => {
    const ok = await request(19884, '/api/config', auth);
    assert.ok(ok === 200 || ok === 404, `valid token should pass, got ${ok}`);
    assert.strictEqual(await request(19884, '/api/config', { Authorization: 'Bearer nope' }), 401);
    const before = evil.hits.length;
    assert.strictEqual(
      await request(19884, '/api/config', { Authorization: 'Bearer nope', 'X-HA-URL': 'http://127.0.0.1:19872' }),
      401
    );
    assert.strictEqual(evil.hits.length, before, 'server must never contact a client-chosen HA');
  });
  console.log('✓ validation is pinned to HASS_URL');

  console.log('--- 4. ALLOW_TOFU_PIN=true keeps first-run pinning, then locks the instance ---');
  await withServer(19885, { ALLOW_TOFU_PIN: 'true' }, async () => {
    const first = await request(19885, '/api/config', { ...auth, 'X-HA-URL': 'http://127.0.0.1:19871' });
    assert.ok(first === 200 || first === 404, `first sign-in should pin, got ${first}`);
    const before = evil.hits.length;
    assert.strictEqual(
      await request(19885, '/api/config', { Authorization: 'Bearer other', 'X-HA-URL': 'http://127.0.0.1:19872' }),
      401
    );
    assert.strictEqual(evil.hits.length, before, 'after pinning the client URL is ignored');
  });
  console.log('✓ opt-in TOFU pins once');

  console.log('--- 5. Admin-only writes use the real HA is_admin flag (SEC-005) ---');
  const haWs = await startFakeHaWithWs(19873);
  await withServer(19886, { HASS_URL: 'http://127.0.0.1:19873' }, async () => {
    const json = { 'Content-Type': 'application/json' };
    const asUser = await request(19886, '/api/assets', { ...json, Authorization: 'Bearer user-tok' }, 'POST');
    assert.strictEqual(asUser, 403, 'non-admin must not upload assets');
    const asAdmin = await request(19886, '/api/assets', { ...json, Authorization: 'Bearer admin-tok' }, 'POST');
    assert.ok(asAdmin !== 403 && asAdmin !== 401, `admin should pass the role check, got ${asAdmin}`);
    assert.strictEqual(await request(19886, '/api/config', { Authorization: 'Bearer user-tok' }), 404, 'non-admin can still read');
  });
  haWs.close();
  console.log('✓ admin role comes from HA auth/current_user');

  fake.server.close();
  evil.server.close();
  console.log('\nAll auth-trust checks passed');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
