# Browser PDF tools

Merge, Split and Compress PDF live in `public/tools/` and share `public/js/pdf-tools.js`.
`node scripts/build-pdf-pages.mjs` regenerates their pages and updates navigation, related tools, the sitemap and monitoring routes.

Libraries are pinned in package-lock.json and served locally under `public/js/vendor/pdf/`, including licenses, PDF.js fonts, character maps and WebAssembly decoders. Run `node scripts/vendor-pdf.mjs` after an intentional dependency update; test before deploying.

Merge and split copy PDF pages without rasterizing them. Document-level bookmarks, attachments and internal links are not guaranteed to transfer. Encrypted PDFs and documents with AcroForm dictionaries are rejected instead of pretending to preserve forms/signatures.

Compression offers object-stream reserialization without rasterizing text and an explicit opt-in image-only mode. Image mode renders pages sequentially, then encodes JPEGs. It loses selectable text, links, accessibility tags and interactive features. If output is not smaller, the original bytes are offered unchanged. Neither mode guarantees a target size.

Input limits: 30 MiB/file; merge 2–20 files, 60 MiB total, 200 pages total; split 200 pages, 100 MiB total generated PDFs; compression 200 pages or 50 pages in image mode. Generated page images are capped at 80 MiB total and 3,000 pixels on the longest side. Smaller documents may still be needed on low-memory phones.

`node scripts/test-pdf-tools.mjs` tests real browser inputs/downloads, merge ordering and rotation, PDF text extraction, page-range validation, ZIP contents, both compression modes, original fallback, malformed/form PDFs and mobile overflow. Set KALIKA_TEST_ORIGIN to test a deployed site. Weekly maintenance includes the live test. Synthetic fixtures never contain user documents.

The private SEO admin discovers these pages through the sitemap; no new public admin route is needed.

The functional upload assertion excludes Cloudflare's `/cdn-cgi/rum` performance endpoint on deployed pages. It checks for application upload requests; it is not an assertion that the hosting platform performs no telemetry.
