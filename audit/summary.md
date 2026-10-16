# Audit summary

Date: 2026-10-15. Home Assistant dashboard (HAD/HOMZ). Sources: security, reliability, performance, UI audits plus an end-to-end QA run (180 test runs, 174 pass). Counts are from the source reports and were not independently re-checked.

## Findings by category and severity (after de-duplication)
| Category | Critical | High | Medium | Low | Total |
|---|---|---|---|---|---|
| Security | 0 | 3 | 5 | 8 | 16 |
| Reliability (incl. QA-A-001) | 0 | 2 | 6 | 4 | 12 |
| Performance | 0 | 0 | 3 | 9 | 12 |
| UI / accessibility (incl. QA-B-001) | 0 | 3 | 8 | 3 | 14 |
| **Total unique** | **0** | **8** | **22** | **24** | **54** |

58 raw findings reduced to 54 after merging: SEC-003+REL-003 (config validation), UI-002+UI-012+QA-B-001 (dialog primitive), REL-005+UI-013 (view states). Two QA bugs were found; QA-B-001 is merged into the UI item, QA-A-001 is counted under reliability. REL-003 is counted under Security (SEC-003).

## Top 10 risks
1. **First client chooses the trusted Home Assistant (SEC-001, High).** On a fresh deploy anyone reaching the port can become the auth authority and then pass any token.
2. **Any user can drive go2rtc's management API (SEC-002, High)** through the HLS proxy: restart, read config, delete streams.
3. **Unvalidated camera source URLs (SEC-003 / REL-003, High)** reach go2rtc (`exec:`, internal hosts). Whether `exec:` runs is unverified.
4. **Go2rtc API exposed on the LAN with no auth (SEC-004)** bypasses all of the above controls.
5. **Edits silently lost on config save conflict or NAS error (REL-001, High).**
6. **Camera deletion can hang and leave inconsistent state (REL-002, High).**
7. **Camera passwords and kiosk PIN returned to every logged-in user (SEC-006).**
8. **Auth bypass via `test_`/`mock_` tokens when `NODE_ENV` is not production (SEC-007)**, including `npm start`.
9. **Accessibility blockers (UI-001/002/003, High):** pinch-zoom disabled, no dialog semantics or focus handling, 36 unnamed icon buttons.
10. **Any HA account can reconfigure the dashboard (SEC-005)**, plus malformed OAuth URL sends the browser to an error page (QA-A-001).

## Plan at a glance
| Phase | Goal | Packages | Rough effort |
|---|---|---|---|
| 1 | Security and data integrity (High items) | P1-1 to P1-6 | 2 M, 2 S + 2 M, ~1 week |
| 2 | High/medium bugs and reliability | P2-1 to P2-9 | ~2 weeks |
| 3 | Performance | P3-1 to P3-4 | ~1 week |
| 4 | UI consistency and accessibility | P4-1 to P4-5 | ~2-3 weeks (two L items) |
| Quick wins | 17 effort-S items spread across phases | see `plan.md` | ~2 days total |

Start with the quick wins and P1-5/P1-6/P1-2 (small, independent, high value).

## Decisions needed
- Keep zero-config trust-on-first-use pinning, or require `HASS_URL`? (breaks some installs)
- Should non-admin HA users be able to change layout?
- Is the kiosk PIN / canvas view dead code?

## Caveats
- QA covered demo mode only; live Home Assistant and go2rtc behaviour is unverified.
- No finding was rated Critical by the source audits; "Phase 1" holds the High-severity security and data-loss items.
- Details, owners-needed conflicts and verification steps are in `audit/plan.md`.
