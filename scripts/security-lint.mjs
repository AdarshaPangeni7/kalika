import fs from 'node:fs';
import path from 'node:path';
import {load} from 'cheerio';
import {createHash} from 'node:crypto';
const issues=[];
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);}
const files=[...walk('public'),...walk('scripts'),'worker.mjs'];
for(const file of files){
 if(file.includes('/vendor/')||! /\.(?:[cm]?js|html|css)$/.test(file))continue;
 const source=fs.readFileSync(file,'utf8');
 // Build/test scripts contain HTML fixtures and scanner patterns; browser-delivered code is the sink boundary.
 const client=file.startsWith('public/')||file==='scripts/seo-admin-client.js';
 if(client){
  for(const re of [/\b(?:innerHTML|outerHTML)\s*=/g,/\b(?:insertAdjacentHTML|write|writeln)\s*\(/g,/\beval\s*\(/g,/\bnew\s+Function\s*\(/g,/(?:setTimeout|setInterval)\s*\(\s*['"`]/g]){
   // document.write only: other write methods (e.g. streams) aren't HTML sinks.
   for(const m of source.matchAll(re))if(!/^write/.test(m[0])||source.slice(Math.max(0,m.index-9),m.index).endsWith('document.'))issues.push(`${file}: unsafe executable/DOM pattern ${m[0]}`);
  }
  if(/http:\/\/(?!www\.w3\.org\/(?:2000\/svg|1999\/xhtml))/.test(source))issues.push(file+': insecure URL');
 }
 if(file.endsWith('.html')){
  const $=load(source);
  $('script').each((_,e)=>{const src=$(e).attr('src');if(!src&&$(e).attr('type')!=='application/ld+json')issues.push(file+': executable inline script');if(src&&/^https?:|^\/\//.test(src)&&(!/^sha(256|384|512)-/.test($(e).attr('integrity')||'')||$(e).attr('crossorigin')!=='anonymous'))issues.push(file+': external script missing SRI');});
  $('*').each((_,e)=>{for(const [name,value]of Object.entries(e.attribs||{})){if(/^on/i.test(name))issues.push(file+': inline event handler');if(['href','src','action'].includes(name)&&/^(?:javascript:|http:|\/\/)/i.test(value))issues.push(file+': unsafe URL attribute');}});
  const canonical=$('link[rel=canonical]').attr('href');if(canonical&&!canonical.startsWith('https://kalikatools.com/'))issues.push(file+': noncanonical origin');
 }
}
// Dynamic third-party loader: Google changes gtag bytes, so SRI is not stable.
// This sole exception must remain consent-gated and is exercised by test-analytics.
for(const file of walk('public/js').filter(x=>!x.includes('/vendor/')&&x.endsWith('.js'))){
 const s=fs.readFileSync(file,'utf8');
 if(/(?:\.src\s*=|library\s*\()\s*['"]https?:/.test(s)&&file!=='public/js/analytics.js')issues.push(file+': third-party dynamic script; self-host it');
}
const versions=JSON.parse(fs.readFileSync('package.json')).devDependencies;
for(const [name,v]of Object.entries(versions))if(!/^\d+\.\d+\.\d+$/.test(v))issues.push(name+': dependency must be exactly pinned');
if(fs.existsSync('config/vendor-integrity.json')){
 const expected=JSON.parse(fs.readFileSync('config/vendor-integrity.json'));
 for(const file of walk('public/js/vendor')){
  let bytes=fs.readFileSync(file);if(/\.(m?js|txt)$|LICENSE/.test(file))bytes=Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n'));
  if(createHash('sha256').update(bytes).digest('hex')!==expected[file])issues.push(file+': vendor integrity mismatch');
 }
 for(const file of Object.keys(expected))if(!fs.existsSync(file))issues.push(file+': missing vendored asset');
}else issues.push('Missing vendor integrity manifest');
if(issues.length){console.error(issues.join('\n'));process.exitCode=1;}else console.log('PASS security lint: safe DOM/script patterns, HTTPS URLs, external-script SRI, pinned dependencies and vendor integrity.');
