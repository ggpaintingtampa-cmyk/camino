import {test,expect,type Page} from '@playwright/test';
import {initialState} from '../../shared/domain';
import type {WeatherData} from '../../shared/types';

async function signIn(page:Page){
 await page.goto('/');
 await page.getByLabel('Your password').fill('caminos-fixture-password');
 await page.getByRole('button',{name:'Open my day'}).click();
 await expect(page.locator('.content')).toBeVisible();
}

test('an owner with no personal records can open every screen and journal form',async({page})=>{
 const empty={...initialState(),serverNow:'2026-09-18T14:10:00.000Z',locations:[]};
 await page.route('**/api/snapshot',route=>route.fulfill({json:empty}));
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await signIn(page);
 await expect(page.getByRole('button',{name:'Start my day',exact:true})).toBeVisible();
 for(const route of ['goals','health','rocket','money','history','reminders','weather','settings','templates','missing','tasks','more','schedule']){
  await page.goto(`/#/${route}`);
  await expect(page.locator('.content h1')).toBeVisible();
  await expect(page.getByText('A screen needs a fresh start.')).toHaveCount(0);
 }
 await page.goto('/#/health');
 await expect(page.locator('.feature-stat strong').filter({hasText:'—'})).toHaveCount(4);
 await page.goto('/#/money');
 await page.getByRole('button',{name:/Account balances/}).click();
 await expect(page.locator('.feature-account-total')).toHaveText('$0.00');
 await page.goto('/#/history');
 await page.getByRole('button',{name:'Add entry',exact:true}).click();
 await expect(page.getByLabel('Your personal journal')).toBeVisible();
 await expect(page.getByLabel('Daily factual summary')).toHaveValue('');
 await page.getByRole('button',{name:'Close',exact:true}).click();
 expect(errors).toEqual([]);
});

test('a weather outage with no earlier forecast is displayed without a date crash',async({page})=>{
 const empty={...initialState(),serverNow:'2026-09-18T14:10:00.000Z'};
 const unavailable:WeatherData={locationId:empty.locations[0].id,temperature:null,shortForecast:'Forecast unavailable',high:null,low:null,precipitation:null,fetchedAt:'',stale:true,attribution:'Weather provider',periods:[]};
 await page.route('**/api/snapshot',route=>route.fulfill({json:empty}));
 await page.route('**/api/weather?*',route=>route.fulfill({json:unavailable}));
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await signIn(page);
 await page.goto('/#/weather');
 await expect(page.locator('.secondary-weather-current').getByText('Forecast unavailable',{exact:true})).toBeVisible();
 await expect(page.getByText(/Not updated yet/)).toBeVisible();
 expect(errors).toEqual([]);
});

test('settings persist the main tab order and can restore the default order',async({page})=>{
 await signIn(page);
 await page.goto('/#/settings');
 await page.getByRole('button',{name:/Tab bar order/}).click();
 await page.getByRole('button',{name:'Move Goals earlier',exact:true}).click();
 await page.getByRole('button',{name:'Move Goals earlier',exact:true}).click();
 await page.getByRole('button',{name:'Save settings',exact:true}).click();
 await expect(page.getByRole('navigation',{name:'Main navigation'}).getByRole('link').first()).toHaveText('Goals');
 await page.reload();
 await expect(page.getByRole('navigation',{name:'Main navigation'}).getByRole('link').first()).toHaveText('Goals');
 await page.getByRole('button',{name:/Tab bar order/}).click();
 await page.getByRole('button',{name:'Move Goals later',exact:true}).click();
 await page.getByRole('button',{name:'Move Goals later',exact:true}).click();
 await page.getByRole('button',{name:'Save settings',exact:true}).click();
 await expect(page.getByRole('navigation',{name:'Main navigation'}).getByRole('link').first()).toHaveText('Home');
});
