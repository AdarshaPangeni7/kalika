// Suggestions never transfer or persist a document. Users choose the next file themselves.
const suggestions = {
  'merge-pdf': [['compress-pdf', 'Reduce file size'], ['page-numbers', 'Add page numbers']],
  'split-pdf': [['organize-pdf', 'Arrange pages'], ['pdf-to-text', 'Extract text']],
  'compress-pdf': [['fill-sign-pdf', 'Fill & sign'], ['organize-pdf', 'Arrange pages']],
  'document-scanner': [['compress-pdf', 'Reduce file size'], ['fill-sign-pdf', 'Fill & sign']],
  'jpg-to-pdf': [['compress-pdf', 'Reduce file size'], ['page-numbers', 'Add page numbers']],
  'organize-pdf': [['compress-pdf', 'Reduce file size'], ['merge-pdf', 'Combine with another PDF']],
  'rotate-pdf': [['delete-pdf-pages', 'Remove unwanted pages'], ['compress-pdf', 'Reduce file size']],
  'delete-pdf-pages': [['rotate-pdf', 'Rotate pages'], ['compress-pdf', 'Reduce file size']],
  'extract-pdf-pages': [['pdf-to-text', 'Extract text'], ['merge-pdf', 'Combine PDFs']],
  'pdf-to-text': [['space-remover', 'Clean extra spaces'], ['word-counter', 'Count words']],
};
const slug = location.pathname.replace(/\/$/, '').split('/').pop();
const result = document.getElementById('result');
if (result && suggestions[slug]) {
  let panel;
  const observer = new MutationObserver(() => {
    if (!result.querySelector('a[download]')) { panel?.remove(); panel = null; return; }
    if (panel || result.querySelector('a:not([download])')) return;
    if (['document-scanner','jpg-to-pdf'].includes(slug) && !result.querySelector('a[download]').download.endsWith('.pdf')) return;
    const section = document.createElement('div'); section.className = 'pdf-next';
    const heading = document.createElement('h3'); heading.textContent = 'Need another step?'; section.append(heading);
    const hint = document.createElement('p'); hint.textContent = slug === 'pdf-to-text' ? 'Copy or download your text first, then paste it into the next tool.' : 'Download and check this result first. Select the downloaded file in the next tool; nothing transfers automatically.'; section.append(hint);
    for (const [target, label] of suggestions[slug]) { const a = document.createElement('a'); a.href = '/tools/' + target; a.textContent = label; section.append(a); }
    result.after(section); panel = section;
  });
  observer.observe(result, {childList: true, subtree: true});
}
