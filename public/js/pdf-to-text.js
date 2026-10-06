const $ = id => document.getElementById(id);
let task, documentPdf, cancelled = false, busy = false, downloadUrl;
function clearOutput() {
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  downloadUrl = null;
  $('text-output').value = '';
  $('result').replaceChildren();
  $('copy-text').disabled = true;
}
function setBusy(value) {
  busy = value;
  $('tool-form').setAttribute('aria-busy', String(value));
  $('file').disabled = value;
  $('extract-text').disabled = value;
  $('cancel').disabled = !value;
  $('clear-text').disabled = value;
}
$('tool-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  clearOutput();
  $('error').textContent = '';
  $('status').textContent = '';
  const file = $('file').files[0];
  if (!file || !file.size || file.size > 30 * 1024 * 1024) {
    $('error').textContent = 'Choose a nonempty PDF up to 30 MB.';
    return;
  }
  setBusy(true);
  cancelled = false;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!new TextDecoder().decode(bytes.slice(0, 1024)).includes('%PDF-')) throw Error('This is not a readable PDF.');
    $('status').textContent = 'Loading the PDF reader locally…';
    const pdfjs = await import('/js/vendor/pdf/pdf.min.mjs');
    if (cancelled) return;
    pdfjs.GlobalWorkerOptions.workerSrc = '/js/vendor/pdf/pdf.worker.min.mjs';
    task = pdfjs.getDocument({data: bytes, isEvalSupported: false, cMapUrl: '/js/vendor/pdf/cmaps/', cMapPacked: true, standardFontDataUrl: '/js/vendor/pdf/standard_fonts/', wasmUrl: '/js/vendor/pdf/wasm/'});
    documentPdf = await task.promise;
    if (cancelled) return;
    if (documentPdf.numPages > 200) throw Error('Choose a PDF with no more than 200 pages.');
    const parts = [], empty = [];
    let characters = 0;
    for (let i = 1; i <= documentPdf.numPages; i++) {
      if (cancelled) return;
      $('status').textContent = `Reading page ${i} of ${documentPdf.numPages}…`;
      const page = await documentPdf.getPage(i);
      const content = await page.getTextContent();
      let text = '';
      for (const item of content.items) {
        if (typeof item.str !== 'string') continue;
        text += item.str + (item.hasEOL ? '\n' : ' ');
        characters += item.str.length + 1;
        if (characters > 5000000) throw Error('The extracted text is too large. Split this PDF into smaller files first.');
      }
      text = text.replace(/[ \t]+\n/g, '\n').trim();
      if (!text) empty.push(i);
      parts.push(`--- Page ${i} ---\n${text || '[No selectable text on this page]'}`);
      page.cleanup();
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    if (cancelled) return;
    if (empty.length === documentPdf.numPages) {
      $('status').textContent = 'No selectable text found. This PDF may contain scanned images or outlined letters. It needs OCR, which this tool does not perform.';
      const link = document.createElement('a'); link.href = '/tools/ocr-pdf'; link.textContent = 'Recognize this scan with Private OCR'; $('status').append(' ', link);
      return;
    }
    $('text-output').value = parts.join('\n\n');
    downloadUrl = URL.createObjectURL(new Blob([$ ('text-output').value], {type: 'text/plain;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = file.name.replace(/\.pdf$/i, '').replace(/[^\p{L}\p{N}_-]/gu, '-').slice(0, 60) + '.txt';
    link.className = 'button';
    link.textContent = 'Download text file';
    $('result').append(link);
    $('copy-text').disabled = false;
    $('status').textContent = `Text extracted from ${documentPdf.numPages - empty.length} of ${documentPdf.numPages} pages. Review reading order and spacing.${empty.length ? ` Pages without text: ${empty.join(', ')}.` : ''}`;
  } catch (error) {
    if (!cancelled) $('error').textContent = error.name === 'PasswordException' ? 'This PDF needs a password. Choose an unlocked copy.' : error.name === 'InvalidPDFException' ? 'This PDF is damaged or unsupported. Try a different file.' : error.message || 'Text extraction failed. Try a smaller PDF.';
  } finally {
    if (documentPdf) await documentPdf.loadingTask.destroy().catch(() => {});
    else if (task) await task.destroy().catch(() => {});
    task = documentPdf = null;
    if (cancelled) { clearOutput(); $('status').textContent = 'Extraction cancelled. Choose a file to try again.'; }
    setBusy(false);
  }
});
$('cancel').onclick = () => { cancelled = true; $('status').textContent = 'Cancelling…'; if (task) void task.destroy().catch(() => {}); };
$('clear-text').onclick = () => { clearOutput(); $('tool-form').reset(); $('error').textContent = ''; $('status').textContent = 'Document and extracted text cleared from this tool.'; };
$('file').onchange = () => { clearOutput(); $('error').textContent = ''; $('status').textContent = ''; };
$('copy-text').onclick = async () => {
  try { await navigator.clipboard.writeText($('text-output').value); $('status').textContent = 'Text copied. Review it before using it.'; }
  catch { $('text-output').focus(); $('text-output').select(); $('status').textContent = 'Clipboard access is unavailable. The text is selected; use your browser’s Copy action.'; }
};
