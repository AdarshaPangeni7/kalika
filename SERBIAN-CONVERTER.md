# Serbian Latin / Cyrillic converter

Public route: `/tools/serbian-latin-cyrillic`. Served files live in `public/`.

- `public/js/serbian-engine.js`: dependency-free pure conversion engine. NFC normalization; standard Serbian letters and digraphs; uppercase handling; explicit bounded exception families; optional URL/email preservation; protected `[[...]]` passages. No network or storage access.
- `public/js/serbian-tool.js`: debounced browser interface, script display switch, protected selection, copy fallback, UTF-8 download, swap and ten-step action undo. No visitor text is sent to analytics.
- `public/serbian.css`: responsive styles using Kalika palette tokens and system fonts with Serbian glyph coverage.
- `scripts/build-serbian-page.mjs`: generates Serbian content and SoftwareApplication/FAQ/Breadcrumb JSON-LD; registers homepage/category/sitemap discovery. Run `npm run build` afterward for counts and security manifest.
- `scripts/test-serbian.mjs`: engine fixtures and browser flow, text limits, hostile input, clipboard/download, mobile overflow, axe accessibility, schema agreement and internal links. Included in security CI and full regression runner.

## Accuracy boundaries

This is transliteration, not translation, spell checking or restoration of missing accents. `dj` is not silently changed to `đ`. Only documented exception families are recognized; a finite list cannot cover every proper name, compound or foreign word. Native editorial review remains useful before expanding the exception list. Rich document formatting is not supported. Protection markers do not nest; unclosed `[[` warns. The input limit is 100,000 UTF-16 code units, never silently truncated.

The default indexed page is complete Serbian Latin. The Cyrillic button changes the display in the current tab without redirecting, setting preferences or claiming a separate indexed language page. Both are Serbian scripts, not separate languages. Global pages and related tools remain English and are identified as such. Consent wording is localized; existing analytics opt-in behavior is unchanged.

## Competitor review, 8 October 2026

Reviewed https://latinicaucirilicu.rs/ and https://konvertor.rs/latinica-u-cirilicu for workflow ideas. Useful requirements were explicit direction controls, digraph exceptions, mixed-text review and preserved links/email. Implementation and copy are original. No claim that Kalika has more traffic, better accuracy or exclusive local processing.

## Publishing

Run `node scripts/test-serbian.mjs`, `node scripts/test-home-search.mjs`, `node scripts/test-category-hubs.mjs`, `node scripts/test-analytics.mjs` and `npm run check:security`. Deploy through the existing Cloudflare workflow. Sitemap and homepage enumeration make the maintenance bot discover the new tool automatically. Check actual Search Console indexing and Serbian search queries after launch; schema does not guarantee rich results or ranking.
