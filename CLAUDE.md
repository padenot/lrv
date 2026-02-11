# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is lrv

Local code review tool for LLM agents. A Rust CLI that reads a unified diff (from stdin, `--file`, or `--cmd`), spawns a local web server with a Monaco-based diff viewer, and waits for a human to submit line-level comments. Comments are printed to stdout as JSON/text when the review is submitted and the server shuts down.

VCS-agnostic: works with git, jj, hg, or any tool that produces unified diff format.

## Running lrv

ALWAYS use `cargo run --bin lrv --` to run the dev binary, NEVER use the installed `lrv` binary.

Examples:
```bash
git diff | cargo run --bin lrv --
git show HEAD^ | cargo run --bin lrv --  # show a specific commit (use git show, not git diff)
jj diff --git | cargo run --bin lrv --
jj show --git -r <change> | cargo run --bin lrv --
```

## Build & Test

```bash
just build            # cargo build
just build-release    # cargo build --release
just test-unit        # cargo test
just test-e2e         # build + playwright (headless Firefox)
just test             # unit + e2e
just ci               # fmt + lint + build + test
```

Single unit test: `cargo test <test_name>`.

E2E first-time setup: `just setup-e2e` (installs playwright + Firefox).

## Lint & Format

```bash
just fmt              # cargo fmt
just fmt-web          # prettier on web/e2e/scripts
just fmt-all          # both
just lint             # cargo clippy
just lint-web         # eslint (flat config, v10+)
```

## Architecture

```
stdin (unified diff) → Rust server (axum) → Browser (vanilla JS + Monaco)
                                          → stdout (JSON comments)
```

**Backend** (`src/`): axum web server with `rust-embed` to serve a self-contained binary.
- `main.rs` — CLI (clap), diff input, network binding, server lifecycle
- `server.rs` — HTTP routes, file content resolution (old/new side), prefetch, security headers
- `diff.rs` — unified diff parser (git/jj/hg format), extracts commit metadata + blob OIDs
- `types.rs` — shared data structures (DiffResponse, Comment, FileDiff, etc.)
- `output.rs` — JSON/text output formatting
- `config.rs` — user config (`~/.config/lrv/config.toml`): theme, font, split view

**Frontend** (`web/`): single `web/dist/index.html` embedded at compile time, plus vendored Monaco + fonts in `web/assets/`. Vanilla JS, no framework.

**Old-side content resolution** (in `server.rs`): reconstruct from diff hunks + new file on disk → git cat-file blob OID → jj file show → git show HEAD:path → empty fallback. Background prefetch with semaphore-bounded concurrency and batch `git cat-file --batch`.

## Key patterns

- All web assets are vendored (Monaco, fonts). No CDN, no network at runtime. `scripts/vendor-*.sh` to update.
- Frontend changes: edit `web/dist/index.html` or `web/assets/app.js`, then `just build` to re-embed.
- E2E tests create isolated temp git repos per test. No mocks.
- CSP nonce injected per request for the inline preloader script.
- Multi-bind: simultaneous localhost + Tailscale + public listeners on a single port.
- SSH detection: auto-enables `--tailscale` and `--no-open`.

## CLI flags

`--cmd`, `--file`, or stdin for diff input. `--bind`, `--public`, `--tailscale` for network. `--port`, `--no-open`, `--format json|text`, `--title`, `--dev-log`.
