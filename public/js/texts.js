const search=document.querySelector('#text-search'),category=document.querySelector('#text-category');
function filter(){const q=search.value.trim().toLowerCase();let visible=0;document.querySelectorAll('.text-card').forEach(card=>{card.hidden=!(card.dataset.search.includes(q)&&(category.value==='all'||card.dataset.category===category.value));if(!card.hidden)visible++;});document.querySelector('#no-text-results').hidden=visible>0;}
search?.addEventListener('input',filter);category?.addEventListener('change',filter);
let size=24;
for(const [id,delta]of [['text-smaller',-2],['text-larger',2]])document.getElementById(id)?.addEventListener('click',()=>{size=Math.max(18,Math.min(40,size+delta));document.body.style.setProperty('--reading-size',size+'px');});
document.querySelector('#print-text')?.addEventListener('click',()=>window.print());
document.querySelector('#copy-verses')?.addEventListener('click',async()=>{const verse=document.querySelector('.original-verses'),status=document.querySelector('#reader-status');try{await navigator.clipboard.writeText(verse.textContent);status.textContent='Text copied.';}catch{const range=document.createRange();range.selectNodeContents(verse);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);status.textContent='Text selected. Use your device’s Copy command.';}});
