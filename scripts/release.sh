#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <major|minor|patch|version>"
  echo "Example: $0 patch"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree must be clean before releasing." >&2
  exit 1
fi
if [[ "$(git branch --show-current)" != main ]]; then
  echo "Release from the main branch." >&2
  exit 1
fi

git fetch origin main --tags
if [[ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]]; then
  echo "Local main differs from origin/main; synchronize it before releasing." >&2
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

current_version=$(awk '/^\[package\]$/ { package = 1; next } /^\[/ { package = 0 } package && /^version = / { gsub(/"/, "", $3); print $3; exit }' Cargo.toml)
if ! python3 - "$current_version" "$VERSION" <<'PYTHON'
import sys
try:
    current, target = (tuple(map(int, version.split('.'))) for version in sys.argv[1:])
    if len(current) != 3 or target <= current:
        raise ValueError
except ValueError:
    raise SystemExit('Release version must be greater than the current version.')
PYTHON
then
  exit 1
fi

if git rev-parse -q --verify "refs/tags/v$VERSION" >/dev/null; then
  echo "Tag v$VERSION already exists." >&2
  exit 1
fi

echo "Releasing v$VERSION"

# Bump version
tmp_cargo_toml=$(mktemp)
trap 'rm -f "$tmp_cargo_toml"' EXIT
sed "s/^version = \".*\"/version = \"$VERSION\"/" Cargo.toml > "$tmp_cargo_toml"
mv "$tmp_cargo_toml" Cargo.toml
cargo generate-lockfile

just ci
just ci-e2e
cargo build --locked --release

git commit -am "Bump version to $VERSION"
git tag -a "v$VERSION" -m "Release v$VERSION"
git push origin main
git push origin "v$VERSION"

echo "GitHub Actions will publish the crate and release binaries."
