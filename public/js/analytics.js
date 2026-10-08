(() => {
  const id = 'G-VLJV7JE2DN';
  const key = 'kalika-analytics-consent';
  let enabled = false;
  let choice;
  try { choice = localStorage.getItem(key); } catch {}
  function start() {
    if (enabled || !['kalikatools.com', 'www.kalikatools.com'].includes(location.hostname)) return;
    enabled = true;
    window['ga-disable-' + id] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    window.gtag('js', new Date());
    window.gtag('config', id, {
      page_location: location.origin + location.pathname,
      page_referrer: referrerOrigin(),
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.append(script);
  }
  const banner = document.createElement('section');
  banner.className = 'analytics-consent';
  banner.setAttribute('aria-label', 'Optional analytics');
  function referrerOrigin() { try { return document.referrer ? new URL(document.referrer).origin : ''; } catch { return ''; } }
  const message=document.createElement('p'),link=document.createElement('a'),actions=document.createElement('div');
  message.textContent='Allow optional analytics to help improve Kalika? Google Analytics measures visits. Your files and tool inputs are not sent. ';
  link.href='/privacy';link.textContent='Privacy policy';message.append(link);
  for(const [value,label] of [['denied','Reject analytics'],['granted','Allow analytics']]){
    const button=document.createElement('button');button.type='button';button.dataset.choice=value;button.textContent=label;actions.append(button);
  }
  banner.append(message,actions);
  // Visitors may opt in from the footer; do not interrupt tool use with a popup.
  banner.hidden = true;
  document.body.append(banner);
  banner.addEventListener('click', event => {
    const value = event.target.dataset.choice;
    if (!['granted','denied'].includes(value)) return;
    try { localStorage.setItem(key, value); } catch {}
    banner.hidden = true;
    if (value === 'granted') start();
    else {
      window['ga-disable-' + id] = true;
      if(enabled) window.gtag('consent', 'update', { analytics_storage: 'denied' });
      document.cookie.split(';').forEach(cookie => {
        const name = cookie.split('=')[0].trim();
        if (!name.startsWith('_ga')) return;
        ['', ';domain=' + location.hostname, ';domain=.kalikatools.com'].forEach(domain => {
          document.cookie = name + '=;Max-Age=0;path=/' + domain;
        });
      });
      if(enabled) location.reload();
    }
  });
  const settings = document.createElement('button');
  settings.type = 'button';
  settings.className = 'analytics-settings';
  settings.textContent = 'Privacy choices';
  // Fully localized consent UI on the Serbian tool; consent behavior is unchanged.
  function localizeConsent() {
    const lang = document.documentElement.lang;
    if (!lang.startsWith('sr')) return;
    const cyr = lang === 'sr-Cyrl';
    banner.setAttribute('aria-label', cyr ? 'Опциона аналитика' : 'Opciona analitika');
    message.firstChild.textContent = cyr
      ? 'Дозволити опциону аналитику за побољшање Калике? Google Analytics мери посете. Ваше датотеке и уноси у алате се не шаљу. '
      : 'Dozvoliti opcionu analitiku za poboljšanje Kalike? Google Analytics meri posete. Vaše datoteke i unosi u alate se ne šalju. ';
    link.textContent = cyr ? 'Политика приватности (English)' : 'Politika privatnosti (English)';
    const labels = cyr ? ['Одбиј аналитику', 'Дозволи аналитику'] : ['Odbij analitiku', 'Dozvoli analitiku'];
    actions.querySelectorAll('button').forEach((button, i) => { button.textContent = labels[i]; });
    settings.textContent = cyr ? 'Избор приватности' : 'Izbor privatnosti';
  }
  localizeConsent();
  if (document.documentElement.lang.startsWith('sr')) new MutationObserver(localizeConsent).observe(document.documentElement, {attributes:true,attributeFilter:['lang']});
  settings.addEventListener('click', () => { banner.hidden = false; banner.querySelector('button').focus(); });
  (document.querySelector('footer nav') || document.body).append(settings);
  if (choice === 'granted') start();
})();
