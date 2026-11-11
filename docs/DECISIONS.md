# Decisions

Short records of non-obvious choices. Add new ones at the top. Format: decision, why, how to revisit.

## 2026-11 Production requires HASS_URL; first-run pinning is dev-only
`ALLOW_TOFU_PIN` is ignored when `NODE_ENV=production`. **Why:** on an internet-reachable, reverse-proxied instance, whoever signs in first could pin the server to their own HA. Existing `ha-instance.json` pins keep working. **Revisit:** if Umbrel/first-run setup needs an in-UI URL step, add an explicit admin-confirmed setup flow, not trust on first use.

## 2026-11 Auth rate limit is per client IP; set TRUST_PROXY behind a reverse proxy
Without `TRUST_PROXY`, `req.ip` is the proxy, so all clients share one bucket (30 failures per 60 s). Eviction drops expired then oldest entries (never clears all). Verified end to end by `scripts/test-auth-trust.ts` section 6.

## 2026-11 Tokens stay in localStorage, but only `authStorage.ts` touches the keys
Moving to httpOnly cookies would need a server-side session store and breaks the "HA is the identity provider" model. Instead the strict production CSP (`script-src 'self'`) limits XSS, and `tests/authStorageBoundary.test.ts` stops new code reading `ha_token` directly. Legacy keys stay for migration (do not remove).

## 2026-11 server.ts is a composition root
Routes are `registerXRoutes(app, deps)` modules; stateful services are factories (`createHaAuth`, `createConfigStore`). **Why:** closure state made auth/config untestable and risky for AI edits. **Rule:** a module never reaches into another's internals; pass dependencies in.

## 2026-11 Explicit state lives in pure rule modules, not new state libraries
`authStatus.ts`, `configSyncRules.ts`, `startupPhase.ts` are plain functions with unit tests; React components keep their `useState` and call them. **Why:** smallest safe change, no XState dependency, easy for agents to extend. **Revisit:** if transitions grow side effects, consider a reducer per context.

## 2026-11 File-size guard instead of a lint rule
`tests/fileSizeGuard.test.ts` (new files max 800 lines, baselined files cannot grow). There is no ESLint in this repo and adding one only for this was not worth it.

## 2026-11 No render optimisation yet
Measured production edit-mode toggle at about 22 ms (50 ms at 4x CPU). See `docs/PERFORMANCE.md`. Re-measure with a live HA stream before memoizing tiles.
