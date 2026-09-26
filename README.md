# Caminos by Morgan

## Caminos rename

The app is now Caminos. Screens, install metadata, asset names, exports, command output and development tooling use the new name. Use `pnpm caminosctl` for local commands and `deploy/caminos-mcp.mjs` for new AI-tool connections.

Existing runtime identifiers are intentionally retained: the project directory, deployed hostname, service account/units, database and backup directories, and session cookies. These are active connections, not display branding. `HERMES_*` configuration, `pnpm hermesctl`, and the old MCP entry point remain compatibility aliases; new configuration uses `CAMINOS_*`. No owner records, passwords or services were migrated by this source rename. Historical Figma screenshots remain original reference images.

A private personal dashboard for the phone, with a graphite-and-gold interface related to Pirata. Caminos keeps its own code, owner account, database, cookie, service identity and backups. Work-app users cannot sign into it with a Pirata session. Data stays on the server; the browser holds the current display in memory and a private session cookie.

## What this version does

Version 2 implements all 18 screens from [Caminos — Redesign v2](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=1-2). The interface uses the supplied graphite/gold tokens, system fonts and Lucide icons. References, synthetic captures and side-by-side comparisons are under `artifacts/figma-v2` and `artifacts/redesign-v2`; see `design-qa.md` for verification.

- **Home:** daily briefing, forecast, current task countdown, first appointments, important pending decisions, due goals, reminders and envelope deadlines. Start Day records wake time and optional check-in data; End Day preserves a factual summary beside a personal journal.
- **Schedule:** compact chronological agenda by default, with an explicit 24-hour timeline for five-minute placement and touch dragging. Precise controls, unscheduled tasks, appointments, reusable templates and overlap warnings remain available. Expired tasks offer completion, missed, partial or snooze; a partial result creates a linked follow-up task with your chosen remaining duration.
- **Goals:** parent/child goals and checkable steps, equal-weight leaf progress, target dates from daily through ten years, pins, pauses and archiving.
- **Health and practice:** steps, repeated weight entries in pounds, workouts, sleep duration/quality, simple food notes and Rocket League sessions, with today/7-day/30-day summaries.
- **Journal and history:** month navigation, factual summaries that can be edited explicitly, separate personal writing, and search across records. Missing information stays unknown; generated prose uses stored facts.
- **Money:** independent Personal and Company balances, cash reservations in envelopes, earned and Lost/Charity buckets, expiry decisions, and an adjustment history. This tracks your manually entered balances; it does not transfer money.
- **Private AI/file operations:** `pnpm caminosctl` reads records and applies the same validated commands as the app. It does not expose a public AI endpoint or require editing SQLite directly.

Google/work-calendar feeds, Samsung Health/watch syncing, in-app AI chat, automatic bank transactions, full asset/liability net worth, push notifications, and offline editing are deferred. A server administrator or an explicitly authorized local AI process can access personal data; privacy isolation is from the work application and its users.

## Run locally

Use Node 24 or newer and pnpm. On this workstation the bundled Node lives at `/home/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin`. Keep that directory on `PATH` when installing and running the native SQLite/Argon dependencies. Install the exact locked dependencies with `pnpm install --frozen-lockfile`.

In separate terminals:

```sh
CAMINOS_ALLOW_HTTP=1 CAMINOS_ORIGIN=http://127.0.0.1:5190 pnpm api
pnpm dev
```

The API listens on `127.0.0.1:3003`; Vite serves `http://127.0.0.1:5190` and proxies `/api`. The development database defaults to `.data/hermes.sqlite` and begins empty. Do not point local tests at production data.

Choose an independent owner password through a concealed terminal prompt:

```sh
pnpm caminosctl owner-setup
```

Or generate a private browser setup link (single use, 15 minutes):

```sh
CAMINOS_ALLOW_HTTP=1 CAMINOS_ORIGIN=http://127.0.0.1:5190 pnpm caminosctl setup-link
```

The link contains a temporary token in its URL fragment. Treat it as a credential and open it only in the owner's browser. Production uses exact-origin HTTPS with a secure HttpOnly cookie named `__Host-hermes_session`. Explicit loopback HTTP development uses a separate cookie name. No seeded owner password is included in the application.

## Build and verify

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Browser tests require Playwright Chromium and WebKit installed for this host. They launch an isolated disposable fixture on loopback port 5197, use synthetic records, and never accept a production database path. Build first so the fixture serves the current `dist` files. The fixture password exists only in test source and has no access to normal app data. Close the test harness after review.

Unit/API tests cover the task/day/goal/health/money transitions, timezone behavior, real SQLite transactions, concurrent revision rejection, repeat-safe requests, owner setup and login/reset races, CSRF/origin isolation, credential-free exports, private static assets, backup/scratch restore, and weather failures. Operation checks validate shell syntax and service restrictions. Production verification must additionally check the actual filesystem permissions and deployed HTTPS behavior.

## Authorized file commands and recovery

`pnpm caminosctl snapshot` reads the current records and revision. Prepare a private JSON command file following `shared/schema.ts`, then run `pnpm caminosctl command --file /absolute/path/command.json`. A command envelope is:

```json
{
  "requestId": "a8fdb2fd-d914-4533-9310-d0e4e4eb85a6",
  "baseRevision": 0,
  "command": {
    "type": "settings.save",
    "name": "Morgan",
    "timezone": "America/New_York"
  }
}
```

Use the actual read revision and a fresh request ID for each new operation. Retry an uncertain save using the exact same envelope. A stale revision fails before any write; read and review the changed records before making a new command. Money is stored in integer cents; timestamps represent absolute instants and are displayed in the app timezone. Defaults are America/New_York, USD, pounds, miles and Fahrenheit.

`pnpm caminosctl export --out NEW_FILE` writes owner records without credentials. `pnpm caminosctl backup --out NEW_FILE` creates a private SQLite backup and verifies it. `pnpm caminosctl verify --file BACKUP` checks a backup without mutation. `pnpm caminosctl restore-scratch --file BACKUP --out NEW_DB` restores only to a new file, checks integrity and revokes copied sessions. Backups include password hashes and must remain private. Never overwrite a running live database.

## Production operations

The target is `https://hermes.andresinbox.tech`, with `/var/lib/hermes/hermes.sqlite`, private backups under `/var/backups/hermes`, sealed releases under `/srv/hermes/releases`, and a dedicated Node runtime under `/opt/hermes/node`. See [deploy/README.md](deploy/README.md) for provisioning, the Caddy site, systemd service, daily backup timer, recovery and private owner setup. The installer does not start services, modify Caddy or initialize a root-owned database.

For the deployed app, use `sudo -u hermes hermesctl ...` rather than the local-development `pnpm caminosctl` command. The installed wrapper enforces the private service identity, fixed production database/origin and correct working directory. For example: `sudo -u hermes hermesctl setup-link`, `sudo -u hermes hermesctl backup`, or `sudo -u hermes hermesctl command --stdin < /absolute/private/command.json`. File arguments must be absolute and accessible to the service account; stdin allows the caller to retain private file permissions.

The previous release is deployed on Haven at https://hermes.andresinbox.tech; the Caminos source rename awaits deployment. See [DEPLOYMENT-STATUS.md](DEPLOYMENT-STATUS.md) for deployment status. [design-qa.md](design-qa.md) records visual verification. The integrations listed above remain outside this first version.
