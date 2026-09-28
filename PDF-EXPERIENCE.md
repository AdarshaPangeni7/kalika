# PDF experience expansion

The PDF hub at `/pdf-tools` groups 15 PDF tools by task and filters them locally. The site now contains 45 tools. Navigation links to the PDF hub across content pages.

## Focused page tools

`rotate-pdf`, `delete-pdf-pages` and `extract-pdf-pages` reuse `public/js/organize-pdf.js`. The `data-organizer-mode` attribute selects task-specific controls. Hidden controls remain in the DOM for the shared engine but are not available in the task UI. Rotation preserves original page rotation plus the selected adjustment. Extraction keeps original order. The original organizer still supports reordering and the full feature set.

## Text extraction

`public/js/pdf-to-text.js` uses the locally served PDF.js library. No canvas rendering or OCR is involved. Limits: 30 MiB, 200 pages, five million extracted characters. The user can cancel, copy, download UTF-8 text or clear the current data. Pages without text are identified. Reading order, tables and font encodings may not extract accurately; the UI requires review and does not claim to reproduce layout.

## Next steps

`public/js/pdf-next-steps.js` adds suggestions after supported downloads. It does not transfer documents or save them to browser storage. Existing scanner suggestions are retained without duplication. A document handoff between tools is a future feature, not part of this release.

## Build and checks

- `node scripts/build-pdf-experience.mjs` generates the new pages and updates the hub, navigation, sitemap and monitoring routes. It reads the existing organizer and guide shells, so review generated changes before deploying.
- `node scripts/test-pdf-experience.mjs` tests the task controls, output page order and text, rotation values, TXT download, malformed/empty/oversized files, cancellation, clear, search, mobile widths and absence of application uploads.
- `KALIKA_TEST_ORIGIN=https://kalikatools.com` runs the suite against the live site.
- Existing organizer, scanner and merge/split/compression suites remain applicable.
- The weekly workflow runs the new suite and includes its outcome in the email report.

Later roadmap items require separate engineering and verification: local document handoff, OCR, password-based PDF operations and translated search landing pages. This release does not add Office conversion, certified digital signatures or secure redaction.
