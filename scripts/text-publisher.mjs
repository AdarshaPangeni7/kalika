import {readFile,mkdir,readdir} from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {normalize,validate,revision,readEntries,atomicJson,buildLibrary,origin,escape} from './traditional-texts.mjs';
import {submitIndexNow} from './indexnow.mjs';

export function command(root,exe,args){return new Promise((resolve,reject)=>{
 const child=spawn(exe,args,{cwd:root,windowsHide:true,env:{...process.env,PATH:path.dirname(process.execPath)+path.delimiter+process.env.PATH},stdio:['ignore','pipe','pipe']});let output='';
 child.stdout.on('data',b=>{output=(output+b).slice(-20000)});child.stderr.on('data',b=>{output=(output+b).slice(-20000)});
 const timeout=setTimeout(()=>{child.kill();reject(Error('The command timed out.'))},300000);
 child.on('error',()=>{clearTimeout(timeout);reject(Error('A required local program could not start.'))});child.on('close',code=>{clearTimeout(timeout);code===0?resolve(output.trimEnd()):reject(Error('The command did not complete. Check GitHub/Cloudflare sign-in and your internet connection.'))});
});}
export function createTextManager(root,{run=(exe,args)=>command(root,exe,args),notifyIndexNow=entry=>submitIndexNow(root,[origin+'/texts/'+entry.slug,origin+'/texts/']),verifyLive=async(entry)=>{
 const url=origin+'/texts/'+entry.slug;
 for(let i=0;i<4;i++){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(20000)});if(r.ok&&(await r.text()).includes(`data-content-revision="${revision(entry)}"`))return;if(i<3)await new Promise(r=>setTimeout(r,2000));}
 throw Error('Publishing finished, but the updated live page could not be verified yet. Retry to check it again.');
}}={}){
 const privateDir=path.join(root,'.kalika-admin'),draftDir=path.join(privateDir,'drafts'),jobFile=path.join(privateDir,'publish-job.json');let busy=false,saving=false,starting=false;
 const slugCheck=slug=>{if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>80||['index','new','admin'].includes(slug))throw Error('Invalid entry address.');return slug;};
 const readJson=async file=>{try{return JSON.parse(await readFile(file,'utf8'))}catch(e){if(e.code==='ENOENT')return null;throw e;}};
 const draftPath=slug=>path.join(draftDir,slugCheck(slug)+'.json');
 const publishedPath=slug=>path.join(root,'content/traditional-texts',slugCheck(slug)+'.json');
 async function get(slug){const published=await readJson(publishedPath(slug)),draft=await readJson(draftPath(slug));const entry=draft||published;return entry?{entry:normalize(entry),revision:revision(entry),published:!!published,hasDraft:!!draft&&(!published||revision(draft)!==revision(published))}:null;}
 async function list(){const entries=new Map();for(const d of await readEntries(root))entries.set(d.slug,d);for(const d of await readEntries(root,'.kalika-admin/drafts'))entries.set(d.slug,d);return Promise.all([...entries.keys()].map(async slug=>({slug,...await get(slug)})));}
 async function save(input,baseRevision){
  if(busy||saving||starting)throw Error('Wait for the current save or publication to finish.');saving=true;
  try{const d=validate(input),old=await get(d.slug);if(old&&old.revision!==baseRevision)throw Error('This entry changed or its address already exists. Reload it before saving.');if(!old&&baseRevision)throw Error('An existing entry address cannot be renamed. Create a new entry instead.');await atomicJson(draftPath(d.slug),d);return get(d.slug);}finally{saving=false;}
 }
 async function status(){const job=await readJson(jobFile);if(job?.status==='running'&&!busy){job.status='failed';job.error='Publishing was interrupted. Review the stage below, then retry.';await atomicJson(jobFile,job);}return job;}
 const persist=job=>atomicJson(jobFile,job);
 async function uniqueSeo(entry,dir=path.join(root,'public')){
  for(const file of await readdir(dir,{withFileTypes:true})){const target=path.join(dir,file.name);if(file.isDirectory()){await uniqueSeo(entry,target);continue;}if(!file.name.endsWith('.html')||target===path.join(root,'public/texts',entry.slug+'.html'))continue;const html=await readFile(target,'utf8');if(html.includes(`<title>${escape(entry.seoTitle)}</title>`)||html.includes(`name="description" content="${escape(entry.description)}"`))throw Error('Another page already uses this SEO title or description. Write distinct search text before publishing.');}
 }
 async function execute(job){
  busy=true;job.status='running';job.error='';await persist(job);
  try{
   const branch=await run('git',['branch','--show-current']);if(branch!=='main')throw Error('Publishing requires the main branch.');
   const remote=await run('git',['remote','get-url','origin']);if(!/^https:\/\/github\.com\/AdarshaPangeni7\/kalika(?:\.git)?$/i.test(remote))throw Error('The GitHub destination does not match Kalika.');
   if(job.phase==='start'){
    job.message='Checking the saved site and GitHub connection…';await persist(job);
    if(await run('git',['status','--porcelain']))throw Error('The site folder has other unfinished changes. Save or commit those changes before publishing. Your text draft is safe.');
    await run('git',['fetch','origin','main']);job.base=await run('git',['rev-parse','HEAD']);if(job.base!==await run('git',['rev-parse','origin/main']))throw Error('Your drive and GitHub differ. Sync them before publishing; the draft is safe.');
    await mkdir(path.join(root,'content/traditional-texts'),{recursive:true});const previous=await readJson(publishedPath(job.entry.slug));const now=new Date().toISOString();job.entry={...job.entry,publishedAt:previous?.publishedAt||now,updatedAt:now};
    // Mark the owned files before writing so a retry never discards other work.
    job.phase='preparing';await persist(job);
   }
   if(job.phase==='preparing'){
    if(await run('git',['rev-parse','HEAD'])!==job.base)throw Error('The site commit changed during publishing. Review the local folder before retrying.');
    const changes=await run('git',['status','--porcelain','--untracked-files=all']);for(const line of changes.split('\n').filter(Boolean)){const file=line.slice(3).replaceAll('\\','/');if(file!==`content/traditional-texts/${job.entry.slug}.json`&&!file.startsWith('public/texts/')&&file!=='public/sitemap.xml')throw Error('Other site edits appeared during publication. Review them before retrying.');}
    job.message='Building this text, its library listing and sitemap…';await persist(job);
    await atomicJson(publishedPath(job.entry.slug),job.entry);await buildLibrary(root);await run(process.execPath,['scripts/audit-seo.mjs']);
    await run('git',['add','--',`content/traditional-texts/${job.entry.slug}.json`,'public/texts','public/sitemap.xml']);await run('git',['commit','-m',`Publish traditional text: ${job.entry.slug} (${job.id})`]);job.commit=await run('git',['rev-parse','HEAD']);job.phase='committed';await persist(job);
   }
   if(await run('git',['rev-parse','HEAD'])!==job.commit||await run('git',['status','--porcelain']))throw Error('The site folder changed after the publishing commit. Review it before retrying.');
   if(job.phase==='committed'){job.message='Sending the reviewed text to GitHub…';await persist(job);await run('git',['push','origin','main']);job.phase='pushed';await persist(job);}
   if(job.phase==='pushed'){job.message='Publishing the saved site to Cloudflare…';await persist(job);await run(process.execPath,['node_modules/wrangler/bin/wrangler.js','deploy']);job.phase='deployed';await persist(job);}
   if(job.phase==='deployed'){job.message='Checking the live reading page…';await persist(job);await verifyLive(job.entry);job.phase='verified';}
   try{job.discovery=await notifyIndexNow(job.entry);}catch(e){job.discovery={status:'retry-needed',message:e.message};}
   job.status='complete';job.message='Published to GitHub and Cloudflare. The live page has been verified. '+(job.discovery?.message||'');job.url=origin+'/texts/'+job.entry.slug;await persist(job);
  }catch(e){job.status='failed';job.error=e.message;await persist(job);}finally{busy=false;}
 }
 async function publish(slug,expectedRevision,confirmed){
  if(confirmed!==true)throw Error('Preview and approve the entry before publishing.');if(busy||saving||starting)throw Error('A publication or save is already running.');starting=true;
  try{
  const previous=await status();if(previous?.status==='failed')throw Error('A previous publication needs attention. Use Retry publication after resolving its reported issue.');
  const item=await get(slug);if(!item||item.revision!==expectedRevision)throw Error('The draft changed. Save and preview the latest version before publishing.');
  if(item.published&&!item.hasDraft)throw Error('There are no unpublished changes in this entry. Edit and save a draft first.');
  const entry=validate(item.entry,true);await uniqueSeo(entry);const job={id:randomUUID(),status:'running',phase:'start',entry,revision:expectedRevision,message:'Starting publication…',createdAt:new Date().toISOString()};busy=true;await persist(job);void execute(job);return job;
  }finally{starting=false;}
 }
 async function retry(){if(busy||starting)throw Error('Publishing is already running.');starting=true;try{const job=await status();if(!job||job.status!=='failed')throw Error('There is no failed publication to retry.');busy=true;job.status='running';job.error='';await persist(job);void execute(job);return job;}finally{starting=false;}}
 return {get,list,save,status,publish,retry};
}
