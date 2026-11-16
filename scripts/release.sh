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

# Generate release notes before changing the tree, so failure leaves it untouched.
previous_tag=$(git describe --tags --abbrev=0 --match 'v[0-9]*' HEAD 2>/dev/null || true)
notes_file=$(mktemp)
trap 'rm -f "$notes_file" "${tmp_cargo_toml:-}"' EXIT
if [[ -n "$previous_tag" ]]; then
  changes=$(git log --format='%h %s%n%b' --stat --patch "$previous_tag"..HEAD)
else
  changes=$(git log --format='%h %s%n%b' --stat --patch HEAD)
fi
if [[ -z "$changes" ]]; then
  echo "No changes since the previous release." >&2
  exit 1
fi
if ! command -v codex >/dev/null; then
  echo "Codex CLI is required to generate release notes." >&2
  exit 1
fi
printf '%s\n\n%s\n' "Write concise Markdown release notes for v$VERSION based on these commits. Describe user-facing changes, group related changes, omit routine maintenance and do not invent details. Output only the release notes." "$changes" | codex exec --ignore-user-config --skip-git-repo-check -o "$notes_file" -
if [[ ! -s "$notes_file" ]]; then
  echo "Release note generation returned no output." >&2
  exit 1
fi

echo "Releasing v$VERSION"

# Bump version
tmp_cargo_toml=$(mktemp)

sed "s/^version = \".*\"/version = \"$VERSION\"/" Cargo.toml > "$tmp_cargo_toml"
mv "$tmp_cargo_toml" Cargo.toml
cargo generate-lockfile

just ci
just ci-e2e
cargo build --locked --release

git commit -am "Bump version to $VERSION"
git tag -a "v$VERSION" -F "$notes_file"
git push origin main
git push origin "v$VERSION"

echo "GitHub Actions will publish the crate and release binaries."
