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

## Not measured (do this next if performance matters)
- Re-render rate under a live entity stream (hundreds of `state_changed` events per minute). Demo mode has none. Profile against a real or replayed HA with `scripts/profile-renders.mjs`, then look at `ConfigContext` (its value changes whenever `lastSuccessfulSync` changes), `App.tsx` state and the zustand selectors.
- Memory growth over hours (kiosk use), config size above a few MB.
