export const ACCENTS = ['é','è','ê','ë','à','â','ä','ç','î','ï','ô','ö','ù','û','ü','œ','æ','ÿ'];
export const SHORTCUTS = {"e'":'é','e`':'è','e^':'ê','e"':'ë','a`':'à','a^':'â','a"':'ä','c,':'ç','i^':'î','i"':'ï','o^':'ô','o"':'ö','u`':'ù','u^':'û','u"':'ü','oe/':'œ','ae/':'æ','y"':'ÿ'};
export function expandShortcut(value, caret) {
 for(const [sequence,letter] of Object.entries(SHORTCUTS)) {
  const start=caret-sequence.length,typed=value.slice(Math.max(0,start),caret);
  if(start>=0&&typed.toLowerCase()===sequence) {
   const replacement=typed[0]===typed[0].toUpperCase()?letter.toUpperCase():letter;
   return {value:value.slice(0,start)+replacement+value.slice(caret),caret:start+replacement.length};
  }
 }
 return {value,caret};
}
if(typeof document!=='undefined'&&document.getElementById('french-editor')) {
 const editor=document.getElementById('french-editor'),byId=id=>document.getElementById(id);
 let upper=false,undoStack=[],redoStack=[],composing=false,compositionBefore,previous={value:'',start:0,end:0};
 const capture=()=>({value:editor.value,start:editor.selectionStart,end:editor.selectionEnd});
 const status=(message,error=false)=>{byId('french-status').textContent=message;byId('french-status').dataset.error=String(error);};
 function update(){
  byId('french-count').textContent=`${editor.value.length.toLocaleString('fr-FR')} caractères`;
  for(const id of ['copy-french','download-french','clear-french'])byId(id).disabled=!editor.value;
  byId('undo-french').disabled=!undoStack.length;byId('redo-french').disabled=!redoStack.length;
  previous=capture();
 }
 function save(before){undoStack.push(before);if(undoStack.length>20)undoStack.shift();redoStack=[];}
 function restore(state){editor.value=state.value;editor.focus();editor.setSelectionRange(state.start,state.end);update();}
 function undo(){if(!undoStack.length)return;redoStack.push(capture());restore(undoStack.pop());status('Dernière modification annulée.');}
 function redo(){if(!redoStack.length)return;undoStack.push(capture());restore(redoStack.pop());status('Modification rétablie.');}
 function insert(text){
  if(composing)return;
  if(editor.value.length-editor.selectionEnd+editor.selectionStart+text.length>100000){status('Limite de 100 000 caractères dépassée. Réduisez le texte avant d’ajouter un caractère. Votre texte reste disponible.',true);return;}
  save(capture());editor.setRangeText(text,editor.selectionStart,editor.selectionEnd,'end');editor.focus();update();status('Caractère inséré à la position du curseur.');
 }
 for(const letter of ACCENTS){
  const button=document.createElement('button');button.type='button';button.dataset.letter=letter;button.textContent=letter;button.setAttribute('aria-label',`Insérer ${letter}`);
  button.title=`Insérer ${letter} · Maj + clic : ${letter.toUpperCase()}`;
  button.addEventListener('click',event=>insert(upper||event.shiftKey?letter.toUpperCase():letter));byId('french-accents').append(button);
 }
 for(const [label,value]of [['«','«'],['»','»'],['’','’'],['–','–'],['—','—'],['…','…'],['Espace insécable','\u00a0'],['Espace fine insécable','\u202f']]){
  const button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('aria-label',`Insérer ${label}`);if(label.length>1)button.className='french-space-key';button.addEventListener('click',()=>insert(value));byId('french-punctuation').append(button);
 }
 byId('french-uppercase').addEventListener('click',()=>{
  upper=!upper;byId('french-uppercase').setAttribute('aria-pressed',String(upper));
  for(const button of byId('french-accents').querySelectorAll('button')){const letter=upper?button.dataset.letter.toUpperCase():button.dataset.letter;button.textContent=letter;button.setAttribute('aria-label',`Insérer ${letter}`);button.title=`Insérer ${letter} · Maj + clic : ${button.dataset.letter.toUpperCase()}`;}
  status(upper?'Touches en majuscules. Le texte déjà écrit ne change pas.':'Touches en minuscules. Le texte déjà écrit ne change pas.');
 });
 editor.addEventListener('beforeinput',event=>{
  if(event.inputType==='historyUndo'&&event.cancelable){event.preventDefault();undo();return;}
  if(event.inputType==='historyRedo'&&event.cancelable){event.preventDefault();redo();return;}
  if(!composing)previous=capture();
 });
 editor.addEventListener('input',event=>{
  if(composing||event.isComposing)return;
  const before=previous;
  if(byId('french-shortcuts').checked&&event.inputType==='insertText'&&event.data?.length===1){const result=expandShortcut(editor.value,editor.selectionStart);if(result.value!==editor.value){editor.value=result.value;editor.setSelectionRange(result.caret,result.caret);}}
  if(editor.value!==before.value)save(before);update();
  status(editor.value.length>100000?'Texte au-delà de 100 000 caractères : divisez-le pour continuer à insérer des accents. Vous pouvez toujours le copier ou le télécharger.':'Texte prêt. Rien n’est envoyé ni enregistré par cet éditeur.',editor.value.length>100000);
 });
 editor.addEventListener('compositionstart',()=>{composing=true;compositionBefore=capture();});
 editor.addEventListener('compositionend',()=>{composing=false;if(editor.value!==compositionBefore.value)save(compositionBefore);update();});
 editor.addEventListener('keydown',event=>{if(!composing&&(event.ctrlKey||event.metaKey)&&!event.altKey&&event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?redo():undo();}else if(!composing&&event.ctrlKey&&!event.altKey&&event.key.toLowerCase()==='y'){event.preventDefault();redo();}});
 for(const name of ['select','click','keyup'])editor.addEventListener(name,()=>{if(!composing&&previous.value===editor.value)previous=capture();});
 byId('undo-french').addEventListener('click',undo);byId('redo-french').addEventListener('click',redo);
 byId('clear-french').addEventListener('click',()=>{if(!editor.value)return;save(capture());editor.value='';editor.focus();update();status('Texte effacé. Utilisez Annuler pour le récupérer.');});
 byId('example-french').addEventListener('click',()=>{
  const sample='Écrivez à Chloé : « Où êtes-vous ? »\nUn café, un cœur, une façade, Noël et une île.';
  if(editor.value){insert((editor.selectionStart===editor.selectionEnd?'\n':'')+sample);return;}
  insert(sample);
 });
 byId('french-shortcuts').addEventListener('change',()=>status(byId('french-shortcuts').checked?'Raccourcis activés pour les prochains caractères saisis. Le texte collé ne sera pas transformé.':'Raccourcis désactivés. Vous pouvez toujours cliquer sur les touches.'));
 byId('copy-french').addEventListener('click',async()=>{if(!editor.value)return;try{await navigator.clipboard.writeText(editor.value);status('Texte copié. Vous pouvez le coller dans votre document.');}catch{editor.focus();editor.select();status('Copie automatique indisponible. Texte sélectionné : utilisez Copier ou Ctrl+C (⌘C sur Mac).');}});
 byId('download-french').addEventListener('click',()=>{if(!editor.value)return;const url=URL.createObjectURL(new Blob([editor.value],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='kalika-texte-francais.txt';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);status('Fichier texte UTF-8 préparé pour le téléchargement.');});
 update();
}
