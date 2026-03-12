# Release Checklist

Work this from the top.

## 1. Prove CI on GitHub

- Push the current branch.
- Confirm [ci.yml](/home/padenot/src/repositories/lrv/.github/workflows/ci.yml) passes on GitHub Actions.
- Fix any GitHub-only issues, especially around Playwright, cache behavior, or missing system packages.

## 2. Prove the Release Path

- Create a test tag or prerelease tag such as `v0.1.0-rc1`.
- Confirm [release.yml](/home/padenot/src/repositories/lrv/.github/workflows/release.yml) builds and uploads all expected assets.
- Verify archive names match the `cargo binstall` metadata in [Cargo.toml](/home/padenot/src/repositories/lrv/Cargo.toml).
- Confirm `cargo binstall lrv` works against the published release.

## 3. Decide How Strict Linting Should Be

- Clean up the remaining ESLint warnings in `web/src` and `e2e/tests`.
- Keep diagnostic logging limited to allowed levels or gated debug paths.

## 4. Tighten Security Messaging

- Add a short explicit note about the security model in [README.md](/home/padenot/src/repositories/lrv/README.md):
  - localhost by default,
  - `--public` only for trusted networks,
  - `--tailscale` for private mesh use.

## 5. Clean Up Repo Noise

- Remove leftover scratch files and generated artifacts from the repo.
- Keep `server.log` and `bench-results/` out of version control.

## 6. Optional: Add Integration Coverage for Old-Content Resolution

- Add integration tests for Git/JJ old-side content loading.
- Focus on temp-repo tests for renamed, deleted, and modified files.

## 7. Optional: Confirm the First Public Version

- Decide whether to release as:
  - `0.1.0`
  - `0.1.0-rc1`
  - or another prerelease version
