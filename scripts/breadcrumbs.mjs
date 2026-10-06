export function setBreadcrumb($, items, container = 'main') {
  const target = $(container).first();
  target.find('nav[aria-label="Breadcrumb"]').remove();
  if (container === '.article') target.children('p').filter((i,e) => $(e).text().trim() === 'All guides' && $(e).find('a[href="/guides/"]').length === 1).remove();
  const nav = $('<nav class="breadcrumb" aria-label="Breadcrumb"></nav>');
  items.forEach((item, i) => {
    if (i) nav.append(' ').append($('<span aria-hidden="true">›</span>')).append(' ');
    if (i === items.length - 1) nav.append($('<span aria-current="page"></span>').text(item.name));
    else nav.append($('<a></a>').attr('href', item.path).text(item.name));
  });
  target.prepend(nav);
  if (!$('link[href="/breadcrumbs.css"]').length) $('head').append('<link rel="stylesheet" href="/breadcrumbs.css">');
  $('script[data-breadcrumb-schema]').remove();
  const schema = {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:items.map((item,i)=>({'@type':'ListItem',position:i+1,name:item.name,item:new URL(item.path,'https://kalikatools.com').href}))};
  $('head').append($('<script type="application/ld+json" data-breadcrumb-schema></script>').text(JSON.stringify(schema)));
}
