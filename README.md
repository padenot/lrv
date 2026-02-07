# lrv

Local code review tool for LLM agents. A CLI tool that spawns a local web server for reviewing git diffs with line-level comments.

## Features

- **VCS Agnostic**: Works with any version control system that produces unified diff format (git, jj, hg, etc.)
- **Line-Level Comments**: Click or drag to select lines and add comments
- **Syntax Highlighting**: Beautiful diff view with color-coded changes
- **Batch Mode**: Review entire diff and submit all comments at once
- **Network Support**: Binds to 0.0.0.0 for remote access (SSH, Tailscale, etc.)

## Installation

```bash
cargo install --path .
```

Or run directly with cargo:

```bash
cargo run -- [OPTIONS]
```

## Development

This project uses [`just`](https://github.com/casey/just) for task automation. Install it with:

```bash
brew install just  # macOS
cargo install just # or via cargo
```

Common tasks:

```bash
just              # Show all available commands
just build        # Build the project
just test         # Run all tests (unit + e2e)
just test-unit    # Run Rust unit tests only
just test-e2e     # Run e2e tests with Playwright
just review       # Run lrv on current git diff
just ci           # Full CI workflow (format, lint, build, test)
```

### Running Tests

**Unit tests:**
```bash
just test-unit
# or: cargo test
```

**E2E tests:**
```bash
just setup-e2e    # First time only: install dependencies
just test-e2e     # Run e2e tests in headless Firefox
```

The e2e tests run in isolated temporary git repositories to avoid modifying your working directory.

## Usage

### Pipe diff from stdin

```bash
git diff | lrv
jj diff | lrv
hg diff | lrv
```

### Run a command to get diff

```bash
lrv --cmd "git diff --staged"
lrv --cmd "jj diff -r @"
```

### Read diff from file

```bash
lrv --file changes.patch
```

## Options

```
--cmd <COMMAND>         Command to run to get diff (e.g., "git diff")
--file <FILE>           Read diff from file instead of stdin
--port <PORT>           Specific port (default: random available port)
--no-open               Don't auto-open browser
--mode <MODE>           Review mode: batch (default) or immediate
--format <FORMAT>       Output format: json (default) or text
```

## Review Workflow

1. Run lrv with your diff source
2. Browser opens automatically (or use the displayed URLs for remote access)
3. Click on line numbers to add comments
4. Select severity: comment, suggestion, issue, or nitpick
5. Click "Submit Review" when done
6. Comments are printed to stdout in JSON/text format

## Keyboard Shortcuts

Press `?` in the web UI to see all available keyboard shortcuts. Key bindings include navigation between files and hunks, adding comments, and submitting reviews.

## Output Format

### JSON (default)

```json
{
  "status": "completed",
  "comments": [
    {
      "file": "src/main.rs",
      "start_line": 42,
      "end_line": 45,
      "side": "new",
      "body": "Consider using a match here instead",
      "severity": "suggestion"
    }
  ],
  "summary": "1 comment on 1 file"
}
```

## Architecture

```
                stdin/--cmd
┌─────────────┐    (unified diff)    ┌──────────────────┐
│ git/jj/hg   │ ──────────────────► │  Rust Server     │
└─────────────┘                      │  - axum          │
                                     │  - diff parser   │
┌─────────────────┐     HTTP         └────────┬─────────┘
│  Browser        │ ◄──────────────►          │
│  - Vanilla TS   │                           │ stdout (JSON)
└─────────────────┘                  ┌──────────────────┐
                                     │  LLM Agent       │
                                     └──────────────────┘
```

### Key Components

- **`src/main.rs`** - CLI argument parsing, server lifecycle, project context detection
- **`src/server.rs`** - Axum web server, HTTP routes, embeds web assets at compile time
- **`src/diff.rs`** - Unified diff parser (handles git/jj/hg format)
- **`src/types.rs`** - Shared data structures between Rust and frontend
- **`src/output.rs`** - Formats review output as JSON or text
- **`web/dist/index.html`** - Single-file web UI (vanilla JS, embedded at compile time)
- **`e2e/`** - Playwright e2e tests in Firefox

### Modifying the Frontend

The web UI is embedded in the binary at compile time via `include_str!()`. After editing `web/dist/index.html`:

```bash
just build  # Rebuild to embed the updated HTML
```

For vendored assets (Monaco + fonts) and how to update them, see `docs/VENDORED_ASSETS.md`.

## Credits

### Monaco Editor Themes

This project includes Monaco editor themes adapted from the following excellent VSCode themes:

- **GitHub Theme** - [primer/github-vscode-theme](https://github.com/primer/github-vscode-theme)
- **Firefox DevTools Theme** - [heronsilva/firefox-theme-vscode](https://github.com/heronsilva/firefox-theme-vscode)
- **Solarized Theme** - [braver/vscode-solarized](https://github.com/braver/vscode-solarized)

## License

MIT
