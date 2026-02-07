#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-${MONACO_VERSION:-0.45.0}}"
DEST_ROOT="web/assets/vendor/monaco"

echo "Vendoring Monaco Editor v${VERSION} to ${DEST_ROOT}"

TMP_DIR="$(mktemp -d)"
TARBALL="${TMP_DIR}/monaco-editor-${VERSION}.tgz"

cleanup() { rm -rf "${TMP_DIR}" || true; }
trap cleanup EXIT

mkdir -p "${DEST_ROOT}"

URL="https://registry.npmjs.org/monaco-editor/-/monaco-editor-${VERSION}.tgz"
echo "Downloading: ${URL}"
curl -fsSL "${URL}" -o "${TARBALL}"

echo "Extracting..."
tar -xzf "${TARBALL}" -C "${TMP_DIR}"

SRC_MIN_DIR="${TMP_DIR}/package/min"
if [ ! -d "${SRC_MIN_DIR}" ]; then
  echo "Error: expected 'package/min' in monaco tarball." >&2
  exit 1
fi

echo "Installing files..."
rm -rf "${DEST_ROOT}/min"
mkdir -p "${DEST_ROOT}"
cp -a "${SRC_MIN_DIR}" "${DEST_ROOT}/min"

echo "Done. Loader at: ${DEST_ROOT}/min/vs/loader.js"
