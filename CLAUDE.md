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

Backend: `main.rs` (CLI), `server.rs` (routes), `diff.rs` (parsing), `types.rs`, `output.rs`, `config.rs`, `github.rs`, `phab_mcp.rs`, `phabricator.rs`, `store.rs` (SQLite comment persistence).

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
- **Comment persistence**: every draft change is also mirrored to `store.rs` (SQLite, one session row per `lrv` run, created lazily on the first comment) via `POST /api/comments/sync`. Submitting freezes the session, so the UI clearing its drafts afterwards can't erase the record. Read back with `--list-reviews` / `--recover`.
- **jj**: `diff.rs` parses `Change ID:` from `jj show --git` for stable draft keys.
- **Added-file dimming**: `file-added-view` / `stacked-file-added` classes scope green reduction to entirely new files only (not individual added lines). Uses `color-mix()` so it works with any theme.
- **GitHub PRs**: detection asks `gh` for the open PRs of *every* commit; a commit in several PRs belongs to the lowest number. Each PR's comments are attributed within its own commit range (PR-level notes go on its last commit). `/api/series` returns `prs` and per-commit `pr`; the commit strip groups commits under a `PR #N title` header (`prHeader`; the number links to the PR) per contiguous run, with commits without a PR under "No PR" headers, preserving order. All commits stay visible.
- **Series**: commit strip shows per-commit comment counts; mixed-author series shows author names.
- **jj series content**: fetch touched files at the parent of the bottom commit, then apply each commit's hunks forward; a selected revset need not end at `@`.
- **Commit-message review**: switching commits preserves the commit-message view; comments there are per-commit, while overall feedback is entered in the submit dialog.
- **Collapsed sidebar**: hide all sidebar content but keep the collapse button visible as the explicit reopen control.

## CLI Flags

```
--series <revset|range>            review a commit series
--review-notes-file <path>         load review notes JSON
--validate-review-notes <path>     validate and exit
--github-pr-comments <path>        pipe output of: gh api repos/OWNER/REPO/pulls/N/comments
--github-pr [<N|O/R#N|url>]        fetch a PR's comments with gh; no value = detect PRs of every commit
--phab-mcp-comments <path>         pipe output of: mcp__moz__get_phabricator_revision
--phab-revision [<D123>]           fetch via Conduit API (needs PHABRICATOR_API_KEY or ~/.arcrc); no value = detect from trailer
--list-reviews                     list stored review sessions
--recover [<id>]                   print a stored session's comments
--bind, --public, --tailscale, --port, --no-open, --format, --title, --dev-log
```

## Review Notes Schema

Required: `file`, `line` (int or `[start, end]`), `side` (`"new"`/`"old"`), `body`.
Optional: `id`, `author`, `date`, `source_url`, `commit_idx`, `read_only` (note is shown without Address/Reply/Ignore).
Commit-message-level: `file: "(commit)"`, `line: 1`, `side: "new"`.
Pull-request-level comments (`--github-pr` fills them from the PR conversation and review summaries) are read-only `file: "(commit)"` notes like Phabricator's general comments (`ReviewNote::overall`), placed on the last commit of a series. Notes without `commit_idx` in a one-commit series are pinned to commit 0 (`tag_single_commit_notes`).
