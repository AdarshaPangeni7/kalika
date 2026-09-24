// Pure pixel algorithms. No DOM, network, storage, or third-party dependencies.
export const fullCorners = (w,h) => [{x:0,y:0},{x:w-1,y:0},{x:w-1,y:h-1},{x:0,y:h-1}];
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function area(points){return Math.abs(points.reduce((s,p,i)=>{const q=points[(i+1)%points.length];return s+p.x*q.y-p.y*q.x;},0))/2;}
export function validCorners(p,w,h){return p.length===4&&p.every((a,i)=>Number.isFinite(a.x)&&Number.isFinite(a.y)&&a.x>=0&&a.y>=0&&a.x<w&&a.y<h&&cross(a,p[(i+1)%4],p[(i+2)%4])>1&&distance(a,p[(i+1)%4])>=8)&&area(p)>64;}
function hull(points){points.sort((a,b)=>a.x-b.x||a.y-b.y);const half=list=>{const out=[];for(const p of list){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}return out;};return [...half(points).slice(0,-1),...half([...points].reverse()).slice(0,-1)];}
function quadrilateral(points){const p=hull(points);if(p.length<4)return null;while(p.length>4){let at=0,min=Infinity;for(let i=0;i<p.length;i++){const loss=Math.abs(cross(p[(i+p.length-1)%p.length],p[i],p[(i+1)%p.length]));if(loss<min){min=loss;at=i;}}p.splice(at,1);}const start=p.reduce((best,v,i)=>v.x+v.y<p[best].x+p[best].y?i:best,0);return [...p.slice(start),...p.slice(0,start)];}
function gray(data){const g=new Uint8Array(data.length/4);for(let i=0;i<g.length;i++)g[i]=Math.round(.299*data[i*4]+.587*data[i*4+1]+.114*data[i*4+2]);return g;}
function otsu(g){const hist=new Uint32Array(256);let total=0;for(const v of g){hist[v]++;total+=v;}let count=0,sum=0,best=0,result=128;for(let t=0;t<255;t++){count+=hist[t];sum+=t*hist[t];if(!count||count===g.length)continue;const delta=sum/count-(total-sum)/(g.length-count),score=count*(g.length-count)*delta*delta;if(score>best){best=score;result=t;}}return result;}
export function detect(data,w,h){
 const g=gray(data),threshold=otsu(g);let best=null,bestScore=0;
 // Connected bright regions at several thresholds, then a convex boundary fit.
 // Detection runs on a <=600 px preview, not on the full-resolution photograph.
 for(const t of new Set([threshold,Math.min(235,threshold+25),Math.max(40,threshold-20)])){
  const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);
  for(let seed=0;seed<g.length;seed++){
   if(seen[seed]||g[seed]<=t)continue;
   let head=0,tail=1,count=0,border=0;queue[0]=seed;seen[seed]=1;const boundary=[];
   while(head<tail){const n=queue[head++],x=n%w,y=(n/w)|0;count++;let edge=false;
    if(x===0||y===0||x===w-1||y===h-1)border++;
    for(const m of [x? n-1:-1,x<w-1?n+1:-1,y?n-w:-1,y<h-1?n+w:-1]){
     if(m<0||g[m]<=t){edge=true;continue;}if(!seen[m]){seen[m]=1;queue[tail++]=m;}
    }if(edge)boundary.push({x,y});
   }
   if(count<w*h*.06||count>w*h*.94||boundary.length<4)continue;
   const q=quadrilateral(boundary);if(!q||!validCorners(q,w,h))continue;
   const a=area(q),coverage=count/a;
   if(a<w*h*.08||a>w*h*.96||coverage<.65||border>Math.min(w,h)*.4)continue;
   // Reject weak borders and rounded/irregular bright objects.
   let contrast=0,samples=0;
   for(let i=0;i<4;i++){const p=q[i],r=q[(i+1)%4],len=distance(p,r),nx=-(r.y-p.y)/len,ny=(r.x-p.x)/len;
    for(let s=1;s<20;s++){const x=p.x+(r.x-p.x)*s/20,y=p.y+(r.y-p.y)*s/20;
     const sample=(dx,dy)=>g[Math.max(0,Math.min(h-1,Math.round(y+dy)))*w+Math.max(0,Math.min(w-1,Math.round(x+dx)))];
     contrast+=sample(nx*3,ny*3)-sample(-nx*3,-ny*3);samples++;
    }
   }
   contrast/=samples;if(contrast<12)continue;
   const score=a/(w*h)*Math.min(1,coverage)*Math.min(1,contrast/65);
   if(score>bestScore){bestScore=score;best=q;}
  }
 }
 return {corners:best||fullCorners(w,h),detected:!!best,confidence:bestScore};
}
// Homography maps output unit-square coordinates to the selected source quadrilateral.
export function homography(p){const [a,b,c,d]=p,dx=b.x-c.x,ex=d.x-c.x,dy=b.y-c.y,ey=d.y-c.y,sx=a.x-b.x+c.x-d.x,sy=a.y-b.y+c.y-d.y,det=dx*ey-ex*dy;
 let g=0,h=0;if(Math.abs(sx)+Math.abs(sy)>1e-8){if(Math.abs(det)<1e-8)throw Error('Crop corners are too close together.');g=(sx*ey-ex*sy)/det;h=(dx*sy-sx*dy)/det;}
 return [b.x-a.x+g*b.x,d.x-a.x+h*d.x,a.x,b.y-a.y+g*b.y,d.y-a.y+h*d.y,a.y,g,h];
}
export function warp(data,w,h,corners,maxSide=2200){
 if(!validCorners(corners,w,h))throw Error('Keep the four corners in order and leave a usable area inside the crop.');
 const [a,b,c,d]=corners,ow=Math.max(distance(a,b),distance(d,c)),oh=Math.max(distance(a,d),distance(b,c)),scale=Math.min(1,maxSide/Math.max(ow,oh));
 const width=Math.max(2,Math.round(ow*scale)),height=Math.max(2,Math.round(oh*scale)),out=new Uint8ClampedArray(width*height*4),m=homography(corners);
 for(let y=0;y<height;y++){const v=y/(height-1);for(let x=0;x<width;x++){const u=x/(width-1),z=m[6]*u+m[7]*v+1,sx=Math.max(0,Math.min(w-1,(m[0]*u+m[1]*v+m[2])/z)),sy=Math.max(0,Math.min(h-1,(m[3]*u+m[4]*v+m[5])/z)),ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy,k=(y*width+x)*4;
  const p=(iy*w+ix)*4,r=(iy*w+Math.min(w-1,ix+1))*4,s=(Math.min(h-1,iy+1)*w+ix)*4,t=(Math.min(h-1,iy+1)*w+Math.min(w-1,ix+1))*4;
  for(let ch=0;ch<3;ch++)out[k+ch]=(data[p+ch]*(1-fx)+data[r+ch]*fx)*(1-fy)+(data[s+ch]*(1-fx)+data[t+ch]*fx)*fy;out[k+3]=255;
 }}return {data:out,width,height};
}
export function filter(data,w,h,mode){
 if(mode==='original')return data;
 const g=gray(data);
 if(mode==='gray'){for(let i=0;i<g.length;i++)data.fill(g[i],i*4,i*4+3);return data;}
 if(!['bw','magic'].includes(mode))throw Error('Unknown filter.');
 if(mode==='magic'){
  // Estimate paper color from bright pixels in tiles. Interpolate the estimates
  // rather than normalizing around individual letters (which creates halos).
  const tile=96,cols=Math.ceil(w/tile),rows=Math.ceil(h/tile),background=new Float32Array(cols*rows*3);
  for(let ty=0;ty<rows;ty++)for(let tx=0;tx<cols;tx++){
   const hist=[new Uint32Array(256),new Uint32Array(256),new Uint32Array(256)];let count=0;
   for(let y=ty*tile;y<Math.min(h,(ty+1)*tile);y++)for(let x=tx*tile;x<Math.min(w,(tx+1)*tile);x++){const k=(y*w+x)*4;for(let ch=0;ch<3;ch++)hist[ch][data[k+ch]]++;count++;}
   for(let ch=0;ch<3;ch++){let total=0,value=255;for(let i=0;i<256;i++){total+=hist[ch][i];if(total>=count*.9){value=i;break;}}background[(ty*cols+tx)*3+ch]=Math.max(80,value);}
  }
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const gx=Math.max(0,Math.min(cols-1,x/tile-.5)),gy=Math.max(0,Math.min(rows-1,y/tile-.5)),ix=Math.floor(gx),iy=Math.floor(gy),fx=gx-ix,fy=gy-iy;
   for(let ch=0;ch<3;ch++){const a=background[(iy*cols+ix)*3+ch],b=background[(iy*cols+Math.min(cols-1,ix+1))*3+ch],c=background[(Math.min(rows-1,iy+1)*cols+ix)*3+ch],d=background[(Math.min(rows-1,iy+1)*cols+Math.min(cols-1,ix+1))*3+ch],paper=(a*(1-fx)+b*fx)*(1-fy)+(c*(1-fx)+d*fx)*fy,k=(y*w+x)*4+ch;data[k]=Math.max(0,Math.min(255,(data[k]*255/paper-128)*1.05+128));}
  }return data;
 }
 const stride=w+1,integral=new Float64Array((w+1)*(h+1));
 for(let y=0;y<h;y++){let sum=0;for(let x=0;x<w;x++){sum+=g[y*w+x];integral[(y+1)*stride+x+1]=integral[y*stride+x+1]+sum;}}
 const radius=Math.max(8,Math.round(Math.min(w,h)/24));
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const left=Math.max(0,x-radius),right=Math.min(w,x+radius+1),top=Math.max(0,y-radius),bottom=Math.min(h,y+radius+1),mean=(integral[bottom*stride+right]-integral[top*stride+right]-integral[bottom*stride+left]+integral[top*stride+left])/((right-left)*(bottom-top)),i=y*w+x,k=i*4;
  const value=g[i]<Math.max(25,mean-12)?0:255;data.fill(value,k,k+3);
 }return data;
}
