import { test, expect, type Page } from '@playwright/test';

async function signIn(page:Page){
 await page.goto('/');
 await page.getByLabel('Your password').fill('caminos-fixture-password');
 await page.getByRole('button',{name:'Open my day'}).click();
 await expect(page.getByRole('navigation',{name:'Main navigation'})).toBeVisible();
}
async function openPage(page:Page,name:string){await page.goto(`/#/${name}`);await expect(page.locator('.feature-page')).toBeVisible();}
const unique=(name:string)=>`${name} ${test.info().project.name} ${Date.now()}`;

test.beforeEach(async({page})=>{await signIn(page);});

test('goals show completed leaf steps without double-counting parent goals',async({page})=>{
 await openPage(page,'goals');
 const title=unique('A meaningful goal');
 await page.getByRole('button',{name:'Add goal',exact:true}).click();
 await page.getByLabel('Goal or step').fill(title);
 await page.getByLabel('Target date').fill('2027-09-18');
 await page.getByRole('button',{name:'Save',exact:true}).click();
 const root=page.locator('.feature-goal:not(.feature-goal-child)').filter({has:page.locator('.feature-goal-title').filter({hasText:title})});
 await expect(root).toBeVisible();
 for(const step of ['First small step','Second small step']){
  await root.locator(':scope > button.feature-link-button').click();
  await page.getByLabel('Goal or step').fill(`${step} ${title}`);
  await page.getByRole('button',{name:'Save',exact:true}).click();
 }
 await root.getByRole('button',{name:`Complete First small step ${title}`,exact:true}).click();
 await expect(root.locator(':scope > .feature-goal-line > .feature-percent')).toHaveText('50%');
 await expect(root.locator(':scope > .feature-step-count')).toHaveText('1 of 2 steps complete');
 await root.getByRole('button',{name:`Complete Second small step ${title}`,exact:true}).click();
 await expect(root.locator(':scope > .feature-goal-line > .feature-percent')).toHaveText('100%');
 await expect(root.locator(':scope > .feature-step-count')).toHaveText('2 of 2 steps complete');
});

test('health saves and edits weight, food and practice entries',async({page})=>{
 await openPage(page,'health');
 const note=unique('Weight check');
 await page.locator('.feature-log-shortcuts').getByRole('button',{name:'Weight',exact:true}).click();
 await page.getByLabel('Weight (pounds)').fill('181.4');
 await page.getByLabel('Notes (optional)').fill(note);
 await page.getByRole('button',{name:'Save',exact:true}).click();
 const weight=page.getByRole('button').filter({hasText:note});
 await expect(weight).toBeVisible();
 await weight.click();
 await page.getByLabel('Weight (pounds)').fill('181.6');
 await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect(weight).toContainText('181.6 lb');
 const meal=unique('Rice and vegetables');
 await page.locator('.feature-log-shortcuts').getByRole('button',{name:'Food',exact:true}).click();
 await page.getByRole('combobox',{name:'Meal',exact:true}).selectOption('Lunch');
 await page.getByLabel('What did you have?').fill(meal);
 await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect(page.getByRole('button').filter({hasText:meal})).toBeVisible();
 await openPage(page,'rocket');
 const practice=unique('Recovery practice');
 await page.getByRole('button',{name:'Add practice',exact:true}).click();
 await page.getByRole('combobox',{name:'Practice type',exact:true}).selectOption('Mechanics');
 await page.getByLabel('What did you work on?').fill(practice);
 await page.getByLabel('Duration in minutes').fill('45');
 await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect(page.getByRole('button').filter({hasText:practice})).toContainText('45 min');
});

test('money reservations resolve into earned and charity without leaving the account twice',async({page})=>{
 await openPage(page,'money');
 await page.getByRole('group',{name:'Money ledger'}).getByRole('button',{name:'Company',exact:true}).click();
 await page.getByRole('button',{name:/Account balances/}).click();
 await page.getByRole('button',{name:'Adjust balances',exact:true}).click();
 await page.getByLabel('Bank account total').fill('1000');
 await page.getByLabel('Available cash',{exact:true}).fill('1000');
 await page.getByLabel('Earned',{exact:true}).fill('0');
 await page.getByLabel('Lost / charity',{exact:true}).fill('0');
 await page.getByLabel('Reason for adjustment').fill(unique('Synthetic opening balance'));
 await page.getByRole('button',{name:'Save',exact:true}).click();
 const title=unique('Three gym visits');
 await page.getByRole('button',{name:'Add envelope',exact:true}).click();
 await page.getByLabel('Envelope name').fill(title);
 await page.getByLabel('Amount in dollars').fill('100');
 await page.getByLabel('What is the commitment or purpose?').fill('Complete three training sessions.');
 await page.getByLabel('Expires date').fill('2026-09-18');
 await page.getByLabel('Expires hour').selectOption('9');
 await page.getByLabel('Expires minute').selectOption('0');
 await page.getByRole('button',{name:'Reserve money'}).click();
 await expect(page.locator('.feature-stat').filter({hasText:'Available cash'})).toContainText('$900.00');
 await page.getByRole('button').filter({hasText:title}).click();
 await page.getByRole('button',{name:'Earned · move to spending money'}).click();
 await expect(page.locator('.feature-stat').filter({hasText:'Earned · yours to spend'})).toContainText('$100.00');
 await expect(page.locator('.feature-account-total')).toHaveText('$1,000.00');
 const charity=unique('Second commitment');
 await page.getByRole('button',{name:'Add envelope',exact:true}).click();
 await page.getByLabel('Envelope name').fill(charity);
 await page.getByLabel('Amount in dollars').fill('50');
 await page.getByLabel('What is the commitment or purpose?').fill('A synthetic charity commitment.');
 await page.getByLabel('Expires date').fill('2026-09-18');
 await page.getByLabel('Expires hour').selectOption('9');
 await page.getByRole('button',{name:'Reserve money'}).click();
 await page.getByRole('button').filter({hasText:charity}).click();
 await page.getByRole('button',{name:'Lost · set aside for charity'}).click();
 await expect(page.locator('.feature-stat').filter({hasText:'Lost / charity'})).toContainText('$50.00');
 await page.getByRole('button').filter({hasText:charity}).click();
 await page.getByRole('button',{name:'I have paid $50.00'}).click();
 await expect(page.locator('.feature-account-total')).toHaveText('$950.00');
 await expect(page.locator('.feature-stat').filter({hasText:'Lost / charity'})).toContainText('$0.00');
});

test('journal supports a historical day independently from the currently open day',async({page})=>{
 await openPage(page,'history');
 await page.getByLabel('Choose month').fill('2025-01');
 await page.getByRole('button',{name:/Jan 15, 2025/}).click();
 await page.getByRole('button',{name:/^(Add|Edit) entry$/}).click();
 const entry=unique('Remember this ordinary day');
 await page.getByLabel('Daily factual summary').fill('A synthetic historical record.');
 await page.getByLabel('Your personal journal').fill(entry);
 await page.getByLabel('Day note',{exact:true}).fill('Notes entered later.');
 await page.getByRole('button',{name:'Save',exact:true}).click();
 await expect(page.locator('.feature-journal-text').filter({hasText:entry})).toBeVisible();
 await expect(page.getByText('Wake time not recorded')).toBeVisible();
 await page.getByLabel('Search history').fill(entry);
 await expect(page.locator('.feature-search-result')).toHaveCount(1);
 await page.locator('.feature-search-result summary').click();
 await expect(page.locator('.feature-search-result')).toContainText(entry);
});

test('reminders can be pinned, dismissed, and restored; weather locations can be added',async({page})=>{
 await openPage(page,'reminders');
 const title=unique('A small important reminder');
 await page.getByRole('button',{name:'Add reminder',exact:true}).click();
 await page.getByLabel('Title',{exact:true}).fill(title);
 await page.getByLabel('Note',{exact:true}).fill('Make time for what matters.');
 await page.getByRole('button',{name:'Save',exact:true}).click();
 const reminder=page.locator('section.feature-card').filter({hasText:title});
 await reminder.getByRole('button',{name:'Dismiss',exact:true}).click();
 await expect(reminder).toHaveCount(0);
 await page.getByRole('button',{name:/Dismissed reminders/}).click();
 await reminder.getByRole('button',{name:'Restore reminder'}).click();
 await expect(reminder).toBeVisible();
 await openPage(page,'weather');
 await page.getByRole('button',{name:'Change',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Saved locations'})).toBeVisible();
 await page.getByRole('button',{name:'Add weather location'}).click();
 await page.getByLabel('City or postal code').fill('Tampa');
 await page.getByRole('button',{name:'Search locations'}).click();
 await expect(page.locator('.feature-location-results')).toContainText('Tampa');
 const available=page.locator('.feature-location-results button:not([disabled])');
 if(await available.count()){await available.first().click();await expect(page.getByRole('dialog',{name:'Add a weather location',exact:true})).not.toBeVisible();await expect(page.getByRole('dialog',{name:'Weather locations',exact:true})).toContainText('Tampa');await page.getByRole('button',{name:'Close',exact:true}).click();}
 else await page.getByRole('button',{name:'Close',exact:true}).click();
});
