# New findings (noticed while implementing audit/plan.md)

Items found during remediation that are outside the work packages. Not fixed.

| ID | Severity | Finding | Where |
|---|---|---|---|
| NEW-001 | Low | The kiosk PIN is still verified in the browser by comparing against a plaintext copy in `localStorage` (`PIN_STORAGE_KEY`). The server now stores only a hash and never returns it (SEC-006), but the lock itself offers no protection against someone with devtools access. A real fix needs server-side verification (`POST /api/pin/verify`) and a decision on whether the canvas view (flagged unreachable in the inventory) is kept. | `src/store/useCanvasStore.ts:422-433` |
| NEW-002 | Low | The client still sends `X-HA-URL` on every API call. The server no longer uses it once a trusted instance exists (SEC-001), so it is dead weight and leaks the HA address to any proxy in front of HAD. Remove after the TOFU opt-in is retired. | `src/services/configStorageService.ts:46-65` |
| NEW-003 | Low | `/api/cameras/:id/webrtc` and the HLS proxy return go2rtc response bodies and `err.message` to the caller (part of SEC-014, listed in plan package P2-6). | `server.ts` webrtc/hls handlers |
| NEW-004 | Info | Node's `fetch` refuses port 9 as a "bad port". The Playwright config pins `HASS_URL=http://127.0.0.1:9`, which logs `bad port` for non-mock tokens. Harmless, but use a different unused port if those logs get noisy. | `playwright.config.ts` |
| NEW-005 | Low | `npm audit fix` bumped transitive packages; `package.json` ranges were not changed. Re-run `npm run build` and the full suites after dependency updates in CI (already in the workflow). | `package-lock.json` |
| NEW-006 | Medium | The 25 icon-only buttons now have names, but the UI-003 audit counted 36; the remaining ones contain expression children that the scan treats as text. Re-check with an axe run. | `src/components` |
| NEW-007 | Low | SettingsHub desktop and mobile layouts are duplicated markup, which is how the titles drifted. Drive both from one list. | `src/components/settings/SettingsHub.tsx` |
| NEW-008 | Low | The admin check opens a Home Assistant WebSocket per token every 60 s. If HA is unreachable, admin actions are denied (403) rather than allowed; consider a clearer UI message. | `server.ts` (`isHaAdmin`) |
| NEW-009 | Info | The 11 px floor (UI-007) changed ~926 class names; layouts were only checked by the overflow smoke tests at 375 and 1440 px. A visual pass is advisable. | `src/**` |
| NEW-010 | Low | Unlock (swipe slider) and Arm-Away (delay choices) confirmations are not ConfirmDialog consumers because their interaction differs; consider a ConfirmDialog `body` slot if more variants appear. | `src/components/mobility/UnlockConfirmModal.tsx`, `src/components/overview/modals/ArmAwayConfirmModal.tsx` |
| NEW-011 | Info | `package.json` gained `jsdom`, `@testing-library/react` and `@testing-library/user-event` as dev dependencies for tests/dom. | `package.json` |
