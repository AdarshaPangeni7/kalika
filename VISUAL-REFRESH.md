# Kalika visual refresh

Approved scope: homepage, categories, tool pages, guides and information pages. Shared styling applies to 73 public pages; processing engines and optional analytics behavior remain unchanged.

The homepage adds prominent universal search, task shortcuts, line icons, guide links and lightweight artwork. The Guides hub uses topic cards. Shared panels, spacing, breadcrumbs and navigation use the established blue-teal and warm paper palette. Build applies the shared stylesheet to future public pages.

Artwork mode: built-in image generation, stylized concept. Prompt: minimal premium 3D still life of folded paper documents, a teal image card and deep blue-teal calculator; matte materials, soft contact shadows, warm off-white backdrop, no lettering, logos, neon or red. Assets: public/images/home/workbench-400.webp (6044 bytes), workbench-800.webp (17094 bytes). No runtime 3D dependency.

Validation includes 20 tool regression suites, security and SEO checks, responsive screenshots and automated accessibility checks. The category breadcrumb test was updated to leave localized French/Serbian guides to their dedicated suites.

One local throttled mobile comparison before the shared styling pass: original LCP 2012 ms, refreshed homepage 2132 ms; CLS 0 versus 0.000054. These are single-run lab measurements, not field Core Web Vitals or ranking guarantees. Screenshots and test reports are in the ignored reports folder. The homepage builder is a one-shot development utility; normal builds use apply-visual-refresh.mjs.
