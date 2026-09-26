# Caminos source rename — 26 September 2026

The source app has been renamed to Caminos. This change has not been deployed to Haven. Existing runtime paths, hostname, service units, account and data remain in place. The report below records the earlier release; it is not verification of a Caminos deployment.

Rename validation: build and lint passed; 68 unit/API/operations tests passed; six Chromium browser cases passed. WebKit launch is blocked by missing host library `libevent-2.1.so.7`. See design-qa.md for details.

## Previous Haven deployment — 19 September 2026

Caminos v2 is live at https://hermes.andresinbox.tech. Active sealed release: `/srv/hermes/releases/2026-09-19-v2.0`. The prior release `/srv/hermes/releases/2026-09-18-v1.2` remains available for rollback.

All 18 Figma redesign screens are implemented. Existing owner credentials, records, database schema, service identity, cookie, origin rules and backup configuration were preserved. Only Caminos was restarted; Pirata and its data were not modified. The release was activated by atomically replacing `/srv/hermes/current` after verification and backup.

Before activation, `hermesctl backup` completed successfully and verified revision 2 at `/var/backups/hermes/hermes-2026-09-19T02-05-03-305Z-72a0d27d.sqlite`. No live personal records were opened for screenshots or tests. All browser fixtures are isolated and synthetic.

Validation: TypeScript/Vite build, ESLint and all 67 domain/API/operations tests pass. All 21 browser cases pass in Chromium and WebKit, including 14 routes at 320, 390, 768 and 1280 pixels. After final visual refinements, the six capture/regression/responsive cases passed again in each engine. Reference, implementation and combined comparison images are documented in `design-qa.md`.

The service runs as `hermes:hermes` on loopback port 3003. `/var/lib/hermes` and `/var/backups/hermes` retain mode 0700; `/var/lib/hermes/hermes.sqlite` retains mode 0600. Release code is root-owned and sealed. Authentication, cookies, service account, database and backups remain independent of Pirata; trusted server administrators retain normal administrative access.

Live verification checks the public HTTPS page and `/healthz`, the exact new JavaScript asset, unauthenticated 401 responses for both `/api/snapshot` and its encoded path, `no-store` private responses, the new local emoji font, and Chromium manifest/installability diagnostics. These checks do not log in or inspect the owner's data.

The existing standalone manifest, application icons and Apple touch icon remain. No service worker, browser database, offline write queue or personal-data cache was introduced. The new mood font is served locally under `/assets/fonts/`, with its license and provenance.

The daily private backup timer and existing Caddy/DNS configuration remain in place. No off-server backup destination was added. Owner setup/passwords were not reset or generated during this release.

Google/work-calendar feeds, Samsung Health, live AI chat, bank connections, full net worth, offline editing and push notifications remain deferred as previously specified. The private validated `hermesctl` interface remains available for authorized AI/file operations.

Rollback, if needed: point `/srv/hermes/current` back to the retained v1.2 release and restart `hermes.service`; no database migration was introduced by v2. The previous deployment report is archived at `artifacts/verification/deployment-status-v1.md`.
