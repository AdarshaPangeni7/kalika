import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {discount,salesTax,percentage} from '../public/js/shopping-calculator-core.js';
assert.equal(discount({price:'100',rate:'20',extra:'10',voucher:'5'}).final,6700);
assert.equal(discount({price:'100',rate:'20',extra:'10'}).effective,28);
assert.equal(discount({price:'.05',rate:'10'}).first,1);
assert.equal(discount({price:'0',rate:'100',extra:'100'}).final,0);
assert.equal(discount({price:'1000000',rate:'100'}).saving,100000000);
assert.equal(discount({price:'100,50',rate:'10,5'}).final,8995);
assert.deepEqual(salesTax({price:'100',rate:'20',mode:'add'}),{net:10000,tax:2000,gross:12000,rate:20,mode:'add'});
assert.equal(salesTax({price:'120',rate:'20',mode:'remove'}).net,10000);
assert.equal(salesTax({price:'100',rate:'8.875',mode:'add'}).gross,10888);
assert.equal(salesTax({price:'.05',rate:'10',mode:'add'}).tax,1);
assert.equal(salesTax({price:'0.01',rate:'100',mode:'remove'}).net,1);
assert.equal(percentage('8,875'),88750n);
for(const value of ['','-1','100.0001','1.12345','NaN','1e2','1,2,3'])assert.throws(()=>percentage(value));
for(const value of ['','-1','1000000.01','1.001','1,000'])assert.throws(()=>discount({price:value,rate:'20'}));
assert.throws(()=>discount({price:'10',rate:'50',voucher:'6'}));assert.throws(()=>salesTax({price:'100',rate:'20',mode:'invalid'}));
for(let cents=0;cents<500;cents++)for(const rate of ['0','0.0001','8.875','20','100']){for(const mode of ['add','remove']){const r=salesTax({price:(cents/100).toFixed(2),rate,mode});assert.equal(r.net+r.tax,r.gross);assert.ok(r.tax>=0);}const r=discount({price:(cents/100).toFixed(2),rate,extra:'10'});assert.equal(r.final+r.first+r.second+r.fixed,r.original);assert.equal(r.final+r.saving,r.original);}
const root=path.resolve('public'),server=createServer(async(req,res)=>{try{let p=new URL(req.url,'http://localhost').pathname;if(!path.extname(p))p+='.html';const f=path.resolve(root,'.'+p);if(!f.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',/\.m?js$/.test(p)?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'application/octet-stream');res.end(await readFile(f));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=process.env.KALIKA_TEST_ORIGIN||`http://127.0.0.1:${server.address().port}`;
await mkdir('reports/shopping-tests',{recursive:true});const browser=await chromium.launch({channel:process.platform==='win32'?'chrome':undefined,headless:true});
try{
 const context=await browser.newContext({locale:'en-US',permissions:['clipboard-read','clipboard-write']}),page=await context.newPage(),errors=[],uploads=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(['POST','PUT'].includes(r.method())&&new URL(r.url()).pathname!=='/cdn-cgi/rum')uploads.push(r.url());});
 const run=()=>page.locator('button[type=submit]').click(),value=key=>page.locator(`[data-result="${key}"] strong`).innerText();
 for(const slug of ['discount-calculator','sales-tax-calculator']){
  await page.goto(base+'/tools/'+slug);await run();assert.notEqual(await page.locator('#error').innerText(),'');await page.locator('#price').fill('100');await page.locator('#rate').fill('20');
  if(slug==='discount-calculator'){await page.locator('#extra').fill('10');await page.locator('#voucher').fill('5');await run();assert.equal(await value('final'),'$67.00');assert.equal(await value('saving'),'$33.00');assert.equal(await value('effective'),'33.00%');}
  else{await run();assert.equal(await value('gross'),'$120.00');await page.locator('#mode').selectOption('remove');assert.equal(await page.locator('#price-label').innerText(),'Price including tax');assert.equal(await page.locator('#result').innerText(),'');await page.locator('#price').fill('120');await run();assert.equal(await value('net'),'$100.00');assert.equal(await value('tax'),'$20.00');}
  assert.equal(await page.locator('#error').innerText(),'');await page.locator('#copy-result').click();await page.waitForFunction(()=>document.getElementById('copy-status').textContent==='Summary copied.');assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/Kalika/);
  for(const currency of ['EUR','GBP','CAD','AUD','CHF','USD']){await page.locator('#currency').selectOption(currency);assert.equal(await page.locator('#copy-result').isDisabled(),true);await run();assert.match(await page.locator('#result').innerText(),new RegExp(currency+' is a display currency'));}
  for(const width of [1280,390,320]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`reports/shopping-tests/${slug}-${width}.png`,fullPage:true});}
  await page.locator('#rate').fill('100.01');await run();assert.match(await page.locator('#error').innerText(),/0 to 100/);assert.equal(await page.locator('#result').innerText(),'');await page.getByRole('button',{name:'Reset',exact:true}).click();assert.equal(await page.locator('#error').innerText(),'');assert.equal(await page.locator('#price').inputValue(),'');
  if(slug==='sales-tax-calculator')assert.equal(await page.locator('#price-label').innerText(),'Price before tax');await page.locator('#price').fill('100,50');await page.locator('#rate').fill('10,5');await page.locator('#price').press('Enter');assert.equal(await page.locator('#error').innerText(),'');assert.equal(await value(slug==='discount-calculator'?'final':'gross'),slug==='discount-calculator'?'$89.95':'$111.05');
 }
 assert.deepEqual(errors,[]);assert.deepEqual(uploads,[]);await writeFile('reports/shopping-tests/result.json',JSON.stringify({passed:true,base,integerCentRounding:true,sequentialDiscounts:true,inclusiveTax:true,customRates:true,copy:true,mobile:true,errors,uploads},null,2));console.log('Discount and sales tax/VAT: exact totals, inclusive tax, sequential reductions, fractional rates, invalid inputs, copy, currencies, mobile and no uploads passed.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
