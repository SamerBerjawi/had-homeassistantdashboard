# HAD / HOMZ Audit (UX + DX + AX)

Date: 2026-11-11. Branch: `refactor/split-giant-files`.
Context confirmed with owner: self-hosted and reverse-proxied/remote, long-term maintainability first, report as markdown in `docs/`.

**Method and limits.** Static review of `server.ts`, auth/config contexts, services and tests, plus a local run of `npm run lint`, `npm test`, `npm audit --omit=dev` and the server with `ALLOW_MOCK_TOKENS=true` driven by curl. I did NOT drive the UI in a browser, did not test against a real Home Assistant, and did not measure bundle size or rendering. Findings tagged *(verified)* were reproduced, the rest are *(inferred from code)*. Section 23 journeys are therefore partly inferred.

## 1. Executive summary

**Health: 7/10.** This is a more hardened codebase than most AI-built apps. Ticket-style IDs in comments (SEC-009, SEC-013, REL-008, PERF-008) show earlier audit passes were applied.

Verified baseline: `tsc --noEmit` clean, 19 test files / 139 tests pass, `npm audit --omit=dev` reports 0 vulnerabilities, CI runs audit + lint + coverage + build + bundle check + integration tests.

| | |
|---|---|
| Biggest risks | (1) Giant files, so AI edits are risky. (2) Implicit state machines built from booleans (auth, config sync, startup). (3) Trust-on-first-use HA pinning and open CSP/`x-ha-url` before pinning, which matters for a remotely exposed instance. (4) Error responses leak stack traces when `NODE_ENV` is not production. |
| Biggest opportunities | (1) Write the `docs/` AX set and keep the split-files refactor going. (2) Make the auth/config/startup lifecycles explicit state machines. (3) Centralise the 24+ `localStorage` token/config touchpoints. |

## 2. Critical / high findings

| # | Sev | Finding | Why it matters | Fix (smallest safe) |
|---|---|---|---|---|
| C1 | High | **Malformed JSON body returns an Express HTML error page with a stack trace** *(verified: `POST /api/config` with `{bad` and a mock token)*. There is no JSON-aware error middleware. Production hides the stack, but the response is still HTML to an API client, and any deploy that forgets `NODE_ENV=production` (the Dockerfile/`npm start` set it, bare `tsx` does not) leaks absolute file paths. | Info leak plus a client that expects JSON breaks on `res.json()`. | Add one final `app.use((err, req, res, next))` that returns `{success:false,error}` with status from `err.status`, no stack. About 10 lines. |
| C2 | ~~High~~ Resolved | **Correction:** I first wrote that first sign-in always pins the HA instance. That was wrong. Pinning is opt-in via `ALLOW_TOFU_PIN=true` (SEC-001); without `HASS_URL` or an existing pin, authenticated routes already refuse requests. The remaining gap was `ALLOW_TOFU_PIN=true` working in production, with an open CSP `connect-src` until pinned. | A remote instance with that flag set could be pinned by whoever signs in first. | **Done (D1 = require `HASS_URL` in prod):** `server.ts` now ignores `ALLOW_TOFU_PIN` when `NODE_ENV=production` and logs a warning. Existing `ha-instance.json` pins still work. `scripts/test-auth-trust.ts` still passes (it uses `NODE_ENV=test`). README still calls `HASS_URL` optional, so update it. |
| C3 | ~~High~~ Done | **`server.ts` is 2062 lines with auth, config, assets, statistics, image proxy, cameras and static serving in one closure.** `CLAUDE.md` says about 1760, so the doc is stale. | Closure-scoped helpers (`requireHAAuth`, `withConfigWriteLock`) cannot be unit-tested or imported. Any AI edit risks the security-sensitive code. | Continue the in-flight split: `server/middleware/auth.ts`, `server/routes/{config,assets,statistics,proxy,cameras}.ts`, `server/app.ts`. Move one route group per PR with `serverSecurity.test.ts` as the safety net. |
| C4 | ~~Medium~~ Done | **Auth rate limit keyed per client and cleared wholesale at 1000 entries** (`authFailures.clear()`). | An attacker rotating keys can flush everyone's counters. Behind a reverse proxy, the key may collapse to the proxy IP unless `trust proxy` is set. | Use LRU eviction instead of `clear()`. Make sure the key derivation honours `trust proxy`, and add a test. I did not test the 429 path: with no HA configured my burst returned 503. |
| C5 | ~~Medium~~ Done | **Bearer tokens are in `localStorage`** (`ha_token`, legacy keys, `authCache.ts`, `haAuth.ts`, `authStorage.ts`) and 24 files touch `localStorage`. | The strict `script-src 'self'` CSP helps, but any XSS exfiltrates a long-lived token. The legacy keys are kept for compatibility. | Do not remove the legacy keys (per CLAUDE.md). Route all reads through `authStorage.ts` (two files read `ha_token` directly) and add a lint-style test that forbids direct `localStorage.getItem('ha_token')` elsewhere. |

## 3. UX improvements *(mostly inferred, UI not driven)*
- Sync/offline state is exposed as `syncStatus: 'synced'|'syncing'|'offline_fallback'|'error'`. Confirm the UI shows a persistent, non-modal indicator and a retry action for `error`.
- `App.tsx` (1003 lines) holds about 20 independent `useState` flags. Verify every async view has loading/empty/error/retry. `ViewEmptyState`, `ViewErrorState` and `ViewLoadingState` exist, so make them mandatory for new views.
- Accessibility: `grep` found few ARIA attributes outside tests (my grep for the full count failed on a shell glob, so treat as unconfirmed); an `i-accessibility` e2e folder exists. Run it and report results before judging.
- Design system: one rules file (`.agents/rules/design_system.md`) plus `components/ui` primitives, but there are 143 `backdrop-blur` usages. Extract a `GlassSurface` primitive rather than repeating class strings. **Done as `glass.*` constants, see Phase 3.**
- Remote use: the first-run flow asks the user to trust an HA URL. Explain pinning in plain words in the auth modal.

## 4. Architecture improvements
- Giant files (lines): `server.ts` 2062, `PowerSourcesChart` 1453, `useOverviewHeaderState` 1347, `energyDataTransformer` 1215, `useMobilityData` 1196, `notificationsService` 1187, `haWebSocket` 1159, `LightControlView` 1038, `App.tsx` 1003, `configStorageService` 995. `src/data/mockRegistries.ts` (4026) is data and can stay.
- **Split status (giant files):** `server.ts`, `haWebSocket`, `notificationsService`, `energyDataTransformer`, `useMobilityData` and `PowerSourcesChart` (1453 to 770; pure logic in `services/energy/powerSources/`, tooltip in `PowerSourcesTooltip.tsx`) are done. `useOverviewHeaderState` (1347 to 733; pure logic in `services/overview/`, camera carousel in `useCameraCarousel.ts`) is done. `LightControlView` (1038 to 457; colour math in `services/lightColor.ts`, seven presentational sections in `entity-controls/light/`) is done, not visually checked. `App.tsx` (997 to 653; theme, active tab, shell overlays and startup state in `hooks/app/`, pure helpers in `services/appShell.ts`; shell e2e 25/25) is done. `configStorageService` (995 to 693; client merge helpers in `services/configMerge.ts`, re-exported; persistence-regression script passes) is done. No giant files remain except baselined data files.
- Pattern already proven in recent commits (store, integrationsService, sensor classification splits): extract pure functions into tested modules, keep the original file as a thin composer. Reuse it for `haWebSocket`, `useMobilityData`, `useOverviewHeaderState`.
- **Progress:** all `catch (err: any)` in `server/` and `src/` (20 client sites, via `src/lib/errors.ts`) and the sync/connection status event listeners in `ConfigContext` are now typed; other `as any` listeners (`AuthContext`, `haWebSocket`, `useCanvasStore`) and the rest of the `any` uses remain.
- **Done (any ratchet):** explicit `any` went from 238 (the audit's 260 was an over-count; there are no `@ts-ignore`) to 52, with `server/` at zero (backup restore now validates the weather backdrop and types its entity/room plan; the top-level `entities`/`rooms` array paths in `planRestore` are unreachable because `validateBackupShape` rejects arrays for those keys). `tests/anyGuard.test.ts` fails if the count grows and asks you to lower `BASELINE_ANY` when it drops. Typed window events live in `src/types/windowEvents.d.ts`. Left on purpose (need a validator or behaviour change): `applyConfigCustomizations`, EntityCustomizerModal toast type, FanControlView entity type, `findEntity`-style hooks, recharts tooltip props. The regex does not count `Record<string, any>`.
- (original) 260 uses of `any`/`@ts-ignore`. Start with `catch (err: any)` in `server.ts` (use `unknown` plus a helper) and the SSE `handleSyncStatus = (e: any)` event handler.
- Dependencies: `@visx/*` alpha pins and `cn` listed alongside the local `cn()` (per CLAUDE.md). **Done:** the unused npm `cn` package was removed (no imports; lint and build pass).

## 5. State machine findings
Full tables in `docs/STATE_MACHINE.md`. Summary:
1. **Auth** (`AuthContext`): `isAuthenticated` + `isDemo` + `isLoading` + `HAConnectionStatus` combine into impossible states (e.g. `isDemo && isAuthenticated`, `isLoading` with a stale token). Make it one discriminated union.
2. **Config sync** (`ConfigContext`): `isLoading`, `isSaving`, `syncStatus`, `driverType`, `isDragActive` and a pending-save flush. Drag-active suppresses saves, which is a hidden transition.
3. **Startup** (`App.tsx`): `hasInitialLoaded`, `hasStartupTimeoutElapsed`, `loadingProgress`, `isManualRefreshing`. A single `phase` would remove the combination checks.
4. **Server config write**: version conflict (409), material-data guard, `allowEmpty`, `partial` merge. Already well guarded, but the rules live only in the route handler, so move them to a pure `decideConfigWrite()` function and test it.

## 6. Security findings (reverse-proxied)
Good: auth validated server-side against HA, admin routes use `requireHAAdmin`, `?token=` removed (SEC-013), CORS off by default, SSRF protection with per-hop redirect checks and private-range blocking *(verified: 169.254.169.254, 127.0.0.1, decimal IP and IPv4-mapped IPv6 all 403)*, atomic config writes, path traversal on `/data/assets/..%2f..` falls through to the SPA and leaks nothing *(verified)*, uploads sanitise filenames, CSP `script-src 'self'` in production.
Gaps: C1, C2, C4, C5 above, plus:
- `/api/public-config` and `/api/health` are unauthenticated. Check they expose no HA URL or version info beyond what you intend (`health` returned only status/time/storage flags, which is fine).
- `X-XSS-Protection` is obsolete (harmless). `style-src 'unsafe-inline'` is a known trade-off for Tailwind/Vite.
- `x-ha-url` header and `?haUrl=` are client-controlled until pinned. Confirm they are ignored once `getTrustedHaBase()` is set (the image proxy prefers the trusted base, which is correct).
- CSRF: bearer-header auth is not ambient, so low risk. SSE and image-proxy accept only headers now, so fine.

## 7. Performance findings *(inferred, not measured)*
- 660 `useState` calls and large context values (`ConfigContext` memo depends on 17 values) imply broad re-renders. Profile before changing.
- `PowerSourcesChart` and `EnergySparklineCharts` are large chart components. Check memoisation and data downsampling.
- Statistics are in SQLite with sync from HA, which scales fine for a household. `npm run check:bundle` already guards bundle size.
- 10x data: config JSON up to a 15 MB body limit is written whole on each save (with throttled snapshots). Fine now. Revisit if configs grow.

## 8. AX improvements
- No `docs/` existed. This audit adds `ARCHITECTURE.md`, `STATE_MACHINE.md`, `AI_RULES.md`. Still to write: `DOMAIN_RULES.md`, `DESIGN_SYSTEM.md` (promote `.agents/rules/design_system.md`), `DECISIONS.md`.
- Strengths: strict typed `tsc` gate, ticket-ID comments, `*Classification.ts` convention, `CLAUDE.md`.
- Weaknesses: stale line counts in CLAUDE.md (1760 vs 2062; test count says 32 but there are 139 across 19 files), `any` usage, closure-scoped server code, and state spread across booleans.
- Add a CI check that fails on new files over about 800 lines (allow-list the existing ones) so refactors stick.

## 9. Golden paths (partly inferred)
| Journey | Expected | Observed / risk |
|---|---|---|
| Unauthenticated API call | 401 | *(verified)* 401 JSON |
| Save config with bad body | 400 JSON | *(verified)* arrays/empty objects give clear 400 JSON, malformed JSON gives HTML (C1) |
| Remote sign-in, first run | HA pinned, then locked | Works per code and `test-auth-trust.ts`; see C2 |
| Edit layout, then refresh mid-save | no data loss | Code has keepalive partial-merge and version conflict handling; not exercised in a browser |
| HA unreachable | clear offline state | `offline_fallback` exists; UI not verified |
| Camera stream | WebRTC via go2rtc | Disabled in dev by design; needs go2rtc to verify |
| Mobile / PWA | usable, installable | Splash/manifest present; not verified |

## 10. Adversarial results (local, mock token)
| Attack | Result | Sev |
|---|---|---|
| Malformed JSON to `/api/config` | HTML error page with stack trace | High (C1) |
| `[]` and `{}` config bodies | 400 JSON, no write | OK |
| SSRF to metadata, loopback, decimal IP, mapped IPv6 | 403 | OK |
| Asset path traversal | SPA fallback, no file read | OK |
| 25 bad-token requests | all 503 because no HA is configured, so the 429 limit is untested | Gap |
| Not tested: oversized uploads, concurrent saves from two tabs, expired token mid-session, HA outage | n/a | Needs integration/e2e run |

## 11. Roadmap
**Fix status:** C1 (JSON error handler), C2 (HASS_URL in prod), C4 (oldest-first eviction, `TRUST_PROXY`) are done with tests; README/CLAUDE.md refreshed. C5 (token storage centralised in `authStorage.ts`, enforced by `tests/authStorageBoundary.test.ts`) is done. C3 (split `server.ts`) is done: 2062 to 258 lines. Auth, config store, config/SSE, assets, adguard, cameras, image proxy, statistics, security headers and static serving each live under `server/`. All unit and 8 integration suites pass.

**Phase 1 (stability/security):** C1 JSON error handler; decide D1 on pinning; C4 LRU eviction plus test of the 429 path; refresh CLAUDE.md numbers.
**Phase 2 (maintainability) status: done** (auth status, config-sync rules, startup phase, `checkConfigWriteGuards`, central token storage, file-size guard, `server.ts` split). Original list: split `server.ts` by route group; discriminated-union auth state; `decideConfigWrite()` pure function; centralise token storage; file-size CI guard.
**Phase 3 (UX) status:** persistent sync indicator done (`SyncStatusBadge`: syncing / offline cache / "Changes not saved" with retry, polite live region; the `error` sync state previously had no indicator at all). Accessibility e2e suite run: 15/15 pass on desktop, and the mobile run of a11y + shell + settings-sync passed 54 with 1 skipped. Plain-language trust prompt dropped: first-run pinning is now opt-in and off in production, so there is no prompt to explain. `GlassSurface` is done as an exact-match helper (`src/lib/glass.ts`: panel, tile, field, chip, iconWell; 62 sites in 10 components, built CSS byte-identical). Remaining near-matches (ternary light/dark card styles, a few variants) are intentionally left; roles are documented in `.agents/rules/design_system.md`. Dead code `src/components/layout/Header.tsx` was removed in the follow-up PR. Original list: persistent sync indicator, plain-language trust prompt, run and fix the accessibility e2e, `GlassSurface` primitive.
**Phase 4 (scale) status:** measured, see `docs/PERFORMANCE.md`. Production edit-mode toggle is about 22 ms (50 ms at 4x CPU) and `/rooms` has no long tasks, so no code change was made. Live-entity-stream re-render rates are still unmeasured. Original list: profile context re-renders, memoise chart data, consider config sharding only if configs grow.

## 12. Decisions needed from you
- **D1 (decided: C).** Require `HASS_URL` in production; `ALLOW_TOFU_PIN` is ignored there. Implemented.
- **D2.** Do you want the `server.ts` split to continue on this branch or in a new one?

## Not covered
Browser-driven UX/a11y checks, real-HA behaviour, load/perf measurements, Docker/Umbrel packaging, and a line-by-line review of every service. Counts above come from grep and may be off by a few.

## Follow-up PR
429 rate-limit path and production-TOFU rule are now covered by `scripts/test-auth-trust.ts` (sections 6 and 7); dead `Header.tsx` removed; `catch (err: any)` in `server/` replaced by `unknown` with `errorMessage()`/`errorCode()`; `DECISIONS.md`, `DOMAIN_RULES.md` and `DESIGN_SYSTEM.md` written.
