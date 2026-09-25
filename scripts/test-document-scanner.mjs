import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {PDFDocument} from 'pdf-lib';
import {detect,fullCorners,validCorners,warp,filter,homography} from '../public/js/scanner-engine.js';

// Geometric correctness and pixel sampling, independent of UI implementation.
const q=[{x:12,y:8},{x:88,y:19},{x:76,y:91},{x:5,y:79}],m=homography(q);
for(const [i,[u,v]]of [[0,[0,0]],[1,[1,0]],[2,[1,1]],[3,[0,1]]]){const z=m[6]*u+m[7]*v+1;assert.ok(Math.abs((m[0]*u+m[1]*v+m[2])/z-q[i].x)<1e-6);assert.ok(Math.abs((m[3]*u+m[4]*v+m[5])/z-q[i].y)<1e-6);}
assert.equal(validCorners([q[0],q[2],q[1],q[3]],100,100),false);
const pixels=new Uint8ClampedArray(100*100*4);for(let y=0;y<100;y++)for(let x=0;x<100;x++){const k=(y*100+x)*4;pixels[k]=x;pixels[k+1]=y;pixels[k+2]=30;pixels[k+3]=255;}
const transformed=warp(pixels,100,100,q);for(const [i,k]of [[0,0],[1,(transformed.width-1)*4],[2,(transformed.width*transformed.height-1)*4],[3,(transformed.height-1)*transformed.width*4]]){assert.ok(Math.abs(transformed.data[k]-q[i].x)<=1);assert.ok(Math.abs(transformed.data[k+1]-q[i].y)<=1);}
assert.throws(()=>warp(pixels,100,100,[q[0],q[2],q[1],q[3]]));
const blank=new Uint8ClampedArray(100*100*4).fill(255);assert.equal(detect(blank,100,100).detected,false);
for(const mode of ['gray','bw','magic']){const data=filter(pixels.slice(),100,100,mode);assert.equal(data.length,pixels.length);if(mode==='gray'||mode==='bw')for(let i=0;i<data.length;i+=4){assert.equal(data[i],data[i+1]);assert.equal(data[i+1],data[i+2]);if(mode==='bw')assert.ok(data[i]===0||data[i]===255);}}

const root=path.resolve('public'),server=createServer(async(req,res)=>{try{let p=new URL(req.url,'http://localhost').pathname;if(p==='/')p='/index.html';if(!path.extname(p))p+='.html';const f=path.resolve(root,'.'+p);if(!f.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',p.endsWith('.js')||p.endsWith('.mjs')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'application/octet-stream');res.end(await readFile(f));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=process.env.KALIKA_TEST_ORIGIN||`http://127.0.0.1:${server.address().port}`;
await mkdir('reports/scanner-tests',{recursive:true});const browser=await chromium.launch({channel:process.platform==='win32'?'chrome':undefined,headless:true});
try{
 const page=await browser.newPage({locale:'en-US'}),errors=[],uploads=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(['POST','PUT','PATCH'].includes(r.method())&&!r.url().includes('/cdn-cgi/rum'))uploads.push(r.url());if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(base).origin)external.push(r.url());});
 await page.goto(base+'/tools/document-scanner');
 const fixture=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=900;c.height=1000;const g=c.getContext('2d');g.fillStyle='#37424d';g.fillRect(0,0,c.width,c.height);g.fillStyle='#faf6e8';g.beginPath();g.moveTo(155,95);g.lineTo(785,160);g.lineTo(715,915);g.lineTo(80,820);g.closePath();g.fill();g.fillStyle='#14242c';g.font='bold 48px sans-serif';g.fillText('SCAN TEST',205,245);for(let i=0;i<8;i++)g.fillRect(190,320+i*48,410-i*12,7);g.fillStyle='#14784f';g.fillRect(200,740,100,45);return c.toDataURL('image/png').split(',')[1];});
 const input={name:'document.png',mimeType:'image/png',buffer:Buffer.from(fixture,'base64')};await writeFile('reports/scanner-tests/input.png',input.buffer);
 const wait=()=>page.waitForFunction(()=>document.querySelector('#scanner').getAttribute('aria-busy')==='false');
 const add=async(files)=>{await page.locator('#scan-files').setInputFiles(files);await wait();assert.equal(await page.locator('#error').innerText(),'');};
 await add(input);assert.equal(await page.locator('.scanner-page').count(),1);
 const position=await page.locator('.scanner-corner').first().getAttribute('style');assert.match(position,/left: 1[5678]/); // real detector, within ~3% of the known paper corner
 await page.locator('#scan-filter').selectOption('magic');await page.locator('#apply-scan').click();await wait();
 await page.screenshot({path:'reports/scanner-tests/desktop.png',fullPage:true});
 const download=async()=>{const waiting=page.waitForEvent('download');await page.locator('#result a[download]').click();const d=await waiting;return Buffer.from(await readFile(await d.path()));};
 await page.locator('#export-jpg').click();await wait();const jpg=await download();assert.equal(jpg.readUInt16BE(0),0xffd8);await writeFile('reports/scanner-tests/scan.jpg',jpg);
 const imgSize=async()=>page.locator('#scan-preview').evaluate(async img=>{await img.decode();return [img.naturalWidth,img.naturalHeight];});
 const before=await imgSize();await page.locator('#rotate-scan').click();await page.locator('#apply-scan').click();await wait();const after=await imgSize();assert.deepEqual(after,[before[1],before[0]]);
 await page.locator('#scan-angle').fill('12.5');await page.locator('#scan-angle').dispatchEvent('input');await page.locator('#scan-filter').selectOption('bw');await page.locator('#apply-scan').click();await wait();assert.match(await page.locator('#preview-note').innerText(),/12.5/);
 await page.locator('#reset-crop').click();const corner=page.getByRole('button',{name:'Top left crop corner',exact:true});await corner.focus();await corner.press('Shift+ArrowRight');assert.match(await corner.getAttribute('style'),/left: 1\./);
 await corner.scrollIntoViewIfNeeded();const box=await page.locator('#crop-canvas').boundingBox(),handleBox=await corner.boundingBox();await page.mouse.move(handleBox.x+handleBox.width/2,handleBox.y+handleBox.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.06,box.y+box.height*.04,{steps:5});await page.mouse.up();assert.match(await corner.getAttribute('style'),/left: [56]/);
 await page.locator('#apply-scan').click();await wait();
 await add({...input,name:'second.png'});await page.getByRole('button',{name:'Move up page 2',exact:true}).click();await wait();assert.match(await page.locator('.scanner-page').first().innerText(),/second.png/);
 await page.locator('#scan-format').selectOption('letter');await page.locator('#scan-orientation').selectOption('portrait');await page.locator('#export-all').click();await wait();const pdf=await PDFDocument.load(await download());assert.equal(pdf.getPageCount(),2);assert.deepEqual(pdf.getPage(0).getSize(),{width:612,height:792});
 // Render actual output PDFs in the browser to verify the embedded image isn't blank/corrupt.
 const pdfBytes=await pdf.save();await writeFile('reports/scanner-tests/scans.pdf',pdfBytes);
 const rendered=await page.evaluate(async bytes=>{const lib=await import('/js/vendor/pdf/pdf.min.mjs');lib.GlobalWorkerOptions.workerSrc='/js/vendor/pdf/pdf.worker.min.mjs';const doc=await lib.getDocument({data:new Uint8Array(bytes)}).promise;const p=await doc.getPage(1),v=p.getViewport({scale:.5}),c=document.createElement('canvas');c.width=v.width;c.height=v.height;await p.render({canvasContext:c.getContext('2d'),viewport:v}).promise;const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let dark=0,colored=0;for(let i=0;i<data.length;i+=4){if(data[i]<100)dark++;if(Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2])>35)colored++;}const second=await doc.getPage(2),v2=second.getViewport({scale:.5});c.width=v2.width;c.height=v2.height;await second.render({canvasContext:c.getContext('2d'),viewport:v2}).promise;const d2=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let coloredSecond=0;for(let i=0;i<d2.length;i+=4)if(Math.max(d2[i],d2[i+1],d2[i+2])-Math.min(d2[i],d2[i+1],d2[i+2])>35)coloredSecond++;await doc.destroy();return {dark,colored,coloredSecond};},[...pdfBytes]);assert.ok(rendered.dark>100);assert.ok(rendered.colored>50);assert.equal(rendered.coloredSecond,0);
 await page.locator('#export-page').click();await wait();assert.equal((await PDFDocument.load(await download())).getPageCount(),1);
 await page.getByRole('button',{name:'Remove page 2',exact:true}).click();await wait();assert.equal(await page.locator('.scanner-page').count(),1);
 for(const width of [390,320]){await page.setViewportSize({width,height:850});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`reports/scanner-tests/mobile-${width}.png`,fullPage:true});}
 await page.locator('#clear-scans').click();assert.equal(await page.locator('.scanner-page').count(),0);assert.equal(await page.locator('#export-all').isDisabled(),true);
 await page.locator('#scan-files').setInputFiles({name:'bad.png',mimeType:'image/png',buffer:Buffer.from('bad data')});await wait();assert.match(await page.locator('#error').innerText(),/decoded/);
 await page.locator('#scan-files').setInputFiles(Array.from({length:21},(_,i)=>({...input,name:`${i}.png`})));await wait();assert.match(await page.locator('#error').innerText(),/20 pages/);
 await page.goto(base+'/tools/jpg-to-pdf');await add(input);assert.equal(await page.locator('#scan-editor').isVisible(),false);
 await page.locator('#export-jpg').click();await wait();assert.equal((await download()).readUInt16BE(0),0xffd8);
 await page.locator('#export-all').click();await wait();assert.equal((await PDFDocument.load(await download())).getPageCount(),1);
 await page.getByRole('button',{name:'Crop & enhance page 1',exact:true}).click();await wait();assert.equal(await page.locator('#scan-editor').isVisible(),true);assert.match(await page.locator('.scanner-corner').first().getAttribute('style'),/left: 0%/);
 await page.locator('#detect-scan').click();await wait();assert.match(await page.locator('.scanner-corner').first().getAttribute('style'),/left: 1[5678]/);
 await page.locator('#scan-filter').selectOption('gray');await page.locator('#export-all').click();await wait();assert.equal((await PDFDocument.load(await download())).getPageCount(),1);assert.match(await page.locator('#preview-note').innerText(),/Grayscale/);
 await page.locator('#scan-angle').fill('999');await page.locator('#export-all').click();await wait();assert.match(await page.locator('#error').innerText(),/rotation angle/);
 // Cloudflare injects its existing performance beacon on production pages.
 // Allow only that known GET asset; scanner libraries and document processing stay local.
 const scannerExternalRequests=external.filter(url=>{const u=new URL(url);return !(u.origin==='https://static.cloudflareinsights.com'&&u.pathname.startsWith('/beacon.min.js/'));});
 assert.deepEqual(errors,[]);assert.deepEqual(uploads,[]);assert.deepEqual(scannerExternalRequests,[]);
 // Verify the existing PDF-to-JPG result's new optional scanner recommendation.
 await page.goto(base+'/tools/pdf-to-jpg');await page.locator('#file').setInputFiles({name:'scans.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdfBytes)});await page.locator('button[type="submit"]').click();await page.locator('#result a[href="/tools/document-scanner"]').waitFor({timeout:60000});assert.equal(await page.locator('#error').innerText(),'');assert.deepEqual(errors,[]);assert.deepEqual(uploads,[]);
 await writeFile('reports/scanner-tests/result.json',JSON.stringify({passed:true,base,errors,uploads,scannerExternalRequests,hostingBeaconRequests:external.filter(url=>url.startsWith('https://static.cloudflareinsights.com/')).length,pdfPages:2,sourceCornersDetected:true},null,2));
 console.log('Scanner detection, homography pixels, filters, rotate, manual crop, order, removal, decoded exports, invalid input, mobile layout and no upload tests passed.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
