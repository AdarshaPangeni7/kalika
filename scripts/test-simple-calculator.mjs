import assert from 'node:assert/strict';
import {Calculator} from '../public/js/simple-calculator.js';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
function run(keys){const c=new Calculator();for(const k of keys)c.press(k);return c;}
for(const [keys,expected]of [['12+34=','46'],['9-12=','-3'],['6*7=','42'],['8/4=','2'],['0.1+0.2=','0.3'],['2+3*4=','20'],['200*15%=','30'],['5+2==','9'],['2+*3=','6'],['1..5+2=','3.5']])assert.equal(run(keys).display,expected,keys);
assert.equal(run(['5','sign','*','2','=']).display,'-10');
assert.equal(run(['5','+','sign','2','=']).display,'3');
assert.equal(run(['1','2','3','back','+','1','=']).display,'13');
assert.equal(run('1234567890123').display,'123456789012');
assert.match(run('1/0=').error,/zero/);assert.equal(run('1/0=4+2=').display,'6');
assert.equal(run(['8','+','2','=','AC']).display,'0');
const overflow=new Calculator();overflow.display='1e308';overflow.press('*');overflow.press('9');overflow.press('=');assert.match(overflow.error,/large/);
const root=path.resolve('public');
const server=createServer(async(req,res)=>{try{let p=new URL(req.url,'http://localhost').pathname;if(p==='/')p='/index.html';if(!path.extname(p))p+='.html';const f=path.resolve(root,'.'+p);if(!f.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'application/octet-stream');res.end(await readFile(f));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=process.env.KALIKA_TEST_ORIGIN||`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.KALIKA_CHROME_EXECUTABLE||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined),headless:true});
try{
 const page=await browser.newPage({locale:'en-US'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/tools/simple-calculator');await page.locator('#calc-keyboard').focus();
 await page.keyboard.type('0.1+0.2=');assert.equal(await page.locator('#calc-display').innerText(),'0.3');
 await page.getByRole('button',{name:'Clear all',exact:true}).click();
 for(const k of ['2','0','0','*','1','5','%','='])await page.locator(`[data-key="${k}"]`).click();
 assert.equal(await page.locator('#calc-display').innerText(),'30');
 await page.locator('#calc-keyboard').focus();await page.keyboard.press('Escape');await page.keyboard.type('9/0=');assert.match(await page.locator('#calc-error').innerText(),/zero/);await page.keyboard.type('6*7');await page.keyboard.press('Enter');assert.equal(await page.locator('#calc-display').innerText(),'42');
 await mkdir('reports',{recursive:true});for(const width of [1280,390,320]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`reports/calculator-${width}.png`,fullPage:true});}
 for(const link of await page.locator('.related a').evaluateAll(a=>a.map(x=>x.href))){const response=await page.request.get(link);assert.equal(response.status(),200,link);}
 await page.goto(base+'/');assert.equal(await page.locator('a.tool[href="/tools/simple-calculator"]').count(),1);
 assert.deepEqual(errors,[]);console.log('Calculator arithmetic, mobile layouts, keyboard, buttons, recovery and related links passed.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
