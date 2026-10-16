# CLAUDE.md

HAD / HOMZ: a Home Assistant (HA) dashboard. A React SPA plus a single Express server that serves the SPA, persists config, proxies cameras/images and stores energy statistics.

## Stack (versions from package.json ranges)
- Runtime: Node 22 (Dockerfile uses `node:22-alpine`; server uses built-in `node:sqlite`, so Node 22+ is required). ESM (`"type": "module"`).
- Frontend: React ^19.0.1, Vite ^6.2.3, TypeScript ~5.8.2, Tailwind CSS ^4.1.14 (`@tailwindcss/vite`), vite-plugin-pwa ^1.3.0.
- State: zustand ^5.0.15 plus React contexts. Layout: react-grid-layout ^2.2.4, @dnd-kit.
- UI/Viz: @base-ui/react, react-aria-components, motion ^12, recharts ^3, @visx/* (4.0.1-alpha), d3-sankey, leaflet/react-leaflet 5, hls.js, Phosphor/lucide/untitledui icons.
- Server: Express ^4.21, undici ^8 (HA calls), dotenv, run in dev with tsx ^4.21.
- Tests: vitest ~3.2.4 (node env). Bundler for server: esbuild ^0.25.
- External runtime deps: Home Assistant instance, optional go2rtc (cameras).

## Commands
Verified in this repo: `npm run lint` (tsc --noEmit, passes) and `npm test` (6 files, 32 tests, pass).
Not run while writing this file: the others below (taken from package.json / Dockerfile).
```
npm install
npm run dev               # tsx server.ts: Express + Vite middleware, default port 3000
npm run lint              # type-check only (there is no ESLint)
npm test                  # vitest run, tests/**/*.test.ts
npm run test:watch
npm run test:integration  # scripts/test-*.ts run sequentially via tsx (some bind fixed ports)
npm run build             # vite build -> compress-dist -> esbuild server.ts -> dist/server.cjs
npm start                 # node dist/server.cjs (needs build first)
npm run check:bundle      # bundle size guard (scripts/check-bundle-size.cjs)
npm run pwa:assets        # regenerate icons via sharp
docker compose up -d      # image ghcr.io/samerberjawi/had-homeassistantdashboard + go2rtc
```
- There is NO seed script. State is created on first run under `data/` (gitignored). `src/data/mockRegistries.ts` holds mock registries for the UI.
- Env (`.env.example` only lists `PORT`). Others read in server.ts: `HASS_URL`/`HA_URL`/`HOME_ASSISTANT_URL`/`HOMEASSISTANT_URL`, `DATA_DIR`, `DASHBOARD_CONFIG_DIR`, `DASHBOARD_ASSETS_DIR`, `GO2RTC_URL`, `CORS_ALLOWED_ORIGINS`/`ALLOWED_ORIGIN`, `ALLOW_MOCK_TOKENS`, `NODE_ENV`.
- Dev auth shortcut: outside production, tokens starting with `test_` or `mock_` are accepted without HA (also if `ALLOW_MOCK_TOKENS=true`; never set in prod).

## Directory structure
- `server.ts`: the whole backend (about 1760 lines): middleware, auth, config API, assets upload, statistics API, image proxy, go2rtc/WebRTC camera routes, SSE, static serving, graceful shutdown.
- `server/services/`: `energyDbService.ts` (SQLite via `node:sqlite`), `energySyncService.ts` (pulls HA statistics into SQLite).
- `src/main.tsx`, `src/App.tsx`: entry, providers, view routing.
- `src/components/`: UI by domain (`camera`, `energy`, `rooms`, `vacuums`, `mobility`, `weather`, `tiles`, `modals`, `settings`, `canvas`, `auth`, `pwa`, `ui` primitives, etc.).
- `src/views/`: `HealthView`, `MobilityView`. Other pages live under `src/components/views/`.
- `src/contexts/`: `AuthContext`, `ConfigContext`, `EditModeContext`, `EntityPopupContext`.
- `src/store/`: zustand stores (`useAlertStore`, `useAutoLayoutStore`, `useCanvasStore`).
- `src/hooks/`: data hooks (`useEnergyData`, `useRoomsData`, `useMobilityData`, `useSystemMetrics`, ...).
- `src/services/`: HA clients (`haAuth`, `haWebSocket`, `haHistoryService`, `ha*Statistics`), config persistence (`configStorageService`, `configSyncService`), and per-domain `*Classification.ts` entity classifiers.
- `src/lib`, `src/utils`, `src/types`, `src/config/pageThemes.ts`: helpers, types, themes.
- `tests/`: vitest unit tests (`tests/helpers`). `scripts/`: build helpers and `test-*.ts` integration suites.
- `data/` (runtime, gitignored): `config/dashboard-config.json` (+ `.bak`, `backups/`), `assets/`, `energy/energy_history.sqlite`, `config/ha-instance.json` (pinned HA URL).
- `dist/`: build output. `public/`: PWA icons/manifest. `had-homeassistantdashboard/`: Umbrel app packaging. `.agents/rules/design_system.md`: UI design rules. `scratch/`: ad-hoc experiments (gitignored test dirs).

## Architecture
- Data flow: browser logs in with an HA token and talks to HA directly over WebSocket (`src/services/haWebSocket.ts`) for live entities, services and history. Dashboard layout/config is saved via `POST /api/config` and fanned out to other screens by SSE (`/api/config/stream`) plus `BroadcastChannel`. Energy/statistics history is synced by the server into SQLite and read via `/api/statistics/*` (`/api/energy/*` are aliases).
- Auth: no own user store. API routes use `requireHAAuth` (server.ts): `Authorization: Bearer <HA token>` is validated by calling `<HA>/api/` and cached briefly. Query `?token=` is accepted only for `/api/config/stream` and `/api/image-proxy`, then stripped from the URL. The validating HA instance is fixed by env var, or pinned on first successful sign-in (trust on first use) in `ha-instance.json`. Client does not choose it afterwards. Tokens persist client-side via `src/services/authStorage.ts` (legacy keys are migrated).
- External services: Home Assistant (REST and WebSocket), go2rtc (`GO2RTC_URL`, default compose `http://go2rtc:1984`) for WebRTC/HLS, OpenFreeMap vector basemaps (Liberty/Dark via MapLibre GL in Leaflet).
- Config writes are atomic (temp file then rename) with `.bak` and `backups/`. Body limit is 15 MB.
- Deploy: GitHub Action `.github/workflows/docker-publish.yml` publishes the image. The Dockerfile copies prebuilt `node_modules` and `dist` (build outside the image first). Container runs as non-root and `/api/health` is its healthcheck.

## Conventions
- Naming: components PascalCase `.tsx`; hooks `useX.ts`; services camelCase `.ts`; domain classifiers `<domain>Classification.ts`. Some kebab-case files in `components/ui` and `charts` come from vendored/shadcn-style sources (`components.json`).
- Imports use the `@` alias for `src/` (set in vite.config.ts and vitest.config.ts).
- State: zustand for cross-view/canvas/alert state; contexts for auth, config, edit mode, entity popup; hooks wrap data fetching per domain.
- Styling: Tailwind utility classes only (`cn()` from `src/lib/utils.ts`, `class-variance-authority`). Follow `.agents/rules/design_system.md`: frosted glass surfaces (`bg-white/65` or `bg-black/20`, `backdrop-blur-md`), no opaque card backgrounds, 4-row metric tiles, frameless charts, dark and light variants for every surface.
- Errors: React `RootErrorBoundary` at the root. Server logs with bracketed prefixes (`[Auth]`, ...) and degrades (for example, memory-only pin if the write fails). Services catch and fall back rather than throw to the UI.
- Tests: unit tests in `tests/*.test.ts` named after the module. Integration scripts in `scripts/test-*.ts`.

## Fragile, legacy, out of scope
- `server.ts` is a monolith. Edit narrowly and re-run `npm run lint && npm test`. Auth and token-handling code is security-sensitive (see `scripts/test-token-security.ts`).
- Legacy token/URL localStorage keys in `authStorage.ts` and the `/api/energy/*` aliases exist for backwards compatibility. Do not remove.
- `node:sqlite` is used. It needs Node 22+ and may log an experimental warning.
- `@visx/*` packages are alpha (4.0.1-alpha); pin carefully when upgrading. `cn` (npm) is also listed but the local `cn()` is from `src/lib/utils.ts`.
- Camera/WebRTC code depends on go2rtc and has dedicated tests/scripts. Change it with care (`cameraStreamManager`, `scripts/test-camera-pipeline.ts`).
- Do not hand-edit or commit: `dist/`, `data/`, `node_modules/`, `.env*`, `scratch/` outputs.
- `npm test` prints a stack trace in the haWebSocket/camera tests yet passes (expected error-path logging).
- `Dockerfile` does not build the app. Run `npm ci --omit=dev` plus `npm run build` before `docker build`, or use the published image.
- Not verified here: `npm run dev`, `build`, `start`, `test:integration`, Docker.
