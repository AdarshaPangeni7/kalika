import {convert,LIMIT} from './serbian-engine.js';
const byId=id=>document.getElementById(id);
const source=byId('serbian-input'),output=byId('serbian-output'),status=byId('serbian-status');
let direction='cyrillic',script='latin',timer,history=[],composing=false,swapText='';
const translate=text=>script==='cyrillic'?convert(text,'cyrillic',false).text:text;
const textNodes=[],attributes=[];
const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
while(walker.nextNode()){
 const node=walker.currentNode;
 if(node.textContent.trim()&&!node.parentElement.closest('script,style,textarea,td,code,[lang="en"],.analytics-consent,.analytics-settings,.wordmark,#ui-latin,#ui-cyrillic,#serbian-status,#input-count,#output-count,#result-label'))textNodes.push([node,node.textContent]);
}
document.querySelectorAll('[aria-label],[placeholder]').forEach(el=>{
 for(const name of ['aria-label','placeholder'])if(el.hasAttribute(name))attributes.push([el,name,el.getAttribute(name)]);
});
function message(text,error=false){status.textContent=translate(text);status.dataset.error=String(error);}
function controls(){
 const ready=!!output.value;
 for(const id of ['copy-serbian','download-serbian','swap-serbian'])byId(id).disabled=!ready;
 byId('clear-serbian').disabled=!source.value&&!output.value;
 byId('undo-serbian').disabled=!history.length;
 byId('input-count').textContent=`${source.value.length.toLocaleString('sr-RS')} / 100.000`;
 byId('output-count').textContent=output.value.length.toLocaleString('sr-RS');
 byId('to-cyrillic').setAttribute('aria-pressed',String(direction==='cyrillic'));
 byId('to-latin').setAttribute('aria-pressed',String(direction==='latin'));
 byId('result-label').textContent=translate(direction==='cyrillic'?'Rezultat na ćirilici':'Rezultat na latinici');
}
function run(showEmpty=false){
 clearTimeout(timer);
 output.value='';swapText='';
 if(!source.value.trim()){message(showEmpty?'Unesite tekst koji želite da pretvorite.':'Tekst ostaje u ovoj kartici. Nema naloga ni slanja teksta.');controls();return;}
 if(source.value.length>LIMIT){message('Unos je duži od 100.000 jedinica. Podelite tekst; ništa nije skraćeno.',true);controls();return;}
 const result=convert(source.value,direction,byId('preserve-links').checked);output.value=result.text;swapText=result.protectedText;
 let note='Rezultat je spreman. Proverite imena i retke reči.';
 if(result.protectedCount)note+=` Sačuvani delovi: ${result.protectedCount}.`;
 if(result.unclosedProtection)note+=' Oznaka [[ nije zatvorena. Dodajte ]] da biste zaštitili taj deo.';
 if(direction==='cyrillic'&&/[wqxy]/i.test(source.value))note+=' Strani tekst se ne prepoznaje automatski; zaštitite ga sa [[...]].';
 message(note,result.unclosedProtection);controls();
}
function remember(){history.push({text:source.value,direction,preserve:byId('preserve-links').checked});if(history.length>10)history.shift();}
source.addEventListener('compositionstart',()=>{composing=true;clearTimeout(timer);});
source.addEventListener('compositionend',()=>{composing=false;run();});
source.addEventListener('input',()=>{
 clearTimeout(timer);output.value='';controls();
 if(composing)return;
 message('Priprema rezultata…');timer=setTimeout(run,180);
});
byId('convert-serbian').addEventListener('click',()=>run(true));
for(const target of ['cyrillic','latin'])byId('to-'+target).addEventListener('click',()=>{if(direction!==target){remember();direction=target;run();}});
byId('preserve-links').addEventListener('change',()=>run());
byId('example-serbian').addEventListener('click',()=>{
 remember();source.value=direction==='cyrillic'?'Ljubav i Njegoš. DŽEP, LJUBAV.\ninjekcija, konjugacija, nadživeti, djevojka.\nPišite na hello@kalikatools.com ili otvorite https://kalikatools.com/text-tools.\nNaziv [[OpenAI]] ostaje isti.':'Љубав и Његош. ЏЕП, ЉУБАВ.\nинјекција, конјугација, надживети, дјевојка.\nПишите на hello@kalikatools.com.\nНазив [[OpenAI]] остаје исти.';run();
});
byId('clear-serbian').addEventListener('click',()=>{remember();source.value='';run();source.focus();});
byId('undo-serbian').addEventListener('click',()=>{const last=history.pop();if(!last)return;source.value=last.text;direction=last.direction;byId('preserve-links').checked=last.preserve;run();source.focus();});
byId('swap-serbian').addEventListener('click',()=>{
 if(!output.value)return;remember();source.value=swapText;direction=direction==='cyrillic'?'latin':'cyrillic';run();
 message('Smer je zamenjen. Zaštićeni delovi ostaju označeni u ulazu. Proverite rezultat.');
});
byId('protect-selection').addEventListener('click',()=>{
 const start=source.selectionStart,end=source.selectionEnd;
 if(start===end){message('Prvo označite deo teksta u ulaznom polju.',true);source.focus();return;}
 if(source.value.length+4>LIMIT){message('Nema mesta za oznake zaštite. Skratite unos ispod 100.000 jedinica.',true);return;}
 const selected=source.value.slice(start,end);
 if(selected.includes('[[')||selected.includes(']]')){message('Ne ugnježđujte oznake zaštite. Izaberite tekst bez [[ i ]].',true);return;}
 remember();source.setRangeText(`[[${selected}]]`,start,end,'select');run();source.focus();
});
byId('copy-serbian').addEventListener('click',async()=>{
 if(!output.value)return;
 try{await navigator.clipboard.writeText(output.value);message('Rezultat je kopiran.');}
 catch{output.focus();output.select();message('Automatsko kopiranje nije dostupno. Tekst je označen: koristite Kopiraj ili Ctrl+C.');}
});
byId('download-serbian').addEventListener('click',()=>{
 if(!output.value)return;
 const url=URL.createObjectURL(new Blob([output.value],{type:'text/plain;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download=`kalika-${direction==='cyrillic'?'cirilica':'latinica'}.txt`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);message('UTF-8 tekst je pripremljen za preuzimanje.');
});
for(const target of ['latin','cyrillic'])byId('ui-'+target).addEventListener('click',()=>{
 script=target;document.documentElement.lang=target==='latin'?'sr-Latn':'sr-Cyrl';
 for(const [node,text]of textNodes)node.textContent=translate(text);
 for(const [element,name,value]of attributes)element.setAttribute(name,translate(value));
 byId('ui-latin').setAttribute('aria-pressed',String(target==='latin'));
 byId('ui-cyrillic').setAttribute('aria-pressed',String(target==='cyrillic'));
 run();
});
controls();
