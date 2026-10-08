import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {ACCENTS,SHORTCUTS,expandShortcut} from '../public/js/french-keyboard.js';
import {testServer} from './security-test-server.mjs';
for(const [sequence,letter] of Object.entries(SHORTCUTS)){
 assert.equal(expandShortcut(sequence,sequence.length).value,letter);
 const upper=sequence[0].toUpperCase()+sequence.slice(1);assert.equal(expandShortcut(upper,upper.length).value,letter.toUpperCase());
 const result=expandShortcut('avant '+sequence+' après',6+sequence.length);assert.equal(result.value,'avant '+letter+' après');assert.equal(result.caret,7);
}
assert.equal(expandShortcut('bonjour',7).value,'bonjour');
const server=await testServer(),base=process.env.KALIKA_TEST_ORIGIN||server.base;
const browser=await chromium.launch({channel:process.platform==='win32'?'chrome':undefined});
try{
 const context=await browser.newContext({locale:'fr-FR',permissions:['clipboard-read','clipboard-write']});
 const page=await context.newPage(),errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(base))external.push(r.url());});
 assert.equal((await page.goto(base+'/tools/clavier-francais')).status(),200);assert.equal(await page.locator('html').getAttribute('lang'),'fr');
 const editor=page.locator('#french-editor');assert.ok(await page.locator('#copy-french').isDisabled());assert.equal(await page.locator('#french-shortcuts').isChecked(),false);
 for(const letter of ACCENTS)await page.getByRole('button',{name:`Insérer ${letter}`,exact:true}).click();assert.equal(await editor.inputValue(),ACCENTS.join(''));
 await editor.fill('caf et thé');await editor.evaluate(e=>e.setSelectionRange(3,3));await page.getByRole('button',{name:'Insérer é',exact:true}).click();assert.equal(await editor.inputValue(),'café et thé');assert.equal(await editor.evaluate(e=>e.selectionStart),4);
 await editor.fill('Bonjour ami');await editor.evaluate(e=>e.setSelectionRange(8,11));await page.getByRole('button',{name:'Insérer œ',exact:true}).click();assert.equal(await editor.inputValue(),'Bonjour œ');await page.locator('#undo-french').click();assert.equal(await editor.inputValue(),'Bonjour ami');await page.locator('#redo-french').click();assert.equal(await editor.inputValue(),'Bonjour œ');
 const old=await editor.inputValue();await page.locator('#french-uppercase').click();assert.equal(await editor.inputValue(),old);await page.getByRole('button',{name:'Insérer É',exact:true}).click();assert.equal(await editor.inputValue(),'Bonjour œÉ');await page.locator('#french-uppercase').click();await page.getByRole('button',{name:'Insérer ç',exact:true}).click({modifiers:['Shift']});assert.equal(await editor.inputValue(),'Bonjour œÉÇ');
 await editor.fill('');await editor.pressSequentially("e'");assert.equal(await editor.inputValue(),"e'");await page.locator('#french-shortcuts').check();await editor.fill('');await editor.pressSequentially("e' c, oe/ E' Oe/");assert.equal(await editor.inputValue(),'é ç œ É Œ');
 await editor.fill('');await editor.pressSequentially("e'");await editor.press(process.platform==='darwin'?'Meta+z':'Control+z');assert.equal(await editor.inputValue(),'e');await page.locator('#redo-french').click();assert.equal(await editor.inputValue(),'é');
 // A punctuation-triggered substitution in the middle must undo without changing surrounding text.
 await editor.fill('avant code après');await editor.evaluate(e=>e.setSelectionRange(10,10));await editor.pressSequentially("'");assert.equal(await editor.inputValue(),'avant codé après');await editor.press(process.platform==='darwin'?'Meta+z':'Control+z');assert.equal(await editor.inputValue(),'avant code après');assert.equal(await editor.evaluate(e=>e.selectionStart),10);
 for(const [sequence,letter] of Object.entries(SHORTCUTS)){const upper=sequence[0].toUpperCase()+sequence.slice(1);await editor.fill('');await editor.pressSequentially(upper);assert.equal(await editor.inputValue(),letter.toUpperCase());}
 await editor.fill("Texte collé : e' c, oe/");assert.equal(await editor.inputValue(),"Texte collé : e' c, oe/");
 await page.locator('#clear-french').click();assert.equal(await editor.inputValue(),'');assert.match(await page.locator('#french-status').innerText(),/Texte effacé.*Annuler.*récupérer/);await page.locator('#undo-french').click();assert.equal(await editor.inputValue(),"Texte collé : e' c, oe/");
 await page.locator('#french-shortcuts').uncheck();await editor.fill('Déjà écrit');await page.locator('#example-french').click();assert.ok((await editor.inputValue()).startsWith('Déjà écrit\nÉcrivez'));
 await editor.fill('École, cœur, façade\nÀ demain !');await page.locator('#copy-french').click();assert.equal((await page.evaluate(()=>navigator.clipboard.readText())).replaceAll('\r\n','\n'),'École, cœur, façade\nÀ demain !');
 const pending=page.waitForEvent('download');await page.locator('#download-french').click();const download=await pending;assert.equal(download.suggestedFilename(),'kalika-texte-francais.txt');assert.equal(await readFile(await download.path(),'utf8'),'École, cœur, façade\nÀ demain !');
 await editor.fill('a'.repeat(100001));await page.getByRole('button',{name:'Insérer é',exact:true}).click();assert.equal((await editor.inputValue()).length,100001);assert.match(await page.locator('#french-status').innerText(),/100 000/);assert.equal(await page.locator('#download-french').isDisabled(),false);await page.locator('#clear-french').click();await page.locator('#undo-french').click();assert.equal((await editor.inputValue()).length,100001);
 await editor.fill('<img src=x onerror=alert(1)>');assert.equal(await page.locator('.french-workspace img').count(),0);
 await page.getByText('Ponctuation et espaces',{exact:true}).click();await editor.fill('');await page.getByRole('button',{name:'Insérer Espace insécable',exact:true}).click();await page.getByRole('button',{name:'Insérer Espace fine insécable',exact:true}).click();assert.equal(await editor.inputValue(),'\u00a0\u202f');
 await page.getByText('Voir les raccourcis',{exact:true}).click();await page.locator('#clear-french').click();await page.locator('#example-french').click();
 await mkdir('reports/french-keyboard',{recursive:true});
 for(const width of [1280,390,320]){await page.setViewportSize({width,height:950});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);await page.screenshot({path:`reports/french-keyboard/editor-${width}.png`,fullPage:true});}
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(axe.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[]);
 await page.getByRole('button',{name:'Choix de confidentialité',exact:true}).click();assert.ok(await page.getByRole('button',{name:'Refuser l’analytique',exact:true}).isVisible());await page.getByRole('button',{name:'Refuser l’analytique',exact:true}).click();
 for(const href of await page.locator('a[href^="/"]').evaluateAll(a=>[...new Set(a.map(e=>e.getAttribute('href')))]))assert.equal((await page.request.get(base+href)).status(),200,href);
 const graph=JSON.parse(await page.locator('script[type="application/ld+json"]').textContent())['@graph'];assert.deepEqual(graph.find(x=>x['@type']==='FAQPage').mainEntity.map(x=>x.acceptedAnswer.text),await page.locator('main .explainer details p').allTextContents());
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);await context.close();
 // Simulate a browser refusing clipboard access: copying must offer manual selection.
 const fallback=await browser.newPage();await fallback.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(Error('blocked'))}});});await fallback.goto(base+'/tools/clavier-francais');await fallback.locator('#french-editor').fill('École');await fallback.locator('#copy-french').click();assert.match(await fallback.locator('#french-status').innerText(),/Copie automatique indisponible/);assert.equal(await fallback.locator('#french-editor').evaluate(e=>e.selectionEnd-e.selectionStart),5);await fallback.close();
 const touchContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'fr-FR'});const touchPage=await touchContext.newPage();await touchPage.goto(base+'/tools/clavier-francais');await touchPage.locator('#french-editor').fill('caf et thé');await touchPage.locator('#french-editor').evaluate(e=>{e.focus();e.setSelectionRange(3,3);});await touchPage.getByRole('button',{name:'Insérer é',exact:true}).tap();assert.equal(await touchPage.locator('#french-editor').inputValue(),'café et thé');await touchPage.locator('#french-uppercase').tap();await touchPage.getByRole('button',{name:'Insérer Ç',exact:true}).tap();assert.equal(await touchPage.locator('#french-editor').inputValue(),'caféÇ et thé');await touchContext.close();
 console.log('PASS French accent/uppercase insertion, caret/selection, undo/redo, keyboard history, optional shortcuts, unchanged paste, non-destructive example, copy/download/fallback, large input, XSS safety, punctuation, mobile touch insertion, accessibility, localized consent, schema, links; no text network requests or JS errors.');
}finally{await browser.close();await server.close();}
