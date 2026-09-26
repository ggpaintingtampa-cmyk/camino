# Private Caminos operations

Caminos is independent of Pirata. Do not copy a Pirata database, cookie, environment file, credential hash, or service account. A successful Pirata sign-in must never grant Caminos access. There is no public owner-registration endpoint.

## Runtime and release

After the application passes its build and tests, root can run `bash deploy/install.sh --source ABS_PROJECT --node ABS_VERIFIED_NODE --release VERSION`. The script copies a sealed code-only release and dedicated Node runtime, creates the isolated account/directories, and installs units plus `/usr/local/bin/hermesctl`. It refuses to overwrite a release or a differing existing runtime/unit/wrapper, preserves an existing `current` link, and never opens the database as root. It does not start services or change Caddy. Re-running shared provisioning leaves identical account/directories/units/wrapper in place; a new release always needs a new name.

Use Node 24 LTS with the same architecture/native SQLite ABI used to install dependencies. Production services expect a root-owned Node runtime at `/opt/hermes/node/bin/node`; copy or install a verified Node runtime there. Install/build with pnpm before sealing a release. `tsx` is required by the service, so retain the production runtime tool even though it is listed in development dependencies.

Provision a dedicated system user/group `hermes` with no login shell. Create `/srv/hermes/releases` root-owned and private to the service group, `/var/lib/hermes` and `/var/backups/hermes` owned by `hermes:hermes` with mode 0700. Seal each version under `/srv/hermes/releases/<version>` as root-owned, group `hermes`, directories 0750 and files 0640 (keep the Node executable executable). Include only `server/`, `shared/`, `dist/`, `node_modules/`, package manifests and this deployment documentation. Do not copy `.data`, tests, browser artifacts, or credentials into releases. Point `/srv/hermes/current` at the selected sealed release.

Install the supplied service, backup service and timer in `/etc/systemd/system`. Before activating, extend each unit's `InaccessiblePaths` to include the actual Pirata data/upload paths from the existing service configuration, without reading its secrets. The application service may write only `/var/lib/hermes`; the backup service additionally writes `/var/backups/hermes`. Use separate OS permissions so employees and the work-app process cannot read these private paths. Trusted root/server administrators necessarily remain able to read server data.

Configure DNS for `hermes.andresinbox.tech` to this server. Add `Caddyfile.hermes` as its own site, without replacing other sites. Validate Caddy configuration before reload. The API binds loopback port 3003. Confirm it is free before starting and do not expose port 3003 through a firewall. Service TLS terminates at Caddy; application origin is the exact public HTTPS URL.

Owner setup, run in a private terminal (the password is concealed):

```sh
sudo -u hermes hermesctl owner-setup
```

Use `owner-setup --replace` only for an intentional password change; it revokes every session. `--password-stdin` supports a secure pipe from authorized provisioning, never a password in shell arguments or logs. No password is seeded by installation or shipped in the project.

Alternatively, `sudo -u hermes hermesctl setup-link` generates a high-entropy, single-use link valid for 15 minutes so the owner can choose a password in the browser. The token is stored only as a digest in the database and carried in the URL fragment, never an HTTP request URL. Only the latest link works; existing owners cannot be replaced through this endpoint. Treat the CLI's link output as a temporary credential. The browser posts the token with the chosen password over HTTPS and the same preauthentication CSRF protections as login.

Always use the installed wrapper for production commands. It refuses root and other user identities, rejects database-path overrides, fixes the production database/origin, clears runtime override variables and changes into `/srv/hermes/current` before loading TypeScript. This avoids failures from an inaccessible inherited caller directory and prevents an accidentally created database in the caller's workspace. Pass absolute `--file` and `--out` paths with permissions allowing the service account to access them. For a command file private to the caller, use shell input redirection instead of widening file permissions:

```sh
sudo -u hermes hermesctl command --stdin < /absolute/private/command.json
sudo -u hermes hermesctl backup
sudo -u hermes hermesctl verify --file /var/backups/hermes/EXACT_BACKUP.sqlite
```

Enable/start `hermes.service` and `hermes-backup.timer`. Check `https://hermes.andresinbox.tech/healthz`, unauthenticated API rejection, owner sign-in, real save/reload, and a verified backup. A private home-screen shortcut works as a web app; offline mode/push are not implemented.

## Backup and recovery

The daily timer uses SQLite's online backup API, mode 0600, and immediately verifies integrity plus snapshot revision. Backups include password hashes and must stay private. No destructive retention policy is applied. Copy backups off the server through a separately authorized private backup destination when available; same-server backups do not protect from disk loss.

`sudo -u hermes hermesctl verify --file BACKUP` is a read-only check. `sudo -u hermes hermesctl restore-scratch --file BACKUP --out NEW_PATH` copies to an unused destination, checks integrity, and removes old sessions. Use absolute paths and a private scratch directory with mode 0700. Compare an owner export against the original records. Recovery of the live service requires stopping Caminos, preserving the current database and any WAL/SHM files as a set, then placing the verified restored database at the live path with the proper owner/mode. Never overwrite a running database. Keep the prior file set for recovery until the restored service is verified. A release rollback changes only the `current` link and restarts the service; do not roll back data silently.

## API and local AI use

`createApp({dbPath, origin, allowInsecureLocalhost?, staticDir?, now?, weather?})` returns a Fastify app with `repository` for isolated tests. Tests provision an owner directly through the repository and use real session/CSRF flows; no public authentication bypass exists.

GET `/api/session` establishes an anonymous CSRF session and returns `{authenticated, csrfToken, ownerConfigured}`. POST `/api/login` sends `{password}`, exact `Origin`, and `X-CSRF-Token`, then returns a rotated token. Every mutation requires the current CSRF token and exact origin. Read routes are `/api/snapshot`, `/api/search?q=`, `/api/export`, `/api/weather?locationId=`, `/api/weather/locations?q=`. POST `/api/commands` accepts a validated command envelope and returns `{snapshot}`. `/api/logout` revokes the session. Personal responses are never cached. Export includes records, not credentials or sessions.

For authorized AI file operations, read `sudo -u hermes hermesctl snapshot`, produce a private JSON file and run `sudo -u hermes hermesctl command --stdin < ABSOLUTE_PATH` or `sudo -u hermes hermesctl command --file ABSOLUTE_PATH` when the service account can read it. The envelope contains a fresh UUID `requestId`, the read snapshot's `baseRevision`, and `command` matching `shared/schema.ts`. Reuse the exact envelope for an uncertain retry; a repeated request is accepted once and returns the latest snapshot. A stale revision fails before any write. Refresh and review before issuing a new envelope. Operations do not support raw SQLite editing. The tool has the same owner-level access as its OS account; grant it only to explicitly authorized agents.

Example structural command (all values synthetic):

```json
{"requestId":"b66297e8-34ce-4d42-b37a-1428129c5aa6","baseRevision":0,"command":{"type":"settings.save","name":"Morgan","timezone":"America/New_York"}}
```

## Local development

Use an isolated `.data` directory; all content begins empty. Start API with `HERMES_ALLOW_HTTP=1 HERMES_ORIGIN=http://127.0.0.1:5190 pnpm api`, initialize its owner using `pnpm hermesctl owner-setup`, then `pnpm dev`. Explicit HTTP mode is restricted to loopback and uses `hermes_dev_session`; production uses only secure `__Host-hermes_session`. Test fixture owners belong in temporary databases, never production.

Weather is fetched by the server from [NWS](https://www.weather.gov/documentation/services-web-api) with [Open-Meteo](https://open-meteo.com/en/docs) fallback; city/postal searches use [Open-Meteo geocoding](https://open-meteo.com/en/docs/geocoding-api), with [Zippopotam.us](https://www.zippopotam.us/) for US ZIPs missing from its index. Geocoding providers use GeoNames data. Cached forecasts last 30 minutes and retain their original timestamp with a stale label during failure. No weather request includes journal, task, health, or financial records.
