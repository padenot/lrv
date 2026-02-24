# lrv

Local code review tool for LLM agents.

`lrv` reads a unified diff (from stdin, `--cmd`, or `--file`), serves a local Monaco-based review UI, and prints submitted comments to stdout as JSON or text.

## Quick Start

Use the installed binary:

```bash
git diff | lrv
```

Use the dev binary from this repo:

```bash
git diff | cargo run --bin lrv --
```

Review a specific commit (recommended over `git diff HEAD^`):

```bash
git show HEAD^ | cargo run --bin lrv --
```

## Diff Input Modes

```bash
# Read stdin
git diff --staged | lrv

# Run a command
lrv --cmd "git diff --staged"
lrv --cmd "jj diff --git"

# Read a patch file
lrv --file changes.patch
```

## CLI Options

```text
--cmd <CMD>        Command to run to get diff (e.g., "git diff", "jj diff")
--file <FILE>      Read diff from file instead of stdin
--port <PORT>      Port to bind server to (default: random available port)
--bind <BIND>      Bind address(es), can be passed multiple times (default: 127.0.0.1)
--public           Bind on all interfaces (equivalent to --bind 0.0.0.0)
--tailscale        Also bind to local Tailscale IPv4 if detected
--no-open          Don't auto-open browser
--format <FORMAT>  Output format: json or text (default: json)
--title <TITLE>    Optional title shown in the UI header
--dev-log          Enable development HTTP tracing
```

## Development

`just` is used for common workflows:

```bash
just build
just test-unit
just test-e2e
just test
just fmt
just fmt-web
just lint
```

First-time e2e setup:

```bash
just setup-e2e
```

## Architecture

```text
stdin/--cmd/--file -> Rust server (axum) -> Browser UI (Monaco)
                                         -> stdout (review comments)
```

Key source files:

- `src/main.rs`: CLI, input handling, server lifecycle
- `src/server.rs`: HTTP routes, file content resolution, static assets
- `src/diff.rs`: unified diff parser (git/jj/hg)
- `src/output.rs`: review output formatting
- `web/dist/index.html`: embedded app shell
- `web/assets/app/*.js`: frontend modules

## License

MIT
