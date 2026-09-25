# Kalika Document Scanner implementation

## Choice of approach

| Approach | Static-site advantages | Download and mobile tradeoff |
| --- | --- | --- |
| Custom Canvas + Web Worker (implemented) | No image-processing dependency, no server, full control over crop handles, keyboard access and memory caps | Scanner JS and CSS total about 27.5 KB raw / 10.6 KB gzipped at implementation time. Detection is a heuristic for light paper on a contrasting background, not general document recognition. |
| OpenCV.js | Mature contour, thresholding and perspective-transform primitives; useful for a more elaborate detector | Build-dependent JS/WASM download, generally much larger than this custom engine. A custom build can trim modules. WASM does not by itself remove the need to manage matrices, memory and UI responsiveness. Benchmark the exact chosen build on real phones. |
| jscanify | Convenient document-scanning API built around OpenCV | Its small wrapper is not the complete download: OpenCV is required too. UI controls, filtering, page management and PDF export still need integration. |

Sources: [jscanify repository](https://github.com/puffinsoft/jscanify), [OpenCV.js build documentation](https://docs.opencv.org/3.4.17/d4/da1/tutorial_js_setup.html). Exact OpenCV transfer sizes depend on build configuration and compression, so no single fixed bundle size is assumed.

Recommendation: use this lightweight implementation for Kalika's initial scanner. If real-world test photos show unacceptable detection failures, replace only the worker's detection function with a self-hosted, reduced OpenCV build. Keep manual corners and the same PDF/page-management interface. Native scanner parity is not promised.

## User flow

1. Document Scanner: upload several photos, or use the mobile camera file input. Detect boundaries and show the first page with handles. If detection fails, select the full image and explicitly ask for manual adjustment.
2. Drag the four handles, or focus one and use arrows (Shift moves farther). A convex crop is required; crossed or collapsed corners are rejected.
3. Choose original color, grayscale, adaptive black-and-white, or paper normalization (Magic). Set 90-degree or arbitrary rotation after cropping. Apply to preview.
4. Add more photos; use Edit, Move up/down and Remove. Only the selected source photo is decoded for editing. Changes are applied before switching pages or exporting.
5. Export all pages as a PDF, or the current page as PDF/JPG. PDF formats are A4, US Letter or fit-to-image. A4/Letter use a 10 mm margin and preserve image proportions. Download links remain available until a new edit or export.

JPG-to-PDF uses the same engine, but starts with full images and hides the crop editor until **Crop & enhance** is selected. The separate Document Scanner page keeps the main conversion flow uncluttered. PDF results recommend Compress, Merge and Split; PDF-to-JPG recommends Document Scanner after extracting the downloaded ZIP. Files are not secretly transferred between pages: users download and choose them in the next tool.

## File structure and implementation order

1. `public/js/scanner-engine.js`: pure typed-array algorithms. Multi-threshold connected bright regions → convex hull → four-corner boundary fit → area/coverage/edge-contrast checks. The perspective transform uses an inverse homography and bilinear interpolation. Grayscale uses luminance; black-and-white uses adaptive local means; Magic estimates local paper color using tile percentiles and interpolates normalization to avoid letter halos.
2. `public/js/scanner-worker.js`: transfers pixel buffers to/from a module Worker. Detection and warp/filter loops run off the UI thread. No OffscreenCanvas dependency. A 45-second task timeout reports failure and allows retry.
3. `public/js/document-scanner.js`: sequential decoding, EXIF-aware browser image display, bounded working canvases, pointer/keyboard crop UI, editing state, page list, rotations, thumbnails, exports, error recovery and object URL cleanup. PDF export reuses the locally vendored `pdf-lib`, already used by Kalika's newer PDF tools, instead of the old JPG converter's CDN-loaded jsPDF. No new production npm dependency.
4. `public/scanner.css`: responsive crop workspace, touch handles, preview, page list and export controls; retains the existing site header, footer, fonts and palette.
5. `scripts/build-scanner-pages.mjs`: generates `public/tools/document-scanner.html` and upgrades `public/tools/jpg-to-pdf.html` using the existing page shell. Includes unique SEO metadata, canonical, application/FAQ schema and written instructions. Also updates the homepage, sitemap and maintenance route list. Run from the repository root with `node scripts/build-scanner-pages.mjs`.
6. `scripts/test-document-scanner.mjs`: numeric geometry and pixel checks plus real browser/file-download tests. Run `node scripts/test-document-scanner.mjs` locally; set `KALIKA_TEST_ORIGIN=https://kalikatools.com` to test deployment. Playwright Chromium must be installed on Linux; Windows tests use installed Chrome.

The private SEO admin discovers HTML tool pages automatically, including the new scanner. Weekly/all maintenance runs now include scanner and JPG-to-PDF functional tests. Their outcome is included in the weekly email when Gmail credentials are configured.

## Resource limits and privacy

- JPG, PNG, WebP; up to 20 photos, 20 MB each, 60 MB combined and 24 megapixels per photo. Corrupt/unsupported files are reported. Previously imported pages survive a later import failure.
- Detection uses a maximum 600 px side. Editing/scan outputs use a maximum 2,200 px side, with no upscaling. Rotated outputs are capped again. At most 80 MB of processed JPEG data is retained.
- Sources remain File objects. One photo is decoded at a time; other page previews use small JPEG thumbnails. Pixel work runs in a Worker. PDF bytes are assembled locally on explicit export.
- The scanner never calls a remote processing API, uploads source/output documents, uses localStorage/IndexedDB for documents, or requires paid APIs. Reloading/closing loses unsaved work. The site's existing optional analytics and hosting requests remain separate from image processing; this is not a claim that the entire website makes zero network requests.
- The existing local PDF library is lazy-loaded: about 525 KB raw / 207 KB gzipped. Page CSS/JS and PDF library are static resources that can be cached by the browser. First use still requires access to these assets; no service-worker/offline-install claim is made.

## Limits to explain to visitors

- Bright, flat paper with four visible corners on a darker plain surface works best. White-on-white, dark paper, clutter, hard shadows, edge occlusion and tiny receipts may fail or select the wrong object. Review every page, not only the first one.
- The crop estimates width/height from visible edges. Without camera calibration or known physical dimensions, the true paper aspect ratio cannot always be recovered exactly.
- Perspective correction does not unbend book pages, perform OCR, restore blur, remove glare or identify real-world document sizes. PDFs contain images rather than searchable text or interactive forms.
- JPEG encoding/resizing is lossy; Magic and black-and-white can alter colors or lose faint writing. Keep source photos and compare Original color before sharing important documents.
- Free rotation expands onto white background to avoid clipping. Rotating can reduce effective resolution because the result remains capped at 2,200 px.
- Phone camera capture depends on browser/device support. Desktop fallback is file upload. No continuous live-camera boundary overlay is included.
- Desktop Chromium mobile-viewport tests are not physical iOS/Android performance certification. Real-device camera, memory pressure, orientation and download behavior should be checked with real receipts/documents before claiming native CamScanner quality.

## Validation

Synthetic skewed-paper detection; blank-photo fallback; corner-order validation; exact homography corner mapping and interpolated pixel sampling; all filter modes; touch-compatible pointer dragging and keyboard handles; 90-degree and free rotation; page order/removal; actual JPEG/PDF downloads; PDF reopening and rasterization; single/multi-page and US Letter output; corrupt/over-limit files; 320/390 px layouts; console errors; and document-upload requests are covered by the test suite. Test artifacts are saved under ignored `reports/scanner-tests/`.


## Canvas restriction fix (2026-09-25)

The reported PDF was structurally valid but contained a patterned, corrupted JPEG. The user confirmed Tor Browser. Image extraction restrictions can replace canvas pixels; a nonempty download is not proof of a valid scan.

- `public/js/canvas-safety.js` checks a fixed synthetic color pattern through pixel readback, toBlob and toDataURL before image processing. It does not identify a visitor, persist results or send a request. A failed check stops processing and explains the site-specific canvas permission. It does not bypass the browser setting.
- `public/js/image-pdf-original.js` embeds unedited JPEG/PNG images without canvas extraction. JPEG bytes and EXIF orientation are preserved, including all eight orientation transforms. Unedited images retain source resolution; JPEG metadata may remain embedded. Edited images and WebP conversion still need canvas permission and keep the 2,200-pixel limit.
- PDF-to-JPG now uses local PDF.js, its local fonts/character maps/WASM, and local JSZip instead of relying on third-party CDN execution.
- The guard also covers image compression/resizing, QR downloads, raster PDF compression and added text/signature images.
- `scripts/test-canvas-safety.mjs` simulates restricted readback and corrupted blob/data-URL exports. It verifies that direct JPEG/PNG conversion still works, compares the original JPEG bytes exactly, and renders every EXIF orientation to check actual colors.
- `scripts/test-everyday-tools.mjs` adds functional checks for the 21 tools not covered by the PDF, main calculator and Nepali suites. Both new suites run in weekly/all monitoring.

A saved image containing replacement pixels does not contain the original document information. Recreate it from the original photograph after granting permission, or use the unedited JPG/PNG-to-PDF path.
