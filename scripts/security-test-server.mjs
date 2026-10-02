import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import worker from '../worker.mjs';
export async function testServer(){
 const root=path.resolve('public');
 const env={LOCAL_DEV:'true',CSP_ENFORCE:'true',ASSETS:{fetch:async request=>{
  const url=new URL(request.url),file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep))return new Response('Not found',{status:404});
  try{const data=await readFile(file),ext=path.extname(file);return new Response(data,{headers:{'Content-Type':({'.html':'text/html;charset=utf-8','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.wasm':'application/wasm','.woff2':'font/woff2','.json':'application/json','.txt':'text/plain','.xml':'application/xml'})[ext]||'application/octet-stream'}});}
  catch{return new Response(await readFile('public/404.html'),{status:404,headers:{'Content-Type':'text/html'}});}
 }}};
 const server=createServer(async(req,res)=>{try{const result=await worker.fetch(new Request('http://127.0.0.1'+req.url,{method:req.method}),env);res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));}catch{res.writeHead(500).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 return {base:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(r=>server.close(r))};
}
