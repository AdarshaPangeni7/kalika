// Kalika Preeti codec. Basic character mapping adapted from Global Policy's
// UnicodeToPreeti (MIT, copyright 2017). See vendor/preeti-mapping-LICENSE.txt.
// Cluster handling and reverse conversion written for Kalika, September 2026.
const full = {'अ':'c','आ':'cf','इ':'O','ई':'O{','उ':'p','ऊ':'pm','ऋ':'C','ए':'P','ऐ':'P]','ओ':'cf]','औ':'cf}',
 'क':'s','ख':'v','ग':'u','घ':'3','ङ':'ª','च':'r','छ':'5','ज':'h','झ':'´','ञ':'`','ट':'6','ठ':'7','ड':'8','ढ':'9','ण':'0f','त':'t','थ':'y','द':'b','ध':'w','न':'g','प':'k','फ':'km','ब':'a','भ':'e','म':'d','य':'o','र':'/','ल':'n','व':'j','श':'z','ष':'if','स':';','ह':'x',
 'ा':'f','ि':'l','ी':'L','ु':"'",'ू':'"','ृ':'[','े':']','ै':'}','ो':'f]','ौ':'f}','ं':'+','ँ':'F','ः':'M','्':'\\','।':'.','०':')','१':'!','२':'@','३':'#','४':'$','५':'%','६':'^','७':'&','८':'*','९':'(','ॐ':'ç'};
const half = {'क':'S','ख':'V','ग':'U','घ':'£','च':'R','ज':'H','झ':'‰','ञ':'~','ण':'0','त':'T','थ':'Y','ध':'W','न':'G','प':'K','फ':'Km','ब':'A','भ':'E','म':'D','य':'Ø','ल':'N','व':'J','श':'Z','ष':'i','स':':','ह':'X'};
const joints = {'क्ष':'If','त्र':'q','ज्ञ':'1','श्र':'>','त्त':'Q','द्द':'2','द्ध':'4','द्व':'å','द्य':'B','ट्ट':'§','ठ्ठ':'¶','ड्ड':'•','ङ्ग':'Ë','ङ्क':'Í','ङ्ख':'Î','ङ्घ':'‹','द्र':'›','द्म':'ß'};
const consonant='[क-ह]';
const cluster=new RegExp(`${consonant}(?:्${consonant})*्?[ािीुूृेैोौंँः]*`,'gu');
const jointKeys=Object.keys(joints).sort((a,b)=>b.length-a.length);
function encodeBody(body){
 let result='';
 while(body){
  const joint=jointKeys.find(k=>body.startsWith(k));
  if(joint){let value=joints[joint];body=body.slice(joint.length);if(body.startsWith('्')){value=value.endsWith('f')?value.slice(0,-1):value+'\\';body=body.slice(1);}result+=value;continue;}
  const ch=body[0];body=body.slice(1);
  if(body.startsWith('्र')&&ch!=='र'){result+=(full[ch]||ch)+(/[टठडढ]/.test(ch)?'«':'|');body=body.slice(2);}
  else if(body.startsWith('्')){result+=half[ch]||(full[ch]||ch)+'\\';body=body.slice(1);}
  else result+=full[ch]||ch;
 }
 return result;
}
export function toPreeti(text){
 // Latin letters and whitespace are preserved; punctuation uses Preeti codes.
 const punctuation={'.':'=','?':'<','(':'-',')':'_','/':'÷','+':'±','“':'æ','”':'Æ'};
 return text.normalize('NFC').replace(/[.?()/+“”]/g,c=>punctuation[c]).replace(/[\u0900-\u097f]+/gu,run=>{
  let result='',cursor=0;
  for(const match of run.matchAll(cluster)){
   result+=Array.from(run.slice(cursor,match.index),c=>full[c]||c).join('');
   let syllable=match[0],reph='';
   if(/^र्[क-ह]/u.test(syllable)){reph='{';syllable=syllable.slice(2);}
   const marks=syllable.match(/[ािीुूृेैोौंँः]+$/u)?.[0]||'';
   const body=syllable.slice(0,syllable.length-marks.length);
   result+=(marks.includes('ि')?'l':'')+encodeBody(body)+Array.from(marks.replace('ि',''),c=>full[c]||c).join('')+reph;
   cursor=match.index+match[0].length;
  }
  return result+Array.from(run.slice(cursor),c=>full[c]||c).join('');
 });
}
const reverse={};
for(const [u,p]of Object.entries(full))reverse[p]=u;
for(const [u,p]of Object.entries(half))reverse[p]=u+'्';
for(const [u,p]of Object.entries(joints))reverse[p]=u;
Object.assign(reverse,{'I':'क्ष्','|':'्र','«':'्र','?':'रु','¿':'रू','qm':'क्र','Qm':'क्त','em':'झ','O{':'ई','¡':'ज्ञ्','¢':'द्घ','Å':'हृ','¥':'्र','©':'र','æ':'“','Æ':'”','÷':'/','=':'.','<':'?','-':'(','_':')','±':'+','˜':'ऽ'});
// Pre-base i and post-base reph must be reordered around a complete cluster.
reverse.l='\uE000';reverse['{']='\uE001';
const keys=Object.keys(reverse).sort((a,b)=>b.length-a.length);
export function toUnicode(text){
 // Protect existing Unicode and process each line independently.
 return text.split(/(\r\n|\n|\r)/).map(line=>{
  let mapped='';
  for(let i=0;i<line.length;){const key=keys.find(k=>line.startsWith(k,i));mapped+=key?reverse[key]:line[i];i+=key?key.length:1;}
  mapped=mapped.replace(/्ा/gu,'').replace(/अा/gu,'आ').replace(/आे/gu,'ओ').replace(/आै/gu,'औ').replace(/ाे/gu,'ो').replace(/ाै/gu,'ौ');
  mapped=mapped.replace(/\uE000([क-ह](?:्[क-ह])*्?)/gu,'$1ि');
  mapped=mapped.replace(/([क-ह](?:्[क-ह])*[ािीुूृेैोौंँः]*)\uE001/gu,'र्$1');
  return mapped.replaceAll('\uE000','ि').replaceAll('\uE001','र्').normalize('NFC');
 }).join('');
}
