import manifest from './config/security-manifest.json' with {type:'json'};
import {verifyReportToken} from './admin-report-auth.mjs';
const ORIGIN='https://kalikatools.com', OWNER='140908479';
const encoder=new TextEncoder();
const random=()=>crypto.randomUUID()+crypto.randomUUID();
const cookie=(name,value,age)=>`${name}=${value}; Path=/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const cookies=r=>Object.fromEntries((r.headers.get('Cookie')||'').split(';').map(x=>x.trim().split('=')));
function reply(body,status=200,type='text/html; charset=utf-8',extra={}){return new Response(body,{status,headers:{'Content-Type':type,'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",...extra}});}
const json=(v,status=200)=>reply(JSON.stringify(v),status,'application/json');
const redirect=(location,setCookie)=>reply('',302,'text/plain',{Location:location,...(setCookie?{'Set-Cookie':setCookie}:{})});
async function github(path,options={}){const r=await fetch(`https://api.github.com${path}`,{...options,headers:{Accept:'application/vnd.github+json','User-Agent':'Kalika-Private-Admin',...options.headers},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('GitHub temporarily unavailable');return r.json();}
async function digest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function handleAdmin(request,env){
 const url=new URL(request.url),p=url.pathname;
 if(url.origin!==ORIGIN&&env.LOCAL_DEV!=='true')return reply('Not found',404,'text/plain');
 if(!['GET','POST'].includes(request.method))return reply('Method not allowed',405,'text/plain');
 try{
  if(env.ADMIN_RATE_LIMIT&&['/admin/login','/admin/callback','/admin/api/ingest'].includes(p)){
   const key=p+':'+await digest(request.headers.get('CF-Connecting-IP')||'local');
   if(!(await env.ADMIN_RATE_LIMIT.limit({key})).success)return reply('Too many requests. Retry in a minute.',429,'text/plain',{'Retry-After':'60'});
  }
  if(p==='/admin/api/ingest'){
   if(request.method!=='POST')return json({error:'Method not allowed'},405);
   if(!env.ADMIN_STORE)return json({error:'Report sync not configured'},503);
   const claims=await verifyReportToken((request.headers.get('Authorization')||'').replace(/^Bearer /,''));
   if(!claims)return json({error:'Unauthorized'},401);
   if(Number(request.headers.get('Content-Length')||0)>500000)return json({error:'Report too large'},413);
   const raw=await request.text();if(raw.length>500000)return json({error:'Report too large'},413);
   const data=JSON.parse(raw);
   if(String(data.runId)!==claims.run_id)return json({error:'Run ID mismatch'},403);
   if(!['daily','weekly','monthly','all'].includes(data.mode)||!/^\d+$/.test(String(data.runId))||!Array.isArray(data.reports)||data.reports.length>8)return json({error:'Invalid report'},400);
   const names=['latest.md','quality.md','competitor-seo.md','dependencies.md'];
   if(data.reports.some(r=>!names.includes(r.name)||typeof r.text!=='string'||r.text.length>100000))return json({error:'Invalid report content'},400);
   const saved={mode:data.mode,runId:String(data.runId),checkedAt:data.checkedAt,receivedAt:new Date().toISOString(),reports:data.reports};
   await env.ADMIN_STORE.put('report:'+data.mode,JSON.stringify(saved));
   return json({ok:true});
  }
  if(p==='/admin/style.css')return reply(style,200,'text/css');
  if(!env.ADMIN_STORE||!env.GITHUB_CLIENT_ID||!env.GITHUB_CLIENT_SECRET)return reply('<h1>Kalika private admin</h1><p>Secure sign-in is being configured. Access remains locked.</p>',503);
  const c=cookies(request);
  if(p==='/admin/login'){
   const state=random(),verifier=random();
   await env.ADMIN_STORE.put('oauth:'+await digest(state),JSON.stringify({verifier}),{expirationTtl:600});
   const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(verifier)));
   const challenge=btoa(String.fromCharCode(...hash)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
   const target=new URL('https://github.com/login/oauth/authorize');
   target.search=new URLSearchParams({client_id:env.GITHUB_CLIENT_ID,redirect_uri:ORIGIN+'/admin/callback',state,scope:'',login:'AdarshaPangeni7',allow_signup:'false',code_challenge:challenge,code_challenge_method:'S256'}).toString();
   return redirect(target.href,cookie('kalika_oauth',state,600));
  }
  if(p==='/admin/callback'){
   const state=url.searchParams.get('state');
   if(!state||state!==c.kalika_oauth||!url.searchParams.get('code'))return reply('Sign-in could not be verified. Start again at /admin.',403,'text/plain');
   const key='oauth:'+await digest(state),pending=await env.ADMIN_STORE.get(key,'json');
   if(!pending)return reply('Sign-in expired. Start again at /admin.',403,'text/plain');
   await env.ADMIN_STORE.delete(key);
   const tokenResponse=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code:url.searchParams.get('code'),redirect_uri:ORIGIN+'/admin/callback',code_verifier:pending.verifier}),signal:AbortSignal.timeout(12000)});
   const token=await tokenResponse.json();if(!tokenResponse.ok||!token.access_token)throw Error('Sign-in failed');
   const user=await github('/user',{headers:{Authorization:'Bearer '+token.access_token}});
   if(String(user.id)!==OWNER)return reply('This private admin is restricted to its owner.',403,'text/plain',{'Set-Cookie':cookie('kalika_oauth','',0)});
   const session=random();await env.ADMIN_STORE.put('session:'+await digest(session),JSON.stringify({id:OWNER,csrf:random()}),{expirationTtl:28800});
   // GitHub tokens are used only for identity verification and are never stored or sent to the browser.
   const r=redirect('/admin',cookie('kalika_admin',session,28800));r.headers.append('Set-Cookie',cookie('kalika_oauth','',0));return r;
  }
  const session=c.kalika_admin?await env.ADMIN_STORE.get('session:'+await digest(c.kalika_admin),'json'):null;
  if(!session||session.id!==OWNER)return p.startsWith('/admin/api/')?json({error:'Sign in required'},401):reply(loginPage);
  if(request.method==='POST'){
   if(request.headers.get('Origin')!==ORIGIN||request.headers.get('X-Kalika-CSRF')!==session.csrf)return json({error:'Security check failed'},403);
   if(p==='/admin/logout'){await env.ADMIN_STORE.delete('session:'+await digest(c.kalika_admin));return reply('{"ok":true}',200,'application/json',{'Set-Cookie':cookie('kalika_admin','',0)});}
   return json({error:'Not found'},404);
  }
  if(p==='/admin/api/session')return json({login:'AdarshaPangeni7',csrf:session.csrf});
  if(p==='/admin/api/reports'){
   const reports=await Promise.all(['daily','weekly','monthly','all'].map(mode=>env.ADMIN_STORE.get('report:'+mode,'json')));
   let runs=null,githubError=null;
   try{runs=(await github('/repos/AdarshaPangeni7/kalika/actions/workflows/kalika-maintenance.yml/runs?per_page=5')).workflow_runs.map(r=>({id:r.id,status:r.status,conclusion:r.conclusion,createdAt:r.created_at,url:r.html_url}));}catch{githubError='GitHub run status is temporarily unavailable.';}
   return json({reports:reports.filter(Boolean),runs,githubError,refreshedAt:new Date().toISOString()});
  }
  if(p==='/admin/api/seo'){
   const pages=Object.entries(manifest.pages).filter(([route])=>route!=='/404.html').map(([route,page])=>({route,title:page.title||'',description:page.description||''}));
   return json({pages});
  }
  if(p==='/admin'||p==='/admin/')return reply(dashboard);
  if(p==='/admin/client.js')return reply(client,200,'application/javascript');
  if(p==='/admin/style.css')return reply(style,200,'text/css');
  return reply('Not found',404,'text/plain');
 }catch{return json({error:'This admin service is temporarily unavailable. Please retry.'},503);}
}
const head='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Kalika Private Admin</title><link rel="stylesheet" href="/admin/style.css">';
const loginPage='<!doctype html><html lang="en"><head>'+head+'</head><body><main><h1>Kalika private admin</h1><p>Owner access only. Sign in with your GitHub account.</p><a href="/admin/login">Sign in with GitHub</a><p>Your visitors do not need an account.</p></main></body></html>';
const dashboard='<!doctype html><html lang="en"><head>'+head+'</head><body><main><header><p>PRIVATE WORKSPACE · KALIKA</p><h1>Site overview</h1><button id="logout">Sign out</button></header><p id="status" role="status">Loading reports…</p><section><h2>Reports</h2><p>Scheduled checks suggest fixes for review. They never edit or publish your site.</p><button id="refresh">Refresh reports</button><div id="runs"></div><div id="reports"></div></section><section><h2>SEO review drafts</h2><p>Review titles and descriptions, then export a proposal. Publishing still requires a reviewed code change.</p><button id="load-seo">Load page metadata</button><label>Page<select id="page"><option>Select a page</option></select></label><label>Title<input id="title"></label><label>Description<textarea id="description"></textarea></label><button id="draft">Download review draft</button></section><footer><a href="https://github.com/AdarshaPangeni7/kalika/actions">GitHub Actions and full artifacts</a> · <a href="https://github.com/AdarshaPangeni7/kalika/pulls">Review dependency updates</a></footer></main><script src="/admin/client.js"></script></body></html>';
const style=':root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f4f5f2;color:#172f38;font:16px/1.6 system-ui}main{max-width:1050px;margin:auto;padding:40px 20px}header{border-bottom:1px solid #c8d6d8;padding-bottom:24px}header p{letter-spacing:.1em;font-size:12px;color:#245a6c}h1{font-size:36px;margin:8px 0}section{background:white;border:1px solid #d0dcdf;border-radius:12px;padding:24px;margin:24px 0}a{color:#165369}button{background:#215c70;color:white;border:0;border-radius:6px;padding:10px 16px;font:inherit;cursor:pointer}button:disabled{opacity:.6}label{display:block;margin:18px 0}input,textarea,select{display:block;width:100%;padding:10px;font:inherit;border:1px solid #879ca4;border-radius:6px}textarea{min-height:100px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.6 ui-monospace,monospace}details{border-top:1px solid #d0dcdf;padding:16px 0}summary{cursor:pointer;font-weight:600}.warning{background:#fff2d5;padding:12px;border-radius:6px}footer{padding:20px 0}';
const client=`const $=id=>document.getElementById(id);let csrf='',pages=[];
async function api(path){const r=await fetch('/admin/api/'+path);if(r.status===401){location.href='/admin';throw Error('Session expired');}const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d;}
function el(tag,text){const e=document.createElement(tag);e.textContent=text;return e;}
async function load(){ $('refresh').disabled=true;try{const d=await api('reports');$('status').textContent='Refreshed '+new Date(d.refreshedAt).toLocaleString();$('reports').replaceChildren();$('runs').replaceChildren();if(d.githubError)$('runs').append(el('p',d.githubError));for(const r of d.runs||[]){const a=el('a','Run '+r.id+' — '+(r.conclusion||r.status));a.href=r.url;a.target='_blank';a.rel='noopener';const p=el('p','');p.append(a);$('runs').append(p);}if(!d.reports.length)$('reports').append(el('p','No synced reports yet. The next maintenance run will publish its summary here.'));for(const r of d.reports){const box=el('article','');box.append(el('h3',r.mode+' check'),el('p','Received '+new Date(r.receivedAt).toLocaleString()));if(Date.now()-Date.parse(r.receivedAt)>(r.mode==='daily'?2: r.mode==='monthly'?35:8)*86400000){const w=el('p','This report is stale. Check the latest workflow run.');w.className='warning';box.append(w);}for(const report of r.reports){const details=el('details','');details.append(el('summary',report.name),el('pre',report.text));box.append(details);}$('reports').append(box);}}catch(e){$('status').textContent=e.message;}finally{$('refresh').disabled=false;}}
$('refresh').onclick=load;$('logout').onclick=async()=>{const r=await fetch('/admin/logout',{method:'POST',headers:{'X-Kalika-CSRF':csrf}});if(r.ok)location.href='/admin';};
$('load-seo').onclick=async()=>{try{pages=(await api('seo')).pages;$('page').replaceChildren(...pages.map((p,i)=>{const o=el('option',p.route);o.value=i;return o;}));$('page').onchange();}catch(e){$('status').textContent=e.message;}};
$('page').onchange=()=>{const p=pages[$('page').value];if(p){$('title').value=p.title;$('description').value=p.description;}};
$('draft').onclick=()=>{const p=pages[$('page').value];if(!p)return;const blob=new Blob([JSON.stringify({route:p.route,title:$('title').value,description:$('description').value,reviewRequired:true},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=el('a','');a.href=url;a.download='kalika-seo-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
api('session').then(s=>{csrf=s.csrf;load();}).catch(e=>{$('status').textContent=e.message;});`;
