# QA results

Run: 2026-10-15. Playwright 1.56.1, Chromium, dev server (`tsx server.ts`, port 3100, scratch `DATA_DIR`), **demo mode + dev mock token** (`test_*`). No real Home Assistant, no go2rtc.
Specs: `tests/e2e/<chunk>/`. Config: `playwright.config.ts` (projects `desktop` 1440x900, `mobile` 375x812). Run: `npx playwright test`.
Each row is one spec, run at both widths unless noted. Result = Pass only if it passed at both widths.

## Scope and limits (read first)
- All UI flows ran against **demo/mock data**. Anything that needs live HA (OAuth round trip, real LLAT success, real entity services, real statistics sync, go2rtc streams, session expiry, SSE multi-device sync) was **not exercised**; those are listed as Blocked or not covered.
- Most UI specs are **smoke-level**: the action can be performed, no uncaught page error, no horizontal overflow. They do not assert resulting device state (demo data is local).
- Not covered at all: OAuth callback (`/?code=`), W5 session-expiry banner, W27 SSE/BroadcastChannel sync, W28 PWA install/update toast, camera live/HLS, map interactions, drag/resize in edit mode, drag-guard.

## Totals (spec x viewport runs)
180 runs: **174 pass, 4 fail, 2 blocked (skipped)**. Distinct bugs: 2.

| Chunk | Pass | Fail | Blocked |
|---|---|---|---|
| A. Auth & session | 30 | 2 | 0 |
| B. Shell, nav, overview | 48 | 2 | 0 |
| C. Rooms & security | 22 | 0 | 0 |
| D. Energy, system, network | 22 | 0 | 0 |
| E. Media, vacuums, mobility | 14 | 0 | 0 |
| F. Automations & integrations | 10 | 0 | 0 |
| G. Settings, config & sync | 28 | 0 | 2 |

## A. Auth & session
| Item | Result |
|---|---|
| W1 gate shows OAuth/LLAT tabs and demo button | Pass |
| W1 gate not dismissible (Escape, backdrop) | Pass |
| W1 no horizontal overflow on gate | Pass |
| W2 URL field prefilled with default HA URL | Pass |
| W2 OAuth with malformed URL is rejected with message | **Fail** (QA-A-001) |
| W2 OAuth round trip / callback | Blocked (needs HA) |
| W3 LLAT token masked | Pass |
| W3 LLAT empty token does not authenticate | Pass |
| W3 LLAT bad token + unreachable HA stays gated | Pass |
| W3 LLAT success + instance pinning | Blocked (needs HA) |
| W4 demo mode enters dashboard, no page errors | Pass |
| W4 demo survives refresh | Pass |
| W4 double-click demo button | Pass |
| W5 session expiry / "Sign In Again" | Blocked (needs HA) |
| W6 demo: Switch User and Connect Live HA present | Pass |
| W6 Connect Live HA reopens gate | Pass |
| W6 real sign out / disconnect | Blocked (needs HA) |
| API: protected routes 401 without/with bad token | Pass |
| API: mock token accepted; `?token=` rejected on `/api/config` | Pass |
| API: `/api/health` public | Pass |

### QA-A-001 Malformed HA URL sends the browser to an error page
- Severity: Medium
- Steps: open `/`, leave OAuth tab, set the HA URL to `not a url`, click "Sign In with Home Assistant".
- Expected: stay in the app and show a validation message.
- Actual: the page navigates to `chrome-error://chromewebdata/`; no message; the user loses the app until reload.
- Suspected cause: `src/components/auth/AuthModal.tsx:81-86` (`handleOAuthSubmit` has no URL validation; compare `llatError` handling at `:93-104`) and `src/services/haAuth.ts:94-108` (`startHAOAuthFlow` builds and navigates to the URL unchecked; `normalizeHAUrl` accepts any string). Also `src/contexts/AuthContext.tsx:427-432` sets `isLoading` without an error path.

## B. Shell, navigation & overview
| Item | Result |
|---|---|
| W7 all 13 routes render, no page errors, no overflow (13 specs) | Pass |
| W7 `?tab=` selects page | Pass |
| W7 unknown path falls back, no crash | Pass |
| W7 nav button + browser back | Pass (mobile via "More" menu) |
| W7 refresh on deep page keeps page | Pass |
| W7 theme toggle flips `dark` class | Pass |
| W8 batch badges present | Pass |
| W8 edit mode toggle / Done Editing | Pass |
| W8 drag/resize, widget library, reset layout | Not covered |
| W9 entity tile opens modal, Escape closes | Pass |
| W9 modal exposes `role="dialog"` | **Fail** (QA-B-001) |
| W20 notification drawer opens | Pass |
| W28 manifest served | Pass (accepts 200 or 404, weak) |
| API: POST `/api/config` rejects array/string, 401 without token | Pass |

### QA-B-001 Entity detail modal is not exposed as a dialog
- Severity: Low (accessibility)
- Steps: demo mode, `/rooms`, click any "Open Entity Details".
- Expected: modal container has `role="dialog"` and `aria-modal="true"` (screen readers announce it; focus trap).
- Actual: no `[role="dialog"]` in the DOM; the modal is plain `div.fixed.inset-0`. Escape does close it.
- Suspected cause: `src/components/modals/EntityDetailModal.tsx:304` (and overlay at `:312`).

## C. Rooms & security
| Item | Result |
|---|---|
| W10 floor tabs | Pass |
| W10 area card opens detail, no overflow | Pass |
| W10 light toggle double-click | Pass |
| W11 alarm mode buttons present | Pass |
| W11 PIN pad digits/Clear | Pass |
| W11 panic needs confirm/cancel | Pass |
| W11 search no-match then category tabs | Pass |
| W11 5000-char search, no overflow | Pass |
| W26 camera section loads | Pass |
| W26 go2rtc status banner shows (Standby) | Pass |
| W26 add/edit/delete RTSP source | Not covered |
| W11 camera live/snapshot/fullscreen | Blocked (needs go2rtc) |
| API: `/api/cameras/*` auth, unknown camera | Pass |

## D. Energy, system, network, health
| Item | Result |
|---|---|
| W12 period tabs | Pass |
| W12 prev/next + double click | Pass |
| W12 series toggles + YoY compare | Pass |
| W12 custom range opens | Pass (range apply not covered) |
| W12 refresh | Pass |
| W17 system sub-tabs, ranges, refresh | Pass |
| W17 network ranges, search, reboot confirm/cancel | Pass |
| W17 AdGuard tab | Pass |
| W16 health demo preview | Pass |
| API: statistics auth, missing params 400, aliases | Pass |
| API: garbage timestamps do not 5xx | Pass |
| W12 real sync/history data | Blocked (needs HA) |

## E. Media, vacuums, mobility
| Item | Result |
|---|---|
| W13 floor filter + transport controls | Pass |
| W13 power toggle double click | Pass |
| W14 tabs, modes, commands | Pass |
| W14 non-image file upload handled | Pass (page-error check only) |
| W15 zoom, vehicle tabs, preconditioning | Pass |
| API: image-proxy auth, missing url, file://, link-local IP rejected | Pass |
| API: assets 401/400/SVG rejected/PNG accepted | Pass |
| W13 scrub, Apple TV remote, detail modal | Not covered |

## F. Automations & integrations
| Item | Result |
|---|---|
| W18 tabs, filters, 3000-char search | Pass |
| W18 run routine, pause/enable all | Pass |
| W19 filters, search, sort | Pass |
| W19 inspect detail + tabs | Pass |
| W19 refresh | Pass |
| W19 reload/update actions | Not covered |

## G. Settings, config & sync
| Item | Result |
|---|---|
| W21-W26 five section pages open, no errors, no overflow (5 specs) | Pass |
| W21 devices search no-match / 4000 chars | **Blocked**: no input visible in the section after 4 s (skipped; needs investigation, may be a test-authoring gap) |
| W22 theme save | Pass (weak) |
| W23 PIN and Save Profile controls | Pass |
| W25 factory reset needs confirm, Cancel works | Pass |
| W25 invalid JSON import handled | Pass (page-error check only) |
| W27 app renders when offline | Pass |
| API: config validation, 16 MB body rejected | Pass |
| API: `/api/config/stream` 401 | Pass |
| API: `/api/health` | Pass |
| API: assets path traversal does not serve files | Pass (dev SPA fallback returns index.html, so this is weak; re-check against prod build) |
| W24 connection test/latency | Blocked (needs HA) |

## In the app but missing from the inventory
- Desktop and mobile settings hub use **different card titles** ("Navigation & Entity Visibility", "Connection & Home Assistant", "Backup & Restore", "Cameras & RTSP Feeds" vs "Devices & Entity Visibility", "Home Assistant WebSocket", "Backup, Snapshots & Reset", "Cameras & Video Streams"). Inventory lists one name per section.
- Demo-mode controls: header **"Connect Live HA"** and **"Switch User"** in the profile section (inventory W6 describes `logout()` and `DemoBanner` exit; neither was found in demo).
- Settings profile card (name/role "Home Owner (Admin)") is a top-level hub entry on mobile.
- Security: "Lock All (N)" and per-lock "Unlock" buttons; category tabs All/Alarm/Locks/Openings/Motion/Hazards.
- Camera settings: Home Assistant camera entity dropdown plus Display Name/RTSP URL form; go2rtc state label "Standby".
- Health: "Scan for Sensors" button alongside demo preview.
- Integrations: "Updates" tab opens a full-screen drawer overlay (blocks other controls until closed).
- Backup section: "Download Backup (.json)", "Create", "Reset" -> "Confirm Reset"/"Cancel".
- Observation: demo mode shows the hard-coded user "Samer Berjawi" (inventory flag 8).

## Test notes
- Dev mock tokens only work outside production; run these API specs against `npm run dev`, not the prod bundle.
- Specs share one scratch data dir; `POST /api/assets` and `POST /api/config` write there. Set `QA_DATA_DIR` to change it.
- `@playwright/test` was added as a devDependency and `playwright.config.ts` created (no application code changed).
