# Vendored Frontend Assets

This project embeds the web UI into the binary so `lrv` can run fully offline. We vendor Monaco Editor and fonts under `web/assets/` and serve them from memory via `rust-embed`.

What is vendored
- Monaco Editor (minified build)
  - Expected path: `web/assets/vendor/monaco/min/vs/loader.js` (and siblings)
- Fonts (`.woff2`)
  - `web/assets/fonts/Inter-Variable.woff2`
  - `web/assets/fonts/GeistSans-Variable.woff2`
  - `web/assets/fonts/JetBrainsMono-Variable.woff2`

Where it’s referenced
- `web/dist/index.html` prefers local assets:
  - Monaco base: `/assets/vendor/monaco/min/vs`
  - Fonts via `@font-face` pointing to `/assets/fonts/*.woff2`
- If Monaco isn’t present locally, the loader falls back to the CDN (so keep local copies for a self-contained binary).

How to update Monaco
1) Choose a version (we currently target 0.45.x). Pin to a specific version for reproducibility.
2) Fetch the package (any of these):
   - With npm:
     - `npm pack monaco-editor@<version>`
     - `tar -xzf monaco-editor-<version>.tgz -C /tmp`
     - Copy `/tmp/package/min` to `web/assets/vendor/monaco/min`
   - Or download from the repo release and copy the `min/vs/` folder accordingly.
3) Verify the file `web/assets/vendor/monaco/min/vs/loader.js` exists.
4) Build and test offline:
   - `cargo run -- --no-open`
   - Open the printed URL and check the Network panel: no external requests should be made.

How to update fonts
1) Ensure the font license allows redistribution (e.g., Inter and JetBrains Mono are OFL licensed). Place the `.woff2` files at:
   - `web/assets/fonts/Inter-Variable.woff2`
   - `web/assets/fonts/GeistSans-Variable.woff2`
   - `web/assets/fonts/JetBrainsMono-Variable.woff2`
2) If you change filenames, update the `@font-face` src URLs in `web/dist/index.html`.
3) Build and test offline as above; confirm fonts load from `/assets/fonts/*`.

Licenses and notices
- Add/update entries in `THIRD_PARTY_NOTICES.md` (create if missing) with:
  - Project name, version, source URL
  - License type and link
  - Any required attribution text

Sanity checklist
- [ ] `web/assets/vendor/monaco/min/vs/loader.js` present
- [ ] All required Monaco files under `min/vs/` present
- [ ] `.woff2` font files present and paths match `index.html`
- [ ] `cargo run -- --no-open` works fully offline (no CDN hits)
- [ ] Tests pass: `cargo test`

