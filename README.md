# Kalika

Kalika is a free tools website without accounts, a database or server-side file processing. Optional Google Analytics loads only after consent. See SECURITY.md for the edge headers, privacy boundary and verification steps.

## Live Deployment

- Domain: `https://kalikatools.com`
- Hosting target: Cloudflare Workers with Static Assets
- Static asset folder: `public/`
- Cloudflare config: `wrangler.jsonc`

Cloudflare should deploy with the default command:

```bash
npm run deploy
```

The `wrangler.jsonc` file points Cloudflare at `./public`, uses `404.html` for missing pages, and lets clean URLs such as `/tools/image-compressor` resolve from matching `.html` files.

## Local Checks

Run the read-only maintenance checker after starting a local preview:

```bash
npm run check:daily
```

The maintenance bot only reports problems. It does not edit files, publish changes, change DNS, or collect visitor data.

## Local SEO Admin Panel

The SEO admin panel is kept outside the public website. It runs locally on your computer with a username and password:

```bash
npm run admin:seo
```

The terminal prints the local address, username, and password. By default the address is `http://127.0.0.1:8789`, so other people on the internet cannot open it from the live Kalika site.

To set your own password on Windows PowerShell:

```powershell
$env:KALIKA_ADMIN_PASSWORD = "choose-a-strong-password"
npm run admin:seo
```

The panel scans the public sitemap, checks each page's title, meta description, canonical tag, H1, and structured data, then lets you draft review notes for future edits.

This panel is intentionally review-only. It cannot publish changes to the live site. To apply an SEO update, edit the matching file in `public/`, commit it to GitHub, and deploy through Cloudflare.

## Private OCR

`/tools/ocr-pdf` recognizes printed text in one PDF or JPG/PNG/WebP image entirely in the browser. Tesseract.js 7 runs in one cancellable worker; PDF.js renders selected PDF pages. Engine and language assets are self-hosted and loaded only after the user starts recognition. Model IndexedDB caching is disabled; document inputs and recognized text are never uploaded or stored by the application.

The tool processes up to 10 selected PDF pages per run, with working images capped at 2,200 pixels on the longest side. TXT output is editable; optional searchable PDF output contains rendered images and the original OCR text layer. Text-box corrections do not change that layer. Recognition does not preserve original PDF forms, links, accessibility structure or signature validity, and users must review results. Blank recognition does not offer a searchable PDF.

Run `node scripts/test-ocr.mjs` for real language fixtures, searchable/visible PDF checks, page ordering, cancellation/retry, dependency failure, restricted canvas handling, lazy loading, no uploads or IndexedDB, and mobile layout. The suite also runs inside `scripts/test-all-tools.mjs` with enforced CSP.

To reproduce OCR assets after `npm ci`, run `node scripts/vendor-ocr.mjs`. Versions and the exact official `tessdata_fast` revision are pinned in `config/ocr-vendor.json`; hashes and upstream licenses are committed. The small first-party adapter uses the pinned Tesseract worker protocol, so upgrade the engine, adapter and tests together.
