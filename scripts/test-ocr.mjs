import assert from 'node:assert/strict';
import {readFile, mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {PDFDocument} from 'pdf-lib';
import {testServer} from './security-test-server.mjs';

const server = process.env.KALIKA_TEST_ORIGIN ? null : await testServer();
const base = process.env.KALIKA_TEST_ORIGIN || server.base;
const browser = await chromium.launch({channel: process.platform === 'win32' ? 'chrome' : undefined, headless: true});
await mkdir('reports/ocr', {recursive: true});
try {
  const page = await browser.newPage({locale: 'en-US'}), errors = [], requests = [], uploads = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => {requests.push(r.url()); if (!['GET','HEAD'].includes(r.method())) uploads.push(r.url());});
  await page.goto(base + '/tools/ocr-pdf');
  assert.equal(requests.filter(url => url.includes('/vendor/ocr/')).length, 0, 'OCR assets must not preload');
  const image = async lines => Buffer.from(await page.evaluate(lines => {
    const c = document.createElement('canvas'); c.width = 1200; c.height = 500;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0,0,c.width,c.height); ctx.fillStyle = '#111'; ctx.font = '52px Arial';
    lines.forEach((line,i) => ctx.fillText(line,60,100 + i * 100)); return c.toDataURL('image/png').split(',')[1];
  }, lines), 'base64');
  const receipt = await readFile('scripts/fixtures/ocr/eng.png');
  const setFile = async (buffer, name = 'scan.png', mimeType = 'image/png') => page.locator('#file').setInputFiles({name, mimeType, buffer});
  const run = async () => {await page.getByRole('button', {name:'Recognize text', exact:true}).click(); await page.waitForFunction(() => document.querySelector('#tool-form').getAttribute('aria-busy') === 'false', {timeout:180000}); assert.equal(await page.locator('#error').innerText(), '');};
  const download = async label => {const event = page.waitForEvent('download'); await page.getByRole('link', {name:label, exact:true}).click(); return Buffer.from(await readFile(await (await event).path()));};
  const textInPdf = async data => page.evaluate(async bytes => {
    const reader = await import('/js/vendor/pdf/pdf.min.mjs'); reader.GlobalWorkerOptions.workerSrc = '/js/vendor/pdf/pdf.worker.min.mjs';
    const pdf = await reader.getDocument({data:new Uint8Array(bytes), isEvalSupported:false}).promise, parts = [];
    for(let n=1;n<=pdf.numPages;n++)parts.push((await (await pdf.getPage(n)).getTextContent()).items.map(x=>x.str).join(' '));
    await pdf.loadingTask.destroy(); return parts.join('\n').replace(/\s+/g,' ').trim();
  }, [...data]);
  await setFile(receipt); const started = Date.now(); await run(); const englishMs = Date.now() - started;
  assert.match(await page.locator('#text-output').inputValue(), /KALIKA PRIVATE OCR/); assert.match(await page.locator('#text-output').inputValue(), /123\.45/);
  const searchable = await download('Download searchable PDF'); assert.equal((await PDFDocument.load(searchable)).getPageCount(), 1); assert.match(await textInPdf(searchable), /KALIKA PRIVATE OCR/);
  const imageCount = await page.evaluate(async bytes => {const reader=await import('/js/vendor/pdf/pdf.min.mjs'); const doc=await reader.getDocument({data:new Uint8Array(bytes)}).promise; const ops=await (await doc.getPage(1)).getOperatorList(); const count=ops.fnArray.filter(x=>[reader.OPS.paintImageXObject,reader.OPS.paintInlineImageXObject].includes(x)).length;await doc.loadingTask.destroy();return count;},[...searchable]);assert.ok(imageCount>0,'searchable PDF must keep a visible scan image');
  const visiblePixels = await page.evaluate(async bytes => {
    const reader=await import('/js/vendor/pdf/pdf.min.mjs'),doc=await reader.getDocument({data:new Uint8Array(bytes)}).promise,p=await doc.getPage(1),viewport=p.getViewport({scale:1});
    const canvas=document.createElement('canvas');canvas.id='ocr-pdf-render-check';canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);document.body.append(canvas);
    const ctx=canvas.getContext('2d');await p.render({canvasContext:ctx,viewport}).promise;const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let dark=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]<100&&pixels[i+1]<100&&pixels[i+2]<100)dark++;await doc.loadingTask.destroy();return dark;
  },[...searchable]);assert.ok(visiblePixels>1000,'downloaded searchable PDF must visibly render the printed scan');
  await page.locator('#ocr-pdf-render-check').screenshot({path:'reports/ocr/searchable-pdf-render.png'});await page.locator('#ocr-pdf-render-check').evaluate(e=>e.remove());
  assert.match((await download('Download text file')).toString('utf8'), /123\.45/);
  await page.locator('#text-output').fill('Reviewed receipt: 123.45'); assert.equal((await download('Download text file')).toString('utf8'), 'Reviewed receipt: 123.45');
  await page.screenshot({path:'reports/ocr/english-result.png',fullPage:true});
  const scanned = await PDFDocument.create();
  for(const label of ['FIRST PAGE ALPHA','SECOND PAGE BETA']) {const png=await scanned.embedPng(await image([label,'A clear printed document.']));const p=scanned.addPage([600,250]);p.drawImage(png,{x:0,y:0,width:600,height:250});}
  const scannedBytes=Buffer.from(await scanned.save()); assert.equal((await textInPdf(scannedBytes)).trim(),'');
  await setFile(scannedBytes,'scanned.pdf','application/pdf'); await page.locator('#page-range').fill('2, 1'); await run();
  let result=await page.locator('#text-output').inputValue(); assert.ok(result.indexOf('SECOND PAGE BETA')<result.indexOf('FIRST PAGE ALPHA'));
  const ordered=await download('Download searchable PDF');assert.equal((await PDFDocument.load(ordered)).getPageCount(),2);result=await textInPdf(ordered);assert.ok(result.indexOf('SECOND PAGE BETA')<result.indexOf('FIRST PAGE ALPHA'));
  await page.locator('#page-range').fill('2,2'); await page.getByRole('button',{name:'Recognize text',exact:true}).click(); await page.waitForFunction(()=>document.querySelector('#tool-form').getAttribute('aria-busy')==='false');assert.match(await page.locator('#error').innerText(),/same page twice/);assert.equal(await page.locator('#result a').count(),0);
  await setFile(Buffer.from('broken'),'broken.pdf','application/pdf');await page.getByRole('button',{name:'Recognize text',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#tool-form').getAttribute('aria-busy')==='false');assert.match(await page.locator('#error').innerText(),/not a readable PDF/);
  // Language recognition is real, using all shipped models rather than mocked text.
  for(const [language,lines,expected] of [
    ['fra',['Bonjour Kalika','Une facture pour votre dossier.'],/Bonjour/],
    ['spa',['Hola Kalika','Una factura para sus documentos.'],/Hola/],
    ['hin',['नमस्ते भारत','यह एक परीक्षण है'],/नमस्ते/],
    ['nep+eng',['नमस्ते नेपाल','यो एउटा परीक्षण हो'],/नेपाल/],
    ['chi_sim',['你好世界','这是一份文件'],/你好/],
  ]) {await setFile(await readFile('scripts/fixtures/ocr/'+language.split('+')[0]+'.png'));await page.locator('#language').selectOption(language);await page.locator('#searchable-pdf').uncheck();await run();assert.match(await page.locator('#text-output').inputValue(),expected,language);assert.equal(await page.getByRole('link',{name:'Download searchable PDF',exact:true}).count(),0);}
  assert.equal(await page.evaluate(()=>indexedDB.databases().then(x=>x.length)),0,'OCR must not create document or model IndexedDB storage');
  await setFile(await image([]));await page.locator('#language').selectOption('eng');await page.locator('#searchable-pdf').check();await run();assert.match(await page.locator('#status').innerText(),/text recognized on 0/);assert.equal(await page.getByRole('link',{name:'Download searchable PDF',exact:true}).count(),0,'blank input must not be called searchable');
  await page.getByRole('button',{name:'Clear document and text',exact:true}).click();assert.equal(await page.locator('#text-output').inputValue(),'');assert.equal(await page.locator('#result a').count(),0);
  for(const width of [390,320]) {await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`reports/ocr/mobile-${width}.png`,fullPage:true});}
  // Cancel while the worker/model is loading; no orphan result and retry works.
  const cancelPage=await browser.newPage();await cancelPage.route('**/vendor/ocr/worker.min.js',async route=>{await new Promise(r=>setTimeout(r,1500));await route.continue().catch(()=>{});});await cancelPage.goto(base+'/tools/ocr-pdf');await cancelPage.locator('#file').setInputFiles({name:'scan.png',mimeType:'image/png',buffer:receipt});await cancelPage.getByRole('button',{name:'Recognize text',exact:true}).click();await cancelPage.waitForFunction(()=>document.querySelector('#status').textContent.includes('Loading the OCR engine'));await cancelPage.getByRole('button',{name:'Cancel',exact:true}).click();await cancelPage.waitForFunction(()=>document.querySelector('#tool-form').getAttribute('aria-busy')==='false');assert.match(await cancelPage.locator('#status').innerText(),/cancelled/);assert.equal(await cancelPage.locator('#result a').count(),0);await cancelPage.unroute('**/vendor/ocr/worker.min.js');await cancelPage.getByRole('button',{name:'Recognize text',exact:true}).click();await cancelPage.waitForFunction(()=>document.querySelector('#tool-form').getAttribute('aria-busy')==='false',null,{timeout:180000});assert.match(await cancelPage.locator('#text-output').inputValue(),/KALIKA/);await cancelPage.close();
  // Failure to load an engine dependency is recoverable, not an endless spinner.
  const failure=await browser.newPage();await failure.route('**/vendor/ocr/core/**',route=>route.abort());await failure.goto(base+'/tools/ocr-pdf');await failure.locator('#file').setInputFiles({name:'scan.png',mimeType:'image/png',buffer:receipt});await failure.getByRole('button',{name:'Recognize text',exact:true}).click();await failure.waitForFunction(()=>document.querySelector('#tool-form').getAttribute('aria-busy')==='false',null,{timeout:30000});assert.notEqual(await failure.locator('#error').innerText(),'');assert.equal(await failure.locator('#result a').count(),0);await failure.close();
  const restricted=await browser.newPage();await restricted.addInitScript(()=>{CanvasRenderingContext2D.prototype.getImageData=()=>{throw new DOMException('Blocked','SecurityError');};});await restricted.goto(base+'/tools/ocr-pdf');await restricted.locator('#file').setInputFiles({name:'scan.png',mimeType:'image/png',buffer:receipt});await restricted.getByRole('button',{name:'Recognize text',exact:true}).click();await restricted.waitForFunction(()=>document.querySelector('#tool-form').getAttribute('aria-busy')==='false');assert.match(await restricted.locator('#error').innerText(),/blocking or changing image pixels/);assert.equal(await restricted.locator('#result a').count(),0);await restricted.close();
  assert.deepEqual(errors,[]);assert.deepEqual(uploads,[]);assert.ok(requests.filter(u=>u.includes('/vendor/ocr/')).every(u=>new URL(u).origin===new URL(base).origin));
  console.log(`PASS: real OCR in six language choices; scanned PDF page order; visible/searchable PDF; reviewed TXT; invalid ranges/files; cancel/retry and engine failure; no uploads/IndexedDB; lazy first-party assets; mobile. English fixture ${englishMs} ms on this test machine.`);
} finally {await browser.close();await server?.close();}
