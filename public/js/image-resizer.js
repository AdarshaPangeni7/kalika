(()=>{
const $=id=>document.getElementById(id),form=$('tool-form'),result=$('result'),error=$('error');let urls=[];
function clear(){urls.forEach(URL.revokeObjectURL);urls=[];result.replaceChildren();error.textContent=''}
function fail(s){throw new Error(s)}
function number(id,min=-1e15,max=1e15){const el=$(id),n=Number(el.value);if(!el.value.trim()||!Number.isFinite(n)||n<min||n>max)fail('Enter a valid '+el.closest('label').firstChild.textContent.toLowerCase()+' between '+min+' and '+max+'.');return n}
function text(tag,value,cls){const el=document.createElement(tag);el.textContent=value;if(cls)el.className=cls;result.append(el);return el}
const fmt=n=>new Intl.NumberFormat(undefined,{maximumFractionDigits:2}).format(n);
function blob(canvas,type='image/jpeg',quality=.9){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Your browser could not export this image. Try a smaller size.')),type,quality))}
function download(b,name,preview=false){const url=URL.createObjectURL(b);urls.push(url);if(preview){const img=document.createElement('img');img.src=url;img.alt='Converted image preview';result.append(img)}const a=document.createElement('a');a.href=url;a.download=name;a.textContent='Download again';result.append(a);a.click()}
function files(types,max=20,multi=false){const list=[...$('file').files];if(!list.length)fail('Choose a file first.');if(!multi&&list.length>1)fail('Choose one file at a time.');for(const f of list){if(!types.includes(f.type))fail('“'+f.name+'” is not a supported file. Choose '+(types.includes('application/pdf')?'a .pdf file.':'a JPG, PNG or WebP image.'));if(f.size>max*1024*1024)fail('“'+f.name+'” is larger than '+max+' MB. Choose a smaller file.');if(!f.size)fail('“'+f.name+'” is empty. Choose another file.')}return list}
async function readImage(f){
  if('createImageBitmap' in window){
    try{
      const bitmap=await createImageBitmap(f,{imageOrientation:'from-image',colorSpaceConversion:'default'});
      if(bitmap.width*bitmap.height>24000000){bitmap.close();fail('This image exceeds 24 megapixels. Choose a smaller image.')}
      return {source:bitmap,width:bitmap.width,height:bitmap.height,close:()=>bitmap.close()};
    }catch{}
  }
  const u=URL.createObjectURL(f),img=new Image();
  try{
    await new Promise((r,j)=>{img.onload=()=>('decode'in img?img.decode().catch(()=>{}).then(r):r());img.onerror=()=>j(new Error('“'+f.name+'” could not be read. It may be corrupted. Try another image.'));img.src=u});
    if(img.naturalWidth*img.naturalHeight>24000000)fail('This image exceeds 24 megapixels. Choose a smaller image.');
    return {source:img,width:img.naturalWidth,height:img.naturalHeight,close:()=>URL.revokeObjectURL(u)};
  }catch(e){URL.revokeObjectURL(u);throw e}
}
function canvas(w,h,white=true){if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>10000||h>10000||w*h>24000000)fail('The result is too large. Use dimensions up to 10,000 pixels and 24 megapixels total.');const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{alpha:!white});if(!ctx)fail('Canvas is unavailable in this browser.');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';if(white){ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h)}return c}
function base(f){return f.name.replace(/\.[^.]+$/,'').replace(/[^\p{L}\p{N}_-]/gu,'-').slice(0,80)||'kalika'}
function wire(action){form.noValidate=true;form.addEventListener('submit',async e=>{e.preventDefault();clear();const b=form.querySelector('button');b.disabled=true;const old=b.textContent;b.textContent='Working…';try{const invalid=[...form.elements].find(el=>el.willValidate&&!el.validity.valid);if(invalid){invalid.focus();fail('Check '+invalid.closest('label').firstChild.textContent.trim().toLowerCase()+': '+invalid.validationMessage)}await action()}catch(e){result.replaceChildren();error.textContent=e.message||'Something went wrong. Please try again.'}finally{b.disabled=false;b.textContent=old}})}
if($('file'))$('file').addEventListener('change',()=>{clear();$('files').textContent=[...$('file').files].map((f,i)=>`${i+1}. ${f.name} (${fmt(f.size/1024)} KB)`).join(' · ')});
window.addEventListener('pagehide',()=>urls.forEach(URL.revokeObjectURL));

wire(async()=>{const f=files(['image/jpeg','image/png','image/webp'])[0],img=await readImage(f);try{const w=number('width',1,10000),h=$('lock').checked?Math.max(1,Math.round(w*img.height/img.width)):number('height',1,10000),type=$('format').value,c=canvas(w,h,type==='image/jpeg');$('height').value=h;c.getContext('2d').drawImage(img.source,0,0,w,h);const b=await blob(c,type);text('h2','Your resized image is ready');text('p',w+' × '+h+' pixels');download(b,base(f)+'-resized.'+({'image/png':'png','image/jpeg':'jpg','image/webp':'webp'})[b.type],true);c.width=1;c.height=1}finally{img.close()}});
})();