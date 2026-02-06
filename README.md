# localreview

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

## Usage

### Pipe diff from stdin

```bash
git diff | localreview
jj diff | localreview
hg diff | localreview
```

### Run a command to get diff

```bash
localreview --cmd "git diff --staged"
localreview --cmd "jj diff -r @"
```

### Read diff from file

```bash
localreview --file changes.patch
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

1. Run localreview with your diff source
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

## License

MIT
