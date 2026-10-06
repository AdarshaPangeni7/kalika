import {readFile,writeFile,readdir} from 'node:fs/promises';
import {load} from 'cheerio';
// The homepage's actual categorized tool links are the registry. Counts are never hand-maintained.
const file='public/index.html',original=await readFile(file,'utf8'),$=load(original.trim()),links=[];
const categories=$('.category').toArray();
for(const [index,category] of categories.entries()){
 const title=$(category).find('.category-title');
 if(!title.children('span.mono').length)title.prepend('<span class="mono"></span>');
 title.children('span.mono').text(String(index+1).padStart(2,'0'));
 const section=$(category),tools=section.find('a.tool[href^="/tools/"]');
 tools.each((_,e)=>links.push($(e).attr('href')));
 $(`.categories a[href="#${section.attr('id')}"] span`).text(String(tools.length).padStart(2,'0'));
}
const actual=(await readdir('public/tools')).filter(f=>f.endsWith('.html')).map(f=>'/tools/'+f.slice(0,-5)).sort();
if(new Set(links).size!==links.length||JSON.stringify([...links].sort())!==JSON.stringify(actual))throw Error('Every tool page must have exactly one categorized homepage card.');
const count=links.length,title=`Kalika: ${count} Free PDF, Image, Text Tools & Calculators`;
const description=`Get everyday tasks done with ${count} free PDF, image and text tools plus calculators. No signup, with file processing in your browser. Explore Kalika today.`;
$('title').text(title);$('meta[name=description]').attr('content',description);
for(const prefix of ['og','twitter']){ $(`meta[property="${prefix}:title"],meta[name="${prefix}:title"]`).attr('content',title);$(`meta[property="${prefix}:description"],meta[name="${prefix}:description"]`).attr('content',description); }
$('.hero .intro').text(`Compress a photo. Convert a file. Work out the numbers. ${count} handy tools, ready when you are.`);
$('.catalog-head .mono').text(`${count} tools / ${categories.length} categories`);
const output=$.html().trimEnd()+'\n';
if(process.argv.includes('--check')){if(original!==output)throw Error('Run npm run build:counts and commit the homepage.');}
else await writeFile(file,output);
console.log(`${count} tools across ${categories.length} categories; all counts generated and registry complete.`);
