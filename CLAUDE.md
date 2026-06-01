# CLAUDE.md

## Project

`lrv` — Rust CLI for human-in-the-loop code review of unified diffs. Axum server + Monaco browser UI. Input: stdin/`--cmd`/`--file`. Output: comments to stdout (json/text). VCS-agnostic.

## Build & Install

```bash
just build       # frontend + debug binary
just install     # release binary → ~/.cargo/bin
cargo install --path .  # also works; build.rs rebuilds frontend automatically
```

## Test & Lint

```bash
just test-unit / just test-e2e / just test
just fmt && just fmt-web && just lint
just setup-e2e   # first time only
```

## Architecture

Backend: `main.rs` (CLI), `server.rs` (routes), `diff.rs` (parsing), `types.rs`, `output.rs`, `config.rs`, `github.rs`, `phab_mcp.rs`, `phabricator.rs`.

Frontend (`web/src/`): `monaco-app.ts` (entry), `file-loading-methods.ts`, `stacked-view-methods.ts`, `comments-ui-methods.ts`, `commit-methods.ts`, `series-methods.ts`, `comment-draft-storage.ts`, `themes.ts`.

Assets embedded at compile time via `rust_embed`. `build.rs` hashes assets → writes to `OUT_DIR` → forces recompile when CSS/JS changes.

## Dual Implementations — Keep in Sync

Comment form has two independent implementations:
- `comments-ui-methods.ts` — Monaco diff view
- `stacked-view-methods.ts` — stacked table view

Any comment UX change (shortcuts, edit, delete, validation) must go in both.

## Key Behaviours

- **Port**: derived from CWD hash (32768–40959); falls back to ephemeral if taken.
- **Comment drafts**: IndexedDB, keyed by `working_directory + git_branch + jj_change_id` (stable across amends). On reload, a banner prompts to restore rather than auto-restoring.
- **jj**: `diff.rs` parses `Change ID:` from `jj show --git` for stable draft keys.
- **Added-file dimming**: `file-added-view` / `stacked-file-added` classes scope green reduction to entirely new files only (not individual added lines). Uses `color-mix()` so it works with any theme.
- **Series**: commit strip shows per-commit comment counts; mixed-author series shows author names.

## CLI Flags

```
--series <revset|range>            review a commit series
--review-notes-file <path>         load review notes JSON
--validate-review-notes <path>     validate and exit
--github-pr-comments <path>        pipe output of: gh api repos/OWNER/REPO/pulls/N/comments
--phab-mcp-comments <path>         pipe output of: mcp__moz__get_phabricator_revision
--phab-revision <D123>             fetch via Conduit API (needs PHABRICATOR_API_KEY)
--bind, --public, --tailscale, --port, --no-open, --format, --title, --dev-log
```

## Review Notes Schema

Required: `file`, `line` (int or `[start, end]`), `side` (`"new"`/`"old"`), `body`.
Optional: `id`, `author`, `date`, `source_url`, `commit_idx`.
Commit-level: `file: "(commit)"`, `line: 1`, `side: "new"`.
