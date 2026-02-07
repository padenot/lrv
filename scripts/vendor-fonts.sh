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

if [[ -n "${INTER_SRC}" ]]; then
  download_or_copy "${INTER_SRC}" "${DEST_DIR}/Inter-Variable.woff2" || RC=1
fi

if [[ -n "${GEIST_SRC}" ]]; then
  if [[ "${GEIST_SRC}" == *.zip ]]; then
    TMP_DIR_G="$(mktemp -d)"; trap 'rm -rf "$TMP_DIR_G"' EXIT
    ZIP_FILE_G="${TMP_DIR_G}/geist.zip"
    echo "Downloading ${GEIST_SRC}"
    curl -fSL --retry 3 --retry-delay 1 "${GEIST_SRC}" -o "$ZIP_FILE_G"
    unzip -q "$ZIP_FILE_G" -d "$TMP_DIR_G/geist"
    # Prefer variable Sans woff2 (Geist[wght].woff2), then any GeistSans Regular
    CAND=$(rg -n --files "$TMP_DIR_G/geist" | rg -i 'Geist/webfonts/Geist\[wght\]\.woff2$' | head -n1 || true)
    if [[ -z "${CAND:-}" ]]; then
      CAND=$(rg -n --files "$TMP_DIR_G/geist" | rg -i 'Geist/webfonts/Geist-Regular\.woff2$' | head -n1 || true)
    fi
    if [[ -z "${CAND:-}" ]]; then
      # Fallback: any Geist*.woff2
      CAND=$(rg -n --files "$TMP_DIR_G/geist" | rg -i 'Geist/.+\.woff2$' | head -n1 || true)
    fi
    if [[ -n "${CAND:-}" ]]; then
      cp -f "$CAND" "${DEST_DIR}/GeistSans-Variable.woff2"
    else
      echo "No WOFF2 found in Geist zip archive." >&2; RC=1
    fi
  else
    download_or_copy "${GEIST_SRC}" "${DEST_DIR}/GeistSans-Variable.woff2" || RC=1
  fi
fi

# JetBrains: accept zip and extract first WOFF2 if provided
if [[ -n "${JBM_SRC}" ]]; then
  if [[ "${JBM_SRC}" == *.zip ]]; then
    TMP_DIR="$(mktemp -d)"; trap 'rm -rf "$TMP_DIR"' EXIT
    ZIP_FILE="${TMP_DIR}/jbm.zip"
    echo "Downloading ${JBM_SRC}"
    curl -fSL --retry 3 --retry-delay 1 "${JBM_SRC}" -o "$ZIP_FILE"
    unzip -q "$ZIP_FILE" -d "$TMP_DIR/jbm"
    # Prefer Regular webfont woff2 (no var woff2 in this archive), then any woff2
    CAND=$(rg -n --files "$TMP_DIR/jbm" | rg -i 'fonts/webfonts/JetBrainsMono-Regular\.woff2$' | head -n1 || true)
    if [[ -z "${CAND:-}" ]]; then
      CAND=$(rg -n --files "$TMP_DIR/jbm" | rg -i 'fonts/webfonts/.+\.woff2$' | head -n1 || true)
    fi
    if [[ -n "${CAND:-}" ]]; then
      cp -f "$CAND" "${DEST_DIR}/JetBrainsMono-Variable.woff2"
    else
      echo "No WOFF2 found in zip archive. Trying TTF fallback..." >&2
      TTF=$(rg -n --files "$TMP_DIR/jbm" | rg -i 'fonts/variable/JetBrainsMono\[wght\]\.ttf$' | head -n1 || true)
      if [[ -z "${TTF:-}" ]]; then
        TTF=$(rg -n --files "$TMP_DIR/jbm" | rg -i 'fonts/ttf/JetBrainsMono-Regular\.ttf$' | head -n1 || true)
      fi
      if [[ -n "${TTF:-}" ]]; then
        cp -f "$TTF" "${DEST_DIR}/JetBrainsMono-Regular.ttf"
      else
        echo "No TTF found in zip archive." >&2; RC=1
      fi
    fi
  else
    download_or_copy "${JBM_SRC}" "${DEST_DIR}/JetBrainsMono-Variable.woff2" || RC=1
  fi
fi

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
