/**
 * Security verification suite for Home Assistant Token Handling, CORS & CSP
 */
import assert from 'node:assert';
import http from 'node:http';
import { sanitizeSafeUrl, safeOpenExternalUrl } from '../src/lib/utils.js';

console.log('--- 1. Testing URL Sanitization against XSS ---');

const dangerousUrls = [
  'javascript:alert(document.cookie)',
  'JAVASCRIPT:alert(localStorage.getItem("ha_auth_tokens"))',
  'javascript://alert(1)',
  '  javascript:alert(1)  ',
  'data:text/html,<script>alert(1)</script>',
  'vbscript:msgbox(1)',
  'file:///etc/passwd',
  'blob:http://evil.com/uuid'
];

for (const badUrl of dangerousUrls) {
  const sanitized = sanitizeSafeUrl(badUrl);
  assert.strictEqual(sanitized, '#', `Expected dangerous URL "${badUrl}" to be sanitized to '#' but got "${sanitized}"`);
}
console.log('✓ All dangerous protocol URLs neutralized to "#"');

const safeUrls = [
  'https://www.home-assistant.io',
  'http://homeassistant.local:8123/lovelace',
  'https://github.com/home-assistant/core/releases',
  '/api/assets/car.png',
  '#settings',
  'mailto:support@home-assistant.io'
];

for (const goodUrl of safeUrls) {
  const sanitized = sanitizeSafeUrl(goodUrl);
  assert.strictEqual(sanitized, goodUrl, `Expected safe URL "${goodUrl}" to be preserved`);
}
console.log('✓ All safe HTTP/HTTPS/mailto/relative URLs permitted');

console.log('\n--- 2. Testing Server Security Headers & Token Route Scoping ---');

async function runServerSecurityTests() {
  // Start the server compiled cjs
  process.env.PORT = '56789';
  process.env.ALLOWED_ORIGIN = 'http://trusted-tablet.local:8080';

  // Spawn node dist/server.cjs
  const { fork } = await import('node:child_process');
  const serverProcess = fork('dist/server.cjs', [], {
    env: {
      ...process.env,
      PORT: '56789',
      ALLOWED_ORIGIN: 'http://trusted-tablet.local:8080',
      NODE_ENV: 'production',
      ALLOW_MOCK_TOKENS: 'true'
    },
    stdio: 'pipe'
  });

  try {
    // Wait for server to boot
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Server boot timeout')), 8000);
      serverProcess.stdout?.on('data', (d) => {
        if (d.toString().includes('HAD - Home Assistant Dashboard') || d.toString().includes('56789')) {
          clearTimeout(timer);
          resolve();
        }
      });
    });

    const makeRequest = (options: http.RequestOptions): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string }> => {
      return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
          let body = '';
          res.on('data', (chunk) => body += chunk);
          res.on('end', () => resolve({ statusCode: res.statusCode || 0, headers: res.headers, body }));
        });
        req.on('error', reject);
        req.end();
      });
    };

    // Test 2a: Check Content-Security-Policy & absence of wildcard CORS on /api/health
    const healthRes = await makeRequest({
      hostname: 'localhost',
      port: 56789,
      path: '/api/health',
      method: 'GET'
    });
    assert.strictEqual(healthRes.statusCode, 200);
    assert(healthRes.headers['content-security-policy'], 'Content-Security-Policy header should be present');
    assert(
      (healthRes.headers['content-security-policy'] as string).includes("script-src 'self'"),
      "CSP should restrict script-src to 'self' in production"
    );
    assert.strictEqual(healthRes.headers['access-control-allow-origin'], undefined, 'No wildcard CORS on unconfigured request');
    console.log('✓ Test 2a: Content-Security-Policy header verified with script-src \'self\'');

    // Test 2b: Test CORS with unlisted Origin vs ALLOWED_ORIGIN on /api/assets
    const corsUntrusted = await makeRequest({
      hostname: 'localhost',
      port: 56789,
      path: '/api/assets',
      method: 'GET',
      headers: {
        Origin: 'http://evil-attacker.com'
      }
    });
    assert.strictEqual(corsUntrusted.headers['access-control-allow-origin'], undefined, 'Wildcard CORS must NOT be sent to unlisted origins');

    const corsTrusted = await makeRequest({
      hostname: 'localhost',
      port: 56789,
      path: '/api/assets',
      method: 'GET',
      headers: {
        Origin: 'http://trusted-tablet.local:8080'
      }
    });
    assert.strictEqual(
      corsTrusted.headers['access-control-allow-origin'],
      'http://trusted-tablet.local:8080',
      'Configured origin in ALLOWED_ORIGIN should receive matching Access-Control-Allow-Origin'
    );
    console.log('✓ Test 2b: CORS wildcard successfully replaced by strict allowlist');

    // Test 2c: Query token rejection on /api/config
    const queryTokenConfigRes = await makeRequest({
      hostname: 'localhost',
      port: 56789,
      path: '/api/config?token=fake-token-12345',
      method: 'GET'
    });
    // /api/config MUST reject ?token= and return 401 Unauthorized because only Bearer header is allowed
    assert.strictEqual(queryTokenConfigRes.statusCode, 401, '/api/config must reject query token');
    const configBody = JSON.parse(queryTokenConfigRes.body);
    assert.strictEqual(configBody.error, 'Unauthorized: Missing Home Assistant authentication token');
    console.log('✓ Test 2c: /api/config strictly rejected query string token (?token=...)');

    // Test 2d: Query token rejection on POST /api/assets
    const queryTokenAssetsRes = await makeRequest({
      hostname: 'localhost',
      port: 56789,
      path: '/api/assets?token=fake-token-12345',
      method: 'POST'
    });
    assert.strictEqual(queryTokenAssetsRes.statusCode, 401, '/api/assets must reject query token');
    console.log('✓ Test 2d: /api/assets strictly rejected query string token (?token=...)');

    // Test 2e: /api/image-proxy authentication requirement
    const unauthImageProxyRes = await makeRequest({
      hostname: 'localhost',
      port: 56789,
      path: '/api/image-proxy?url=https://example.com/test.png',
      method: 'GET'
    });
    assert.strictEqual(unauthImageProxyRes.statusCode, 401, '/api/image-proxy must require authentication');
    console.log('✓ Test 2e: /api/image-proxy strictly required authentication (returned 401)');

    // Test 2f: /api/image-proxy SSRF protection against private / cloud metadata IPs
    const ssrfMetadataRes = await makeRequest({
      hostname: 'localhost',
      port: 56789,
      path: '/api/image-proxy?url=http://169.254.169.254/latest/meta-data/',
      method: 'GET',
      headers: {
        Authorization: 'Bearer test_mock_token_123'
      }
    });
    assert.strictEqual(ssrfMetadataRes.statusCode, 403, '/api/image-proxy must block access to cloud metadata IP 169.254.169.254');

    const ssrfLocalhostRes = await makeRequest({
      hostname: 'localhost',
      port: 56789,
      path: '/api/image-proxy?url=http://127.0.0.1:8080/secret',
      method: 'GET',
      headers: {
        Authorization: 'Bearer test_mock_token_123'
      }
    });
    assert.strictEqual(ssrfLocalhostRes.statusCode, 403, '/api/image-proxy must block access to localhost');
    console.log('✓ Test 2f: /api/image-proxy blocked SSRF attempts to cloud metadata and localhost (returned 403)');

    // Test 2g: POST /api/assets rejects disallowed MIME and invalid magic bytes
    const fakeImageRes = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
      const payload = JSON.stringify({
        key: 'vehicle',
        dataUrl: 'data:image/png;base64,' + Buffer.from('NOT_A_PNG_FILE_HEADER').toString('base64')
      });
      const req = http.request({
        hostname: 'localhost',
        port: 56789,
        path: '/api/assets',
        method: 'POST',
        headers: {
          Authorization: 'Bearer test_mock_token_123',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {
        let body = '';
        res.on('data', (c) => body += c);
        res.on('end', () => resolve({ statusCode: res.statusCode || 0, body }));
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
    assert.strictEqual(fakeImageRes.statusCode, 400, 'POST /api/assets must reject files failing magic bytes check');

    // Valid PNG upload (with PNG magic bytes 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A)
    const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]);
    const validImageRes = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
      const payload = JSON.stringify({
        key: 'vehicle',
        dataUrl: 'data:image/png;base64,' + validPngBuffer.toString('base64')
      });
      const req = http.request({
        hostname: 'localhost',
        port: 56789,
        path: '/api/assets',
        method: 'POST',
        headers: {
          Authorization: 'Bearer test_mock_token_123',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {
        let body = '';
        res.on('data', (c) => body += c);
        res.on('end', () => resolve({ statusCode: res.statusCode || 0, body }));
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
    assert.strictEqual(validImageRes.statusCode, 200, 'POST /api/assets should accept valid PNG with proper magic bytes');
    console.log('✓ Test 2g: POST /api/assets validated file signatures / magic bytes correctly');

  } finally {
    serverProcess.kill('SIGTERM');
  }
}

runServerSecurityTests().then(() => {
  console.log('\n🎉 ALL TOKEN SECURITY, CORS, AND CSP AUDIT TESTS PASSED!\n');
}).catch((err) => {
  console.error('Security test failed:', err);
  process.exit(1);
});
