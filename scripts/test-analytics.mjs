import { chromium } from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
 const page = await browser.newPage();
 let tags = 0;
 await page.route('**/*', route => {
  const url = new URL(route.request().url());
  if (url.hostname === 'www.googletagmanager.com') { tags++; return route.fulfill({contentType:'application/javascript',body:''}); }
  if(url.pathname === '/js/analytics.js') return route.fulfill({contentType:'application/javascript',body:fs.readFileSync('public/js/analytics.js','utf8')});
  return route.fulfill({contentType:'text/html',body:'<footer><nav></nav></footer><script src="/js/analytics.js"></script>'});
 });
 await page.goto('https://kalikatools.com/?private=secret#private');
 assert.equal(tags,0);
 assert.equal(await page.locator('.analytics-consent').isVisible(),false);
 await page.getByText('Privacy choices',{exact:true}).click();
 await page.getByText('Reject analytics',{exact:true}).click();
 await page.reload();
 assert.equal(tags,0);
 await page.getByText('Privacy choices',{exact:true}).click();
 await page.getByText('Allow analytics',{exact:true}).click();
 await page.waitForFunction(()=>!!document.querySelector('script[src*="googletagmanager"]'));
 const config = await page.evaluate(()=>Array.from(window.dataLayer.find(x=>x[0]==='config')));
 assert.equal(config[1],'G-VLJV7JE2DN');
 assert.equal(config[2].page_location,'https://kalikatools.com/');
 await page.getByText('Privacy choices',{exact:true}).click();
 await page.getByText('Reject analytics',{exact:true}).click();
 await page.waitForLoadState();
 assert.equal(await page.evaluate(()=>localStorage.getItem('kalika-analytics-consent')),'denied');
 console.log('PASS: analytics blocked before consent and after rejection; correct ID and sanitized URL after acceptance; consent can be withdrawn.');
} finally { await browser.close(); }
