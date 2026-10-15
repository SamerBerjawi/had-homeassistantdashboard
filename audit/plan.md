# Remediation plan

Built 2026-10-15 from `findings-security.md`, `findings-reliability.md`, `findings-performance.md`, `findings-ui.md`, `qa-results.md` and `inventory.md` (flags). Nothing here was re-verified against the code; severities, locations and suggested fixes come from the source reports. No application code was changed.

Tests referenced: `npm run lint`, `npm test` (vitest), `npm run test:integration` (scripts/test-*.ts), `npx playwright test` (tests/e2e, desktop+mobile, dev server). **New tests are called out where none exist today.**


## 0. Implementation status

Updated as packages land. Findings listed as done are fixed and covered by the tests named in the note.

| Package / item | Status | What changed |
|---|---|---|
| P1-1 SEC-001, SEC-007 | Done | Auth refuses until HASS_URL/pin (503) unless ALLOW_TOFU_PIN=true; mock tokens only with ALLOW_MOCK_TOKENS=true; `start` sets NODE_ENV=production. Tests: scripts/test-auth-trust.ts, e2e A/H. |
| P1-2 SEC-002, SEC-004 | Done | HLS proxy GET/HEAD only, strict playlist/segment path allow-list, query allow-list; compose no longer publishes go2rtc 1984/8554. Tests: tests/serverSecurity.test.ts, e2e H. |
| P1-3 SEC-003, REL-003 | Done | server/lib/security.ts validates section types and camera source scheme on POST /api/config and before go2rtc registration. Tests: serverSecurity.test.ts, e2e H. |
| P1-4 SEC-006 | Done | GET/POST/409 responses and /api/cameras/status redact URL credentials; redacted echo-back preserves stored URL; kiosk PIN scrypt-hashed and returned as marker. Tests: serverSecurity.test.ts, e2e H. |
| P1-5 REL-001 | Done | Conflict retry only accepts server config on a second 409; other failures keep the edit queued. Tests: tests/configStorage.test.ts. |
| P1-6 REL-002 | Done | DELETE /api/cameras/:id wrapped in try/catch, works on a copy, persists before cache/go2rtc. Tests: e2e H (idempotent delete). |
| QA-A-001 (P2-2) | Done | validateHaUrl blocks malformed URLs for OAuth and LLAT with an inline alert. Tests: tests/haUrlValidation.test.ts, e2e A. |
| SEC-008 (P2-2) | Done | postMessage handler ignores other origins. |
| SEC-010 (P2-2) | Done | Logout revokes the stored OAuth refresh token; server positive token cache cut to 60 s. |
| UI-004 (AuthModal part of P4-2) | Partial | AuthModal URL and token inputs have htmlFor/id; token toggle has aria-label. Other forms remain. |
| REL-007 (P2-4) | Done | Camera settings go2rtc status call sends auth header and a timeout. |
| SEC-012 (P2-6) | Done | releaseUrl href goes through sanitizeSafeUrl. |
| SEC-016 (P2-8) | Done | `npm audit fix`: 0 vulnerabilities; CI runs `npm audit --omit=dev --audit-level=high`. |
| PERF-002, PERF-001 (P3-1) | Done | vendor-react chunk populated (entry 1128 KB to 912 KB raw); bundle check measures the static-import startup graph (278 KB br, budget 320 KB). |
| PERF-011 (P3-4) | Done | Removed unreferenced 1.2 MB JPGs from public/. |
| UI-001 (P4) | Done | Viewport no longer blocks pinch-zoom (per decision C10). |
| UI-014 (P4-4) | Done | Fixed `----chart-*` theme aliases. |
| P2-1 SEC-005 (decision C3) | Done | Camera-source changes, /api/assets, /api/statistics/sync and DELETE /api/cameras require HA is_admin (WebSocket auth/current_user, cached 60 s); layout saves stay open. Tests: scripts/test-auth-trust.ts (fake HA ws), e2e H. |
| P2-4 REL-006, REL-009 | Done | fetchWithTimeout on statistics, history, image, webrtc, album-art and camera calls; statistics sync checks the result and retries once; server reports partial ingests. Tests: tests/fetchWithTimeout.test.ts. |
| P2-3 REL-004, REL-010 | Partial | Backups validated before apply (src/lib/backupValidation.ts), busy guards on restore/import/reset, failed reset leaves local state, crash-screen reset needs a second click, global error/rejection logging. NOT done: single atomic apply of a restore; silent boundaries around remaining shell components. Tests: tests/backupValidation.test.ts, e2e G. |
| P2-5 REL-005, UI-013 | Partial | Shared ViewErrorState plus an app-wide retryable banner when the live connection drops. NOT done: per-hook error/retry for network/NAS/AdGuard hooks; replacing the ~51 inline spinners. Tests: tests/viewErrorState.test.tsx. |
| P2-6 SEC-009, SEC-011, SEC-014, SEC-015, REL-011 | Done | No CORS headers without an allow-list; CSP connect-src scoped to the trusted HA once known (C5), Permissions-Policy, HSTS behind HTTPS; generic 5xx/502 messages; failed-auth rate limit, ingest period/id/row limits; recovery paths log and 500 on unreadable config. Tests: e2e H. |
| P2-7 SEC-013 | Done | Query-string tokens removed from the server; config stream is fetch+ReadableStream with Authorization header (src/lib/sseParser.ts); album-art proxy uses the header only. Tests: tests/sseParser.test.ts, e2e H. Note: PWAs running the old client need the new build to reconnect the stream. |
| P2-8 REL-008 | Partial | @vitest/coverage-v8 with thresholds (CI runs test:coverage) and new tests for every fix. NOT done: jsdom suites for AuthContext/views; broad component coverage. |
| P2-9 REL-012 | Partial | Typed Express request fields instead of `(req as any)`. NOT done: schema/types for config and backup payloads (281 `any` remain). |
| P3-2 PERF-004, PERF-006 | Done | Status/entities cached and invalidated on write; unused idx_energy_range dropped (confirmed with EXPLAIN QUERY PLAN). Tests: tests/energyDbCache.test.ts. |
| P3-3 PERF-007, PERF-008, PERF-009 | Partial | GET /api/config served from memory with mtime invalidation; timestamped snapshots at most once a minute; HLS proxy streams bodies. NOT done: image-proxy still buffers (bounded by its size cap). Tests: scripts/test-config-cache.ts, test-camera-pipeline.ts. |
| P3-4 PERF-010 | Done | loading="lazy" decoding="async" added to all <img> tags (50 changed). |
| P3-1 PERF-003, PERF-012 | Not done | PERF-003 (lazy services/icons) skipped: entry is 173 KB br and startup 278 KB against a 320 KB budget. PERF-012: precache budget deliberately left at 2 MB (87% used). |
| P3 PERF-005 | Not done | History query over-fetch / worker thread not changed. |
| P4-1 UI-002, QA-B-001 (UI-012 not done) | Partial | useDialogA11y hook (focus move, Tab trap, Escape, focus restore) plus role=dialog/aria-modal on the entity drawer, auth gate and the four confirm modals. QA-B-001 passes. NOT done: migrating the remaining overlays; merging the four confirm modals (UI-012). Tests: e2e I, e2e B. |
| P4-2 UI-003, UI-004, UI-005 | Done | 25 icon-only buttons named; AuthModal labels; 44 clickable div/span got role=button, tabIndex and Enter/Space handling (39 backdrop/stopPropagation elements intentionally skipped). Tests: e2e I. |
| P4-3 UI-006, UI-007, UI-008, UI-009 | Done | Global :focus-visible ring; micro text (8-10 px, 926 uses) raised to 11 px; auth placeholder contrast; prefers-reduced-motion in CSS and MotionConfig. Tests: e2e I. |
| P4-4 UI-010, UI-011, UI-015 | Partial | Removed 4 unused primitives (ui/button, scroll-progress, DotSlider, battery-card); design-rules example fixed. NOT done: migrating 739 hex colours to tokens (UI-010); one primitive layer (UI-011). |
| P4-5 UI-016 | Done | Desktop and mobile settings hub use the same titles; cameras entry added to SETTINGS_SECTIONS_META; consistent 'Connect with token' / 'Connect Home Assistant' / 'Home Assistant URL'. Tests: e2e A, G. |

## 1. De-duplication

58 raw findings (16 SEC, 12 REL, 12 PERF, 16 UI, 2 QA) become **54 unique issues**. No finding is rated Critical in the source reports.

| Merged issue | Source IDs | Notes |
|---|---|---|
| M1 Server accepts unvalidated config (incl. camera `rtspUrl`) | SEC-003 + REL-003 | One validator fixes both. Severity High. |
| M2 Overlays lack dialog semantics; duplicate confirm modals | UI-002 + UI-012 + QA-B-001 | UI-002 says itself it is the same work as UI-012. QA-B-001 reproduced it in the entity modal (`EntityDetailModal.tsx:304`). Severity High. |
| M3 No shared error/loading/empty states in views | REL-005 + UI-013 | One shared state component set. Severity Medium. |
| M4 go2rtc status call has no auth header | REL-007 + inventory flag 5 + QA (`/api/cameras/status` 401 without token, confirmed) | Same line, `CameraSettingsSection.tsx:61`. |
| M5 Unused/dead files | inventory flag 9 + UI-011 (`ui/button.tsx` dead) + PERF-011 (unused JPGs) | Handled in cleanup packages; not separate severities. |
| M6 Settings labels/copy | UI-016 + QA note (desktop/mobile hub card titles differ) + inventory flag 6 (`cameras` missing in `SETTINGS_SECTIONS_META`) | |

Related but kept separate (different defect, same code): SEC-002 and PERF-009 (HLS proxy), SEC-006 and PERF-007 (`GET /api/config`), REL-004 and REL-010 (both destructive reset), PERF-001 and PERF-012 (bundle budget), UI-010 and UI-015 (tokens vs design rules).

Counts after merge: 8 High, 22 Medium, 24 Low (see `summary.md`).

## 2. Conflicting recommendations and proposed resolutions

| # | Conflict | Resolution |
|---|---|---|
| C1 | **SEC-001** (require `HASS_URL`, drop `X-HA-URL` authority) vs CLAUDE.md/architecture (trust-on-first-use pin, zero-config Docker/Umbrel). Strict mode breaks existing installs. | Keep TOFU only as an explicit opt-in: refuse authenticated routes until `HASS_URL` is set **or** `ha-instance.json` exists; add a first-run setup path (`ALLOW_TOFU_PIN=true`, loud log) and never read `X-HA-URL` once pinned. Document in compose/Umbrel files. Needs an owner decision (see section 6). |
| C2 | **SEC-007** (mock tokens opt-in only) vs the QA suite, which relies on `test_` tokens under `NODE_ENV!=production`. | Set `ALLOW_MOCK_TOKENS=true` in `playwright.config.ts` `webServer.env` and in `scripts/test-token-security.ts` harness. Do both in the same package. |
| C3 | **SEC-005** (admin-only writes) vs shared wall-tablet/guest tokens that legitimately save layout. | Do not blanket-require admin. Admin-only: camera sources, `/api/assets`, `/api/statistics/sync`, `DELETE /api/cameras`. Layout/preference writes stay open to any valid user. Confirm with the owner. |
| C4 | **SEC-006** (strip camera credentials from `GET /api/config`) vs the camera settings UI, which edits the full `rtspUrl`, and **PERF-007** (serve config from memory). | Treat credentials as write-only: store separately from the shared config, return a redacted URL plus `hasCredentials`, and accept a new value on write. Cache the **redacted** view, not the raw file. Land SEC-006 before PERF-007. |
| C5 | **SEC-011** (narrow CSP `connect-src` to `'self'`+HA host) vs the client connecting directly to a user-typed HA URL before any pin exists. | Narrow only after pinning (server injects the pinned host into the CSP header); before pin keep the current policy. Add `Permissions-Policy` and HSTS-over-HTTPS regardless. |
| C6 | **SEC-013** (no token in query string) vs `EventSource` limits and `<img>` for image-proxy. | Fix SSE with `fetch` streaming + header; for image-proxy keep `?token=` but use a short-lived single-purpose token. Do after the other SEC work (M effort, lowest severity). |
| C7 | **PERF-012** ("raise budget deliberately") vs **PERF-001** (budget under-counts). | Do PERF-002 and PERF-001 first so the real number is known; only then decide on PERF-012. Do not raise the budget before that. |
| C8 | **REL-002** (persist first, then cache) vs **PERF-007** (in-memory read cache). | Same invariant: cache is updated only after the durable write succeeds. Implement together or REL-002 first. |
| C9 | **SEC-006** (hash kiosk PIN) vs inventory flag 1 (PIN consumer `PinLockModal` may be unreachable). | Confirm `canvas/TunetCanvasView.tsx` is dead before spending effort; if dead, remove the PIN from shared config instead of hashing it. |
| C10 | **UI-001** (allow pinch zoom) vs the app-like kiosk feel the original `user-scalable=no` was chosen for. | Allow zoom (accessibility wins); use `touch-action: manipulation` on controls to stop double-tap zoom. |

## 3. Execution plan

Effort: S under half a day, M about a day, L multiple days. "Depends" lists packages that must land first.

### Phase 1: Critical security and data integrity
(No finding is Critical in the source reports; these are the High-severity security and data-loss items.)

| Pkg | Covers | Files | Depends | Effort | Verify |
|---|---|---|---|---|---|
| **P1-1 Pin HA authority, kill implicit mock bypass** | SEC-001, SEC-007 (resolves C1, C2) | `server.ts:473-581,726-780`, `package.json` (`start`), `docker-compose.yml`, `playwright.config.ts`, Umbrel manifest | none | M | `scripts/test-token-security.ts` extended: unpinned + `X-HA-URL` is rejected; `Bearer test_x` is 401 without `ALLOW_MOCK_TOKENS`. `npx playwright test tests/e2e/a-auth-session` (server specs) still passes with the new env. `npm test`. |
| **P1-2 Lock down go2rtc proxy and exposure** | SEC-002, SEC-004 | `server.ts:1501-1562`, `docker-compose.yml` | none | S | New vitest/integration cases: POST/DELETE and `..%2f` on `/api/cameras/:id/hls*` return 405/400; only playlist/segment names pass. `scripts/test-camera-pipeline.ts` passes. Compose no longer publishes 1984/8554. |
| **P1-3 Server-side config validation (incl. camera URL scheme)** | SEC-003, REL-003 (M1) | `server.ts:247-268,858-993,1339-1393` | none | M | New unit tests: `exec:`/`file:` `rtspUrl` rejected; wrong-typed sections 400. `scripts/test-persistence-regression.ts` passes. `tests/e2e/b-shell-overview` + `g-settings-config-sync` API specs pass. |
| **P1-4 Stop returning camera credentials/PIN** | SEC-006 (C4, C9) | `server.ts:829-857,1417-1435`, `src/components/settings/CameraSettingsSection.tsx`, `src/types/userConfig.ts` | P1-3 | M | New test: `GET /api/config` and `/api/cameras/status` contain no `user:pass@`. Camera add/edit/delete UI still works (manual + new Playwright spec for W26). |
| **P1-5 Client config conflict retry no longer drops edits** | REL-001 | `src/services/configStorageService.ts:790-829` | none | S | New vitest cases in `tests/configStorage.test.ts`: 500/503/401 on retry keep the change queued; only a second 409 accepts server. `scripts/test-persistence-regression.ts`. |
| **P1-6 Camera delete is safe on write failure** | REL-002 | `server.ts:1565-1613`, `server.ts:27-29` | none | S | New test with unwritable data dir: `DELETE /api/cameras/:id` returns 500 and state is unchanged; no hung request. |

### Phase 2: High-severity bugs and reliability

| Pkg | Covers | Files | Depends | Effort | Verify |
|---|---|---|---|---|---|
| **P2-1 Admin-only writes** | SEC-005 (C3) | `server.ts:726-780` + camera/assets/sync routes | P1-1 | M | New test: non-admin token gets 403 on camera/assets/sync writes, 200 on layout save. |
| **P2-2 Client auth hardening** | SEC-008, SEC-010, QA-A-001, UI-004 (AuthModal labels) | `src/contexts/AuthContext.tsx:227-250,427-432,544-560`, `src/services/haAuth.ts:94-108`, `src/components/auth/AuthModal.tsx:81-86,212-276` | none | S | `npx playwright test tests/e2e/a-auth-session` incl. QA-A-001 spec (currently failing) goes green. New test: foreign-origin `postMessage` ignored. |
| **P2-3 Backup/restore/reset safety** | REL-004, REL-010 | `src/components/SettingsView.tsx:428,597-699`, `src/components/RootErrorBoundary.tsx:48-53,93`, `src/App.tsx` | P1-3 (backup schema reuse) | M | `tests/e2e/g-settings-config-sync` (reset confirm, invalid import). New jsdom tests for restore failure paths. |
| **P2-4 Client network resilience** | REL-006, REL-007 (M4), REL-009 | `src/services/haStatisticsStorage.ts`, `cameraStreamManager.ts`, `haHistoryService.ts`, `haImageService.ts`, `useAlbumArtColor.ts`, `CameraSettingsSection.tsx:61,166`, `server/services/energySyncService.ts:73-110` | none | S | New test: shared `fetchWithTimeout` aborts at limit; camera status shows 401 vs offline. `npx playwright test tests/e2e/c-rooms-security` (W26). |
| **P2-5 Shared view states** | REL-005, UI-013 (M3) | `ui/ViewLoadingState.tsx`, `ViewEmptyState.tsx`, new `ViewErrorState`, views listed in REL-005, hooks `useNetworkData` etc. | P2-4 | M | `npx playwright test tests/e2e` (all view smoke specs); new spec that stubs HA failure and expects retry UI. |
| **P2-6 Server hygiene** | SEC-009, SEC-011 (C5), SEC-012, SEC-014, SEC-015, REL-011 | `server.ts:69-93,167-182,1098-1188,1320,1481`, `energySyncService.ts`, `NotificationChangelog.tsx:256-263` | P1-1 | M | `scripts/test-token-security.ts` (no ACAO without allow-list, no `err.message` in 500s). New test for `javascript:` releaseUrl. |
| **P2-7 SSE/image-proxy token handling** | SEC-013 (C6) | `server.ts:731-753`, `src/services/configSyncService.ts`, `useAlbumArtColor.ts` | P2-6 | M | New integration test: stream works via header; query token rejected or single-use. |
| **P2-8 Dependencies and CI** | SEC-016, REL-008 | `package.json`, lockfile, `.github/workflows/docker-publish.yml`, `vitest.config.ts` | none | M | `npm audit --omit=dev --audit-level=high` clean; coverage run in CI. All suites pass. |
| **P2-9 Config/backup typing** | REL-012 | `server.ts:222,373`, `SettingsView.tsx:428`, `src/types` | P1-3 | L | `npm run lint`; no new `any` lint rule violations. |

### Phase 3: Performance

| Pkg | Covers | Files | Depends | Effort | Verify |
|---|---|---|---|---|---|
| **P3-1 Bundle structure and budget** | PERF-002, PERF-001, PERF-003, PERF-012 (C7) | `vite.config.ts:164`, `scripts/check-bundle-size.cjs`, entry imports | none | M | `npm run build && npm run check:bundle` with the corrected measurement; vendor chunk non-empty. |
| **P3-2 Statistics DB** | PERF-004, PERF-005, PERF-006 | `server/services/energyDbService.ts`, `server.ts:1092-1124` | none | M | `tests` for energyDb (existing) + `EXPLAIN QUERY PLAN` check; `tests/e2e/d-energy-system-network` API specs. |
| **P3-3 Server IO** | PERF-007, PERF-008, PERF-009 | `server.ts:829-838,900+,1220-1322,1501-1562` | P1-2, P1-4, P1-6 (C4, C8) | M | `scripts/test-camera-pipeline.ts`, `test-persistence-regression.ts`; Playwright API specs in B and G. |
| **P3-4 Assets** | PERF-010, PERF-011 | `src/**` `<img>` tags, `public/had_icon_*.jpg` | none | S | Build output size; `tests/e2e` smoke specs. |

### Phase 4: UI consistency and accessibility

| Pkg | Covers | Files | Depends | Effort | Verify |
|---|---|---|---|---|---|
| **P4-1 Modal/Drawer primitive + ConfirmDialog** | UI-002, UI-012, QA-B-001 (M2) | 25 overlay files, 4 confirm modals, `EntityDetailModal.tsx:304` | none | L | `tests/e2e/b-shell-overview` "role=dialog (QA-B-001)" goes green; Escape/focus-restore specs added. |
| **P4-2 Accessible names, labels, keyboard** | UI-003, UI-004, UI-005 | 36 icon buttons, 82 clickable divs, `Sidebar.tsx:166,372` | P4-1 (overlay buttons) | M | New Playwright a11y checks (axe or role queries); keyboard-only nav spec. |
| **P4-3 Focus, contrast, size, motion** | UI-006, UI-007, UI-008, UI-009 | `src/index.css`, `AuthModal.tsx`, bulk `text-[Npx]` | none | M | Visual/contrast check; reduced-motion Playwright emulation spec. |
| **P4-4 Tokens, primitives, design rules** | UI-010, UI-011, UI-014, UI-015, M5 | `src/index.css:498-505`, `ui/button.tsx`, `components/base/*`, `.agents/rules/design_system.md` | P4-1 | L | `npm run lint`; build; no hex literals in migrated directories (grep check). |
| **P4-5 Copy and label parity** | UI-016, M6 | `AuthModal.tsx:305`, `DemoBanner.tsx:46`, `ConnectionWebSocketSection.tsx`, `App.tsx` `SETTINGS_SECTIONS_META`, settings hub | none | S | `tests/e2e/g-settings-config-sync` selectors updated to one label set. |

### Quick wins (high value, effort S)
Each is inside the package shown; do these first if time is short.

| Win | ID | Package |
|---|---|---|
| Allow pinch zoom (`index.html:5`) | UI-001 | P4 (do now) |
| Add `aria-label` to 36 icon buttons | UI-003 | P4-2 |
| Opt-in-only mock tokens; `NODE_ENV=production` in `start` | SEC-007 | P1-1 |
| HLS proxy: GET only + strict path pattern | SEC-002 | P1-2 |
| Stop publishing go2rtc ports | SEC-004 | P1-2 |
| Validate `rtspUrl` scheme | SEC-003 | P1-3 |
| Conflict retry keeps user edit | REL-001 | P1-5 |
| try/catch + order of ops in camera delete | REL-002 | P1-6 |
| Origin check on OAuth `postMessage` | SEC-008 | P2-2 |
| Auth header + 401 handling on camera status | REL-007 | P2-4 |
| `fetchWithTimeout` | REL-006 | P2-4 |
| `sanitizeSafeUrl` on releaseUrl | SEC-012 | P2-6 |
| Revoke refresh token on logout | SEC-010 | P2-2 |
| `npm audit fix` + CI gate | SEC-016 | P2-8 |
| Fix react vendor chunk | PERF-002 | P3-1 |
| Delete unused 1.2 MB JPGs | PERF-011 | P3-4 |
| Fix `----chart-*` typo | UI-014 | P4-4 |

## 4. Order of work
P1-5, P1-6, P1-2, P1-3 can run in parallel (different files). P1-1 next (touches auth and test env). P1-4 after P1-3. Then Phase 2 in the table order; P2-2 and P2-4 are independent of the server work. Phases 3 and 4 can start in parallel with Phase 2 where "Depends" is none, except P3-3 which must follow Phase 1.

## 5. Coverage caveats
- QA ran only in demo mode with mock tokens; live-HA flows (OAuth round trip, session expiry, SSE sync, go2rtc) are untested, so Phase 1 fixes P1-1, P1-2, P1-4 need a real HA and go2rtc to verify end to end.
- Security reports list items as unverified (go2rtc `exec:` behaviour, SEC-008 and SEC-012 not reproduced in a browser). Treat their severity as the reported value.
- Several reports used grep counts (UI-005/006/007/010, REL-012); the numbers are approximate.

## 6. Decisions needed from the owner
1. C1: are zero-config TOFU deploys (Umbrel/Docker) still supported, or must `HASS_URL` be required?
2. C3: should non-admin HA users be allowed to change layout and preferences?
3. C9: is the kiosk PIN / canvas view dead? If yes, delete rather than harden.
4. C10: confirm pinch-zoom is acceptable on the wall-tablet install.
