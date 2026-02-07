# lrv Roadmap / TODO

This list tracks prioritized tasks for making lrv secure, self‑contained, and VCS‑agnostic for localhost and private mesh (e.g., Tailscale) usage.

## Security & Networking
- Default bind to 127.0.0.1 (local only).
- Add `--bind <ADDR>` and keep `--port <PORT>`.
- Add `--public` flag as shorthand for `--bind 0.0.0.0` and show a banner when used.
- Enforce path safety in `/api/file`:
  - Reject absolute paths and any `..` components.
  - Canonicalize and ensure the target remains under the project root; return 403 if not.
- Gracefully handle missing VCS for the “old” side (return empty content with a clear message).
- Optional: Auth token for `--public` mode (opt-in; header or cookie). Low priority for private mesh.
- Optional: Limit `/api/context` exposure to basename by default; full path behind a debug flag.

## VCS-Agnostic “Old” Content
- Add `--vcs <git|jj|none>` and `--base <rev>`.
- Abstract “old content” provider:
  - Git: `git show <rev>:<path>`
  - JJ: `jj file -r <rev> <path>` or equivalent
  - None: skip old fetch (empty content), still render diffs
- Provide `--old-cmd "<cmd {path}>"` for custom providers (advanced).
- Documentation: examples for piping diffs from any tool and selecting providers.

## Frontend Assets (Self-Contained)
- Vendor Monaco under `web/vendor/monaco/` (pin version).
- Vendor fonts (Inter, JetBrains Mono, Geist Sans) under `web/fonts/` and add `@font-face` rules.
- Remove external CDNs and Google Fonts; update HTML/loader to local paths.
- Add `THIRD_PARTY_NOTICES.md` with license references/links.

## Static Serving & Embedding
- Use `rust-embed` to embed `web/dist` and vendor assets.
- Serve `/` and `/assets/*` from embedded bytes with correct content types and cache headers.
- Consider hashed filenames for long cache lifetimes.

## Content Security Policy
- Add CSP for local assets only:
  - `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:`
- Later: move inline JS/CSS to files and remove `'unsafe-inline'`.

## Diff Parsing & Rendering
- Handle “no newline at end of file” markers gracefully.
- Accept metadata-only changes (files with status but no hunks) for display.
- Lazy-load file contents on selection instead of fetching all at init for large diffs.

## Monaco Lifecycle & Performance
- Dispose previous diff editor and models on file switch.
- Dispose content widgets on close.
- Remove debug `console.log` or guard behind a DEBUG flag.

## UX & Accessibility
- Modals: `role="dialog"`, `aria-modal="true"`, labeled headings, focus trap, restore focus on close.
- Keyboard shortcuts shouldn’t interfere when inputs focused (mostly done; verify).
- Show a visible banner when `--public` mode is active.
- Show clear UI when old content is unavailable.

## CLI & Output
- Remove `--mode` from README or implement if desired.
- Optional: `--timeout <sec>` for auto-shutdown after inactivity.
- Document `--output`, `--no-open`, `--bind`, `--public` with examples.

## API Hardening & Behavior
- Return 400 for invalid `side`, 403 for traversal, 404 for missing files.
- Add development logging via `tower_http::trace` (disabled by default).

## Tests & Tooling
- Unit tests for path traversal/canonicalization guards.
- Integration tests for Git/JJ providers (trait-based; temp repos).
- E2E: drop `pkill`; only kill the spawned server process.
- E2E: random free port per run; set Playwright `baseURL` dynamically.
- E2E: add an offline run to validate vendored assets.
- CI: cache Cargo/npm; run unit then E2E; optionally run with network disabled.

## Code Hygiene
- Remove stray "Test comment" in `src/main.rs`.
- Prefer `tracing` over `eprintln!` for server logs, except user-facing.
- Consistent status codes and error bodies for API failures (optional).

## Documentation
- README: update for bind/public behavior, VCS options, vendored assets, offline behavior.
- Security model: localhost/private mesh focus; optional token for `--public`.
- Add licenses/links for Monaco and fonts.

## Stretch Goals
- `--base` revspec support for both Git and JJ.
- Render visible context purely from hunks when full file fetch isn’t possible.
- `--out comments.json` to export review output.
- Theming presets stored in config; theme switcher persists.

