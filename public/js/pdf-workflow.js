const slug=location.pathname.replace(/\/$/,'').split('/').pop(),result=document.getElementById('result');
const titles={'merge-pdf':'Your merged PDF is ready','split-pdf':'Your pages are ready','organize-pdf':'Your organized PDF is ready','extract-pdf-pages':'Your selected pages are ready','delete-pdf-pages':'Your PDF with pages removed is ready','rotate-pdf':'Your rotated PDF is ready','watermark-pdf':'Your watermarked PDF is ready','page-numbers':'Your numbered PDF is ready','crop-pdf':'Your cropped PDF is ready','fill-sign-pdf':'Your filled PDF is ready','jpg-to-pdf':'Your PDF is ready','document-scanner':'Your scan is ready','pdf-to-text':'Your text file is ready','ocr-pdf':'Your recognized text is ready'};
function size(n){return n>=1048576?(n/1048576).toFixed(2)+' MB':(n/1024).toFixed(1)+' KB';}
function element(tag,text){const el=document.createElement(tag);el.textContent=text;return el;}
let previous='';
if(result)new MutationObserver(()=>{
 const links=[...result.querySelectorAll('a[download]')];
 if(!links.length){previous='';return;}
 const key=links.map(a=>a.href+'|'+a.dataset.bytes+'|'+a.dataset.summary).join(';');
 if(key===previous&&result.querySelector('.pdf-result-summary'))return;
 previous=key;result.querySelector('.pdf-result-summary')?.remove();
 const summary=element('div','');summary.className='pdf-result-summary';
 const format=links[0].download.split('.').pop().toLowerCase();
 if(!result.querySelector('h2'))summary.append(element('h2',['jpg','jpeg','png'].includes(format)?'Your image is ready':titles[slug]||'Your download is ready'));
 for(const link of links){
  const format=link.download.split('.').pop().toUpperCase(),bytes=Number(link.dataset.bytes);
  const row=element('p',[format,Number.isFinite(bytes)&&bytes>0?size(bytes):'',link.dataset.summary||''].filter(Boolean).join(' · '));
  row.className='pdf-download-info';summary.append(row);
 }
 const heading=result.querySelector('h2');if(heading)heading.after(summary);else result.prepend(summary);
}).observe(result,{childList:true,subtree:true});
const error=document.getElementById('error');
if(error)new MutationObserver(()=>{if(error.textContent.trim()){const details=document.getElementById('advanced-settings');if(details)details.open=true;}}).observe(error,{childList:true,subtree:true});
