import {amount} from './tip-calculator-core.js';
const SCALE=1000000n; // 100 percent, with four decimal places of rate precision.
const round=(numerator,denominator)=>(numerator+denominator/2n)/denominator;
export function percentage(value,label='Rate',optional=false){
 const text=String(value).trim().replace(',','.');if(!text&&optional)return 0n;
 if(!/^(?:\d{1,3}(?:\.\d{0,4})?|\.\d{1,4})$/.test(text))throw Error(`${label}: enter a percentage from 0 to 100, with up to four decimal places.`);
 const [whole='',fraction='']=text.split('.'),units=BigInt(whole||'0')*10000n+BigInt(fraction.padEnd(4,'0'));
 if(units>SCALE)throw Error(`${label}: enter a percentage from 0 to 100.`);return units;
}
export function discount({price,rate,extra='',voucher=''}){
 const original=BigInt(amount(price,'Original price')),firstRate=percentage(rate,'Discount'),secondRate=percentage(extra,'Extra discount',true),fixed=BigInt(amount(voucher,'Fixed reduction',true));
 const first=round(original*firstRate,SCALE),afterFirst=original-first,second=round(afterFirst*secondRate,SCALE),afterSecond=afterFirst-second;
 if(fixed>afterSecond)throw Error('The fixed reduction cannot exceed the price remaining after the percentage discounts.');
 const final=afterSecond-fixed,saving=original-final;
 return {original:Number(original),first:Number(first),afterFirst:Number(afterFirst),second:Number(second),fixed:Number(fixed),final:Number(final),saving:Number(saving),effective:original?Number(round(saving*10000n,original))/100:0,firstRate:Number(firstRate)/10000,secondRate:Number(secondRate)/10000};
}
export function salesTax({price,rate,mode}){
 const input=BigInt(amount(price,'Price')),units=percentage(rate,'Tax rate');if(!['add','remove'].includes(mode))throw Error('Choose whether to add or remove included tax.');
 const net=mode==='add'?input:round(input*SCALE,SCALE+units),tax=mode==='add'?round(net*units,SCALE):input-net,gross=mode==='add'?net+tax:input;
 return {net:Number(net),tax:Number(tax),gross:Number(gross),rate:Number(units)/10000,mode};
}
