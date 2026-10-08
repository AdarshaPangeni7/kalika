import assert from 'node:assert/strict';
import {mkdir,readdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {testServer} from './security-test-server.mjs';
const server=await testServer(),base=process.env.KALIKA_TEST_ORIGIN||server.base;
const browser=await chromium.launch({channel:process.platform==='win32'?'chrome':undefined});
await mkdir('reports/category-hubs',{recursive:true});
try {
 const page=await browser.newPage({locale:'en-US'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const cases=[['image-tools','Image Tools',4,2,'50 KB'],['calculators','Calculators',10,3,'tax'],['text-tools','Text Tools',11,5,'NEPALI']];
 for(const [slug,label,count,groups,query] of cases){
  assert.equal((await page.goto(base+'/'+slug)).status(),200);
  assert.equal(await page.locator('[data-hub-card]').count(),count);
  assert.equal(await page.locator('[data-hub-group]').count(),groups);
  await page.locator('#hub-search').fill(query);assert.ok(await page.locator('[data-hub-card]:visible').count()>0,query);
  await page.locator('#hub-search').fill('zzzz-no-tool');assert.equal(await page.locator('[data-hub-card]:visible').count(),0);assert.equal(await page.locator('[data-hub-group]:visible').count(),0);assert.ok(await page.locator('#hub-empty').isVisible());
  await page.locator('#hub-clear').click();assert.equal(await page.locator('[data-hub-card]:visible').count(),count);assert.equal(await page.locator('#hub-clear').isVisible(),false);
  for(const href of await page.locator('main a[href]').evaluateAll(a=>[...new Set(a.map(x=>x.getAttribute('href')))]))assert.equal((await page.request.get(base+href)).status(),200,href);
  for(const width of [1280,390,320]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),slug);if(width!==320)await page.screenshot({path:`reports/category-hubs/${slug}-${width}.png`,fullPage:true});}
 }
 const targets=[...cases.map(([slug,label])=>['/'+slug,label,'Tools']),['/pdf-tools','PDF Tools','Tools']];
 for(const file of await readdir('public/guides'))if(file.endsWith('.html')&&file!=='index.html')targets.push(['/guides/'+file.slice(0,-5),null,'Guides']);
 for(const [route,label,parent] of targets){await page.goto(base+route);const nav=page.locator('nav[aria-label="Breadcrumb"]');assert.equal(await nav.count(),1);const actual=label||await page.locator('h1').innerText();assert.equal(await nav.locator('[aria-current="page"]').innerText(),actual);assert.deepEqual(await nav.locator('a').allTextContents(),['Home',parent]);const schema=JSON.parse(await page.locator('script[data-breadcrumb-schema]').textContent());assert.deepEqual(schema.itemListElement.map(x=>x.name),['Home',parent,actual]);assert.deepEqual(schema.itemListElement.map(x=>x.position),[1,2,3]);assert.equal(schema.itemListElement[2].item,'https://kalikatools.com'+route);}
 assert.deepEqual(errors,[]);console.log('PASS: three hub searches, empty/reset states, groups, all links, desktop/mobile layout, and matching accessible/structured breadcrumbs on four categories and nine guides.');
}finally{await browser.close();await server.close();}
