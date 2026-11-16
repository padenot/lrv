#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <major|minor|patch|version>"
  echo "Example: $0 patch"
  exit 1
fi

VERSION="$1"

case "$VERSION" in
  major | minor | patch)
    current_version=$(awk '/^\[package\]$/ { package = 1; next } /^\[/ { package = 0 } package && /^version = / { gsub(/"/, "", $3); print $3; exit }' Cargo.toml)
    if [[ ! "$current_version" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
      echo "Cannot bump package version: $current_version" >&2
      exit 1
    fi
    major=$((10#${BASH_REMATCH[1]}))
    minor=$((10#${BASH_REMATCH[2]}))
    patch=$((10#${BASH_REMATCH[3]}))
    case "$VERSION" in
      major) VERSION="$((major + 1)).0.0" ;;
      minor) VERSION="$major.$((minor + 1)).0" ;;
      patch) VERSION="$major.$minor.$((patch + 1))" ;;
    esac
    ;;
esac

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Expected major, minor, patch, or a version like 0.2.12; got: $VERSION" >&2
  exit 1
fi

echo "Releasing v$VERSION"

# Bump version
tmp_cargo_toml=$(mktemp)
trap 'rm -f "$tmp_cargo_toml"' EXIT
sed "s/^version = \".*\"/version = \"$VERSION\"/" Cargo.toml > "$tmp_cargo_toml"
mv "$tmp_cargo_toml" Cargo.toml
cargo generate-lockfile

cargo fmt
cargo clippy --all-targets --all-features -- -D warnings
cargo build --release

git commit -am "Bump version to $VERSION"
git tag -a "v$VERSION" -m "Release v$VERSION"
git push origin main
git push origin "v$VERSION"

echo "GitHub Actions will publish the crate and release binaries."
