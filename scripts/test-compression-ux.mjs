import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {PDFDocument} from 'pdf-lib';
import {testServer} from './security-test-server.mjs';
const server=await testServer(),browser=await chromium.launch({channel:process.platform==='win32'?'chrome':undefined,headless:true});
try{
 const context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage();
 await page.goto(server.base+'/tools/compress-pdf');
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1000;c.height=1200;const g=c.getContext('2d'),d=g.createImageData(c.width,c.height);let seed=1;for(let i=0;i<d.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;d.data[i]=seed&255;d.data[i+1]=(seed>>>8)&255;d.data[i+2]=(seed>>>16)&255;d.data[i+3]=255;}g.putImageData(d,0,0);g.fillStyle='white';g.fillRect(30,30,940,180);g.fillStyle='black';g.font='32px sans-serif';g.fillText('SAMPLE INSURANCE SCHEDULE',65,95);g.fillText('Policyholder: Example Person',65,150);return c.toDataURL('image/png').split(',')[1];});
 const pdf=await PDFDocument.create(),img=await pdf.embedPng(Buffer.from(png,'base64'));
 pdf.addPage([500,600]).drawImage(img,{x:0,y:0,width:500,height:600});
 await page.locator('#file').setInputFiles({name:'sample-insurance.pdf',mimeType:'application/pdf',buffer:Buffer.from(await pdf.save())});
 await page.getByRole('button',{name:'Compress PDF',exact:true}).click();
 await page.getByRole('link',{name:'Download compressed PDF',exact:true}).waitFor({timeout:60000});
 assert.equal(await page.locator('.compression-sizes dd').count(),3);
 assert.match(await page.locator('.compression-saving').innerText(),/% smaller/);
 assert.notEqual(await page.locator('#file').inputValue(),'');
 await mkdir('reports/compression-refresh',{recursive:true});
 for(const width of [1280,390,320]){
  await page.setViewportSize({width,height:1000});
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#workspace').screenshot({path:`reports/compression-refresh/${width}.png`});
 }
 console.log('PASS compression UX: explicit download, real savings, filename retained, mobile layout and axe accessibility.');
}finally{await browser.close();await server.close();}
