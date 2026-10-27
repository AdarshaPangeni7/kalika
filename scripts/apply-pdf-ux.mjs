import {readFile,writeFile} from 'node:fs/promises';
import {load} from 'cheerio';
const tools={
 'merge-pdf':['Combine several PDFs into one file. Put them in order, then create and download your merged PDF.','Add PDFs','Put files in order','Create and download'],
 'split-pdf':['Save the pages you need, or make a separate PDF for every page. Your original document stays unchanged.','Select PDF','Choose pages or separate files','Create and download'],
 'organize-pdf':['Put PDF pages in the right order, rotate them or remove pages you do not need. Check the page previews before creating your file.','Select PDF','Arrange your pages','Create and download'],
 'extract-pdf-pages':['Select the pages you want to keep in a new PDF. The selected pages stay in their original order.','Select PDF','Select pages to keep','Extract and download'],
 'delete-pdf-pages':['Remove unwanted pages from a PDF. The remaining page previews show what will be in your download.','Select PDF','Remove unwanted pages','Create and download'],
 'rotate-pdf':['Turn sideways PDF pages the right way up. Rotate individual pages or the whole document, then download your copy.','Select PDF','Rotate pages','Create and download'],
 'watermark-pdf':['Add a draft label, text or logo to your PDF. Check the preview, then download the marked copy.','Select PDF','Add a label or logo','Preview and download'],
 'page-numbers':['Add page numbers to a PDF. Choose where they go and check the preview before downloading.','Select PDF','Choose your numbering','Preview and download'],
 'crop-pdf':['Trim unwanted page margins from a PDF. Enter how much to trim, check the boundary and download your copy.','Select PDF','Set and preview the trim','Create and download'],
 'fill-sign-pdf':['Fill in a PDF form or add text and a visible signature. Place your items on the page, preview your changes and download your copy.','Select PDF','Fill in or add items','Preview and download'],
 'pdf-to-jpg':['Turn every PDF page into a JPG image. Download the images together in one ZIP file, then open or extract it to use the pictures.','Select PDF','Choose image quality','Convert and download'],
 'pdf-to-text':['Extract copyable text from a PDF. Review the result, then copy it or download a text file. Scanned pages need Private OCR instead.','Select PDF','Extract and review text','Copy or download'],
 'ocr-pdf':['Recognize printed text in scans and photos on your device. Choose the language, review the recognized text and download your result.','Add a scan or PDF','Recognize and review text','Download your result'],
 'jpg-to-pdf':['Put your photos into one PDF. Add images, arrange their order and create your file. Cropping and enhancement are optional.'],
 'document-scanner':['Turn photos of paper into straight, readable scans. Adjust the corners, choose a look and save your pages as a PDF.']
};
for(const [slug,[intro,...steps]]of Object.entries(tools)){
 const file=`public/tools/${slug}.html`,$=load(await readFile(file,'utf8'));
 $('body').addClass('pdf-simple');
 $('#file').closest('label').contents().filter((_,n)=>n.type==='text').each((_,n)=>{n.data=slug==='merge-pdf'?'Select PDFs':'Select PDF';});
 if(!$('link[href="/pdf-workflow.css"]').length)$('head').append('<link rel="stylesheet" href="/pdf-workflow.css">');
 if(!$('script[src="/js/pdf-workflow.js"]').length)$('head').append('<script type="module" src="/js/pdf-workflow.js"></script>');
 $('.tool-heading > p:last-of-type').text(intro);
 $('.workspace .hint').each((_,e)=>{
  let text=$(e).text();
  if(text.includes('Forms and signature dictionaries are not supported.'))text='Use PDFs without passwords. For forms, save a copy using Print to PDF first. Keep any signed originals.';
  else text=text.replace('Unlocked, flattened and unsigned documents only. Existing text remains as PDF text.','For forms, use a copy saved with Print to PDF. Keep any signed original.').replace('Use an unlocked, flattened and unsigned PDF. Text stays as text; bookmarks and document-level features may not carry over. Review the download before sharing.','Use a PDF without a password. For forms, first save a copy using Print to PDF. Keep any signed original.').replace('Latin text uses Helvetica; use an image watermark for other scripts.','For unsupported lettering, use an image watermark.').replace('XFA and certificate signature fields are unsupported.','Some special forms and digitally signed PDFs are not supported.');
  // Hints with links keep their markup and are not rewritten.
  if(!$(e).find('a').length&&text!==$(e).text())$(e).text(text);
 });
 $('.pdf-task-steps').remove();
 if(steps.length)$('.tool-heading').append('<ol class="pdf-task-steps" aria-label="Tool steps">'+steps.map(x=>`<li>${x}</li>`).join('')+'</ol>');
 if(['watermark-pdf','page-numbers'].includes(slug)&&!$('#advanced-settings').length){
  $('.pdf-edit-settings').append('<details id="advanced-settings" class="wide pdf-more-options"><summary>More options</summary><div class="pdf-extra-fields"></div></details>');
  for(const id of ['margin','font-size','color',...(slug==='watermark-pdf'?['opacity','angle']:[])])$('#'+id).closest('label').appendTo('.pdf-extra-fields');
 }
 if(slug==='pdf-to-jpg'){
  $('button[type=submit]').text('Convert to JPG');
  $('#scale').closest('label').contents().filter((_,n)=>n.type==='text').each((_,n)=>{n.data='Image quality';});
  $('#scale option').each((_,e)=>{$(e).text($(e).attr('value')==='1'?'Standard — smaller images':'Sharper — larger images');});
  $('.help ol li').each((_,e)=>{const t=$(e).text();if(/download/i.test(t))$(e).text('Select Convert to JPG, then download the ZIP when your images are ready.');});
 }
 await writeFile(file,$.html());
}
console.log(`Simple PDF workflow applied to ${Object.keys(tools).length} pages.`);
