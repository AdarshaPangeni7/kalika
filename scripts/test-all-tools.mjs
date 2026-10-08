import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {testServer} from './security-test-server.mjs';
const server=await testServer(),results=[];
const suites=['test-everyday-tools','test-image-tools','test-simple-calculator','test-calculator-tools','test-shopping-calculators','test-tip-calculator','test-nepali-typing','test-preeti-and-language','test-pdf-tools','test-organize-pdf','test-pdf-edit-tools','test-fill-sign','test-pdf-experience','test-document-scanner','test-canvas-safety','test-ocr','test-category-hubs','test-home-search','test-serbian'];
try{
 for(const suite of suites){
  const result=await new Promise(resolve=>{
   const p=spawn(process.execPath,['scripts/'+suite+'.mjs'],{env:{...process.env,KALIKA_TEST_ORIGIN:server.base},windowsHide:true,stdio:['ignore','pipe','pipe']});let output='';
   p.stdout.on('data',b=>output+=b);p.stderr.on('data',b=>output+=b);
   const timer=setTimeout(()=>p.kill(),180000);
   p.on('close',code=>{clearTimeout(timer);resolve({suite,passed:code===0,output});});p.on('error',e=>{clearTimeout(timer);resolve({suite,passed:false,output:e.message});});
  });results.push(result);console.log((result.passed?'PASS ':'FAIL ')+suite);if(!result.passed)console.error(result.output);
 }
 await mkdir('reports/security',{recursive:true});await writeFile('reports/security/tool-regressions.json',JSON.stringify({checkedAt:new Date().toISOString(),origin:server.base,csp:'enforced',results},null,2));
 if(results.some(r=>!r.passed))process.exitCode=1;
}finally{await server.close();}
