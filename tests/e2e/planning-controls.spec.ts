import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import react from '@vitejs/plugin-react';
import { createServer, type ViteDevServer } from 'vite';

// Isolated component verification. Persisted journeys remain a separate integration gate.
let fixtureServer: ViteDevServer | undefined;
let fixtureURL: string;

test.beforeAll(async () => {
  fixtureServer = await createServer({
    configFile: false,
    root: fileURLToPath(new URL('../../', import.meta.url)),
    plugins: [react()],
    server: { host: '127.0.0.1', port: 0 },
    logLevel: 'error',
  });
  await fixtureServer.listen();
  const address = fixtureServer.httpServer!.address();
  if (!address || typeof address === 'string') throw new Error('Component fixture requires a loopback port.');
  fixtureURL = `http://127.0.0.1:${address.port}/tests/fixtures/planning-controls.html`;
});

test.afterAll(async () => { await fixtureServer?.close(); });
test.beforeEach(async ({ page }) => { await page.goto(fixtureURL); });

test('R1: choose without an estimate, reorder with keyboard, and retain choices while adding a task', async ({ page }) => {
  await page.getByRole('button', { name: 'Choose Prepare sample proposal', exact: true }).click();
  await page.getByRole('button', { name: 'Choose Read sample notes', exact: true }).click();
  const notes = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Read sample notes' }) });
  await expect(notes).toContainText('Estimate not set');
  await notes.getByRole('button', { name: 'Make main task', exact: true }).click();
  await page.getByRole('button', { name: 'Move Read sample notes earlier', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status').filter({ hasText: 'moved to priority' })).toHaveText('Read sample notes moved to priority 1.');
  await expect(page.getByLabel('Selection draft')).toHaveText('{"taskIds":["beta","alpha"],"mainTaskId":"beta"}');
  await page.getByRole('button', { name: 'Create a task', exact: true }).click();
  await expect(page.getByLabel('Selection draft')).toHaveText('{"taskIds":["beta","alpha"],"mainTaskId":"beta"}');
  await expect(page.getByRole('button', { name: 'Choose New synthetic task', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remove Read sample notes from plan', exact: true }).click();
  await expect(page.getByLabel('Selection draft')).toHaveText('{"taskIds":["alpha"]}');
  await expect(page.getByRole('button', { name: 'Choose Read sample notes', exact: true })).toBeVisible();
  await expect(page.getByLabel('Callback events')).toHaveText('["create"]');
});

test('R1: clock-change errors stay visible and the owner can correct the exact minute', async ({ page }) => {
  await page.getByLabel('Start date', { exact: true }).fill('2026-03-08');
  await page.getByLabel('End date', { exact: true }).fill('2026-03-08');
  await page.getByLabel('Start time', { exact: true }).fill('02:30');
  await expect(page.getByRole('alert')).toContainText('clocks move forward');
  await expect(page.getByLabel('Start time', { exact: true })).toHaveValue('02:30');
  await expect(page.getByLabel('Start time', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Start time', { exact: true }).fill('03:17');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByLabel('Start time', { exact: true })).toHaveValue('03:17');
  await expect(page.getByLabel('Callback events')).toHaveText('[]');
});

test('R1: Reset cancel does not apply, and confirmation belongs to the reviewed preview', async ({ page }) => {
  await page.getByRole('button', { name: 'reset', exact: true }).click();
  await expect(page.getByText('Tomorrow · untimed', { exact: true })).toBeVisible();
  await expect(page.getByText('Sample appointment · 4:00–4:30 PM · unchanged')).toBeVisible();
  const apply = page.getByRole('button', { name: 'Apply revised plan', exact: true });
  await expect(apply).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByLabel('Callback events')).toHaveText('["cancel-reset"]');
  await page.getByRole('checkbox', { name: 'Pause my current recording' }).check();
  await page.getByRole('button', { name: 'Replace preview', exact: true }).click();
  await expect(apply).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Pause my current recording' }).check();
  await apply.click();
  await expect(page.getByLabel('Callback events')).toHaveText('["cancel-reset","apply:13"]');
});

test('R1: closure leaves backlog collapsed, preserves writing, and requires the shown recording confirmation', async ({ page }) => {
  await page.getByRole('button', { name: 'close', exact: true }).click();
  await expect(page.getByText('Synthetic backlog task 1', { exact: true })).toBeHidden();
  await page.getByLabel('What changed the plan? (optional)', { exact: true }).fill('Edited synthetic reflection.');
  await page.getByLabel('What would make tomorrow easier? (optional)', { exact: true }).fill('Edited synthetic next-day note.');
  await page.getByLabel('Personal journal (optional)', { exact: true }).fill('Edited synthetic journal.');
  const close = page.getByRole('button', { name: 'End day · leave the rest', exact: true });
  await expect(close).toBeDisabled();
  await page.getByRole('button', { name: 'Keep day open', exact: true }).click();
  await page.getByRole('button', { name: 'close', exact: true }).click();
  await expect(page.getByLabel('What changed the plan? (optional)', { exact: true })).toHaveValue('Edited synthetic reflection.');
  await expect(page.getByLabel('What would make tomorrow easier? (optional)', { exact: true })).toHaveValue('Edited synthetic next-day note.');
  await expect(page.getByLabel('Personal journal (optional)', { exact: true })).toHaveValue('Edited synthetic journal.');
  await page.getByRole('checkbox', { name: 'End the recordings shown above' }).focus();
  await page.keyboard.press('Space');
  await close.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Callback events')).toHaveText('["keep-open","close:false"]');
});

test('R1: template preview shows conflicts and already applied entries before applying', async ({ page }) => {
  await page.getByRole('button', { name: 'template', exact: true }).click();
  await expect(page.getByText('Already applied · no duplicate will be added', { exact: true })).toBeVisible();
  await expect(page.getByText('Overlap: Sample appointment, 2:15–2:45 PM (fixed)')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apply whole template', exact: true })).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Keep the overlaps shown above.' }).check();
  await page.getByRole('button', { name: 'Apply whole template', exact: true }).click();
  await expect(page.getByLabel('Callback events')).toHaveText('["template:12"]');
  await expect(page.getByRole('button', { name: 'Apply whole template', exact: true })).toBeDisabled();
  await expect(page.getByText('All entries are already applied.', { exact: true })).toBeVisible();
});

test('R1: pending-save controls cannot change a draft or submit another intent', async ({ page }) => {
  await page.getByLabel('Test pending save', { exact: true }).check();
  await expect(page.getByRole('button', { name: 'Choose Prepare sample proposal', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Start time', { exact: true })).toBeDisabled();
  for (const tab of ['plan', 'reset', 'close', 'template']) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    await expect(page.locator('.planning-v3-footer button:enabled')).toHaveCount(0);
  }
  await expect(page.getByLabel('Callback events')).toHaveText('[]');
});

test('R1: Plan today accepts an unestimated choice without a planning window or main task', async ({ page }) => {
  await page.getByRole('button', { name: 'plan', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Planning window', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Choose Read sample notes', exact: true }).click();
  await page.getByRole('button', { name: 'Save choices', exact: true }).click();
  await expect(page.getByLabel('Callback events')).toHaveText('["save-plan:12"]');
  await expect(page.getByLabel('Plan draft')).toContainText('"selection":{"taskIds":["beta"]}');
  await expect(page.getByLabel('Plan draft')).toContainText('"useWindow":false');
  await expect(page.getByLabel('Plan draft')).toContainText('"startTime":""');
});

test('R1: an incomplete optional window cannot save, and hiding it preserves its draft', async ({ page }) => {
  await page.getByRole('button', { name: 'plan', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Choose my available time' }).check();
  await page.getByLabel('Start date', { exact: true }).fill('2026-09-28');
  await page.getByLabel('Start time', { exact: true }).fill('08:30');
  await page.getByRole('button', { name: 'Save choices', exact: true }).click();
  await expect(page.getByRole('alert').first()).toContainText('Choose both dates and times.');
  await expect(page.getByLabel('Callback events')).toHaveText('[]');
  await page.getByRole('checkbox', { name: 'Choose my available time' }).uncheck();
  await page.getByRole('checkbox', { name: 'Choose my available time' }).check();
  await expect(page.getByLabel('Start time', { exact: true })).toHaveValue('08:30');
  await page.getByLabel('End date', { exact: true }).fill('2026-09-28');
  await page.getByLabel('End time', { exact: true }).fill('15:30');
  await page.getByRole('button', { name: 'Save choices', exact: true }).click();
  await expect(page.getByLabel('Callback events')).toHaveText('["save-plan:12"]');
});

for (const width of [320, 390, 768, 1440]) {
  test(`R1: controls fit ${width}px and End day remains reachable with an expanded backlog`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    for (const tab of ['choices', 'plan', 'reset', 'close', 'template']) {
      await page.getByRole('button', { name: tab, exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const undersized = await page.locator('.planning-v3 button').evaluateAll(buttons => buttons.filter(button => button.getBoundingClientRect().height < 44).length);
      expect(undersized).toBe(0);
    }
    await page.getByRole('button', { name: 'close', exact: true }).click();
    await page.getByText('Other backlog (24)', { exact: true }).click();
    const close = page.getByRole('button', { name: 'End day · leave the rest', exact: true });
    await close.scrollIntoViewIfNeeded();
    await expect(close).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`close-${width}.png`), fullPage: true });
    if (width === 390 || width === 1440) {
      await page.getByRole('button', { name: 'reset', exact: true }).click();
      await page.screenshot({ path: testInfo.outputPath(`reset-${width}.png`), fullPage: true });
    }
  });
}

test('R1: 200% text stays within a narrow screen and closure stays keyboard reachable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await page.getByRole('button', { name: 'close', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByLabel('Personal journal (optional)', { exact: true }).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'End day · leave the rest', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Callback events')).toHaveText('["close:false"]');
});
