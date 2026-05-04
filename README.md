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

To review a commit series (all commits in a branch at once):

```bash
lrv --series "trunk()..@"          # jj revset
lrv --series "main..HEAD"          # git range
lrv --series "HEAD~5..HEAD"        # last 5 commits
```

The UI shows a commit strip for navigating between commits. Comments track
which commit they belong to and are grouped per commit in the output.

Useful flags:

```text
--series <RANGE>   Review a jj revset or git range as a commit series
--no-open          Don't auto-open a browser
--format text      Print comments as text instead of JSON
--title "..."      Show a custom title in the header
--config-dir       Print the config directory path and exit
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

## Customization

Settings (theme, font, view mode) are saved to `~/.config/lrv/config.toml`.

### Custom themes

lrv ships with GitHub, Solarized, Firefox DevTools, and the built-in Monaco themes. To add your own, drop any VS Code theme JSON file into the `themes/` subdirectory of your lrv config directory:

```bash
mkdir -p "$(lrv --config-dir)/themes"
cp my-theme.json "$(lrv --config-dir)/themes/"
```

`lrv --config-dir` prints the platform-correct path (`~/.config/lrv` on Linux, `~/Library/Application Support/lrv` on macOS, `%APPDATA%\lrv` on Windows).

The theme appears in the Settings dialog under **Custom** on the next launch. VS Code themes are widely available:

- [VS Code Marketplace](https://marketplace.visualstudio.com/search?target=VSCode&category=Themes) — themes ship as `.vsix` files (zip archives); the JSON is inside under `themes/`
- [`monaco-themes`](https://www.npmjs.com/package/monaco-themes) npm package — 30+ themes already in Monaco format

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
