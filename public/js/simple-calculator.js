// Pocket-calculator semantics: operations are applied from left to right.
export class Calculator {
  constructor() { this.clear(); }
  clear() { this.display='0'; this.total=null; this.operator=null; this.fresh=true; this.repeat=null; this.error=''; this.note='Ready'; }
  format(n) { if(!Number.isFinite(n)) throw Error('Result is too large. Press AC to start again.'); return String(Number(n.toPrecision(12))); }
  calculate(a,op,b) { if(op==='/'&&b===0) throw Error('Cannot divide by zero. Enter a new number or press AC.'); return this.format(op==='+'?a+b:op==='-'?a-b:op==='*'?a*b:a/b); }
  press(key) {
    if(key==='AC') { this.clear(); return; }
    if(this.error) { if(!/^[0-9.]$/.test(key))return; this.clear(); }
    try {
      if(/^[0-9.]$/.test(key)) {
        if(this.fresh) { this.display='0'; this.fresh=false; }
        this.repeat=null;
        if(key==='.') { if(!this.display.includes('.'))this.display+='.'; }
        else if(this.display.replace(/[-.]/g,'').length<12) this.display=this.display==='0'?key:this.display==='-0'?'-'+key:this.display+key;
        else this.note='Maximum 12 digits per number.';
      } else if(key==='back') {
        if(!this.fresh) this.display=this.display.slice(0,-1).replace(/^-$|^$/,'0');
      } else if(key==='sign') {
        if(this.fresh&&this.operator)this.display='0';
        this.display=this.display.startsWith('-')?this.display.slice(1):'-'+this.display;
        this.fresh=this.fresh&&!this.operator; this.repeat=null;
      } else if(key==='%') {
        this.display=this.format(Number(this.display)/100); this.fresh=false; this.repeat=null; this.note='Percent divides the displayed number by 100.';
      } else if(['+','-','*','/'].includes(key)) {
        if(this.operator&&!this.fresh) this.display=this.calculate(this.total,this.operator,Number(this.display));
        this.total=Number(this.display);this.operator=key;this.fresh=true;this.repeat=null;this.note=this.display+' '+({'*':'×','/':'÷'}[key]||key);
      } else if(key==='=') {
        if(this.operator) {
          if(this.fresh) { this.note='Enter the next number before equals.'; return; }
          const b=Number(this.display),op=this.operator,a=this.total;
          this.display=this.calculate(a,op,b);this.repeat={op,b};this.note=a+' '+({'*':'×','/':'÷'}[op]||op)+' '+b+' =';this.operator=null;this.total=null;
        } else if(this.repeat) this.display=this.calculate(Number(this.display),this.repeat.op,this.repeat.b);
        this.fresh=true;
      }
    } catch(e) { this.error=e.message; this.display='Error';this.note='Calculation stopped'; }
  }
}
if(typeof document!=='undefined') {
  const root=document.querySelector('[data-tool="simple-calculator"]');
  if(root) {
    const calculator=new Calculator(),display=root.querySelector('#calc-display');
    function act(key) { calculator.press(key);display.textContent=calculator.display;root.querySelector('#calc-expression').textContent=calculator.note;root.querySelector('#calc-error').textContent=calculator.error; }
    root.addEventListener('click',e=>{const button=e.target.closest('[data-key]');if(button)act(button.dataset.key);});
    root.addEventListener('keydown',e=>{
      if(e.ctrlKey||e.metaKey||e.altKey||e.target.matches('input,textarea,select'))return;
      const key=({'Enter':'=','Escape':'AC','Delete':'AC','Backspace':'back',',':'.'}[e.key]||e.key);
      // Enter on a button retains its native activation behavior.
      if(e.key==='Enter'&&e.target.matches('button'))return;
      if(/^[0-9.+*/=%-]$/.test(key)||['AC','back'].includes(key)){e.preventDefault();act(key);}
    });
    root.querySelector('#calc-keyboard').focus({preventScroll:true});
  }
}
