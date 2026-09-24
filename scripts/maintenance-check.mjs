import { chromium } from "playwright";
import { createSign } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const publicDir = path.join(root, "public");
const reportsDir = path.join(root, "reports");
const mode = getMode();
const origin = normalizeOrigin(process.env.KALIKA_SITE_ORIGIN || "https://kalikatools.com");
const performanceMinimum = Number(process.env.KALIKA_PERFORMANCE_MIN || 80);
const today = new Date().toISOString().slice(0, 10);
const reportBase = `kalika-site-check-${today}-${mode}`;

const routes = [
  "/",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/tools/case-converter",
  "/tools/space-remover",
  "/tools/duplicate-line-remover",
  "/tools/text-reverser",
  "/tools/find-replace",
  "/tools/text-to-slug",
  "/tools/lorem-ipsum-generator",
  "/tools/gpa-calculator",
  "/tools/percentage-calculator",
  "/tools/scientific-calculator",
  "/tools/fraction-calculator",
  "/tools/work-hours-calculator",
  "/tools/tip-calculator",
  "/tools/simple-calculator",
  "/tools/grade-calculator",
  "/tools/bs-ad-converter",
  "/tools/date-difference",
  "/tools/exam-countdown",
  "/tools/image-compressor",
  "/tools/image-resizer",
  "/tools/merge-pdf",
  "/tools/organize-pdf",
  "/tools/fill-sign-pdf",
  "/tools/crop-pdf",
  "/tools/page-numbers",
  "/tools/watermark-pdf",
  "/tools/split-pdf",
  "/tools/compress-pdf",
  "/tools/pdf-to-jpg",
  "/tools/jpg-to-pdf",
  "/tools/document-scanner",
  "/tools/emi-calculator",
  "/tools/unit-converter",
  "/tools/age-calculator",
  "/tools/word-counter",
  "/tools/nepali-typing",
  "/tools/preeti-unicode-converter",
  "/tools/qr-generator",
  "/tools/currency-converter",
  "/guides/",
  "/guides/reduce-image-size-for-email",
  "/guides/jpg-png-webp"
];

const toolRoutes = routes.filter((route) => route.startsWith("/tools/"));
const checks = [];
const needsAttention = [];
const worthReviewing = [];
const allClear = [];
const suggestedFixes = [];

await mkdir(reportsDir, { recursive: true });

if (["daily", "all"].includes(mode)) {
  await checkUptime();
  await checkBrokenLinks();
}

if (["weekly", "all"].includes(mode)) {
  await checkSeoBaseline();
  await checkPageSpeed();
  try { await checkSearchConsole(); } catch { worthReviewing.push('Search Console check failed; verify service-account credentials and API access.'); }
  await checkConsoleErrors();
}

if (["monthly", "all"].includes(mode)) {
  await checkContentFreshness();
  await checkCdnDependencies();
}

const summary = {
  date: today,
  mode,
  origin,
  needsAttention,
  worthReviewing,
  allClear,
  suggestedFixes,
  checks
};

const markdown = renderReport(summary);
await writeFile(path.join(reportsDir, `${reportBase}.md`), markdown);
await writeFile(path.join(reportsDir, "latest.md"), markdown);
await writeFile(path.join(reportsDir, `${reportBase}.json`), `${JSON.stringify(summary, null, 2)}\n`);
await writeFile(path.join(reportsDir, "latest.json"), `${JSON.stringify(summary, null, 2)}\n`);

if (needsAttention.length > 0) {
  process.exitCode = 1;
}

async function checkUptime() {
  const failures = [];
  for (const route of ["/", ...toolRoutes]) {
    const result = await fetchStatus(urlFor(route));
    checks.push({ name: "uptime", route, status: result.status, ok: result.ok, error: result.error });
    if (!result.ok) {
      failures.push(`${route}: ${result.status || result.error}`);
      needsAttention.push(`${route}: returned ${result.status || result.error} during uptime check`);
      suggestedFixes.push(`${route}: confirm the page exists on the live host and that redirects are configured for the clean URL.`);
    }
  }
  if (failures.length === 0) allClear.push(`Homepage and all ${toolRoutes.length} tool pages returned 200.`);
}

async function checkBrokenLinks() {
  const broken = [];
  const skipped = [];
  const visited = new Map();
  for (const route of routes) {
    const html = await fetchText(urlFor(route));
    if (!html.ok) {
      skipped.push(`${route}: ${html.status || html.error}`);
      continue;
    }
    for (const href of getInternalLinks(html.text, route)) {
      if (!visited.has(href)) {
        const result = await fetchStatus(urlFor(href), "HEAD");
        visited.set(href, result.status === 405 ? await fetchStatus(urlFor(href), "GET") : result);
      }
      const retry = visited.get(href);
      checks.push({ name: "link", source: route, target: href, status: retry.status, ok: retry.ok });
      if (!retry.ok) {
        broken.push(`${route} -> ${href}: ${retry.status || retry.error}`);
        needsAttention.push(`${route}: internal link check failed for ${href} (${retry.status || retry.error})`);
        suggestedFixes.push(`${route}: investigate ${href}; distinguish DNS/network failure from a missing page before editing the link.`);
      }
    }
  }
  if (broken.length === 0 && skipped.length === 0) {
    allClear.push("Internal navigation, footer, guide, and related-tool links resolved successfully.");
  } else if (skipped.length > 0) {
    worthReviewing.push(`Broken-link crawl skipped ${skipped.length} page(s) that could not be loaded.`);
  }
}

async function checkPageSpeed() {
  if (!process.env.PAGESPEED_API_KEY) {
    worthReviewing.push("PageSpeed Insights skipped: add PAGESPEED_API_KEY in GitHub Secrets after launch.");
    suggestedFixes.push("Add a Google PageSpeed Insights API key as PAGESPEED_API_KEY, then rerun the weekly workflow.");
    return;
  }

  const flagged = [];
  let completed = 0;
  for (const route of ["/", ...toolRoutes]) {
    const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
    endpoint.searchParams.set("url", urlFor(route));
    endpoint.searchParams.set("strategy", "mobile");
    endpoint.searchParams.set("category", "performance");
    endpoint.searchParams.set("key", process.env.PAGESPEED_API_KEY);
    const data = await fetchJson(endpoint);
    if (data.error) {
      worthReviewing.push(`${route}: PageSpeed request failed.`);
      suggestedFixes.push(`${route}: verify the PageSpeed API key and inspect the API response before treating this as a page performance issue.`);
      continue;
    }
    const score = Math.round(((data.value?.lighthouseResult?.categories?.performance?.score ?? 0) * 100));
    completed++;
    checks.push({ name: "pagespeed", route, score, ok: score >= performanceMinimum });
    if (score < performanceMinimum) {
      flagged.push(`${route}: ${score}`);
      worthReviewing.push(`${route}: PageSpeed mobile performance score is ${score}, below ${performanceMinimum}.`);
      suggestedFixes.push(`${route}: review PageSpeed diagnostics for render blocking work, heavy assets, and layout shifts before changing content.`);
    }
  }
  if (flagged.length === 0 && completed === toolRoutes.length + 1) allClear.push(`PageSpeed mobile performance stayed at or above ${performanceMinimum} for the homepage and tool pages.`);
}

async function checkSearchConsole() {
  const property = process.env.GSC_PROPERTY || `${origin}/`;
  const serviceAccount = process.env.GSC_SERVICE_ACCOUNT_JSON;
  if (!serviceAccount) {
    worthReviewing.push("Search Console skipped: add GSC_SERVICE_ACCOUNT_JSON and GSC_PROPERTY after kalikatools.com is verified.");
    suggestedFixes.push("After domain verification, grant the service account access in Google Search Console and save its JSON key as GSC_SERVICE_ACCOUNT_JSON.");
    return;
  }

  const token = await getGoogleAccessToken(JSON.parse(serviceAccount));
  const endDate = today;
  const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`;
  const body = {
    startDate,
    endDate,
    dimensions: ["page"],
    rowLimit: 250
  };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const message = await response.text();
    worthReviewing.push(`Search Console request failed: HTTP ${response.status}.`);
    suggestedFixes.push(`Check GSC_PROPERTY and service-account access. API response: ${message.slice(0, 180)}`);
    return;
  }
  const data = await response.json();
  const rows = data.rows || [];
  checks.push({ name: "search-console", pages: rows.length, ok: true });
  allClear.push(`Search Console connected and returned ${rows.length} page performance rows for the last 28 days.`);
}

async function checkConsoleErrors() {
  let browser;
  const failures = [];
  let skipped = false;
  try {
    const launchOptions = { headless: true };
    if (process.env.KALIKA_CHROME_EXECUTABLE) launchOptions.executablePath = process.env.KALIKA_CHROME_EXECUTABLE;
    browser = await chromium.launch(launchOptions);
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    for (const route of toolRoutes) {
      consoleErrors.length = 0;
      const response = await page.goto(urlFor(route), { waitUntil: "networkidle", timeout: 30000 });
      const status = response?.status();
      const ok = status === 200 && consoleErrors.length === 0;
      checks.push({ name: "console", route, status, errors: [...consoleErrors], ok });
      if (!ok) {
        failures.push(route);
        needsAttention.push(`${route}: browser load found ${consoleErrors.length || "a"} JavaScript error(s).`);
        suggestedFixes.push(`${route}: open the page locally, reproduce the browser console error, and fix the affected tool script.`);
      }
    }
  } catch (error) {
    skipped = true;
    worthReviewing.push(`Console check skipped or failed to start: ${shortError(error.message)}`);
    suggestedFixes.push("Confirm the GitHub Action installed Chromium with Playwright before rerunning the weekly check.");
  } finally {
    if (browser) await browser.close();
  }
  if (failures.length === 0 && !skipped) {
    allClear.push(`All ${toolRoutes.length} tool pages loaded in a headless browser without JavaScript console errors.`);
  }
}

async function checkContentFreshness() {
  const stale = [];
  for (const route of routes.filter((route) => route.startsWith("/tools/") || route.startsWith("/guides/"))) {
    const file = fileForRoute(route);
    const lastEdit = execFileSync('git', ['log', '-1', '--format=%cI', '--', file], {encoding:'utf8'}).trim();
    if (!lastEdit) { worthReviewing.push(`${route}: no Git history to determine content age.`); continue; }
    const ageDays = Math.floor((Date.now() - Date.parse(lastEdit)) / 86400000);
    checks.push({ name: "freshness", route, ageDays, ok: ageDays < 90 });
    if (ageDays >= 90) {
      stale.push(`${route}: ${ageDays} days`);
      worthReviewing.push(`${route}: content has not changed in ${ageDays} days.`);
      suggestedFixes.push(`${route}: review accuracy, examples, FAQ answers, and title/meta fit before making any human-approved refresh.`);
    }
  }
  if (stale.length === 0) allClear.push("Tool and guide pages were edited within the last 90 days.");
}

async function checkCdnDependencies() {
  const urls = new Set();
  for (const filename of await listFiles(path.join(publicDir, "js"))) {
    const text = await readFile(filename, "utf8");
    for (const match of text.matchAll(/https:\/\/cdn\.jsdelivr\.net\/[^'")]+/g)) urls.add(match[0]);
  }
  const failed = [];
  for (const url of urls) {
    const result = await fetchStatus(url, "HEAD");
    const retry = result.status === 405 ? await fetchStatus(url, "GET") : result;
    checks.push({ name: "cdn", url, status: retry.status, ok: retry.ok });
    if (!retry.ok) {
      failed.push(url);
      needsAttention.push(`CDN dependency failed: ${url} (${retry.status || retry.error})`);
      suggestedFixes.push(`Replace or self-host the failed library after testing the affected tool: ${url}`);
    }
  }
  if (failed.length === 0) allClear.push("External CDN dependencies loaded successfully.");
}

function getMode() {
  const arg = process.argv.find((item) => item.startsWith("--mode="));
  const value = arg ? arg.split("=")[1] : "daily";
  if (!["daily", "weekly", "monthly", "all"].includes(value)) {
    throw new Error("Use --mode=daily, weekly, monthly, or all.");
  }
  return value;
}

function normalizeOrigin(value) {
  return value.replace(/\/+$/, "");
}

function urlFor(route) {
  return `${origin}${route}`;
}

function fileForRoute(route) {
  if (route === "/") return path.join(publicDir, "index.html");
  if (route.endsWith("/")) return path.join(publicDir, route, "index.html");
  return path.join(publicDir, `${route}.html`);
}

async function checkSeoBaseline() {
  const issues = [];
  let skipped = 0;
  for (const route of routes) {
    const page = await fetchText(urlFor(route));
    if (!page.ok) {
      skipped++;
      worthReviewing.push(`${route}: SEO check skipped because the page could not be loaded.`);
      continue;
    }
    const seo = parseSeo(page.text);
    const routeIssues = [];
    const isTool = route.startsWith("/tools/");

    if (!seo.title) routeIssues.push("missing title");
    else if (seo.title.length < 50 || seo.title.length > 60) routeIssues.push(`title length ${seo.title.length}, target 50-60`);

    if (!seo.description) routeIssues.push("missing meta description");
    else if (seo.description.length < 140 || seo.description.length > 160) {
      routeIssues.push(`meta description length ${seo.description.length}, target 140-160`);
    }

    if (!seo.canonical) routeIssues.push("missing canonical tag");
    if (seo.h1Count !== 1) routeIssues.push(`${seo.h1Count} H1 tags, target 1`);
    if (isTool && !/WebApplication|SoftwareApplication/.test(seo.schemaText)) {
      routeIssues.push("tool page missing WebApplication or SoftwareApplication schema");
    }
    if (isTool && /Frequently Asked Questions|FAQ/i.test(page.text) && !/FAQPage/.test(seo.schemaText)) {
      routeIssues.push("FAQ section present but FAQPage schema not found");
    }

    checks.push({ name: "seo", route, ...seo, ok: routeIssues.length === 0 });
    for (const issue of routeIssues) issues.push(`${route}: ${issue}`);
  }

  if (issues.length === 0 && skipped === 0) {
    allClear.push("On-page SEO baseline passed for titles, descriptions, canonicals, H1s, and tool schema.");
    return;
  }

  worthReviewing.push(`SEO baseline found ${issues.length} item(s) to review; ${skipped} page(s) could not be checked.`);
  for (const issue of issues.slice(0, 20)) suggestedFixes.push(`${issue}. Review the page in the SEO admin panel before editing.`);
  if (issues.length > 20) suggestedFixes.push(`SEO baseline has ${issues.length - 20} more item(s); open reports/latest.json for the full list.`);
}

async function fetchStatus(url, method = "GET") {
  let last;
  for (let attempt = 0; attempt < 3; attempt++) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { method, redirect: "follow", signal: controller.signal });
    await response.body?.cancel();
    last = { ok: response.status >= 200 && response.status < 300, status: response.status };
    if (response.status < 500 && response.status !== 429) return last;
  } catch (error) {
    last = { ok: false, error: error.name === "AbortError" ? "timeout" : `${error.message} (${error.cause?.code || 'network'})` };
  } finally {
    clearTimeout(timer);
  }
  if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
  }
  return last;
}

async function fetchText(url) {
  let last;
  for (let attempt=0; attempt<3; attempt++) {
  try {
    const response = await fetch(url, {redirect:'follow',signal:AbortSignal.timeout(15000)});
    const text = await response.text();
    last = {ok:response.ok,status:response.status,text:response.ok ? text : ''};
    if(response.status<500 && response.status!==429) return last;
  } catch(error) { last = {ok:false,error:shortError(error.message),text:''}; }
  if(attempt<2) await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)));
  }
  return last;
}

async function fetchJson(url) {
  try {
  const response = await fetch(url, {signal:AbortSignal.timeout(60000)});
  if (!response.ok) {
    return { error: await response.text() };
  }
  return { value: await response.json() };
  } catch { return {error:'API unavailable or timed out'}; }
}

function getInternalLinks(html, route) {
  const links = new Set();
  for (const match of html.matchAll(/\s(?:href|src)=["']([^"'#]+)(?:#[^"']*)?["']/gi)) {
    const raw = match[1];
    if (raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("data:") || raw.startsWith("javascript:")) continue;
    const target = new URL(raw, urlFor(route));
    if (target.origin !== origin) continue;
    let pathname = target.pathname;
    if (pathname.endsWith(".html")) pathname = pathname.slice(0, -5);
    if (pathname === "/index") pathname = "/";
    links.add(pathname || "/");
  }
  return links;
}

function parseSeo(html) {
  return {
    title: firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
    description: firstMatch(html, /<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
      || firstMatch(html, /<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i),
    canonical: firstMatch(html, /<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/i)
      || firstMatch(html, /<link\s+[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["'][^>]*>/i),
    h1Count: (html.match(/<h1\b/gi) || []).length,
    schemaText: [...html.matchAll(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
      .map((match) => match[1])
      .join("\n")
  };
}

function firstMatch(text, pattern) {
  const match = text.match(pattern);
  return match ? decodeHtml(stripTags(match[1]).trim().replace(/\s+/g, " ")) : "";
}

function stripTags(value) {
  return String(value).replace(/<[^>]*>/g, "");
}

function decodeHtml(value) {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(full));
    if (entry.isFile()) files.push(full);
  }
  return files;
}

async function getGoogleAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const signature = signer.sign(serviceAccount.private_key, "base64url");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claim}.${signature}`
    })
  });
  if (!response.ok) throw new Error(`Google auth failed: HTTP ${response.status}`);
  return (await response.json()).access_token;
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function renderReport(data) {
  const lineItems = (items, fallback) => items.length ? items.map((item) => `- ${item}`).join("\n") : `- ${fallback}`;
  return `# Kalika Site Check - ${data.date}

Mode: ${data.mode}
Site checked: ${data.origin}

## Needs attention
${lineItems(data.needsAttention, "Nothing urgent found.")}

## Worth reviewing
${lineItems(data.worthReviewing, "No review-only items found.")}

## All clear
${lineItems(data.allClear, "No passing checks were recorded for this mode.")}

## Suggested fixes (for human review - not applied automatically)
${lineItems(data.suggestedFixes, "No fixes suggested.")}

---

This bot observes and reports only. It does not edit files, deploy the site, change DNS, or collect visitor data.
`;
}

function shortError(message) {
  return String(message).split("\n")[0].slice(0, 180);
}
