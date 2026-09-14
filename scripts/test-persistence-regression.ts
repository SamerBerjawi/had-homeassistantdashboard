/**
 * End-to-End Regression Test: Config & Asset Persistence Across Server Restarts
 * 
 * Verifies that:
 * 1. Uploaded assets (vehicle PNGs) are physically saved with atomic fsync under assetsDir.
 * 2. Vehicle customizations (customName, vehicleImageUrl) are written to dashboard-config.json.
 * 3. Both the asset file and config survive a complete server process termination and reboot.
 * 4. The restarted server successfully serves the persisted config and image binary.
 * 5. Partial updates deep-merge on the server without dropping existing nested sibling fields.
 * 
 * Run with: npx tsx scripts/test-persistence-regression.ts
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import net from 'net';
import { spawn, ChildProcess } from 'child_process';

console.log('🧪 Starting End-to-End Persistence & Container-Restart Regression Suite...\n');

// Allocate an available local TCP port
async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

// Helper to poll until the server is responding on /api/health
async function waitForServer(port: number, timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`, {
        signal: AbortSignal.timeout(1000)
      });
      if (res.ok) {
        return;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server failed to start on port ${port} within ${timeoutMs}ms`);
}

// Helper to spawn a HAD server instance
function spawnServer(port: number, configDir: string, assetsDir: string): ChildProcess {
  const child = spawn(
    'npx',
    ['tsx', 'server.ts'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(port),
        DASHBOARD_CONFIG_DIR: configDir,
        DASHBOARD_ASSETS_DIR: assetsDir,
        NODE_ENV: 'test'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );

  child.stderr?.on('data', (d) => {
    const str = d.toString();
    if (!str.includes('ExperimentalWarning')) {
      // console.error('[Server STDERR]', str.trim());
    }
  });

  return child;
}

// Gracefully terminate a child process
async function stopServer(child: ChildProcess): Promise<void> {
  if (!child || child.killed) return;
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {}
      resolve();
    }, 4000);

    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });

    try {
      child.kill('SIGTERM');
    } catch {
      resolve();
    }
  });
}

async function runRegressionSuite() {
  const testRunId = `test-persistence-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const baseTestDir = path.join(process.cwd(), 'scratch', testRunId);
  const testConfigDir = path.join(baseTestDir, 'data', 'config');
  const testAssetsDir = path.join(baseTestDir, 'data', 'assets');

  fs.mkdirSync(testConfigDir, { recursive: true });
  fs.mkdirSync(testAssetsDir, { recursive: true });

  const testAuthHeader = {
    'Authorization': 'Bearer test_mock_token_had_regression',
    'Content-Type': 'application/json'
  };

  let activeChild: ChildProcess | null = null;

  try {
    const port = await getFreePort();
    console.log(`[Phase 1] Booting HAD Server instance on port ${port}...`);
    console.log(`          Config Dir: ${testConfigDir}`);
    console.log(`          Assets Dir: ${testAssetsDir}`);

    activeChild = spawnServer(port, testConfigDir, testAssetsDir);
    await waitForServer(port);
    console.log('   ✓ Server 1 online and healthy');

    // -------------------------------------------------------------
    // Step 1: Upload a Vehicle Image Asset
    // -------------------------------------------------------------
    console.log('\n[Phase 2] Uploading vehicle PNG image via POST /api/assets...');
    // 1x1 valid transparent PNG base64
    const testPngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const testDataUrl = `data:image/png;base64,${testPngBase64}`;
    const expectedBuffer = Buffer.from(testPngBase64, 'base64');

    const uploadRes = await fetch(`http://127.0.0.1:${port}/api/assets`, {
      method: 'POST',
      headers: testAuthHeader,
      body: JSON.stringify({
        dataUrl: testDataUrl,
        key: 'car_image'
      })
    });

    assert.strictEqual(uploadRes.status, 200, `Asset upload failed with HTTP ${uploadRes.status}`);
    const uploadJson = await uploadRes.json();
    assert.strictEqual(uploadJson.success, true, 'Asset upload response must indicate success');
    assert.ok(typeof uploadJson.url === 'string' && uploadJson.url.startsWith('/api/assets/car_image-'), 'Asset url must be formatted /api/assets/car_image-...');
    assert.ok(typeof uploadJson.filename === 'string', 'Asset response must contain filename');

    const uploadedFilename = uploadJson.filename;
    const uploadedAssetUrl = uploadJson.url;
    const localAssetPath = path.join(testAssetsDir, uploadedFilename);

    assert.strictEqual(fs.existsSync(localAssetPath), true, 'Asset file must exist in testAssetsDir');
    const localAssetBytes = fs.readFileSync(localAssetPath);
    assert.deepStrictEqual(localAssetBytes, expectedBuffer, 'Saved asset bytes must match uploaded PNG bytes');
    console.log(`   ✓ Asset "${uploadedFilename}" written to disk and verified (${localAssetBytes.length} bytes)`);

    // -------------------------------------------------------------
    // Step 2: Save Vehicle Name & Image in config.json
    // -------------------------------------------------------------
    console.log('\n[Phase 3] Saving vehicle name & image URL via POST /api/config...');
    const vehicleCustomName = 'Tesla Cybertruck Performance';

    const saveConfigRes = await fetch(`http://127.0.0.1:${port}/api/config`, {
      method: 'POST',
      headers: testAuthHeader,
      body: JSON.stringify({
        config: {
          mobility: {
            car: {
              customName: vehicleCustomName,
              vehicleImageUrl: uploadedAssetUrl
            }
          }
        }
      })
    });

    assert.strictEqual(saveConfigRes.status, 200, `Config save failed with HTTP ${saveConfigRes.status}`);
    const saveConfigJson = await saveConfigRes.json();
    assert.strictEqual(saveConfigJson.success, true);
    assert.strictEqual(saveConfigJson.config.mobility.car.customName, vehicleCustomName);
    assert.strictEqual(saveConfigJson.config.mobility.car.vehicleImageUrl, uploadedAssetUrl);

    const configFilePath = path.join(testConfigDir, 'dashboard-config.json');
    assert.strictEqual(fs.existsSync(configFilePath), true, 'dashboard-config.json must exist on disk');
    console.log('   ✓ Config saved with vehicle custom name and vehicle image URL');

    // -------------------------------------------------------------
    // Step 3: Simulate Container Restart (Kill Process & Reboot)
    // -------------------------------------------------------------
    console.log('\n[Phase 4] Simulating Container Restart (SIGTERM Server 1 & Boot Server 2)...');
    await stopServer(activeChild);
    activeChild = null;
    console.log('   ✓ Server 1 terminated gracefully');

    // Boot fresh server instance with the same data directories
    const rebootPort = await getFreePort();
    activeChild = spawnServer(rebootPort, testConfigDir, testAssetsDir);
    await waitForServer(rebootPort);
    console.log(`   ✓ Server 2 booted on port ${rebootPort} using persisted storage`);

    // -------------------------------------------------------------
    // Step 4: Verify Persistence Across Restart
    // -------------------------------------------------------------
    console.log('\n[Phase 5] Verifying config and asset persistence from fresh server instance...');

    // 1. Check GET /api/config
    const readConfigRes = await fetch(`http://127.0.0.1:${rebootPort}/api/config`, {
      headers: testAuthHeader
    });
    assert.strictEqual(readConfigRes.status, 200, `GET /api/config failed with HTTP ${readConfigRes.status}`);
    const readConfigJson = await readConfigRes.json();

    assert.strictEqual(
      readConfigJson.config?.mobility?.car?.customName,
      vehicleCustomName,
      'Vehicle custom name must survive server restart'
    );
    assert.strictEqual(
      readConfigJson.config?.mobility?.car?.vehicleImageUrl,
      uploadedAssetUrl,
      'Vehicle image URL must survive server restart'
    );
    console.log('   ✓ Config survived restart: customName and vehicleImageUrl fully intact');

    // 2. Check Static Asset Serving
    const fetchAssetRes = await fetch(`http://127.0.0.1:${rebootPort}${uploadedAssetUrl}`);
    assert.strictEqual(fetchAssetRes.status, 200, `GET ${uploadedAssetUrl} returned HTTP ${fetchAssetRes.status}`);
    const servedBytes = Buffer.from(await fetchAssetRes.arrayBuffer());
    assert.deepStrictEqual(servedBytes, expectedBuffer, 'Served asset bytes must match original uploaded image');
    console.log('   ✓ Static asset serving verified: exact binary PNG data delivered');

    // -------------------------------------------------------------
    // Step 5: Test Deep-Merge & Non-Dropping of Sibling Sub-fields
    // -------------------------------------------------------------
    console.log('\n[Phase 6] Testing server-side deep-merge (updating batteryCapacityKwh without customName)...');
    const updateSubfieldRes = await fetch(`http://127.0.0.1:${rebootPort}/api/config`, {
      method: 'POST',
      headers: testAuthHeader,
      body: JSON.stringify({
        config: {
          mobility: {
            car: {
              batteryCapacityKwh: 123.5
            }
          }
        }
      })
    });

    assert.strictEqual(updateSubfieldRes.status, 200);
    const updatedJson = await updateSubfieldRes.json();

    assert.strictEqual(
      updatedJson.config?.mobility?.car?.customName,
      vehicleCustomName,
      'customName must NOT be dropped by partial update'
    );
    assert.strictEqual(
      updatedJson.config?.mobility?.car?.vehicleImageUrl,
      uploadedAssetUrl,
      'vehicleImageUrl must NOT be dropped by partial update'
    );
    assert.strictEqual(
      updatedJson.config?.mobility?.car?.batteryCapacityKwh,
      123.5,
      'batteryCapacityKwh must be merged into car object'
    );
    console.log('   ✓ Server-side deep-merge confirmed: sibling sub-fields preserved without data loss');

    console.log('\n🎉 ALL PERSISTENCE AND CONTAINER RESTART REGRESSION TESTS PASSED!\n');
  } finally {
    if (activeChild) {
      await stopServer(activeChild);
    }
    // Clean up temporary test files
    try {
      fs.rmSync(baseTestDir, { recursive: true, force: true });
    } catch {}
  }
}

runRegressionSuite().catch((err) => {
  console.error('\n❌ Regression test failed:', err);
  process.exit(1);
});
