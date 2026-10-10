import manifest from './config/security-manifest.json' with {type:'json'};
import {verifyReportToken} from './admin-report-auth.mjs';
const ORIGIN='https://kalikatools.com', OWNER='140908479';
const encoder=new TextEncoder();
const random=()=>crypto.randomUUID()+crypto.randomUUID();
const cookie=(name,value,age)=>`${name}=${value}; Path=/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const cookies=r=>Object.fromEntries((r.headers.get('Cookie')||'').split(';').map(x=>x.trim().split('=')));
function reply(body,status=200,type='text/html; charset=utf-8',extra={}){return new Response(body,{status,headers:{'Content-Type':type,'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Strict-Transport-Security':'max-age=31536000; includeSubDomains','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",...extra}});}
const json=(v,status=200)=>reply(JSON.stringify(v),status,'application/json');
const redirect=(location,setCookie)=>reply('',302,'text/plain',{Location:location,...(setCookie?{'Set-Cookie':setCookie}:{})});
async function github(path,options={}){const r=await fetch(`https://api.github.com${path}`,{...options,headers:{Accept:'application/vnd.github+json','User-Agent':'Kalika-Private-Admin',...options.headers},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('GitHub temporarily unavailable');return r.json();}
async function digest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function handleAdmin(request,env){
 const url=new URL(request.url),p=url.pathname;
 if(url.origin!==ORIGIN&&env.LOCAL_DEV!=='true')return reply('Not found',404,'text/plain');
 if(!['GET','POST'].includes(request.method))return reply('Method not allowed',405,'text/plain');
 try{
  if(env.ADMIN_RATE_LIMIT&&(p.startsWith('/admin/api/')||['/admin/login','/admin/callback','/admin/logout'].includes(p))){
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
  if(p==='/admin/style.css')return reply(style,200,'text/css');
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
   const pages=Object.entries(manifest.pages).filter(([route,page])=>!['/404','/404.html'].includes(route)&&Boolean(page.title)).map(([route,page])=>({route,title:page.title||'',description:page.description||''}));
   return json({pages});
  }
  if(p==='/admin'||p==='/admin/')return reply(dashboard);
  if(p==='/admin/client.js')return reply(client,200,'application/javascript');
  return reply('Not found',404,'text/plain');
 }catch{return json({error:'This admin service is temporarily unavailable. Please retry.'},503);}
}
const head='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Kalika Private Admin</title><link rel="stylesheet" href="/admin/style.css">';
const loginPage='<!doctype html><html lang="en"><head>'+head+'</head><body><main><h1>Kalika private admin</h1><p>Owner access only. Sign in with your GitHub account.</p><a href="/admin/login">Sign in with GitHub</a><p>Your visitors do not need an account.</p></main></body></html>';
const dashboard='<!doctype html><html lang="en"><head>'+head+'</head><body><main><header><p>PRIVATE WORKSPACE · KALIKA</p><h1>Your Kalika workspace</h1><p>Site health, maintenance reports and SEO review in one place.</p><button id="logout">Sign out</button></header><p id="status" role="status">Loading reports…</p><nav aria-label="Workspace"><a href="#health">Site health</a><a href="#seo">SEO drafts</a><a href="/" target="_blank" rel="noopener">View public site ↗</a></nav><section id="health"><h2>Site health & reports</h2><p>Scheduled checks suggest fixes for review. They never edit or publish your site.</p><button id="refresh">Refresh reports</button><div id="overview" class="overview"></div><h3>Recent maintenance runs</h3><div id="runs"></div><label>Report schedule<select id="report-filter"><option value="all">All schedules</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="combined">Combined checks</option></select></label><div id="reports"></div></section><section id="seo"><h2>SEO review drafts</h2><p>Review titles and descriptions, then export a proposal. Publishing still requires a reviewed code change.</p><button id="load-seo">Load page metadata</button><label>Find a page<input id="page-search" type="search" placeholder="Search by URL or title" disabled></label><p id="seo-summary" role="status">Load metadata to review page titles and descriptions.</p><label>Page<select id="page"><option>Select a page</option></select></label><label>Title<input id="title" aria-describedby="title-count"><small id="title-count"></small></label><label>Description<textarea id="description" aria-describedby="description-count"></textarea><small id="description-count"></small></label><button id="draft" disabled>Download review draft</button></section><footer><a href="https://github.com/AdarshaPangeni7/kalika/actions">GitHub Actions and full artifacts</a> · <a href="https://github.com/AdarshaPangeni7/kalika/pulls">Review dependency updates</a></footer></main><script src="/admin/client.js"></script></body></html>';
const style=':root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f4f5f2;color:#172f38;font:16px/1.6 system-ui}main{max-width:1050px;margin:auto;padding:40px 20px}header{border-bottom:1px solid #c8d6d8;padding-bottom:24px}header p{letter-spacing:.1em;font-size:12px;color:#245a6c}h1{font-size:36px;margin:8px 0}section{background:white;border:1px solid #d0dcdf;border-radius:12px;padding:24px;margin:24px 0}a{color:#165369}button{background:#215c70;color:white;border:0;border-radius:6px;padding:10px 16px;font:inherit;cursor:pointer}button:disabled{opacity:.6}label{display:block;margin:18px 0}input,textarea,select{display:block;width:100%;padding:10px;font:inherit;border:1px solid #879ca4;border-radius:6px}textarea{min-height:100px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.6 ui-monospace,monospace}details{border-top:1px solid #d0dcdf;padding:16px 0}summary{cursor:pointer;font-weight:600}.warning{background:#fff2d5;padding:12px;border-radius:6px}footer{padding:20px 0}.overview{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:24px 0}.metric,.run{padding:16px;border:1px solid #c8d6d8;border-radius:12px;background:#f6f8f6}.metric strong{display:block;font-size:26px}.report-card{border:1px solid #c8d6d8;border-radius:12px;padding:20px;margin:18px 0}.report-card h3{margin:0}.report-card h4{margin-bottom:8px}.report-card ul{padding-left:22px}.report-card li{overflow-wrap:anywhere;margin:8px 0}.run{display:flex;justify-content:space-between;gap:16px;margin:10px 0}.badge{font-size:13px;font-weight:700;color:#205348}.error{color:#a32222}.warning{color:#684b08}header{position:relative;padding-right:100px}#logout{position:absolute;right:0;top:20px}nav{display:flex;gap:24px;flex-wrap:wrap;padding:20px 0}small{color:#445e68}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible{outline:3px solid #bd791c;outline-offset:3px}section{scroll-margin-top:20px}#status{padding:12px 16px;border-left:3px solid #215c70;background:#e9f0ef}h2{font-size:24px}pre{max-height:480px;overflow:auto}footer a{display:inline-block;margin:6px 0}@media(max-width:650px){main{padding:24px 18px}.overview{grid-template-columns:1fr}header{padding-right:0;padding-bottom:70px}#logout{top:auto;bottom:20px;left:0;right:auto}h1{font-size:30px}section{padding:18px}.run{flex-direction:column;gap:4px}}';
const client=String.raw`const $=id=>document.getElementById(id);let csrf='',pages=[],reports=[];
async function api(path){const r=await fetch('/admin/api/'+path);if(r.status===401){location.href='/admin';throw Error('Session expired');}const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d;}
function el(tag,text){const e=document.createElement(tag);e.textContent=text;return e;}
function date(value){const d=new Date(value);return Number.isNaN(d.getTime())?'Date unavailable':d.toLocaleString();}
function stale(r){const t=Date.parse(r.checkedAt||r.receivedAt);return !Number.isFinite(t)||Date.now()-t>(r.mode==='daily'?2:r.mode==='monthly'?35:8)*86400000;}
function markdown(text){const wrap=el('div','');let list=null;for(const line of text.split(String.fromCharCode(10))){if(line.startsWith('## ')){wrap.append(el('h4',line.slice(3)));list=null;}else if(line.startsWith('- ')){if(!list){list=el('ul','');wrap.append(list);}list.append(el('li',line.slice(2)));}else if(line.trim()&&!line.startsWith('# ')&&line.trim()!=='---'){wrap.append(el('p',line));list=null;}}return wrap;}
function renderReports(){const filter=$('report-filter').value;$('reports').replaceChildren();const shown=reports.filter(r=>filter==='all'||r.mode===(filter==='combined'?'all':filter));if(!shown.length)$('reports').append(el('p','No report for this schedule yet. Check GitHub Actions for the latest run.'));for(const r of shown){const box=el('article','');box.className='report-card';box.append(el('h3',r.mode==='all'?'Combined checks':r.mode.charAt(0).toUpperCase()+r.mode.slice(1)+' checks'),el('p','Checked '+date(r.checkedAt||r.receivedAt)));if(stale(r)){const w=el('p','Report needs refreshing. These results may no longer reflect the live site.');w.className='warning';box.append(w);}for(const report of r.reports){box.append(el('h4',report.name),markdown(report.text));const details=el('details','');details.append(el('summary','View original report'),el('pre',report.text));box.append(details);}$('reports').append(box);}}
async function load(){$('refresh').disabled=true;try{const d=await api('reports');reports=d.reports||[];$('status').textContent='Last refreshed '+date(d.refreshedAt);$('runs').replaceChildren();$('overview').replaceChildren();for(const [value,label]of [[reports.length,'Synced schedules'],[reports.filter(stale).length,'Reports needing refresh'],[(d.runs||[]).filter(r=>['failure','timed_out','cancelled','action_required'].includes(r.conclusion)).length,'Recent runs needing review']]){const m=el('div','');m.className='metric';m.append(el('strong',String(value)),el('span',label));$('overview').append(m);}if(d.githubError)$('runs').append(el('p',d.githubError));if(!d.runs?.length)$('runs').append(el('p','No workflow run status available. Open GitHub Actions below for details.'));for(const r of d.runs||[]){const card=el('div','');card.className='run';const a=el('a','Run '+r.id+' · '+date(r.createdAt));if(/^https:\/\/github\.com\/AdarshaPangeni7\/kalika\/actions\/runs\/\d+$/.test(r.url)){a.href=r.url;a.target='_blank';a.rel='noopener';}const badge=el('span',r.conclusion||r.status);badge.className='badge';card.append(a,badge);$('runs').append(card);}renderReports();}catch(e){$('status').textContent=e.message+' Previously loaded reports may be outdated.';}finally{$('refresh').disabled=false;}}
$('report-filter').onchange=renderReports;
$('refresh').onclick=load;$('logout').onclick=async()=>{const r=await fetch('/admin/logout',{method:'POST',headers:{'X-Kalika-CSRF':csrf}});if(r.ok)location.href='/admin';};
function counts(){$('title-count').textContent=$('title').value.length+' characters · typically aim for 50–60';$('description-count').textContent=$('description').value.length+' characters · typically aim for 140–160';}
function selectPage(){const p=pages[$('page').value];$('draft').disabled=!p;if(p){$('title').value=p.title;$('description').value=p.description;}else{$('title').value='';$('description').value='';}counts();}
function filterPages(){const q=$('page-search').value.toLowerCase();const current=$('page').value;const matched=pages.map((p,i)=>({p,i})).filter(({p})=>(p.route+' '+p.title).toLowerCase().includes(q));$('page').replaceChildren(...matched.map(({p,i})=>{const o=el('option',p.route);o.value=i;return o;}));if(matched.some(({i})=>String(i)===current))$('page').value=current;$('seo-summary').textContent=matched.length+' of '+pages.length+' pages shown · '+pages.filter(p=>!p.title.trim()||!p.description.trim()).length+' missing a title or description. Length guidance is not a ranking guarantee.';selectPage();}
$('load-seo').onclick=async()=>{$('load-seo').disabled=true;try{pages=(await api('seo')).pages;$('page-search').disabled=false;filterPages();}catch(e){$('status').textContent=e.message;}finally{$('load-seo').disabled=false;}};
$('page-search').oninput=filterPages;$('page').onchange=selectPage;$('title').oninput=counts;$('description').oninput=counts;
$('draft').onclick=()=>{const p=pages[$('page').value];if(!p)return;const blob=new Blob([JSON.stringify({route:p.route,title:$('title').value,description:$('description').value,reviewRequired:true},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=el('a','');a.href=url;a.download='kalika-seo-review.json';a.click();$('status').textContent='Review draft downloaded. No live page has been changed.';setTimeout(()=>URL.revokeObjectURL(url),1000);};
api('session').then(s=>{csrf=s.csrf;load();}).catch(e=>{$('status').textContent=e.message;});`;
