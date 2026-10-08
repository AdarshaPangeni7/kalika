import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export async function syncReports(env=process.env){
 if(!env.ACTIONS_ID_TOKEN_REQUEST_URL||!env.ACTIONS_ID_TOKEN_REQUEST_TOKEN){console.log('Admin report sync requires a GitHub Actions identity token. GitHub artifacts remain available.');return;}
 const url=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);url.searchParams.set('audience','https://kalikatools.com/admin/api/ingest');
 const identity=await fetch(url,{headers:{Authorization:'Bearer '+env.ACTIONS_ID_TOKEN_REQUEST_TOKEN},signal:AbortSignal.timeout(15000)});
 if(!identity.ok)throw Error('Could not obtain workflow identity');
 const {value:token}=await identity.json();if(!token)throw Error('Workflow identity unavailable');
 const reports=[];
 for(const name of ['latest.md','quality.md','competitor-seo.md','dependencies.md']){
  try{reports.push({name,text:(await readFile(new URL('../reports/'+name,import.meta.url),'utf8')).slice(0,100000)});}catch(e){if(e.code!=='ENOENT')throw e;}
 }
 const response=await fetch('https://kalikatools.com/admin/api/ingest',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({mode:env.KALIKA_CHECK_MODE,runId:env.GITHUB_RUN_ID,checkedAt:new Date().toISOString(),reports}),signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('Admin report sync failed: HTTP '+response.status);
 console.log('Maintenance summaries synced to private admin.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await syncReports();
