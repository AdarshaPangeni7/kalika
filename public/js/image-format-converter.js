import {$,read,draw,encode,number,show,wire} from './image-engine.js';
wire(async()=>{const file=$('file').files[0],src=await read(file);let c;try{c=draw(src.image,src.width,src.height,$('format').value);const b=await encode(c,$('format').value,number('quality',5,100)/100);show(file,b,src.width,src.height,$('format').value==='image/jpeg'?'JPG replaces transparent areas with white.':'Check transparency and readability before downloading.');}finally{src.close();if(c)c.width=c.height=1;}});

$('quality').addEventListener('input',()=>{$('quality-value').textContent=$('quality').value+'%';});
