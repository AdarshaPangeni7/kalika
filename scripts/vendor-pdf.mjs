import {mkdir,copyFile,cp,readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const dir='public/js/vendor/pdf';await mkdir(dir,{recursive:true});
for(const [from,to]of [['pdf-lib/dist/pdf-lib.min.js','pdf-lib.min.js'],['pdf-lib/LICENSE.md','pdf-lib-LICENSE.txt'],['jszip/dist/jszip.min.js','jszip.min.js'],['jszip/LICENSE.markdown','jszip-LICENSE.txt'],['pdfjs-dist/build/pdf.min.mjs','pdf.min.mjs'],['pdfjs-dist/build/pdf.worker.min.mjs','pdf.worker.min.mjs'],['pdfjs-dist/LICENSE','pdfjs-LICENSE.txt']])await copyFile('node_modules/'+from,dir+'/'+to);
for(const folder of ['cmaps','standard_fonts','wasm'])await cp('node_modules/pdfjs-dist/'+folder,dir+'/'+folder,{recursive:true});
console.log('Pinned PDF libraries copied with licenses.');
await mkdir('public/js/vendor/qr',{recursive:true});
await copyFile('node_modules/qrcodejs/qrcode.min.js','public/js/vendor/qr/qrcode.min.js');
await copyFile('node_modules/qrcodejs/LICENSE','public/js/vendor/qr/LICENSE.txt');
async function walk(dir){return(await Promise.all((await readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?walk(dir+'/'+e.name):dir+'/'+e.name))).flat();}
const hashes={};
for(const file of await walk('public/js/vendor')){
 let bytes=await readFile(file);if(/\.(m?js|txt)$|LICENSE/.test(file))bytes=Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n'));
 hashes[file]=createHash('sha256').update(bytes).digest('hex');
}
await mkdir('config',{recursive:true});await writeFile('config/vendor-integrity.json',JSON.stringify(hashes,null,2)+'\n');
