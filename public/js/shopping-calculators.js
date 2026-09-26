import {discount,salesTax} from './shopping-calculator-core.js';
const $=id=>document.getElementById(id),kind=$('workspace').dataset.tool,form=$('shopping-form'),result=$('result');let copyText='';
const money=n=>new Intl.NumberFormat(document.documentElement.lang||'en',{style:'currency',currency:$('currency').value,minimumFractionDigits:2,maximumFractionDigits:2}).format(n/100);
function clear(){result.replaceChildren();$('error').textContent='';$('copy-status').textContent='';$('copy-result').disabled=true;copyText='';}
function row(label,value,key){const el=document.createElement('div');el.className='tip-result-row';el.dataset.result=key;const a=document.createElement('span'),b=document.createElement('strong');a.textContent=label;b.textContent=value;el.append(a,b);result.append(el);copyText+=`${label}: ${value}\n`;}
function note(text){const p=document.createElement('p');p.className='hint';p.textContent=text;result.append(p);copyText+=text+'\n';}
function modeLabel(){if(kind==='sales-tax-calculator')$('price-label').textContent=$('mode').value==='add'?'Price before tax':'Price including tax';}
form.addEventListener('input',clear);form.addEventListener('change',()=>{clear();modeLabel();});form.addEventListener('reset',()=>{clear();if(kind==='sales-tax-calculator')$('price-label').textContent='Price before tax';});
form.addEventListener('submit',e=>{e.preventDefault();clear();try{
 if(!['USD','EUR','GBP','CAD','AUD','CHF'].includes($('currency').value))throw Error('Choose a supported display currency.');
 const heading=document.createElement('h2');heading.textContent=kind==='discount-calculator'?'Your discounted price':'Your tax breakdown';result.append(heading);copyText=`Kalika ${heading.textContent} (${$('currency').value})\n`;
 if(kind==='discount-calculator'){
  const r=discount({price:$('price').value,rate:$('rate').value,extra:$('extra').value,voucher:$('voucher').value});
  row('Final price',money(r.final),'final');row('You save',money(r.saving),'saving');row('Original price',money(r.original),'original');row(`First discount (${r.firstRate}%)`,money(r.first),'first');row('Price after first discount',money(r.afterFirst),'after-first');if(r.secondRate)row(`Extra discount (${r.secondRate}% of remaining price)`,money(r.second),'second');if(r.fixed)row('Fixed reduction',money(r.fixed),'fixed');row('Effective saving',r.effective.toFixed(2)+'%','effective');note('Percentage discounts are applied in order, rounded to the nearest cent at each step, then the fixed reduction is subtracted. No extra tax or shipping is added.');
 }else{
  const r=salesTax({price:$('price').value,rate:$('rate').value,mode:$('mode').value});row('Price including tax',money(r.gross),'gross');row('Price before tax',money(r.net),'net');row(`Tax (${r.rate}%)`,money(r.tax),'tax');note(r.mode==='add'?`Calculation: price before tax × ${r.rate}% = tax; add the rounded tax to the price.`:`Calculation: price including tax ÷ (1 + ${r.rate}/100) = price before tax; subtract the rounded net price to find included tax.`);note('Uses the rate you enter. No tax rates, exemptions, filing rules or separate line-item rounding are determined by this calculator.');
 }
 note($('currency').value+' is a display currency only. No exchange-rate conversion is performed.');$('copy-result').disabled=false;
 }catch(e){clear();$('error').textContent=e.message;}});
$('copy-result').addEventListener('click',async()=>{if(!copyText)return;try{await navigator.clipboard.writeText(copyText);$('copy-status').textContent='Summary copied.';}catch{$('copy-status').textContent='Clipboard access is unavailable. Select and copy the result above.';}});
modeLabel();
