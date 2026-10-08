import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {load} from 'cheerio';
async function walk(dir){return (await Promise.all((await readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?walk(dir+'/'+e.name):dir+'/'+e.name))).flat();}
const manifest={pages:{},aliases:{}};
for(const file of (await walk('public')).filter(f=>f.endsWith('.html'))){
 const html=await readFile(file,'utf8'),$=load(html),asset=file.slice(6);
 const canonical=$('link[rel=canonical]').attr('href');
 const route=canonical?new URL(canonical).pathname:asset;
 const hashes=[];
 $('script:not([src])').each((_,e)=>{
  if($(e).attr('type')!=='application/ld+json')throw Error('Externalize executable inline script: '+file);
  hashes.push("'sha256-"+createHash('sha256').update($(e).html()).digest('base64')+"'");
 });
 manifest.pages[route]={asset,hashes,title:$('title').text(),description:$('meta[name=description]').attr('content')||''};
 if(asset!==route)manifest.aliases[asset]=route;
 if(route!=='/'&&route.endsWith('/'))manifest.aliases[route.slice(0,-1)]=route;
 else if(route!=='/'&&!route.endsWith('.html'))manifest.aliases[route+'/']=route;
}
manifest.aliases['/guides.html']='/guides/';
manifest.aliases['/tools/compress-image']='/tools/image-compressor';
manifest.aliases['/tools/compress-image.html']='/tools/image-compressor';
await mkdir('config',{recursive:true});
const output=JSON.stringify(manifest,null,2)+'\n';
if(process.argv.includes('--check')){
 if(await readFile('config/security-manifest.json','utf8')!==output)throw Error('Run npm run build:security and commit the updated manifest.');
}else await writeFile('config/security-manifest.json',output);
console.log('Security routes and inline JSON-LD hashes checked for '+Object.keys(manifest.pages).length+' pages.');
