# Performance notes

Measured 2026-11-11 in demo mode (no live Home Assistant entity stream), Chromium via Playwright.
Re-run with `scripts/profile-renders.mjs` (render counts, dev server) and the timing approach below.

## Results (production build, `npm run build && node dist/server.cjs`)
| Interaction | 1x CPU | 4x CPU throttle (tablet-like) |
|---|---|---|
| Toggle Overview edit mode (to 2 painted frames) | about 22 ms | about 50 ms |
| Load `/rooms` | no long tasks | no long tasks |

Dev server numbers are 3 to 5x worse (65 ms and 170-280 ms, plus a 1.3 s long task on first `/rooms` load from on-demand module transforms). Do not use them as budgets.

## Render counts (dev server, demo mode)
- Idle on Overview for 10 s: 1 commit. Nothing re-renders on a timer.
- Toggling edit mode: 3 commits, about 1800 component renders, over 40% of them Phosphor `IconBase`. Every tile re-renders because `OverviewHeader` passes fresh inline closures and the whole `s` state object to each `OverviewSortableTile`/`OverviewTileContent`.

## Conclusion
No hotspot worth fixing today: the worst measured interaction is 50 ms on a 4x-throttled CPU in production. Memoizing the tiles would need the `onMove*`/`onToggle*` callbacks and `s` to become stable (per-tile props), which is a sizeable change to `useOverviewHeaderState` (1347 lines). Do that only if a measurement on a real wall tablet shows jank.

## Under a simulated entity stream (2026-11-12, dev server, demo mode)
`scripts/profile-stream.mjs` replays `state_changed` events for existing demo sensors through the same callback the HA WebSocket uses (`RATE` events/s for `SECONDS`). At 10 events/s for 10 s:

| Page | Before (commits / renders) | After 250 ms batching |
|---|---|---|
| Overview `/` | 199 / 69,455 | 80 / 27,924 |
| Energy | 300 / 152,908 | 120 / 61,168 |
| Rooms | 200 / 39,918 | 80 / 15,930 |
| Mobility | 351 / 79,176 | 142 / 32,010 |

Finding: every event produced about two store commits (the state write, then the debounced graph recompute) and each commit re-rendered 200 to 1500 components, because the pages subscribe to the whole `states` map. Fix applied: `src/store/autoLayout/stateBatcher.ts` (leading + trailing throttle, 250 ms, last write wins per entity) so a burst becomes one store update per window while an isolated event still applies immediately. Roughly 60% fewer commits and renders.

Still open: renders per commit are high because components select the whole `states` map (per-entity selectors would cut this further but touch many components). Absolute timings were not measured in production; dev counts are for relative comparison only.

## Not measured (do this next if performance matters)
- Re-render cost against a real HA with hundreds of entities (the demo has 210 sensors).
- Memory growth over hours (kiosk use), config size above a few MB.
