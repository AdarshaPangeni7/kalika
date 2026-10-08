import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {convert,LIMIT} from '../public/js/serbian-engine.js';
import {testServer} from './security-test-server.mjs';
const fixtures=[
 ['abvgdđežzijk l m n o p r s t ć u f h c č š','абвгдђежзијк л м н о п р с т ћ у ф х ц ч ш'],
 ['Ljubav Njegoš Džep LJUBAV NJEGOŠ DŽEP','Љубав Његош Џеп ЉУБАВ ЊЕГОШ ЏЕП'],
 ['injekcija Injekcije INJEKCIJA konjugacija konjunkcija Tanjug nadživeti','инјекција Инјекције ИНЈЕКЦИЈА конјугација конјункција Танјуг надживети'],
 ['djevojka dj đ nadžak','дјевојка дј ђ наџак'],
 ['Čačak, Ćuprija; Đorđe Šuma Žena.\r\n123\t🙂','Чачак, Ћуприја; Ђорђе Шума Жена.\r\n123\t🙂'],
 ['c\u030C s\u030C z\u030C','ч ш ж'],
 ['Mešano Љубав i ljubav','Мешано Љубав и љубав'],
 ['Naziv [[OpenAI]] https://example.com/ljubav?nj=1 hello@example.rs www.example.com','Назив OpenAI https://example.com/ljubav?nj=1 hello@example.rs www.example.com']
];
for(const [input,expected]of fixtures)assert.equal(convert(input).text,expected,input);
assert.equal(convert('Љубав ЉУБАВ Његош ЊЕГОШ Џеп ЏЕП','latin').text,'Ljubav LJUBAV Njegoš NJEGOŠ Džep DŽEP');
assert.equal(convert('[[a\nb]] test').text,'a\nb тест');
assert.equal(convert('[[n]]j').text,'nј');
assert.equal(convert('нj').text,'нј');
assert.equal(convert('[[unfinished').unclosedProtection,true);
assert.equal(convert('a'.repeat(LIMIT)).text.length,LIMIT);
assert.throws(()=>convert('a'.repeat(LIMIT+1)),RangeError);
assert.equal(convert('<script>alert("x")</script>').text,'<сцрипт>алерт("x")</сцрипт>');
const protectedResult=convert('Zdravo [[OpenAI]]');assert.equal(convert(protectedResult.protectedText,'latin').text,'Zdravo OpenAI');
for(const [input]of fixtures.slice(0,5))assert.equal(convert(convert(input).text,'latin').text,input);
const start=performance.now();convert('Ljubav i injekcija.\n'.repeat(5000));assert.ok(performance.now()-start<2000,'100k CPU budget');
const server=await testServer(),base=process.env.KALIKA_TEST_ORIGIN||server.base;
const browser=await chromium.launch({channel:process.platform==='win32'?'chrome':undefined});
try{
 const context=await browser.newContext({permissions:['clipboard-read','clipboard-write'],locale:'en-US'});
 const page=await context.newPage(),errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(base))external.push(r.url());});
 assert.equal((await page.goto(base+'/tools/serbian-latin-cyrillic')).status(),200);
 await page.locator('#convert-serbian').click();assert.match(await page.locator('#serbian-status').innerText(),/Unesite tekst/);
 const input=page.locator('#serbian-input'),output=page.locator('#serbian-output');
 await input.fill('Ljubav [[OpenAI]] hello@example.com');await page.locator('#convert-serbian').click();assert.equal(await output.inputValue(),'Љубав OpenAI hello@example.com');
 await page.locator('#copy-serbian').click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'Љубав OpenAI hello@example.com');
 const download=page.waitForEvent('download');await page.locator('#download-serbian').click();const file=await download;assert.equal(file.suggestedFilename(),'kalika-cirilica.txt');assert.equal(await readFile(await file.path(),'utf8'),'Љубав OpenAI hello@example.com');
 await page.locator('#swap-serbian').click();assert.equal(await output.inputValue(),'Ljubav OpenAI hello@example.com');assert.match(await input.inputValue(),/\[\[OpenAI\]\]/);
 await page.locator('#clear-serbian').click();assert.equal(await output.inputValue(),'');assert.ok(await page.locator('#copy-serbian').isDisabled());await page.locator('#undo-serbian').click();assert.equal(await output.inputValue(),'Ljubav OpenAI hello@example.com');
 await page.locator('#to-cyrillic').click();await input.fill('Hello svet');await input.evaluate(e=>e.setSelectionRange(0,5));await page.locator('#protect-selection').click();assert.equal(await output.inputValue(),'Hello свет');
 await page.locator('#ui-cyrillic').click();assert.equal(await page.locator('html').getAttribute('lang'),'sr-Cyrl');assert.match(await page.locator('#copy-serbian').innerText(),/Копирај/);assert.equal(await output.inputValue(),'Hello свет');await page.locator('#ui-latin').click();assert.equal(await page.locator('html').getAttribute('lang'),'sr-Latn');
 await input.fill('a'.repeat(LIMIT+1));await page.locator('#convert-serbian').click();assert.equal((await input.inputValue()).length,LIMIT+1);assert.equal(await output.inputValue(),'');assert.ok(await page.locator('#download-serbian').isDisabled());assert.match(await page.locator('#serbian-status').innerText(),/100.000/);
 await input.fill('<img src=x onerror=alert(1)>');await page.locator('#convert-serbian').click();assert.equal(await page.locator('.serbian-tool img').count(),0);
 await page.locator('#example-serbian').click();
 await mkdir('reports/serbian',{recursive:true});
 for(const width of [1280,390,320]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`layout ${width}`);await page.screenshot({path:`reports/serbian/converter-${width}.png`,fullPage:true});}
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
 for(const href of await page.locator('a[href^="/"]').evaluateAll(a=>[...new Set(a.map(e=>e.getAttribute('href')))]))assert.equal((await page.request.get(base+href)).status(),200,href);
 const graph=JSON.parse(await page.locator('script[type="application/ld+json"]').textContent())['@graph'];const faq=graph.find(x=>x['@type']==='FAQPage').mainEntity;assert.equal(faq.length,await page.locator('details').count());assert.deepEqual(faq.map(x=>x.acceptedAnswer.text),await page.locator('details p').allTextContents());
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log('PASS Serbian engine fixtures, case, exceptions, protected passages, links, Unicode, limits, performance, copy/download, swap/undo, selection, script display, XSS safety, mobile, accessibility, schema and links; no external requests or JS errors.');
}finally{await browser.close();await server.close();}
