# CLAUDE.md

Guidance for coding agents working in this repository.

## Project Summary

`lrv` is a Rust CLI for human-in-the-loop code review of unified diffs.

- Input: unified diff from stdin, `--cmd`, or `--file`
- Runtime: local axum server + Monaco UI
- Output: submitted comments to stdout (`json` or `text`)

VCS-agnostic: supports any diff producer (git, jj, hg, etc.).

## Running lrv (Development)

Use the pre-built binary directly for speed (skips recompilation):

```bash
./target/debug/lrv
```

After code changes, rebuild first with `just build`, then run. Examples:

```bash
git diff | ./target/debug/lrv
git show HEAD^ | ./target/debug/lrv
jj diff --git | ./target/debug/lrv
jj show --git -r <change> | ./target/debug/lrv
./target/debug/lrv --series "origin/main..HEAD"
```

## Build, Test, Lint

```bash
just build
just build-release
just test-unit
just test-e2e
just test
just fmt
just fmt-web
just lint
```

Single Rust test:

```bash
cargo test <test_name>
```

First-time e2e setup:

```bash
just setup-e2e
```

## Architecture

```text
stdin/--cmd/--file -> Rust server (axum) -> Browser UI (Monaco)
                                         -> stdout (comments)
```

Backend (`src/`):
- `main.rs`: CLI and server lifecycle
- `server.rs`: HTTP routes, file resolution, security headers
- `diff.rs`: unified diff parsing
- `types.rs`: shared data types
- `output.rs`: output formatting
- `config.rs`: user config loading (`~/.config/lrv/config.toml`)

Frontend:
- `web/dist/index.html`: embedded HTML shell
- `web/assets/app/*.js`: modular vanilla JS app
- `web/assets/vendor/`: vendored Monaco assets

## Dual Implementations to Keep in Sync

The comment form exists in two places with independent implementations:
- `web/src/comments-ui-methods.ts` — Monaco diff view (regular mode)
- `web/src/stacked-view-methods.ts` — stacked table view

Any change to comment UX (keyboard shortcuts, edit, delete, validation, etc.) must be applied to both.

## Important Patterns

- No CDN at runtime; all frontend assets are vendored.
- Rebuild after frontend edits so assets are re-embedded.
- E2E tests run in temporary repos (no mocks).
- For commit review flows, prefer `git show` over `git diff HEAD^`.

## CLI Flags

`--cmd`, `--file`, stdin input; network flags `--bind`, `--public`, `--tailscale`; UI/output flags `--port`, `--no-open`, `--format`, `--title`, `--dev-log`.
