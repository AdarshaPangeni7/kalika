import {candidates,convertText} from './nepali-transliteration.js';
const editor=document.getElementById('nepali-editor'),mode=document.getElementById('typing-mode'),status=document.getElementById('typing-status'),suggestions=document.getElementById('typing-suggestions');
let composing=false,previous={value:'',start:0,end:0},undo=[],redo=[],target=null;
const snapshot=()=>({value:editor.value,start:editor.selectionStart,end:editor.selectionEnd});
function changed(before=previous){if(before.value!==editor.value){undo.push(before);if(undo.length>60)undo.shift();redo=[];}previous=snapshot();refresh();}
function restore(state){editor.value=state.value;editor.setSelectionRange(state.start,state.end);previous=snapshot();refresh();editor.focus();}
function history(back){const from=back?undo:redo,to=back?redo:undo;if(from.length){to.push(snapshot());restore(from.pop());}}
function pending(){const before=editor.value.slice(0,editor.selectionStart);const m=before.match(/[A-Za-z][A-Za-z~_]*$/);return m?{word:m[0],start:before.length-m[0].length,end:before.length}:null;}
function replace(range,text){const before=snapshot();editor.setRangeText(text,range.start,range.end,'end');changed(before);editor.focus();}
function refresh(){
 document.getElementById('typing-count').textContent=`${Array.from(editor.value).length.toLocaleString()} characters · ${editor.value.trim()?editor.value.trim().split(/\s+/).length:0} words`;
 document.getElementById('undo-text').disabled=!undo.length;document.getElementById('redo-text').disabled=!redo.length;
 for(const id of ['copy-text','download-text','clear-text'])document.getElementById(id).disabled=!editor.value;
 suggestions.replaceChildren();target=mode.value==='nepali'?pending():null;
 if(target){for(const candidate of candidates(target.word)){const button=document.createElement('button');button.type='button';button.textContent=candidate;button.lang='ne';button.addEventListener('click',()=>{if(target)replace(target,candidate);});suggestions.append(button);}}
}
editor.addEventListener('beforeinput',()=>{previous=snapshot();});
editor.addEventListener('compositionstart',()=>{composing=true;});
editor.addEventListener('compositionend',()=>{composing=false;changed();});
editor.addEventListener('input',event=>{
 if(composing||event.isComposing)return;
 const before=previous;
 if(mode.value==='nepali'&&!event.inputType?.startsWith('delete')){
  const cursor=editor.selectionStart,left=editor.value.slice(0,cursor),match=left.match(/([A-Za-z][A-Za-z~_]*)([\s।.!?;,]+)$/);
  const chunk=left.trimEnd().split(/\s/).pop();
  if(match&&!/@|:\/\/|^www\./.test(chunk)){const start=cursor-match[0].length;editor.setRangeText(candidates(match[1])[0]+match[2],start,cursor,'end');}
 }
 changed(before);status.textContent='';
});
editor.addEventListener('click',refresh);editor.addEventListener('keyup',refresh);
editor.addEventListener('keydown',event=>{
 if(composing)return;
 if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();history(!event.shiftKey);}
 if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='y'){event.preventDefault();history(false);}
 if(event.ctrlKey&&event.key.toLowerCase()==='g'){event.preventDefault();mode.value=mode.value==='nepali'?'english':'nepali';refresh();}
});
mode.addEventListener('change',()=>{refresh();editor.focus();});
document.getElementById('convert-text').addEventListener('click',()=>{
 if(!editor.value.trim()){status.textContent='Type or paste Romanized Nepali first.';editor.focus();return;}
 const before=snapshot();const selected=editor.selectionStart!==editor.selectionEnd;
 const start=selected?editor.selectionStart:0,end=selected?editor.selectionEnd:editor.value.length;
 editor.setRangeText(convertText(editor.value.slice(start,end)),start,end,'end');changed(before);status.textContent='Converted. Review the spelling and edit any word directly.';
});
document.getElementById('undo-text').addEventListener('click',()=>history(true));
document.getElementById('redo-text').addEventListener('click',()=>history(false));
document.getElementById('clear-text').addEventListener('click',()=>{const before=snapshot();editor.value='';changed(before);status.textContent='Cleared. Undo restores your text.';editor.focus();});
document.getElementById('copy-text').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(editor.value);status.textContent='Copied Nepali text.';}catch{editor.focus();editor.select();status.textContent='Copy is unavailable here. Your text is selected; use your device’s Copy command.';}});
document.getElementById('download-text').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([editor.value],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='kalika-nepali.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);status.textContent='Text file downloaded.';});
document.getElementById('typing-example').addEventListener('click',()=>{replace({start:editor.selectionStart,end:editor.selectionEnd},'नमस्ते! तपाईंलाई कस्तो छ? म नेपाली लेख्दै छु।');});
const keyboard=document.getElementById('nepali-keyboard');
for(const row of ['अ आ इ ई उ ऊ ऋ ए ऐ ओ औ','क ख ग घ ङ च छ ज झ ञ','ट ठ ड ढ ण त थ द ध न','प फ ब भ म य र ल व श ष स ह','क्ष त्र ज्ञ श्र ा ि ी ु ू ृ े ै ो ौ ं ँ ः ्','० १ २ ३ ४ ५ ६ ७ ८ ९ । ॥']){
 const group=document.createElement('div');group.className='nepali-key-row';
 for(const letter of row.split(' ')){const b=document.createElement('button');b.type='button';b.textContent=letter;b.setAttribute('aria-label',`Insert ${letter}`);b.addEventListener('click',()=>replace({start:editor.selectionStart,end:editor.selectionEnd},letter));group.append(b);}keyboard.append(group);
}
refresh();
