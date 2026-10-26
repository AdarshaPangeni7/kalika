import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

export function workflowSummary(steps){
 const labels={run_checks:'Site checks',nepali:'Nepali typing',preeti:'Preeti and device language',discovery:'Crawler accessibility',calculator:'Simple calculator',pdf:'PDF tools',calculators:'Scientific, fraction and work-hours calculators',tip_calculator:'Tip calculator',shopping_calculators:'Shopping calculators',competitors:'Competitor SEO',organizer:'Organize PDF',pdf_edits:'PDF editing',fill_sign:'Fill and Sign',scanner:'Document scanner',canvas_safety:'Canvas privacy',everyday_tools:'Text, image and other calculators',pdf_experience:'PDF workflows',ocr:'Private OCR',french:'French keyboard',serbian:'Serbian converter',quality:'Accessibility and Lighthouse',dependencies:'Dependency review'};
 const rows=Object.entries(labels).filter(([id])=>steps[id]).map(([id,label])=>({label,outcome:steps[id].outcome}));
 return ['## Workflow check results',...rows.map(r=>`- ${r.label}: ${r.outcome==='success'?'passed':r.outcome==='skipped'?'not run for this schedule':r.outcome==='failure'?'FAILED — review this run in GitHub Actions':r.outcome==='cancelled'?'CANCELLED — check did not complete':'not completed'}.`),'','Failed or skipped checks are not passes. Reports contain suggestions only.'].join('\n');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const summary=workflowSummary(JSON.parse(process.env.KALIKA_STEP_RESULTS||'{}'));
 const file='reports/latest.md';let text;
 try{text=await readFile(file,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;text='# Kalika maintenance report\n\n## Needs attention\n- Primary site report was not produced. Check GitHub Actions.\n';}
 // Idempotent if retried; this section travels with latest.md to the private admin.
 text=text.split('\n## Workflow check results')[0].trimEnd();
 await writeFile(file,text+'\n\n'+summary+'\n');
 console.log(summary);
}
