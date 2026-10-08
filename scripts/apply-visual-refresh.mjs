import {readFile,readdir,writeFile}from'node:fs/promises';import{load}from'cheerio';
async function pages(dir){let out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())out.push(...await pages(p));else if(e.name.endsWith('.html'))out.push(p);}return out;}
let count=0;
for(const file of await pages('public')){const source=await readFile(file,'utf8');if(!source.includes('class="wordmark"')||!source.includes('rel="canonical"'))continue;const $=load(source.trim());$('body').addClass('site-refresh');if(!$('link[href="/site-refresh.css"]').length){const home=$('link[href="/home.css"]');if(home.length)home.before('<link rel="stylesheet" href="/site-refresh.css">');else $('head').append('<link rel="stylesheet" href="/site-refresh.css">');}
if(file==='public/guides/index.html'){$('body').addClass('guide-hub');if(!$('.guide-card').length)$('article>h2').each((_,e)=>{const heading=$(e),paragraph=heading.next('p'),html=$.html(e)+(paragraph.length?$.html(paragraph[0]):'');heading.before('<section class="guide-card">'+html+'</section>');paragraph.remove();heading.remove();});}
const output=$.html().trimEnd()+'\n';if(output!==source)await writeFile(file,output);count++;}
console.log(`Shared visual refresh applied to ${count} public pages.`);
