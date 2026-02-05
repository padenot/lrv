# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A local code review tool for LLM agents that spawns a web server for reviewing git diffs with line-level comments. The tool is VCS-agnostic (works with git, jj, hg, etc.) and consists of a Rust backend server with a TypeScript frontend.

## Building and Running

### Rust Backend

```bash
# Build the entire project (includes web assets)
cargo build

# Run with development mode
cargo run -- --cmd "git diff"

# Install locally
cargo install --path .
```

### Web Frontend

```bash
cd web

# Install dependencies
npm install

# Build production assets (outputs to web/dist/)
npm run build

# Watch mode for development
npm run watch
```

**Important**: The Rust backend embeds web assets from `web/dist/` at compile time using `include_str!()` (see src/server.rs:40,47). After modifying frontend code, you must:
1. Run `npm run build` in the `web/` directory
2. Rebuild the Rust binary with `cargo build`

## Architecture

**Two-component system:**

1. **Rust HTTP Server** (`src/`)
   - Axum-based web server that binds to 0.0.0.0 for network access
   - Parses unified diff format from stdin/file/command
   - Serves embedded web UI (index.html, app.js)
   - Provides REST API for diff data and comment collection
   - Outputs comments as JSON/text to stdout when review completes

2. **TypeScript Web UI** (`web/src/`)
   - Vanilla TypeScript with Monaco Editor for syntax highlighting
   - Single-page app bundled with esbuild
   - Allows line-level commenting on diffs with severity levels
   - Two modes: batch (submit all at once) or immediate (send each comment)

**Data flow:**
- Diff text → Rust parser (src/diff.rs) → JSON API → Web UI
- Comments from Web UI → Rust server → Collected in memory → Output on shutdown

## Key Modules

### Rust (src/)

- `main.rs`: CLI argument parsing, diff input handling, server lifecycle
- `server.rs`: Axum routes and handlers. Embeds web assets via `include_str!()`
- `diff.rs`: Unified diff parser (handles git/jj/hg diff format)
- `types.rs`: Shared data structures (DiffResponse, Comment, FileStatus, etc.)
- `output.rs`: Formats final review output as JSON or text

### TypeScript (web/src/)

- `main.ts`: Application entry point, initializes diff view and comment handlers
- `diff-view.ts`: Renders diff with line numbers and manages UI interactions
- `comments.ts`: Comment creation UI and state management
- `api.ts`: HTTP client for backend API calls
- `types.ts`: TypeScript interfaces matching Rust types

## API Endpoints

- `GET /`: Serves index.html
- `GET /app.js`: Serves bundled JavaScript
- `GET /api/diff`: Returns parsed diff data (DiffResponse)
- `GET /api/config`: Returns review configuration (batch/immediate mode)
- `GET /api/file?path=<path>&side=<old|new>`: Returns file content for full-file view
- `POST /api/comment`: Adds a single comment
- `POST /api/complete`: Submits all comments and triggers server shutdown

## Common Workflows

### Making Frontend Changes

1. Modify files in `web/src/`
2. `cd web && npm run build`
3. `cargo build` (to re-embed assets)
4. Test with `cargo run -- --cmd "git diff"`

### Modifying Diff Parser

The parser in `src/diff.rs` handles unified diff format. Key aspects:
- Tracks file paths from `---`/`+++` lines
- Parses hunk headers (`@@ -old_start,old_count +new_start,new_count @@`)
- Categorizes lines as context/add/delete based on prefix
- Maintains line numbers for old and new sides separately

### Adding New Comment Severity Levels

1. Add variant to `Severity` enum in `src/types.rs`
2. Add matching variant in `web/src/types.ts`
3. Update comment UI in `web/src/comments.ts`

## Testing Locally

```bash
# Review unstaged changes
git diff | cargo run

# Review staged changes
cargo run -- --cmd "git diff --staged"

# Review from file
git diff > changes.patch
cargo run -- --file changes.patch

# Test with other VCS
jj diff | cargo run
```
