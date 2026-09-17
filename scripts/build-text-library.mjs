import {readFile,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {buildLibrary} from './traditional-texts.mjs';
const root=process.cwd();
async function files(dir){const entries=await readdir(dir,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?files(path.join(dir,e.name)):path.join(dir,e.name)))).flat();}
for(const file of (await files(path.join(root,'public'))).filter(f=>f.endsWith('.html'))){let html=await readFile(file,'utf8');html=html.replace(/<header class="header wrap">[\s\S]*?<\/header>/,header=>header.includes('href="/texts/"')?header:header.replace('<a href="/guides/">Guides</a>','<a href="/guides/">Guides</a><a href="/texts/">Traditional texts</a>'));await writeFile(file,html);}
const homeFile=path.join(root,'public/index.html');let home=await readFile(homeFile,'utf8');if(!home.includes('class="tradition-feature"'))home=home.replace('<section class="closing">','<section class="tradition-feature" style="border-top:1px solid var(--line);padding:44px 0"><p class="overline">READING &amp; REFLECTION</p><h2>Words of tradition.<br>A place to return to.</h2><p>Explore traditional Hindu prayers and texts, with original verses, meanings and source notes.</p><a href="/texts/" class="primary">Explore traditional texts ↗</a></section><section class="closing">');await writeFile(homeFile,home);
await buildLibrary(root);console.log('Built traditional texts, library, navigation and sitemap.');
