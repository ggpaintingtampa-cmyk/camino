import { test, expect, type Page } from '@playwright/test';
import { createServer, type AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import { createBrowserHarness } from '../support/browser-harness';
import type { Command, CommandEnvelope, Snapshot } from '../../shared/types';

let harness: Awaited<ReturnType<typeof createBrowserHarness>>;
let origin: string;
const date = '2026-09-18';
const at = (time: string) => `${date}T${time}:00.000Z`;
async function snapshot(page: Page): Promise<Snapshot> { return (await page.request.get(`${origin}/api/snapshot`)).json(); }
async function seed(page: Page, command: Command) {
  const session = await (await page.request.get(`${origin}/api/session`)).json();
  const before = await snapshot(page);
  const response = await page.request.post(`${origin}/api/commands`, { headers: { Origin: origin, 'X-CSRF-Token': session.csrfToken }, data: { requestId: crypto.randomUUID(), baseRevision: before.revision, command } });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()).snapshot as Snapshot;
}
async function openPlan(page: Page) { await page.goto(`${origin}/#/schedule`); await expect(page.getByRole('heading', { name: 'Plan', exact: true })).toBeVisible(); }
async function capture(page: Page, title: string) {
  await page.locator('.v3-add-task').click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('New task', { exact: true }).fill(title);
  await dialog.getByRole('button', { name: 'Save task', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText(`Saved “${title}”`);
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
}
test.beforeEach(async ({ page }) => {
  const reservation = createServer(); await new Promise<void>(done => reservation.listen(0, '127.0.0.1', done));
  const port = (reservation.address() as AddressInfo).port; await new Promise<void>(done => reservation.close(() => done()));
  origin = `http://127.0.0.1:${port}`;
  harness = await createBrowserHarness({ port, origin, scenario: 'empty', initialNow: at('14:10') }, resolve('dist'));
  await harness.app.listen({ port, host: '127.0.0.1' });
  await page.goto(origin);
  await page.getByLabel('Your password').fill('caminos-fixture-password');
  await page.getByRole('button', { name: 'Open my day' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Today', exact: true })).toBeVisible();
});
test.afterEach(async () => { await harness?.close(); });

test('R1: lost response retries the exact capture once and uses no browser persistence', async ({ page }) => {
  const sent: CommandEnvelope[] = [];
  await page.route('**/api/commands', async route => {
    const envelope = route.request().postDataJSON() as CommandEnvelope;
    if (envelope.command.type !== 'task.capture') return route.continue();
    sent.push(envelope);
    if (sent.length === 1) { await route.fetch(); await route.abort('failed'); } else await route.continue();
  });
  await page.locator('.v3-add-task').click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('New task').fill('Synthetic retry task');
  await dialog.getByRole('button', { name: 'Save task', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('could not confirm');
  await expect(dialog.getByLabel('New task')).toHaveValue('Synthetic retry task');
  await dialog.getByRole('button', { name: 'Retry save safely' }).click();
  await expect(dialog.getByRole('status')).toContainText('Saved');
  expect(sent).toHaveLength(2); expect(sent[1]).toEqual(sent[0]);
  const saved = await snapshot(page);
  expect(saved.tasks).toHaveLength(1); expect(saved.tasks[0].duration).toBeUndefined(); expect(saved.blocks).toEqual([]); expect(saved.days).toEqual([]);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
});

test('R1: plan choices survive inline capture, stay untimed and require no started day', async ({ page }, info) => {
  await seed(page, { type: 'task.capture', task: { id: 'chosen-a', title: 'Synthetic priority', duration: 30 } });
  await openPlan(page);
  await page.getByRole('button', { name: 'Plan today', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Choose Synthetic priority' }).click();
  await dialog.getByRole('button', { name: 'Make main task' }).click();
  await dialog.getByRole('button', { name: 'Create a task' }).click();
  await dialog.getByLabel('New task').fill('Synthetic second choice');
  await dialog.getByRole('button', { name: 'Save task', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Clear main task' })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Synthetic second choice' })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Available time not chosen' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('plan-today.png'), fullPage: true });
  await dialog.getByRole('button', { name: 'Save choices' }).click();
  await expect(dialog).toHaveCount(0);
  const saved = await snapshot(page);
  expect(saved.dayPlans[0]).toMatchObject({ mainTaskId: 'chosen-a', protectedSpareMinutes: 0 });
  expect(saved.dayPlans[0].taskIds).toHaveLength(2); expect(saved.dayPlans[0].window).toBeUndefined();
  expect(saved.blocks).toEqual([]); expect(saved.days).toEqual([]);
});

test('R1: task can start, pause, resume and finish from the list without a booking', async ({ page }) => {
  await capture(page, 'Synthetic focused task');
  await page.getByRole('link', { name: 'Tasks', exact: true }).click();
  await page.getByRole('button', { name: 'Start Synthetic focused task' }).click();
  await expect(page.getByRole('button', { name: 'Pause Synthetic focused task' })).toBeVisible();
  harness.advanceClock(10 * 60000);
  await page.getByRole('button', { name: 'Pause Synthetic focused task' }).click();
  await expect(page.getByRole('button', { name: 'Resume Synthetic focused task' })).toBeVisible();
  harness.advanceClock(5 * 60000);
  await page.getByRole('button', { name: 'Resume Synthetic focused task' }).click();
  await expect(page.getByRole('button', { name: 'Pause Synthetic focused task' })).toBeVisible();
  harness.advanceClock(5 * 60000);
  await page.getByRole('button', { name: 'Mark Synthetic focused task done' }).click();
  await expect(page.getByRole('button', { name: 'Open Synthetic focused task' })).toHaveCount(0);
  const saved = await snapshot(page);
  expect(saved.blocks).toEqual([]); expect(saved.taskOutcomes).toHaveLength(1);
  expect(saved.workSessions[0].intervals).toHaveLength(2);
  await page.getByRole('link', { name: 'Review', exact: true }).click();
  await expect(page.getByLabel('Recorded day facts')).toContainText('15 min');
});

test('R1: Reset rejects a stale review, keeps its draft, then atomically pauses and moves work', async ({ page }, info) => {
  await seed(page, { type: 'task.capture', task: { id: 'chosen-a', title: 'Synthetic priority', duration: 30 } });
  await seed(page, { type: 'task.plan', task: { id: 'chosen-a' }, blockId: 'booking-a', start: at('14:00'), end: at('14:30'), acknowledgedConflictIds: [] });
  await seed(page, { type: 'block.save', block: { id: 'fixed-a', title: 'Synthetic meeting', kind: 'appointment', tag: 'Work', start: at('15:00'), end: at('15:30'), status: 'pending', notes: '' } });
  await seed(page, { type: 'session.start', target: { kind: 'task', taskId: 'chosen-a' }, plannedBlockId: 'booking-a' });
  await openPlan(page);
  await page.getByRole('button', { name: 'Reset today', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('checkbox', { name: 'Pause Synthetic priority when applying' }).check();
  await dialog.getByLabel('Change Synthetic priority').selectOption('move');
  const proposed = dialog.getByRole('group', { name: 'Proposed booking', exact: true });
  await proposed.getByLabel('Start time', { exact: true }).fill('12:00');
  await proposed.getByLabel('End time', { exact: true }).fill('12:30');
  await dialog.getByRole('button', { name: 'Review revised plan' }).click();
  await expect(dialog.getByRole('button', { name: 'Apply revised plan' })).toBeDisabled();
  await dialog.getByRole('checkbox', { name: 'Pause my current recording' }).check();
  const before = await snapshot(page);
  await seed(page, { type: 'task.capture', task: { title: 'Synthetic concurrent edit' } });
  await dialog.getByRole('button', { name: 'Apply revised plan' }).click();
  await expect(dialog.getByText('Your records changed.', { exact: false }).last()).toBeVisible();
  expect((await snapshot(page)).workSessions).toEqual(before.workSessions);
  await dialog.getByRole('button', { name: 'Review latest information' }).click();
  await expect(dialog.getByRole('button', { name: 'Apply revised plan' })).toBeDisabled();
  await dialog.getByRole('checkbox', { name: 'Pause my current recording' }).check();
  await page.screenshot({ path: info.outputPath('reset-review.png'), fullPage: true });
  await dialog.getByRole('button', { name: 'Apply revised plan' }).click();
  await expect(dialog).toHaveCount(0);
  const saved = await snapshot(page);
  expect(saved.workSessions[0].intervals[0].end).toBeDefined();
  expect(saved.blocks.find(b => b.id === 'booking-a')).toMatchObject({ status: 'missed' });
  expect(saved.blocks.find(b => b.taskId === 'chosen-a' && b.status === 'pending')?.start).toBe(at('16:00'));
  expect(saved.blocks.find(b => b.id === 'fixed-a')).toEqual(before.blocks.find(b => b.id === 'fixed-a'));
});

test('R1: task details preserve a stale draft and require a reviewed retry', async ({ page }) => {
  await seed(page, { type: 'task.capture', task: { id: 'detail-a', title: 'Synthetic detail' } });
  await page.goto(`${origin}/#/tasks`);
  await page.getByRole('button', { name: 'Open Synthetic detail', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Title', { exact: true }).fill('Synthetic retained draft');
  await seed(page, { type: 'task.capture', task: { title: 'Synthetic second writer' } });
  await dialog.getByRole('button', { name: 'Save details', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Review latest task' })).toBeVisible();
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('Synthetic retained draft');
  expect((await snapshot(page)).tasks.find(task => task.id === 'detail-a')?.title).toBe('Synthetic detail');
  await dialog.getByRole('button', { name: 'Review latest task' }).click();
  await dialog.getByRole('button', { name: 'Save details', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect((await snapshot(page)).tasks.find(task => task.id === 'detail-a')?.title).toBe('Synthetic retained draft');
});

test('R1: template preview shows overlap consent and duplicate application adds nothing', async ({ page }) => {
  await seed(page, { type: 'template.save', template: { id: 'template-a', title: 'Synthetic routine', blocks: [{ title: 'Synthetic walk', kind: 'routine', tag: 'Personal', startMinute: 600, duration: 30, notes: '' }] } });
  await seed(page, { type: 'block.save', block: { id: 'fixed-a', title: 'Synthetic meeting', kind: 'appointment', tag: 'Work', start: at('14:00'), end: at('14:30'), status: 'pending', notes: '' } });
  await openPlan(page);
  await page.getByText('Apply a day template', { exact: true }).click();
  await page.getByLabel('Day template', { exact: true }).selectOption('template-a');
  await page.getByRole('button', { name: 'Review template', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Synthetic meeting');
  await expect(dialog.getByRole('button', { name: 'Apply whole template' })).toBeDisabled();
  await dialog.getByRole('checkbox', { name: 'Keep the overlaps shown above.' }).check();
  await dialog.getByRole('button', { name: 'Apply whole template' }).click();
  await expect(dialog).toHaveCount(0);
  const saved = await snapshot(page);
  await page.getByRole('button', { name: 'Review template', exact: true }).click();
  await expect(dialog).toContainText('All entries are already applied.');
  await expect(dialog.getByRole('button', { name: 'Apply whole template' })).toBeDisabled();
  expect((await snapshot(page)).blocks).toEqual(saved.blocks);
});

test('R1: optional morning check-in, recording-aware closure and reflection persist', async ({ page }, info) => {
  await page.getByRole('banner').getByRole('button', { name: 'Start day', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Just record wake time' }).click();
  await expect(dialog.getByRole('heading', { name: 'Your day is started' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Continue to my day' }).click();
  await capture(page, 'Synthetic work to leave open');
  await page.getByRole('link', { name: 'Tasks', exact: true }).click();
  await page.getByRole('button', { name: 'Start Synthetic work to leave open' }).click();
  await expect(page.getByRole('button', { name: 'Pause Synthetic work to leave open' })).toBeVisible();
  await page.getByRole('button', { name: 'End day', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('What changed the plan? (optional)', { exact: true }).fill('Synthetic interruption');
  await dialog.getByLabel('Personal journal (optional)', { exact: true }).fill('Synthetic private note for the test.');
  await expect(dialog.getByRole('button', { name: 'End day · leave the rest' })).toBeDisabled();
  await dialog.getByRole('checkbox', { name: 'End the recordings shown above' }).check();
  await page.screenshot({ path: info.outputPath('close-day.png'), fullPage: true });
  await dialog.getByRole('button', { name: 'End day · leave the rest' }).click();
  await expect(dialog).toHaveCount(0);
  const saved = await snapshot(page);
  expect(saved.days).toHaveLength(1); expect(saved.logs).toEqual([]);
  expect(saved.days[0]).toMatchObject({ reflection: { changedPlan: 'Synthetic interruption' }, journal: 'Synthetic private note for the test.' });
  expect(saved.days[0].endedAt).toBeDefined(); expect(saved.tasks[0].status).toBe('open'); expect(saved.workSessions[0].endedAt).toBeDefined();
  await page.getByRole('link', { name: 'Review', exact: true }).click();
  await expect(page.getByText('Synthetic interruption', { exact: false })).toBeVisible();
});

for (const width of [320, 768, 1440]) test(`R1: usable navigation and planning at ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 });
  await seed(page, { type: 'task.capture', task: { id: 'task-a', title: 'Synthetic task with a deliberately long but readable title' } });
  await openPlan(page);
  for (const label of ['Today', 'Plan', 'Tasks', 'Review', 'More']) await expect(page.getByRole('link', { name: label, exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Plan today', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Choose Synthetic task with a deliberately long but readable title' }).click();
  const save = dialog.getByRole('button', { name: 'Save choices' }); await save.scrollIntoViewIfNeeded(); await expect(save).toBeInViewport();
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath(`planning-${width}.png`), fullPage: true });
  await save.click(); await expect(dialog).toHaveCount(0);
});
