# CLAUDE.md

Guidance for coding agents working in this repository.

## Project Summary

`lrv` is a Rust CLI for human-in-the-loop code review of unified diffs.

- Input: unified diff from stdin, `--cmd`, or `--file`
- Runtime: local axum server + Monaco UI
- Output: submitted comments to stdout (`json` or `text`)

VCS-agnostic: supports any diff producer (git, jj, hg, etc.).

## Running lrv (Development)

Always use the repo binary:

```bash
cargo run --bin lrv --
```

Examples:

```bash
git diff | cargo run --bin lrv --
git show HEAD^ | cargo run --bin lrv --
jj diff --git | cargo run --bin lrv --
jj show --git -r <change> | cargo run --bin lrv --
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

## Important Patterns

- No CDN at runtime; all frontend assets are vendored.
- Rebuild after frontend edits so assets are re-embedded.
- E2E tests run in temporary repos (no mocks).
- For commit review flows, prefer `git show` over `git diff HEAD^`.

## CLI Flags

`--cmd`, `--file`, stdin input; network flags `--bind`, `--public`, `--tailscale`; UI/output flags `--port`, `--no-open`, `--format`, `--title`, `--dev-log`.
