# Haven deployment — 18 September 2026

Caminos is reachable at https://hermes.andresinbox.tech over valid HTTPS. Active release: `/srv/hermes/releases/2026-09-18-v1.2`. The `hermes` DNS A record points at Haven's existing public IPv4 address, with a 300-second TTL. No existing DNS records were replaced.

Installation fix: v1.2 adds a linked standalone web-app manifest, mask-safe 192/512-pixel Lucide Compass icons, and an Apple touch icon. No service worker or personal-data browser cache was added. Build, lint and 67 tests pass. Chromium inspected the live HTTPS site with `Page.getAppManifest` and `Page.getInstallabilityErrors`: both error lists were empty; the icon returned 200 and the unauthenticated private API still returned 401. Installation on the owner's physical phone awaits retry.

The separate `hermes.service` runs as `hermes:hermes` on loopback port 3003. Personal records live only in `/var/lib/hermes/hermes.sqlite` (directory 0700; database 0600). Code releases are sealed under `/srv/hermes/releases`; the app cannot modify release code. Authentication, cookie, service account, database and backups are independent of Pirata. Verified that the Pirata service account cannot read the Caminos database, and Caminos cannot read the Pirata data directory. Trusted server administrators retain normal root access.

The new Caddy site imports `/etc/caddy/hermes.caddy`. Existing Research and Pirata imports remain intact. The previous main config is retained as `/etc/caddy/Caddyfile.before-hermes-20260918`. Caddy validation and reload succeeded, and Pirata, Research and Caddy remained active.

`hermes-backup.timer` is enabled: daily around 04:10 America/New_York, with up to 10 minutes of jitter. The first backup completed and passed integrity/revision verification; a restore into a separate scratch database also passed. Backups are private and on Haven; no off-server backup destination has been configured.

Public `/healthz` succeeds. Both `/api/snapshot` and its percent-encoded route require authentication (401 without a session). Private responses use `no-store`; session cookies are Secure, HttpOnly, host-only and SameSite Strict. Forms require the exact origin and CSRF token. No service worker, offline write queue, localStorage or IndexedDB persistence is implemented.

Production starts empty. Synthetic records are confined to temporary test databases. The owner still needs to choose a password through the single-use setup link. No production password has been chosen, copied from Pirata or exposed to an agent. Generate a fresh link with `sudo -u hermes hermesctl setup-link`; each link expires after 15 minutes and replaces the previous link. Do not save its token in project files.

Validation: production TypeScript/Vite build and ESLint pass; 66 domain/API/CLI/weather/operations/settings tests pass. All 19 browser cases pass in Chromium and all 19 pass in WebKit, including 14 routes at 320, 390, 768 and 1280 pixels, empty records, weather outage, setup, day lifecycle, task outcomes, templates, goal progress, health, journal, envelopes, navigation settings and interrupted-save recovery. WebKit needed private test-only native libraries under `/tmp/hermes-webkit-libs.H0WCta`; its custom browser path is for WebKit alone. An initial combined launch used that path for Chromium too and failed to find Chromium; rerunning Chromium with its normal path passed all cases.

Calendar connections, Samsung Health, live AI chat, bank connections, expense processing, full assets/liabilities net worth, offline mode and push notifications remain deferred as specified. The private `hermesctl` interface supports validated AI-written JSON commands now; it does not directly edit SQLite.
