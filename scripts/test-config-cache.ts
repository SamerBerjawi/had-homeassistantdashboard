/**
 * PERF-007 / PERF-008: GET /api/config is served from memory but notices an on-disk change, and
 * rapid saves do not create a timestamped snapshot each time.
 */
import assert from 'node:assert';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fork } from 'node:child_process';

const PORT = 19891;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'had-cache-'));
const configFile = path.join(dataDir, 'config', 'dashboard-config.json');
const backups = path.join(dataDir, 'config', 'backups');

function call(method: string, p: string, body?: unknown): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : JSON.stringify(body);
    const req = http.request(
      {
        host: '127.0.0.1', port: PORT, path: p, method,
        headers: { Authorization: 'Bearer test_cache', 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) }
      },
      (res) => {
        let text = '';
        res.on('data', (c) => (text += c));
        res.on('end', () => {
          let json: any = null;
          try { json = JSON.parse(text); } catch {}
          resolve({ status: res.statusCode || 0, json });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const child = fork(path.resolve('node_modules/tsx/dist/cli.mjs'), ['server.ts'], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, NODE_ENV: 'test', ALLOW_MOCK_TOKENS: 'true' },
    stdio: 'ignore'
  });
  try {
    const start = Date.now();
    for (;;) {
      try { if ((await call('GET', '/api/health')).status === 200) break; } catch {}
      if (Date.now() - start > 60000) throw new Error('server did not start');
      await new Promise((r) => setTimeout(r, 250));
    }

    console.log('--- saves, cached reads, external change ---');
    const first = await call('POST', '/api/config', { config: { theme: { accentColor: '#111111' } } });
    assert.strictEqual(first.status, 200);
    const read1 = await call('GET', '/api/config');
    assert.strictEqual(read1.json.config.theme.accentColor, '#111111');

    // Edit the file behind the server's back: the next read must see it
    const onDisk = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    onDisk.serverVersion = 99;
    onDisk.config.theme.accentColor = '#222222';
    await new Promise((r) => setTimeout(r, 20));
    fs.writeFileSync(configFile, JSON.stringify(onDisk));
    const read2 = await call('GET', '/api/config');
    assert.strictEqual(read2.json.serverVersion, 99, 'external change must be picked up');
    assert.strictEqual(read2.json.config.theme.accentColor, '#222222');
    console.log('✓ cache invalidates when the file changes on disk');

    console.log('--- snapshot rate limit ---');
    const countBefore = fs.existsSync(backups) ? fs.readdirSync(backups).length : 0;
    for (let i = 0; i < 5; i++) {
      const r = await call('POST', '/api/config', { config: { theme: { accentColor: `#00000${i}` } } });
      assert.strictEqual(r.status, 200);
    }
    const countAfter = fs.readdirSync(backups).length;
    assert.ok(countAfter - countBefore <= 1, `expected at most 1 new snapshot, got ${countAfter - countBefore}`);
    assert.ok(fs.existsSync(path.join(dataDir, 'config', 'dashboard-config.json.bak')), '.bak is still written');
    console.log('✓ rapid saves create at most one snapshot');
    console.log('\nAll config-cache checks passed');
  } finally {
    child.kill('SIGTERM');
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
