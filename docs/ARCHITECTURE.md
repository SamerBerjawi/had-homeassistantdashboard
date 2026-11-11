# Architecture

See `CLAUDE.md` for stack and commands. This file explains how the pieces fit.

```
Browser (React SPA)
  ├─ WebSocket ──────────────► Home Assistant   live entities, services, history
  ├─ REST + Bearer HA token ─► Express (server.ts)
  │     ├─ requireHAAuth  ──► validates token via <HA>/api/ (60s cache), rate-limits failures
  │     ├─ /api/config (+SSE /api/config/stream)  atomic JSON file, version + backups
  │     ├─ /api/statistics/* (alias /api/energy/*)  SQLite (node:sqlite) synced from HA
  │     ├─ /api/image-proxy  SSRF-guarded, token forwarded to HA only
  │     ├─ /api/assets       admin-only uploads
  │     └─ /api/cameras/*    go2rtc WebRTC/HLS relay
  └─ BroadcastChannel: cross-tab config fan-out
```

## Rules of the road
1. HA is the identity provider. There is no user table. Admin routes use `requireHAAdmin`.
2. The server validates tokens against one HA instance: `HASS_URL` (required in production) or, in development only with `ALLOW_TOFU_PIN=true`, the first sign-in. Clients never choose it afterwards.
3. Config writes go through `withConfigWriteLock`, and carry an expected version. Conflicts return 409.
4. `server.ts` only composes modules: `server/auth` (token auth), `server/services/configStore`, `server/routes/*`, `server/middleware`, `server/static.ts`. Routes take dependencies via `registerXRoutes(app, deps)`; no module reads another's closure.
5. Client data flow: hooks (`src/hooks`) wrap services (`src/services`), which hold pure classification/transform logic (`*Classification.ts`, `energyDataTransformer.ts`). Keep new business rules in services, not components.

## Known weak spots
Giant client files (`haWebSocket.ts` is 967 lines after extracting protocol, demo and forecast helpers; `useMobilityData.ts`, `useOverviewHeaderState.ts`, `notificationsService.ts`; see the baseline in `tests/fileSizeGuard.test.ts`), remaining boolean-flag state (`isSaving`/`isLoading`, see `STATE_MACHINE.md`), and untested live-stream render cost (see `PERFORMANCE.md`).
