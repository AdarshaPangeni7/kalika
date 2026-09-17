# Kalika search discovery

The public robots file explicitly permits OAI-SearchBot and ChatGPT-User, Claude-SearchBot and Claude-User, PerplexityBot and Perplexity-User, and Applebot. The existing general crawl policy is unchanged. These search/retrieval bots are distinct from model-training bots. There is no guaranteed placement or indexing registration performed for these services.

The sitemap lists canonical public pages. Content, canonical tags and structured data are delivered in the initial HTML. The local admin and private drafts are not hosted on the public site.

## IndexNow

`indexnow.config.json` identifies the canonical host and its ownership-verification file in `public/`. The protocol requires that file to be publicly readable. It is not a Google, Bing, Cloudflare or admin account credential.

- `npm run deploy` deploys through Cloudflare and then sends IndexNow notifications for changed public pages.
- `npm run submit:indexnow` retries notifications without redeploying. It reads sitemap URLs and submits only changed pages whose live HTML matches the local version.
- Publishing a traditional text through the admin verifies deployment first, then notifies IndexNow about the article and library listing. A notification failure does not misreport an otherwise successful publication as a failed deployment; its message appears in the publication status.
- Accepted hashes are stored locally in `.kalika-admin/indexnow-state.json`, outside Git and public hosting, so unchanged pages are not submitted repeatedly. Back up this folder with your drafts when moving computers.
- HTTP 200 means received; 202 means received with key validation pending. Neither guarantees indexing. For rate limits or temporary failures, retry later rather than repeatedly submitting.

Google Search Console and Bing Webmaster Tools remain separate. IndexNow distributes submitted URLs among participating engines; it is not a direct submission mechanism for ChatGPT, Claude, Perplexity or Applebot.

`node scripts/check-discovery.mjs` checks live robots permissions and page responses with these crawler user-agent names. It cannot prove requests from the providers' own IP ranges are allowed or that a provider has visited. If Cloudflare reports blocking verified search bots, inspect the verified-bot/IP controls; do not disable the firewall or whitelist arbitrary requests solely by their user-agent text.

Official references:
- https://www.indexnow.org/documentation
- https://developers.openai.com/api/docs/bots
- https://privacy.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler
- https://docs.perplexity.ai/docs/resources/perplexity-crawlers
- https://support.apple.com/en-us/119829
