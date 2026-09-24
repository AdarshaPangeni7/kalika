# Kalika monitoring

The GitHub Actions workflow checks https://kalikatools.com. It cannot deploy or change website content: its repository permission is read-only.

Schedules (UTC): daily 02:17, weekly Monday 03:37, monthly on the first at 04:07. Run any mode manually from Actions > Kalika maintenance checks > Run workflow.

Read the run summary or download its reports artifact (retained for 90 days). Reports are not committed to the deployment branch. Skipped checks are explicitly reported and are not passes.

## Weekly Gmail report

The weekly and manually-selected `all` checks can email a plain-text report after the run. It sends when the settings below exist. Missing settings explicitly fail the email step and appear in the run summary; other reports are still saved.

- `KALIKA_REPORT_TO`: the report recipient, for example `cr08320@gmail.com`.
- `SMTP_USER`: the Gmail address that sends the report.
- `SMTP_APP_PASSWORD`: a Gmail app password for that sending address, with spaces removed or included.

Create the app password from the sender's Google Account after enabling 2-Step Verification. It is a separate 16-character password, not the account's normal password. Add SMTP_APP_PASSWORD under repository Settings > Secrets and variables > Actions > New repository secret. KALIKA_REPORT_TO and SMTP_USER can be Actions variables or secrets (secrets take precedence). The value is never written into the source files, reports, workflow logs, or public site. Change or revoke the Gmail app password in Google Account settings if this sender should no longer have access.

The email contains the site report, competitor review, individual check outcomes, and a link to the workflow logs. Failed, skipped and unreported checks are explicitly distinguished from passes. It does not include visitor data and never edits or deploys the website. Run `node scripts/test-email-weekly-report.mjs` locally to test report assembly without sending any email.

Weekly competitor research reads the selected public pages in seo-competitors.json, respects robots.txt, and provides evidence-linked draft suggestions. It does not prove competitor rankings or traffic. Add BRAVE_SEARCH_API_KEY to Actions secrets to enable new search candidates; no API key is needed for selected pages. Search candidates require human review and are not automatically crawled or published.

Remaining optional API setup:
- PAGESPEED_API_KEY: Google PageSpeed Insights API key.
- GSC_SERVICE_ACCOUNT_JSON: authorized Google service account credentials with Search Console read access. The default property is https://kalikatools.com/ (including slash). Website ownership verification alone does not authorize this bot.
- BRAVE_SEARCH_API_KEY: optional search discovery key; any provider charges must be approved separately.

The current Search Console API check verifies connectivity and counts performance rows only; it does not yet measure ranking trends or inspect URL indexing. Browser checks detect load-time errors, not every tool operation. Content age comes from Git history, not checkout timestamps.

All suggestions need human review, testing and a separate deployment. Never put credentials in public/ or reports/.

Weekly/all runs also exercise Nepali typing, Preeti ↔ Unicode conversion, copy/download, mobile layout, and device-language selection against the checked-out site. The live uptime/link crawl includes both Nepali tool pages. Run `node scripts/test-preeti-and-language.mjs` locally for the conversion and language regression checks. These functional tests use synthetic text, never visitor data.

Weekly/all runs also test Document Scanner and JPG-to-PDF on the live site using synthetic document photos. Checks cover detection, perspective correction, crop handles, filters, rotation, page ordering, real downloads and mobile layouts. The scanner result is included in email check outcomes when email delivery is configured.
