# Web Assets (Vendored)

This directory holds vendored frontend assets to make `lrv` a self‑contained binary.

Place the following here before building release binaries:

- Fonts (`web/assets/fonts/`):
  - `Inter-Variable.woff2`
  - `GeistSans-Variable.woff2`
  - `JetBrainsMono-Variable.woff2`
- Monaco Editor (`web/assets/vendor/monaco/`):
  - The full Monaco editor minified build (e.g., from monaco-editor@0.45.x)
  - Expected path layout: `web/assets/vendor/monaco/min/vs/loader.js` and related files

Notes:
- The app prefers these local assets. If missing at runtime, the UI falls back to the Monaco CDN and system fonts, but that is not self‑contained.
- When publishing, ensure assets are present so `rust-embed` includes them in the binary.
- See `THIRD_PARTY_NOTICES.md` for license links (add appropriately).
