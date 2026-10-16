# Performance Findings

Scope: performance only. No application code was modified. Builds and benchmarks ran in a scratch dir outside the repo (the repo's `dist/` and `data/` were not touched).

## Measurements

**Bundle** (`npx vite build`, then `scripts/compress-dist.cjs` and `scripts/check-bundle-size.cjs`):

| Item | Result | Budget |
|---|---|---|
| Entry JS (`index-*.js`) | 1,127,937 B raw / 229–235 KB br | 280 KB br |
| Entry CSS (render-blocking) | 500,970 B raw / 38–39 KB br | 45 KB br |
| Largest lazy chunk (`hls`) | 595 KB raw / 148.5 KB br | 200 KB br |
| SW precache (113 files) | 1775.9 KB br | 2048 KB (87% used) |
| Whole build (1492 files) | 9.66 MB raw / 2.45 MB br | – |
| Lazy Phosphor icon chunks | 1414 files, 6.8 MB raw, not precached | – |

**Database** (app's own `energyDbService`, 100 statistics × 8,760 hourly rows = 876,000 rows, 147 MB, synthetic data, laptop SSD):

| Operation | Time |
|---|---|
| Insert via `upsertStatisticsBatch` | 5.8 s total |
| `queryStatistics`, 20 ids × 30 d (14,400 rows) | 11.3 ms, 1.48 MB JSON |
| `queryStatistics`, 100 ids × 28 d (67,200 rows) | 53.6 ms + 16.2 ms `JSON.stringify`, 6.6 MB JSON |
| `queryStatistics`, 100 ids × 365 d (876,000 rows, direct call) | 746.7 ms (synchronous) |
| `getEnergyDbStatus` (`/api/statistics/status`) | 107.5 ms |
| `getStoredEntities` (`/api/statistics/entities`) | 70.6 ms |
| `checkCoverage` | 0.5 ms |

Method caveats: a vite-only build with no `.br` files makes the precache check fail at 5850 KB. That is a measurement artifact, not a real failure, and I did not report it. Sourcemap contributor sizes are unminified source characters, not shipped bytes.

## Summary

| ID | Title | Severity | Effort |
|---|---|---|---|
| PERF-001 | Bundle budget under-counts startup JS | Medium | S |
| PERF-002 | `vendor-react` manual chunk is empty; react-dom sits in the entry | Medium | S |
| PERF-003 | Overview and services are eagerly bundled into a 1.1 MB entry chunk | Low | M |
| PERF-004 | `/api/statistics/status` and `/entities` scan the whole table on every call | Medium | S |
| PERF-005 | History query is synchronous and over-fetches | Low | M |
| PERF-006 | `idx_energy_range` is unused and adds write cost | Low | S |
| PERF-007 | `GET /api/config` reads and parses the file on every request | Low | S |
| PERF-008 | Every config save makes two copies, a readdir and an fsync | Low | S |
| PERF-009 | HLS and image proxies buffer whole bodies in memory | Low | M |
| PERF-010 | Only 7 of 57 `<img>` tags use lazy loading; none use async decoding | Low | S |
| PERF-011 | 1.2 MB of unreferenced JPGs shipped in `public/` | Low | S |
| PERF-012 | Service worker precache is at 87% of its budget | Low | S |

---

### PERF-001 Bundle budget under-counts startup JS
- Severity: Medium
- Location: `scripts/check-bundle-size.cjs`; CI at `.github/workflows/docker-publish.yml:40`
- Evidence: The script reports "main JS" as the entry chunk only (229 KB br of 280 KB). The entry statically imports four vendor chunks that are not counted:

  | Chunk | Raw | Brotli |
  |---|---|---|
  | `vendor-dnd` | 51.9 KB | 15.6 KB |
  | `vendor-motion` | 104.5 KB | 31.5 KB |
  | `vendor-visx` | 84.4 KB | 25.3 KB |
  | `vendor-zustand` | 9.2 KB | 3.2 KB |

  Real startup JS is about 311 KB br plus 39 KB CSS. That is already above the 280 KB budget the check claims to enforce.
- Impact: The budget gives false headroom, so startup regressions pass CI. First load is slow on a NAS or mobile connection.
- Suggested fix: Walk the entry's static import graph (from the manifest or the `modulepreload` links) and sum those chunks against the budget.
- Effort: S

### PERF-002 `vendor-react` manual chunk is empty; react-dom sits in the entry
- Severity: Medium
- Location: `vite.config.ts:164` (`'vendor-react': ['react','react-dom']`)
- Evidence: The built `vendor-react-*.js` is 51 bytes. The sourcemap shows react-dom (about 537K source chars) inside the entry chunk.
- Impact: Each deploy changes the 1.1 MB entry hash, so returning users re-download React as well. Vendor code cannot be cached separately.
- Suggested fix: Fix the chunk split so react and react-dom land in the vendor chunk, for example by matching on `node_modules/react-dom/` in a function-form `manualChunks`. Then rebuild and confirm the chunk size.
- Effort: S

### PERF-003 Overview and services are eagerly bundled into a 1.1 MB entry chunk
- Severity: Low
- Location: entry chunk (`src/components/overview`, `src/services`, `@phosphor-icons/react`)
- Evidence: Sourcemap contributors to the entry by unminified source chars: react-dom 537K, `src/components/overview` 365K, `src/services` 345K, `@phosphor-icons/react` 339K, framer-motion 123K, tailwind-merge 106K. The Phosphor figure is probably overstated because the barrel file is counted whole.
- Impact: All of this is parsed before the first paint. Most of it is needed on the main view, so the gain from splitting is limited.
- Suggested fix: Check which `src/services` modules are only needed after interaction and lazy-load them. Import Phosphor icons by path, or confirm tree-shaking.
- Effort: M

### PERF-004 `/api/statistics/status` and `/entities` scan the whole table on every call
- Severity: Medium
- Location: `getEnergyDbStatus` and `getStoredEntities` in `server/services/energyDbService.ts`
- Evidence: At 876k rows, `getEnergyDbStatus` takes 107.5 ms (COUNT, COUNT DISTINCT, MIN/MAX and GROUP BY over the full table). `getStoredEntities` takes 70.6 ms (a SCAN of the covering index with GROUP BY and a LEFT JOIN). Both are synchronous in the Node event loop and neither is cached.
- Impact: Cost grows linearly with history. Each call blocks SSE heartbeats and camera proxying for 70–110 ms, and more as data accumulates over years.
- Suggested fix: Cache the results and invalidate on ingest. Or maintain a small summary table updated in `upsertStatisticsBatch`.
- Effort: S

### PERF-005 History query is synchronous and over-fetches
- Severity: Low
- Location: `queryStatistics` in `server/services/energyDbService.ts`; route at `server.ts:1120-1121`
- Evidence: Every row returns 8 fields, with nulls for unused ones (`change/sum/mean/min/max/state`). 100 ids × 28 d gives 6.6 MB of JSON, and `JSON.stringify` alone takes 16.2 ms. The 876k-row direct call blocks the event loop for 746.7 ms. The route caps the query at `MAX_HISTORY_ROWS = 250,000` and `MAX_HISTORY_STATISTIC_IDS = 200`. I did not measure a call at the cap, but it would be bounded by roughly a third of the 746 ms figure, scaling linearly.
- Impact: Large dashboards send multi-MB responses and briefly stall other requests. Typical queries are fast (11 ms for 20 ids × 30 d).
- Suggested fix: Let the client request only the fields it needs, and omit null fields. Consider compression on the route and, if the cap is raised, running the query in a worker thread.
- Effort: M

### PERF-006 `idx_energy_range` is unused and adds write cost
- Severity: Low
- Location: `server/services/energyDbService.ts:110-111`
- Evidence: The only reference to `idx_energy_range` in `*.ts` files is its definition. The history query uses the covering index `idx_energy_query`. Confirmed by grep only; I did not run `EXPLAIN` on every query path.
- Impact: Extra index maintenance on every inserted row (about 5.8 s to insert 876k rows) and extra disk space.
- Suggested fix: Verify with `EXPLAIN QUERY PLAN` and drop the index if no query uses it.
- Effort: S

### PERF-007 `GET /api/config` reads and parses the file on every request
- Severity: Low
- Location: `server.ts:829-838` (`readPersistentConfig`, `server.ts:373`)
- Evidence: The GET handler calls `await readPersistentConfig()`, which reads and parses the file from disk. A cache variable exists but this path does not use it. I did not time it.
- Impact: Disk I/O and JSON parsing on every client load and reconnect. The cost depends on config size, so it is small for typical configs.
- Suggested fix: Serve from the in-memory copy, and invalidate it on write.
- Effort: S

### PERF-008 Every config save makes two copies, a readdir and an fsync
- Severity: Low
- Location: config POST handler in `server.ts` (around lines 900 onward)
- Evidence: Under the write lock, each save does `copyFile` to `.bak`, a timestamped snapshot `copyFile`, a `readdir` of the backups dir (keeps 5) and an `fsync`. All of it blocks the response, and then an SSE broadcast goes out. Not timed.
- Impact: Autosave-style frequent edits pay this on each request, and the write lock serializes concurrent saves. The cost is small on SSD and larger on slow NAS disks.
- Suggested fix: Throttle snapshot creation (for example one per minute), and respond before the cleanup work.
- Effort: S

### PERF-009 HLS and image proxies buffer whole bodies in memory
- Severity: Low
- Location: `server.ts:1501-1562` (HLS), `server.ts:1220-1322` (image proxy)
- Evidence: HLS uses `arrayBuffer()` then `Buffer.from` per segment. The image proxy collects up to 10 MB in a chunk array before replying. `express.json({limit:'15mb'})` is at `server.ts:155`.
- Impact: Each concurrent camera or image request holds its full body in memory and delays the first byte. Memory use grows with the number of viewers.
- Suggested fix: Pipe the upstream body to the response (`Readable.fromWeb(...).pipe(res)`) and enforce the size limit while streaming.
- Effort: M

### PERF-010 Only 7 of 57 `<img>` tags use lazy loading; none use async decoding
- Severity: Low
- Location: `src` (57 `<img>` occurrences; 7 have `loading="lazy"`: `VehicleHeroCard`, `BikeCompanionCard`, `AreaTile`, `AreaDetailView:882`, `IntegrationIcon`, `NotificationRichContent`; 0 have `decoding`)
- Evidence: `grep` counts. The remaining 50 are eager, including entity pictures and camera snapshots.
- Impact: Off-screen images load eagerly on long lists. I did not measure the effect, and `VirtualGrid` may already limit what is mounted.
- Suggested fix: Add `loading="lazy" decoding="async"` to below-the-fold images.
- Effort: S

### PERF-011 1.2 MB of unreferenced JPGs shipped in `public/`
- Severity: Low
- Location: `public/had_icon_bento.jpg` (610,577 B), `public/had_icon_emblem.jpg` (601,573 B)
- Evidence: No references in `src`, `index.html`, `README.md` or `public/manifest.json`. They are copied to `dist/` and the Docker image. They are not precached, since jpg is outside the workbox globs.
- Impact: A bigger image and slower pulls. No runtime effect.
- Suggested fix: Remove them, or move them outside `public/`.
- Effort: S

### PERF-012 Service worker precache is at 87% of its budget
- Severity: Low
- Location: `scripts/check-bundle-size.cjs`; workbox config in `vite.config.ts`
- Evidence: 1775.9 KB br of 2048 KB across 113 files.
- Impact: The first install downloads about 1.8 MB (br) in the background. The next feature or two will trip the CI check.
- Suggested fix: Decide whether all views need precaching, or raise the budget deliberately.
- Effort: S

---

## Checked and found sound
- The history query uses the covering index `idx_energy_query`, and `checkCoverage` is cheap (0.5 ms).
- The history route is bounded (200 ids, 250k rows). The per-id `statement.all` loop is not a cross-table N+1.
- Ingest chunks rows (`INGEST_CHUNK_ROWS`) and yields to the event loop.
- Brotli and gzip precompression, lazy `hls`, lazy icons (1414 chunks, runtime CacheFirst) and lazy demo data.
- `React.lazy` views with idle prefetch, workbox runtime caching, self-hosted fonts, inline critical CSS.
- `App.tsx` uses narrow store selectors (`useShallow`), so HA state events do not re-render the shell.
- Large components have memoization in place: `AreaDetailView` (1,848 lines, 33 `useMemo/useCallback/memo`) and `DeviceVisibilitySection` (2,456 lines, 24).
- Token validation is cached (10 min valid, 30 s invalid, max 500 entries). The image proxy sets `Cache-Control` with `stale-while-revalidate`.
- The iOS splash `<link>`s are not render-blocking. `public/splash/` (3.4 MB) is excluded from precache.

## Unverified
- No Lighthouse or browser profiling was run, so there are no LCP, TBT or INP numbers.
- Runtime re-render behaviour was not profiled. Large component sizes alone are not evidence of a problem.
- The DB benchmark used synthetic data on a laptop SSD, not NAS hardware or a real Home Assistant.
- Config POST and `GET /api/config` timings were not measured on a live server.
- Why `AutomationsView` (248 KB raw) and the shared `dateFormat` chunk (156 KB raw) are large was not investigated.
- Whether `idx_energy_range` is unused was confirmed by grep only.

## Coverage
- Covered: bundle build and budget scripts, chunk composition, DB schema and benchmarks, statistics routes, config routes, proxies, asset inventory, memoization and virtualization spot checks.
- Not covered: Lighthouse and browser profiling, per-component render profiling, a live server load test, hook polling intervals, sequential `await` loops in `src/services`.
