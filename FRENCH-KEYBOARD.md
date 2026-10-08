# French accent editor

Public URL: https://kalikatools.com/tools/clavier-francais

The full page is written in French. It complements a physical keyboard; it does not emulate AZERTY, change operating-system settings, translate or correct spelling.

## Files

- `public/js/french-keyboard.js`: zero-dependency accent entry at the current cursor/selection, capitals and Shift-click, optional typed shortcuts, punctuation, undo/redo, clipboard fallback and UTF-8 text download.
- `public/french-keyboard.css`: responsive shared-palette editor, large touch keys, system fonts and accessible focus styles.
- `scripts/build-french-page.mjs`: page, unique metadata, canonical, SoftwareApplication/FAQ/Breadcrumb schemas and homepage/category/sitemap registration. Run `npm run build` afterward to update counts and the security manifest.
- `scripts/test-french-keyboard.mjs`: pure shortcut fixtures plus real browser tests for insertion/selection, every accent, uppercase, undo/redo, typed versus pasted sequences, non-destructive example insertion, copy/download/fallback, oversized paste, punctuation, mobile overflow, axe accessibility, French consent copy, schema agreement and links. Included in security CI and the full tool regression runner.

## Editing behavior and limits

Ordinary typing/pasting stays unchanged. Shortcuts are opt-in, apply only to individual typed input events and never process pasted text. Examples: `e'` → é, `c,` → ç, `oe/` → œ; an uppercase initial produces the capital. Turn the option off to type these sequences literally. Undo/redo and Ctrl/Command-Z are scoped to the editor, with at most 100 in-memory changes. No source text is stored across reloads or sent to a service.

Inserting a character replaces an explicitly selected passage; otherwise it inserts at the cursor. The example inserts at the cursor instead of discarding a document. Insertion checks 100,000 UTF-16 units. Longer pasted text remains available for copy/download and manual reduction, never silently truncated. The counter uses UTF-16 units; some symbols count twice. Text downloads preserve newlines and Unicode but not rich document formatting. Punctuation and spacing are never rewritten automatically.

Google Analytics remains consent gated; French consent wording is added only for French pages. The editor does not emit content telemetry. General site pages and linked older tools remain English and are identified accordingly.

## Competitor review — 8 October 2026

Reviewed https://www.lexilogos.com/clavier/francais.htm and https://french.typeit.org/ for real accent-entry workflows, shortcuts, capital letters and copy actions; also inspected https://clavierfrancais.com/. Original implementation and copy. Features intentionally omitted: server/AI correction, voice permissions, automatic text saving and global keyboard overrides. No unsupported claim of superior accuracy, traffic or rankings.

## Validation and launch

Run `node scripts/test-french-keyboard.mjs`, `node scripts/test-home-search.mjs`, `node scripts/test-category-hubs.mjs`, `node scripts/test-analytics.mjs` and `npm run check:security`. Review desktop/mobile screenshots under ignored `reports/french-keyboard/`. Deploy with the existing Cloudflare process, verify live insertion and discovery, then notify IndexNow. Sitemap/homepage enumeration makes maintenance discover this tool. Review Search Console indexing and relevant French queries after launch; structured data is not a guarantee of indexing, rich results or rank.

Immediate Backspace/Escape after shortcut expansion restores the literal sequence; mobile cancellable deleteContentBackward is supported. Ctrl/Command-Z retains its usual editor undo behavior. Social preview is a local 1200×630 PNG. English navigation destinations are labeled. No hreflang alternate is declared because there is no equivalent translated page.
