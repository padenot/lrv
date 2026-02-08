# lrv Roadmap / TODO

This list tracks prioritized tasks for making lrv secure, self‑contained, and VCS‑agnostic for localhost and private mesh (e.g., Tailscale) usage.

## Security & Networking
- [x] Default bind to 127.0.0.1 (local only).
- [x] Add `--bind <ADDR>` and keep `--port <PORT>`.
- [x] Add `--public` flag as shorthand for `--bind 0.0.0.0` and show a banner when used.
- [x] Enforce path safety in `/api/file`:
  - [x] Reject absolute paths and any `..` components.
  - [x] Canonicalize and ensure the target remains under the project root; return 403 if not.
- [x] Gracefully handle missing VCS for the “old” side (return empty content; UI tolerant).
- [ ] Optional: Auth token for `--public` mode (opt-in; header or cookie). Low priority for private mesh.
- [ ] Optional: Limit `/api/context` exposure to basename by default; full path behind a debug flag.

### Immediate Hardening (Frontend)
- [ ] Replace innerHTML in header title/project info with safe DOM construction (no HTML injection).
- [ ] Avoid injecting comment body into textarea via template; set `.value` programmatically.
- [ ] Check `fetch` responses (`response.ok`) and surface errors; add small helper.

### Tailscale & Multi-bind
- [x] Support multiple `--bind` addresses.
- [x] Add `--tailscale` to bind on detected Tailscale IPv4 in addition to localhost.
- [x] Run multiple listeners on a single port with graceful shutdown.

## VCS-Agnostic “Old” Content
- Add `--vcs <git|jj|none>` and `--base <rev>`.
- Abstract “old content” provider:
  - Git: `git show <rev>:<path>`
  - JJ: `jj file -r <rev> <path>` or equivalent
  - None: skip old fetch (empty content), still render diffs
- Provide `--old-cmd "<cmd {path}>"` for custom providers (advanced).
- Documentation: examples for piping diffs from any tool and selecting providers.

## Frontend Assets (Self-Contained)
- [x] Vendor Monaco under `web/assets/vendor/monaco/` (pin version).
- [x] Vendor fonts (Inter, JetBrains Mono, Geist Sans) under `web/assets/fonts/` and add `@font-face` rules.
- [x] Remove external CDNs and Google Fonts; update HTML/loader to local paths.
- [ ] Make preloader canvas responsive to viewport to avoid overflow on small screens.
- [ ] Add `THIRD_PARTY_NOTICES.md` with license references/links.

## Static Serving & Embedding
- [x] Use `rust-embed` to embed `web/dist` and vendor assets.
- [x] Serve `/` and `/assets/*` from embedded bytes with correct content types.
- [ ] Consider hashed filenames for long cache lifetimes.

## Content Security Policy
- [x] Add CSP and security headers for local assets only (includes script 'unsafe-inline'/'unsafe-eval' for Monaco, and style 'unsafe-inline').
- [x] Allow `worker-src blob:` and `script-src blob:` to enable Monaco workers.
- [ ] Later: move inline JS/CSS to files and remove `'unsafe-inline'`/`'unsafe-eval'`.

## Diff Parsing & Rendering
- Handle “no newline at end of file” markers gracefully.
- Accept metadata-only changes (files with status but no hunks) for display.
- [x] Lazy-load file contents on selection instead of fetching all at init for large diffs.
 - [x] Tolerate missing old content (render new side only) without errors.

## Monaco Lifecycle & Performance
- [x] Dispose previous diff editor and models on file switch.
- [x] Dispose content widgets on close (also on file switch).
- [x] Remove debug `console.log` or guard behind a DEBUG flag.
- [x] Pre-apply theme (no flash) and gate body visibility until ready.
- [x] Wait for AMD loader readiness before loading Monaco.
- [x] Stabilize perf E2E (init + rapid) and write perf JSON outputs.

## UX & Accessibility
- Modals: `role="dialog"`, `aria-modal="true"`, labeled headings, focus trap, restore focus on close.
- Keyboard shortcuts shouldn’t interfere when inputs focused (mostly done; verify).
- Show a visible banner when `--public` mode is active.
- Show clear UI when old content is unavailable.
- [x] Default code font to monospace (JetBrains Mono) with user override.
- [x] Project info truncation/tooltip for long title/paths.
- [ ] Smooth, short CSS transitions for theme/background/text changes.
- [ ] Keyboard: brace single-line conditionals; prefer layout-agnostic detection where applicable.
- [ ] Ensure `.settings-btn` keeps neutral style in header (override generic button styles).

## CLI & Output
- Remove `--mode` from README or implement if desired.
- Optional: `--timeout <sec>` for auto-shutdown after inactivity.
- Document `--output`, `--no-open`, `--bind`, `--public` with examples.

## API Hardening & Behavior
- [x] Return 400 for invalid `side`.
- [x] 403 for traversal.
- [x] 404 for missing files (new-side reads).
- [ ] Add development logging via `tower_http::trace` (disabled by default).

## Tests & Tooling
- [x] Unit tests for path traversal/canonicalization guards.
- [ ] Integration tests for Git/JJ providers (trait-based; temp repos).
- [x] E2E: drop `pkill`; only kill the spawned server process.
- [x] E2E: random free port per run; set Playwright `baseURL` dynamically.
- [x] Add an offline run to validate vendored assets (just check-offline).
- [x] Add theme E2E (no flash + theme accent from Monaco theme defs).
- [x] Add perf runner scripts (init/loop/batch) + just recipes.
- [x] Add Prettier config/ignore; just fmt-web; apply formatting.
- [ ] CI: cache Cargo/npm; run unit then E2E; optionally run with network disabled.
- [ ] CI: perf thresholds (init mean/p95, switch mean/p95) gates.
- [ ] CI: cache Cargo/npm; run unit then E2E; optionally run with network disabled.

## Code Hygiene
- [x] Remove stray "Test comment" in `src/main.rs`.
- [ ] Prefer `tracing` over `eprintln!` for server logs, except user-facing.
- [ ] Consistent status codes and error bodies for API failures (optional).
- [x] Remove unused imports and warnings (e.g., Html).
- [ ] Replace ad-hoc selectors with helpers ($, $$) where it improves readability.

## Documentation
- README: update for bind/public behavior, VCS options, vendored assets, offline behavior.
- Security model: localhost/private mesh focus; optional token for `--public`.
- Add licenses/links for Monaco and fonts.
- [x] Perf E2E quick guide (docs/perf-e2e.md) with scripts/usage.

## Stretch Goals
- `--base` revspec support for both Git and JJ.
- Render visible context purely from hunks when full file fetch isn’t possible.
- `--out comments.json` to export review output.
- Theming presets stored in config; theme switcher persists.
