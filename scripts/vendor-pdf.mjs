import {mkdir,copyFile,cp} from 'node:fs/promises';
const dir='public/js/vendor/pdf';await mkdir(dir,{recursive:true});
for(const [from,to]of [['pdf-lib/dist/pdf-lib.min.js','pdf-lib.min.js'],['pdf-lib/LICENSE.md','pdf-lib-LICENSE.txt'],['jszip/dist/jszip.min.js','jszip.min.js'],['jszip/LICENSE.markdown','jszip-LICENSE.txt'],['pdfjs-dist/build/pdf.min.mjs','pdf.min.mjs'],['pdfjs-dist/build/pdf.worker.min.mjs','pdf.worker.min.mjs'],['pdfjs-dist/LICENSE','pdfjs-LICENSE.txt']])await copyFile('node_modules/'+from,dir+'/'+to);
for(const folder of ['cmaps','standard_fonts','wasm'])await cp('node_modules/pdfjs-dist/'+folder,dir+'/'+folder,{recursive:true});
console.log('Pinned PDF libraries copied with licenses.');
