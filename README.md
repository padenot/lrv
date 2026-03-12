# lrv

`lrv` is a local review UI for unified diffs. It reads a diff from stdin, `--cmd`, or `--file`, opens a browser UI backed by Monaco, and prints submitted comments to stdout as JSON or text.

## Users

Install:

```bash
cargo binstall lrv
# or
cargo install lrv
```

Common usage:

```bash
git diff | lrv
git diff --staged | lrv
git show HEAD | lrv
lrv --cmd "jj diff --git"
lrv --file changes.patch
```

Useful flags:

```text
--no-open          Don't auto-open a browser
--format text      Print comments as text instead of JSON
--title "..."      Show a custom title in the header
--bind <ADDR>      Bind a specific address (default: 127.0.0.1)
--public           Bind on all interfaces
--tailscale        Also bind detected Tailscale IPv4 addresses
```

Notes:

- `--public` is for trusted networks only.
- Submitted comments are written to stdout, so you can pipe or capture them.
- `lrv --version` prints the current version and can warn if a newer release exists.

## Development

Prerequisites:

- Rust toolchain
- Node.js + npm
- `just`
- Playwright Firefox for e2e: `just setup-e2e`

Main workflows:

```bash
just build
just test-unit
just test-e2e
just ci
```

Frontend changes must rebuild the embedded bundle:

```bash
npm run build:web
```

The binary embeds the web assets, so stale frontend output will fail the Rust build on purpose.

## License

Licensed under either of:

- Apache License, Version 2.0
- MIT license

See [LICENSE-APACHE](/home/padenot/src/repositories/lrv/LICENSE-APACHE) and [LICENSE-MIT](/home/padenot/src/repositories/lrv/LICENSE-MIT).
