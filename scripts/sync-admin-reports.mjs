import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export async function syncReports(env=process.env){
 if(!env.ADMIN_REPORT_SECRET){console.log('Admin report sync is not configured. GitHub artifacts remain available.');return;}
 const reports=[];
 for(const name of ['latest.md','quality.md','competitor-seo.md','dependencies.md']){
  try{reports.push({name,text:(await readFile(new URL('../reports/'+name,import.meta.url),'utf8')).slice(0,100000)});}catch(e){if(e.code!=='ENOENT')throw e;}
 }
 const response=await fetch('https://kalikatools.com/admin/api/ingest',{method:'POST',headers:{Authorization:'Bearer '+env.ADMIN_REPORT_SECRET,'Content-Type':'application/json'},body:JSON.stringify({mode:env.KALIKA_CHECK_MODE,runId:env.GITHUB_RUN_ID,checkedAt:new Date().toISOString(),reports}),signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('Admin report sync failed: HTTP '+response.status);
 console.log('Maintenance summaries synced to private admin.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await syncReports();
