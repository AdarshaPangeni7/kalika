# Kalika Background Maintenance Bot

This folder now includes a read-only GitHub Actions maintenance bot for the live Kalika website.

It observes and reports only. It does not edit site pages, publish changes, change DNS, or collect visitor data.

## What Runs

- Daily: homepage and tool uptime, plus internal broken-link checks.
- Weekly: PageSpeed Insights, Google Search Console, and browser console checks.
- Monthly: content freshness reminders and CDN dependency checks.

Reports are written to `reports/` as Markdown and JSON. The GitHub Action commits those reports back to the repository.

## GitHub Setup

Add these optional repository settings after `kalikatools.com` is live:

- Repository variable `KALIKA_SITE_ORIGIN`: `https://kalikatools.com`
- Repository variable `KALIKA_PERFORMANCE_MIN`: `80`
- Repository secret `PAGESPEED_API_KEY`: Google PageSpeed Insights API key
- Repository variable `GSC_PROPERTY`: the exact Search Console property, usually `sc-domain:kalikatools.com` or `https://kalikatools.com/`
- Repository secret `GSC_SERVICE_ACCOUNT_JSON`: service-account JSON that has read access in Google Search Console

The daily checks work without Google API keys. Weekly Google checks are skipped with a clear report note until those credentials exist.

## Manual Runs

From the repo root:

```bash
npm install
npx playwright install chromium
npm run check:daily
npm run check:weekly
npm run check:monthly
```

For local testing against the private preview:

```bash
KALIKA_SITE_ORIGIN=https://kalika-workbench.adarsha11.chatgpt.site npm run check:daily
```

On Windows PowerShell, if Playwright's downloaded browser is not installed but Chrome is available, weekly console checks can use:

```powershell
$env:KALIKA_CHROME_EXECUTABLE = "C:\Program Files\Google\Chrome\Application\chrome.exe"
npm run check:weekly
```
