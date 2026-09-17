import {mkdir,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';

export async function atomicJson(file,data){
 await mkdir(path.dirname(file),{recursive:true});const temp=file+'.'+randomUUID()+'.tmp';await writeFile(temp,JSON.stringify(data,null,2)+'\n');
 for(let attempt=0;;attempt++){try{await rename(temp,file);return;}catch(e){if(!['EPERM','EACCES','EBUSY'].includes(e.code)||attempt>=10)throw e;await new Promise(r=>setTimeout(r,50*(attempt+1)));}}
}
export function command(root,exe,args){return new Promise((resolve,reject)=>{
 const child=spawn(exe,args,{cwd:root,windowsHide:true,env:{...process.env,PATH:path.dirname(process.execPath)+path.delimiter+process.env.PATH},stdio:['ignore','pipe','pipe']});let output='';
 child.stdout.on('data',b=>{output=(output+b).slice(-20000)});child.stderr.on('data',b=>{output=(output+b).slice(-20000)});
 const timeout=setTimeout(()=>{child.kill();reject(Error('The command timed out.'))},300000);
 child.on('error',()=>{clearTimeout(timeout);reject(Error('A required local program could not start.'))});child.on('close',code=>{clearTimeout(timeout);code===0?resolve(output.trimEnd()):reject(Error('The command did not complete. Check Cloudflare sign-in and your internet connection.'))});
});}
