// Served only by the authenticated, loopback-only admin server; never deployed.
const state={pages:[]},$=id=>document.getElementById(id);
function cell(tag,value){const el=document.createElement(tag);el.textContent=String(value??'');return el;}
function message(value){const row=document.createElement('tr'),td=cell('td',value);td.colSpan=5;row.append(td);$('rows').replaceChildren(row);}
async function scan(){
 $('scan').disabled=true;message('Scanning pages…');
 try{const r=await fetch('/api/scan'),data=await r.json();if(!r.ok)throw Error(data.error||'Scan failed');state.pages=data.pages;$('json').disabled=$('csv').disabled=false;render();}
 catch(e){message(e.message);}finally{$('scan').disabled=false;}
}
function render(){
 const q=$('q').value.toLowerCase(),s=$('status').value;
 $('pages').textContent=state.pages.length;$('issues').textContent=state.pages.reduce((n,p)=>n+p.issues.length,0);$('tools').textContent=state.pages.filter(p=>p.route.startsWith('/tools/')).length;
 const pages=state.pages.filter(p=>(p.route+' '+p.title).toLowerCase().includes(q)&&(s==='all'||(s==='bad'?p.issues.length:!p.issues.length)));
 $('rows').replaceChildren();if(!pages.length)return message('No matching pages.');
 for(const p of pages){
  const row=document.createElement('tr'),route=cell('td',''),button=cell('button',p.route);button.type='button';button.className='route';button.onclick=()=>select(p);route.append(button,cell('p',p.status));
  row.append(route,cell('td',p.issues.length?p.issues.join('; '):'Looks good'),cell('td',p.title+' ('+p.titleLength+' chars)'),cell('td',p.description+' ('+p.descriptionLength+' chars)'),cell('td',(p.h1||'No H1')+'; '+p.h1Count+' H1; schema: '+p.schema));$('rows').append(row);
 }
}
function select(p){$('route').value=p.route;$('title').value=p.title;$('desc').value=p.description;count();$('draft').textContent='Edit the title or description, then generate a review note.';}
function count(){$('titleCount').textContent=$('title').value.length+' characters. Target: 50–60.';$('descCount').textContent=$('desc').value.length+' characters. Target: 140–160.';}
function draft(){if(!$('route').value){$('draft').textContent='Select a page first.';return;}$('draft').textContent=['Page: '+$('route').value,'','Suggested SEO update for human review:','Title: '+$('title').value,'Meta description: '+$('desc').value,'','Next step: update the matching file in public/, commit to GitHub, and deploy.'].join('\n');}
function download(name,text){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type:'text/plain'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function csv(value){let s=String(value??'');if(/^[\s]*[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
function exportCsv(){const columns=['route','status','titleLength','descriptionLength','h1Count','issues','title','description'];download('kalika-seo-review.csv',[columns.join(','),...state.pages.map(p=>columns.map(k=>csv(p[k])).join(','))].join('\n'));}
$('scan').onclick=scan;$('json').onclick=()=>download('kalika-seo-review.json',JSON.stringify(state.pages,null,2));$('csv').onclick=exportCsv;$('q').oninput=render;$('status').onchange=render;$('title').oninput=count;$('desc').oninput=count;$('draftBtn').onclick=draft;
