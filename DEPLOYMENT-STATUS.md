# Caminos v3 R1 production — 27 September 2026

Live at [hermes.andresinbox.tech](https://hermes.andresinbox.tech). Active sealed release: `/srv/hermes/releases/2026-09-27-v3.0-r1`, code commit `ef451b8738a3130dc2ed0dff1c4759f702cdf01d`. [Integration PR #6](https://github.com/ggpaintingtampa-cmyk/camino/pull/6) is merged into main. The [release archive](https://github.com/ggpaintingtampa-cmyk/camino/releases/tag/v3.0.0-r1) contains code/assets/dependencies only and was verified on the VPS against SHA-256 `fdd98513afd84bc77f76519d708684552beba1a536954460671f7bcf88329e7e`.

The four R1 workstreams are integrated: Today / Plan / Tasks / Review / More, independent task recording, reviewed planning and Reset, template previews, optional morning check-in, explicit day closure, and factual Review beside journal writing. R2 remains deferred as recorded in [release verification](docs/redesign-v3/release-verification.md).

## Migration and recovery

Schema 2 / SQL version 2 were frozen before publication. A private backup and scratch restore on the VPS rehearsed the migration before the live cutover. Normal opens never migrate. With the app stopped and backup writers idle, the explicit migration created and verified `/var/backups/hermes/caminos-pre-v3-r1-20260927.sqlite`, then migrated revision 3 to 4. Every legacy record collection and all owner/authentication, weather-cache and command-receipt tables were compared privately before activation and matched exactly. No record contents or secrets were printed, exported off-server or used as fixtures.

The previous release `/srv/hermes/releases/2026-09-19-v2.0` and pre-migration backup remain available. **Rollback requires paired old code and its schema-1 backup; switching only the code link is unsafe.** Preserve any later writes and the current database/WAL/SHM set before a controlled restore. See [operations](deploy/README.md).

A post-release backup through the existing wrapper succeeded at `/var/backups/hermes/caminos-post-v3-r1-20260927.sqlite`, revision 4, schema/SQL 2. Data/backup directories retain mode 0700 and SQLite/backup files mode 0600, owned by hermes:hermes. The new code is sealed root:hermes. No credentials, cookies, runtime paths, Caddy/DNS configuration or Pirata services were changed.

## Availability and checks

At the start, Caddy returned 502 because the old app service was inactive; systemd recorded a successful prior exit. The service was also disabled for startup. The old release was first restarted, then replaced after rehearsal. The app is now active **and enabled**; its daily backup timer is active and enabled. The precise cause of the earlier stop was not established. No password reset was required. The unused temporary deployment SSH key was removed from the Hostinger account and local disk; it was absent from the server's authorized keys.

Public HTTPS `/` and `/healthz` return 200, with the health service named Caminos. The exact JavaScript and CSS hashes match the built release. Both `/api/snapshot` and its encoded-path equivalent return 401 without authentication; responses retain private/no-store headers and the page retains CSP. Owner credentials and sessions were preserved; production verification did not sign in or write test records.

Local verification: typecheck, lint and build passed; 192 focused backend checks and ten Chromium scenarios passed. WebKit launch was attempted and blocked by missing `libevent-2.1.so.7`. No full legacy browser-suite, real-device or screen-reader pass is claimed. See the linked release verification for exact scope and deferred R2 work.

---

# Historical source rename — 26 September 2026

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
