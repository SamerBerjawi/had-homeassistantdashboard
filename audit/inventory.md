# HAD / HOMZ App Inventory

Generated 2026-10-14 from source (no application code modified). Sources: `src/App.tsx`, `src/main.tsx`, `server.ts`, `src/contexts/AuthContext.tsx`, `src/components/**`, `src/services/**`.
Method note: interactive elements were extracted by grepping `onClick`/`title`/`aria-label`/`placeholder`/`onChange` in each page's files, not by running the UI. Anything not run is "static reading". The dead-code scan (section 6) was a filename-import heuristic that I stopped before it finished, so it is partial.

## 0. Key facts that shape this inventory
- **No router library.** `App.tsx` maps `/<tab>` or `?tab=<tab>` to one of 13 tabs (`VALID_TABS`) and uses `history.pushState`. Sub-views (room detail, settings section) are store state (`selectedAreaId`, `selectedSettingsSection`), not URLs.
- **No sign-up, password reset, user accounts or roles.** Identity is a Home Assistant (HA) token. Every client-side user is `isOwner: true`. "Auth/roles" below means HA auth state: *Authenticated*, *Demo*, or *None*.
- **No page is route-guarded.** The shell renders for everyone. `AuthModal` is un-dismissible until the user is authenticated or in demo mode (`canClose`). Unauthenticated, non-demo use shows the blocking modal over the app.
- **Server auth** is one middleware, `requireHAAuth` (`server.ts:726`): `Authorization: Bearer <HA token>`, validated against HA `/api/`. Query `?token=` is accepted only on `/api/config/stream` and `/api/image-proxy`.
- Hidden pages (`config.navigation.hiddenPages`) redirect to `overview`. `overview` and `settings` can't be hidden.

## 1. Pages / routes
All files under `src/components/` unless noted. Auth column: "Auth or Demo" means data comes from HA, or from mock data in demo mode. No page enforces it separately.

| # | Route | File | Auth / roles | Notes |
|---|---|---|---|---|
| 1 | `/overview` (default, `/`) | `views/OverviewView.tsx` + `overview/OverviewHeader.tsx` | Auth or Demo; always visible | Eagerly loaded. Widget grid below header is an empty div (see flags) |
| 2 | `/rooms` | `views/RoomsView.tsx` | Auth or Demo; can be hidden | Floor tabs, area cards |
| 2a | `/rooms` + area selected | `views/AreaDetailView.tsx` (1848 lines) | same | Not a URL; back button in `App.tsx` header |
| 3 | `/energy` | `views/EnergyView.tsx` (re-export) -> `views/EnergyDashboardView.tsx` | Auth or Demo; hideable | Reads `/api/statistics/*` |
| 4 | `/security` | `views/SecurityView.tsx`, `views/security/*`, `camera/*` | Auth or Demo; hideable | Alarm, locks, cameras |
| 5 | `/media` | `views/MediaView.tsx`, `media/*` | Auth or Demo; hideable | |
| 6 | `/system` | `views/SystemView.tsx`, `views/system/HostMonitorTab`, `UgreenNasTab` | Auth or Demo; hideable | Sub-tabs: HA Host, UGreen NAS (local state) |
| 7 | `/network` | `views/NetworkView.tsx`, `views/network/*` | Auth or Demo; hideable | |
| 8 | `/mobility` | `views/MobilityView.tsx` (also re-exported by `src/views/MobilityView.tsx`) | Auth or Demo; hideable | Vehicle (FordPass) + bike |
| 9 | `/health` | `views/HealthView.tsx` (also `src/views/HealthView.tsx`) | Auth or Demo; hideable | Has its own in-page demo mode |
| 10 | `/vacuums` | `views/VacuumsView.tsx`, `views/vacuums/*`, `vacuums/*` | Auth or Demo; hideable | |
| 11 | `/automations` | `views/AutomationsView.tsx` | Auth or Demo; hideable | |
| 12 | `/integrations` | `views/IntegrationsView.tsx` | Auth or Demo; hideable | |
| 13 | `/settings` | `SettingsView.tsx` + `settings/SettingsHub.tsx` | Always visible | Hub of 6 sections |
| 13a-f | `/settings` + section | `settings/DeviceVisibilitySection` (`devices_rooms`), `ThemeCustomizationSection`, `UserProfileSection`, `ConnectionWebSocketSection`, `BackupRestoreSection`, `CameraSettingsSection` (`cameras`) | same | Selected via store state |

Global overlays (not routes): `AuthModal` (`auth/`), `NotificationDrawer`, `WeatherOverviewDrawer`, `EntityDetailModal`, `CriticalAlertModal`, `FullScreenLoadingPage` (startup gate), `InstallPrompt`, `UpdateToast`, edit-mode "Done Editing" bar, `DemoBanner`.

## 2. API endpoints (`server.ts`)
All handlers are in `server.ts` (one file). "Client" = the file that calls it.

| Method | Path | Line | Auth | Purpose | Client |
|---|---|---|---|---|---|
| GET | `/api/health` | 200 | none | Status + storage diagnostics (also Docker healthcheck) | none in `src/` |
| GET | `/api/config/stream` | 810 | `requireHAAuth` (query `?token=` allowed) | SSE for config changes | `configSyncService.ts` |
| GET | `/api/config` | 829 | `requireHAAuth` | Read dashboard config | `configStorageService.ts` |
| POST | `/api/config` | 858 | `requireHAAuth` | Write config (503 if storage unwritable, 400 on bad body) | `configStorageService.ts` |
| POST | `/api/assets` | 998 | `requireHAAuth` | Upload data-URL image (503/400 errors) | `configStorageService.ts` |
| GET/HEAD | `/api/assets/*` | 185 | **none** (static, CORS headers) | Serve uploaded assets | `utils/assetUrl.ts` |
| GET/HEAD | `/data/assets/*` | 192 | **none** | Same dir as above (duplicate mount) | none found |
| GET | `/api/statistics/status` (alias `/api/energy/status`) | 1092 | `requireHAAuth` | SQLite status | `haStatisticsStorage.ts` |
| GET | `/api/statistics/entities` (alias `/api/energy/entities`) | 1103 | `requireHAAuth` | Tracked entities | `haStatisticsStorage.ts` |
| GET | `/api/statistics/history` (alias `/api/energy/history`) | 1124 | `requireHAAuth` | History query | `haStatisticsStorage.ts` |
| POST | `/api/statistics/sync` (alias `/api/energy/sync`) | 1177 | `requireHAAuth` | Trigger HA -> SQLite sync | `haStatisticsStorage.ts` |
| GET | `/api/image-proxy` | 1220 | `requireHAAuth` (query `?token=` allowed) | Proxy images (album art) | `useAlbumArtColor.ts` |
| GET | `/api/cameras/status` | 1417 | `requireHAAuth` | go2rtc online check | `CameraSettingsSection.tsx` (no auth header, see flags) |
| POST | `/api/cameras/:cameraId/webrtc` | 1439 | `requireHAAuth` | WHEP/SDP offer to go2rtc (503 in dev, 404 unknown camera) | `cameraStreamManager.ts` |
| ALL | `/api/cameras/:cameraId/hls*` | 1501 | `requireHAAuth` | HLS proxy to go2rtc | `cameraStreamManager.ts` |
| DELETE | `/api/cameras/:cameraId` | 1565 | `requireHAAuth` | Remove camera source + persisted config | `CameraSettingsSection.tsx` |
| GET | `*` (prod only) | 1699 | none | SPA fallback to `index.html` | browser |

Non-app calls (not served here): HA REST/WS (`/api/history/period`, `/api/camera_proxy`, `/api/websocket`, `/auth/...`) go directly from the browser to HA. `/api/image/serve` appears only in a comment in `PersonAvatar.tsx`; it is an HA path.

## 3. Workflows (end to end)
Pages/endpoints use the names above. "HA" = direct browser-to-Home-Assistant traffic.

**Auth & session**
- W1 First load / startup gate: `main.tsx` providers -> `AuthContext` init (OAuth callback check, stored token, refresh) -> `FullScreenLoadingPage` (up to 5.5 s; actions: Demo, Continue, Retry) -> shell. Touches: all pages; HA WS; `GET /api/config`, `GET /api/config/stream`.
- W2 OAuth2 sign-in: `AuthModal` (OAuth tab, HA URL, "Sign In with Home Assistant") -> redirect to HA -> `/?code=...` callback -> tokens stored -> proactive refresh. Also BroadcastChannel `had_oauth_channel` / window message for PWA. Touches: `AuthModal`; HA `/auth`.
- W3 LLAT sign-in: `AuthModal` (LLAT tab, token field, show/hide, "Connect via LLAT") -> `loginLLAT` verifies. Touches: `AuthModal`; HA `/api/`; then `requireHAAuth` pins the HA instance on first success.
- W4 Demo mode: `AuthModal` "Explore Demo Dashboard", `FullScreenLoadingPage`, or Health "enable demo" -> `enterDemoMode`; `DemoBanner` exit. Touches: all pages with mock data.
- W5 Session expiry / re-auth: `connectionStatus === 'auth_failed'` banner -> "Sign In Again" -> `/settings`. Touches: `/settings`, `AuthModal`.
- W6 Sign out: Settings -> User Profile (`logout()`) and Connection section (`logoutHA`, `disconnectFromHA`) -> modal reopens. Touches: `/settings`.
- W7 Navigation: sidebar (collapse, 13 items, "More" menu), URL path/`?tab=`, browser back/forward, hidden-page redirect, theme toggle. Touches: all pages.

**Core dashboard**
- W8 Overview + edit mode: header edit toggle -> drag/resize tiles, widget library, "Reset layout" -> "Done Editing" (`flushPendingSave`). Touches: `/overview`, `/settings`; `POST /api/config`.
- W9 Entity control popup: any tile -> `EntityDetailModal` (toggle, lock, media, climate, cover, history range, diagnostics). Touches: all entity pages; HA WS services, `haHistoryService`.
- W10 Rooms: `/rooms` floor tabs -> area card -> `AreaDetailView` (batch light/switch/fan/cover/lock/media actions, entity popups) -> back. Touches: `/rooms`.
- W11 Security: `/security` alarm modes + PIN pad, bypass, panic (confirm), lock all/single, camera grid (live/preview, snapshot, fullscreen), area filter, search. Touches: `/security`; `POST /api/cameras/:id/webrtc`, `/hls*`.
- W12 Energy analytics: `/energy` period tabs, prev/next, custom range picker, presets, compare year, series toggles, refresh. Touches: `/energy`; `/api/statistics/status|entities|history|sync`.
- W13 Media: `/media` player cards, play/pause, volume, power, Apple TV remote, scrub, detail modal. Touches: `/media`; `GET /api/image-proxy`.
- W14 Vacuums: `/vacuums` start/pause/dock/locate/spot-clean, consumables, image upload/remove. Touches: `/vacuums`; `POST /api/assets`.
- W15 Mobility: `/mobility` lock/unlock, horn, charging, precondition, map zoom, tabs, customize. Touches: `/mobility`; `GET /api/assets/*`.
- W16 Health: `/health` metric tabs, plot mode, refresh, demo. Touches: `/health`.
- W17 System & Network: `/system` sub-tabs, time range, unified/split charts, refresh; `/network` range, search, speed test, reboot modal. Touches: `/system`, `/network`.
- W18 Automations: `/automations` search, run routine, toggle automation, batch on/off. Touches: `/automations`.
- W19 Integrations: `/integrations` search/sort, detail (Overview/Entities/Devices tabs), reload/update, toggle entity. Touches: `/integrations`.
- W20 Notifications & alerts: sidebar/header bell -> `NotificationDrawer` (tabs, search, dismiss, dismiss all, update all, refresh), `CriticalAlertModal` -> go to area, `ToastContainer`. Touches: global.

**Settings & platform**
- W21 Navigation & entity visibility: Settings -> `devices_rooms` (page toggles, show-all, entity visibility/grouping/filters, edit area/floor/label names + icons). Touches: `/settings`; `POST /api/config`.
- W22 Theme: Settings -> `theme_customization` (light/dark/auto, glow/flat, weather backdrop, tile mode, Carto API key, save). Touches: `/settings`.
- W23 Profile & kiosk PIN: Settings -> `user_profile` (set/clear PIN, time range, open auth modal). Touches: `/settings`. PIN consumer is `canvas/PinLockModal` (see flags).
- W24 Connection: Settings -> `connection_websocket` (WS URL, HTTP URL, token, OAuth/LLAT tabs, test latency, logs). Touches: `/settings`; HA.
- W25 Backup/restore/reset: Settings -> `backup_restore` (snapshot create/restore/export/delete, full export, import file, factory reset confirm). Touches: `/settings`; `POST /api/config`.
- W26 Cameras config: Settings -> `cameras` (go2rtc status, add/edit/delete RTSP source, live type). Touches: `/settings`; `GET /api/cameras/status`, `DELETE /api/cameras/:id`, `POST /api/config`.
- W27 Multi-device sync & offline: SSE + BroadcastChannel; "Offline (Cached)" pill; cached snapshot (IndexedDB). Touches: all pages; `/api/config`, `/api/config/stream`, `/api/health`.
- W28 PWA install/update: `InstallPrompt`, `UpdateToast`, service-worker reload. Touches: global.

## 4. Interactive elements per page
Static reading. "->" = what it is supposed to do.

**Global shell (`App.tsx`, `Sidebar.tsx`)**: logo -> overview; 13 nav buttons -> `setActiveTab`; collapse/expand sidebar; "More views and options" menu (mobile); theme toggle; notifications bell; header: Back (rooms/settings sub-view), Edit mode toggle (overview/settings only), Refresh (`refreshStates` + `had_manual_refresh`), "Sign In Again" banner, "Done Editing"; status pill (HA Demo/Live/Connecting/Auth Error/Offline).

**Overview** (`overview/OverviewHeader.tsx` and children): badge bar toggle; batch toggles for lights/switches/fans (with countdown + cancel); window/door drawers; media play/pause/prev/next; camera prev/next/fullscreen; "View all family members"; widget library drawer; "Reset tiles to default order and 1x width"; per-tile open entity details.

**Rooms**: floor selector (`onChange=setSelectedFloorId`); area card -> detail. **Area detail**: toggle all switches/fans, pause all media, lock/unlock, cover open/close, light/climate/sensor/camera tiles -> entity popup, media drawer, "Open Fullscreen Feed".

**Energy**: period tabs; prev/next; calendar -> custom range (start/end date inputs, apply, presets); compare toggle + year; series toggles (solar/home/grid/battery); refresh.

**Security**: alarm Home/Away/Night/Disarm; PIN pad (digits, backspace, clear); bypass toggle; panic button + confirm/cancel; lock all/single; camera card (go live, snapshot download, fullscreen); area filter tabs; search; manual retry.

**Media**: play/pause, prev/next, mute, volume slider, power; Apple TV remote (up/down/left/right/OK/home/Siri/wake); scrub bar; card -> detail modal.

**System**: sub-tabs; time range; unified/separate chart toggles (volume, network, load, IOPS, disk); refresh history.

**Network**: time range; search clients / disconnected devices; unified/split chart; copy public IP; run speed test; reboot router (modal confirm/cancel); expand list.

**Mobility**: tab bar; zoom in/out; lock/unlock; horn+lights; start/pause/resume charging; start/stop preconditioning; sync FordPass; open in OpenStreetMap; customize.

**Health**: metric selector; interval/cumulative plot; refresh; enable demo / exit demo.

**Vacuums**: start, pause, dock, locate, spot clean; map controls; consumables view; image upload/change/remove (file input).

**Automations**: search; run routine; per-item enable toggle; batch on/off; table.

**Integrations**: refresh; search; sort; card -> detail with Overview/Entities/Devices tabs, entity/device filters, entity toggle, reload, update.

**Settings hub**: six category cards -> section. **Sections**: see W21-W26 for controls. Highlights: `DeviceVisibilitySection` (2456 lines: search, grouping flat/domain/device/area, visibility filter, offline-only, multi-select, expand/collapse all, area/floor/label editors with colour + icon picker); Camera section (name, RTSP URL, live type, save/cancel/edit/delete).

**Entity detail modal**: close; per-domain controls (toggle, power, lock, play/pause/stop/shuffle/mute/prev/next, setpoint +/-, cover, vacuum locate, camera zoom, d-pad); time range; diagnostics toggle.

**Notification drawer**: tabs; search + clear; dismiss; dismiss all; dismiss skipped updates; install all updates; refresh; per-item actions.

**AuthModal**: close (only if allowed); OAuth/LLAT tabs; HA URL input; submit buttons; show/hide token; demo button.

## 5. QA chunks (7)
| Chunk | Workflows | Pages / endpoints |
|---|---|---|
| A. Auth & session | W1-W6 | AuthModal, loading page, settings profile/connection; HA auth, `requireHAAuth` |
| B. Shell, navigation & overview | W7, W8, W9, W20, W28 | shell, `/overview`, entity modal, notifications; `/api/config` |
| C. Rooms & security | W10, W11, W26 | `/rooms`, `/security`, camera settings; `/api/cameras/*` |
| D. Energy, system & network | W12, W17, W16 | `/energy`, `/system`, `/network`, `/health`; `/api/statistics/*` |
| E. Media, vacuums, mobility | W13, W14, W15 | `/media`, `/vacuums`, `/mobility`; `/api/image-proxy`, `/api/assets` |
| F. Automations & integrations | W18, W19 | `/automations`, `/integrations` |
| G. Settings, config & sync | W21-W25, W27 | `/settings` sections; `/api/config`, `/api/config/stream`, `/api/assets`, `/api/health` |

Sizes: A 6, B 5, C 3 (large), D 3, E 3, F 2, G 6 workflows. F is small; merge it into E if a 6-chunk plan is preferred.

## 6. Flags (dead, unreachable, duplicated, suspect)
1. **`canvas/TunetCanvasView.tsx` appears unreachable.** No file imports it; `App.tsx` doesn't route to it. It owns `CardCatalogDrawer`, `CanvasHeader`, `PinLockModal`, so the **kiosk PIN set in Settings (W23) may have no live consumer**. Not confirmed by running it. `useCanvasStore` is still used by `SettingsView` for import/export.
2. **`views/OverviewView.tsx`** renders an empty 12-col grid div under `OverviewHeader`: placeholder or leftover.
3. **Duplicate re-exports:** `src/views/HealthView.tsx`, `src/views/MobilityView.tsx` (not imported by `App.tsx`); `components/views/EnergyView.tsx` -> `EnergyDashboardView.tsx`.
4. **Duplicate server aliases:** `/api/energy/*` vs `/api/statistics/*`; `/data/assets` vs `/api/assets` static mounts (no client use of `/data/assets` found).
5. **Likely bug:** `CameraSettingsSection.tsx:61` calls `GET /api/cameras/status` with no `Authorization` header, but the route requires `requireHAAuth`. Expect 401 -> go2rtc shown offline. Not run.
6. **`SETTINGS_SECTIONS_META` in `App.tsx` has no `cameras` key**, so the Cameras section header likely falls back to the generic Settings title/subtitle.
7. `/api/health` has no in-app caller (used by Docker healthcheck only).
8. `userName` falls back to the hard-coded `'Samer'` (`App.tsx:469`).
9. **Possibly unused files** (partial heuristic, files not matched by an import path; verify before deleting): `ui/scroll-progress.tsx`, `ui/DotSlider.tsx`, `ui/battery-card.tsx`, `vacuums/VacuumMapView.tsx`, `alerts/AlertDrawer.tsx`, `mobility/MobilityTabBar.tsx`, `mobility/VehicleClimateCard.tsx`, `mobility/BikeCompanionCard.tsx`, plus several `charts/*` (projection-line, ring-chart, bar-squares, live-line-chart, composed-chart, etc.). `App.tsx` appeared only because `main.tsx` imports `./App.tsx`. The scan stopped before covering all files.
10. `scratch/` and `had-homeassistantdashboard/` (Umbrel packaging) are non-app directories.

## 7. Counts
- **Pages:** 13 top-level routes/tabs + 1 room-detail sub-view + 6 settings sections = **20** page-level views (13 URL-addressable).
- **API endpoints:** **17** handlers/mounts in `server.ts` (21 URL paths counting the 4 `/api/energy/*` aliases). 13 require `requireHAAuth`; 4 are unauthenticated (`/api/health`, 2 static asset mounts, SPA fallback).
- **Workflows:** **28** (W1-W28) in **7** QA chunks.
