# Publishing traditional texts

Start the local admin from this repository with `npm run admin:seo`, sign in using the credentials displayed in its terminal, and choose **Write traditional texts** (http://127.0.0.1:8789/texts-admin).

1. Choose **New text**, or select an existing entry to update it.
2. Write the original text, introduction, meaning, and source/credit. Pronunciation, background and reading notes are optional. Select the actual text language; not every devotional text is Sanskrit.
3. Paste text or import a UTF-8 `.txt` file into the original-text field. Line breaks are preserved. Word/PDF uploads are not supported; paste their relevant text instead.
4. Give the entry a unique address, a 50–60 character SEO title and a 140–160 character description. The address is locked after its first save.
5. **Save private draft** stores it only in `.kalika-admin/drafts/`, excluded from Git and the deployed `public/` directory. Keep a backup of this folder if moving the project to another computer.
6. **Save & preview**, review the page, then check the review box and click **Publish to live site**. Editing anything invalidates the previous approval.

Publishing builds the individual page under `/texts/<address>`, updates `/texts/` and the sitemap, runs the SEO audit, commits only the publishing files, pushes `main` to the configured Kalika GitHub repository and deploys the static site with Wrangler. GitHub and Cloudflare must already be signed in on this computer. `npm install` installs the pinned publisher dependency on a new computer. Other unfinished repository changes block publication so unrelated edits cannot accidentally ship.

The status panel distinguishes GitHub, Cloudflare and live verification. If a network/authentication step fails, fix the connection/sign-in and use **Retry publication**. A pushed commit is not claimed as a live deployment. Closing the browser does not stop an active job while the server runs; reopening the admin restores its status. Restarting the server marks an interrupted job for review/retry. If the Git commit changed independently during a publication, manual review is required.

Published source entries are stored in `content/traditional-texts/` and are included in GitHub. Text is treated as plain text and escaped when rendered; scripts or HTML pasted into an entry do not execute. The private admin is loopback-only, password protected and uses same-origin/CSRF checks for writing. It is not deployed with the site. The monitoring bot remains read-only and never publishes entries itself.

The first entry uses a traditional Ganesh invocation from the linked historical source and identifies the wording variant used. Newly published pages include canonical, social metadata, Article structured data and real publication/update timestamps. The library uses CollectionPage/ItemList structured data. The original verses and article text are excluded from automatic UI translation.

Run `node scripts/build-text-library.mjs` after changing shared navigation/templates. Run `node scripts/test-text-library.mjs` for isolated publishing-failure, editor/security and reading-page tests. Its GitHub push/deploy commands are simulated in a temporary fixture; it never publishes test entries.
