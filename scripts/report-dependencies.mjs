import fs from 'node:fs/promises';
import {listOpen} from './dependency-review-api.mjs';
await fs.mkdir('reports',{recursive:true});
let failed=false,lines=['# Kalika dependency update review',`Checked: ${new Date().toISOString()}`,'','Dependency bots propose changes for human review. No automatic merging or deployment.',''];

try{
 const [pulls,issues]=await Promise.all([listOpen('pulls'),listOpen('issues')]);
 const updates=pulls.filter(p=>/^(renovate|dependabot)(\[bot\])?$/.test(p.user?.login||''));
 const dashboards=issues.filter(i=>!i.pull_request&&/dependency dashboard/i.test(i.title)&&/^renovate(\[bot\])?$/.test(i.user?.login||''));
 lines.push('## Updates needing review',...(updates.length?updates.map(p=>`- [#${p.number}: ${p.title.replace(/[\[\]\n\r]/g,' ')}](${p.html_url}) — ${p.user.login}`):['- No open Renovate or Dependabot pull requests found. This does not prove the bot is enabled or up to date.']),'','## Dependency dashboard',...(dashboards.length?dashboards.map(i=>`- [Open dashboard](${i.html_url})`):['- No Renovate dashboard found. Check installation/onboarding if you expect it to be active.']),'','## Suggested next steps','- Review update PRs and their tests before merging.','- For vendored PDF/OCR libraries, regenerate browser assets and integrity hashes before approval.');
}catch(e){failed=true;lines.push('## Check unavailable',`- ${e.message}`,'- This is a reporting failure, not a clean dependency result.');}
await fs.writeFile('reports/dependencies.md',lines.join('\n')+'\n');console.log(lines.join('\n'));if(failed)process.exitCode=1;
