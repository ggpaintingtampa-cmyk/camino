# Caminos AI Working Guide

This file is the practical orientation guide for AI agents working on Caminos. Read it together with `AGENTS.md` and `CAMINOS-DESIGN-AND-IMPLEMENTATION.md` before making changes.

## Workspace Boundary

- Work only in `/home/andre/Desktop/camino`.
- This directory is a development copy of the real app. Do not edit `/home/andre/Desktop/LargeConcierge/Hermes`.
- Do not read, copy, or expose production credentials or personal health, journal, calendar, or financial records.
- Use synthetic records and isolated databases for development and tests.
- Do not point local commands, tests, or browser sessions at the production database.
- The repository may contain user changes. Preserve unrelated work and inspect the current diff before editing shared files.

## What Caminos Is

Caminos by Morgan is a private, single-owner personal planning web app. It combines:

- A daily home briefing and explicit Start Day / End Day lifecycle
- Tasks, appointments, a schedule, and reusable day templates
- Nested goals and checkable goal steps
- Health, food, sleep, weight, workout, and Rocket League practice logs
- Journal entries, factual day summaries, history, and search
- Personal and Company cash ledgers and expiring money envelopes
- In-app reminders and server-fetched weather

It is a phone-first responsive web app, not a simulated phone shell. The visual language is dark graphite with warm gold accents. The accepted product behavior is defined in `CAMINOS-DESIGN-AND-IMPLEMENTATION.md`; visual screen mappings and comparison evidence are in `design-qa.md` and `artifacts/`.

The app is branded Caminos, but several Hermes runtime identifiers remain intentionally for compatibility, including the development SQLite filename, production hostname, service identity, cookie names, and `HERMES_*` environment aliases. Do not rename those casually.

## Technology

- React 19 and TypeScript 6
- Vite 8
- Fastify 5
- Zod 4
- SQLite through `better-sqlite3`
- Argon2 owner-password hashing
- Vitest for unit, domain, API, security, and operations tests
- Playwright for Chromium and WebKit end-to-end tests
- Lucide React for interface icons
- pnpm with a committed lockfile

Node 24 or newer is expected. On this workstation, the bundled runtime is at:

```text
/home/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin
```

Add that directory to `PATH` when the host Node version is unsuitable, especially before installing native SQLite or Argon2 dependencies.

## Architecture Map

### Client

- `src/main.tsx` mounts the React app and imports the global style layers.
- `src/App.tsx` owns authentication state, hash routing, snapshot refresh, navigation, global modals, and command execution/retry behavior.
- `src/api.ts` is the browser API client. It keeps the CSRF token in memory and sends cookie-authenticated, no-cache requests.
- `src/HomePage.tsx`, `src/TaskListPage.tsx`, and `src/planning.tsx` implement the main daily and planning experiences.
- `src/features/` contains goals, health, money, history, reminders, weather, and settings screens.
- `src/ui.tsx` contains shared UI building blocks and page prop contracts.
- `src/tokens.css` defines the core theme tokens. `styles.css`, `features.css`, and `redesign-v2.css` are imported globally; their split companion files are implementation references, so verify imports before assuming a CSS file is active.

Navigation uses URL hashes such as `#/home`, `#/schedule`, and `#/goals`. The main tab order is owner-configurable and stored in settings.

### Shared Domain

- `shared/types.ts` defines persisted records, snapshots, command types, and command envelopes.
- `shared/schema.ts` provides strict Zod validation for every command. Unknown fields are rejected.
- `shared/domain.ts` is the authoritative state-transition layer. `applyCommand` validates business rules and produces exactly one new revision for a successful command.
- `shared/dates.ts` owns timezone-sensitive date behavior, including DST handling.
- `shared/selectors.ts` contains derived views and summaries.

Client UI code should request mutations through typed commands. Business invariants belong in the shared domain layer, not only in React components.

### Server and Persistence

- `server/main.ts` loads configuration and starts the loopback Fastify server.
- `server/app.ts` creates the testable Fastify application and defines authentication, CSRF/origin checks, snapshot, command, export, search, weather, and static-file routes.
- `server/repository.ts` owns SQLite setup, transactions, revisions, idempotent command receipts, sessions, owner setup, backups, and search.
- `server/environment.ts` prefers `CAMINOS_*` variables while retaining `HERMES_*` compatibility.
- `server/weather.ts` performs server-side provider access and caching.
- `server/cli.ts` powers `pnpm caminosctl` and the compatibility alias `pnpm hermesctl`.

SQLite stores the complete application state as validated JSON plus security and operational tables. The repository is the write authority. Do not bypass it with ad hoc SQL for normal app changes.

## Data and Mutation Contract

The browser reads a `Snapshot` containing all owner records, a monotonically increasing `revision`, and `serverNow`. Writes use this envelope:

```json
{
  "requestId": "a-fresh-uuid",
  "baseRevision": 12,
  "command": {
    "type": "settings.save",
    "name": "Morgan",
    "timezone": "America/New_York"
  }
}
```

Preserve these rules when editing mutation behavior:

- Use a fresh `requestId` for a new intent.
- Retry an uncertain write with the exact same envelope.
- Reject stale `baseRevision` values and refresh before constructing a new change.
- Apply a successful command atomically and increment the revision exactly once.
- Validate with `commandSchema` before mutation.
- Keep timestamps as absolute ISO instants and render them in the owner's configured timezone.
- Store money as integer cents.
- Archive records when history or relationships must be preserved.
- Never fabricate missing values, inferred attendance, sleep onset, weather, money outcomes, or journal content.

When adding or changing a command, update the full path as needed:

1. The command and record types in `shared/types.ts`
2. Strict validation in `shared/schema.ts`
3. Transactional behavior and invariants in `shared/domain.ts`
4. API or CLI exposure only if the existing command endpoint is insufficient
5. The relevant UI and selectors
6. Focused domain/API tests and a user-facing E2E test when appropriate

## Important Product Invariants

- Caminos is isolated from Pirata and all work-app users, data, sessions, cookies, services, and backups.
- Personal data remains on the server. Do not add `localStorage`, IndexedDB, or a service-worker cache for owner records.
- There is one owner account and one independently hashed password.
- Authentication uses HttpOnly cookies, exact-origin enforcement, CSRF protection, and no-store responses.
- One actual task may be active at a time.
- Days remain open across midnight until explicitly ended.
- Ending a day may leave unresolved work; history must be retained.
- Partial task completion creates linked remaining work with an owner-supplied duration.
- Appointments and tasks have different outcomes.
- Goal progress counts leaf steps without double-counting parents.
- Edited day summaries are preserved until explicit regeneration; factual summaries and personal journal writing remain separate.
- Personal and Company ledgers are independent. Envelope operations must be atomic and repeat-safe.
- Weather failures must not block the rest of the app, and stale/unknown data must be labeled honestly.

## Editing Guidance

Start by tracing the behavior through types, schema, domain, API/repository, and UI. Prefer the existing command architecture and shared components over introducing a second state or mutation system.

For interface work:

- Keep the experience usable at 320, 390, 768, and desktop widths.
- Preserve large touch targets, readable type, fixed mobile navigation, and responsive desktop navigation.
- Use Lucide icons already available in the project.
- Reuse theme variables and established classes before adding new color systems.
- Do not add fake phone chrome, unsupported integrations, or decorative content that competes with daily information.
- Compare affected screens with `artifacts/figma-v2`, `artifacts/redesign-v2`, and the mappings in `design-qa.md`.

For domain or server work:

- Keep `createApp` injectable and testable with an isolated database and clock.
- Preserve atomic SQLite transactions, revision conflicts, and idempotent receipts.
- Add strict schemas rather than accepting loose request bodies.
- Never log passwords, setup tokens, session cookies, command payloads, or owner records.
- Keep the database outside public static directories and preserve restrictive file permissions.

## Local Development

Install the exact dependency set when needed:

```sh
pnpm install --frozen-lockfile
```

Run the API and frontend in separate terminals:

```sh
CAMINOS_ALLOW_HTTP=1 CAMINOS_ORIGIN=http://127.0.0.1:5190 pnpm api
pnpm dev
```

- Frontend: `http://127.0.0.1:5190`
- API: `http://127.0.0.1:3003`
- Vite proxies `/api` to the API server.
- The local development database defaults to `.data/hermes.sqlite` and should contain only disposable or intentionally created local records.

Create a local owner through the concealed CLI prompt:

```sh
pnpm caminosctl owner-setup
```

Alternatively, `pnpm caminosctl setup-link` creates a one-use link valid for 15 minutes. Treat the fragment token as a credential.

## Verification

Run checks proportional to the change. The standard complete suite is:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Build before E2E because the Playwright harness serves `dist`. E2E runs on loopback port 5197 with a disposable synthetic fixture and one worker. Chromium and WebKit must be installed on the host.

Useful test locations:

- `tests/domain.test.ts` and `tests/domain-adversarial.test.ts`: business rules, time, goals, health, and money
- `tests/server.test.ts`: authentication, privacy, API durability, conflicts, exports, and backups
- `tests/server-cli.test.ts`: private command and recovery tooling
- `tests/weather.test.ts`: providers, fallbacks, caching, and failure behavior
- `tests/e2e/`: complete user flows, empty states, responsive behavior, and redesign coverage

Do not claim a check passed unless it was actually run. Record any host limitation, such as missing Playwright browsers.

## CLI, Recovery, and Production

For local or explicitly authorized AI operations, use `pnpm caminosctl` to read snapshots and apply the same validated commands as the web app. Command files should be private, use absolute paths, and contain the actual current revision.

`snapshot`, `export`, `backup`, `verify`, and `restore-scratch` are designed for safe inspection and recovery. A restore must target a new database file; never overwrite a running database. Backups contain password hashes and must remain private.

Production details live in `deploy/README.md` and current rollout state lives in `DEPLOYMENT-STATUS.md`. Source edits in this Camino workspace do not authorize deployment. Do not run production commands or modify the live server unless the user explicitly asks. The deployed runtime currently retains Hermes paths and identity, and production administration uses `sudo -u hermes hermesctl ...`.

## Before Handing Off

- Confirm every changed file is inside `/home/andre/Desktop/camino`.
- Review the diff for accidental secrets, personal data, generated databases, and unrelated edits.
- Run the relevant checks and report exactly what ran.
- Explain user-visible behavior and any remaining limitation concisely.
- Update this guide only when architecture, commands, safety boundaries, or the standard workflow materially changes.
