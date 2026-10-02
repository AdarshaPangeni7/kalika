import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {load} from 'cheerio';
const files=execFileSync('git',['ls-files'],{encoding:'utf8'}).trim().split(/\r?\n/);
const findings={files:files.length,pages:[],sinks:[],external:new Set(),inline:[]};
for(const file of files){
 if(!/\.(?:html|[cm]?js|css|json|yml|md|txt)$/.test(file)||file.includes('/vendor/'))continue;
 const text=fs.readFileSync(file,'utf8');
 if(file.startsWith('public/'))for(const m of text.matchAll(/https:\/\/[-\w.]+/g))findings.external.add(m[0]);
 if(/\.(?:html|[cm]?js)$/.test(file))for(const [i,line] of text.split('\n').entries()){
  const hits=line.match(/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\s*\(|new Function|location\.(?:search|hash)|document\.referrer|postMessage/g);
  if(hits)findings.sinks.push({file,line:i+1,hits:[...new Set(hits)]});
 }
 if(file.startsWith('public/')&&file.endsWith('.html')){
  const $=load(text);findings.pages.push({file,title:$('title').text(),description:$('meta[name=description]').attr('content'),h1:$('h1').length,canonical:$('link[rel=canonical]').attr('href')});
  $('script:not([src])').each((i,e)=>{findings.inline.push({file,type:$(e).attr('type')||'executable'});});
 }
}
findings.external=[...findings.external];fs.mkdirSync('reports',{recursive:true});fs.writeFileSync('reports/security-inventory.json',JSON.stringify(findings,null,2));
console.log(JSON.stringify({files:findings.files,pages:findings.pages.length,external:findings.external,sinks:findings.sinks.filter(x=>x.file.startsWith('public/')),executableInline:findings.inline.filter(x=>x.type!=='application/ld+json')},null,2));
