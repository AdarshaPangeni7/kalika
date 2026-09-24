// Integer minor units keep displayed totals and split payments consistent.
export function amount(value,label='Amount',blankZero=false){
 const text=String(value).trim().replace(',','.');
 if(!text&&blankZero)return 0;
 if(!/^(?:\d{1,7}(?:\.\d{0,2})?|\.\d{1,2})$/.test(text))throw Error(`${label}: enter a positive amount or zero, with up to two decimal places and no thousands separators.`);
 const [whole='0',fraction='']=text.split('.'),cents=Number(whole||0)*100+Number(fraction.padEnd(2,'0'));
 if(cents>100000000)throw Error(`${label}: use an amount up to 1,000,000.`);
 return cents;
}
export function calculateTip({bill,tax='',rate,people,base='before-tax',round=false}){
 const billCents=amount(bill,'Bill total'),taxCents=amount(tax,'Included tax',true);
 if(taxCents>billCents)throw Error('Included tax cannot exceed the bill total.');
 if(!['before-tax','full-bill'].includes(base))throw Error('Choose a valid tip calculation base.');
 const rateText=String(rate).trim().replace(',','.');
 if(!/^(?:\d{1,3}(?:\.\d{0,2})?|\.\d{1,2})$/.test(rateText)||Number(rateText)>100)throw Error('Enter a tip rate from 0 to 100%, with up to two decimal places.');
 const rateHundredths=Math.round(Number(rateText)*100),peopleText=String(people).trim();
 if(!/^\d{1,3}$/.test(peopleText)||Number(peopleText)<1||Number(peopleText)>100)throw Error('Enter a whole number of people from 1 to 100.');
 const count=Number(peopleText),tipBase=base==='before-tax'?billCents-taxCents:billCents;
 const calculatedTip=Math.floor((tipBase*rateHundredths+5000)/10000),subtotal=billCents+calculatedTip;
 const rounding=round?(100-subtotal%100)%100:0,total=subtotal+rounding;
 const low=Math.floor(total/count),extra=total%count;
 return {bill:billCents,tax:taxCents,base:tipBase,rate:rateHundredths/100,calculatedTip,rounding,tip:calculatedTip+rounding,total,people:count,low,high:low+(extra?1:0),highCount:extra,lowCount:count-extra};
}
