/**
 * Automated Verification Test for NAS Storage Reliability Architecture
 * Run with: npx tsx scripts/test-nas-storage.ts
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { mergeDelta, hasMaterialDashboardConfig } from '../src/services/configStorageService';

console.log('🧪 Starting NAS Storage Reliability & Data Safety Verification Suite...\n');

// Set up temporary test directory
const testDir = path.join(process.cwd(), 'scratch', 'test-nas-storage-' + Date.now());
const configFilePath = path.join(testDir, 'dashboard-config.json');
const configBackupPath = path.join(testDir, 'dashboard-config.json.bak');
const configBackupsDir = path.join(testDir, 'backups');

fs.mkdirSync(testDir, { recursive: true });

async function writeConfigFileAtomic(filePath: string, dataString: string): Promise<void> {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
  const tempFile = path.join(
    dir,
    `.${path.basename(filePath)}.tmp.${process.pid}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  );

  const handle = await fs.promises.open(tempFile, 'w');
  try {
    await handle.writeFile(dataString, 'utf-8');
    await handle.sync(); // fsync to ensure physical NAS persistence
  } finally {
    await handle.close();
  }

  if (fs.existsSync(filePath)) {
    try {
      await fs.promises.copyFile(filePath, configBackupPath);

      if (!fs.existsSync(configBackupsDir)) {
        await fs.promises.mkdir(configBackupsDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const snapshotFile = path.join(configBackupsDir, `dashboard-config-${timestamp}.json`);
      await fs.promises.copyFile(filePath, snapshotFile);

      const snapshotFiles = (await fs.promises.readdir(configBackupsDir))
        .filter(f => f.startsWith('dashboard-config-') && f.endsWith('.json'))
        .sort()
        .reverse();
      if (snapshotFiles.length > 5) {
        for (const oldFile of snapshotFiles.slice(5)) {
          await fs.promises.unlink(path.join(configBackupsDir, oldFile)).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Backup rotation error:', err);
    }
  }

  await fs.promises.rename(tempFile, filePath);
}

async function readPersistentConfig(): Promise<{ config: any; serverVersion: number } | null> {
  if (fs.existsSync(configFilePath)) {
    try {
      const raw = await fs.promises.readFile(configFilePath, 'utf-8');
      if (raw.trim().length > 0) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const version = parsed.serverVersion !== undefined ? Number(parsed.serverVersion) : (parsed?.version || 1);
          const conf = parsed.serverVersion !== undefined ? parsed.config : parsed;
          return { config: conf, serverVersion: version };
        }
      }
    } catch (parseErr) {
      console.log('   ↳ [Recovery Triggered] Primary file corrupted. Falling back to .bak...');
    }
  }

  if (fs.existsSync(configBackupPath)) {
    try {
      const raw = await fs.promises.readFile(configBackupPath, 'utf-8');
      if (raw.trim().length > 0) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          console.log('   ↳ [Healing] Recovered from backup. Restoring primary file with fsync...');
          await writeConfigFileAtomic(configFilePath, raw);
          const version = parsed.serverVersion !== undefined ? Number(parsed.serverVersion) : (parsed?.version || 1);
          const conf = parsed.serverVersion !== undefined ? parsed.config : parsed;
          return { config: conf, serverVersion: version };
        }
      }
    } catch {}
  }

  return null;
}

async function runTests() {
  try {
    // -------------------------------------------------------------
    // Test 1: Material Data Safeguards
    // -------------------------------------------------------------
    console.log('Test 1: Material Data Safeguards (Crystal Anti-Wipeout Guard)');
    const emptyConfig = { version: 1 };
    const materialConfig = {
      version: 1,
      rooms: { floorOrder: ['ground-floor'], areaOrder: ['living-room'] },
      entities: { customizations: { 'light.kitchen': { label: 'Kitchen Light' } } }
    };

    assert.strictEqual(hasMaterialDashboardConfig(emptyConfig), false, 'Empty config must not be considered material');
    assert.strictEqual(hasMaterialDashboardConfig(materialConfig), true, 'Config with rooms and entities must be material');
    console.log('   ✓ Material data detection accurately identifies meaningful dashboard configurations');

    // -------------------------------------------------------------
    // Test 2: Atomic Write with fsync & Rolling Backups
    // -------------------------------------------------------------
    console.log('\nTest 2: Atomic Write with fsync & Rolling Backup Rotation');
    const version1Payload = JSON.stringify({ serverVersion: 1, config: materialConfig }, null, 2);
    await writeConfigFileAtomic(configFilePath, version1Payload);
    assert.strictEqual(fs.existsSync(configFilePath), true, 'Primary config file should exist');

    const readV1 = await readPersistentConfig();
    assert.strictEqual(readV1?.serverVersion, 1, 'Server version should be 1');
    assert.deepStrictEqual(readV1?.config.rooms.floorOrder, ['ground-floor']);

    // Write Version 2
    const materialConfigV2 = {
      ...materialConfig,
      rooms: { floorOrder: ['ground-floor', 'first-floor'], areaOrder: ['living-room', 'bedroom'] }
    };
    const version2Payload = JSON.stringify({ serverVersion: 2, config: materialConfigV2 }, null, 2);
    await writeConfigFileAtomic(configFilePath, version2Payload);

    assert.strictEqual(fs.existsSync(configBackupPath), true, 'Backup .bak file must be generated before overwrite');
    const bakContent = JSON.parse(await fs.promises.readFile(configBackupPath, 'utf-8'));
    assert.strictEqual(bakContent.serverVersion, 1, 'Backup .bak must contain version 1 snapshot');

    const readV2 = await readPersistentConfig();
    assert.strictEqual(readV2?.serverVersion, 2, 'Primary file should now be version 2');
    console.log('   ✓ Atomic fsync write and .bak backup generation validated');

    // -------------------------------------------------------------
    // Test 3: Self-Healing Corruption Recovery
    // -------------------------------------------------------------
    console.log('\nTest 3: Self-Healing Corruption Recovery');
    // Simulate sudden power outage or NAS network glitch corrupting the primary JSON file
    await fs.promises.writeFile(configFilePath, '{"serverVersion": 3, "config": { "rooms": INVALID_TRUNCATED_JSON_DATA', 'utf-8');

    // Reading should self-heal using the valid .bak file
    const recovered = await readPersistentConfig();
    assert.ok(recovered !== null, 'Self-healing read should succeed via backup');
    assert.strictEqual(recovered.serverVersion, 1, 'Should recover version 1 from .bak');

    // Verify primary file is healed
    const healedFileRaw = await fs.promises.readFile(configFilePath, 'utf-8');
    const healedParsed = JSON.parse(healedFileRaw);
    assert.strictEqual(healedParsed.serverVersion, 1, 'Primary file must be repaired with valid JSON');
    console.log('   ✓ Self-healing successfully restored corrupted primary file from validated backup');

    // -------------------------------------------------------------
    // Test 4: Pure Delta Merging
    // -------------------------------------------------------------
    console.log('\nTest 4: Granular Delta Merging (no default object injection)');
    const delta1 = { theme: { darkMode: true } };
    const delta2 = { theme: { primaryColor: '#ff0000' } };
    const mergedDelta = mergeDelta(delta1 as any, delta2 as any);

    assert.strictEqual((mergedDelta as any).theme.darkMode, true);
    assert.strictEqual((mergedDelta as any).theme.primaryColor, '#ff0000');
    assert.strictEqual((mergedDelta as any).rooms, undefined, 'mergeDelta must NOT inject DEFAULT_USER_CONFIG keys');
    console.log('   ✓ Granular delta merge preserves isolated changes without default pollution');

    console.log('\n🎉 ALL NAS STORAGE RELIABILITY TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    // Clean up test directory
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

runTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
