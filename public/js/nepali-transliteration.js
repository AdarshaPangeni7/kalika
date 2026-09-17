// Deterministic Romanized Nepali transliteration. No network or storage access.
const vowels = {a:['अ',''],aa:['आ','ा'],i:['इ','ि'],ii:['ई','ी'],ee:['ई','ी'],u:['उ','ु'],uu:['ऊ','ू'],oo:['ऊ','ू'],e:['ए','े'],ai:['ऐ','ै'],o:['ओ','ो'],au:['औ','ौ'],R:['ऋ','ृ']};
const consonants = {ksh:'क्ष',gy:'ज्ञ',jn:'ज्ञ',chh:'छ',kh:'ख',gh:'घ',ng:'ङ',ch:'च',jh:'झ',ny:'ञ',Th:'ठ',Dh:'ढ',th:'थ',dh:'ध',ph:'फ',bh:'भ',sh:'श',Sh:'ष',k:'क',g:'ग',c:'च',j:'ज',T:'ट',D:'ड',N:'ण',t:'त',d:'द',n:'न',p:'प',f:'फ',b:'ब',m:'म',y:'य',r:'र',l:'ल',v:'व',w:'व',s:'स',h:'ह',x:'क्ष'};
const dictionary = {
 namaste:['नमस्ते'],namaskar:['नमस्कार'],nepal:['नेपाल'],nepali:['नेपाली'],mero:['मेरो'],meri:['मेरी'],ma:['म','मा'],maa:['मा','म'],hami:['हामी'],hamro:['हाम्रो'],timi:['तिमी'],timro:['तिम्रो'],tapai:['तपाईं','तपाई'],tapain:['तपाईं'],tapailai:['तपाईंलाई'],tapaiharu:['तपाईंहरू'],tapainlai:['तपाईंलाई'],lai:['लाई'],ko:['को'],ka:['क','का'],ki:['कि','की'],ke:['के'],kasto:['कस्तो'],kasti:['कस्ती'],kati:['कति'],kata:['कता'],kaha:['कहाँ'],kina:['किन'],kasari:['कसरी'],kun:['कुन'],kasle:['कसले'],kaslai:['कसलाई'],cha:['छ','च'],chha:['छ'],chhu:['छु'],chu:['छु'],chhan:['छन्'],chhaun:['छौँ'],chhau:['छौ'],chhaina:['छैन'],chhainan:['छैनन्'],ho:['हो'],huncha:['हुन्छ'],hunchha:['हुन्छ'],hunchu:['हुन्छु'],hunuhunchha:['हुनुहुन्छ'],hunu:['हुनु'],ramro:['राम्रो'],ramri:['राम्री'],thik:['ठीक'],thikai:['ठीकै'],dhanyabad:['धन्यवाद'],dhanyavad:['धन्यवाद'],dherai:['धेरै'],swagat:['स्वागत'],swagatam:['स्वागतम्'],shubhakamana:['शुभकामना'],shubha:['शुभ'],janmadin:['जन्मदिन'],sanchai:['सन्चै'],sanchhai:['सन्चै'],sathi:['साथी'],sathiharu:['साथीहरू'],ghar:['घर'],naam:['नाम'],nam:['नाम'],ram:['राम'],sita:['सीता'],kathmandu:['काठमाडौं','काठमाडौँ'],pokhara:['पोखरा'],aaja:['आज'],aja:['आज'],bholi:['भोलि'],hijo:['हिजो'],ahile:['अहिले'],pachi:['पछि'],pahile:['पहिले'],feri:['फेरि'],pani:['पनि','पानी'],paani:['पानी'],khana:['खाना'],khanchhu:['खान्छु'],janachhu:['जान्छु'],janchhu:['जान्छु'],garchhu:['गर्छु'],garchu:['गर्छु'],garnu:['गर्नु'],garnuhos:['गर्नुहोस्'],lekhnu:['लेख्नु'],padhnu:['पढ्नु'],bolnu:['बोल्नु'],bhasa:['भाषा'],bhasha:['भाषा'],bidyalaya:['विद्यालय'],vidyalaya:['विद्यालय'],kitab:['किताब'],kitaab:['किताब'],shiksha:['शिक्षा'],gyan:['ज्ञान'],gyaan:['ज्ञान'],maya:['माया'],man:['मन'],sabai:['सबै'],sanga:['सँग'],sangai:['सँगै'],bata:['बाट'],dekhi:['देखि'],samma:['सम्म'],ra:['र'],tara:['तर'],ani:['अनि'],yo:['यो'],tyo:['त्यो'],yaha:['यहाँ'],tyaha:['त्यहाँ'],ek:['एक'],dui:['दुई'],tin:['तीन'],char:['चार'],panch:['पाँच'],saat:['सात'],aath:['आठ'],nau:['नौ'],das:['दस'],kripaya:['कृपया'],maaf:['माफ'],pranam:['प्रणाम'],sansar:['संसार'],computer:['कम्प्युटर'],kalika:['कालिका']
};
const keys = [...Object.keys(vowels),...Object.keys(consonants),'~','M','H','_'].sort((a,b)=>b.length-a.length);
export function phonetic(word) {
 let result='',pending=false;
 for(let i=0;i<word.length;){
  let token=keys.find(k=>word.startsWith(k,i));
  if(!token){const lower=word[i].toLowerCase();token=keys.includes(lower)?lower:null;}
  if(!token){result+=word[i++];pending=false;continue;}
  i+=token.length;
  if(vowels[token]){result+=vowels[token][pending?1:0];pending=false;}
  else if(consonants[token]){result+=(pending?'्':'')+consonants[token];pending=true;}
  else {result+=({ '~':'ँ',M:'ं',H:'ः',_:'्'})[token];pending=false;}
 }
 return result.normalize('NFC');
}
export function candidates(word){return [...new Set([...(dictionary[word.toLowerCase()]||[]),phonetic(word),word])];}
export function convertText(text){
 // Preserve URLs/email addresses and already-Unicode text.
 return text.replace(/https?:\/\/[^\s]+|www\.[^\s]+|[\w.+-]+@[\w.-]+\.[A-Za-z]+|[A-Za-z][A-Za-z~_]*/g,word=> /@|https?:\/\/|^www\./.test(word)?word:candidates(word)[0]).replace(/\|/g,'।');
}
