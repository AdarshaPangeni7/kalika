// Preserve source JPEG/PNG bytes without canvas extraction or re-encoding.
export function imageInfo(bytes){
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(bytes.length>=24&&v.getUint32(0)===0x89504e47&&v.getUint32(4)===0x0d0a1a0a)return {kind:'png',width:v.getUint32(16),height:v.getUint32(20),orientation:1};
 if(bytes.length<4||v.getUint16(0)!==0xffd8)throw Error('Choose a valid JPG or PNG image.');
 let at=2,width,height,orientation=1;
 while(at+4<=bytes.length){if(bytes[at]!==255)break;while(bytes[at]===255)at++;const marker=bytes[at++];if(marker===0xda||marker===0xd9)break;if(marker===1||marker>=0xd0&&marker<=0xd7)continue;const size=v.getUint16(at);if(size<2||at+size>bytes.length)break;
  if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)&&size>=8){height=v.getUint16(at+3);width=v.getUint16(at+5);}
  if(marker===0xe1&&size>=16&&v.getUint32(at+2)===0x45786966&&v.getUint16(at+6)===0){try{const start=at+8,little=v.getUint16(start)===0x4949;if(!little&&v.getUint16(start)!==0x4d4d)throw Error();if(v.getUint16(start+2,little)!==42)throw Error();const dir=start+v.getUint32(start+4,little),count=v.getUint16(dir,little);for(let i=0;i<count;i++){const p=dir+2+i*12;if(p+12>at+size)break;if(v.getUint16(p,little)===0x112&&v.getUint16(p+2,little)===3&&v.getUint32(p+4,little)===1){const value=v.getUint16(p+8,little);if(value>=1&&value<=8)orientation=value;break;}}}catch{/* Ignore malformed optional EXIF; dimensions remain validated below. */}}
  at+=size;
 }
 if(!width||!height)throw Error('This JPEG has no readable image dimensions.');return {kind:'jpg',width,height,orientation};
}
export function orientedSize(info){return info.orientation>=5?{width:info.height,height:info.width}:{width:info.width,height:info.height};}
export function drawOriginal(page,image,lib,orientation,x,y,width,height){
 const matrices={1:[width,0,0,height,x,y],2:[-width,0,0,height,x+width,y],3:[-width,0,0,-height,x+width,y+height],4:[width,0,0,-height,x,y+height],5:[0,-height,-width,0,x+width,y+height],6:[0,-height,width,0,x,y+height],7:[0,height,width,0,x,y],8:[0,height,-width,0,x+width,y]};
 const key=page.node.newXObject('Image',image.ref);
 page.pushOperators(lib.pushGraphicsState(),lib.concatTransformationMatrix(...matrices[orientation||1]),lib.drawObject(key),lib.popGraphicsState());
}
