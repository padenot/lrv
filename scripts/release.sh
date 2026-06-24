#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 0.2.12"
  exit 1
fi

VERSION="$1"

# Bump version
sed -i "s/^version = \".*\"/version = \"$VERSION\"/" Cargo.toml
cargo generate-lockfile

cargo fmt
cargo clippy --all-targets --all-features -- -D warnings
cargo build --release

git commit -am "Bump version to $VERSION"
git tag -a "v$VERSION" -m "Release v$VERSION"
git push origin main
git push origin "v$VERSION"

cargo publish
