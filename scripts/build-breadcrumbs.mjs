import fs from 'node:fs';
import {load} from 'cheerio';
import {setBreadcrumb} from './breadcrumbs.mjs';
for (const [slug,name] of [['pdf-tools','PDF Tools'],['image-tools','Image Tools'],['calculators','Calculators'],['text-tools','Text Tools']]) {
  const file='public/'+slug+'.html', $=load(fs.readFileSync(file,'utf8'));
  setBreadcrumb($,[{name:'Home',path:'/'},{name:'Tools',path:'/#tools'},{name,path:'/'+slug}]);fs.writeFileSync(file,$.html());
}
for (const name of fs.readdirSync('public/guides').filter(name=>name.endsWith('.html')&&name!=='index.html')) {
  const file='public/guides/'+name,$=load(fs.readFileSync(file,'utf8'));
  setBreadcrumb($,[{name:'Home',path:'/'},{name:'Guides',path:'/guides/'},{name:$('h1').text(),path:$('link[rel="canonical"]').attr('href')}],'.article');
  fs.writeFileSync(file,$.html());
}
console.log('Updated four category breadcrumbs and all nine guide breadcrumbs, with matching BreadcrumbList schema.');
