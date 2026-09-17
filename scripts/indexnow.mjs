import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {atomicJson} from './traditional-texts.mjs';
const origin='https://kalikatools.com';
const hash=text=>createHash('sha256').update(text.replaceAll('\r\n','\n')).digest('hex');

export async function submitIndexNow(root,urls,{fetcher=fetch,stateFile=path.join(root,'.kalika-admin/indexnow-state.json')}={}){
 const config=JSON.parse(await readFile(path.join(root,'indexnow.config.json'),'utf8'));
 if(config.host!=='kalikatools.com'||!/^[a-f0-9]{32}$/.test(config.key))throw Error('Invalid IndexNow configuration.');
 const keyLocation=origin+'/'+config.key+'.txt';
 const sitemap=await readFile(path.join(root,'public/sitemap.xml'),'utf8');
 const allowed=new Set([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]));
 const requested=[...new Set(urls||allowed)];
 for(const u of requested){const parsed=new URL(u);if(parsed.origin!==origin||parsed.search||parsed.hash||!allowed.has(u))throw Error('Only canonical public URLs from the sitemap can be submitted.');}
 let state={version:1,accepted:{}};try{state=JSON.parse(await readFile(stateFile,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 const candidates=[];
 for(const url of requested){let pathname=new URL(url).pathname;if(pathname.endsWith('/'))pathname+='index.html';else pathname+='.html';const file=path.resolve(root,'public','.'+pathname);if(!file.startsWith(path.join(root,'public')+path.sep))throw Error('Invalid public file path.');const digest=hash(await readFile(file,'utf8'));if(state.accepted[url]?.hash!==digest)candidates.push({url,hash:digest});}
 if(!candidates.length)return {status:'unchanged',submitted:0,message:'No changed public pages need an IndexNow notification.'};
 const keyResponse=await fetcher(keyLocation,{signal:AbortSignal.timeout(20000),cache:'no-store'});
 if(!keyResponse.ok||(await keyResponse.text()).trim()!==config.key)throw Error('IndexNow ownership file is not live yet or does not match. Deploy the site first.');
 const ready=[],skipped=[];
 for(const candidate of candidates){try{const r=await fetcher(candidate.url,{signal:AbortSignal.timeout(20000),cache:'no-store'});if(r.status===200&&hash(await r.text())===candidate.hash)ready.push(candidate);else skipped.push(candidate.url);}catch{skipped.push(candidate.url);}}
 if(!ready.length)return {status:'not-live',submitted:0,skipped,message:'No changed pages matched the deployed version. Deploy first, then retry the notification.'};
 let statusCode=200;
 for(let i=0;i<ready.length;i+=10000){const batch=ready.slice(i,i+10000);const r=await fetcher('https://api.indexnow.org/indexnow',{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify({host:config.host,key:config.key,keyLocation,urlList:batch.map(x=>x.url)}),signal:AbortSignal.timeout(30000)});if(![200,202].includes(r.status))throw Error(`IndexNow returned HTTP ${r.status}. The live site is unaffected; retry the notification later.`);if(r.status===202)statusCode=202;for(const item of batch)state.accepted[item.url]={hash:item.hash,submittedAt:new Date().toISOString(),response:r.status};await atomicJson(stateFile,state);}
 return {status:statusCode===202?'pending-validation':'received',httpStatus:statusCode,submitted:ready.length,skipped,message:`IndexNow received ${ready.length} URL${ready.length===1?'':'s'}${statusCode===202?' (ownership validation pending)':''}. This is not confirmation of indexing.${skipped.length?' '+skipped.length+' pages were skipped because the live version did not match.':''}`};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const result=await submitIndexNow(process.cwd(),process.argv.slice(2).length?process.argv.slice(2):undefined);console.log(result.message);if(result.skipped?.length)console.log('Skipped:',result.skipped.join(', '));if(result.status==='not-live'||result.skipped?.length)process.exitCode=1;}catch(e){console.error(e.message);process.exitCode=1;}}
