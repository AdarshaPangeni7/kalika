import { load } from 'cheerio';
import robotsParser from 'robots-parser';
import { readFile, mkdir, writeFile } from 'node:fs/promises';

const targets = JSON.parse(await readFile('seo-competitors.json', 'utf8'));
const agent = 'KalikaSeoReviewBot';
const report = ['# Kalika competitor SEO review', `Checked: ${new Date().toISOString()}`, 'Draft suggestions only. No website changes are applied. Page comparisons do not establish rankings, traffic, search volume or keyword difficulty.'];
const robots = new Map();
async function get(url) {
  const response = await fetch(url, { headers: { 'user-agent': `${agent}/1.0 (+https://kalikatools.com/contact)` }, signal: AbortSignal.timeout(15000), redirect: 'error' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}
export function inspect(html) {
  const $ = load(html);
  const title = $('title').text().trim();
  const description = $('meta[name="description"]').attr('content') || '';
  const headings = $('h1,h2,h3,summary').map((_,e)=>$(e).text().trim()).get();
  return { title, description, headings, canonical: $('link[rel="canonical"]').attr('href') || '', h1: $('h1').length };
}
const safe = value => String(value).replace(/[\r\n|<>]/g,' ').replace(/[\[\]`]/g,'').slice(0,170);
for (const target of targets) {
  const own = inspect(await readFile(`public${target.route}.html`, 'utf8'));
  report.push(`\n## ${safe(target.keyword)}`, `Kalika page: https://kalikatools.com${target.route}`);
  let urls = target.urls;
  if (process.env.BRAVE_SEARCH_API_KEY) {
    try {
      const endpoint = new URL('https://api.search.brave.com/res/v1/web/search');
      endpoint.searchParams.set('q', target.keyword); endpoint.searchParams.set('count','3');
      const response = await fetch(endpoint,{headers:{'X-Subscription-Token':process.env.BRAVE_SEARCH_API_KEY},signal:AbortSignal.timeout(15000)});
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      // Discovery is reported for review; only the selected hosts are fetched.
      for(const item of data.web?.results || []) {
        const u=new URL(item.url);
        if(u.protocol==='https:') report.push(`- Search candidate for human review: ${u.href.replace(/[\r\n]/g,'')}`);
      }
    } catch { report.push('- Search discovery unavailable; selected competitors are still checked.'); }
  }
  for (const address of urls) {
    try {
      const u = new URL(address);
      if (u.protocol !== 'https:') throw new Error('Only HTTPS competitors are supported');
      if (!robots.has(u.origin)) {
        try { robots.set(u.origin, robotsParser(`${u.origin}/robots.txt`,await get(`${u.origin}/robots.txt`))); }
        catch { robots.set(u.origin,null); }
      }
      const rules=robots.get(u.origin);
      if (!rules || rules.isAllowed(address,agent) === false) throw new Error('robots policy unavailable or disallows this page; skipped');
      const delay=rules.getCrawlDelay(agent) || 1;
      if(delay>10) throw new Error('crawl delay exceeds this lightweight check; skipped');
      await new Promise(r=>setTimeout(r, Math.max(1,delay)*1000));
      const other=inspect(await get(address));
      report.push(`- Source: ${address}`, `  - Title length: ${other.title.length}; description length: ${other.description.length}; H1 count: ${other.h1}; headings: ${other.headings.length}; canonical: ${other.canonical ? 'present':'missing'}.`);
      const topics=other.headings.filter(h=>h.length>12 && !own.headings.some(o=>o.toLowerCase()===h.toLowerCase())).slice(0,3);
      if(topics.length) report.push(`  - Topics to evaluate, not copy: ${topics.map(safe).join('; ')}. Verify relevance and actual tool support before drafting original content.`);
    } catch(e) { report.push(`- ${address}: ${safe(e.message)}. No comparison claimed.`); }
  }
  report.push(`- Human review: ensure “${safe(target.keyword)}” fits the title and opening explanation naturally. Current title: ${safe(own.title)}. Keep claims consistent with the tool; do not imitate competitors' unsupported features.`);
}
if(!process.env.BRAVE_SEARCH_API_KEY) report.push('\nNew competitor discovery is not enabled: add BRAVE_SEARCH_API_KEY as a GitHub Actions secret. Selected competitor checks need no search key.');
report.push('\n## Suggested fixes — human approval required\nReview the source evidence and draft original, useful explanations or FAQs. Test any approved changes before deployment. This bot has no deployment credentials and never edits public/.');
await mkdir('reports',{recursive:true});
await writeFile('reports/competitor-seo.md', report.join('\n')+'\n');
console.log('Competitor review saved to reports/competitor-seo.md');
