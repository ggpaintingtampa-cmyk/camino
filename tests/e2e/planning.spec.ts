import { test, expect, type Page } from '@playwright/test';
import { createServer, type AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import { createApp } from '../../server/app';
import type { Command, CommandEnvelope, Snapshot } from '../../shared/types';
import { browserHarnessConfig } from '../support/browser-config';

// Setup-only infrastructure change: honor the same isolated port as Playwright.
const origin = browserHarnessConfig().origin;
const fixtureDate = '2026-09-18';

async function login(page: Page) {
  await page.goto('/');
  await page.getByLabel('Your password').fill('caminos-fixture-password');
  await page.getByRole('button', { name: 'Open my day' }).click();
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Welcome to Caminos.');
}

async function snapshot(page: Page): Promise<Snapshot> {
  const response = await page.request.get('/api/snapshot');
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function seed(page: Page, command: Command): Promise<Snapshot> {
  const session = await (await page.request.get('/api/session')).json();
  const before = await snapshot(page);
  const response = await page.request.post('/api/commands', {
    headers: { Origin: origin, 'X-CSRF-Token': session.csrfToken },
    data: { requestId: crypto.randomUUID(), baseRevision: before.revision, command },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()).snapshot;
}

function unique(prefix: string, project: string) { return `${prefix} ${project} ${crypto.randomUUID().slice(0, 8)}`; }

test.beforeEach(async ({ page }) => { await login(page); });

test('creates a scheduled task and plans partial remaining work through the UI', async ({ page }, info) => {
  const title = unique('Dribble practice', info.project.name);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Task', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Title', { exact: true }).fill(title);
  await dialog.getByRole('button', { name: '30m', exact: true }).click();
  await dialog.getByLabel('Assign a time').check();
  await dialog.getByLabel('Starts date').fill(fixtureDate);
  await dialog.getByLabel('Starts hour').selectOption('8');
  await dialog.getByLabel('Starts minute').selectOption('30');
  await dialog.getByRole('button', { name: 'Save to schedule' }).click();
  await expect(dialog).toHaveCount(0);
  let saved = await snapshot(page);
  const original = saved.tasks.find(t => t.title === title)!;
  const originalBlock = saved.blocks.find(b => b.taskId === original.id)!;
  expect(originalBlock.start).toBe('2026-09-18T12:30:00.000Z');
  await page.getByRole('link', { name: 'Schedule', exact: true }).click();
  await expect(page.locator('.planning-agenda')).toBeVisible();
  await page.getByRole('button', { name: 'Open 24-hour timeline', exact: true }).click();
  await expect(page.locator('.planning-timeline-wrap .timeline')).toBeVisible();
  await page.getByRole('button', { name: 'Back to day overview', exact: true }).click();
  await page.locator('.schedule-block .block-content').filter({ hasText: title }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Partially done', exact: true }).click();
  await dialog.getByLabel('Duration in minutes').fill('15');
  await dialog.getByRole('button', { name: 'Send remaining work to list' }).click();
  await expect(dialog).toHaveCount(0);
  saved = await snapshot(page);
  const partial = saved.tasks.find(t => t.id === original.id)!;
  const remaining = saved.tasks.find(t => t.id === partial.remainingTaskId)!;
  expect(partial.status).toBe('partial');
  expect(remaining).toMatchObject({ title, duration: 15, status: 'open' });
  expect(saved.blocks.find(b => b.id === originalBlock.id)?.status).toBe('partial');
  await page.getByRole('button', { name: /Unscheduled/ }).click();
  await expect(page.locator('.backlog .task-row').filter({ hasText: title })).toContainText('15 min');
});

test('snoozes an expired task without moving its scheduled history', async ({ page }, info) => {
  const title = unique('Review a replay', info.project.name);
  const id = crypto.randomUUID();
  await seed(page, { type: 'block.save', block: { id, title, kind: 'task', tag: 'Personal', start: '2026-09-18T11:00:00.000Z', end: '2026-09-18T11:30:00.000Z', status: 'pending', notes: '' } });
  await page.goto('/#/schedule');
  await page.reload();
  await page.locator('.schedule-block .block-content').filter({ hasText: title }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Snooze', exact: true }).click();
  await dialog.getByRole('button', { name: '10 minutes', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const saved = await snapshot(page);
  const block = saved.blocks.find(b => b.id === id)!;
  expect(block.status).toBe('pending');
  expect(block.start).toBe('2026-09-18T11:00:00.000Z');
  expect(Date.parse(block.snoozedUntil!) - Date.parse(saved.serverNow)).toBeGreaterThanOrEqual(600000);
  expect(Date.parse(block.snoozedUntil!) - Date.parse(saved.serverNow)).toBeLessThan(630000);
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.locator('.attention-row').filter({ hasText: title })).toHaveCount(0);
});

test('creates and applies a day template once without duplicating its work', async ({ page }, info) => {
  const title = unique('Training morning', info.project.name);
  const blockTitle = unique('Mechanics session', info.project.name);
  await page.goto('/#/templates');
  await page.getByRole('button', { name: 'New template' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Template name').fill(title);
  await dialog.getByLabel('Title', { exact: true }).fill(blockTitle);
  await dialog.getByRole('combobox', { name: 'Kind', exact: true }).selectOption('task');
  await dialog.getByRole('combobox', { name: 'Start', exact: true }).selectOption('600');
  await dialog.getByLabel('Duration in minutes').fill('30');
  await dialog.getByRole('button', { name: 'Save template' }).click();
  await expect(dialog).toHaveCount(0);
  let saved = await snapshot(page);
  const template = saved.templates.find(t => t.title === title)!;
  await page.goto('/#/schedule');
  await page.getByLabel('Schedule date').fill('2026-09-19');
  await page.getByText('Apply a day template', { exact: true }).click();
  await page.getByLabel('Day template', { exact: true }).selectOption(template.id);
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.locator('.schedule-block .block-content').filter({ hasText: blockTitle })).toHaveCount(1);
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.locator('.schedule-block .block-content').filter({ hasText: blockTitle })).toHaveCount(1);
  saved = await snapshot(page);
  expect(saved.blocks.filter(b => b.title === blockTitle)).toHaveLength(1);
  expect(saved.tasks.filter(t => t.title === blockTitle)).toHaveLength(1);
});

test('moving a future task keeps the previous schedule block as history', async ({ page }, info) => {
  const title = unique('Read the next chapter', info.project.name);
  const id = crypto.randomUUID();
  await seed(page, { type: 'block.save', block: { id, title, kind: 'task', tag: 'Personal', start: '2026-09-20T14:00:00.000Z', end: '2026-09-20T14:30:00.000Z', status: 'pending', notes: '' } });
  await page.goto('/#/schedule');
  await page.reload();
  await page.getByLabel('Schedule date').fill('2026-09-20');
  await page.locator('.schedule-block .block-content').filter({ hasText: title }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Starts hour').selectOption('11');
  await dialog.getByRole('button', { name: 'Save to schedule' }).click();
  await expect(dialog).toHaveCount(0);
  const state = await snapshot(page);
  const history = state.blocks.filter(b => b.title === title);
  expect(history).toHaveLength(2);
  expect(history.find(b => b.id === id)).toMatchObject({ start: '2026-09-20T14:00:00.000Z', status: 'cancelled' });
  expect(history.find(b => b.id !== id)).toMatchObject({ start: '2026-09-20T15:00:00.000Z', status: 'pending' });
  expect(state.tasks.filter(t => t.title === title)).toHaveLength(1);
});

test('retrying a lost save response continues scheduling without creating duplicate work', async ({ page }, info) => {
  const title = unique('Recovered schedule', info.project.name);
  const attempts: CommandEnvelope[] = [];
  let lostResponse = false;
  await page.route('**/api/commands', async route => {
    const envelope = route.request().postDataJSON() as CommandEnvelope;
    if (envelope.command.type === 'task.save' && envelope.command.task.title === title) {
      attempts.push(envelope);
      if (!lostResponse) {
        lostResponse = true;
        // The real API commits the command, then its response is lost before the
        // browser receives it. Retry must reuse this exact idempotency envelope.
        const response = await route.fetch();
        expect(response.ok()).toBeTruthy();
        await route.abort('failed');
        return;
      }
    }
    await route.continue();
  });
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Task', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Title', { exact: true }).fill(title);
  await dialog.getByLabel('Assign a time').check();
  await dialog.getByLabel('Starts date').fill('2026-09-21');
  await dialog.getByLabel('Starts hour').selectOption('9');
  await dialog.getByLabel('Starts minute').selectOption('0');
  await dialog.getByRole('button', { name: 'Save to schedule' }).click();
  await expect(dialog.getByRole('button', { name: 'Retry save' })).toBeVisible();
  let state = await snapshot(page);
  expect(state.tasks.filter(t => t.title === title)).toHaveLength(1);
  expect(state.blocks.filter(b => b.title === title)).toHaveLength(0);
  await dialog.getByRole('button', { name: 'Retry save' }).click();
  await expect(dialog).toHaveCount(0);
  state = await snapshot(page);
  expect(state.tasks.filter(t => t.title === title)).toHaveLength(1);
  expect(state.blocks.filter(b => b.title === title)).toHaveLength(1);
  expect(attempts).toHaveLength(2);
  expect(attempts[1]).toEqual(attempts[0]);
});

test('ends the day and explicitly reopens it without losing check-in or journal', async ({ page }, info) => {
  // The shared fixture already has a genuine Start Day. Reopen it explicitly
  // when another browser project has completed the prior lifecycle check.
  let state = await snapshot(page);
  for (const day of state.days.filter(d => !d.endedAt && d.date !== fixtureDate)) state = await seed(page, { type: 'day.end', id: day.id });
  const current = state.days.find(d => d.date === fixtureDate)!;
  if (current.endedAt) await seed(page, { type: 'day.reopen', id: current.id });
  const note = unique('A day worth remembering', info.project.name);
  await page.goto('/#/home');
  await page.reload();
  await page.getByRole('button', { name: 'End day', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Edit summary', exact: true }).click();
  await dialog.getByLabel('Daily summary · editable facts').fill('A factual test record.');
  await dialog.getByRole('button', { name: 'Keep summary', exact: true }).click();
  await dialog.getByLabel('My journal', { exact: true }).fill(note);
  await dialog.getByRole('button', { name: 'End day', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  state = await snapshot(page);
  const closed = state.days.find(d => d.date === fixtureDate)!;
  expect(closed.endedAt).toBeTruthy();
  expect(closed.summary).toBe('A factual test record.');
  expect(closed.journal).toBe(note);

  await page.getByRole('button', { name: 'Start day', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Reopen today', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  state = await snapshot(page);
  const reopened = state.days.find(d => d.date === fixtureDate)!;
  expect(reopened).toMatchObject({ mood: current.mood, energy: current.energy, startedAt: current.startedAt, summary: 'A factual test record.', journal: note });
  expect(reopened.endedAt).toBeUndefined();
  expect(state.days.filter(d => d.date === fixtureDate)).toHaveLength(1);
});

test('first-time setup starts an empty private day and saves optional sleep and weight', async ({ page }) => {
  const port = await new Promise<number>((resolvePort, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const assigned = (probe.address() as AddressInfo).port;
      probe.close(error => error ? reject(error) : resolvePort(assigned));
    });
  });
  const privateOrigin = `http://127.0.0.1:${port}`;
  const time = '2026-09-18T14:10:00.000Z';
  const app = await createApp({
    dbPath: ':memory:', origin: privateOrigin, allowInsecureLocalhost: true,
    staticDir: resolve('dist'), now: () => Date.parse(time),
    weather: {
      search: async () => [],
      forecast: async location => ({ locationId: location.id, temperature: 82, shortForecast: 'Synthetic clear sky', high: 86, low: 74, precipitation: 0, fetchedAt: time, stale: false, attribution: 'Synthetic test weather', periods: [] }),
    },
  });
  try {
    const setup = app.repository.createSetupToken(Date.parse(time));
    await app.listen({ port, host: '127.0.0.1' });
    await page.context().clearCookies();
    await page.goto(`${privateOrigin}/#/setup?token=${encodeURIComponent(setup.raw)}`);
    await expect(page.getByRole('heading', { name: 'Make Caminos yours.' })).toBeVisible();
    await expect(page).toHaveURL(`${privateOrigin}/#/setup`);
    await page.getByLabel('Password · at least 12 characters').fill('isolated-caminos-fixture-password');
    await page.getByLabel('Repeat password').fill('isolated-caminos-fixture-password');
    await page.getByRole('button', { name: 'Create my private account' }).click();
    await expect(page.getByRole('heading', { name: 'One moment at a time.' })).toBeVisible();
    expect(app.repository.snapshot().tasks).toHaveLength(0);
    expect(app.repository.snapshot().days).toHaveLength(0);
    expect(app.repository.setupTokenValid(setup.raw, Date.parse(time))).toBe(false);

    await page.getByRole('button', { name: 'Start my day', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Mood 4 of 5', exact: true }).click();
    let discardPrompts = 0;
    page.once('dialog', async confirmation => {
      expect(confirmation.message()).toBe('Close and discard unsaved changes?');
      discardPrompts += 1;
      await confirmation.dismiss();
    });
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).toBeVisible();
    expect(discardPrompts).toBe(1);
    await dialog.getByRole('button', { name: 'Change date', exact: true }).click();
    await dialog.getByLabel('I woke up at date').fill(fixtureDate);
    await dialog.getByLabel('I woke up at hour').selectOption('7');
    await dialog.getByLabel('I woke up at minute').selectOption('0');
    await dialog.getByRole('button', { name: 'Energy 3 of 5', exact: true }).click();
    await dialog.getByLabel('Morning weight (lb)').fill('180.5');
    await dialog.getByRole('button', { name: /Sleep duration/ }).click();
    await dialog.getByRole('button', { name: 'Set sleep start' }).click();
    await dialog.getByRole('combobox', { name: 'Sleep quality', exact: true }).selectOption('4');
    await dialog.getByLabel('How are you waking up?').fill('Clear-headed synthetic check-in.');
    await dialog.getByRole('button', { name: 'Start my day', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'End day', exact: true })).toBeVisible();
    const state = app.repository.snapshot();
    expect(state.days).toHaveLength(1);
    expect(state.days[0]).toMatchObject({ startedAt: '2026-09-18T11:00:00.000Z', mood: 4, energy: 3, note: 'Clear-headed synthetic check-in.' });
    expect(state.logs.find(log => log.kind === 'weight')).toMatchObject({ value: 180.5 });
    expect(state.logs.find(log => log.kind === 'sleep')).toMatchObject({ duration: 480, quality: 4 });
    expect(state.tasks).toHaveLength(0);
  } finally { await app.close(); }
});
