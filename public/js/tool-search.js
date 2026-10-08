// Match task phrases locally. Never send search text to analytics or another service.
const input = document.getElementById('tool-search');
const clear = document.getElementById('tool-search-clear');
const cards = [...document.querySelectorAll('.category a.tool')];
const categories = [...document.querySelectorAll('.category')];
const aliases = {
 'clavier-francais':'french français francais accents accent keyboard clavier typing é è ç œ oe capital letters',
 'serbian-latin-cyrillic':'serbian srpski latinica ćirilica cirilica latin cyrillic preslovljavanje српски ћирилица латиница',
 'document-scanner':'scan text camera paper receipt straighten unskew photos',
 'ocr-pdf':'scan text scanned image photo recognize recognition searchable optical characters',
 'pdf-to-text':'scan text extract copy selectable words txt',
 'image-compressor':'photo smaller reduce size 50kb 100kb 200kb shrink compress picture',
 'image-resizer':'photo smaller dimensions pixels width height resize picture',
 'image-cropper':'photo crop trim square picture passport application',
 'image-format-converter':'photo jpg jpeg png webp format convert picture',
 'jpg-to-pdf':'photo pictures jpeg images document combine',
 'pdf-to-jpg':'photo pictures jpeg images convert',
 'compress-pdf':'smaller reduce size shrink email',
 'merge-pdf':'combine join documents',
 'split-pdf':'separate divide documents',
 'organize-pdf':'reorder rearrange pages',
 'rotate-pdf':'sideways upside down turn pages',
 'delete-pdf-pages':'remove unwanted blank pages',
 'extract-pdf-pages':'keep select save pages',
 'fill-sign-pdf':'signature form fill write',
 'watermark-pdf':'logo draft stamp',
 'page-numbers':'numbering pagination',
 'crop-pdf':'trim margins',
 'nepali-typing':'nepali roman english keyboard unicode write',
 'preeti-unicode-converter':'nepali legacy font unicode conversion',
 'bs-ad-converter':'nepali date calendar bikram sambat gregorian',
 'tip-calculator':'restaurant bill split gratuity share',
 'work-hours-calculator':'shift overnight timesheet wages time',
 'emi-calculator':'loan monthly payment interest',
 'currency-converter':'money exchange dollar euro rates',
 'unit-converter':'convert measurements inches feet cm kilograms temperature',
 'word-counter':'count words characters length reading',
 'space-remover':'cleanup whitespace extra spaces text',
 'duplicate-line-remover':'cleanup repeated lines text',
 'find-replace':'search replace text',
 'case-converter':'uppercase lowercase capitalization text',
 'text-to-slug':'url link slug text',
 'qr-generator':'qrcode barcode link code',
 'age-calculator':'birthday birth age date',
 'date-difference':'days between dates duration',
 'exam-countdown':'remaining days deadline exam timer',
 'grade-calculator':'final exam score needed marks',
 'gpa-calculator':'college university grade points credits',
 'percentage-calculator':'percent proportion ratio',
 'sales-tax-calculator':'price tax vat total',
 'discount-calculator':'sale price savings percent',
 'scientific-calculator':'math maths trigonometry sin cos log',
 'simple-calculator':'math maths arithmetic add subtract multiply divide',
 'fraction-calculator':'math maths fractions denominator numerator'
};
const normalize = text => text.toLowerCase().replace(/(\d)\s*kb/g,'$1kb').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const index = cards.map(card => ({card,text:normalize(card.textContent+' '+(aliases[card.getAttribute('href').split('/').pop()]||''))}));
function filter() {
 const terms = normalize(input.value).split(' ').filter(Boolean);let count=0;
 for(const {card,text} of index){card.hidden=!terms.every(term=>text.includes(term));if(!card.hidden)count++;}
 for(const category of categories)category.hidden=!category.querySelector('a.tool:not([hidden])');
 document.getElementById('tool-search-status').textContent = `${count} ${count===1?'tool':'tools'} ${terms.length?'found':'available'}.`;
 document.getElementById('tool-search-empty').hidden=count>0;clear.hidden=!input.value;
}
input.addEventListener('input',filter);
clear.addEventListener('click',()=>{input.value='';filter();input.focus();});
document.querySelectorAll('.categories a').forEach(link=>link.addEventListener('click',()=>{input.value='';filter();}));
filter();
