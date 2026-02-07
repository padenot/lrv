#!/usr/bin/env bash
set -euo pipefail

# This script vendors variable WOFF2 font files into web/assets/fonts.
# Provide URLs or local paths via arguments or environment variables.
#
# Usage:
#   bash scripts/vendor-fonts.sh \
#     "https://example/Inter-Variable.woff2" \
#     "https://example/GeistSans-Variable.woff2" \
#     "https://example/JetBrainsMono-Variable.woff2"
#
# Or set env vars:
#   FONT_INTER_URL=... FONT_GEIST_URL=... FONT_JBM_URL=... bash scripts/vendor-fonts.sh
#
# Notes:
# - If a given value is a local file path, it will be copied.
# - If it starts with http(s), it will be downloaded with curl.
# - You can override destination filenames by changing index.html accordingly.

INTER_SRC="${1:-${FONT_INTER_URL:-}}"
GEIST_SRC="${2:-${FONT_GEIST_URL:-}}"
JBM_SRC="${3:-${FONT_JBM_URL:-}}"

DEST_DIR="web/assets/fonts"
mkdir -p "${DEST_DIR}"

download_or_copy() {
  local src="$1"; shift
  local dest="$1"; shift
  if [[ -z "${src}" ]]; then
    echo "Missing source for ${dest}. Provide a URL or file path." >&2
    return 1
  fi
  if [[ -f "${src}" ]]; then
    cp -f "${src}" "${dest}"
  else
    echo "Downloading ${src} -> ${dest}"
    curl -fSL --retry 3 --retry-delay 1 "${src}" -o "${dest}"
  fi
}

RC=0

download_or_copy "${INTER_SRC}" "${DEST_DIR}/Inter-Variable.woff2" || RC=1
download_or_copy "${GEIST_SRC}" "${DEST_DIR}/GeistSans-Variable.woff2" || RC=1
download_or_copy "${JBM_SRC}" "${DEST_DIR}/JetBrainsMono-Variable.woff2" || RC=1

if [[ "${RC}" -ne 0 ]]; then
  cat >&2 <<'EOF'
One or more fonts were not fetched.
Provide valid sources. Examples (versions may change):

Inter (variable woff2):
  https://github.com/rsms/inter/releases (export a WOFF2 variable file)

Geist Sans (variable woff2):
  https://github.com/vercel/geist-font/releases

JetBrains Mono (variable woff2):
  https://github.com/JetBrains/JetBrainsMono/releases

Alternatively, download manually and run:
  bash scripts/vendor-fonts.sh /path/to/Inter-Variable.woff2 /path/to/GeistSans-Variable.woff2 /path/to/JetBrainsMono-Variable.woff2
EOF
  exit 1
fi

echo "Fonts installed into ${DEST_DIR}" 
