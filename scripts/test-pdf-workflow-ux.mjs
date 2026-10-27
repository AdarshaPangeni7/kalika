import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import JSZip from 'jszip';
import {PDFDocument} from 'pdf-lib';
import {testServer} from './security-test-server.mjs';
const tools=['merge-pdf','split-pdf','organize-pdf','extract-pdf-pages','delete-pdf-pages','rotate-pdf','watermark-pdf','page-numbers','crop-pdf','fill-sign-pdf','pdf-to-jpg','pdf-to-text','ocr-pdf','jpg-to-pdf','document-scanner'];
const server=await testServer(),base=process.env.KALIKA_TEST_ORIGIN||server.base,browser=await chromium.launch({channel:process.platform==='win32'?'chrome':undefined,headless:true});
try{
 const context=await browser.newContext({locale:'en-US'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await mkdir('reports/pdf-workflow',{recursive:true});
 for(const slug of tools){
  await page.goto(base+'/tools/'+slug);
  assert.equal(await page.locator('h1').count(),1);
  if(!['jpg-to-pdf','document-scanner'].includes(slug))assert.equal(await page.locator('.pdf-task-steps li').count(),3,slug);
  if(['watermark-pdf','page-numbers'].includes(slug))assert.equal(await page.locator('#advanced-settings').evaluate(e=>e.open),false);
  for(const width of [1280,390]){
   await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),slug);
   const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
   assert.deepEqual(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],slug);
  }
 }
 const doc=await PDFDocument.create();for(const label of ['FIRST PAGE','SECOND PAGE'])doc.addPage([420,595]).drawText(label,{x:40,y:450,size:28});const input=Buffer.from(await doc.save());
 let downloads=0;page.on('download',()=>downloads++);
 await page.goto(base+'/tools/pdf-to-jpg');await page.locator('#file').setInputFiles({name:'example.pdf',mimeType:'application/pdf',buffer:input});await page.getByRole('button',{name:'Convert to JPG',exact:true}).click();
 await page.locator('#result a[download]').waitFor({timeout:60000});await page.locator('.pdf-result-summary').waitFor();
 assert.equal(downloads,0,'Conversion must not start a download automatically');
 assert.match(await page.locator('.pdf-download-info').innerText(),/ZIP.*KB/);
 await page.locator('.pdf-page-preview').evaluate(img=>img.decode());
 const event=page.waitForEvent('download');await page.locator('#result a[download]').click();
 const zip=await JSZip.loadAsync(await readFile(await(await event).path()));assert.equal(Object.keys(zip.files).length,2);
 for(const item of Object.values(zip.files)){const b=await item.async('uint8array');assert.equal(b[0],255);assert.equal(b[1],216);}
 await page.locator('.workspace').screenshot({path:'reports/pdf-workflow/jpg-mobile.png'});
 await page.goto(base+'/tools/watermark-pdf');await page.locator('#file').setInputFiles({name:'example.pdf',mimeType:'application/pdf',buffer:input});await page.waitForFunction(()=>document.querySelector('#pdf-editor').getAttribute('aria-busy')==='false');
 await page.locator('#create').click();await page.locator('#result a[download]').waitFor();await page.locator('.pdf-result-summary').waitFor();
 assert.match(await page.locator('.pdf-download-info').innerText(),/2 pages.*2 updated/);
 assert.equal(await page.locator('#advanced-settings').evaluate(e=>e.open),false);
 for(const width of [1280,390,320]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(result.violations.map(v=>v.id),[]);}
 await page.locator('#pdf-editor').screenshot({path:'reports/pdf-workflow/watermark-mobile.png'});
 assert.deepEqual(errors,[]);
 console.log('PASS PDF UX: 15 tool pages, 3-step instructions, closed optional settings, explicit JPG ZIP download, valid JPGs, preview, file sizes, page counts, mobile layout and axe accessibility.');
}finally{await browser.close();await server.close();}
