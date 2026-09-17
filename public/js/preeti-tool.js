import {toPreeti,toUnicode} from './preeti-converter.js';
const input=document.querySelector('#preeti-input'),output=document.querySelector('#preeti-output'),direction=document.querySelector('#conversion-direction'),status=document.querySelector('#conversion-status');
const copy=document.querySelector('#copy-output'),download=document.querySelector('#download-output');
let lastSource='',lastDirection='';
function invalidate(){output.value='';copy.disabled=download.disabled=true;status.textContent='';}
function labels(){const forward=direction.value==='unicode';document.querySelector('#input-label').textContent=forward?'Preeti source text':'Nepali Unicode source text';document.querySelector('#output-label').textContent=forward?'Unicode result':'Preeti-encoded result';input.placeholder=forward?'Paste text copied from a Preeti document…':'यहाँ नेपाली युनिकोड लेख्नुहोस्…';document.querySelector('#preeti-note').hidden=forward;invalidate();}
function convert(){
 invalidate();
 if(!input.value.trim()){status.textContent='Enter some text before converting.';return;}
 if(input.value.length>50000){status.textContent='Please convert up to 50,000 characters at a time. Your input has not been changed.';return;}
 try{output.value=direction.value==='unicode'?toUnicode(input.value):toPreeti(input.value);lastSource=input.value;lastDirection=direction.value;copy.disabled=download.disabled=false;status.textContent=direction.value==='preeti'&&/[\u0900-\u097f\u200c\u200d]/u.test(output.value)?'Converted supported characters. Some characters or joiners do not have a standard Preeti mapping and were kept unchanged; review those in your document editor.':'Converted. Review the result before using it.';}catch{status.textContent='Conversion could not finish. Your source text is still here; try a shorter passage.';}
}
input.addEventListener('input',invalidate);direction.addEventListener('change',labels);
document.querySelector('#convert-preeti').addEventListener('click',convert);
document.querySelector('#load-example').addEventListener('click',()=>{input.value=direction.value==='unicode'?'g]kfnL efiff\nlzIff / ;+:s[lt':'नेपाली भाषा\nशिक्षा र संस्कृति';convert();});
document.querySelector('#swap-direction').addEventListener('click',()=>{if(output.value){input.value=output.value;}else if(input.value.trim()){status.textContent='Convert the current input before swapping it into the other direction.';return;}direction.value=direction.value==='unicode'?'preeti':'unicode';labels();if(input.value.trim())convert();});
document.querySelector('#clear-preeti').addEventListener('click',()=>{input.value='';invalidate();input.focus();});
copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(output.value);status.textContent='Result copied.';}catch{output.focus();output.select();status.textContent='Copy is unavailable here. The result is selected; use your device’s Copy command.';}});
download.addEventListener('click',()=>{if(!output.value||input.value!==lastSource||direction.value!==lastDirection)return;const url=URL.createObjectURL(new Blob([output.value],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=direction.value==='unicode'?'kalika-unicode.txt':'kalika-preeti.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);status.textContent='Text download started.';});
labels();
