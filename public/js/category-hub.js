const search = document.getElementById('hub-search');
const cards = [...document.querySelectorAll('[data-hub-card]')];
const groups = [...document.querySelectorAll('[data-hub-group]')];
const clear = document.getElementById('hub-clear');
const normalize = text => text.toLocaleLowerCase('en').replace(/(\d)\s*kb/g, '$1kb').replace(/\s+/g, ' ').trim();
function filter() {
  const terms = normalize(search.value).split(' ').filter(Boolean); let count = 0;
  for (const card of cards) {
    const text = normalize(card.textContent + ' ' + (card.dataset.searchTags || ''));
    card.hidden = !terms.every(term => text.includes(term));
    if (!card.hidden) count++;
  }
  groups.forEach(group => {group.hidden = !group.querySelector('[data-hub-card]:not([hidden])');});
  document.getElementById('hub-status').textContent = `${count} ${count === 1 ? 'tool' : 'tools'} ${terms.length ? 'found' : 'available'}.`;
  document.getElementById('hub-empty').hidden = count > 0;
  clear.hidden = !search.value;
}
search.addEventListener('input', filter);
clear.addEventListener('click', () => {search.value = ''; filter(); search.focus();});
filter();
