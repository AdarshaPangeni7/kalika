import fs from 'node:fs/promises';
import path from 'node:path';
import lighthouse from 'lighthouse';
import {launch} from 'chrome-launcher';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {testServer} from './security-test-server.mjs';
const args=new Map(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
const runs=Number(args.get('runs')||3);if(!Number.isInteger(runs)||runs<1||runs>3)throw Error('runs must be 1–3');
const mode=args.get('mode')||'all';if(!['all','accessibility','lighthouse'].includes(mode))throw Error('Unknown quality mode');
const server=await testServer();const base=(process.env.KALIKA_TEST_ORIGIN||server.base).replace(/\/$/,'');
const localTarget=!process.env.KALIKA_TEST_ORIGIN;
const out='reports/quality';await fs.mkdir(out,{recursive:true});
const report={checkedAt:new Date().toISOString(),origin:base,mode,runs,accessibility:[],lighthouse:[],errors:[]};
const representative=['/','/pdf-tools','/image-tools','/tools/ocr-pdf','/nepali-tools'];
try {
 if(mode!=='lighthouse'){
  const browser=await chromium.launch({channel:process.platform==='win32'?'chrome':undefined});
  try{const manifest=JSON.parse(await fs.readFile('config/security-manifest.json','utf8'));
   const routes=[];for(const [route,entry]of Object.entries(manifest.pages)){const html=await fs.readFile('public'+entry.asset,'utf8');if(html.includes('rel="canonical"')&&route!=='/404')routes.push(route);}
   for(const route of routes){for(const width of representative.includes(route)?[1280,390]:[1280]){
    const context=await browser.newContext({viewport:{width,height:900},locale:'en-US'}),page=await context.newPage();
    try{const response=await page.goto(base+route,{waitUntil:'networkidle',timeout:30000});if(response.status()!==200)throw Error('HTTP '+response.status());
     console.log(`axe: ${route} (${width}px)`);
     const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
     report.accessibility.push({route,width,passes:results.passes.length,incomplete:results.incomplete.map(v=>({id:v.id,impact:v.impact,helpUrl:v.helpUrl,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),violations:results.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,helpUrl:v.helpUrl,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
    }catch(e){report.errors.push(`${route} (${width}px): ${e.message}`);}finally{await context.close();}
   }}
  }finally{await browser.close();}
 }
 if(mode!=='accessibility'){
  const chrome=await launch({chromePath:process.platform==='win32'?undefined:chromium.executablePath(),chromeFlags:['--headless','--no-sandbox','--disable-dev-shm-usage']});
  try{for(const route of representative){const results=[];
   for(let i=0;i<runs;i++){
    try{const result=await lighthouse(base+route,{port:chrome.port,output:['html','json'],logLevel:'error',onlyCategories:['performance','accessibility','best-practices','seo']});
     console.log(`Lighthouse: ${route}, run ${i+1}/${runs}`);
     if(result.lhr.runtimeError)throw Error(result.lhr.runtimeError.message);
     const stem=(route==='/'?'home':route.slice(1).replaceAll('/','-'))+'-'+(i+1);
     await fs.writeFile(`${out}/${stem}.html`,result.report[0]);await fs.writeFile(`${out}/${stem}.json`,result.report[1]);
     results.push(Object.fromEntries(Object.entries(result.lhr.categories).map(([k,v])=>[k,Math.round(v.score*100)])));
    }catch(e){report.errors.push(`Lighthouse ${route} run ${i+1}: ${e.message}`);}
   }
   const median=key=>{const values=results.map(r=>r[key]).sort((a,b)=>a-b);return values.length?values[Math.floor(values.length/2)]:null;};
   report.lighthouse.push({route,completedRuns:results.length,scores:Object.fromEntries(['performance','accessibility','best-practices','seo'].map(k=>[k,k==='seo'&&localTarget?null:median(k)]))});
  }}finally{await chrome.kill();}
 }
} catch(e){report.errors.push(e.message);}finally{await server.close();}
if(mode!=='lighthouse'&&!report.accessibility.length)report.errors.push('No accessibility pages were scanned.');
const failures=report.accessibility.flatMap(p=>p.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>`${p.route} (${p.width}px): ${v.id} — ${v.nodes.length} affected elements`));
const minor=report.accessibility.reduce((n,p)=>n+p.violations.filter(v=>!['critical','serious'].includes(v.impact)).length,0);
const low=report.lighthouse.filter(r=>r.scores.performance!==null&&r.scores.performance<80);
report.passed=report.errors.length===0&&failures.length===0&&low.length===0;
await fs.writeFile(`${out}/results.json`,JSON.stringify(report,null,2));
const lines=['# Kalika quality checks',`Checked: ${report.checkedAt}`,`Target: ${base}`,`Scope: ${mode}. Read-only; no visitor data, edits or deployment.`, '', '## Needs attention',...(failures.length?failures.slice(0,20).map(s=>'- '+s):[mode==='lighthouse'?'- axe was not run in this Lighthouse-only check.':'- No serious/critical axe violations recorded.']),...report.errors.map(e=>'- Check failed: '+e),'','## Mobile Lighthouse lab scores','| Page | Runs | Performance | Accessibility | Best practices | SEO |','|---|---:|---:|---:|---:|---:|',...report.lighthouse.map(r=>`| ${r.route} | ${r.completedRuns}/${runs} | ${r.scores.performance??'unavailable'} | ${r.scores.accessibility??'unavailable'} | ${r.scores['best-practices']??'unavailable'} | ${r.scores.seo??'unavailable'} |`),'','## Worth reviewing',`- ${minor} minor/moderate rule findings; see results.json for affected elements.`,...low.map(r=>`- ${r.route}: mobile performance below 80.`),`- axe scanned ${report.accessibility.length} page/viewport combinations. Automated checks do not establish full accessibility compliance.`, ...(localTarget?['- Local preview is intentionally noindex; SEO category score is not graded here. Weekly live checks grade SEO.']:[]), '- Lighthouse is a simulated mobile lab test, not field Core Web Vitals or a ranking guarantee.','- Full violations, manual-review items and Lighthouse HTML reports are in the workflow artifact.','','## Suggested fixes (human review only)','- Fix reported labels, contrast or structural issues; retest affected pages.','- Review low performance reports before adjusting assets or scripts.','- Missing/failed checks are not passes. Nothing is changed automatically.'];
await fs.writeFile('reports/quality.md',lines.join('\n')+'\n');
console.log(lines.join('\n'));if(!report.passed)process.exitCode=1;
