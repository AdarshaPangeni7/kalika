const message='Your browser is blocking or changing image pixels, so this tool stopped to avoid a blank or corrupted download. In Tor, allow “Extract canvas data” for kalikatools.com if you trust this site, then reload and choose your original file again. You can also use another browser. Basic JPG/PNG to PDF works without canvas access.';

// A fixed, synthetic color test, used only during an image operation. Nothing is
// uploaded, persisted or used to identify the browser or visitor.
export async function assertCanvasExport(type='image/png'){
 const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
 const colors=[[240,35,60],[20,185,70],[25,65,225],[245,240,220]];
 let url;
 function verify(context){const data=context.getImageData(0,0,64,64).data;for(let y=8;y<64;y+=16)for(let x=8;x<64;x+=16){const expected=colors[(y>=32?2:0)+(x>=32?1:0)],at=(y*64+x)*4;for(let c=0;c<3;c++)if(Math.abs(data[at+c]-expected[c])>8)throw Error(message);if(data[at+3]<250)throw Error(message);}}
 try{
  const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw Error(message);
  colors.forEach((color,i)=>{context.fillStyle=`rgb(${color.join(',')})`;context.fillRect(i%2*32,Math.floor(i/2)*32,32,32);});verify(context);
  const blob=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(message)),8000);canvas.toBlob(b=>{clearTimeout(timer);b?resolve(b):reject(Error(message));},type,.95);});
  url=URL.createObjectURL(blob);
  for(const src of [url,canvas.toDataURL(type,.95)]){const image=new Image();image.src=src;await image.decode();
   if(image.naturalWidth!==64||image.naturalHeight!==64)throw Error(message);
   context.clearRect(0,0,64,64);context.drawImage(image,0,0);verify(context);
  }
 }catch{throw Error(message);}finally{if(url)URL.revokeObjectURL(url);canvas.width=canvas.height=1;}
}
