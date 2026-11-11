# Implicit state machines

Status: discovered from code reading, not yet refactored. "Proposed" is a recommendation, not current behaviour.

## Auth (`src/contexts/AuthContext.tsx`)
- Today: `isLoading`, `isAuthenticated`, `isDemo`, plus `HAConnectionStatus` from `haWebSocket`, plus stored tokens with expiry.
- States in practice: `restoring`, `signed_out`, `authenticating`, `authenticated`, `token_expired/refreshing`, `demo`.
- Invalid combinations the types allow: `isDemo && isAuthenticated`; `isLoading=false` with a token still being validated.
- Side effects: `useAutoLayoutStore` auth cache, WebSocket connect/disconnect, config load (skipped for demo).
- Done (phase 2, step 1): `src/services/authStatus.ts` builds every `AuthState` through factories (`signedOutAuthState`, `demoAuthState`, `authenticatedAuthState`) and exposes `useAuth().status: 'initializing' | 'signed_out' | 'authenticating' | 'authenticated' | 'demo'` via `deriveAuthStatus`. Demo+authenticated can no longer be constructed by AuthContext. The legacy booleans stay for compatibility; new code should read `status`.
- Still open: token refresh is not a status (it is a timer in AuthContext).
- `UserProfileSection` now uses the derived status. This fixed a badge that could never show 'Demo', because demo has `isAuthenticated=false`. `ConfigContext`, `configStorageService` and `AuthModal` still read the flags on purpose (they must not change during transient loading).

## Config sync (`src/contexts/ConfigContext.tsx`)
- Today: `isLoading`, `isSaving`, `syncStatus: synced | syncing | offline_fallback | error`, `driverType` (local / remote_ha / remote_nas), `isDragActive`, a pending-save flush.
- Hidden transition: dragging suppresses saves until released, and unload triggers a partial keepalive save.
- Server side: 409 on version conflict, refusal to overwrite material config with an empty payload unless `allowEmpty`, partial merge.
- Done (phase 2, step 2): `src/services/configSyncRules.ts` holds the pure rules: `reduceSyncStatus(current, event)` for every `syncStatus` transition, `decideRemoteApply(isDragActive)` (defer vs apply), and `reconcileRemoteConfig` (remote + unsynced + pending edits), which replaced three copy-pasted merge blocks in `ConfigContext` (initial/SSE load, broadcast, end of drag).
- Server side: `checkConfigWriteGuards()` and `cameraSourcesChanged()` in `server/lib/configRules.ts` decide the material-data guard, the 409 version conflict and the admin-only camera check, with unit tests.
- UI: `SyncStatusBadge` renders `effectiveSyncStatus(syncStatus, isConfigLoading)` (failures win over loading), replacing two duplicate pills and covering the previously invisible `error` state.
- Still open: `isSaving` and `isLoading` remain separate booleans.

## App startup (`src/App.tsx`)
- Today: `hasInitialLoaded`, `hasStartupTimeoutElapsed`, `loadingProgress`, `isManualRefreshing`.
- Done (phase 2, step 3): `src/services/startupPhase.ts` `deriveStartupState()` returns `phase: 'demo' | 'cached' | 'loading' | 'degraded' | 'ready'` plus `isAppLoading` and `isConnectionDegraded`, replacing the inline boolean expressions in `App.tsx`. The 5.5s startup window (`hasStartupTimeoutElapsed`) and `hasInitialLoaded` remain React state that feed it.
- Still open: `loadingProgress` (cosmetic) and `isManualRefreshing` are separate and fine to leave.

## HA WebSocket (`src/services/haWebSocket.ts`)
- Has an explicit `HAConnectionStatus`. Leave it, and have the Auth union consume it.
