import {scientific,fraction,workHours} from './calculator-core.js';
const $=id=>document.getElementById(id),root=document.querySelector('[data-calculator]'),mode=root.dataset.calculator,form=$('tool-form'),result=$('result'),error=$('error');
function clear(){result.replaceChildren();error.textContent='';}
function line(tag,text){const el=document.createElement(tag);el.textContent=text;result.append(el);}
form.addEventListener('input',clear);form.addEventListener('change',clear);
if(mode==='scientific-calculator'){
 const input=$('expression');root.querySelectorAll('[data-insert]').forEach(button=>button.onclick=()=>{clear();const value=button.dataset.insert,start=input.selectionStart??input.value.length,end=input.selectionEnd??start;if(input.value.length-(end-start)+value.length>300){error.textContent='Use up to 300 characters.';return;}input.setRangeText(value,start,end,'end');input.focus();});
 $('backspace').onclick=()=>{clear();const start=input.selectionStart,end=input.selectionEnd;input.setRangeText('',start===end?Math.max(0,start-1):start,end,'end');input.focus();};
 $('clear-expression').onclick=()=>{input.value='';clear();input.focus();};
}
form.addEventListener('reset',()=>{clear();});
form.addEventListener('submit',e=>{e.preventDefault();clear();try{
 if(mode==='scientific-calculator'){line('h2','Result');line('p',String(scientific($('expression').value,$('angle').value)));line('p',`Angle mode: ${$('angle').value==='deg'?'degrees':'radians'}. Result rounded to 12 significant digits.`);}
 else if(mode==='fraction-calculator'){const r=fraction($('numerator-a').value,$('denominator-a').value,$('numerator-b').value,$('denominator-b').value,$('operation').value);line('h2',r.exact);if(r.mixed)line('p','Mixed number: '+r.mixed);line('p','Decimal approximation: '+r.decimal);line('h3','Working');line('p',r.step);line('p',`Divide numerator and denominator by their greatest common divisor (${r.divisor}), then keep the denominator positive.`);}
 else{const rows=[...form.querySelectorAll('.shift-row')].map(row=>({start:row.querySelector('[data-start]').value,end:row.querySelector('[data-end]').value,breakMinutes:row.querySelector('[data-break]').value,nextDay:row.querySelector('[data-next]').checked}));const r=workHours(rows);line('h2',`${r.hours} hours ${r.minutes} minutes`);line('p',`${r.decimal} decimal hours in total`);r.days.forEach((n,i)=>{if(n!==null)line('p',`Row ${i+1}: ${Math.floor(n/60)} hours ${n%60} minutes (${(n/60).toFixed(2)} decimal hours)`);});line('p','Clock-time total only. Daylight-saving changes, overtime rules and pay rates are not applied.');}
 }catch(e){error.textContent=e.message;}});
