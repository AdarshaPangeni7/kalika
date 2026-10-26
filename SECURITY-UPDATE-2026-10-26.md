# Security update — 26 October 2026

Kalika serves static browser tools through a JavaScript Cloudflare Worker. This checkout has no PHP application, Composer dependencies, Apache configuration or PHP runtime to patch. The PHP project's 21 October RCE advisory therefore does not apply to this deployment. This does not assess unrelated hosting accounts or nrtreks.com.

Live checks: all 72 sitemap URLs returned 200 with self-canonical URLs and enforced CSP. The report API returned 401 without authentication. /.env, /.git/config, /phpinfo.php and /wp-login.php returned 404. These checks are not a forensic guarantee that no compromise has occurred.

New npm advisories affected maintenance/development tooling, not the deployed browser libraries. Updated Nodemailer to 10.2.1, compatible lockfile dependencies (including fast-uri, Puppeteer/Chromium BiDi and Zod), and pinned an Undici 7.30.1 override to patch the fetch dependency shared by Cheerio and Miniflare without downgrading Wrangler. npm audit now reports zero known vulnerabilities.

Passed: security lint and vendor integrity, generated route/count checks, 73-page SEO audit, security-header tests, email report assembly, accessibility engine fixture, owner authentication/CSRF tests, signed report authentication, and Wrangler deployment dry-run. Existing vendored PDF/OCR/image assets were unchanged. No PHP was installed and no hosting plan changed.

PHP source advisory: https://www.php.net/archive/2026.php#2026-10-21-5
