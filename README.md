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
