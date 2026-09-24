import {detect,warp,filter} from './scanner-engine.js';
self.onmessage=({data:message})=>{try{const {id,operation,width,height,corners,mode}=message;const pixels=new Uint8ClampedArray(message.buffer);
 if(operation==='detect')self.postMessage({id,...detect(pixels,width,height)});
 else {const result=warp(pixels,width,height,corners);filter(result.data,result.width,result.height,mode);self.postMessage({id,width:result.width,height:result.height,buffer:result.data.buffer},[result.data.buffer]);}
}catch(error){self.postMessage({id:message.id,error:error.message||'Unable to process this photograph.'});}};
