# Kalika monitoring

The GitHub Actions workflow checks https://kalikatools.com. It cannot deploy or change website content: its repository permission is read-only.

Schedules (UTC): daily 02:17, weekly Monday 03:37, monthly on the first at 04:07. Run any mode manually from Actions > Kalika maintenance checks > Run workflow.

Read the run summary or download its reports artifact (retained for 90 days). Reports are not committed to the deployment branch. Skipped checks are explicitly reported and are not passes.

Weekly competitor research reads the selected public pages in seo-competitors.json, respects robots.txt, and provides evidence-linked draft suggestions. It does not prove competitor rankings or traffic. Add BRAVE_SEARCH_API_KEY to Actions secrets to enable new search candidates; no API key is needed for selected pages. Search candidates require human review and are not automatically crawled or published.

Remaining optional API setup:
- PAGESPEED_API_KEY: Google PageSpeed Insights API key.
- GSC_SERVICE_ACCOUNT_JSON: authorized Google service account credentials with Search Console read access. The default property is https://kalikatools.com/ (including slash). Website ownership verification alone does not authorize this bot.
- BRAVE_SEARCH_API_KEY: optional search discovery key; any provider charges must be approved separately.

The current Search Console API check verifies connectivity and counts performance rows only; it does not yet measure ranking trends or inspect URL indexing. Browser checks detect load-time errors, not every tool operation. Content age comes from Git history, not checkout timestamps.

All suggestions need human review, testing and a separate deployment. Never put credentials in public/ or reports/.

Weekly/all runs also exercise Nepali typing, Preeti ↔ Unicode conversion, copy/download, mobile layout, and device-language selection against the checked-out site. The live uptime/link crawl includes both Nepali tool pages. Run `node scripts/test-preeti-and-language.mjs` locally for the conversion and language regression checks. These functional tests use synthetic text, never visitor data.
