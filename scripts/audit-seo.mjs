import { load } from 'cheerio';
import { readdir,readFile,writeFile } from 'node:fs/promises';
import path from 'node:path';
const fix=process.argv.includes('--fix');
async function files(dir){const entries=await readdir(dir,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?files(path.join(dir,e.name)):path.join(dir,e.name)))).flat();}
const titles=new Set(),descriptions=new Set();let errors=0,count=0;
for(const file of (await files('public')).filter(f=>f.endsWith('.html'))){
 let html=await readFile(file,'utf8');let $=load(html);
 let title=$('title').text(),description=$('meta[name="description"]').attr('content')||'';
 if(fix){
  if(title.length===61){title=title.replace(' | Kalika',' |Kalika');html=html.replace(/<title>[\s\S]*?<\/title>/,`<title>${title}</title>`);}
  if(file.endsWith('privacy.html')){description='Read how Kalika processes files locally, handles currency API requests and optional Google Analytics, and lets you manage your privacy choices at any time.';html=html.replace(/(<meta name="description" content=")[^"]*/,`$1${description}`);}
  const canonical=$('link[rel="canonical"]').attr('href');
  const esc=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
  let tags='';
  for(const [key,value]of Object.entries({'og:title':title,'og:description':description,'og:url':canonical,'og:type':'website','og:site_name':'Kalika','twitter:card':'summary','twitter:title':title,'twitter:description':description})){
   if(value&&!$(`meta[property="${key}"],meta[name="${key}"]`).length)tags+=`<meta ${key.startsWith('og:')?'property':'name'}="${key}" content="${esc(value)}">`;
  }
  html=html.replace('</head>',tags+'</head>');await writeFile(file,html);$=load(html);
 }
 const issues=[];
 if(!title||titles.has(title))issues.push('missing/duplicate title');
 if(!description||descriptions.has(description))issues.push('missing/duplicate description');
 if(!$('link[rel="canonical"]').attr('href'))issues.push('missing canonical');
 if($('h1').length!==1)issues.push('H1 count');
 if(file.includes(`${path.sep}tools${path.sep}`)&&!$('script[type="application/ld+json"]').text().match(/WebApplication|SoftwareApplication/))issues.push('missing tool schema');
 if(title.length>60||title.length<50)issues.push(`title length ${title.length}`);
 if(description.length>160||description.length<140)issues.push(`description length ${description.length}`);
 titles.add(title);descriptions.add(description);count++;
 if(issues.length){errors++;console.log(file,issues.join(', '));}
}
console.log(`${count} pages audited; ${errors} pages needing attention.`);process.exitCode=errors?1:0;
