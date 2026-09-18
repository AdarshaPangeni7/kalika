export function scientific(expression,angle='deg'){
 if(!expression.trim())throw Error('Enter an expression first.');
 if(expression.length>300)throw Error('Use an expression of 300 characters or fewer.');
 const input=expression.replaceAll('×','*').replaceAll('÷','/').replaceAll('−','-').replaceAll('π','pi').toLowerCase();
 const tokens=[];let pos=0;
 while(pos<input.length){if(/\s/.test(input[pos])){pos++;continue;}const m=input.slice(pos).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|^[a-z]+|^[+*/^()%!-]/);if(!m)throw Error('Use numbers, supported functions and arithmetic symbols only.');tokens.push(m[0]);pos+=m[0].length;}
 let at=0;const peek=()=>tokens[at],take=()=>tokens[at++];
 function finite(n){if(!Number.isFinite(n))throw Error('The result is outside the real-number range supported here.');return n;}
 function primary(){const t=take();let n;
  if(t==='('){n=sum();if(take()!==')')throw Error('Check the closing parentheses.');}
  else if(t==='pi')n=Math.PI;else if(t==='e')n=Math.E;
  else if(t&&/^(?:\d|\.)/.test(t))n=Number(t);
  else if(['sin','cos','tan','asin','acos','atan','sqrt','ln','log','abs','exp'].includes(t)){
   if(take()!=='(')throw Error('Put function arguments in parentheses, for example sqrt(9).');const x=sum();if(take()!==')')throw Error('Check the closing parentheses.');
   const r=angle==='deg'?x*Math.PI/180:x;
   if(t==='tan'&&Math.abs(Math.cos(r))<1e-14)throw Error('Tangent is undefined at this angle.');
   n=t==='sin'?Math.sin(r):t==='cos'?Math.cos(r):t==='tan'?Math.tan(r):t==='sqrt'?Math.sqrt(x):t==='ln'?Math.log(x):t==='log'?Math.log10(x):t==='abs'?Math.abs(x):t==='exp'?Math.exp(x):Math[t](x)*(angle==='deg'?180/Math.PI:1);
  }else throw Error('Check the expression. Use * between numbers and parentheses.');
  while(peek()==='%'||peek()==='!'){const op=take();if(op==='%')n/=100;else{if(!Number.isInteger(n)||n<0||n>170)throw Error('Factorial needs a whole number from 0 to 170.');let value=1;for(let i=2;i<=n;i++)value*=i;n=value;}}
  return finite(n);
 }
 function power(){let n=primary();if(peek()==='^'){take();n=finite(n**unary());}return n;}
 function unary(){if(peek()==='+'){take();return unary();}if(peek()==='-'){take();return -unary();}return power();}
 function product(){let n=unary();while(peek()==='*'||peek()==='/'){const op=take(),b=unary();if(op==='/'&&b===0)throw Error('Cannot divide by zero.');n=finite(op==='*'?n*b:n/b);}return n;}
 function sum(){let n=product();while(peek()==='+'||peek()==='-'){const op=take(),b=product();n=finite(op==='+'?n+b:n-b);}return n;}
 const n=sum();if(at!==tokens.length)throw Error('Check the expression. Use * for multiplication and match parentheses.');return Number(n.toPrecision(12));
}
const gcd=(a,b)=>{a=a<0n?-a:a;b=b<0n?-b:b;while(b)[a,b]=[b,a%b];return a;};
export function fraction(a,b,c,d,op){
 const values=[a,b,c,d].map(x=>{if(!/^[+-]?\d{1,15}$/.test(String(x).trim()))throw Error('Enter whole numbers with no more than 15 digits.');return BigInt(String(x).trim());});[a,b,c,d]=values;
 if(!b||!d)throw Error('A denominator cannot be zero.');if(b<0n){a=-a;b=-b;}if(d<0n){c=-c;d=-d;}
 let n,q,step;
 if(op==='+'){n=a*d+c*b;q=b*d;step=`(${a} × ${d} + ${c} × ${b}) / (${b} × ${d})`;}
 else if(op==='-'){n=a*d-c*b;q=b*d;step=`(${a} × ${d} − ${c} × ${b}) / (${b} × ${d})`;}
 else if(op==='*'){n=a*c;q=b*d;step=`(${a} × ${c}) / (${b} × ${d})`;}
 else if(op==='/'){if(!c)throw Error('Cannot divide by a zero fraction.');n=a*d;q=b*c;step=`(${a} × ${d}) / (${b} × ${c})`;}
 else throw Error('Choose an operation.');
 const divisor=gcd(n,q);n/=divisor;q/=divisor;if(q<0n){n=-n;q=-q;}
 const abs=n<0n?-n:n,whole=abs/q,remainder=abs%q;
 return {exact:q===1n?String(n):`${n} / ${q}`,mixed:whole&&remainder?`${n<0n?'-':''}${whole} ${remainder}/${q}`:null,decimal:Number((Number(n)/Number(q)).toPrecision(12)),step,divisor:String(divisor)};
}
export function workHours(rows){
 const toMinutes=t=>{if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(t))throw Error('Enter valid start and end times.');return Number(t.slice(0,2))*60+Number(t.slice(3));};
 let total=0;const days=[];
 for(const [i,row]of rows.entries()){
  if(!row.start&&!row.end&&!row.breakMinutes&&!row.nextDay){days.push(null);continue;}
  if(!row.start||!row.end)throw Error(`Row ${i+1}: enter both start and end times.`);
  const start=toMinutes(row.start),end=toMinutes(row.end)+(row.nextDay?1440:0),duration=end-start;
  if(duration<0)throw Error(`Row ${i+1}: select Next day for an overnight shift.`);
  if(duration>1440)throw Error(`Row ${i+1}: each shift must be 24 hours or shorter.`);
  const rest=String(row.breakMinutes||'0');if(!/^\d+$/.test(rest)||Number(rest)>duration)throw Error(`Row ${i+1}: break minutes must be a whole number no greater than the shift length.`);
  const paid=duration-Number(rest);total+=paid;days.push(paid);
 }
 if(days.every(x=>x===null))throw Error('Enter at least one shift.');
 return {total,days,hours:Math.floor(total/60),minutes:total%60,decimal:(total/60).toFixed(2)};
}
