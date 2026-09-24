import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {calculateTip,amount} from '../public/js/tip-calculator-core.js';
const calculate=overrides=>calculateTip({bill:'100',tax:'10',rate:'20',people:'3',...overrides});
assert.deepEqual(calculate(),{bill:10000,tax:1000,base:9000,rate:20,calculatedTip:1800,rounding:0,tip:1800,total:11800,people:3,low:3933,high:3934,highCount:1,lowCount:2});
assert.equal(calculate({base:'full-bill'}).total,12000);
assert.equal(calculate({bill:'0.05',tax:'',rate:'10'}).calculatedTip,1);
assert.equal(calculate({bill:'85,50',tax:'',rate:'12,5'}).calculatedTip,1069);
assert.equal(calculate({bill:'85.50',tax:'',rate:'12.5',round:true}).total,9700);
assert.equal(calculate({bill:'100',tax:'0',rate:'0',round:true}).rounding,0);
assert.equal(calculate({bill:'0',tax:'0',rate:'0',people:'100'}).total,0);
assert.equal(calculate({bill:'1000000',tax:'0',rate:'100',people:'100'}).total,200000000);
assert.equal(amount('.5'),50);assert.equal(amount('1.'),100);
for(const bad of ['', '-1','NaN','Infinity','1e3','1,000','1.001','1 000','1000000.01','1,2,3'])assert.throws(()=>calculate({bill:bad}));
for(const patch of [{tax:'101'},{tax:'-1'},{rate:''},{rate:'-1'},{rate:'100.01'},{rate:'1.001'},{people:'0'},{people:'101'},{people:'1.5'},{people:'abc'},{base:'other'}])assert.throws(()=>calculate(patch));
for(let cents=0;cents<333;cents++)for(const people of [1,2,3,7,13,100]){const r=calculate({bill:(cents/100).toFixed(2),tax:'',rate:'17.25',people:String(people),round:cents%2===0});assert.equal(r.low*r.lowCount+r.high*r.highCount,r.total);assert.equal(r.bill+r.calculatedTip+r.rounding,r.total);}
const root=path.resolve('public'),server=createServer(async(req,res)=>{try{let p=new URL(req.url,'http://localhost').pathname;if(!path.extname(p))p+='.html';const file=path.resolve(root,'.'+p);if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',/\.m?js$/.test(p)?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=process.env.KALIKA_TEST_ORIGIN||`http://127.0.0.1:${server.address().port}`;
await mkdir('reports/tip-calculator-tests',{recursive:true});const browser=await chromium.launch({channel:process.platform==='win32'?'chrome':undefined,headless:true});
try{const context=await browser.newContext({locale:'en-US',permissions:['clipboard-read','clipboard-write']}),page=await context.newPage(),errors=[],uploads=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(['POST','PUT'].includes(r.method())&&new URL(r.url()).pathname!=='/cdn-cgi/rum')uploads.push(r.url());});await page.goto(base+'/tools/tip-calculator');const go=()=>page.getByRole('button',{name:'Calculate split',exact:true}).click();
 await go();assert.match(await page.locator('#error').innerText(),/Bill total/);await page.locator('#bill').fill('100');await page.locator('#tax').fill('10');await page.locator('#tip-rate').fill('20');await page.locator('#people').fill('3');await go();assert.equal(await page.locator('#error').innerText(),'');assert.match(await page.locator('#result').innerText(),/118\.00/);assert.match(await page.locator('.tip-split').innerText(),/1 person pays \$39\.34 and 2 people pay \$39\.33/);
 await page.locator('#copy-result').click();await page.waitForFunction(()=>document.getElementById('copy-status').textContent.length>0);assert.equal(await page.locator('#copy-status').innerText(),'Summary copied.');const copied=await page.evaluate(()=>navigator.clipboard.readText());assert.match(copied,/Total: \$118\.00/);
 await page.locator('#bill').fill('85,50');assert.equal(await page.locator('#result').innerText(),'');assert.equal(await page.locator('#copy-result').isDisabled(),true);await page.locator('#tax').fill('');await page.locator('#tip-rate').fill('12,5');await page.locator('#round-total').check();await go();assert.match(await page.locator('#result').innerText(),/97\.00/);assert.match(await page.locator('#result').innerText(),/0\.81/);
 for(const currency of ['EUR','GBP','CAD','AUD','CHF','USD']){await page.locator('#currency').selectOption(currency);await go();assert.match(await page.locator('#result').innerText(),new RegExp(currency+' is a display currency'));assert.match(await page.locator('#result').innerText(),/97\.00/);}
 await page.getByRole('button',{name:'Set tip to 0%',exact:true}).click();assert.equal(await page.locator('#tip-rate').inputValue(),'0');await page.locator('#round-total').uncheck();await go();assert.match(await page.locator('#result').innerText(),/85\.50/);
 await page.locator('#tip-base').selectOption('full-bill');await page.locator('#bill').fill('100');await page.locator('#tax').fill('10');await page.locator('#tip-rate').fill('20');await go();assert.match(await page.locator('#result').innerText(),/120\.00/);
 await page.locator('#tax').fill('101');await go();assert.match(await page.locator('#error').innerText(),/cannot exceed/);assert.equal(await page.locator('#result').innerText(),'');
 await page.getByRole('button',{name:'Reset',exact:true}).click();assert.equal(await page.locator('#bill').inputValue(),'');assert.equal(await page.locator('#tip-rate').inputValue(),'15');assert.equal(await page.locator('#people').inputValue(),'2');assert.equal(await page.locator('#error').innerText(),'');
 await page.locator('#bill').fill('100');await page.locator('#bill').press('Enter');assert.match(await page.locator('#result').innerText(),/115\.00/);
 for(const width of [1280,390,320]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`reports/tip-calculator-tests/${width}.png`,fullPage:true});}
 assert.deepEqual(errors,[]);assert.deepEqual(uploads,[]);await writeFile('reports/tip-calculator-tests/result.json',JSON.stringify({passed:true,base,exactCentSplits:true,taxAndRounding:true,currencies:true,clipboard:true,mobile:true,errors,uploads},null,2));console.log('Tip calculator: exact cent splits, tax, rounding, rates, boundaries, validation, currencies, clipboard, mobile and no upload tests passed.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
