/**
 * Integration suite for who the server trusts to validate tokens (SEC-001) and for the mock-token
 * bypass (SEC-007). Starts server.ts several times with different environments and a fake HA.
 */
import assert from 'node:assert';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
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

function request(port: number, pathName: string, headers: Record<string, string> = {}): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: pathName, headers }, (res) => {
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

  fake.server.close();
  evil.server.close();
  console.log('\nAll auth-trust checks passed');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
