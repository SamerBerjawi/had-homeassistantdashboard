/**
 * Persistent dashboard config store: atomic fsync'd writes, .bak + rolling snapshots,
 * self-healing reads, an in-memory read-through cache and a write lock that serializes saves.
 * Used by the /api/config routes and the camera routes. See tests/backupRestore.test.ts and
 * scripts/test-persistence-regression.ts.
 */
import path from 'path';
import fs from 'fs';
import type { PersistedConfig, ServerConfig } from '../lib/configTypes';

export function createConfigStore({ configDir }: { configDir: string }) {
  const configFilePath = path.join(configDir, 'dashboard-config.json');

  const configBackupPath = path.join(configDir, 'dashboard-config.json.bak');
  const configBackupsDir = path.join(configDir, 'backups');

  // In-memory cache for fast read-through and NAS drive spin-down support
  let cachedServerConfig: ServerConfig | null = null;
  let cachedServerVersion = 0;
  // mtime of the config file the cache was filled from; a different mtime means it changed on disk
  let cachedConfigMtimeMs = -1;
  // PERF-008: timestamped snapshots are rate limited; the single .bak copy still happens on every save
  const SNAPSHOT_MIN_INTERVAL_MS = 60 * 1000;
  let lastSnapshotAt = 0;

  function recordConfigMtime() {
    try {
      cachedConfigMtimeMs = fs.statSync(configFilePath).mtimeMs;
    } catch {
      cachedConfigMtimeMs = -1;
    }
  }

  // Check that the config directory exists and is writable
  let isConfigStorageWritable = true;
  try {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.accessSync(configDir, fs.constants.W_OK);
  } catch (err: any) {
    isConfigStorageWritable = false;
    console.warn(`[NAS Storage Warning] DASHBOARD_CONFIG_DIR "${configDir}" is not writable or reachable: ${err.message}. Config endpoints will return service unavailable errors.`);
  }

  // In-process write lock queue to serialize concurrent config file writes
  let configWriteQueue: Promise<any> = Promise.resolve();
  function withConfigWriteLock<T>(fn: () => Promise<T>): Promise<T> {
    const next = configWriteQueue.then(fn, fn);
    configWriteQueue = next.then(() => {}, () => {});
    return next;
  }

  class SnapshotThrottled extends Error {}

  // Database-grade atomic file persistence with fsync to guarantee flush to physical NAS media
  async function writeConfigFileAtomic(filePath: string, dataString: string): Promise<void> {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    const tempFile = path.join(
      dir,
      `.${path.basename(filePath)}.tmp.${process.pid}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    );

    // Open file descriptor, write, and fsync physical storage on NAS
    const handle = await fs.promises.open(tempFile, 'w');
    try {
      await handle.writeFile(dataString, 'utf-8');
      await handle.sync(); // fsync to ensure bytes reach physical NAS drive
    } finally {
      await handle.close();
    }

    // If target exists, update the primary .bak file and retain timestamped rolling backups
    if (fs.existsSync(filePath)) {
      try {
        await fs.promises.copyFile(filePath, configBackupPath);

        // Keep up to 5 rolling snapshots in backups/, at most one per minute
        const now = Date.now();
        if (now - lastSnapshotAt < SNAPSHOT_MIN_INTERVAL_MS) {
          throw new SnapshotThrottled();
        }
        lastSnapshotAt = now;
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
      } catch (backupErr) {
        if (!(backupErr instanceof SnapshotThrottled)) {
          console.warn('[NAS Config] Backup rotation notice:', backupErr);
        }
      }
    }

    // Atomic filesystem rename
    await fs.promises.rename(tempFile, filePath);
    if (filePath === configFilePath) recordConfigMtime();
  }

  // Self-healing configuration reader: reads primary file with automatic fallback to .bak and snapshots
  async function readPersistentConfig(): Promise<PersistedConfig | null> {
    // 1. Try reading primary config file
    if (fs.existsSync(configFilePath)) {
      try {
        const raw = await fs.promises.readFile(configFilePath, 'utf-8');
        if (raw.trim().length > 0) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            const version = parsed.serverVersion !== undefined ? Number(parsed.serverVersion) : (parsed?.version || 1);
            const conf = parsed.serverVersion !== undefined ? parsed.config : parsed;
            cachedServerConfig = conf;
            cachedServerVersion = version;
            recordConfigMtime();
            return { config: conf, serverVersion: version };
          }
        }
      } catch (parseErr) {
        console.error('[NAS Config] Corrupted primary config detected! Attempting recovery from backup:', parseErr);
      }
    }

    // 2. Self-healing fallback: Check dashboard-config.json.bak
    if (fs.existsSync(configBackupPath)) {
      try {
        const raw = await fs.promises.readFile(configBackupPath, 'utf-8');
        if (raw.trim().length > 0) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            console.log('[NAS Config] Successfully recovered valid configuration from .bak file! Healing primary file...');
            await writeConfigFileAtomic(configFilePath, raw);
            const version = parsed.serverVersion !== undefined ? Number(parsed.serverVersion) : (parsed?.version || 1);
            const conf = parsed.serverVersion !== undefined ? parsed.config : parsed;
            cachedServerConfig = conf;
            cachedServerVersion = version;
            return { config: conf, serverVersion: version };
          }
        }
      } catch (bakErr) {
        console.error('[NAS Config] .bak recovery failed:', bakErr);
      }
    }

    // 3. Fallback to newest valid snapshot in backups/
    if (fs.existsSync(configBackupsDir)) {
      try {
        const snapshotFiles = (await fs.promises.readdir(configBackupsDir))
          .filter(f => f.startsWith('dashboard-config-') && f.endsWith('.json'))
          .sort()
          .reverse();
        for (const file of snapshotFiles) {
          try {
            const raw = await fs.promises.readFile(path.join(configBackupsDir, file), 'utf-8');
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              console.log(`[NAS Config] Recovered configuration from snapshot ${file}! Healing primary file...`);
              await writeConfigFileAtomic(configFilePath, raw);
              const version = parsed.serverVersion !== undefined ? Number(parsed.serverVersion) : (parsed?.version || 1);
              const conf = parsed.serverVersion !== undefined ? parsed.config : parsed;
              cachedServerConfig = conf;
              cachedServerVersion = version;
              return { config: conf, serverVersion: version };
            }
          } catch (snapshotErr: any) {
            console.warn(`[NAS Config] Snapshot ${file} unreadable: ${snapshotErr?.message || snapshotErr}`);
          }
        }
      } catch (dirErr: any) {
        console.warn(`[NAS Config] Could not read backups directory: ${dirErr?.message || dirErr}`);
      }
    }

    // 4. Legacy fallback check for ./data/config.json if migrating
    const legacyPath = path.join(path.dirname(configDir), 'config.json');
    if (fs.existsSync(legacyPath)) {
      try {
        const raw = await fs.promises.readFile(legacyPath, 'utf-8');
        const parsed = JSON.parse(raw);
        cachedServerConfig = parsed;
        cachedServerVersion = 1;
        return { config: parsed, serverVersion: 1 };
      } catch (legacyErr: any) {
        console.warn(`[NAS Config] Legacy config.json unreadable: ${legacyErr?.message || legacyErr}`);
      }
    }

    return null;
  }


  return {
    configFilePath,
    configBackupPath,
    get isWritable() { return isConfigStorageWritable; },
    get cachedConfig() { return cachedServerConfig; },
    get cachedVersion() { return cachedServerVersion; },
    get cachedMtimeMs() { return cachedConfigMtimeMs; },
    /** Replace the read-through cache after a successful write. */
    setCache(config: ServerConfig | null, version: number) {
      cachedServerConfig = config;
      cachedServerVersion = version;
    },
    withConfigWriteLock,
    readPersistentConfig,
    writeConfigFileAtomic,
    /** Resolves once all queued config writes have finished (graceful shutdown). */
    drainWrites: () => configWriteQueue
  };
}

export type ConfigStore = ReturnType<typeof createConfigStore>;
