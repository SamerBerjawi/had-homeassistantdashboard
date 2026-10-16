# Reliability Findings

Date: 2026-10-14. Scope: reliability only. No application code was modified.
Method: read `server.ts`, `server/services/energyDbService.ts`, `energySyncService.ts`, `src/services/configStorageService.ts`, `haWebSocket.ts`, `cameraStreamManager.ts`, `haStatisticsStorage.ts`, `src/components/SettingsView.tsx`, `App.tsx`, the error boundaries, and the data hooks. Grepped `src/` for `any`, empty catches, `fetch(` and timeouts. Ran `npm run lint`, `npm test` and `npm run test:integration`. Reproduced two server issues with a throwaway harness (`.../brain/3bb3a512-.../scratch/rel-poc.mjs`, outside the repo; real server in production mode, temp data dir, fake go2rtc).
"Confirmed" means seen in code and/or reproduced. Grep counts are approximate: single-line patterns only.

## Test run results
| Command | Result |
|---|---|
| `npm run lint` (`tsc --noEmit`) | Pass |
| `npm test` (vitest) | 6 files, 32 tests, all pass |
| `npm run test:integration` | 6 suites pass (camera pipeline, drag guard, NAS storage, persistence regression, tile reorder, token security) |

The stack traces printed during `npm test` come from tests that simulate failures (offline NAS, HTTP 500, device offline). They are expected. The integration run wrote to `scratch/` (gitignored) only.

## Summary
| ID | Severity | Title |
|---|---|---|
| REL-001 | High | Config save conflict retry discards the user's edit and marks it synced |
| REL-002 | High | `DELETE /api/cameras/:id` hangs and leaves inconsistent state when the disk write fails |
| REL-003 | Medium | Server config validation accepts wrong-typed sections |
| REL-004 | Medium | Backup restore/import is non-atomic, untyped, and factory reset has no error handling |
| REL-005 | Medium | Most data views have no error state |
| REL-006 | Medium | Client calls to HAD's own API have no timeout |
| REL-007 | Medium | Camera settings go2rtc status check sends no auth header |
| REL-008 | Medium | Critical paths have no tests; no coverage tooling |
| REL-009 | Low | Statistics ingest is committed per chunk; client ignores the sync result |
| REL-010 | Low | Error-boundary gaps and a one-click destructive reset on the crash screen |
| REL-011 | Low | Silent catch blocks, including config recovery paths |
| REL-012 | Low | Weak typing: 281 `any` usages on API and config paths |

---

### REL-001 Config save conflict retry discards the user's edit and marks it synced
- Severity: High
- Location: `src/services/configStorageService.ts:790-829` (retry), especially `:814-825`
- Evidence: After a 409 the client re-POSTs the merged config. If that retry returns any status other than 200, the `else` branch runs:
  ```ts
  } else {
    console.warn('[RemoteStorageDriver] Retry save also encountered a conflict. Accepting server configuration.');
    this.lastKnownServerVersion = serverVersion;
    ...
    updated = baseConfig;               // user's change dropped
    this.lastSavedSignature = JSON.stringify(updated);
    nasSaved = true;                    // later: clearUnsynced(unsyncedSeq)
  }
  ```
  The `else` is hit for 500, 503, 401, or a second 409. Every one of these is treated as "conflict, accept server".
- Impact: When the NAS errors or the token has just expired during a conflict retry, the user's edit is thrown away and the unsynced-changes queue entry is cleared, so it is never re-sent. The UI then reverts to the server version. Affects every user who edits from two devices, or whose NAS is flaky.
- Suggested fix: Only accept the server config on a real second 409. On any other status, keep `reMerged`, leave `nasSaved = false` so the change stays in the unsynced queue, and refresh the token on 401. The retry also uses sync `getAuthHeaders()` while the first attempt uses `getAuthHeadersAsync()`.
- Effort: S
- Note: confirmed by reading; not reproduced at runtime.

### REL-002 `DELETE /api/cameras/:id` hangs and leaves inconsistent state when the disk write fails
- Severity: High
- Location: `server.ts:1565-1613` (no `try/catch`; `await withConfigWriteLock` at `:1569`, mutation at `:1576`, go2rtc delete at `:1581-1590`, write at `:1598`); `server.ts:27-29`
- Evidence: Reproduced by making the config dir read-only after startup (`chmod 555`):
  ```
  DELETE /api/cameras/c1 (write fails): TimeoutError after 5002ms     <- no HTTP response
  go2rtc saw: [ 'DELETE /api/streams?src=c1' ]                         <- stream already removed
  POST webrtc c1 after failed delete: HTTP 404 "Camera "c1" has no configured RTSP source URL"
  GET config afterwards: camera c1 still present on disk
  [Process] Unhandled promise rejection: Error: EACCES: permission denied, open '...tmp...'
  ```
  Express 4 does not catch rejections from async handlers, and the process-level handler only logs. The handler also (a) deletes the stream from go2rtc before persisting, and (b) mutates `currentConfig`, which is the object held in `cachedServerConfig`, before the write succeeds.
- Impact: On a full, read-only, or unreachable NAS volume, the client request never completes. The camera disappears from live streaming (404) while it is still in the saved config, until the next `GET /api/config` refreshes the cache. The same pattern (async handler without `try/catch`) will hang any future route that throws.
- Suggested fix: Wrap the handler in `try/catch` returning 500. Persist first, then update the cache, then delete the go2rtc stream. Work on a deep copy of the config. Consider a small `asyncHandler` wrapper for all routes.
- Effort: S

### REL-003 Server config validation accepts wrong-typed sections
- Severity: Medium
- Location: `server.ts:247-268` (`isValidDashboardConfig`), used at `:890`
- Evidence: The validator checks only that the body is a non-empty object and that `version`, `updatedAt`, `theme`, `mobility` have the right primitive type. Reproduced:
  ```
  POST /api/config  {"config":{"rooms":5,"entities":[1],"areas":"oops","cameras":{...}}}  -> HTTP 200
  GET  /api/config  -> {"config":{"rooms":5,"entities":[1],"areas":"oops", ...}}
  ```
  The bad values are persisted and served to all devices.
- Impact: A buggy client, a bad import, or a hand-edited backup can store a config that other devices then load. Whether this crashes the client or is repaired by its merge logic was not tested. It is persisted and synced to every screen via SSE either way.
- Suggested fix: Validate each known top-level section's type (`rooms`, `entities`, `areas`, `floors`, `labels`, `cameras`, `preferences`, `profile`) with a schema (zod or hand-written) and return 400. Reject unknown top-level keys or at least cap depth/size.
- Effort: M

### REL-004 Backup restore/import is non-atomic, untyped, and factory reset has no error handling
- Severity: Medium
- Location: `src/components/SettingsView.tsx:428` (`performComprehensiveRestore(parsed: any, ...)`), `:597-608`, `:660-683`, `:686-699` (`handleFactoryReset`)
- Evidence: The restore applies parts one after another: canvas profiles, PIN, backdrop, preferences, profile, then `updateConfig(... ...incomingConfig ...)` with the unvalidated file contents spread into the config. If a later step throws, earlier steps are already applied. The only user feedback is a generic toast ("Could not restore snapshot data" / "Invalid JSON backup file format"; the import message says "Invalid JSON" even when the failure is a later restore step). `handleFactoryReset` is:
  ```ts
  const handleFactoryReset = async () => {
    await resetDashboardConfig();   // no try/catch
    resetToDefaults(); ...
    setShowResetConfirm(false);
    addToast({ title: 'Factory Reset Complete', ... });
  ```
  If `resetDashboardConfig()` rejects, the dialog stays open, no toast is shown, and the rejection is unhandled. There is no in-flight guard on Restore/Confirm Reset buttons (`BackupRestoreSection.tsx:155, 229`), so a double-click runs it twice.
- Impact: A partially applied restore leaves the dashboard in a mixed state (new theme and profile, old layout and cameras). A failed reset looks like nothing happened, or it succeeds locally and fails on the NAS without telling the user.
- Suggested fix: Validate the backup against a schema first, apply everything in one `updateConfig` call, and wrap every step in `try/catch` with specific errors. Add `isBusy` guards on Restore, Import, and Reset.
- Effort: M

### REL-005 Most data views have no error state
- Severity: Medium
- Location: `src/components/views/{AreaDetail,Automations,Media,Rooms,Security,Vacuums,Mobility}View.tsx`; hooks `useNetworkData`, `useSpeedTestData`, `useUgreenNas`, `useAdGuardData`
- Evidence: Grep for `error|failed|isError` in the view files: `AreaDetailView` 0, `AutomationsView` 0, `MediaView` 0, `RoomsView` 0, `SecurityView` 0, `VacuumsView` 0, `MobilityView` 0. Only `EnergyDashboardView` (5) and `IntegrationsView` (2) have error handling. These views do have loading and "No X Configured" empty states. The network/NAS/AdGuard hooks have `catch` blocks (5/3/3/2) but expose no `error` field (`error` count 0), so a failed fetch looks the same as "no data". Counts are grep-based; sub-components under `views/network`, `views/system` and `views/health` were not read in full.
- Impact: When Home Assistant is slow, unreachable, or a statistics call fails, users see an empty page or stale numbers with no explanation or retry. Wall-display users in particular can't tell "offline" from "nothing configured".
- Suggested fix: Add a shared `ViewErrorState` with retry, and have the hooks return `{ error, retry }`. Show the connection status already known in the store (`connectionStatus`) on each page.
- Effort: M

### REL-006 Client calls to HAD's own API have no timeout
- Severity: Medium
- Location: `src/services/haStatisticsStorage.ts:70,97,117,132`; `src/services/cameraStreamManager.ts:412,472`; `src/components/settings/CameraSettingsSection.tsx:61,166`; `src/services/haHistoryService.ts:141`; `src/services/haImageService.ts:97`; `src/hooks/useAlbumArtColor.ts:377`
- Evidence: A grep for `AbortSignal.timeout|AbortController` finds them only in `AuthContext.tsx`, `configStorageService.ts` and `haAuth.ts`. The calls above use plain `fetch(...)`. For example `haStatisticsStorage.ts:70`: `await fetch('/api/statistics/history?...', { headers })`, whose fallback to the Home Assistant WebSocket runs only in `catch`/non-OK, not on a stall. The server side is well covered (every outbound call has `AbortSignal.timeout`).
- Impact: If the NAS or the Node process stalls (disk spin-up, event-loop block), the Energy page's history load, camera WebRTC negotiation, and go2rtc checks wait on the browser's default network timeout instead of falling back to HA or showing an error.
- Suggested fix: Add a shared `fetchWithTimeout` (for example 8 s, like `saveConfig`) and use it for these calls, so the existing fallbacks trigger.
- Effort: S

### REL-007 Camera settings go2rtc status check sends no auth header
- Severity: Medium
- Location: `src/components/settings/CameraSettingsSection.tsx:61`
- Evidence: `const res = await fetch('/api/cameras/status');` (no headers). The route is behind `requireHAAuth` (`server.ts:1417`), which returns 401 for requests without a token (confirmed for the same middleware in the security PoC). The `else` branch then sets `go2rtcOnline` to false. The delete call at `:166` does send `getAuthHeaders()`.
- Impact: Expect the Camera settings page to show go2rtc as offline even when it is running, which sends users troubleshooting a working setup. Not observed in a browser.
- Suggested fix: Send `getAuthHeaders()` and distinguish 401 from "offline" in the UI.
- Effort: S

### REL-008 Critical paths have no tests; no coverage tooling
- Severity: Medium
- Location: `tests/`, `scripts/test-*.ts`, `vitest.config.ts`, `package.json`
- Evidence: Existing: 6 vitest files (about 590 lines: camera stream manager, energy stats, client config storage, dashboard snapshot, HA WebSocket, auto-layout store) and 6 integration scripts. `vitest.config.ts` uses `environment: 'node'` and `include: ['tests/**/*.test.ts']`; there is no jsdom, no React component test, and no coverage package in `package.json`. Not covered by any test I found:
  - Server: failure paths of config write/delete (REL-002), config validation (REL-003), the SSE stream and broadcast, token cache/grace/pinning logic, image-proxy success and redirect handling (only the SSRF block is tested), statistics `history` and `sync` routes, asset-upload error paths, graceful shutdown.
  - Client: `AuthContext` (OAuth callback, refresh, logout), `haAuth.ts`, backup/restore/reset (REL-004), the conflict-retry branch in `saveConfig` (REL-001; `configStorage.test.ts` has 4 tests for offline/500/replay only), all views and hooks, and every error boundary.
- Impact: The highest-risk reliability code (persistence and auth) has happy-path tests only, so regressions in the failure branches above would not be caught.
- Suggested fix: Add `@vitest/coverage-v8` and a CI threshold; add tests for the 409-retry branch, DELETE-on-write-failure, and config validation; add a jsdom project for restore/reset and error-boundary behaviour.
- Effort: L

### REL-009 Statistics ingest is committed per chunk; client ignores the sync result
- Severity: Low
- Location: `server/services/energySyncService.ts:73-78` and `:82-110`; `src/services/haStatisticsStorage.ts:97-105`
- Evidence: `ingestBatch` loops over chunks and each `upsertStatisticsBatch` call is its own `BEGIN`/`COMMIT` (`energyDbService.ts:174-236`, which does roll back correctly within a chunk). Metadata is written afterwards outside any transaction. A failure in chunk N leaves chunks 1..N-1 committed while the request returns an error. The client does `await fetch('/api/statistics/sync', ...)` without checking `res.ok`.
- Impact: Partial ingests after an error; the coverage view can then report data that arrived without its metadata. The rows are `INSERT OR REPLACE`, so a retry heals it, but the client never knows a retry is needed.
- Suggested fix: Wrap the whole batch (rows, sync state, metadata) in one transaction, or return how many chunks succeeded; make the client check the response and retry.
- Effort: S

### REL-010 Error-boundary gaps and a one-click destructive reset on the crash screen
- Severity: Low
- Location: `src/App.tsx` (render tree), `src/components/RootErrorBoundary.tsx:48-53,93`, no global handlers in `src/`
- Evidence: Views, header, drawers and the entity modal have boundaries with `resetKeys` (good). `Sidebar`, `AuthModal`, `CriticalAlertModal`, `ToastContainer`, `NotificationToast` and the PWA prompts are not wrapped, so an error in them reaches the root screen and replaces the whole app. The root screen's "clear cache and reset" button runs `localStorage.clear(); sessionStorage.clear()` immediately, with no confirmation, which also removes stored auth and the local shadow copy of config. A grep for `unhandledrejection|window.onerror` in `src/` finds nothing, so async errors outside React render are only seen in the console.
- Impact: A rendering bug in the sidebar or a toast takes down a wall display; a mistaken tap on the reset button signs the device out and drops its offline cache.
- Suggested fix: Wrap the remaining shell components in `ErrorBoundary variant="silent"`; confirm before clearing storage; add a global `unhandledrejection` logger.
- Effort: S

### REL-011 Silent catch blocks, including config recovery paths
- Severity: Low
- Location: `server.ts:434,436,448` (config snapshot and legacy recovery), `:1740,1747`; `src/services/configStorageService.ts:739,774,809,872,881,897`; `src/hooks/useNetworkData.ts:215,659,667,842`
- Evidence: `grep` finds 5 empty one-line `catch {}` in the server and about 64 `catch {}` plus 46 `.catch(() => {})` in `src/` (single-line forms only; multi-line `catch { // ignore }` blocks such as `useNetworkData.ts:659` are in addition). Example at `server.ts:421-437`: a corrupt snapshot file is skipped with no log. Not all are defects: in `useNetworkData`/`useUgreenNas` the swallowed `callHAService` errors are rolled back and surfaced as a toast by the store (`tests/autoLayoutStore.test.ts` covers this), and the localStorage ones are best-effort by design.
- Impact: When all backups are unreadable, the server falls through to "Config not found" (404) as if first run, with nothing in the logs explaining why. That could lead a client to push defaults.
- Suggested fix: Log at warn level in the recovery loops (`server.ts:434,436,448`), and return 500 instead of 404 when config files exist but none can be read.
- Effort: S

### REL-012 Weak typing: 281 `any` usages on API and config paths
- Severity: Low
- Location: whole repo; for example `server.ts:222` (`deepMergeConfig(base: any, partial: any)`), `server.ts:373` (`readPersistentConfig(): ... config: any`), `(req as any).haToken`, `SettingsView.tsx:428` (`parsed: any`)
- Evidence: `grep -rE ": any\b|as any\b|<any>" src server server.ts | wc -l` gives 281. `tsconfig.json` has `strict: true`, `npm run lint` passes, and there are 0 `@ts-ignore`/`@ts-nocheck`/`@ts-expect-error`. The `any` values concentrate where untrusted or API data enters (config body, backup files, HA responses).
- Impact: Missing-field and wrong-type bugs on those paths (see REL-003, REL-004) are invisible to the compiler.
- Suggested fix: Type the config and backup shapes (`unknown` plus a runtime schema at the boundary) before the next refactor; ban new `any` with a lint rule.
- Effort: L

---

## Checked and found sound (no finding)
- **Config writes:** serialized by `withConfigWriteLock`, written via temp file with fsync, then rename; rolling backups and self-healing reads; optimistic version check with a 409 and a guard against overwriting real data with an empty payload (`server.ts:215-370, 858-993`).
- **Statistics DB:** each chunk is in a transaction with rollback; queries are bounded (max IDs and rows) so the synchronous SQLite calls can't run unbounded (`server.ts:1113-1158`).
- **Server outbound calls:** all `fetch`/`undiciFetch` calls have `AbortSignal.timeout`; the image proxy caps size and redirects; token validation has a grace period and a bounded cache.
- **HA WebSocket service:** exponential backoff with jitter, reconnect on online/visible, pending requests rejected on disconnect, request timers (`haWebSocket.ts:145-267, 401-464, 533`).
- **Client config save:** 8 s timeout, retry with backoff, an unsynced-changes queue that replays, and offline fallback (apart from REL-001).
- **Error boundaries:** root, view, card and silent variants with `resetKeys` for views and drawers.
- **Graceful shutdown:** waits for the config write queue, closes SQLite, forces exit after 8 s.
- **Camera save (`handleSaveCamera`):** synchronous, so no double-submit window.

## Unverified
- **REL-001** at runtime (no test or browser run of the 409-then-non-200 sequence).
- **REL-003 client impact:** whether the client's `mergeConfig` repairs wrong-typed sections or crashes on them.
- **REL-007** in a browser (read from code; the 401 was shown on the same middleware, not on this exact route).
- **Race conditions between overlapping `saveConfig` calls** on one client (shared `lastKnownServerVersion`); the drag-guard test passes, but I didn't analyse the interleavings.
- **Whether the unsynced-changes queue survives a page reload,** and what the root-screen reset in REL-010 does to it.
- **Stale-state and cancellation handling in hooks other than `useEnergyData`** (that one uses a `cancelled` flag; `useHealthData`, `useMobilityData`, and others weren't checked).
- **Client SSE reconnect** behaviour (`configSyncService.ts`) after a network drop.
- **Sub-components of `views/network`, `views/system`, `views/health`** may have their own error states that my view-level grep missed.

## Coverage
Covered: all of `server.ts`; `server/services/*`; client persistence, auth-adjacent, WebSocket, camera and statistics services; error boundaries and the `App.tsx` shell; settings backup/restore/reset; grep survey of views, hooks, `any`, empty catches and `fetch` timeouts; lint, unit and integration test runs; two server reproductions.
Not covered: line-by-line review of the ~150 client components, most hooks, `AreaDetailView` (1,848 lines), `DeviceVisibilitySection` (2,456 lines), the service worker/PWA update flow, `scripts/` beyond their pass/fail, and real Home Assistant or go2rtc behaviour.
