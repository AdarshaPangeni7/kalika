import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:net';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const reserve=createServer();await new Promise(r=>reserve.listen(0,'127.0.0.1',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r));
const password=randomBytes(24).toString('hex'),base='http://127.0.0.1:'+port;
const child=spawn(process.execPath,['scripts/seo-admin-server.mjs'],{env:{...process.env,KALIKA_ADMIN_PORT:String(port),KALIKA_ADMIN_PASSWORD:password},stdio:'ignore',windowsHide:true});
const browser=await chromium.launch({channel:process.platform==='win32'?'chrome':undefined,headless:true});
try{
 for(let i=0;i<40;i++){try{await fetch(base);break;}catch{await new Promise(r=>setTimeout(r,100));}}
 assert.equal((await fetch(base+'/api/scan')).status,401);
 assert.equal((await fetch(base+'/login',{method:'POST',headers:{Origin:'https://example.com'},body:'username=admin&password=wrong'})).status,403);
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.locator('[name=username]').fill('admin');await page.locator('[name=password]').fill(password);await page.getByRole('button',{name:'Log in',exact:true}).click();await page.locator('#scan').waitFor();
 const injection='<img src=x onerror=alert(1)>',fake={pages:[{route:'/tools/test',status:200,title:injection,description:injection,h1:injection,issues:[],titleLength:30,descriptionLength:30,h1Count:1,schema:'SoftwareApplication'}]};
 await page.route('**/api/scan',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(fake)}));await page.locator('#scan').click();await page.getByRole('button',{name:'/tools/test',exact:true}).click();
 assert.equal(await page.locator('#rows img').count(),0);assert.equal(await page.locator('#title').inputValue(),injection);await page.locator('#draftBtn').click();assert.match(await page.locator('#draft').innerText(),/onerror/);assert.deepEqual(errors,[]);
 await page.getByText('Log out',{exact:true}).click();await page.locator('[name=password]').waitFor();
 for(let i=0;i<10;i++)await fetch(base+'/login',{method:'POST',headers:{Origin:base},body:'username=admin&password=wrong'});
 assert.equal((await fetch(base+'/login',{method:'POST',headers:{Origin:base},body:'username=admin&password=wrong'})).status,429);
 console.log('PASS: local admin auth, origin checks, safe rendering/drafts, logout and sign-in rate limit.');
}finally{await browser.close();child.kill();}
