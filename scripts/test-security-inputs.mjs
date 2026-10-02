import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {testServer} from './security-test-server.mjs';
const server=await testServer(),browser=await chromium.launch({channel:process.platform==='win32'?'chrome':undefined,headless:true});
try{
 const context=await browser.newContext({locale:'en-US'}),page=await context.newPage(),errors=[],violations=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r));
 await page.exposeFunction('recordViolation',v=>violations.push(v));
 await page.addInitScript(()=>document.addEventListener('securitypolicyviolation',e=>window.recordViolation(e.effectiveDirective+': '+e.blockedURI)));
 let bad=false;
 await page.route('https://api.frankfurter.dev/**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(bad?{rate:'<img src=x onerror=alert(1)>',date:'2026-10-01'}:{rate:1.2,date:'2026-10-01'})}));
 await page.route('https://open.er-api.com/**',r=>r.fulfill({contentType:'application/json',body:'{"result":"success","base_code":"USD","time_last_update_unix":1e300,"rates":{"EUR":"bad"}}'}));
 const manifest=JSON.parse(await readFile('config/security-manifest.json'));
 for(const route of Object.keys(manifest.pages)){
  const response=await page.goto(server.base+route);assert.equal(response.status(),200,route);
  if(!route.includes('yandex_'))assert.equal(await page.locator('h1').count(),1,route);
 }
 const xss='<img src=x onerror=alert(1)> مرحبا नमस्ते .*+?^${}()|[]\\';
 for(const slug of ['case-converter','space-remover','duplicate-line-remover','text-reverser','find-replace','text-to-slug']){
  await page.goto(server.base+'/tools/'+slug);await page.locator('#text').fill(xss);
  if(slug==='find-replace'){await page.locator('#find').fill('.*+?^${}()|[]\\');await page.locator('#replacement').fill('$& <script>alert(1)</script>');}
  await page.locator('button[type=submit]').click();assert.equal(await page.locator('#error').innerText(),'');assert.equal(await page.locator('#result img,#result script').count(),0);
  if(slug==='find-replace')assert.match(await page.locator('#output-text').inputValue(),/\$& <script>/);
  await page.locator('#text').evaluate(el=>{el.value='a'.repeat(200001);});await page.locator('button[type=submit]').click();assert.match(await page.locator('#error').innerText(),/200,000/);
  await page.locator('#text').fill('');await page.locator('button[type=submit]').click();assert.notEqual(await page.locator('#error').innerText(),'');
 }
 await page.goto(server.base+'/tools/word-counter');await page.locator('#text').evaluate(el=>{el.value='न'.repeat(200001);el.dispatchEvent(new Event('input'));});assert.match(await page.locator('#error').innerText(),/200,000/);
 await page.goto(server.base+'/tools/currency-converter');await page.waitForFunction(()=>!document.querySelector('button[type=submit]').disabled);
 bad=true;await page.locator('button[type=submit]').click();await page.waitForFunction(()=>!document.querySelector('button[type=submit]').disabled);assert.match(await page.locator('#result').innerText(),/last available rate/);
 await page.reload();await page.waitForFunction(()=>!document.querySelector('button[type=submit]').disabled);assert.match(await page.locator('#error').innerText(),/temporarily unreachable/);
 const before=requests.length;await page.locator('#from').evaluate(el=>{el.add(new Option('Bad','../../bad'));el.value='../../bad';});await page.locator('button[type=submit]').click();assert.match(await page.locator('#error').innerText(),/three-letter/);assert.equal(requests.length,before);
 await page.goto(server.base+'/tools/image-resizer');
 const huge=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=5001;c.height=5000;return c.toDataURL('image/png').split(',')[1];});
 await page.locator('#file').setInputFiles({name:'<img onerror=alert(1)>.png',mimeType:'image/png',buffer:Buffer.from(huge,'base64')});
 await page.locator('button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('#error').textContent.length>0);assert.match(await page.locator('#error').innerText(),/24 megapixels/);assert.equal(await page.locator('#files img').count(),0);
 await page.goto(server.base+'/tools/pdf-to-text');await page.locator('#file').setInputFiles({name:'large.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(31*1024*1024)});await page.locator('button[type=submit]').click();assert.match(await page.locator('#error').innerText(),/30 MB/);
 const missing=await page.goto(server.base+'/not-found-%3Cscript%3E');assert.equal(missing.status(),404);assert.doesNotMatch(await page.locator('body').innerText(),/not-found-|<script>/);
 assert.deepEqual(errors,[]);assert.deepEqual([...new Set(violations)],[]);
 assert.equal(requests.filter(r=>['POST','PUT'].includes(r.method())).length,0);
 assert.equal(requests.filter(r=>/googletagmanager|google-analytics/.test(r.url())).length,0);
 assert.equal((await context.cookies()).length,0);
 console.log(`PASS: ${Object.keys(manifest.pages).length} pages with enforced CSP; literal/XSS/RTL/Nepali/empty/long input, bad API data/codes, oversized PDF/image, safe 404, no analytics or uploads.`);
}finally{await browser.close();await server.close();}
