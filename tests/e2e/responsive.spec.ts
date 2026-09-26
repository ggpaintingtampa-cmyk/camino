import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const routes=['home','schedule','goals','health','rocket','money','history','reminders','weather','settings','templates','missing','tasks','more'];
for(const width of [320,390,768,1280]) {
 test(`all screens remain usable at ${width}px`,async({page})=>{
  test.setTimeout(90000);
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.setViewportSize({width,height:width>=1100?900:844});
  await page.goto('/');
  await page.getByLabel('Your password').fill('caminos-fixture-password');
  await page.getByRole('button',{name:'Open my day'}).click();
  await expect(page.locator('.content')).toBeVisible();
  mkdirSync('artifacts/verification',{recursive:true});
  for(const route of routes){
   await page.goto(`/#/${route}`);
   await expect(page.locator('.content h1')).toBeVisible();
   await page.locator('.content').evaluate(element=>{element.scrollTop=0;});
   await expect(page.getByText('A screen needs a fresh start.')).toHaveCount(0);
   const overflow=await page.evaluate(()=>({document:document.documentElement.scrollWidth-document.documentElement.clientWidth,content:(document.querySelector('.content')?.scrollWidth??0)-(document.querySelector('.content')?.clientWidth??0)}));
   expect(overflow.document,`${route} overflows the document at ${width}px`).toBeLessThanOrEqual(1);
   expect(overflow.content,`${route} overflows the content at ${width}px`).toBeLessThanOrEqual(1);
   if(width>=1100)await expect(page.locator('.sidebar')).toBeVisible();
   else await expect(page.getByRole('navigation',{name:'Main navigation'})).toBeVisible();
   if((width===390||width===1280)&&(['home','schedule'].includes(route)||(width===390&&['goals','health','money','history'].includes(route)))){
    if(route==='home')await expect(page.locator('.weather-temp')).toContainText('82°');
    if(route==='schedule')await page.getByRole('button',{name:'Now',exact:true}).click();
    await page.screenshot({path:`artifacts/verification/${route}-${test.info().project.name}-${width}.png`,fullPage:true});
   }
  }
  expect(errors).toEqual([]);
 });
}
