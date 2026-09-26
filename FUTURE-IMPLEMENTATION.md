# Caminos Future Implementation

This file tracks what is already implemented in the copied development workspace at `/home/andre/Desktop/camino` and what is intentionally left for later work.

Do not treat this file as production verification. The real deployed app and historical runtime names may still use Hermes paths, services, cookies, and hostnames. All edits for this project should stay in `/home/andre/Desktop/camino`.

## Currently implemented

- Caminos branding in source, user-facing copy, app metadata, development commands, and local docs.
- Private single-owner web app with React, TypeScript, Vite, Fastify, Zod, and SQLite.
- Owner setup/login, private session cookie behavior, CSRF/origin checks, no-store API responses, and validated command envelopes with revision/idempotency safety.
- Home dashboard with daily briefing, weather, current work, first appointments, goals, reminders, and expiring money envelopes.
- Start Day and End Day flows with wake time, mood, energy, optional sleep/weight details, factual summary, personal journal, and unresolved-item handling.
- Schedule with compact agenda, optional 24-hour timeline, five-minute placement, drag/tap editing, unscheduled tasks, appointments, conflict warnings, templates, and task resolution.
- Tasks with duration, Work/Personal area, labels, notes, goal links, complete/missed/partial/snooze behavior, and linked remaining work for partial completion.
- Goals with parent/child structure, target dates, active/paused/completed/archived states, pinned goals, and equal-weight leaf progress.
- Health and practice logs for steps, weight, workouts, sleep, food, and Rocket League practice.
- Journal and history with calendar navigation, editable factual summaries, separate personal journal text, search, and historical activity views.
- Money tracking with Personal and Company ledgers, cash/account/earned/lost buckets, envelopes, expiry decisions, cancellation, adjustments, and audit history.
- Weather locations with NWS/Open-Meteo fetching/caching, primary location selection, stale labels, and failure-tolerant behavior.
- Local command-line operations through `pnpm caminosctl` for snapshot, command, owner setup, export, backup, backup verification, and scratch restore.
- Redesign v2 source implementation for the 18 approved Figma screens, with verification notes in `design-qa.md`.

## Not implemented yet

- Google Calendar import.
- Work calendar feed into Caminos.
- Busy-only personal calendar blocks sent back to work calendar.
- Samsung Health or watch syncing.
- Live in-app AI chat.
- Automatic bank or card transaction import.
- Full asset, liability, and net-worth tracking.
- Push notifications.
- Offline editing or offline write queue.
- Public AI endpoint.
- Automatic recurring templates or recurring tasks.
- Larger health charts beyond the current summaries.
- Off-server backup destination.
- Deployment of the latest Caminos source rename to Haven, according to `DEPLOYMENT-STATUS.md`.

## Future implementation rules

- Keep privacy first: never use production personal records as test fixtures.
- Prefer the existing command model in `shared/types.ts`, validation in `shared/schema.ts`, and business rules in `shared/domain.ts`.
- Do not write directly to SQLite from feature code or AI tools; route mutations through validated commands.
- Preserve unknown values as unknown. Do not infer missing sleep, health, money, weather, or journal facts.
- Keep external integrations opt-in, auditable, and separate from the work app and its users.
- For any new integration, add tests for auth isolation, stale/retry behavior, and failure that does not block the rest of the app.
- Update this file whenever a deferred feature becomes implemented or a new future item is accepted.

## Quick activity list

- Start Day
- End Day
- Tasks
- Appointments
- Schedule
- Day templates
- Goals
- Health logs
- Food logs
- Rocket League practice
- Journal
- History and search
- Reminders
- Money ledgers
- Cash envelopes
- Weather locations
- Settings
