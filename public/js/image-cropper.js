import {$,read,draw,encode,number,show,wire,clear} from './image-engine.js';
let src=null,generation=0,start=null;
function rect(){return {x:number('crop-x',0,src.width-1),y:number('crop-y',0,src.height-1),width:number('crop-width',1,src.width),height:number('crop-height',1,src.height)};}
function preview(){if(!src)return;const r=rect();if(r.x+r.width>src.width||r.y+r.height>src.height)throw Error('The crop must fit within the image.');const overlay=$('crop-box');overlay.style.left=r.x/src.width*100+'%';overlay.style.top=r.y/src.height*100+'%';overlay.style.width=r.width/src.width*100+'%';overlay.style.height=r.height/src.height*100+'%';}
function set(r){for(const [key,value]of Object.entries(r))$('crop-'+key).value=Math.round(value);preview();clear();}
$('file').addEventListener('change',async()=>{const token=++generation;clear();src?.close();src=null;$('crop-preview').hidden=true;try{const next=await read($('file').files[0]);if(token!==generation){next.close();return;}src=next;$('crop-image').src=src.image.src;$('crop-preview').hidden=false;set({x:0,y:0,width:src.width,height:src.height});}catch(e){$('error').textContent=e.message;}});
for(const id of ['x','y','width','height'])$('crop-'+id).addEventListener('input',()=>{try{preview();$('error').textContent='';}catch(e){$('error').textContent=e.message;}});
$('crop-reset').addEventListener('click',()=>{if(src)set({x:0,y:0,width:src.width,height:src.height});});
function point(e){const b=$('crop-preview').getBoundingClientRect();return {x:Math.max(0,Math.min(src.width-1,Math.round((e.clientX-b.left)/b.width*src.width))),y:Math.max(0,Math.min(src.height-1,Math.round((e.clientY-b.top)/b.height*src.height)))};}
$('crop-preview').addEventListener('pointerdown',e=>{if(!src||$('workspace').getAttribute('aria-busy')==='true')return;e.preventDefault();start=point(e);$('crop-preview').setPointerCapture(e.pointerId);});
$('crop-preview').addEventListener('pointermove',e=>{if(!start)return;const p=point(e);set({x:Math.min(start.x,p.x),y:Math.min(start.y,p.y),width:Math.max(1,Math.abs(start.x-p.x)),height:Math.max(1,Math.abs(start.y-p.y))});});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('crop-preview').addEventListener(event,()=>start=null);
wire(async()=>{if(!src)throw Error('Choose an image first.');const r=rect();preview();const c=draw(src.image,r.width,r.height,$('format').value,r);try{const b=await encode(c,$('format').value,.9);show($('file').files[0],b,r.width,r.height);}finally{c.width=c.height=1;}});
window.addEventListener('pagehide',()=>src?.close());
