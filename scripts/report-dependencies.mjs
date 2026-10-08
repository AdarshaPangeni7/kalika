import fs from 'node:fs/promises';
const repo='AdarshaPangeni7/kalika',root=`https://api.github.com/repos/${repo}`;
await fs.mkdir('reports',{recursive:true});
let failed=false,lines=['# Kalika dependency update review',`Checked: ${new Date().toISOString()}`,'','Dependency bots propose changes for human review. No automatic merging or deployment.',''];
async function list(endpoint){const all=[];for(let page=1;page<=10;page++){const r=await fetch(`${root}/${endpoint}?state=open&per_page=100&page=${page}`,{headers:{Accept:'application/vnd.github+json','User-Agent':'Kalika-maintenance'},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(`GitHub ${endpoint}: HTTP ${r.status}`);const data=await r.json();all.push(...data);if(data.length<100)return all;}throw Error('GitHub result limit reached; update report incomplete.');}
try{
 const [pulls,issues]=await Promise.all([list('pulls'),list('issues')]);
 const updates=pulls.filter(p=>/^(renovate|dependabot)(\[bot\])?$/.test(p.user?.login||''));
 const dashboards=issues.filter(i=>!i.pull_request&&/dependency dashboard/i.test(i.title)&&/^renovate(\[bot\])?$/.test(i.user?.login||''));
 lines.push('## Updates needing review',...(updates.length?updates.map(p=>`- [#${p.number}: ${p.title.replace(/[\[\]\n\r]/g,' ')}](${p.html_url}) — ${p.user.login}`):['- No open Renovate or Dependabot pull requests found. This does not prove the bot is enabled or up to date.']),'','## Dependency dashboard',...(dashboards.length?dashboards.map(i=>`- [Open dashboard](${i.html_url})`):['- No Renovate dashboard found. Check installation/onboarding if you expect it to be active.']),'','## Suggested next steps','- Review update PRs and their tests before merging.','- For vendored PDF/OCR libraries, regenerate browser assets and integrity hashes before approval.');
}catch(e){failed=true;lines.push('## Check unavailable',`- ${e.message}`,'- This is a reporting failure, not a clean dependency result.');}
await fs.writeFile('reports/dependencies.md',lines.join('\n')+'\n');console.log(lines.join('\n'));if(failed)process.exitCode=1;
