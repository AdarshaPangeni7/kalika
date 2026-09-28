const search = document.getElementById('pdf-search');
const cards = [...document.querySelectorAll('[data-pdf-card]')];
search.addEventListener('input', () => {
  const terms = search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
  let count = 0;
  for (const card of cards) {
    card.hidden = !terms.every(term => card.textContent.toLowerCase().includes(term));
    if (!card.hidden) count++;
  }
  for (const group of document.querySelectorAll('[data-pdf-group]')) group.hidden = !group.querySelector('[data-pdf-card]:not([hidden])');
  document.getElementById('search-status').textContent = `${count} ${count === 1 ? 'tool' : 'tools'} found.`;
  document.getElementById('no-tools').hidden = count > 0;
});
