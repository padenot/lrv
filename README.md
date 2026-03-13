# lrv

`lrv` is a local review UI for unified diffs. It reads a diff from stdin,
`--cmd`, or `--file`, opens a browser UI backed by Monaco, and prints submitted
comments to stdout as JSON or text.

Its purpose is to easily show the diff created by an AI agent to a human, that
can comment on it. The comments are fed back to the agent.

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

Network exposure:

- By default, `lrv` binds to `127.0.0.1`, so only your machine can reach it.
- In practice, `lrv --tailscale` usually listens on both `127.0.0.1:<port>` and your local Tailscale `100.x.y.z:<port>`.
- `lrv --public --tailscale` usually listens on `0.0.0.0:<port>` plus any detected Tailscale `100.x.y.z:<port>`.
- `--public`, `--bind 0.0.0.0`, and `--tailscale` expose the review UI and diff contents over plain HTTP with no auth.
- Only use those flags on trusted private networks or Tailscale peers you trust.

Notes:

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

`cargo build` / `cargo run` will rebuild the embedded web bundle automatically when frontend inputs change.
You can still run `npm run build:web` directly if you only want to rebuild the frontend bundle.

## License

Licensed under either of:

- Apache License, Version 2.0
- MIT license

See [LICENSE-APACHE](LICENSE-APACHE) and [LICENSE-MIT](LICENSE-MIT).
