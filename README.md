# Kalika

Kalika is a free static tools website. The live site is designed to run without accounts, tracking, a database, or server-side file processing.

## Live Deployment

- Domain: `https://kalikatools.com`
- Hosting target: Cloudflare Workers with Static Assets
- Static asset folder: `public/`
- Cloudflare config: `wrangler.jsonc`

Cloudflare should deploy with the default command:

```bash
npx wrangler deploy
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
