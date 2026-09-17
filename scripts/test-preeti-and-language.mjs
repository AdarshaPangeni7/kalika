import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';
import {toPreeti,toUnicode} from '../public/js/preeti-converter.js';
// Independent known encoded examples, not merely encoder/decoder agreement.
const fixtures=[['g]kfnL efiff','नेपाली भाषा'],['gd:t]','नमस्ते'],['lzIff / ;+:s[lt','शिक्षा र संस्कृति'],['sf7df08"','काठमाण्डू'],['k|Llt','प्रीति'],['sfo{s|d','कार्यक्रम'],['ljBfyL{','विद्यार्थी'],['>LdfG','श्रीमान्'],['pmhf{','ऊर्जा'],['If]q','क्षेत्र'],['1fg','ज्ञान'],['lqe\'jg','त्रिभुवन'],['låtLo','द्वितीय'],[')!@#$%^&*(','०१२३४५६७८९'],['c cf O O{ p pm C P P] cf] cf}','अ आ इ ई उ ऊ ऋ ए ऐ ओ औ']];
for(const [encoded,unicode]of fixtures){assert.equal(toUnicode(encoded),unicode,encoded);assert.equal(toPreeti(unicode),encoded,unicode);}
for(const word of ['काठमाडौं','किर्ति','कीर्ति','राष्ट्र','प्रकृति','स्वास्थ्य','अर्थ','सम्पूर्ण','सूर्य','फूल','कृष्ण','दृष्टि','संस्कृति','र्कि','र्क्षि','स्त्री','क्','क्ष्','श्र्','ज्ञ्','क ख ग घ ङ च छ ज झ ञ ट ठ ड ढ ण त थ द ध न प फ ब भ म य र ल व श ष स ह','(नेपाल) / नेपाल? + नेपाल.'])assert.equal(toUnicode(toPreeti(word)),word,word);
assert.equal(toUnicode('g]kfn\r\ng]kfn\tनेपाल'),'नेपाल\r\nनेपाल\tनेपाल');assert.equal(toPreeti('Hello नेपाल'),'Hello g]kfn');assert.equal(toUnicode(''),'');assert.equal(toPreeti(''),'');
const large='शिक्षा र संस्कृति\n'.repeat(2000);assert.equal(toUnicode(toPreeti(large)),large);
for(const a of 'कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह')for(const b of 'कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह')for(const v of ['','ा','ि','ी','ु','ू','ृ','े','ै','ो','ौ','ं','ँ']){const s=a+'्'+b+v;assert.equal(toUnicode(toPreeti(s)),s,s);}
const root=path.resolve('public');const server=createServer(async(req,res)=>{try{let p=new URL(req.url,'http://localhost').pathname;if(p==='/')p='/index.html';if(!path.extname(p))p+='.html';const f=path.resolve(root,'.'+p);if(!f.startsWith(root+path.sep))throw Error();const body=await readFile(f);res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'application/octet-stream');res.end(body);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.KALIKA_CHROME_EXECUTABLE||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined),headless:true});
try{
 const context=await browser.newContext({locale:'en-US',timezoneId:'Asia/Kathmandu',permissions:['clipboard-read','clipboard-write']});const page=await context.newPage(),errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(base))external.push(r.url());});
 await page.goto(base+'/tools/preeti-unicode-converter');assert.equal(await page.locator('html').getAttribute('lang'),'en');
 await page.getByRole('button',{name:'Convert text',exact:true}).click();assert.match(await page.locator('#conversion-status').innerText(),/Enter some text/);
 await page.getByRole('button',{name:'Try example',exact:true}).click();assert.equal(await page.locator('#preeti-output').inputValue(),'नेपाली भाषा\nशिक्षा र संस्कृति');
 await page.getByRole('button',{name:'Copy result',exact:true}).click();assert.equal((await page.evaluate(()=>navigator.clipboard.readText())).replaceAll('\r\n','\n'),'नेपाली भाषा\nशिक्षा र संस्कृति');
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download .txt',exact:true}).click();const dl=await pending;assert.equal(dl.suggestedFilename(),'kalika-unicode.txt');assert.equal(await readFile(await dl.path(),'utf8'),'नेपाली भाषा\nशिक्षा र संस्कृति');
 await page.getByRole('button',{name:'Swap direction',exact:true}).click();assert.equal(await page.locator('#preeti-output').inputValue(),'g]kfnL efiff\nlzIff / ;+:s[lt');assert.ok(await page.locator('#preeti-note').isVisible());
 await page.locator('#preeti-input').fill('नमस्ते');assert.ok(await page.getByRole('button',{name:'Copy result',exact:true}).isDisabled());await page.getByRole('button',{name:'Convert text',exact:true}).click();assert.equal(await page.locator('#preeti-output').inputValue(),'gd:t]');
 await page.locator('#preeti-input').fill('क'.repeat(50001));await page.getByRole('button',{name:'Convert text',exact:true}).click();assert.match(await page.locator('#conversion-status').innerText(),/50,000/);assert.equal(await page.locator('#preeti-input').inputValue(),'क'.repeat(50001));assert.ok(await page.getByRole('button',{name:'Download .txt',exact:true}).isDisabled());
 await page.getByRole('button',{name:'Clear',exact:true}).click();await page.getByRole('button',{name:'Try example',exact:true}).click();
 await mkdir('reports',{recursive:true});for(const width of [1280,390]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`reports/preeti-${width}.png`,fullPage:true});}
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);await context.close();
 for(const [locale,timezoneId,expected]of [['en-US','Asia/Kathmandu','en'],['en-IN','Asia/Kolkata','en'],['en-GB','Europe/Paris','en'],['fr-FR','Asia/Kathmandu','fr'],['hi-IN','Europe/London','hi'],['zh-CN','America/New_York','zh'],['es-ES','Asia/Kathmandu','es'],['ne-NP','Asia/Kathmandu','en']]){
  const c=await browser.newContext({locale,timezoneId});const p=await c.newPage();await p.addInitScript(()=>localStorage.setItem('kalika-language','hi'));await p.goto(base+'/');assert.equal(await p.locator('html').getAttribute('lang'),expected,locale+' '+timezoneId);assert.equal(await p.locator('.language-picker select').inputValue(),'auto');await c.close();
 }
 const c=await browser.newContext({locale:'en-US',timezoneId:'Asia/Kathmandu'});const p=await c.newPage();await p.goto(base+'/');await p.locator('.language-picker select').selectOption('fr');await p.reload();assert.equal(await p.locator('html').getAttribute('lang'),'fr');await p.locator('.language-picker select').selectOption('auto');await p.reload();assert.equal(await p.locator('html').getAttribute('lang'),'en');await p.goto(base+'/?lang=es');assert.equal(await p.locator('html').getAttribute('lang'),'es');await c.close();
 const blocked=await browser.newContext({locale:'en-US'});const bp=await blocked.newPage();await bp.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('storage blocked')};Storage.prototype.setItem=()=>{throw Error('storage blocked')};});await bp.goto(base+'/');assert.equal(await bp.locator('html').getAttribute('lang'),'en');assert.equal(await bp.locator('.language-picker select').inputValue(),'auto');await blocked.close();
 console.log('PASS Preeti known fixtures, conjuncts, vowel placement, round trips, long input, copy/download, stale output, limits, mobile layout, no external requests or JS errors. PASS device language, ignored old preferences, manual override, auto mode, blocked storage and region independence.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
