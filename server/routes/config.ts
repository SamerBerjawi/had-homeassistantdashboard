/**
 * Dashboard config REST API (GET/POST /api/config) and the SSE push stream (/api/config/stream).
 * Writes go through ConfigStore's lock; every successful save is broadcast to connected screens.
 */
import type express from 'express';
import fs from 'fs';
import {
  applyPinOnWrite,
  redactConfigForClient,
  restoreRedactedCameraUrls,
  validateDashboardConfigShape
} from '../lib/security';
import { cameraSourcesChanged, checkConfigWriteGuards, deepMergeConfig, isValidDashboardConfig } from '../lib/configRules';
import type { JsonObject, PersistedConfig } from '../lib/configTypes';
import type { ConfigStore } from '../services/configStore';

export interface ConfigRoutesDeps {
  requireHAAuth: express.RequestHandler;
  isHaAdmin: (token: string) => Promise<boolean>;
  configStore: ConfigStore;
  /** Called after a save that changed camera sources (registers streams with go2rtc). */
  onCameraSourcesChanged: () => void;
}

export function registerConfigRoutes(app: express.Express, deps: ConfigRoutesDeps) {
  const { requireHAAuth, isHaAdmin, configStore, onCameraSourcesChanged } = deps;

  // Set to track connected SSE clients for real-time push configuration updates
  const sseClients = new Set<express.Response>();

  function broadcastConfigUpdate(serverVersion: number) {
    const payload = `event: config_updated\ndata: ${JSON.stringify({ serverVersion })}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(payload);
      } catch {
        sseClients.delete(client);
      }
    }
  }

  // Periodic heartbeat to prevent intermediate proxy/NAT connection dropouts (every 15s)
  setInterval(() => {
    const pingPayload = `event: ping\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(': heartbeat\n\n');
        client.write(pingPayload);
      } catch {
        sseClients.delete(client);
      }
    }
  }, 15000);

  // Real-time Push Stream (Server-Sent Events) for multi-device synchronization
  app.get('/api/config/stream', requireHAAuth, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Initial handshake comment and ping event
    res.write(': connected\n\n');
    res.write(`event: ping\ndata: ${JSON.stringify({ timestamp: Date.now(), status: 'connected' })}\n\n`);

    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // NAS REST Configuration Persistence API
  app.get('/api/config', requireHAAuth, async (req, res) => {
    if (!configStore.isWritable) {
      return res.status(503).json({
        success: false,
        error: 'Dashboard configuration storage directory is not writable or reachable'
      });
    }

    try {
      // PERF-007: serve from memory while the file on disk is the one the cache was filled from
      let persisted: PersistedConfig | null = null;
      if (configStore.cachedConfig && configStore.cachedVersion > 0) {
        try {
          if (fs.statSync(configStore.configFilePath).mtimeMs === configStore.cachedMtimeMs) {
            persisted = { config: configStore.cachedConfig, serverVersion: configStore.cachedVersion };
          }
        } catch {
          // file vanished: fall through to the self-healing reader
        }
      }
      if (!persisted) persisted = await configStore.readPersistentConfig();
      if (persisted) {
        return res.json({
          success: true,
          config: redactConfigForClient(persisted.config),
          serverVersion: persisted.serverVersion
        });
      }

      if (fs.existsSync(configStore.configFilePath)) {
        // The file is there but neither it nor any snapshot could be read: that is an error, not a first run
        console.error('[NAS Config] Config file exists but could not be read or recovered');
        return res.status(500).json({ success: false, error: 'Failed to read persistent config' });
      }

      // First run: file not found
      return res.status(404).json({
        success: false,
        message: 'Config not found'
      });
    } catch (err: unknown) {
      console.error('[NAS Config] Error reading persistent config:', err);
      return res.status(500).json({ success: false, error: 'Failed to read persistent config' });
    }
  });

  app.post('/api/config', requireHAAuth, async (req, res) => {
    if (!configStore.isWritable) {
      return res.status(503).json({
        success: false,
        error: 'Dashboard configuration storage directory is not writable or reachable'
      });
    }

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid config payload: expected JSON object with dashboard configuration'
      });
    }

    const allowEmpty = Boolean(body.allowEmpty);
    // A partial save is a delta merged onto the current config (e.g. sent with keepalive while the
    // page unloads). Merging can't wipe sections, so the empty-payload and version guards don't apply.
    const isPartialMerge = body.partial === true && !allowEmpty;

    // Extract target config object and client's last-known version
    const targetConfig = (body.config && typeof body.config === 'object') ? { ...body.config } : { ...body };
    const configPayload: JsonObject = targetConfig;
    delete configPayload.expectedVersion;
    delete configPayload.serverVersion;
    delete configPayload.allowEmpty;
    delete configPayload.partial;

    const clientExpectedVersion = body.expectedVersion !== undefined 
      ? Number(body.expectedVersion) 
      : (body.serverVersion !== undefined ? Number(body.serverVersion) : undefined);

    if (!isValidDashboardConfig(targetConfig)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid config payload: expected JSON object with dashboard configuration structure'
      });
    }
    const shapeError = validateDashboardConfigShape(targetConfig);
    if (shapeError) {
      return res.status(400).json({
        success: false,
        error: `Invalid config payload: ${shapeError}`
      });
    }

    try {
      const result = await configStore.withConfigWriteLock(async () => {
        // Read existing config with self-healing support
        const existing = await configStore.readPersistentConfig();
        const currentServerVersion = existing?.serverVersion || 0;
        const currentConfig = existing?.config || null;

        const guard = checkConfigWriteGuards({
          currentConfig,
          currentServerVersion,
          targetConfig,
          allowEmpty,
          isPartialMerge,
          clientExpectedVersion
        });
        if (guard.kind === 'material_guard' && currentConfig) {
          return {
            conflict: true,
            statusCode: 409,
            payload: {
              success: false,
              error: 'Refusing to overwrite existing dashboard configuration with an empty or uninitialized payload',
              materialGuard: true,
              serverVersion: currentServerVersion,
              config: redactConfigForClient(currentConfig)
            }
          };
        }
        if (guard.kind === 'version_conflict' && currentConfig) {
          console.warn(`[NAS Config Conflict] Write rejected: client expected v${guard.clientExpectedVersion} < server current v${currentServerVersion}`);
          return {
            conflict: true,
            statusCode: 409,
            payload: {
              success: false,
              error: 'Conflict: Server configuration has been modified by another client',
              conflict: true,
              serverVersion: currentServerVersion,
              config: redactConfigForClient(currentConfig)
            }
          };
        }

        const nextServerVersion = currentServerVersion + 1;

        // Clients only see redacted camera URLs and a PIN marker; put the stored secrets back
        restoreRedactedCameraUrls(targetConfig, currentConfig);
        applyPinOnWrite(targetConfig, currentConfig);

        // Only a change to the camera sources needs admin rights; ordinary saves echo them back
        if (cameraSourcesChanged(currentConfig, targetConfig) && !(await isHaAdmin(req.haToken ?? ''))) {
          return {
            conflict: false,
            statusCode: 403,
            payload: {
              success: false,
              error: 'Forbidden: changing camera sources requires a Home Assistant administrator'
            }
          };
        }

        // Deep merge targetConfig onto currentConfig (unless allowEmpty is explicitly set)
        // to prevent partial payloads from silently wiping out unmentioned sections
        let finalConfig = targetConfig;
        if (!allowEmpty && currentConfig) {
          finalConfig = deepMergeConfig(currentConfig, targetConfig);
          // Audit detect if fields from currentConfig were omitted from incoming payload
          const currentKeys = Object.keys(currentConfig);
          const targetKeys = new Set(Object.keys(targetConfig));
          const preservedKeys = currentKeys.filter(k => !targetKeys.has(k));
          if (preservedKeys.length > 0) {
            console.log(`[NAS Config Audit] Merged partial config into v${nextServerVersion}. Preserved ${preservedKeys.length} existing top-level sections: ${preservedKeys.join(', ')}`);
          }
        }

        const diskPayload = {
          serverVersion: nextServerVersion,
          config: finalConfig
        };

        const payloadString = JSON.stringify(diskPayload, null, 2);

        // Atomic persistence with fsync and backup rotation
        await configStore.writeConfigFileAtomic(configStore.configFilePath, payloadString);

        configStore.setCache(finalConfig, nextServerVersion);

        console.log(`[NAS Config Audit] Config persisted successfully (v${nextServerVersion}) with atomic fsync & backup rotation`);

        return {
          conflict: false,
          statusCode: 200,
          payload: {
            success: true,
            config: redactConfigForClient(finalConfig),
            serverVersion: nextServerVersion
          }
        };
      });

      // Broadcast real-time SSE event to all connected devices if write succeeded
      if (result.statusCode === 200 && result.payload?.serverVersion) {
        broadcastConfigUpdate(result.payload.serverVersion);
        if (targetConfig.cameras?.sources !== undefined) {
          onCameraSourcesChanged();
        }
      }

      return res.status(result.statusCode).json(result.payload);
    } catch (err: unknown) {
      console.error('[NAS Config] Error saving persistent config:', err);
      return res.status(500).json({ success: false, error: 'Failed to save persistent config' });
    }
  });

  function closeSseClients() {
    for (const client of sseClients) {
      try {
        client.end();
      } catch {}
    }
    sseClients.clear();
  }

  return { broadcastConfigUpdate, closeSseClients };
}
