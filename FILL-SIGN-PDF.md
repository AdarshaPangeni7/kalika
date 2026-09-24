# Fill & Sign PDF

Route: `/tools/fill-sign-pdf`. Documents and signatures stay in the browser tab; PDF libraries are served from this site. No document API, upload or saved editing history is used.

## Files

- `public/js/fill-sign-engine.js`: document validation, AcroForm values, optional flattening and added image placement using shared rotated-page geometry.
- `public/js/fill-sign.js`: file lifecycle, form controls, signature canvas, drag/keyboard/measurement positioning, undo, previews and download.
- `public/fill-sign.css`: responsive editor styling.
- `scripts/build-fill-sign-page.mjs`: page copy/schema and homepage, related links, sitemap and monitoring registration.
- `scripts/test-fill-sign.mjs`: real exported PDF checks, browser workflow and rotated-page pixel assertions.

Run `node scripts/test-fill-sign.mjs` for a local test, or set `KALIKA_TEST_ORIGIN=https://kalikatools.com` to test the deployed page. Results and screenshots go to ignored `reports/fill-sign-tests/`. The maintenance Action includes this test weekly and includes its outcome in the email report.

## Scope

One unlocked PDF, at most 30 MB and 100 pages. At most 30 added items; undo retains up to 30 item edits. Form controls support text, checkboxes, dropdowns, radio groups and lists. Read-only fields are disabled. PDF JavaScript, calculations and submit buttons are not run. Reject XFA before calling pdf-lib's `getForm()`, which otherwise removes XFA data; also reject signature fields and custom page units.

Edited form values use Helvetica's supported Latin characters. Added text and typed signatures use browser fonts and are embedded as PNGs, so they are not searchable PDF text. Existing page text is preserved. Drawn signatures are trimmed PNGs. Placement follows displayed CropBox coordinates and page rotation, with pointer, keyboard and numeric controls. Changes always export from a fresh copy of original bytes.

Flattening is on by default and preserves existing field appearances; disabling it retains form fields. Added marks are fixed page images either way. Review the export before sharing. This is a visible-signature tool, without certificate signing, identity verification, audit trails or secure redaction.
