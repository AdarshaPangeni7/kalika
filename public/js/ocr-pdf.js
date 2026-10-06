import {assertCanvasExport} from './canvas-safety.js';
import {createOcrEngine} from './ocr-engine.js';

const $ = id => document.getElementById(id);
const languages = new Set(['eng', 'fra', 'spa', 'hin', 'nep+eng', 'chi_sim']);
let busy = false, controller, worker, pdfTask, pdf, downloads = [], pdfBytes, basename = 'document', libraryPromise;

function loadScript(src, name) {
  if (window[name]) return Promise.resolve(window[name]);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(window[name]);
    script.onerror = () => {script.remove(); reject(Error('A local processing library could not load. Check your connection and retry.'));};
    document.head.append(script);
  });
}
function pdfLibrary() {
  if (!libraryPromise) libraryPromise = loadScript('/js/vendor/pdf/pdf-lib.min.js', 'PDFLib').catch(error => {libraryPromise = null; throw error;});
  return libraryPromise;
}
function setBusy(value) {
  busy = value;
  $('tool-form').setAttribute('aria-busy', String(value));
  for (const element of $('tool-form').querySelectorAll('input,select,button')) element.disabled = value;
  $('cancel').disabled = !value;
  $('copy-text').disabled = value || !$('text-output').value.trim();
  $('text-output').readOnly = value;
}
function revokeDownloads() {downloads.forEach(URL.revokeObjectURL); downloads = []; $('result').replaceChildren();}
function clearOutput() {revokeDownloads(); pdfBytes = null; $('text-output').value = ''; $('copy-text').disabled = true; $('progress').value = 0;}
function downloadLink(bytes, type, filename, label) {
  const url = URL.createObjectURL(new Blob([bytes], {type})); downloads.push(url);
  const link = document.createElement('a'); link.href = url; link.download = filename; link.className = 'button'; link.textContent = label;
  $('result').append(link);
  return link;
}
function updateTextDownload() {
  const old = $('result').querySelector('[data-text-download]');
  if (old) {URL.revokeObjectURL(old.href); downloads = downloads.filter(url => url !== old.href); old.remove();}
  if ($('text-output').value.trim()) {
    const link = downloadLink($('text-output').value, 'text/plain;charset=utf-8', basename + '-ocr.txt', 'Download text file');
    link.dataset.textDownload = ''; $('result').prepend(link);
  }
  $('copy-text').disabled = busy || !$('text-output').value.trim();
}
function updateDownloads() {
  revokeDownloads(); updateTextDownload();
  if (pdfBytes) downloadLink(pdfBytes, 'application/pdf', basename + '-searchable.pdf', 'Download searchable PDF');
}
function checkCancelled() {if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');}
function limited(operation, timeout = 120000) {
  const signal = controller.signal;
  return new Promise((resolve, reject) => {
    const abort = () => {clean(); reject(new DOMException('Cancelled', 'AbortError'));};
    const timer = setTimeout(() => {clean(); reject(Error('This step took too long. Cancelled safely; try one smaller page or image.'));}, timeout);
    const clean = () => {clearTimeout(timer); signal.removeEventListener('abort', abort);};
    signal.addEventListener('abort', abort, {once: true});
    Promise.resolve(operation).then(value => {clean(); resolve(value);}, error => {clean(); reject(error);});
    if (signal.aborted) {clean(); abort();}
  });
}
function selectedPages(value, count) {
  if (!value.trim()) {if (count > 10) throw Error('This PDF has more than 10 pages. Enter a range of up to 10 pages to recognize.'); return Array.from({length: count}, (_, i) => i + 1);}
  const pages = [];
  for (const item of value.split(',')) {
    const match = item.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw Error('Enter PDF page numbers such as 1-3, 5.');
    const start = Number(match[1]), end = Number(match[2] || match[1]);
    if (start < 1 || end < start || end > count || end - start >= 10) throw Error('Choose existing PDF pages in ascending ranges, up to 10 pages total.');
    for (let n = start; n <= end; n++) {if (pages.includes(n)) throw Error('Do not select the same page twice.'); pages.push(n); if (pages.length > 10) throw Error('Recognize up to 10 pages at a time.');}
  }
  return pages;
}
async function canvasForImage(file) {
  const url = URL.createObjectURL(file), image = new Image(); image.src = url;
  try {
    await limited(image.decode(), 30000); checkCancelled();
    const width = image.naturalWidth, height = image.naturalHeight;
    if (!width || !height || width * height > 24000000) throw Error('Choose an image up to 24 megapixels.');
    const scale = Math.min(1, 2200 / Math.max(width, height)), canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  } catch (error) {if (error.name === 'EncodingError') throw Error('This image could not be read. Choose a JPG, PNG or WebP file.'); throw error;}
  finally {URL.revokeObjectURL(url);}
}
async function canvasForPage(number) {
  const page = await pdf.getPage(number), natural = page.getViewport({scale: 1});
  if (!Number.isFinite(natural.width + natural.height) || natural.width <= 0 || natural.height <= 0) throw Error('This PDF has an unsupported page size.');
  const viewport = page.getViewport({scale: Math.min(2.2, 2200 / Math.max(natural.width, natural.height))}), canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(viewport.width)); canvas.height = Math.max(1, Math.ceil(viewport.height));
  try {await limited(page.render({canvasContext: canvas.getContext('2d'), viewport, background: '#fff'}).promise); checkCancelled(); return canvas;}
  catch (error) {canvas.width = canvas.height = 1; throw error;}
  finally {page.cleanup();}
}
function imageBytes(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob(async blob => {
    try {if (!blob) throw Error('Cannot read the image pixels in this browser.'); resolve(new Uint8Array(await blob.arrayBuffer()));} catch (error) {reject(error);}
  }, 'image/png'));
}

$('tool-form').addEventListener('submit', async event => {
  event.preventDefault(); if (busy) return;
  clearOutput(); $('error').textContent = ''; $('status').textContent = '';
  const file = $('file').files[0], language = $('language').value, makePdf = $('searchable-pdf').checked;
  if (!file || !file.size) {$('error').textContent = 'Choose one scanned PDF or a JPG, PNG or WebP image.'; return;}
  const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
  if (file.size > (isPdf ? 30 : 20) * 1024 * 1024) {$('error').textContent = isPdf ? 'Choose a PDF up to 30 MB.' : 'Choose an image up to 20 MB.'; return;}
  if (!isPdf && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {$('error').textContent = 'Choose a PDF, JPG, PNG or WebP file.'; return;}
  if (!languages.has(language)) {$('error').textContent = 'Choose a supported recognition language.'; return;}
  controller = new AbortController(); const runController = controller; setBusy(true);
  basename = file.name.replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}_-]/gu, '-').slice(0, 60) || 'document';
  let imageCanvas, current = 0, total = 1;
  try {
    if (!window.Worker || !window.WebAssembly) throw Error('This browser does not support on-device OCR. Use a current browser with WebAssembly enabled.');
    $('status').textContent = 'Checking local image processing…'; await limited(assertCanvasExport()); checkCancelled();
    let pageNumbers = [1];
    if (isPdf) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!new TextDecoder().decode(bytes.slice(0, 1024)).includes('%PDF-')) throw Error('This is not a readable PDF.');
      const reader = await import('/js/vendor/pdf/pdf.min.mjs'); reader.GlobalWorkerOptions.workerSrc = '/js/vendor/pdf/pdf.worker.min.mjs';
      pdfTask = reader.getDocument({data: bytes, isEvalSupported: false, isOffscreenCanvasSupported: false, isImageDecoderSupported: false, cMapUrl: '/js/vendor/pdf/cmaps/', cMapPacked: true, standardFontDataUrl: '/js/vendor/pdf/standard_fonts/', wasmUrl: '/js/vendor/pdf/wasm/'});
      pdf = await limited(pdfTask.promise, 30000); checkCancelled();
      if (pdf.numPages > 100) throw Error('Choose a PDF up to 100 pages, then recognize up to 10 selected pages.');
      pageNumbers = selectedPages($('page-range').value, pdf.numPages);
    } else {imageCanvas = await canvasForImage(file);}
    total = pageNumbers.length;
    $('status').textContent = 'Loading the OCR engine and selected language files from Kalika. Your file is not uploaded…';
    const initializing = createOcrEngine(language, runController.signal, message => {
        if (runController.signal.aborted) return;
        if (message.status === 'recognizing text') {
          const progress = Math.max(0, Math.min(1, message.progress || 0));
          $('progress').value = ((current + progress) / total) * 100;
          $('status').textContent = `Recognizing page ${current + 1} of ${total} · ${Math.round(progress * 100)}%…`;
        }
    });
    worker = await limited(initializing); checkCancelled();
    let output, PDFDocument;
    if (makePdf) {({PDFDocument} = await limited(pdfLibrary(), 30000)); output = await PDFDocument.create();}
    const parts = []; let characters = 0, recognized = 0, accumulatedPdfBytes = 0;
    for (current = 0; current < total; current++) {
      checkCancelled(); const number = pageNumbers[current];
      $('status').textContent = `Preparing page ${current + 1} of ${total}…`;
      const canvas = imageCanvas || await canvasForPage(number);
      try {
        const pixels = await limited(imageBytes(canvas), 30000); checkCancelled();
        const {data} = await limited(worker.recognize(pixels, {pdfTitle: 'Kalika OCR', pdfTextOnly: false}, {text: true, pdf: makePdf})); checkCancelled();
        const text = (data.text || '').trim(); characters += text.length;
        if (characters > 2000000) throw Error('The recognized text is too large. Try fewer pages.');
        if (text) recognized++;
        parts.push(`--- ${isPdf ? 'Page ' + number : 'Image'} ---\n${text || '[No text recognized; review the original image]'}`);
        if (makePdf) {
          if (!data.pdf?.length) throw Error('A searchable PDF could not be created. Try again with searchable PDF unchecked.');
          accumulatedPdfBytes += data.pdf.length;
          if (accumulatedPdfBytes > 30 * 1024 * 1024) throw Error('The searchable output is too large. Try fewer pages or text-only output.');
          const single = await PDFDocument.load(data.pdf), pages = await output.copyPages(single, single.getPageIndices()); pages.forEach(p => output.addPage(p));
        }
      } finally {canvas.width = canvas.height = 1; imageCanvas = null;}
      $('progress').value = ((current + 1) / total) * 100;
    }
    if (output && recognized > 0) {pdfBytes = await limited(output.save()); if (pdfBytes.length > 30 * 1024 * 1024) throw Error('The searchable PDF is larger than 30 MB. Try fewer pages.');}
    checkCancelled(); $('text-output').value = parts.join('\n\n'); updateDownloads();
    $('status').textContent = `Finished ${total} ${total === 1 ? 'page' : 'pages'}; text recognized on ${recognized}. Review spelling, numbers and reading order before using the result.${recognized === 0 ? ' Try a sharper image or a different recognition language.' : ''}`;
  } catch (error) {
    clearOutput();
    if (runController.signal.aborted || error.name === 'AbortError') $('status').textContent = 'OCR cancelled. No partial result is offered.';
    else {$('error').textContent = error.name === 'PasswordException' ? 'This PDF needs a password. Choose an unlocked copy.' : error.name === 'InvalidPDFException' ? 'This PDF is damaged or unsupported.' : error.message || 'OCR failed. Try one smaller page.'; $('status').textContent = 'OCR stopped. Your original file is unchanged.';}
  } finally {
    runController.abort(); if (imageCanvas) imageCanvas.width = imageCanvas.height = 1;
    if (worker) await worker.terminate().catch(() => {}); worker = null;
    if (pdf) await pdf.loadingTask.destroy().catch(() => {}); else if (pdfTask) await pdfTask.destroy().catch(() => {}); pdf = pdfTask = null;
    setBusy(false);
  }
});
$('cancel').onclick = () => {controller?.abort(); $('status').textContent = 'Stopping OCR…';};
$('clear-text').onclick = () => {clearOutput(); $('tool-form').reset(); $('page-range-field').hidden = true; $('error').textContent = ''; $('status').textContent = 'Document and recognized text cleared from this tool.';};
$('file').onchange = () => {clearOutput(); $('error').textContent = ''; $('status').textContent = ''; $('page-range-field').hidden = !(/\.pdf$/i.test($('file').files[0]?.name || '') || $('file').files[0]?.type === 'application/pdf');};
$('language').onchange = clearOutput;
$('searchable-pdf').onchange = clearOutput;
$('page-range').oninput = clearOutput;
$('text-output').oninput = updateTextDownload;
$('copy-text').onclick = async () => {try {await navigator.clipboard.writeText($('text-output').value); $('status').textContent = 'Text copied. Check it against your original.';} catch {$('text-output').focus(); $('text-output').select(); $('status').textContent = 'Text selected; use your browser’s Copy action.';}};
window.addEventListener('pagehide', () => {controller?.abort(); void worker?.terminate(); downloads.forEach(URL.revokeObjectURL);});
