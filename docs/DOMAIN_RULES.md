# Domain rules

Business rules an agent must not break. Where a rule is enforced is listed so you can find (and test) it.

## Identity and roles
- Home Assistant is the only identity provider. A request is authenticated if `<HASS_URL>/api/` accepts its bearer token (cached 60 s; invalid results 30 s). `server/auth/haAuth.ts`.
- Admin = HA `auth/current_user.is_admin`. Admin-only: asset uploads, statistics sync, deleting cameras, and changing camera sources. Any valid user may read everything and save layout/preferences. Mock tokens (`test_`/`mock_`, only with `ALLOW_MOCK_TOKENS=true`) are admins unless named `*_nonadmin`.
- The server never contacts a client-chosen HA URL (except opt-in first-run pinning outside production).

## Dashboard config
- One shared config per server, versioned (`serverVersion`). A client that last saw an older version gets 409 (`checkConfigWriteGuards`). Partial saves (`partial: true`, e.g. on page unload) are merged and skip the version check.
- An empty or default payload must never overwrite a customised config (material-data guard) unless `allowEmpty` is set, the save is a partial merge, or it explicitly updates camera sources (`hasMaterialDashboardConfig`).
- Saves deep-merge onto the current config so omitted sections survive; arrays are replaced; `null` deletes a key; `cameras.sources` is replaced wholesale so deleted cameras stay deleted (`deepMergeConfig`).
- Clients only ever see redacted camera URLs (credentials removed) and a PIN marker; stored secrets are restored on write (`redactConfigForClient`, `restoreRedactedCameraUrls`, `applyPinOnWrite`).
- Writes are serialized, fsynced and atomic, with `.bak` plus up to 5 rolling snapshots (at most one per minute). Reads self-heal from `.bak` then snapshots.

## Client sync
- Remote config is never applied while the user is dragging; it is deferred and applied when the drag ends (`decideRemoteApply`).
- Local edits always win over an incoming remote config until saved: remote, then unsynced changes, then pending debounced edits (`reconcileRemoteConfig`). Saves are debounced 800 ms and flushed on page hide.
- A failed save must be visible (`SyncStatusBadge` "Changes not saved") and retried by reloading, which replays unsynced changes.

## Proxies
- The image proxy only fetches http(s), blocks private/loopback/link-local/cloud-metadata addresses on every redirect hop and at DNS resolution, and forwards the HA token only to the trusted HA host.
- go2rtc is reached only through `/api/cameras/*`; only playlist and segment paths are relayed (`resolveHlsSubpath`); camera sources must use allowed schemes (`validateCameraSourceUrl`).
- Uploaded assets must match their claimed image signature and are limited to 5 MB.

## Demo mode
- Demo is a separate session type: no HA connection, no server config sync, never counted as authenticated (`authStatus.ts`).
