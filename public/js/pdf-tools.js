const $=id=>document.getElementById(id),workspace=document.querySelector('[data-pdf-tool]');
const mode=workspace.dataset.pdfTool,form=$('tool-form'),input=$('file'),list=$('pdf-list'),status=$('pdf-status'),result=$('result'),error=$('error');
let selected=[],urls=[];
const mb=1024*1024;
function clear(){urls.forEach(u=>URL.revokeObjectURL(u));urls=[];result.replaceChildren();error.textContent='';status.textContent='';}
function node(tag,text,parent,cls){const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;parent.append(el);return el;}
function renderList(){list.replaceChildren();selected.forEach((file,i)=>{const li=node('li','',list);node('span',`${i+1}. ${file.name} (${(file.size/mb).toFixed(2)} MB)`,li);if(mode==='merge-pdf'){for(const [label,delta]of [['Move up',-1],['Move down',1],['Remove',0]]){const b=node('button',label,li);b.type='button';b.setAttribute('aria-label',`${label}: ${file.name}`);b.disabled=(delta===-1&&i===0)||(delta===1&&i===selected.length-1);b.onclick=()=>{clear();if(delta)[selected[i],selected[i+delta]]=[selected[i+delta],selected[i]];else selected.splice(i,1);renderList();};}}});}
input.addEventListener('change',()=>{clear();const next=[...input.files];selected=mode==='merge-pdf'?[...selected,...next]:next;input.value='';renderList();});
$('clear-files').onclick=()=>{selected=[];clear();renderList();};
const loading=new Map();
async function lib(src,name){if(window[name])return window[name];if(!loading.has(name))loading.set(name,new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=()=>resolve(window[name]);s.onerror=()=>{loading.delete(name);s.remove();reject(Error('A PDF component could not load. Check your connection and try again.'));};document.head.append(s);}));return loading.get(name);}
async function read(file){if(!file.size)throw Error(`“${file.name}” is empty.`);if(file.size>30*mb)throw Error('Each PDF must be 30 MB or smaller.');const data=new Uint8Array(await file.arrayBuffer());if(!new TextDecoder().decode(data.slice(0,1024)).includes('%PDF-'))throw Error(`“${file.name}” is not a readable PDF.`);return data;}
async function load(data,PDFDocument){try{const pdf=await PDFDocument.load(data,{updateMetadata:false});if(pdf.getPageCount()<1)throw Error('empty');if(pdf.getPageCount()>200)throw Error('limit');return pdf;}catch(e){if(/encrypt/i.test(e.message))throw Error('Password-protected PDFs are not supported. Choose an unlocked copy.');if(e.message==='limit')throw Error('Use PDFs with no more than 200 pages.');throw Error('This PDF could not be read. It may be damaged or unsupported.');}}
function rejectInteractive(pdf,PDFName){if(pdf.catalog.has(PDFName.of('AcroForm')))throw Error('This PDF contains a form or signature. Export a flattened, unsigned copy from your PDF editor first.');}
export function pageSelection(value,count){const pages=[],seen=new Set();if(!value.trim())throw Error('Enter pages, for example 1-3, 5.');for(const part of value.split(',')){const m=part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);if(!m)throw Error('Use page numbers and increasing ranges, such as 1-3, 5.');const a=Number(m[1]),b=Number(m[2]||m[1]);if(a<1||b<a||b>count)throw Error(`Page numbers must be between 1 and ${count}, in increasing ranges.`);for(let n=a;n<=b;n++){if(seen.has(n))throw Error('Choose each page only once.');seen.add(n);pages.push(n-1);}}return pages;}
function download(data,name,type='application/pdf'){const blob=data instanceof Blob?data:new Blob([data],{type}),url=URL.createObjectURL(blob);urls.push(url);const a=node('a','Download '+name,result,'button');a.href=url;a.download=name;return blob.size;}
function base(file){return file.name.replace(/\.pdf$/i,'').replace(/[^\p{L}\p{N}_-]/gu,'-').slice(0,60)||'kalika';}
function progress(text){status.textContent=text;return new Promise(r=>setTimeout(r,0));}
async function imageCompress(data,PDFDocument){
 let task,pdf;
 try{
  const renderer=await import('/js/vendor/pdf/pdf.min.mjs');renderer.GlobalWorkerOptions.workerSrc='/js/vendor/pdf/pdf.worker.min.mjs';
  task=renderer.getDocument({data:data.slice(),isEvalSupported:false,isOffscreenCanvasSupported:false,isImageDecoderSupported:false,cMapUrl:'/js/vendor/pdf/cmaps/',cMapPacked:true,standardFontDataUrl:'/js/vendor/pdf/standard_fonts/',wasmUrl:'/js/vendor/pdf/wasm/'});pdf=await task.promise;
  if(pdf.numPages>50)throw Error('Image-based compression supports up to 50 pages.');
  const out=await PDFDocument.create(),quality=$('quality').value==='small'?.55:.75,dpi=$('quality').value==='small'?96:144;let bytes=0;
  for(let i=1;i<=pdf.numPages;i++){
   await progress(`Compressing page ${i} of ${pdf.numPages}…`);const page=await pdf.getPage(i),natural=page.getViewport({scale:1});
   const scale=Math.min(dpi/72,3000/Math.max(natural.width,natural.height));const viewport=page.getViewport({scale});
   if(!Number.isFinite(viewport.width)||!Number.isFinite(viewport.height)||viewport.width<1||viewport.height<1)throw Error('This PDF has an unsupported page size.');
   const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   try{const context=canvas.getContext('2d');if(!context)throw Error('Your browser cannot render this PDF.');await page.render({canvasContext:context,viewport,background:'#ffffff'}).promise;
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Image export failed. Try a smaller PDF.')),'image/jpeg',quality));bytes+=blob.size;if(bytes>80*mb)throw Error('Output is too large for this browser tool. Try fewer pages.');
    const img=await out.embedJpg(await blob.arrayBuffer()),p=out.addPage([natural.width,natural.height]);p.drawImage(img,{x:0,y:0,width:natural.width,height:natural.height});
   }finally{canvas.width=1;canvas.height=1;page.cleanup();}
  }
  return await out.save();
 }finally{if(pdf)await pdf.destroy();else if(task)await task.destroy();}
}
function compressionOptions(){if(mode!=='compress-pdf')return;const image=$('compression').value==='image';$('image-options').hidden=!image;$('lossy-consent').required=image;clear();}
if(mode==='compress-pdf'){$('compression').onchange=compressionOptions;compressionOptions();}
if(mode==='split-pdf')$('split-mode').onchange=()=>{$('range-label').hidden=$('split-mode').value==='all';clear();};
form.addEventListener('submit',async e=>{
 e.preventDefault();clear();
 if(!selected.length){error.textContent='Choose a PDF first.';return;}
 if(mode==='merge-pdf'&&(selected.length<2||selected.length>20)){error.textContent='Choose between 2 and 20 PDFs to merge.';return;}
 if(selected.reduce((n,f)=>n+f.size,0)>60*mb){error.textContent='Choose PDFs totaling no more than 60 MB.';return;}
 if(mode==='compress-pdf'&&$('compression').value==='image'&&!$('lossy-consent').checked){error.textContent='Confirm that image-based compression is suitable for your document.';return;}
 const controls=[...form.querySelectorAll('button,input,select')];const disabled=controls.map(c=>c.disabled);controls.forEach(c=>c.disabled=true);form.setAttribute('aria-busy','true');
 try{
  await progress('Reading your PDF locally…');const {PDFDocument,PDFName}=await lib('/js/vendor/pdf/pdf-lib.min.js','PDFLib');
  if(mode==='merge-pdf'){
   const out=await PDFDocument.create();let pages=0;
   for(let i=0;i<selected.length;i++){await progress(`Merging file ${i+1} of ${selected.length}…`);const pdf=await load(await read(selected[i]),PDFDocument);rejectInteractive(pdf,PDFName);pages+=pdf.getPageCount();if(pages>200)throw Error('Merge up to 200 pages total.');for(const p of await out.copyPages(pdf,pdf.getPageIndices()))out.addPage(p);}
   download(await out.save(),'kalika-merged.pdf');status.textContent=`Ready: ${pages} pages merged in the order shown.`;
  }else{
   const file=selected[0],data=await read(file),pdf=await load(data,PDFDocument);rejectInteractive(pdf,PDFName);
   if(mode==='split-pdf'){
    if($('split-mode').value==='all'){
     const Zip=await lib('/js/vendor/pdf/jszip.min.js','JSZip'),zip=new Zip();let total=0;
     for(let i=0;i<pdf.getPageCount();i++){await progress(`Extracting page ${i+1} of ${pdf.getPageCount()}…`);const out=await PDFDocument.create();out.addPage((await out.copyPages(pdf,[i]))[0]);const bytes=await out.save();total+=bytes.length;if(total>100*mb)throw Error('Extracted files exceed 100 MB. Select a smaller page range instead.');zip.file(`page-${String(i+1).padStart(3,'0')}.pdf`,bytes);}
     download(await zip.generateAsync({type:'blob',compression:'STORE'}),base(file)+'-pages.zip','application/zip');status.textContent=`Ready: ${pdf.getPageCount()} separate PDFs in a ZIP. Extract the ZIP to open them.`;
    }else{const indices=pageSelection($('pages').value,pdf.getPageCount()),out=await PDFDocument.create();for(const p of await out.copyPages(pdf,indices))out.addPage(p);download(await out.save(),base(file)+'-selected.pdf');status.textContent=`Ready: ${indices.length} selected pages, in your requested order.`;}
   }else{
    const image=$('compression').value==='image',bytes=image?await imageCompress(data,PDFDocument):await pdf.save({useObjectStreams:true,updateFieldAppearances:false});
    if(bytes.length>=data.length){status.textContent='No smaller file was produced. Your original is already smaller; use the original download below.';download(data,base(file)+'-original.pdf');}
    else{download(bytes,base(file)+'-compressed.pdf');status.textContent=`Reduced from ${(data.length/1024).toFixed(1)} KB to ${(bytes.length/1024).toFixed(1)} KB (${((1-bytes.length/data.length)*100).toFixed(1)}% smaller).${image?' Pages are now images; review the downloaded PDF before sharing.':' Text and page graphics were not rasterized.'}`;}
   }
  }
 }catch(e){result.replaceChildren();status.textContent='';error.textContent=e.message||'This PDF could not be processed. Try a smaller, unlocked PDF.';}
 finally{controls.forEach((c,i)=>c.disabled=disabled[i]);form.removeAttribute('aria-busy');}
});
window.addEventListener('pagehide',()=>urls.forEach(u=>URL.revokeObjectURL(u)));
