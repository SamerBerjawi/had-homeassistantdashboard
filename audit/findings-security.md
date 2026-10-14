# Security Findings

Date: 2026-10-14. Scope: security only. No application code was modified.
Method: read `server.ts`, `server/services/*`, `src/contexts/AuthContext.tsx`, `src/services/haAuth.ts`, `authStorage.ts`, `docker-compose.yml`, `package.json`; grepped `src/` for XSS sinks and secrets; ran `npm audit --omit=dev`; ran a PoC harness against the real server (`NODE_ENV=production`, `ALLOW_MOCK_TOKENS=true`, temp data dir, fake go2rtc and fake HA on loopback). The harness lives outside the repo at `.../brain/3bb3a512-.../scratch/sec-poc.mjs`. No real go2rtc or HA instance was used.
"Confirmed" below means seen in code and/or reproduced against the fake services.

## Summary
| ID | Severity | Title |
|---|---|---|
| SEC-001 | High | HA validator is chosen by the first client (trust on first use) |
| SEC-002 | High | HLS proxy forwards any method to any go2rtc `/api/*` path |
| SEC-003 | High | Camera `rtspUrl` is unvalidated and passed to go2rtc as `src` |
| SEC-004 | Medium | go2rtc API is published on the host with no auth in the shipped compose file |
| SEC-005 | Medium | No authorization beyond "any valid HA token" |
| SEC-006 | Medium | Camera credentials returned to every authenticated user |
| SEC-007 | Medium | Mock-token auth bypass keyed on `NODE_ENV` |
| SEC-008 | Medium | OAuth `postMessage` handler has no origin check |
| SEC-009 | Low | CORS reflects any origin by default |
| SEC-010 | Low | Logout does not revoke the HA refresh token; validated tokens cached 10 min |
| SEC-011 | Low | Missing HSTS/Permissions-Policy; permissive CSP `connect-src`/`img-src` |
| SEC-012 | Low | Unsanitized `href={item.releaseUrl}` |
| SEC-013 | Low | Token accepted in query string on two routes |
| SEC-014 | Low | Internal error text returned to clients |
| SEC-015 | Low | No rate limiting; statistics ingest accepts unvalidated data |
| SEC-016 | Low | `npm audit`: 1 critical, 2 high; none confirmed reachable |

---

### SEC-001 HA validator is chosen by the first client (trust on first use)
- Severity: High
- Location: `server.ts:473-515` (pinning), `server.ts:535-581` (`verifyHAToken`), `server.ts:755` (`X-HA-URL` / `?haUrl=`)
- Evidence: With `HASS_URL` unset (the shipped `docker-compose.yml` doesn't set it) and no `ha-instance.json`, the validating HA is whatever the first caller sends in `X-HA-URL`, and it is then persisted. PoC (fake "HA" on 127.0.0.1:19842 that answers 200 to anything):
  ```
  GET /api/config  Authorization: Bearer attacker  X-HA-URL: http://127.0.0.1:19842  -> HTTP 404 "Config not found" (i.e. past auth)
  fakeHA hits: [ 'GET /api/ auth=Bearer attacker' ]
  ha-instance.json: { "haUrl": "http://127.0.0.1:19842", "pinnedAt": "..." }
  GET /api/config  Authorization: Bearer another-random-token (no X-HA-URL) -> HTTP 404 (accepted)
  ```
- Impact: Anyone who can reach the port before the owner signs in on a fresh deploy permanently becomes the authority for "valid token". Every later request with any token passes if the attacker's server says 200. This gives full access to all endpoints, and SEC-002/003 on top. Before pinning, the server also makes a request to a client-chosen URL (blind SSRF, status only).
- Suggested fix: Require `HASS_URL` (refuse to serve authenticated routes until set), or pin only through an admin-only setup step. Drop `X-HA-URL`/`?haUrl=` as an authority input.
- Effort: M

### SEC-002 HLS proxy forwards any method to any go2rtc `/api/*` path
- Severity: High
- Location: `server.ts:1501-1562` (`app.all('/api/cameras/:cameraId/hls*')`, subpath at 1517-1521, `method: req.method` at 1530)
- Evidence: The wildcard after `hls` is appended to `${GO2RTC_URL}/api`, and the HTTP method is passed through. Fake go2rtc log after calling with a valid (mock) token:
  ```
  POST /api/cameras/c1/hls/restart      -> go2rtc saw POST /api/restart?src=c1
  POST /api/cameras/c1/hls/exit         -> go2rtc saw POST /api/exit?src=c1
  GET  /api/cameras/c1/hls/config       -> go2rtc saw GET  /api/config?src=c1
  POST /api/cameras/c1/hls/..%2frestart -> go2rtc saw POST /restart?src=c1    (escapes the /api prefix)
  DELETE /api/cameras/c1/hls/..%2fstreams?name=x -> DELETE /streams?src=c1&name=x
  ```
  Any `/api/<path>` works without traversal; the `..%2f` form also escapes `/api`. Query params other than `src` are forwarded.
- Impact: Any authenticated user can call go2rtc's management API through the dashboard: restart/stop it (DoS), read its config (RTSP credentials, per go2rtc docs: not verified against a real instance), and delete/replace streams.
- Suggested fix: Allow only GET/HEAD, and only `stream.m3u8` plus segment names matching a strict pattern (for example `^/(stream\.m3u8|[A-Za-z0-9_.-]+\.(ts|m4s|mp4|m3u8))$`). Reject `..`, `%`, and `/` in the remainder. Use `res.sendStatus(405)` otherwise.
- Effort: S

### SEC-003 Camera `rtspUrl` is unvalidated and passed to go2rtc as `src`
- Severity: High
- Location: `server.ts:858-993` (`POST /api/config`, `isValidDashboardConfig` at 247-268 checks nothing under `cameras`), `server.ts:1339-1353`, `server.ts:1393`
- Evidence: Config with `rtspUrl: "exec:touch /tmp/pwned #"` was accepted (HTTP 200) and forwarded verbatim:
  ```
  go2rtc saw: PUT /api/streams?name=c1&src=exec%3Atouch%20%2Ftmp%2Fpwned%20%23
  ```
  The UI says only "rtsp://, rtsps://, http://" (`CameraSettingsSection.tsx:321`) but nothing enforces it server-side.
- Impact: Confirmed: arbitrary go2rtc source schemes (`exec:`, `ffmpeg:`, `echo:`, `file`, internal `http://` hosts) are reachable by any authenticated user. Whether `exec:` executes in the user's go2rtc is not verified (depends on go2rtc version/config). At minimum it allows SSRF from the go2rtc host into the LAN.
- Suggested fix: On `POST /api/config` and before `ensureGo2RtcStream`, parse `rtspUrl` with `new URL`, allow only `rtsp:`/`rtsps:`/`http:`/`https:`, and reject others. Consider rejecting private/loopback hosts unless explicitly allowed.
- Effort: S

### SEC-004 go2rtc API is published on the host with no auth in the shipped compose file
- Severity: Medium
- Location: `docker-compose.yml`, service `go2rtc`: `ports: "1984:1984"`, `"8555:8555"`, `"8554:8554"`
- Evidence: Port 1984 (go2rtc HTTP API) is mapped to all host interfaces. The compose file sets no go2rtc credentials (`GO2RTC_CONFIG` points at `/config/go2rtc.yaml`, which isn't in the repo). Not tested against a live container.
- Impact: Anyone on the LAN can reach go2rtc directly and bypass every control in HAD, including SEC-002/003 (stream add, config read). Raises the real-world severity of those findings.
- Suggested fix: Don't publish 1984/8554 (the dashboard reaches go2rtc on the compose network at `http://go2rtc:1984`). Publish 8555 only if WebRTC-direct is needed. If API access is needed, bind to `127.0.0.1:1984` and set go2rtc `api.username/password`.
- Effort: S

### SEC-005 No authorization beyond "any valid HA token"
- Severity: Medium
- Location: `server.ts:726-780` (`requireHAAuth`), applied to all routes; `verifyHAToken` at 535 only checks `GET <HA>/api/` returns 200.
- Evidence: There is no role, owner, or user check anywhere on the server. The client sets `isOwner: true` for everyone (`AuthContext.tsx`). All data is one shared config, so there is no per-user data to cross. Any HA account, including a non-admin or limited guest user, can: `POST /api/config` (change everything, incl. cameras), `POST /api/assets`, `DELETE /api/cameras/:id`, `POST /api/statistics/sync`.
- Impact: A low-privilege HA user (child, guest, a shared wall-tablet token) can reconfigure the dashboard and its camera sources (see SEC-003).
- Suggested fix: Validate the HA user (`/api/websocket` `auth/current_user` or `GET /api/config`-style admin check) and require `is_admin` for config, assets, camera, and sync writes. Keep reads open to any valid user.
- Effort: M

### SEC-006 Camera credentials returned to every authenticated user
- Severity: Medium
- Location: `server.ts:829-857` (`GET /api/config` returns the full config), `server.ts:1417-1435` (`/api/cameras/status` returns go2rtc `streams`)
- Evidence: PoC: `GET /api/config` returned `{"cameras":{"sources":{"c1":{"id":"c1","rtspUrl":"exec:touch /tmp/pwned #"}}}...}`. Users enter `rtsp://user:password@host/...` (placeholder in `CameraSettingsSection.tsx:326`), so those credentials are stored in the config and returned in full. `/api/cameras/status` also relays go2rtc `/api/streams` as-is (fake data in PoC; real go2rtc contents not verified). `cartoApiKey` and a kiosk `pinCode` (`src/types/userConfig.ts:69,191`) are part of the same config.
- Impact: Any valid HA token yields the RTSP credentials of all cameras (and the PIN), not just view access to the streams.
- Suggested fix: Strip credentials from `rtspUrl` in `GET /api/config` and in `/api/cameras/status`; keep them server-side only. Store the kiosk PIN hashed, not in the shared config.
- Effort: M

### SEC-007 Mock-token auth bypass keyed on `NODE_ENV`
- Severity: Medium
- Location: `server.ts:539`; `package.json:9` (`"start": "node dist/server.cjs"`, no `NODE_ENV`)
- Evidence:
  ```ts
  if ((process.env.NODE_ENV !== 'production' || process.env.ALLOW_MOCK_TOKENS === 'true') && (token.startsWith('test_') || token.startsWith('mock_'))) return true;
  ```
  PoC: `Bearer mock_x` was accepted on every route with no HA contact. The Docker image sets `NODE_ENV=production`, but `npm run dev`/`npm start` do not.
- Impact: Anyone running outside Docker without `NODE_ENV=production` (including `npm start`, which then serves via Vite dev middleware) has an auth bypass: `Authorization: Bearer test_x`. A leaked `ALLOW_MOCK_TOKENS=true` does the same in production.
- Suggested fix: Make the bypass opt-in only (`ALLOW_MOCK_TOKENS=true`), never implied by missing `NODE_ENV`; log a loud warning when enabled; set `NODE_ENV=production` in the `start` script.
- Effort: S

### SEC-008 OAuth `postMessage` handler has no origin check
- Severity: Medium
- Location: `src/contexts/AuthContext.tsx:227-250` (`handleWindowMessage`)
- Evidence: The handler accepts any `message` event with `data.type === 'HA_OAUTH_SUCCESS'` and `data.tokens`, and then calls `haWebSocketService.connect(tokens.server_url, tokens.access_token)` and sets authenticated state. It never reads `event.origin`/`event.source`. (The sender at `haAuth.ts:229` does use `window.location.origin` as target.)
- Impact: A page that opens the dashboard (e.g. `w = window.open(dashboardUrl)`) can `postMessage` forged tokens and a hostile `server_url`, which points the UI at an attacker-controlled HA instance (spoofed data, spoofed commands). `X-Frame-Options: SAMEORIGIN` blocks the framing route. Not reproduced in a browser.
- Suggested fix: Add `if (event.origin !== window.location.origin) return;` and check `event.source` is the popup you opened.
- Effort: S

### SEC-009 CORS reflects any origin by default
- Severity: Low
- Location: `server.ts:167-182` (`applyCorsHeaders`), called from stats, image-proxy, camera, and assets routes
- Evidence: Comment at 158-160 says "no permissive CORS headers are sent" by default. Code at 177-181: with no allow-list, it sets `Access-Control-Allow-Origin` to the request origin. PoC: `Origin: https://evil.example` -> `ACAO: https://evil.example`.
- Impact: Limited, since auth is a bearer header (no cookies, no `Allow-Credentials`) and a foreign page can't obtain the token. It does let any website read unauthenticated resources (`/api/assets/*`) from a LAN browser, and weakens defense in depth.
- Suggested fix: When the allow-list is empty, send no CORS headers.
- Effort: S

### SEC-010 Logout does not revoke the HA refresh token; validated tokens are cached for 10 minutes
- Severity: Low
- Location: `src/contexts/AuthContext.tsx:544-560` (`logout`), `server.ts:570-573`
- Evidence: `logout` clears local storage and disconnects the WebSocket. A search for `revoke`/`auth/token` finds no call to HA's token revoke endpoint. The server caches a successful validation for 10 minutes (`expiresAt: Date.now() + 10*60*1000`), plus a 60-second grace if HA is unreachable (`server.ts:611-621`).
- Impact: A stolen refresh token keeps working after the user "logs out"; a revoked HA token keeps working against HAD for up to 10 minutes.
- Suggested fix: POST `{ token: refresh_token, action: 'revoke' }` to `<HA>/auth/token` on logout; shorten the positive cache (e.g. 60 s).
- Effort: S

### SEC-011 Missing HSTS/Permissions-Policy; permissive CSP `connect-src`/`img-src`
- Severity: Low
- Location: `server.ts:69-93`
- Evidence: PoC response headers: `strict-transport-security: null`, `permissions-policy: null`. CSP has `connect-src 'self' ws: wss: https: http:`, `img-src ... https: http:`, `style-src 'unsafe-inline'`. `X-XSS-Protection` is deprecated. `script-src 'self'` and `object-src 'none'` are good.
- Impact: If any XSS is introduced, data can be exfiltrated to any host. Tokens go over plain HTTP on the LAN (server listens on `0.0.0.0` with no TLS), which is normal for this deployment but worth documenting.
- Suggested fix: Narrow `connect-src`/`img-src` to `'self'` plus the configured HA host; add `Permissions-Policy`; set HSTS when served over HTTPS (behind a proxy).
- Effort: S

### SEC-012 Unsanitized `href={item.releaseUrl}`
- Severity: Low
- Location: `src/components/notifications/NotificationChangelog.tsx:256-263`
- Evidence: Other links use `sanitizeSafeUrl()` (`src/lib/utils.ts:18`). This one sets `href={item.releaseUrl}` directly and the `onClick` only calls `stopPropagation()`, so default navigation proceeds. `releaseUrl` comes from HA update-entity data (`types/notifications.ts:43`).
- Impact: A `javascript:` URL from an HA integration would be used as a link target. Production CSP (`script-src 'self'`, no `unsafe-inline`) should block execution, and I didn't test it in a browser.
- Suggested fix: `href={sanitizeSafeUrl(item.releaseUrl)}`.
- Effort: S

### SEC-013 Token accepted in query string on two routes
- Severity: Low
- Location: `server.ts:731-753`; scrub middleware excludes SSE at `server.ts:97`
- Evidence: `/api/config/stream` and `/api/image-proxy` accept `?token=`. The code strips it from `req.url` after reading, but the raw URL has already reached any reverse proxy, CDN, or browser history on the way in.
- Impact: Tokens can land in proxy access logs. The in-app log scrubbing doesn't help there. This is a known EventSource limitation.
- Suggested fix: Use `fetch` + `ReadableStream` for SSE with an `Authorization` header, or issue short-lived single-purpose tokens for these two routes.
- Effort: M

### SEC-014 Internal error text returned to clients
- Severity: Low
- Location: `server.ts:1098, 1109, 1172, 1188` (`err.message` in 500s), `server.ts:1320` (image-proxy 502 includes `err.message`), `server.ts:1481` (go2rtc response body echoed)
- Evidence: e.g. `res.status(500).json({ success: false, error: err.message })`; `'Failed to proxy image: ' + (err?.message || ...)`.
- Impact: SQLite/DNS/network error strings (hostnames, ports, paths) are visible to any authenticated user, which helps internal reconnaissance via the image proxy and go2rtc.
- Suggested fix: Return generic messages and log the detail server-side.
- Effort: S

### SEC-015 No rate limiting; statistics ingest accepts unvalidated data
- Severity: Low
- Location: whole server (no limiter); `server.ts:1177-1190`, `server/services/energySyncService.ts:57-103`; `server.ts:155` (15 MB JSON body)
- Evidence: No rate limiter in `server.ts`. `ingestBatch` only checks that `statistics` is an object; `periodType` is stored as given and values aren't type-checked. Each unique unknown token triggers an outbound request to HA (cached 30 s per token).
- Impact: Authenticated users can poison or bloat the energy history database. Anyone reaching the port can drive outbound requests to the validating HA (amplified by SEC-001 before pinning).
- Suggested fix: Add a per-IP limiter on auth failures; validate `periodType` against the known set and numeric fields; cap rows per request.
- Effort: M

### SEC-016 `npm audit`: 1 critical, 2 high; none confirmed reachable
- Severity: Low (as reachable); Critical/High as reported by audit
- Location: `package.json` (`express ^4.21.2`, `undici ^8.10.1`), lockfile
- Evidence: `npm audit --omit=dev`: `proxy-addr` 1.1.0-2.0.7 critical (IP spoofing via IPv4-mapped IPv6 trust subnet); `source-map-js` high (event-loop DoS, source-map parsing); `undici` 8.0.0-8.10.1 high (11 advisories: WebSocket, RetryHandler, cache/interceptors, BalancedPool, decompression). All say `npm audit fix` is available.
  Reachability, from reading the code:
  - `proxy-addr`: only used for `trust proxy` / `req.ip`. `server.ts` sets no `trust proxy` and never reads `req.ip`/`X-Forwarded-For`. Not reachable.
  - `source-map-js`: PostCSS/Vite build-time. Not in the runtime server.
  - `undici`: server uses only `fetch` and `Agent` (`server.ts:11`); no WebSocket, retry/cache interceptor, or BalancedPool. Not reachable via those paths.
- Impact: No confirmed exploit path today.
- Suggested fix: Run `npm audit fix`, update the lockfile, and add `npm audit --omit=dev --audit-level=high` to CI.
- Effort: S

---

## Checked and found sound (no finding)
- **SQL injection:** all `energyDbService.ts` queries use bound parameters; no string-built SQL.
- **Path traversal on assets:** `express.static` with `dotfiles: 'ignore'`; upload filename built from sanitized key + timestamp + random (`server.ts:1057-1064`). `dist/server.cjs` is explicitly blocked, including via `..`/encoded paths (`1643-1653`).
- **Upload validation:** 5 MB cap, MIME allow-list (no SVG), magic-byte check (`1030-1054`).
- **Image proxy SSRF:** private/loopback/metadata blocked on every redirect hop and at DNS lookup. PoC: `127.0.0.1`, decimal `2130706433`, and `0x7f.1` all returned 403. The HA token is only forwarded to the HA host.
- **XSS:** no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or `new Function` in `src/`, `server/`, or `server.ts`. Other external links go through `sanitizeSafeUrl`.
- **Secrets:** no hardcoded keys or tokens found by pattern grep over `src`, `server`, `scripts`, `tests`, `.github`, compose. `.env*` is gitignored except `.env.example` (only `PORT`); `data/` is gitignored.
- **Passwords / reset flow:** none exist (identity is HA token/OAuth), so nothing to review.
- **Unauthenticated requests:** all non-static `/api/*` routes returned 401 without a token.

## Unverified
- **go2rtc `exec:` execution (SEC-003)** and what a real go2rtc returns from `/api/config` and `/api/streams` (SEC-002/006): behaviour depends on go2rtc version/config. Only the forwarding by HAD was confirmed.
- **SEC-004** was read from the compose file, not tested on a running stack.
- **SEC-008 and SEC-012** were not reproduced in a browser.
- **Prototype pollution via `deepMergeConfig` (`server.ts:222-244`)**: a `__proto__` key in a config payload by reading appears to affect only the merged object's own prototype, not `Object.prototype`. Not executed.
- **`undici` advisories:** I judged them unreachable from the code's use of `fetch`/`Agent`, but did not test e.g. unbounded decompression on image-proxy responses.
- **Service worker / PWA caching** of authenticated API responses (`vite.config.ts` workbox settings) was not reviewed.
- **Client bundle in `dist/`** was not scanned for secrets; token storage in `localStorage` (`authStorage.ts`) is only an issue if XSS exists, and none was found.
- **Config file permissions** on the NAS volume and the Umbrel packaging (`had-homeassistantdashboard/`) were not reviewed.

## Coverage
Covered: `server.ts` in full; `server/services/energyDbService.ts` (SQL) and `energySyncService.ts` (ingest); auth flow in `AuthContext.tsx`, `haAuth.ts`, `authStorage.ts`; Docker/compose/package.json; XSS/secret/URL-handling greps across `src/`; dependency audit; live PoC of the main server routes.
Not covered: line-by-line review of the ~150 client components (grep only), `scripts/`, `.github` workflow security, `vite.config.ts`, service worker, Umbrel app, the real HA/go2rtc integrations.
